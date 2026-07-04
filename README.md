# 🗂 RecordVault — Enterprise Record Expiry Tracking System

> **Built for organizations like Deloitte, EY, KPMG, Tata Steel, Reliance, and Adani** who manage hundreds of critical documents — vendor contracts, compliance certificates, safety records, insurance policies, and government licenses — all with one thing in common: **an expiry date**.

---

## 🎯 Problem Statement

Most enterprises still track document expiry in Excel sheets, shared folders, or email chains. Nobody checks them regularly. One day a manager discovers:

- A vendor contract has already expired
- A safety certificate was not renewed in time
- An audit document is missing
- A compliance deadline was missed — resulting in penalties

**RecordVault solves this** by giving every manager one screen to instantly know: what's Active, what's Expiring Soon, and what has already Expired.

---

## ✅ Features

| Feature | Description |
|---|---|
| **Record Management** | Add, edit, delete records with name, category, expiry date, owner |
| **Auto-Classification** | Smart logic: Active / Expiring Soon (≤7 days) / Expired |
| **Real-Time Dashboard** | Live stats via Socket.IO — no refresh needed |
| **Search & Filter** | Full-text search + filter by status and category |
| **Alert Banners** | Prominent warnings for expired and expiring records |
| **Upcoming Expiries** | Sidebar panel showing next 30-day expiry timeline |
| **Compliance Health** | Visual health score showing % of active records |
| **Auto Recalculate** | Cron job recalculates statuses every minute automatically |
| **Inline Edit** | Edit records directly in the table row |
| **Seed Data** | 15 realistic enterprise records across categories |

---

## 🏗 Architecture

```
recordvault/
├── server/                    # Node.js + Express + MongoDB
│   ├── models/
│   │   └── Record.js          # Mongoose model + classification logic
│   ├── routes/
│   │   └── records.js         # REST API endpoints
│   ├── seed/
│   │   └── seed.js            # Demo seed data (15 records)
│   ├── index.js               # Express app + Socket.IO + Cron
│   ├── .env                   # Environment variables
│   └── package.json
│
├── client/                    # React.js frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── StatusBadge.js  # Active/Expiring Soon/Expired badge
│   │   │   ├── StatsCard.js    # Dashboard stat cards (clickable filters)
│   │   │   ├── RecordForm.js   # Add/Edit form with validation
│   │   │   └── RecordTable.js  # Records table with inline editing
│   │   ├── context/
│   │   │   └── SocketContext.js # Socket.IO React context
│   │   ├── hooks/
│   │   │   └── useRecords.js   # Central state + API + socket events
│   │   ├── pages/
│   │   │   └── Dashboard.js    # Main dashboard page
│   │   └── utils/
│   │       └── api.js          # Axios API layer
│   └── package.json
│
├── package.json               # Root: runs both with concurrently
└── README.md
```

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js** v18+ 
- **MongoDB** running locally on port 27017
  - Install: https://www.mongodb.com/try/download/community
  - Or use MongoDB Atlas (free cloud): update `MONGODB_URI` in `server/.env`

### Step 1 — Install all dependencies
```bash
# From the root folder
npm install
npm run install:all
```

### Step 2 — Seed example data (optional but recommended)
```bash
npm run seed
```
This adds 15 realistic enterprise records spanning Active, Expiring Soon, and Expired states.

### Step 3 — Start both servers
```bash
npm run dev
```

This starts:
- **Backend** → http://localhost:5000
- **Frontend** → http://localhost:3000

Open your browser at **http://localhost:3000** 🎉

---

## 🎬 Demo Script

### Step 1: Add a Record
1. Click **"+ Add Record"** in the header
2. Fill in:
   - Name: `Vendor Contract – Tata Consulting`
   - Category: `Legal`
   - Expiry Date: `2026-07-10` (2 weeks out)
   - Owner: `Procurement`
3. Click **Add Record**
4. ✅ Dashboard shows: **Active = +1**, record appears in table

### Step 2: Classify as Expiring Soon
1. Click **Edit** on the record you just added
2. Change Expiry Date to 3 days from today (e.g. `2026-06-29`)
3. Click **Update Record**
4. ⚠️ Record instantly moves to **"Expiring Soon"**
5. Yellow alert banner appears at the top

### Step 3: Mark as Expired
1. Click **Edit** again
2. Change Expiry Date to yesterday (e.g. `2026-06-25`)
3. Click **Update Record**
4. 🚨 Record instantly moves to **"Expired"**
5. Red alert banner appears — demands immediate attention

