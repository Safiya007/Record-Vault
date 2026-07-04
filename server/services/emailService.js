const nodemailer = require("nodemailer");

// ─── Transporter Setup ─────────────────────────────────────────────────────
// Uses Gmail SMTP with an App Password (NOT your regular Gmail password).
// To generate one: Google Account → Security → 2-Step Verification → App Passwords
// Required .env vars:
//   EMAIL_USER=youraddress@gmail.com
//   EMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx   (16-char app password, no spaces)
//   EMAIL_ALERTS_ENABLED=true             (set to "false" to disable sending entirely)
let transporter = null;

const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

const getTransporter = () => {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
};

// Verify credentials on startup so failures surface immediately, not on first send.
const verifyEmailConfig = async () => {
  if (process.env.EMAIL_ALERTS_ENABLED === "false") {
    console.log("✉️  Email alerts disabled via EMAIL_ALERTS_ENABLED=false");
    return false;
  }
  if (!isEmailConfigured()) {
    console.log(
      "✉️  Email alerts skipped — EMAIL_USER / EMAIL_APP_PASSWORD not set in .env"
    );
    return false;
  }
  try {
    await getTransporter().verify();
    console.log(`✅ Email alerts ready (sending as ${process.env.EMAIL_USER})`);
    return true;
  } catch (err) {
    console.error("❌ Email config verification failed:", err.message);
    return false;
  }
};

// ─── Templating ─────────────────────────────────────────────────────────────
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const buildAlertContent = (record) => {
  const isExpired = record.status === "Expired";
  const daysAbs = Math.abs(record.daysUntilExpiry);

  const subject = isExpired
    ? `🚨 EXPIRED: ${record.name}`
    : `⚠️ Expiring Soon (${daysAbs}d): ${record.name}`;

  const accentColor = isExpired ? "#dc2626" : "#d97706";
  const badgeLabel = isExpired ? "EXPIRED" : "EXPIRING SOON";
  const statusLine = isExpired
    ? `This record expired <strong>${daysAbs} day${daysAbs === 1 ? "" : "s"} ago</strong>.`
    : `This record expires in <strong>${daysAbs} day${daysAbs === 1 ? "" : "s"}</strong>.`;

  const html = `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px;">
    <div style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: ${accentColor}; padding: 16px 24px;">
        <span style="color: #fff; font-size: 12px; font-weight: 700; letter-spacing: 1px;">${badgeLabel}</span>
      </div>
      <div style="padding: 24px;">
        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 18px;">${record.name}</h2>
        <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.5;">${statusLine}</p>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; width: 40%;">Category</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${record.category}</td>
          </tr>
          <tr style="border-top: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #94a3b8;">Expiry Date</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${formatDate(record.expiryDate)}</td>
          </tr>
          <tr style="border-top: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #94a3b8;">Owner</td>
            <td style="padding: 8px 0; color: #1e293b; font-weight: 600;">${record.owner || "Unassigned"}</td>
          </tr>
          ${record.description ? `
          <tr style="border-top: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #94a3b8; vertical-align: top;">Notes</td>
            <td style="padding: 8px 0; color: #475569;">${record.description}</td>
          </tr>` : ""}
        </table>

        <p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
          Sent automatically by RecordVault. Renew or update this record in the dashboard to clear this alert.
        </p>
      </div>
    </div>
  </div>`;

  const text = `${badgeLabel}: ${record.name}\nCategory: ${record.category}\nExpiry Date: ${formatDate(
    record.expiryDate
  )}\nOwner: ${record.owner || "Unassigned"}\n${statusLine.replace(/<\/?strong>/g, "")}`;

  return { subject, html, text };
};

// ─── Send ───────────────────────────────────────────────────────────────────
// Returns true on success, false on skip/failure (never throws — a failed
// email should never crash the cron job or an API request).
const sendExpiryAlert = async (record) => {
  if (process.env.EMAIL_ALERTS_ENABLED === "false") return false;
  if (!record.ownerEmail) return false;

  const t = getTransporter();
  if (!t) return false;

  const { subject, html, text } = buildAlertContent(record);

  try {
    await t.sendMail({
      from: `"RecordVault Alerts" <${process.env.EMAIL_USER}>`,
      to: record.ownerEmail,
      subject,
      html,
      text,
    });
    console.log(`✉️  Alert sent to ${record.ownerEmail} — ${record.name} (${record.status})`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to send alert for "${record.name}":`, err.message);
    return false;
  }
};

module.exports = {
  sendExpiryAlert,
  verifyEmailConfig,
  isEmailConfigured,
};
