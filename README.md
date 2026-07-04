# 🗂 RecordVault — Enterprise Record Expiry Tracking System

> **Built for organizations like Deloitte, EY, KPMG, Tata Steel, Reliance, and Adani** who manage hundreds of critical documents — vendor contracts, compliance certificates, safety records, insurance policies, and government licenses — all with one thing in common: **an expiry date**.

🔗 **Live demo:** https://record-vault-five.vercel.app
📦 **Repo:** https://github.com/Safiya007/Record-Vault

> Note: the live backend runs on Render's free tier, which spins down after inactivity — the first request after a while may take ~30-50 seconds to wake up. Refresh if the first load feels slow.

---

## 🎯 Problem Statement

Most enterprises still track document expiry in Excel sheets, shared folders, or email chains. Nobody checks them regularly. One day a manager discovers:

- A vendor contract has already expired
- A safety certificate was not renewed in time
- An audit document is missing
- A compliance deadline was missed — resulting in penalties

**RecordVault solves this** by giving every manager one screen to instantly know: what's Active, what's Expiring Soon, and what has already Expired — and it keeps that screen honest automatically, without anyone having to remember to check.

---

## ✅ Features

### Core tracking
| Feature | Description |
|---|---|
| Record Management | Add, edit, delete records with name, category, expiry date, owner, owner email |
| Auto-Classification | Active / Expiring Soon (≤7 days) / Expired — recalculated on every save and every minute via cron |
| Dashboard | Stat cards, upcoming-expiry sidebar, compliance health score |
| Search & Filter | Full-text search + category/status filters |
| Document Attachments | Upload the actual contract/certificate (PDF, image, Word doc) against a record; download or remove it later |

### Automation
| Feature | Description |
|---|---|
| Email Alerts | Automatic email (Gmail SMTP via Nodemailer) when a record becomes Expiring Soon or Expired — styled HTML template, won't re-send for the same status twice |
| Email Import + Auto-Classify | Scans a Gmail inbox via IMAP for emails with attachments, auto-classifies each into a category using keyword scoring, and attempts to extract an expiry date from the email text (e.g. "expires on...", "valid until..."). Records with an uncertain/guessed date are flagged ⚠ **Needs Review** |
| Auto Recalculate | Cron job re-evaluates every record's status every minute, no manual action needed |

### Real-time
| Feature | Description |
|---|---|
| Live Sync | Every create/edit/delete/status-change reflects instantly across all open browser tabs via Socket.IO |
| Presence | "Live · N online" indicator showing how many clients are currently connected |
| Live Activity Feed | Persisted, chronological log of every action (created, updated, deleted, status changed, alert sent, document uploaded, imported) — streams in live |
| Toast Notifications | You're notified when *another* user makes a change (not your own actions, to avoid noise) |
| Live Countdown Timers | Records that are Expiring Soon show a ticking `Nd HH:MM:SS` countdown, no refresh needed |

### Interface
| Feature | Description |
|---|---|
| Animated Interactive Charts | Status breakdown (donut), category breakdown (bar), 8-month expiry timeline (area) — all animated, all update live |
| Dark / Light Theme | Full theme system, toggled from the menu drawer, persisted across sessions, respects system preference |
| Menu Drawer | Slide-out navigation with theme toggle, manual recalculate, email import trigger, quick-jump links |
| Animated Logo | Small custom SVG mark with an orbiting "tracking" dot |

---

## 🏗 Architecture

```
recordvault/
├── server/                        # Node.js + Express + MongoDB + Socket.IO
│   ├── models/
│   │   ├── Record.js               # Schema + classification + alert-tracking logic
│   │   └── Activity.js             # Activity log for the live feed
│   ├── routes/
│   │   ├── records.js              # CRUD + attachments + manual alert send
│   │   ├── activity.js             # Recent activity feed (REST hydration)
│   │   └── emailImport.js          # Triggers an IMAP inbox scan + import
│   ├── middleware/
│   │   └── upload.js               # Multer config for document attachments
│   ├── services/
│   │   ├── emailService.js         # Outgoing alert emails (Nodemailer)
│   │   └── emailImportService.js   # IMAP scan, classification, date extraction
│   ├── seed/seed.js                # 15 realistic demo records
│   ├── uploads/                    # Uploaded documents (gitignored)
│   └── index.js                    # Express + Socket.IO + cron entrypoint
│
├── client/                         # React 18 frontend
│   └── src/
│       ├── components/
│       │   ├── RecordTable.js       # Table with inline edit, attachments, live countdowns
│       │   ├── RecordForm.js
│       │   ├── StatsCard.js / StatusBadge.js
│       │   ├── Charts.js            # Recharts-based animated insights
│       │   ├── ActivityFeed.js
│       │   ├── MenuDrawer.js
│       │   └── Logo.js
│       ├── context/
│       │   ├── SocketContext.js     # Socket.IO connection + presence
│       │   └── ThemeContext.js      # Light/dark token palette
│       ├── hooks/
│       │   ├── useRecords.js        # Central state + API + socket events
│       │   └── useNow.js            # Ticking clock for live countdowns
│       ├── pages/Dashboard.js
│       └── utils/api.js             # Axios layer (env-aware base URL)
│
└── package.json                    # Root: runs both with concurrently
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v18+
- A MongoDB database — local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- A Gmail account + [App Password](https://myaccount.google.com/apppasswords) (for email alerts/import — optional, app works without it)

### Step 1 — Install everything
```bash
npm run install:all
```

### Step 2 — Configure environment
Copy `server/.env.example` → `server/.env` (or edit the existing `.env`) and fill in:
```
MONGODB_URI=your-connection-string
EMAIL_USER=youraddress@gmail.com
EMAIL_APP_PASSWORD=your16charapppassword
EMAIL_ALERTS_ENABLED=true
```
For email import, also enable IMAP in Gmail: **Settings → Forwarding and POP/IMAP → Enable IMAP**.

### Step 3 — Seed demo data (optional but recommended)
```bash
npm run seed
```

### Step 4 — Run
```bash
npm run dev
```
- Backend → http://localhost:5000
- Frontend → http://localhost:3000

---

## ☁️ Deployment

Deployed as two separate services:
- **Backend** (Express + Socket.IO) → [Render](https://render.com), root directory `server`
- **Frontend** (React) → [Vercel](https://vercel.com), root directory `client`
- **Database** → MongoDB Atlas

The frontend reads two build-time environment variables so it can be deployed independently of the backend's domain:
```
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend.onrender.com
```
The backend's `CLIENT_URL` env var must point back at the deployed frontend domain, for CORS.

> Note: on Render's free tier, outbound SMTP/IMAP connections may be restricted, so email alerts/import are most reliable when run locally or on a paid tier.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/records` | List records (`?status=`, `?category=`, `?search=`) |
| GET | `/api/records/stats` | Dashboard stats + upcoming expiries |
| POST | `/api/records` | Create record |
| PUT | `/api/records/:id` | Update record (triggers reclassification) |
| DELETE | `/api/records/:id` | Archive record (soft delete) |
| POST | `/api/records/recalculate/all` | Manually recalculate all statuses |
| POST | `/api/records/:id/send-alert` | Manually (re)send the expiry alert email |
| POST | `/api/records/:id/attachment` | Upload/replace a record's document |
| GET | `/api/records/:id/attachment` | Download the attached document |
| DELETE | `/api/records/:id/attachment` | Remove the attached document |
| GET | `/api/activity` | Recent activity log entries |
| GET | `/api/email-import/status` | Whether email import is configured |
| POST | `/api/email-import/scan` | Scan inbox, auto-classify, and create records |