### Step 4: Open two browser tabs
- Open http://localhost:3000 in Tab 1 and Tab 2
- Make a change in Tab 1
- Watch Tab 2 update **instantly** via Socket.IO — no refresh!

### Step 5: Auto-recalculation
- The backend cron job recalculates **every minute**
- Records near expiry auto-transition even without any user action

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/records` | List all records (supports ?status=, ?category=, ?search=) |
| GET | `/api/records/stats` | Dashboard stats + upcoming expiries |
| GET | `/api/records/:id` | Get single record |
| POST | `/api/records` | Create new record |
| PUT | `/api/records/:id` | Update record (triggers reclassification) |
| DELETE | `/api/records/:id` | Archive record (soft delete) |
| POST | `/api/records/recalculate/all` | Manually recalculate all statuses |
| GET | `/api/health` | Server health check |

### Socket.IO Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `record:created` | Server → Client | `{ record, stats }` |
| `record:updated` | Server → Client | `{ record, stats }` |
| `record:deleted` | Server → Client | `{ recordId, stats }` |
| `records:recalculated` | Server → Client | `{ stats }` |
| `request:stats` | Client → Server | — |

---

## 🧠 Classification Logic

```javascript
// core logic in server/models/Record.js
recordSchema.methods.recalculateStatus = function () {
  const now = new Date();
  const daysLeft = Math.ceil((this.expiryDate - now) / (1000 * 60 * 60 * 24));
  
  this.daysUntilExpiry = daysLeft;
  
  if (daysLeft < 0)       this.status = "Expired";
  else if (daysLeft <= 7) this.status = "Expiring Soon";
  else                    this.status = "Active";
};
```

This runs:
- On every `save()` via Mongoose pre-hook
- On every `findOneAndUpdate()` 
- Every minute via `node-cron` for all records in bulk

---

## 💡 Why This Solution Works

### 1. Simplicity — One Screen, Instant Clarity
A manager opens RecordVault and immediately sees a color-coded count:
- Green (Active) = safe
- Yellow (Expiring Soon) = action needed this week
- Red (Expired) = emergency

No searching. No spreadsheets. No guesswork.

### 2. Automation — Zero Manual Status Updates
Classification happens automatically every time a record is saved or the cron runs. Managers never have to manually mark something as "expired" — the system does it.

### 3. Real-Time Visibility — Live Across All Screens
Socket.IO ensures that when one user updates a record, every open browser window reflects the change instantly. For a team managing 300+ documents, this eliminates stale data.

### 4. Scalability — Production-Ready Architecture
- **MongoDB indexes** on status, expiryDate, and category for fast queries
- **Full-text search index** for instant lookup across 1000s of records
- **Bulk recalculate** with `bulkWrite` — scales to 100,000+ records
- **Soft deletes** (archive flag) preserve audit history
- **Pagination** built into the API for large datasets

### 5. Extensibility — Easy to Add Features
The clean separation of Model / Routes / Hooks / Components makes it straightforward to add:
- Email notifications (node-mailer + cron)
- Role-based access (Admin vs Viewer)
- PDF document attachment
- Multi-company/tenant support
- Export to Excel/PDF reports

---

## 🌍 Real-World Impact

Organizations like **Tata Steel, JSW, Vedanta, Adani** manage:
- 50–300 vendor contracts per year
- 100+ compliance and safety certificates
- Dozens of government licenses and permits

With RecordVault, a 30-minute weekly status meeting becomes a **10-second dashboard check**. A missed renewal that costs ₹5–50 lakh in penalties becomes a **7-day advance warning**.

---

## 👨‍💻 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Node.js + Express | Fast, non-blocking I/O for real-time use |
| Database | MongoDB + Mongoose | Flexible schema, powerful aggregations |
| Real-time | Socket.IO | Battle-tested WebSocket abstraction |
| Scheduler | node-cron | Lightweight cron for auto-recalculation |
| Frontend | React 18 | Component-driven, efficient re-rendering |
| HTTP Client | Axios | Interceptors for clean error handling |
| Date Handling | date-fns | Lightweight, tree-shakeable |

---

## 📊 Seed Data Categories

The seed includes realistic records across:
- **Compliance**: ISO certifications, electrician licenses
- **Safety**: Fire audits, boiler inspections, operator training
- **Insurance**: Property, health, liability policies
- **Government**: GST, factory license, environmental clearance
- **Vendor**: IT consulting, HVAC maintenance contracts
- **Operations**: Vehicle fitness, equipment calibration

---

*Built with ❤️ for the enterprise compliance problem that costs companies millions every year.*
