const mongoose = require("mongoose");

const ACTIONS = [
  "created",
  "updated",
  "deleted",
  "status_changed",
  "alert_sent",
  "attachment_uploaded",
  "attachment_removed",
  "imported",
];

const activitySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ACTIONS,
      required: true,
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
    },
    recordName: {
      type: String,
    },
    message: {
      type: String,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });

// Convenience helper — creates the log entry and returns the plain object
// (never throws upward; a broken activity log shouldn't break the request
// that triggered it).
activitySchema.statics.log = async function (action, { recordId, recordName, message, meta }) {
  try {
    const entry = await this.create({ action, recordId, recordName, message, meta });
    return entry.toObject();
  } catch (err) {
    console.error("Activity log error:", err.message);
    return null;
  }
};

module.exports = mongoose.model("Activity", activitySchema);
module.exports.ACTIONS = ACTIONS;