### Socket.IO Events
| Event | Direction | Payload |
|---|---|---|
| `record:created` / `record:updated` | Server → Client | `{ record, stats, origin }` |
| `record:deleted` | Server → Client | `{ recordId, stats, origin }` |
| `records:recalculated` | Server → Client | `{ stats }` |
| `activity:new` | Server → Client | `{ entry }` |
| `presence:update` | Server → Client | `{ count }` |

`origin` carries the originating client's socket id, so a client can tell "my own action" apart from "someone else's" and only toast for the latter.

---

## 🧠 Classification Logic

```js
// server/models/Record.js
recordSchema.methods.recalculateStatus = function () {
  const daysLeft = Math.ceil((this.expiryDate - new Date()) / 86400000);
  this.daysUntilExpiry = daysLeft;

  if (daysLeft < 0)       this.status = "Expired";
  else if (daysLeft <= 7) this.status = "Expiring Soon";
  else                    this.status = "Active";
};
```
Runs on every `save()`, every update, and in bulk every minute via `node-cron` — so status is never stale, regardless of whether anyone opens the app.

## 🏷 Email Auto-Classification Logic

Keyword scoring against category-specific term lists (transparent and explainable, not a black-box model):
```js
const CATEGORY_KEYWORDS = {
  Legal: ["contract", "agreement", "nda", ...],
  Safety: ["safety", "osha", "ppe", ...],
  Insurance: ["insurance", "policy number", "premium", ...],
  // ...
};
```
Expiry dates are extracted by first looking for explicit phrases ("expires on...", "valid until...") parsed via `chrono-node`; if no confident date is found, the record is created with an estimated date and flagged `needsReview: true` so a human double-checks it — the system never silently guesses without telling you.

---

## 👨‍💻 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Node.js + Express | Fast, non-blocking I/O for real-time use |
| Database | MongoDB + Mongoose | Flexible schema, powerful aggregations |
| Real-time | Socket.IO | Battle-tested WebSocket abstraction |
| Scheduler | node-cron | Lightweight cron for auto-recalculation |
| Email | Nodemailer (SMTP) + ImapFlow + mailparser (IMAP) | Send alerts and read/parse inbox attachments |
| Date parsing | chrono-node | Natural-language expiry date extraction |
| File uploads | Multer | Document attachment storage |
| Frontend | React 18 | Component-driven, efficient re-rendering |
| Charts | Recharts | Animated, declarative charts |
| HTTP Client | Axios | Interceptors for clean error handling + origin tagging |
| Date Handling | date-fns | Lightweight, tree-shakeable |

---

## 💡 Why This Solution Works

1. **Simplicity** — one screen, color-coded, no spreadsheets, no guesswork.
2. **Automation** — status transitions and alert emails happen without anyone manually updating anything.
3. **Real-time visibility** — every open session reflects the true current state instantly, with a live audit trail of who changed what.
4. **Proactive, not just reactive** — email import means records can enter the system automatically from existing inbox correspondence, not only manual entry.
5. **Honest about uncertainty** — auto-classified/auto-dated records are flagged for review rather than silently trusted, which matters for something enterprises will rely on.

---

## 📊 Seed Data

15 realistic enterprise records across Compliance, Safety, Insurance, Government, Vendor, HR, Legal, and Operations — spanning Active, Expiring Soon, and Expired states out of the box.

---

Built for the record-expiry-tracking challenge — because a missed renewal shouldn't be how a compliance gap gets discovered.
