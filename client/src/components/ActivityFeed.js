import React, { useEffect, useState, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import { activityApi } from "../utils/api";

const ACTION_ICONS = {
  created: "✨",
  updated: "✏️",
  deleted: "🗑️",
  status_changed: "🔄",
  alert_sent: "📧",
  attachment_uploaded: "📎",
  attachment_removed: "📎",
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

export const ActivityFeed = ({ maxHeight = "420px" }) => {
  const { theme } = useTheme();
  const { socket } = useSocket();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);

  const loadHistory = useCallback(async () => {
    try {
      const res = await activityApi.getRecent(50);
      setEntries(res.data || []);
    } catch (err) {
      console.error("Activity load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Re-render every 30s so relative timestamps ("2m ago") stay fresh
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNew = ({ entry }) => {
      if (!entry) return;
      setEntries((prev) => [entry, ...prev].slice(0, 50));
    };
    socket.on("activity:new", handleNew);
    return () => socket.off("activity:new", handleNew);
  }, [socket]);

  return (
    <div
      style={{
        background: theme.surface,
        borderRadius: "16px",
        padding: "20px",
        boxShadow: theme.shadow,
      }}
    >
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: "13px",
          fontWeight: 800,
          color: theme.text,
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        📡 Live Activity
      </h3>

      <div style={{ maxHeight, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading ? (
          <div style={{ fontSize: "13px", color: theme.textFaint, textAlign: "center", padding: "16px 0" }}>
            Loading…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ fontSize: "13px", color: theme.textFaint, textAlign: "center", padding: "16px 0" }}>
            No activity yet
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={entry._id || i}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                padding: "8px 10px",
                borderRadius: "10px",
                background: i === 0 ? theme.primaryLight : "transparent",
                animation: i === 0 ? "rv-feed-in 0.35s ease" : "none",
              }}
            >
              <span style={{ fontSize: "15px", flexShrink: 0, marginTop: "1px" }}>
                {ACTION_ICONS[entry.action] || "•"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12.5px", color: theme.text, lineHeight: 1.4 }}>
                  {entry.message}
                </div>
                <div style={{ fontSize: "10.5px", color: theme.textFaint, marginTop: "2px" }}>
                  {timeAgo(entry.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes rv-feed-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ActivityFeed;
