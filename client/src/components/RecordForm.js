import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

const CATEGORIES = [
  "Legal", "Compliance", "Safety", "Insurance",
  "Finance", "HR", "Operations", "Government", "Vendor", "Other",
];

export const RecordForm = ({ record, onSubmit, onCancel, loading }) => {
  const { theme } = useTheme();

  const [form, setForm] = useState({
    name: "",
    category: "Legal",
    expiryDate: "",
    description: "",
    owner: "",
    ownerEmail: "",
  });
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);

  useEffect(() => {
    if (record) {
      setForm({
        name: record.name || "",
        category: record.category || "Legal",
        expiryDate: record.expiryDate
          ? new Date(record.expiryDate).toISOString().split("T")[0]
          : "",
        description: record.description || "",
        owner: record.owner || "",
        ownerEmail: record.ownerEmail || "",
      });
    }
  }, [record]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Record name is required";
    if (!form.expiryDate) errs.expiryDate = "Expiry date is required";
    if (!form.category) errs.category = "Category is required";
    if (form.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) {
      errs.ownerEmail = "Enter a valid email address";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    await onSubmit(form);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    border: `2px solid ${theme.border}`,
    borderRadius: "10px",
    fontSize: "14px",
    color: theme.text,
    background: theme.surface,
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: theme.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "6px",
  };

  const getFocusedStyle = (field) => ({
    ...inputStyle,
    borderColor: errors[field] ? theme.errorText : focused === field ? theme.primary : theme.border,
    boxShadow: focused === field && !errors[field] ? `0 0 0 3px ${theme.primary}20` : "none",
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Name */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Record Name *</label>
          <input
            type="text"
            placeholder="e.g. Vendor Contract – Tata Consulting"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            onFocus={() => setFocused("name")}
            onBlur={() => setFocused(null)}
            style={getFocusedStyle("name")}
          />
          {errors.name && (
            <p style={{ color: theme.errorText, fontSize: "12px", marginTop: "4px" }}>
              {errors.name}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label style={labelStyle}>Category *</label>
          <select
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            onFocus={() => setFocused("category")}
            onBlur={() => setFocused(null)}
            style={getFocusedStyle("category")}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Expiry Date */}
        <div>
          <label style={labelStyle}>Expiry Date *</label>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) => handleChange("expiryDate", e.target.value)}
            onFocus={() => setFocused("expiryDate")}
            onBlur={() => setFocused(null)}
            style={getFocusedStyle("expiryDate")}
          />
          {errors.expiryDate && (
            <p style={{ color: theme.errorText, fontSize: "12px", marginTop: "4px" }}>
              {errors.expiryDate}
            </p>
          )}
        </div>

        {/* Owner */}
        <div>
          <label style={labelStyle}>Owner / Department</label>
          <input
            type="text"
            placeholder="e.g. Legal Dept"
            value={form.owner}
            onChange={(e) => handleChange("owner", e.target.value)}
            onFocus={() => setFocused("owner")}
            onBlur={() => setFocused(null)}
            style={getFocusedStyle("owner")}
          />
        </div>

        {/* Owner Email */}
        <div>
          <label style={labelStyle}>Owner Email (for alerts)</label>
          <input
            type="email"
            placeholder="e.g. legal.dept@company.com"
            value={form.ownerEmail}
            onChange={(e) => handleChange("ownerEmail", e.target.value)}
            onFocus={() => setFocused("ownerEmail")}
            onBlur={() => setFocused(null)}
            style={getFocusedStyle("ownerEmail")}
          />
          {errors.ownerEmail && (
            <p style={{ color: theme.errorText, fontSize: "12px", marginTop: "4px" }}>
              {errors.ownerEmail}
            </p>
          )}
        </div>

        {/* Description */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Description</label>
          <textarea
            placeholder="Optional: add notes or details about this record"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            onFocus={() => setFocused("description")}
            onBlur={() => setFocused(null)}
            rows={3}
            style={{
              ...getFocusedStyle("description"),
              resize: "vertical",
              minHeight: "80px",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: "10px 20px",
              border: `2px solid ${theme.border}`,
              borderRadius: "10px",
              background: theme.surface,
              color: theme.textMuted,
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 28px",
            background: loading ? theme.borderStrong : "linear-gradient(135deg, #4f46e5, #7c3aed)",
            border: "none",
            borderRadius: "10px",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.3px",
            boxShadow: loading ? "none" : "0 4px 12px #4f46e540",
          }}
        >
          {loading ? "Saving..." : record ? "Update Record" : "Add Record"}
        </button>
      </div>
    </form>
  );
};

export default RecordForm;
