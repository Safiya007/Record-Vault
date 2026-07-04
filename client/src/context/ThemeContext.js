import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "recordvault-theme";

const palettes = {
  light: {
    mode: "light",
    bg: "#f1f5f9",
    surface: "#ffffff",
    surfaceAlt: "#f8fafc",
    surfaceRaised: "#ffffff",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    text: "#1e293b",
    textMuted: "#64748b",
    textFaint: "#94a3b8",
    primary: "#4f46e5",
    primaryText: "#4f46e5",
    primaryLight: "#eef2ff",
    primaryBorder: "#e0e7ff",
    headerGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)",
    accentGradient: "linear-gradient(135deg, #1e1b4b, #4f46e5)",
    shadow: "0 2px 12px rgba(0,0,0,0.06)",
    shadowStrong: "0 4px 20px rgba(79,70,229,0.1)",
    overlay: "rgba(15,23,42,0.45)",
    successBg: "#dcfce7",
    successText: "#16a34a",
    successBorder: "#86efac",
    errorBg: "#fee2e2",
    errorText: "#dc2626",
    errorBorder: "#fca5a5",
    warningBg: "#fffbeb",
    warningText: "#d97706",
    warningBorder: "#fcd34d",
  },
  dark: {
    mode: "dark",
    bg: "#0b1120",
    surface: "#141b2d",
    surfaceAlt: "#1a2236",
    surfaceRaised: "#1c2540",
    border: "#293449",
    borderStrong: "#3c4a63",
    text: "#e2e8f0",
    textMuted: "#94a3b8",
    textFaint: "#64748b",
    primary: "#6366f1",
    primaryText: "#a5b4fc",
    primaryLight: "rgba(99,102,241,0.15)",
    primaryBorder: "rgba(99,102,241,0.35)",
    headerGradient: "linear-gradient(135deg, #0b1120 0%, #1e1b4b 50%, #4338ca 100%)",
    accentGradient: "linear-gradient(135deg, #1e1b4b, #4338ca)",
    shadow: "0 2px 12px rgba(0,0,0,0.4)",
    shadowStrong: "0 4px 20px rgba(0,0,0,0.5)",
    overlay: "rgba(0,0,0,0.6)",
    successBg: "rgba(34,197,94,0.12)",
    successText: "#4ade80",
    successBorder: "rgba(74,222,128,0.35)",
    errorBg: "rgba(239,68,68,0.14)",
    errorText: "#f87171",
    errorBorder: "rgba(248,113,113,0.35)",
    warningBg: "rgba(245,158,11,0.14)",
    warningText: "#fbbf24",
    warningBorder: "rgba(252,211,77,0.35)",
  },
};

const ThemeContext = createContext(null);

const getInitialMode = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable — fall through to system preference
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore — theme just won't persist across sessions
    }
    document.body.style.background = palettes[mode].bg;
    document.body.style.transition = "background 0.25s ease";
  }, [mode]);

  const toggleTheme = () => setMode((m) => (m === "light" ? "dark" : "light"));

  const value = useMemo(
    () => ({ mode, theme: palettes[mode], toggleTheme, setMode }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
};

export default ThemeContext;
