const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const Activity = require("../models/Activity");
const {
  scanInboxForRecords,
  saveImportedAttachment,
  isEmailImportConfigured,
} = require("../services/emailImportService");

const emit = (req, eventName, data) => {
  const io = req.app.get("io");
  if (io) io.emit(eventName, { ...data, origin: req.headers["x-socket-id"] || null });
};

// ─── GET /api/email-import/status ──────────────────────────────────────────
router.get("/status", (req, res) => {
  res.json({ success: true, data: { configured: isEmailImportConfigured() } });
});

// ─── POST /api/email-import/scan ────────────────────────────────────────────
// Scans the configured Gmail inbox (via IMAP, using the same app password
// as outgoing alerts) for unseen emails with a supported attachment,
// auto-classifies each into a category, attempts to extract an expiry
// date, and creates a Record for each attachment found.
router.post("/scan", async (req, res) => {
  if (!isEmailImportConfigured()) {
    return res.status(400).json({
      success: false,
      error: "Email is not configured on the server (missing EMAIL_USER / EMAIL_APP_PASSWORD).",
    });
  }

  try {
    const limit = Math.min(Number(req.body?.limit) || 20, 50);
    const { imported, skipped, errors } = await scanInboxForRecords({ limit });

    const createdRecords = [];
    for (const draft of imported) {
      try {
        const { _attachmentBuffer, _attachmentMeta, ...recordFields } = draft;
        const record = new Record(recordFields);
        await record.save();

        record.attachment = saveImportedAttachment(record._id, _attachmentBuffer, _attachmentMeta);
        await record.save({ validateBeforeSave: false });

        const entry = await Activity.log("imported", {
          recordId: record._id,
          recordName: record.name,
          message: `Imported "${record.name}" from email (classified as ${record.category}${record.needsReview ? " — needs review" : ""})`,
        });
        if (entry) emit(req, "activity:new", { entry });

        createdRecords.push(record);
      } catch (err) {
        errors.push({ subject: draft.name, error: err.message });
      }
    }

    if (createdRecords.length > 0) {
      const stats = await Record.getDashboardStats();
      for (const record of createdRecords) {
        emit(req, "record:created", { record, stats });
      }
    }

    res.json({
      success: true,
      data: {
        importedCount: createdRecords.length,
        skippedCount: skipped.length,
        errorCount: errors.length,
        records: createdRecords,
        skipped,
        errors,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
