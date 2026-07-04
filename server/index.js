require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const Record = require("./models/Record");
const Activity = require("./models/Activity");
const recordsRouter = require("./routes/records");
const activityRouter = require("./routes/activity");
const { sendExpiryAlert, verifyEmailConfig } = require("./services/emailService");

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.IO Setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("io", io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/records", recordsRouter);
app.use("/api/activity", activityRouter);
app.use("/api/email-import", require("./routes/emailImport"));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Socket.IO Connection ─────────────────────────────────────────────────────
// ─── Presence tracking ─────────────────────────────────────────────────────
const onlineSockets = new Set();
const broadcastPresence = () => io.emit("presence:update", { count: onlineSockets.size });

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  onlineSockets.add(socket.id);
  broadcastPresence();

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    onlineSockets.delete(socket.id);
    broadcastPresence();
  });

  // Allow client to request fresh stats
  socket.on("request:stats", async () => {
    try {
      const stats = await Record.getDashboardStats();
      socket.emit("stats:update", stats);
    } catch (err) {
      console.error("Socket stats error:", err);
    }
  });
});

// ─── Cron: Recalculate statuses every minute ──────────────────────────────────
// This ensures records auto-transition even without any API interaction
cron.schedule("* * * * *", async () => {
  try {
    const { count, transitions } = await Record.recalculateAll();
    const stats = await Record.getDashboardStats();
    io.emit("records:recalculated", { stats });
    console.log(
      `[CRON] Recalculated ${count} records — Active:${stats.Active} ExpiringSoon:${stats["Expiring Soon"]} Expired:${stats.Expired}`
    );

    // Log + broadcast an activity entry for every real status transition
    // (not every cron tick — only when something actually changed).
    for (const t of transitions) {
      const entry = await Activity.log("status_changed", {
        recordId: t.id,
        recordName: t.name,
        message: `"${t.name}" status changed from ${t.from} to ${t.to}`,
        meta: { from: t.from, to: t.to },
      });
      if (entry) io.emit("activity:new", { entry });
    }

    // ─── Email Alerts ───────────────────────────────────────────────────────
    // Only email records whose status has changed since the last alert we
    // sent (lastAlertedStatus !== status), so this doesn't resend every minute.
    const dueForAlert = await Record.find({
      isArchived: false,
      status: { $in: ["Expiring Soon", "Expired"] },
      ownerEmail: { $nin: [null, ""] },
      $expr: { $ne: ["$status", "$lastAlertedStatus"] },
    });

    for (const record of dueForAlert) {
      const sent = await sendExpiryAlert(record);
      if (sent) {
        record.lastAlertedStatus = record.status;
        record.lastAlertedAt = new Date();
        await record.save({ validateBeforeSave: false });

        const entry = await Activity.log("alert_sent", {
          recordId: record._id,
          recordName: record.name,
          message: `Alert email sent to ${record.ownerEmail} for "${record.name}" (${record.status})`,
        });
        if (entry) io.emit("activity:new", { entry });
      }
    }
  } catch (err) {
    console.error("[CRON] Recalculate error:", err);
  }
});

// ─── MongoDB Connection + Start ───────────────────────────────────────────────
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/recordvault";
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    await verifyEmailConfig();
    httpServer.listen(PORT, () => {
      console.log(`🚀 RecordVault server running on port ${PORT}`);
      console.log(`   API: http://localhost:${PORT}/api`);
      console.log(`   WebSocket: ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await mongoose.disconnect();
  process.exit(0);
});
