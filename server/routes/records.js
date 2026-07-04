const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const Record = require("../models/Record");
const Activity = require("../models/Activity");
const { sendExpiryAlert, isEmailConfigured } = require("../services/emailService");
const { upload } = require("../middleware/upload");

// Emit socket event helper — injected via app.set("io", io).
// Tags every payload with the originating client's socket id (sent by the
// frontend as the x-socket-id header) so clients can tell "my own action"
// apart from "someone else's action" and only toast for the latter.
const emitUpdate = (req, eventName, data) => {
  const io = req.app.get("io");
  if (io) io.emit(eventName, { ...data, origin: req.headers["x-socket-id"] || null });
};

// Logs an activity entry and broadcasts it live to the activity feed.
const logActivity = async (req, action, { recordId, recordName, message, meta }) => {
  const entry = await Activity.log(action, { recordId, recordName, message, meta });
  if (entry) emitUpdate(req, "activity:new", { entry });
};

// ─── GET /api/records ──────────────────────────────────────────────────────
// Query params: status, category, search, page, limit, sort
router.get("/", async (req, res) => {
  try {
    const {
      status,
      category,
      search,
      page = 1,
      limit = 50,
      sort = "-createdAt",
    } = req.query;

    const filter = { isArchived: false };

    if (status && ["Active", "Expiring Soon", "Expired"].includes(status)) {
      filter.status = status;
    }
    if (category) filter.category = category;
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const [records, total] = await Promise.all([
      Record.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Record.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/records/stats ────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const stats = await Record.getDashboardStats();

    // Category breakdown
    const categoryBreakdown = await Record.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Expiring in next 30 days timeline
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingExpiries = await Record.find({
      isArchived: false,
      expiryDate: { $gte: now, $lte: in30 },
      status: { $ne: "Expired" },
    })
      .sort("expiryDate")
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        counts: stats,
        categoryBreakdown,
        upcomingExpiries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/records/:id ──────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).lean();
    if (!record) return res.status(404).json({ success: false, error: "Record not found" });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/records ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { name, category, expiryDate, description, owner, ownerEmail } = req.body;

    const record = new Record({ name, category, expiryDate, description, owner, ownerEmail });
    await record.save();

    const stats = await Record.getDashboardStats();

    emitUpdate(req, "record:created", { record, stats });
    await logActivity(req, "created", {
      recordId: record._id,
      recordName: record.name,
      message: `"${record.name}" was added${record.owner && record.owner !== "Unassigned" ? ` by ${record.owner}` : ""}`,
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(", ") });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/records/:id ────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { name, category, expiryDate, description, owner, ownerEmail } = req.body;

    // If the expiry date or owner email changed, clear the alert marker so
    // the next cron pass can send a fresh alert reflecting the edit
    // (e.g. renewed date, or email corrected after a typo).
    const update = { name, category, expiryDate, description, owner, ownerEmail };
    update.lastAlertedStatus = null;
    update.lastAlertedAt = null;

    const record = await Record.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!record) return res.status(404).json({ success: false, error: "Record not found" });

    const stats = await Record.getDashboardStats();

    emitUpdate(req, "record:updated", { record, stats });
    await logActivity(req, "updated", {
      recordId: record._id,
      recordName: record.name,
      message: `"${record.name}" was updated`,
    });

    res.json({ success: true, data: record });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, error: messages.join(", ") });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/records/:id ────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const record = await Record.findByIdAndUpdate(
      req.params.id,
      { isArchived: true },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, error: "Record not found" });

    const stats = await Record.getDashboardStats();
    emitUpdate(req, "record:deleted", { recordId: req.params.id, stats });
    await logActivity(req, "deleted", {
      recordId: record._id,
      recordName: record.name,
      message: `"${record.name}" was removed`,
    });

    res.json({ success: true, message: "Record archived successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/records/recalculate ──────────────────────────────────────────
// Manually trigger status recalculation for all records
router.post("/recalculate/all", async (req, res) => {
  try {
    const { count, transitions } = await Record.recalculateAll();
    const stats = await Record.getDashboardStats();
    emitUpdate(req, "records:recalculated", { stats });

    for (const t of transitions) {
      await logActivity(req, "status_changed", {
        recordId: t.id,
        recordName: t.name,
        message: `"${t.name}" status changed from ${t.from} to ${t.to}`,
        meta: { from: t.from, to: t.to },
      });
    }

    res.json({ success: true, message: `Recalculated ${count} records`, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/records/:id/send-alert ───────────────────────────────────────
// Manually (re)send the expiry alert email for a single record. Useful for
// testing the email pipeline and for demoing without waiting on the cron.
router.post("/:id/send-alert", async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(400).json({
        success: false,
        error: "Email is not configured on the server (missing EMAIL_USER / EMAIL_APP_PASSWORD).",
      });
    }

    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: "Record not found" });
    if (!record.ownerEmail) {
      return res.status(400).json({ success: false, error: "This record has no owner email set." });
    }
    if (record.status === "Active") {
      return res.status(400).json({
        success: false,
        error: "This record is Active — no alert to send.",
      });
    }

    const sent = await sendExpiryAlert(record);
    if (!sent) {
      return res.status(500).json({ success: false, error: "Failed to send email. Check server logs." });
    }

    record.lastAlertedStatus = record.status;
    record.lastAlertedAt = new Date();
    await record.save({ validateBeforeSave: false });

    await logActivity(req, "alert_sent", {
      recordId: record._id,
      recordName: record.name,
      message: `Alert email sent to ${record.ownerEmail} for "${record.name}" (${record.status})`,
    });

    res.json({ success: true, message: `Alert sent to ${record.ownerEmail}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/records/:id/attachment ───────────────────────────────────────
// Upload (or replace) the source document for a record — e.g. the actual
// contract PDF or certificate scan behind the tracked expiry date.
router.post("/:id/attachment", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    try {
      const record = await Record.findById(req.params.id);
      if (!record) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(404).json({ success: false, error: "Record not found" });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No file uploaded" });
      }

      // Replacing an existing attachment — remove the old file from disk
      if (record.attachment?.storedName) {
        const oldPath = path.join(
          __dirname, "..", "uploads", record._id.toString(), record.attachment.storedName
        );
        fs.unlink(oldPath, () => {});
      }

      record.attachment = {
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date(),
      };
      await record.save({ validateBeforeSave: false });

      emitUpdate(req, "record:updated", { record, stats: await Record.getDashboardStats() });
      await logActivity(req, "attachment_uploaded", {
        recordId: record._id,
        recordName: record.name,
        message: `Document "${req.file.originalname}" uploaded for "${record.name}"`,
      });

      res.json({ success: true, data: record });
    } catch (err2) {
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ success: false, error: err2.message });
    }
  });
});

// ─── GET /api/records/:id/attachment ────────────────────────────────────────
// Download the attached document.
router.get("/:id/attachment", async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).lean();
    if (!record || !record.attachment?.storedName) {
      return res.status(404).json({ success: false, error: "No attachment for this record" });
    }
    const filePath = path.join(
      __dirname, "..", "uploads", record._id.toString(), record.attachment.storedName
    );
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "File missing on server" });
    }
    res.download(filePath, record.attachment.originalName);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/records/:id/attachment ─────────────────────────────────────
router.delete("/:id/attachment", async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: "Record not found" });
    if (!record.attachment?.storedName) {
      return res.status(400).json({ success: false, error: "No attachment to remove" });
    }

    const filePath = path.join(
      __dirname, "..", "uploads", record._id.toString(), record.attachment.storedName
    );
    fs.unlink(filePath, () => {});

    const removedName = record.attachment.originalName;
    record.attachment = null;
    await record.save({ validateBeforeSave: false });

    emitUpdate(req, "record:updated", { record, stats: await Record.getDashboardStats() });
    await logActivity(req, "attachment_removed", {
      recordId: record._id,
      recordName: record.name,
      message: `Document "${removedName}" removed from "${record.name}"`,
    });

    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
