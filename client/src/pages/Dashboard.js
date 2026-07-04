import React, { useState } from "react";
import { useRecords } from "../hooks/useRecords";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import { recordsApi, emailImportApi } from "../utils/api";
import StatsCard from "../components/StatsCard";
import RecordTable from "../components/RecordTable";
import RecordForm from "../components/RecordForm";
import StatusBadge from "../components/StatusBadge";
import Logo from "../components/Logo";
import MenuDrawer from "../components/MenuDrawer";
import ActivityFeed from "../components/ActivityFeed";
import Charts from "../components/Charts";
import { format, parseISO } from "date-fns";

const CATEGORIES = [
  "All", "Legal", "Compliance", "Safety", "Insurance",
  "Finance", "HR", "Operations", "Government", "Vendor", "Other",
];

export default function Dashboard() {
  const { theme } = useTheme();
  const [filters, setFilters] = useState({ status: "", category: "", search: "" });
  const [searchInput, setSearchInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRemoteEvent = (type, record) => {
    const verb = type === "created" ? "added" : type === "deleted" ? "removed" : "updated";
    showToast(`Another user just ${verb} "${record.name || "a record"}"`, "info");
  };

  const { records, stats, upcomingExpiries, loading, error, refresh, createRecord, updateRecord, deleteRecord } =
    useRecords(filters, handleRemoteEvent);
  const { connected, onlineCount } = useSocket();

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput.trim() }));
  };

  const handleStatusFilter = (status) => {
    const newStatus = activeStatusFilter === status ? "" : status;
    setActiveStatusFilter(newStatus);
    setFilters((f) => ({ ...f, status: newStatus }));
  };

  const handleCategoryFilter = (cat) => {
    setFilters((f) => ({ ...f, category: cat === "All" ? "" : cat }));
  };

  const handleAdd = async (data) => {
    setAddLoading(true);
    try {
      await createRecord(data);
      setShowAddForm(false);
      showToast("Record added successfully");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAddLoading(false);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await updateRecord(id, data);
      showToast("Record updated");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRecord(id);
      showToast("Record removed");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleRecalculate = async () => {
    try {
      await recordsApi.recalculateAll();
      await refresh();
      showToast("Statuses recalculated");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleImportEmail = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const res = await emailImportApi.scan(20);
      const { importedCount, skippedCount, errorCount } = res.data;
      if (importedCount > 0) {
        showToast(
          `Imported ${importedCount} record${importedCount === 1 ? "" : "s"} from email` +
          (errorCount ? ` (${errorCount} failed)` : "")
        );
        await refresh();
      } else if (errorCount > 0) {
        showToast(`Import failed for ${errorCount} email(s) — check server logs`, "error");
      } else {
        showToast(`No new records found (${skippedCount} email(s) had no usable attachment)`, "info");
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setImporting(false);
    }
  };

  const handleScrollTo = (id) => {
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", transition: "background 0.25s ease" }}>

      <MenuDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        connected={connected}
        onRecalculate={handleRecalculate}
        onScrollTo={handleScrollTo}
        onImportEmail={handleImportEmail}
        importing={importing}
        stats={stats}
      />

      {/* ── Header ── */}
      <header style={{
        background: theme.headerGradient,
        padding: "0 32px",
        boxShadow: "0 4px 20px rgba(79,70,229,0.3)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "68px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              style={{
                width: "38px", height: "38px", background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ width: "16px", height: "2px", background: "#fff", borderRadius: "2px" }} />
                <span style={{ width: "16px", height: "2px", background: "#fff", borderRadius: "2px" }} />
                <span style={{ width: "16px", height: "2px", background: "#fff", borderRadius: "2px" }} />
              </div>
            </button>

            <Logo />

            <div>
              <div style={{ fontSize: "18px", fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
                RecordVault
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", letterSpacing: "1px", textTransform: "uppercase" }}>
                Enterprise Expiry Tracker
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(255,255,255,0.1)", padding: "6px 14px", borderRadius: "20px",
            }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: connected ? "#4ade80" : "#f87171",
                boxShadow: connected ? "0 0 6px #4ade80" : "none",
              }} />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                {connected ? `Live · ${onlineCount} online` : "Offline"}
              </span>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                padding: "9px 20px",
                background: showAddForm ? "rgba(255,255,255,0.15)" : "#fff",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "10px",
                color: showAddForm ? "#fff" : "#4f46e5",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.3px",
              }}
            >
              {showAddForm ? "✕ Cancel" : "+ Add Record"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px 32px" }}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: "fixed", top: "80px", right: "28px", zIndex: 1300,
            background: toast.type === "error" ? theme.errorBg : toast.type === "info" ? theme.primaryLight : theme.successBg,
            color: toast.type === "error" ? theme.errorText : toast.type === "info" ? theme.primaryText : theme.successText,
            border: `1.5px solid ${toast.type === "error" ? theme.errorBorder : toast.type === "info" ? theme.primaryBorder : theme.successBorder}`,
            padding: "12px 20px", borderRadius: "12px", fontWeight: 600, fontSize: "14px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            animation: "slideIn 0.3s ease",
          }}>
            {toast.type === "error" ? "✕ " : toast.type === "info" ? "🔔 " : "✓ "}{toast.msg}
          </div>
        )}

        {/* ── Add Form Panel ── */}
        {showAddForm && (
          <div style={{
            background: theme.surface, borderRadius: "16px", padding: "28px",
            marginBottom: "28px", boxShadow: theme.shadowStrong,
            border: `2px solid ${theme.primaryBorder}`,
          }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: 800, color: theme.text }}>
              ➕ Add New Record
            </h2>
            <RecordForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} loading={addLoading} />
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "28px", flexWrap: "wrap" }}>
          <StatsCard type="total" count={stats.total} />
          <StatsCard
            type="Active"
            count={stats.Active}
            onClick={() => handleStatusFilter("Active")}
            active={activeStatusFilter === "Active"}
          />
          <StatsCard
            type="Expiring Soon"
            count={stats["Expiring Soon"]}
            onClick={() => handleStatusFilter("Expiring Soon")}
            active={activeStatusFilter === "Expiring Soon"}
          />
          <StatsCard
            type="Expired"
            count={stats.Expired}
            onClick={() => handleStatusFilter("Expired")}
            active={activeStatusFilter === "Expired"}
          />
        </div>

        {/* ── Charts ── */}
        <div style={{ marginBottom: "24px" }}>
          <Charts />
        </div>

        <div id="records" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", alignItems: "start" }}>

          {/* ── Main Panel: Filters + Table ── */}
          <div style={{
            background: theme.surface, borderRadius: "16px",
            boxShadow: theme.shadow, overflow: "hidden",
          }}>
            {/* Filters */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: "14px" }}>
              <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Search records by name, owner, or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    flex: 1, padding: "10px 14px", border: `2px solid ${theme.border}`,
                    borderRadius: "10px", fontSize: "14px", background: theme.surface, color: theme.text,
                  }}
                />
                <button type="submit" style={{
                  padding: "10px 20px", background: theme.primary, border: "none",
                  borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                }}>
                  Search
                </button>
              </form>

              {/* Category Filter */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["All", "Legal", "Safety", "Compliance", "Insurance", "Government"].map((cat) => {
                  const isActive = filters.category === cat || (cat === "All" && !filters.category);
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryFilter(cat)}
                      style={{
                        padding: "6px 12px",
                        border: `1.5px solid ${isActive ? theme.primary : theme.border}`,
                        borderRadius: "8px",
                        background: isActive ? theme.primaryLight : theme.surface,
                        color: isActive ? theme.primaryText : theme.textMuted,
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active filter chips */}
            {(activeStatusFilter || filters.category || filters.search) && (
              <div style={{ padding: "10px 24px", background: theme.surfaceAlt, display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: theme.textFaint, fontWeight: 600 }}>Filters:</span>
                {activeStatusFilter && (
                  <span style={{
                    padding: "3px 10px", background: theme.primaryLight, color: theme.primaryText,
                    borderRadius: "20px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    {activeStatusFilter}
                    <span style={{ cursor: "pointer" }} onClick={() => handleStatusFilter(activeStatusFilter)}>✕</span>
                  </span>
                )}
                {filters.search && (
                  <span style={{
                    padding: "3px 10px", background: theme.primaryLight, color: theme.primaryText,
                    borderRadius: "20px", fontSize: "12px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    "{filters.search}"
                    <span style={{ cursor: "pointer" }} onClick={() => { setSearchInput(""); setFilters(f => ({ ...f, search: "" })); }}>✕</span>
                  </span>
                )}
                <button
                  onClick={() => { setActiveStatusFilter(""); setSearchInput(""); setFilters({ status: "", category: "", search: "" }); }}
                  style={{ marginLeft: "auto", fontSize: "12px", color: theme.textMuted, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Table heading */}
            <div style={{ padding: "16px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: theme.text }}>
                All Records
                <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 600, color: theme.textFaint }}>
                  ({records.length} shown)
                </span>
              </h2>
              {loading && (
                <span style={{ fontSize: "12px", color: theme.textFaint }}>Loading...</span>
              )}
            </div>

            {error && (
              <div style={{ padding: "16px 24px", color: theme.errorText, fontSize: "13px" }}>
                ⚠ {error}
              </div>
            )}

            <RecordTable records={records} onUpdate={handleUpdate} onDelete={handleDelete} onRefresh={refresh} onToast={showToast} />
          </div>

          {/* ── Sidebar: Upcoming Expiries ── */}
          <div id="expiries" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Upcoming Expiries */}
            <div style={{
              background: theme.surface, borderRadius: "16px", padding: "20px",
              boxShadow: theme.shadow,
            }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 800, color: theme.text, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                ⏰ Expiring in 30 Days
              </h3>
              {upcomingExpiries.length === 0 ? (
                <div style={{ fontSize: "13px", color: theme.textFaint, textAlign: "center", padding: "20px 0" }}>
                  No upcoming expiries 🎉
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {upcomingExpiries.map((r) => (
                    <div key={r._id} style={{
                      padding: "12px",
                      background: r.status === "Expiring Soon" ? theme.warningBg : theme.surfaceAlt,
                      borderRadius: "10px",
                      border: `1.5px solid ${r.status === "Expiring Soon" ? theme.warningBorder : theme.border}`,
                    }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: theme.text, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: theme.textMuted }}>
                          {r.expiryDate ? format(parseISO(r.expiryDate), "dd MMM yyyy") : ""}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Stats by Category */}
            <div style={{
              background: theme.accentGradient,
              borderRadius: "16px", padding: "20px",
              color: "#fff",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.7, marginBottom: "12px" }}>
                Compliance Health
              </div>
              {stats.total > 0 ? (
                <>
                  <div style={{ fontSize: "36px", fontWeight: 800, marginBottom: "4px" }}>
                    {Math.round((stats.Active / stats.total) * 100)}%
                  </div>
                  <div style={{ fontSize: "13px", opacity: 0.8, marginBottom: "16px" }}>
                    of records are Active
                  </div>
                  {/* Progress Bar */}
                  <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: "8px", height: "8px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: "8px",
                      background: "linear-gradient(90deg, #4ade80, #22d3ee)",
                      width: `${(stats.Active / stats.total) * 100}%`,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "11px", opacity: 0.7 }}>
                    <span>Active: {stats.Active}</span>
                    <span>Total: {stats.total}</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "13px", opacity: 0.7 }}>No records yet</div>
              )}
            </div>

            {/* Live Activity Feed */}
            <ActivityFeed maxHeight="320px" />

            {/* Live update note */}
            <div style={{
              background: theme.successBg, border: `1.5px solid ${theme.successBorder}`,
              borderRadius: "12px", padding: "14px 16px", fontSize: "12px", color: theme.successText,
              display: "flex", gap: "8px", alignItems: "flex-start",
            }}>
              <span style={{ fontSize: "16px" }}>⚡</span>
              <div>
                <strong>Live Updates Active</strong><br />
                Dashboard refreshes in real-time via WebSocket. Status changes are reflected instantly across all open sessions.
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        * { box-sizing: border-box; }
        button:hover { opacity: 0.9; }
        input::placeholder, textarea::placeholder { color: ${theme.textFaint}; }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: ${theme.primary} !important;
          box-shadow: 0 0 0 3px ${theme.primary}20 !important;
        }
      `}</style>
    </div>
  );
}
