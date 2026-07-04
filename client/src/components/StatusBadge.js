import React from "react";

const STATUS_CONFIG = {
  Active: { color: "#16a34a", bg: "#dcfce7", icon: "●" },
  "Expiring Soon": { color: "#d97706", bg: "#fef3c7", icon: "⚠" },
  Expired: { color: "#dc2626", bg: "#fee2e2", icon: "✕" },
};

export const StatusBadge = ({ status, size = "sm" }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG["Active"];
  const padding = size === "lg" ? "6px 14px" : "3px 10px";
  const fontSize = size === "lg" ? "13px" : "11px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        backgroundColor: config.bg,
        color: config.color,
        borderRadius: "20px",
        padding,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
        border: `1px solid ${config.color}30`,
      }}
    >
      <span style={{ fontSize: size === "lg" ? "10px" : "8px" }}>
        {config.icon}
      </span>
      {status}
    </span>
  );
};

export default StatusBadge;
