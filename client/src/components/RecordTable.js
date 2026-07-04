import React, { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import StatusBadge from "./StatusBadge";
import RecordForm from "./RecordForm";
import { useTheme } from "../context/ThemeContext";
import { useNow } from "../hooks/useNow";
import { recordsApi } from "../utils/api";

const CATEGORY_COLORS = {
  Legal: "#7c3aed",
  Compliance: "#0891b2",
  Safety: "#dc2626",
  Insurance: "#059669",
  Finance: "#d97706",
  HR: "#db2777",
  Operations: "#4f46e5",
  Government: "#065f46",
  Vendor: "#92400e",
  Other: "#64748b",
};

const formatSize = (bytes) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Live, second-precision countdown for records that are Expiring Soon —
// the most time-sensitive ones. Recomputed every tick from `now`.
const formatLiveCountdown = (expiryDate, now) => {
  const diffMs = new Date(expiryDate).getTime() - now;
  const abs = Math.abs(diffMs);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const secs = Math.floor((abs % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const clock = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  const text = days > 0 ? `${days}d ${clock}` : clock;
  return diffMs < 0 ? `-${text}` : text;
};

const AttachmentCell = ({ record, onRefresh, onToast, theme }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onToast?.("File too large — 10MB max", "error");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      await recordsApi.uploadAttachment(record._id, file, setProgress);
      onToast?.("Document uploaded");
      await onRefresh?.();
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await recordsApi.deleteAttachment(record._id);
      onToast?.("Document removed");
      await onRefresh?.();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleDownload = () => {
    window.open(recordsApi.attachmentDownloadUrl(record._id), "_blank");
  };

  if (uploading) {
    return (
      <span style={{ fontSize: "11px", color: theme.textFaint }}>
        Uploading… {progress}%
      </span>
    );
  }

  if (record.attachment?.originalName) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={handleDownload}
          title={`${record.attachment.originalName} (${formatSize(record.attachment.size)})`}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "4px 10px", border: `1.5px solid ${theme.border}`,
            borderRadius: "7px", background: theme.surfaceAlt, color: theme.text,
            fontSize: "11px", fontWeight: 600, cursor: "pointer",
            maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          📎 {record.attachment.originalName}
        </button>
        <button
          onClick={handleDelete}
          title="Remove document"
          style={{
            border: "none", background: "none", color: theme.errorText,
            cursor: "pointer", fontSize: "13px", padding: "2px",
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handlePick}
        style={{
          padding: "4px 10px", border: `1.5px dashed ${theme.borderStrong}`,
          borderRadius: "7px", background: "transparent", color: theme.textMuted,
          fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        📎 Upload
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </>
  );
};

export const RecordTable = ({ records, onUpdate, onDelete, onRefresh, onToast }) => {
  const { theme } = useTheme();
  const [editingId, setEditingId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const now = useNow(1000);

  const handleEdit = async (data) => {
    setEditLoading(true);
    try {
      await onUpdate(editingId, data);
      setEditingId(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await onDelete(id);
    setDeleteConfirm(null);
  };

  if (!records.length) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 20px",
          color: theme.textFaint,
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
        <div style={{ fontSize: "16px", fontWeight: 600, color: theme.textMuted }}>No records found</div>
        <div style={{ fontSize: "13px", marginTop: "4px" }}>
          Add a record or adjust your filters
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr>
            {["Record Name", "Category", "Owner", "Document", "Expiry Date", "Days Left", "Status", "Actions"].map(
              (h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    color: theme.textMuted,
                    background: theme.surfaceAlt,
                    borderBottom: `2px solid ${theme.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const isEditing = editingId === record._id;
            const isExpired = record.status === "Expired";
            const isExpiringSoon = record.status === "Expiring Soon";

            return (
              <React.Fragment key={record._id}>
                <tr
                  style={{
                    background: isExpired
                      ? theme.errorBg
                      : isExpiringSoon
                      ? theme.warningBg
                      : theme.surface,
                    borderLeft: isExpired
                      ? "3px solid #ef4444"
                      : isExpiringSoon
                      ? "3px solid #f59e0b"
                      : "3px solid transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                      fontWeight: 600,
                      color: theme.text,
                      maxWidth: "220px",
                    }}
                  >
                    <div style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}>
                      {record.name}
                      {record.needsReview && (
                        <span
                          title="Auto-imported from email — expiry date was estimated, please verify"
                          style={{
                            fontSize: "10px", fontWeight: 700, padding: "1px 6px",
                            borderRadius: "999px", background: theme.warningBg,
                            color: theme.warningText, whiteSpace: "nowrap", flexShrink: 0,
                          }}
                        >
                          ⚠ Review
                        </span>
                      )}
                    </div>
                    {record.description && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: theme.textFaint,
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 400,
                        }}
                      >
                        {record.description}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: `${CATEGORY_COLORS[record.category] || "#64748b"}20`,
                        color: CATEGORY_COLORS[record.category] || "#64748b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.category}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                      color: theme.textMuted,
                      fontSize: "13px",
                    }}
                  >
                    {record.owner || "—"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <AttachmentCell record={record} onRefresh={onRefresh} onToast={onToast} theme={theme} />
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                      fontFamily: "monospace",
                      color: isExpired ? theme.errorText : theme.text,
                      fontWeight: 600,
                    }}
                  >
                    {record.expiryDate
                      ? format(parseISO(record.expiryDate), "dd MMM yyyy")
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                      fontWeight: 700,
                      fontFamily: isExpiringSoon ? "monospace" : "inherit",
                      color:
                        record.daysUntilExpiry < 0
                          ? theme.errorText
                          : record.daysUntilExpiry <= 7
                          ? theme.warningText
                          : theme.successText,
                    }}
                  >
                    {isExpiringSoon
                      ? formatLiveCountdown(record.expiryDate, now)
                      : record.daysUntilExpiry < 0
                      ? `${Math.abs(record.daysUntilExpiry)}d ago`
                      : `${record.daysUntilExpiry}d`}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <StatusBadge status={record.status} />
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: `1px solid ${theme.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      onClick={() =>
                        setEditingId(editingId === record._id ? null : record._id)
                      }
                      style={{
                        padding: "5px 14px",
                        marginRight: "6px",
                        border: `1.5px solid ${theme.primary}`,
                        borderRadius: "7px",
                        background: "transparent",
                        color: theme.primaryText,
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                    {deleteConfirm === record._id ? (
                      <>
                        <button
                          onClick={() => handleDelete(record._id)}
                          style={{
                            padding: "5px 12px",
                            marginRight: "4px",
                            border: "none",
                            borderRadius: "7px",
                            background: "#ef4444",
                            color: "#fff",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          style={{
                            padding: "5px 8px",
                            border: `1.5px solid ${theme.border}`,
                            borderRadius: "7px",
                            background: theme.surface,
                            color: theme.textMuted,
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(record._id)}
                        style={{
                          padding: "5px 12px",
                          border: "1.5px solid #ef4444",
                          borderRadius: "7px",
                          background: "transparent",
                          color: "#ef4444",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>

                {/* Inline Edit Row */}
                {isEditing && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "20px",
                        background: theme.surfaceAlt,
                        borderBottom: `2px solid ${theme.primaryBorder}`,
                        borderLeft: `3px solid ${theme.primary}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: theme.primaryText,
                          marginBottom: "16px",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                        }}
                      >
                        ✏ Edit Record
                      </div>
                      <RecordForm
                        record={record}
                        onSubmit={handleEdit}
                        onCancel={() => setEditingId(null)}
                        loading={editLoading}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RecordTable;
