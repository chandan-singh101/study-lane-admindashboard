// server.js
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve frontend
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: true,
  })
);

// ✅ PostgreSQL connection pool (Supabase)
const pool = new Pool({
  connectionString:
    "postgresql://postgres.ykqrfpbkxnnohffjdbdt:Chandan1@singh@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres",
  ssl: {
    rejectUnauthorized: false, // required for Supabase
  },
});

// ---------- AUTH ----------
const ADMIN_USER = "admin";
const ADMIN_PASS = "password123";

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

function isAuthenticated(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ message: "Unauthorized" });
}

// ---------- ORDERS ----------
app.get("/orders", isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.put("/orders/:id/status", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { delivery_status } = req.body;
  const validStatuses = [
    "pending",
    "preparing",
    "in_transit",
    "delivered",
    "failed",
    "cancelled",
  ];

  if (!validStatuses.includes(delivery_status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    await pool.query(
      "UPDATE orders SET delivery_status=$1, updated_at=NOW() WHERE id=$2",
      [delivery_status, id]
    );
    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

app.listen(port, () => {
  console.log(`✅ Admin dashboard running at http://localhost:${port}`);
});
