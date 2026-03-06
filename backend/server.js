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

const app = express();

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
// Mount announcement routes at /api/announcements endpoint
app.use("/api/announcements", announcementRoutes);

// ============================================
// DATABASE CONNECTION & SERVER INITIALIZATION
// ============================================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    // Database connection successful
    console.log("[INFO] Database connection established successfully");

    // Start the Express server only after database connection is established
    app.listen(process.env.PORT, () => {
      console.log(`[SUCCESS] Server initialized on port ${process.env.PORT}`);
      console.log("[INFO] Application is ready to accept requests");
    });
  })
  .catch((err) => {
    // Database connection failed - exit application
    console.error("[ERROR] Database connection failed:", err.message);
    process.exit(1);
  });