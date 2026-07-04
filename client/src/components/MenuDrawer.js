import React from "react";
import Logo from "./Logo";
import { useTheme } from "../context/ThemeContext";

export const MenuDrawer = ({
  open,
  onClose,
  connected,
  onRecalculate,
  onScrollTo,
  onImportEmail,
  importing,
  stats,
}) => {
  const { theme, mode, toggleTheme } = useTheme();

  const navItem = (icon, label, onClick, badge) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "12px 14px",
        background: "transparent",
        border: "none",
        borderRadius: "10px",
        color: theme.text,
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = theme.surfaceAlt)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span
          style={{
            background: theme.errorBg,
            color: theme.errorText,
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: theme.overlay,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
          zIndex: 1200,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "300px",
          maxWidth: "85vw",
          background: theme.surface,
          boxShadow: open ? "8px 0 32px rgba(0,0,0,0.25)" : "none",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 1201,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "20px",
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <Logo size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 800, color: theme.text }}>RecordVault</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: connected ? "#4ade80" : "#f87171",
                }}
              />
              <span style={{ fontSize: "11px", color: theme.textMuted }}>
                {connected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "18px", color: theme.textMuted, padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {navItem("📊", "Dashboard", () => { onScrollTo?.("top"); onClose(); })}
          {navItem("📋", "All Records", () => { onScrollTo?.("records"); onClose(); })}
          {navItem("⏰", "Upcoming Expiries", () => { onScrollTo?.("expiries"); onClose(); }, stats?.["Expiring Soon"])}
          {navItem("🔄", "Recalculate Now", () => { onRecalculate?.(); onClose(); })}
          {navItem(importing ? "⏳" : "📥", importing ? "Scanning inbox…" : "Import from Email", () => { onImportEmail?.(); })}
        </div>

        <div style={{ height: "1px", background: theme.border, margin: "8px 20px" }} />

        {/* Theme toggle */}
        <div style={{ padding: "12px 20px" }}>
          <div
            style={{
              fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.8px", color: theme.textFaint, marginBottom: "10px",
            }}
          >
            Appearance
          </div>
          <button
            onClick={toggleTheme}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 14px", borderRadius: "10px",
              background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
              cursor: "pointer", color: theme.text, fontSize: "13px", fontWeight: 600,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {mode === "dark" ? "🌙" : "☀️"} {mode === "dark" ? "Dark Mode" : "Light Mode"}
            </span>
            <span
              style={{
                width: "38px", height: "20px", borderRadius: "999px",
                background: mode === "dark" ? theme.primary : theme.borderStrong,
                position: "relative", transition: "background 0.2s",
              }}
            >
              <span
                style={{
                  position: "absolute", top: "2px",
                  left: mode === "dark" ? "20px" : "2px",
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: "#fff", transition: "left 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </span>
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px", borderTop: `1px solid ${theme.border}`,
            fontSize: "11px", color: theme.textFaint, lineHeight: 1.6,
          }}
        >
          RecordVault — Enterprise Expiry Tracker<br />
          Built for the record expiry tracking hackathon.
        </div>
      </div>
    </>
  );
};

export default MenuDrawer;
