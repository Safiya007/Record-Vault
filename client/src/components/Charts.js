import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format, addMonths, startOfMonth, isBefore } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import { useSocket } from "../context/SocketContext";
import { recordsApi } from "../utils/api";

const STATUS_COLORS = {
  Active: "#22c55e",
  "Expiring Soon": "#f59e0b",
  Expired: "#ef4444",
};

const CATEGORY_COLORS = [
  "#4f46e5", "#7c3aed", "#0891b2", "#dc2626", "#059669",
  "#d97706", "#db2777", "#065f46", "#92400e", "#64748b",
];

const TabButton = ({ active, onClick, children, theme }) => (
  <button
    onClick={onClick}
    style={{
      padding: "6px 14px",
      borderRadius: "8px",
      border: `1.5px solid ${active ? theme.primary : theme.border}`,
      background: active ? theme.primaryLight : "transparent",
      color: active ? theme.primaryText : theme.textMuted,
      fontSize: "12px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

// Custom tooltip so it respects the current theme instead of recharts' default white box
const ThemedTooltip = ({ active, payload, label, theme }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: theme.surfaceRaised,
        border: `1px solid ${theme.border}`,
        borderRadius: "10px",
        padding: "8px 12px",
        boxShadow: theme.shadowStrong,
        fontSize: "12px",
        color: theme.text,
      }}
    >
      {label && <div style={{ fontWeight: 700, marginBottom: "4px" }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || p.fill || theme.text }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

export const Charts = () => {
  const { theme } = useTheme();
  const { socket } = useSocket();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("status");

  const load = useCallback(async () => {
    try {
      const res = await recordsApi.getAll({});
      setRecords(res.data || []);
    } catch (err) {
      console.error("Charts load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep charts live — refetch on any change-producing socket event
  useEffect(() => {
    if (!socket) return;
    const refetch = () => load();
    socket.on("record:created", refetch);
    socket.on("record:updated", refetch);
    socket.on("record:deleted", refetch);
    socket.on("records:recalculated", refetch);
    return () => {
      socket.off("record:created", refetch);
      socket.off("record:updated", refetch);
      socket.off("record:deleted", refetch);
      socket.off("records:recalculated", refetch);
    };
  }, [socket, load]);

  const statusData = useMemo(() => {
    const counts = { Active: 0, "Expiring Soon": 0, Expired: 0 };
    records.forEach((r) => { if (counts[r.status] != null) counts[r.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [records]);

  const categoryData = useMemo(() => {
    const counts = {};
    records.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return Object.entries(counts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [records]);

  const timelineData = useMemo(() => {
    const now = new Date();
    const buckets = [];
    // Overdue bucket + next 8 months
    let overdue = 0;
    records.forEach((r) => {
      if (r.expiryDate && isBefore(new Date(r.expiryDate), now)) overdue++;
    });
    buckets.push({ month: "Overdue", count: overdue });

    for (let i = 0; i < 8; i++) {
      const monthStart = startOfMonth(addMonths(now, i));
      const monthEnd = startOfMonth(addMonths(now, i + 1));
      const count = records.filter((r) => {
        if (!r.expiryDate) return false;
        const d = new Date(r.expiryDate);
        return d >= monthStart && d < monthEnd;
      }).length;
      buckets.push({ month: format(monthStart, "MMM yy"), count });
    }
    return buckets;
  }, [records]);

  const total = records.length;

  return (
    <div
      style={{
        background: theme.surface,
        borderRadius: "16px",
        padding: "20px",
        boxShadow: theme.shadow,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: theme.text, textTransform: "uppercase", letterSpacing: "0.8px" }}>
          📈 Insights
        </h3>
        <div style={{ display: "flex", gap: "6px" }}>
          <TabButton active={tab === "status"} onClick={() => setTab("status")} theme={theme}>Status</TabButton>
          <TabButton active={tab === "category"} onClick={() => setTab("category")} theme={theme}>Category</TabButton>
          <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")} theme={theme}>Timeline</TabButton>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: theme.textFaint, fontSize: "13px" }}>
          Loading chart data…
        </div>
      ) : total === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: theme.textFaint, fontSize: "13px" }}>
          No records yet — add some to see insights
        </div>
      ) : (
        <>
          {tab === "status" && (
            <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ width: "180px", height: "180px", flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      animationDuration={800}
                      animationBegin={0}
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<ThemedTooltip theme={theme} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, minWidth: "160px" }}>
                {statusData.map((s) => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: theme.text, fontWeight: 600 }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "3px", background: STATUS_COLORS[s.name] }} />
                      {s.name}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: theme.text }}>
                      {s.value} <span style={{ color: theme.textFaint, fontWeight: 500 }}>({total ? Math.round((s.value / total) * 100) : 0}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "category" && (
            <div style={{ width: "100%", height: "240px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: theme.textFaint, fontSize: 11 }} axisLine={{ stroke: theme.border }} tickLine={false} />
                  <YAxis type="category" dataKey="category" width={90} tick={{ fill: theme.textMuted, fontSize: 11 }} axisLine={{ stroke: theme.border }} tickLine={false} />
                  <Tooltip content={<ThemedTooltip theme={theme} />} cursor={{ fill: theme.surfaceAlt }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} animationDuration={800}>
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tab === "timeline" && (
            <div style={{ width: "100%", height: "220px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ left: -20, right: 10, top: 10 }}>
                  <defs>
                    <linearGradient id="rv-timeline-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={theme.primary} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={theme.primary} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: theme.textFaint, fontSize: 10 }} axisLine={{ stroke: theme.border }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: theme.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ThemedTooltip theme={theme} />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Expiring"
                    stroke={theme.primary}
                    strokeWidth={2.5}
                    fill="url(#rv-timeline-fill)"
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ fontSize: "11px", color: theme.textFaint, marginTop: "6px", textAlign: "center" }}>
                Records expiring per month (next 8 months)
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Charts;
