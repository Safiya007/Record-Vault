require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Record = require("../models/Record");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/recordvault";

const today = new Date();
const addDays = (d) => new Date(today.getTime() + d * 24 * 60 * 60 * 1000);
const subDays = (d) => new Date(today.getTime() - d * 24 * 60 * 60 * 1000);

// NOTE: these use a fictional @acme-demo.com domain so seeding never sends
// real emails. To actually demo the email alert feature, edit one or two
// ownerEmail values below to a real inbox you control before running `npm run seed`.
const seedRecords = [
  // Active records
  {
    name: "ISO 9001 Quality Certification",
    category: "Compliance",
    expiryDate: addDays(180),
    description: "Annual quality management system certification",
    owner: "Quality Dept",
    ownerEmail: "quality.dept@acme-demo.com",
  },
  {
    name: "Fire Safety Audit Certificate",
    category: "Safety",
    expiryDate: addDays(90),
    description: "Mandatory fire safety audit for all facilities",
    owner: "HSE Team",
    ownerEmail: "hse.team@acme-demo.com",
  },
  {
    name: "Commercial Property Insurance",
    category: "Insurance",
    expiryDate: addDays(120),
    description: "Covers all company premises and assets",
    owner: "Finance Dept",
    ownerEmail: "finance.dept@acme-demo.com",
  },
  {
    name: "Annual Maintenance Contract - HVAC",
    category: "Vendor",
    expiryDate: addDays(200),
    description: "HVAC maintenance across 3 facilities",
    owner: "Facilities",
    ownerEmail: "facilities@acme-demo.com",
  },
  {
    name: "GST Registration Certificate",
    category: "Government",
    expiryDate: addDays(365),
    description: "Goods and Services Tax registration",
    owner: "Legal Dept",
    ownerEmail: "legal.dept@acme-demo.com",
  },
  {
    name: "Employee Group Health Insurance",
    category: "HR",
    expiryDate: addDays(150),
    description: "Group mediclaim for 500 employees",
    owner: "HR Dept",
    ownerEmail: "hr.dept@acme-demo.com",
  },
  {
    name: "Factory Operating License",
    category: "Government",
    expiryDate: addDays(60),
    description: "State-issued factory operating permit",
    owner: "Compliance",
    ownerEmail: "compliance@acme-demo.com",
  },

  // Expiring Soon (within 7 days)
  {
    name: "Vendor Contract - Tata Consulting",
    category: "Legal",
    expiryDate: addDays(3),
    description: "IT consulting services agreement",
    owner: "Procurement",
    ownerEmail: "procurement@acme-demo.com",
  },
  {
    name: "Boiler Inspection Certificate",
    category: "Safety",
    expiryDate: addDays(5),
    description: "Statutory boiler pressure inspection",
    owner: "Plant Engineering",
    ownerEmail: "plant.eng@acme-demo.com",
  },
  {
    name: "Electrician License - Unit 2",
    category: "Compliance",
    expiryDate: addDays(7),
    description: "Licensed electrician permit for Unit 2 operations",
    owner: "Operations",
    ownerEmail: "operations@acme-demo.com",
  },
  {
    name: "Annual Calibration Certificate - Lab Equipment",
    category: "Operations",
    expiryDate: addDays(2),
    description: "Precision instrument calibration for R&D lab",
    owner: "R&D Dept",
    ownerEmail: "rnd.dept@acme-demo.com",
  },

  // Expired
  {
    name: "Safety Training Record - Batch A",
    category: "Safety",
    expiryDate: subDays(15),
    description: "Forklift operator safety certification - 20 operators",
    owner: "HSE Team",
    ownerEmail: "hse.team@acme-demo.com",
  },
  {
    name: "Vehicle Fitness Certificate - Truck FL-001",
    category: "Operations",
    expiryDate: subDays(30),
    description: "Commercial vehicle fitness certificate",
    owner: "Logistics",
    ownerEmail: "logistics@acme-demo.com",
  },
  {
    name: "Third-Party Liability Insurance",
    category: "Insurance",
    expiryDate: subDays(5),
    description: "Third party liability for manufacturing unit",
    owner: "Finance Dept",
    ownerEmail: "finance.dept@acme-demo.com",
  },
  {
    name: "Environmental Clearance Certificate",
    category: "Government",
    expiryDate: subDays(10),
    description: "State Pollution Control Board clearance",
    owner: "Compliance",
    ownerEmail: "compliance@acme-demo.com",
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    await Record.deleteMany({});
    console.log("🗑️  Cleared existing records");

    const created = await Record.insertMany(seedRecords);
    console.log(`🌱 Seeded ${created.length} records`);

    // Print summary
    const stats = await Record.getDashboardStats();
    console.log("\n📊 Dashboard Stats:");
    console.log(`   Active: ${stats.Active}`);
    console.log(`   Expiring Soon: ${stats["Expiring Soon"]}`);
    console.log(`   Expired: ${stats.Expired}`);
    console.log(`   Total: ${stats.total}`);

    await mongoose.disconnect();
    console.log("\n✅ Seed complete!");
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
