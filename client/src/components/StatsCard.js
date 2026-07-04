import React from "react";

const CARD_CONFIG = {
  Active: {
    color: "#16a34a",
    bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    border: "#86efac",
    icon: "✓",
    label: "Active Records",
    sub: "All clear",
  },
  "Expiring Soon": {
    color: "#d97706",
    bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    border: "#fcd34d",
    icon: "⚠",
    label: "Expiring Soon",
    sub: "Within 7 days",
  },
  Expired: {
    color: "#dc2626",
    bg: "linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)",
    border: "#fca5a5",
    icon: "✕",
    label: "Expired",
    sub: "Needs renewal",
  },
  total: {
    color: "#4f46e5",
    bg: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    border: "#a5b4fc",
    icon: "≡",
    label: "Total Records",
    sub: "All documents",
  },
};

export const StatsCard = ({ type, count, onClick, active }) => {
  const config = CARD_CONFIG[type] || CARD_CONFIG["Active"];

  return (
    <div
      onClick={onClick}
      style={{
        background: config.bg,
        border: `2px solid ${active ? config.color : config.border}`,
        borderRadius: "16px",
        padding: "24px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        transform: active ? "translateY(-2px)" : "none",
        boxShadow: active
          ? `0 8px 24px ${config.color}25`
          : "0 2px 8px rgba(0,0,0,0.06)",
        flex: "1",
        minWidth: "180px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          fontSize: "60px",
          opacity: 0.07,
          color: config.color,
          fontWeight: 900,
        }}
      >
        {config.icon}
      </div>

      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "1px",
          color: config.color,
          marginBottom: "8px",
          opacity: 0.8,
        }}
      >
        {config.label}
      </div>

      <div
        style={{
          fontSize: "42px",
          fontWeight: 800,
          color: config.color,
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        {count}
      </div>

      <div style={{ fontSize: "12px", color: "#64748b" }}>{config.sub}</div>
    </div>
  );
};

export default StatsCard;
