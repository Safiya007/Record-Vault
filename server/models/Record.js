const mongoose = require("mongoose");

const CATEGORIES = [
  "Legal",
  "Compliance",
  "Safety",
  "Insurance",
  "Finance",
  "HR",
  "Operations",
  "Government",
  "Vendor",
  "Other",
];

const recordSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Record name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: "{VALUE} is not a valid category",
      },
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    owner: {
      type: String,
      trim: true,
      default: "Unassigned",
    },
    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      validate: {
        validator: function (v) {
          if (!v) return true; // optional field
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "{VALUE} is not a valid email address",
      },
    },
    // Computed field — recalculated on every read via middleware
    status: {
      type: String,
      enum: ["Active", "Expiring Soon", "Expired"],
      default: "Active",
    },
    daysUntilExpiry: {
      type: Number,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    // Tracks which status we last emailed the owner about, so the
    // per-minute cron doesn't resend the same alert every tick.
    // Reset to null whenever the record becomes Active again (e.g. renewed).
    lastAlertedStatus: {
      type: String,
      enum: ["Active", "Expiring Soon", "Expired", null],
      default: null,
    },
    lastAlertedAt: {
      type: Date,
      default: null,
    },
    // Uploaded source document (contract PDF, certificate scan, etc.)
    attachment: {
      type: {
        originalName: { type: String },
        storedName: { type: String },
        mimetype: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date },
      },
      default: null,
    },
    // Populated when a record was auto-created from an imported email
    source: {
      sourceType: { type: String, enum: ["manual", "email_import"], default: "manual" },
      messageId: { type: String },
      from: { type: String },
      subject: { type: String },
    },
    // True when the expiry date was guessed (not confidently extracted) —
    // surfaced in the UI so a human can double-check it.
    needsReview: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Core Classification Logic ──────────────────────────────────────────────
// Called before every save and explicitly when recalculating
recordSchema.methods.recalculateStatus = function () {
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = expiry - now;
  const daysLeft = Math.ceil(diffMs / msPerDay);

  this.daysUntilExpiry = daysLeft;

  if (daysLeft < 0) {
    this.status = "Expired";
  } else if (daysLeft <= 7) {
    this.status = "Expiring Soon";
  } else {
    this.status = "Active";
  }

  // If the record is Active again (e.g. renewed with a later date),
  // clear the alert marker so a future Expiring Soon/Expired transition
  // triggers a fresh email.
  if (this.status === "Active" && this.lastAlertedStatus) {
    this.lastAlertedStatus = null;
    this.lastAlertedAt = null;
  }

  return this;
};

// Auto-classify on every save
recordSchema.pre("save", function (next) {
  this.recalculateStatus();
  next();
});

// Also recalculate on findOneAndUpdate
recordSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update && update.expiryDate) {
    const now = new Date();
    const expiry = new Date(update.expiryDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = expiry - now;
    const daysLeft = Math.ceil(diffMs / msPerDay);

    update.daysUntilExpiry = daysLeft;
    if (daysLeft < 0) {
      update.status = "Expired";
    } else if (daysLeft <= 7) {
      update.status = "Expiring Soon";
    } else {
      update.status = "Active";
    }
  }
  next();
});

// ─── Indexes for performance ─────────────────────────────────────────────────
recordSchema.index({ status: 1 });
recordSchema.index({ expiryDate: 1 });
recordSchema.index({ category: 1 });
recordSchema.index({ name: "text", description: "text", owner: "text" });

// ─── Static Helpers ──────────────────────────────────────────────────────────
recordSchema.statics.getDashboardStats = async function () {
  const stats = await this.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = { Active: 0, "Expiring Soon": 0, Expired: 0, total: 0 };
  stats.forEach(({ _id, count }) => {
    result[_id] = count;
    result.total += count;
  });

  return result;
};

recordSchema.statics.recalculateAll = async function () {
  const records = await this.find({ isArchived: false });
  const bulkOps = [];
  const transitions = [];

  for (const record of records) {
    const prevStatus = record.status;
    const prevAlertedStatus = record.lastAlertedStatus;
    record.recalculateStatus();
    const set = {
      status: record.status,
      daysUntilExpiry: record.daysUntilExpiry,
    };
    // Persist the reset from recalculateStatus() when a record went back to Active
    if (prevAlertedStatus && !record.lastAlertedStatus) {
      set.lastAlertedStatus = null;
      set.lastAlertedAt = null;
    }
    bulkOps.push({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: set },
      },
    });

    if (prevStatus !== record.status) {
      transitions.push({
        id: record._id,
        name: record.name,
        from: prevStatus,
        to: record.status,
      });
    }
  }

  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }

  return { count: records.length, transitions };
};

module.exports = mongoose.model("Record", recordSchema);
module.exports.CATEGORIES = CATEGORIES;
