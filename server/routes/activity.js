const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");

// ─── GET /api/activity ──────────────────────────────────────────────────────
// Recent activity log entries, newest first. Used to hydrate the live
// activity feed on page load; new entries after that arrive via the
// 'activity:new' socket event.
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const entries = await Activity.find().sort("-createdAt").limit(limit).lean();
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
