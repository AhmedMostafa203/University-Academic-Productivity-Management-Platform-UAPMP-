/**
 * UAPMP Backend Server
 * Main entry point for the application
 */

require("dotenv").config();

// ============================================
// ENVIRONMENT VARIABLES VALIDATION
// ============================================
const requiredEnvVars = [
  "MONGO_URI",
  "PORT",
  "JWT_SECRET",
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASS",
  "BACKEND_URL",
  "GOOGLE_CLIENT_ID",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[ERROR] Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const classRoutes = require("./routes/classes");
const assignmentRoutes = require("./routes/assignments");
const announcementRoutes = require("./routes/announcement");

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
    ],
    credentials: true,
  }),
);
app.use(express.json());

// ============================================
// API ROUTES
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/announcements", announcementRoutes);

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ message: "Route not found", code: "NOT_FOUND" });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error("[ERROR] Unhandled error:", err.stack);
  res.status(500).json({ message: "Something went wrong", code: "INTERNAL_SERVER_ERROR" });
});

// ============================================
// DATABASE CONNECTION & SERVER INITIALIZATION
// ============================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("[INFO] Database connection established successfully");
    app.listen(process.env.PORT || 3000, () => {
      console.log(`[SUCCESS] Server initialized on port ${process.env.PORT}`);
      console.log("[INFO] Application is ready to accept requests");
    });
  })
  .catch((err) => {
    console.error("[ERROR] Database connection failed:", err.message);
    process.exit(1);
  });