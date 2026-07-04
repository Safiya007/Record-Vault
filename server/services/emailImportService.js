const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const chrono = require("chrono-node");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

// ─── Auto-classification ────────────────────────────────────────────────────
// Simple, transparent keyword scoring — no ML dependency, easy to tune, and
// easy to explain in a demo ("it matched these words to this category").
const CATEGORY_KEYWORDS = {
  Legal: ["contract", "agreement", "nda", "lease", "legal", "terms of service", "litigation"],
  Compliance: ["compliance", "audit", "certification", "iso 9001", "iso27001", "regulatory filing"],
  Safety: ["safety", "osha", "ppe", "incident report", "hazard", "fire safety"],
  Insurance: ["insurance", "policy number", "premium", "claim", "coverage", "underwriter"],
  Finance: ["invoice", "payment due", "tax filing", "financial statement", "budget"],
  HR: ["employee", "offer letter", "payroll", "benefits enrollment", "onboarding", "hr policy"],
  Government: ["license", "permit", "government", "municipal", "regulatory", "gazette"],
  Vendor: ["vendor", "supplier", "purchase order", "po number", "quotation", "sow"],
  Operations: ["maintenance", "operations", "sla", "service agreement", "warranty"],
};

const classifyText = (text) => {
  const lower = text.toLowerCase();
  let bestCategory = "Other";
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => (lower.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  return { category: bestCategory, confidence: bestScore };
};

// Looks for an explicit expiry/renewal date phrase first ("expires on ...",
// "valid until ...") before falling back to chrono's general date detection,
// since a generic date-scan can pick up unrelated dates (e.g. the email's
// own send date mentioned in a signature).
const EXPIRY_PHRASE_PATTERNS = [
  /(?:expires?|expiry date|expiration date)\s*(?:on|:|is)?\s*([a-z0-9 ,\/\-]+\d{2,4})/i,
  /valid\s+(?:until|through|thru)\s*([a-z0-9 ,\/\-]+\d{2,4})/i,
  /renewal date\s*(?:is|:)?\s*([a-z0-9 ,\/\-]+\d{2,4})/i,
];

const extractExpiryDate = (text) => {
  for (const pattern of EXPIRY_PHRASE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const parsed = chrono.parseDate(match[1]);
      if (parsed && parsed > new Date()) {
        return { date: parsed, guessed: false };
      }
    }
  }
  // Fall back to any future date mentioned anywhere in the text
  const results = chrono.parse(text);
  const futureDate = results
    .map((r) => r.start.date())
    .find((d) => d > new Date());
  if (futureDate) return { date: futureDate, guessed: true };

  return { date: null, guessed: true };
};

const isEmailImportConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD);

// ─── IMAP Scan ───────────────────────────────────────────────────────────────
// Scans unseen inbox messages for supported attachments, auto-classifies
// and auto-creates a Record for each one, then marks the message seen so
// it isn't re-imported on the next scan. Never throws — returns a result
// summary with any per-message errors instead, so one bad email can't
// abort the whole batch.
const scanInboxForRecords = async ({ limit = 20 } = {}) => {
  if (!isEmailImportConfigured()) {
    throw new Error("Email is not configured (EMAIL_USER / EMAIL_APP_PASSWORD missing in .env)");
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    logger: false,
  });

  const imported = [];
  const skipped = [];
  const errors = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      const targetUids = uids.slice(-limit); // most recent N unseen

      for (const uid of targetUids) {
        try {
          const { content } = await client.download(uid, undefined, { uid: true });
          const chunks = [];
          for await (const chunk of content) chunks.push(chunk);
          const raw = Buffer.concat(chunks);
          const parsed = await simpleParser(raw);

          const relevantAttachments = (parsed.attachments || []).filter((a) =>
            ALLOWED_ATTACHMENT_TYPES.has(a.contentType)
          );

          if (relevantAttachments.length === 0) {
            skipped.push({ uid, subject: parsed.subject, reason: "No supported attachment" });
            await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
            continue;
          }

          const subject = parsed.subject || "(no subject)";
          const bodyText = parsed.text || "";
          const combinedText = `${subject}\n${bodyText}`;
          const { category, confidence } = classifyText(combinedText);
          const { date: expiryDate, guessed } = extractExpiryDate(combinedText);
          const finalExpiryDate = expiryDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
          const fromAddress = parsed.from?.value?.[0]?.address || "";

          for (const attachment of relevantAttachments) {
            const recordDraft = {
              name: subject.slice(0, 120),
              category,
              expiryDate: finalExpiryDate,
              description: `Auto-imported from email${guessed ? " — expiry date estimated, please verify." : "."}`,
              owner: fromAddress,
              ownerEmail: fromAddress,
              needsReview: guessed || confidence === 0,
              source: {
                sourceType: "email_import",
                messageId: parsed.messageId || String(uid),
                from: fromAddress,
                subject,
              },
              _attachmentBuffer: attachment.content,
              _attachmentMeta: {
                originalName: attachment.filename || "attachment",
                mimetype: attachment.contentType,
                size: attachment.size,
              },
            };
            imported.push(recordDraft);
          }

          await client.messageFlagsAdd(uid, ["\\Seen"], { uid: true });
        } catch (err) {
          errors.push({ uid, error: err.message });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => client.close());
  }

  return { imported, skipped, errors };
};

// Persists a single imported draft as a real Record + saved attachment file.
// Kept separate from the IMAP scan so the route layer controls DB writes
// and socket/activity emission.
const saveImportedAttachment = (recordId, buffer, meta) => {
  const dir = path.join(UPLOAD_ROOT, recordId.toString());
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(meta.originalName) || "";
  const storedName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  fs.writeFileSync(path.join(dir, storedName), buffer);
  return {
    originalName: meta.originalName,
    storedName,
    mimetype: meta.mimetype,
    size: meta.size,
    uploadedAt: new Date(),
  };
};

module.exports = {
  scanInboxForRecords,
  saveImportedAttachment,
  classifyText,
  extractExpiryDate,
  isEmailImportConfigured,
  CATEGORY_KEYWORDS,
};
