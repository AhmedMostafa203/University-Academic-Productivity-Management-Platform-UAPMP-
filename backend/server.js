const path = require("path");
/**
 * UAPMP Backend Server
 * Main entry point for the application
 */

require("dotenv").config({ path: __dirname + "/../config/.env" }); // Load environment variables from .env file in config directory
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const announcementRoutes = require("./routes/announcement");
const classAnnouncementRoutes = require("./routes/classannouncement");
const classesRoutes = require("./routes/classes");
const attendanceRoutes = require("./routes/attendance");

// Express server setup for UAPMP Backend (Announcements Only)
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder (for announcement attachments)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check route
app.get("/", (req, res) => {
  res.send("UAPMP Backend API is running (Announcements Only)");
});

// Enhanced logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("Body:", req.body);
    if (req.files) console.log("Files:", req.files);
  }
  next();
});

// Materials routes removed. Only announcements are used in this project.

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
// Configure CORS to allow cross-origin requests from frontend
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5501",
      "http://localhost:5501",
      "null",
    ],
    credentials: true,
  }),
);
// Parse incoming JSON request bodies
app.use(express.json());

// ============================================
// API ROUTES
// ============================================
// Mount authentication routes at /api/auth endpoint
app.use("/api/auth", authRoutes);
// Mount announcement routes at /api/announcements endpoint (admin/global)
app.use("/api/announcements", announcementRoutes);
// Mount class announcement routes at /api/classannouncements endpoint (class-specific)
app.use("/api/classannouncements", classAnnouncementRoutes);
// Mount classes routes at /api/classes endpoint
app.use("/api/classes", classesRoutes);
// Mount attendance routes at /api/attendance endpoint
app.use("/api/attendance", attendanceRoutes);

// ============================================
// DATABASE CONNECTION & SERVER INITIALIZATION
// ============================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    // Database connection successful
    console.log("[INFO] Database connection established successfully");

    // Start the Express server only after database connection is established
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`[SUCCESS] Server initialized on port ${PORT}`);
      console.log("[INFO] Application is ready to accept requests");
    });
  })
  .catch((err) => {
    // Database connection failed - exit application
    console.error("[ERROR] Database connection failed:", err.message);
    process.exit(1);
  });

// Catch-all error handler (always returns JSON)
app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR]", err);
  res
    .status(500)
    .json({ message: "Internal server error", error: err.message });
});
