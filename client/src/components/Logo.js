import React from "react";

// A small animated mark: a document glyph inside a rounded badge, with a
// slowly orbiting tracking dot (representing continuous expiry monitoring)
// and a soft pulsing glow. Pure CSS/SVG — no external assets.
export const Logo = ({ size = 38 }) => {
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 40 40"
        width={size}
        height={size}
        style={{ display: "block" }}
      >
        <defs>
          <linearGradient id="rv-logo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>

        {/* Badge */}
        <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#rv-logo-bg)" />
        <rect
          x="1" y="1" width="38" height="38" rx="11"
          fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1"
        />

        {/* Document glyph */}
        <g transform="translate(11.5, 8.5)">
          <path
            d="M2 0 H11 L15 4 V21 a2 2 0 0 1 -2 2 H2 a2 2 0 0 1 -2 -2 V2 a2 2 0 0 1 2 -2 Z"
            fill="rgba(255,255,255,0.95)"
          />
          <path d="M11 0 L15 4 H12 a1 1 0 0 1 -1 -1 Z" fill="rgba(199,210,254,0.9)" />
          <rect x="2.5" y="10" width="10" height="1.6" rx="0.8" fill="#4f46e5" opacity="0.55" />
          <rect x="2.5" y="14" width="10" height="1.6" rx="0.8" fill="#4f46e5" opacity="0.55" />
          <rect x="2.5" y="18" width="6" height="1.6" rx="0.8" fill="#4f46e5" opacity="0.55" />
        </g>

        {/* Orbiting tracking dot */}
        <g style={{ transformOrigin: "20px 20px", animation: "rv-logo-orbit 4s linear infinite" }}>
          <circle cx="20" cy="4.5" r="2.1" fill="#4ade80" />
          <circle cx="20" cy="4.5" r="2.1" fill="#4ade80" opacity="0.5">
            <animate attributeName="r" values="2.1;4;2.1" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>

      <style>{`
        @keyframes rv-logo-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Logo;
