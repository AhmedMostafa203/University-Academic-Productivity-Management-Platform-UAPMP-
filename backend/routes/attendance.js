// routes/attendance.js
// Attendance System API routes

const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// Apply authentication to all attendance routes
router.use(authenticateToken);

// Instructor: Create attendance session
router.post(
  "/session",
  authorizeRole("instructor"),
  attendanceController.createSession,
);

// Student: Check-in to session
router.post(
  "/check-in",
  authorizeRole("student"),
  attendanceController.checkIn,
);

// Instructor: End session
router.post(
  "/end-session/:id",
  authorizeRole("instructor"),
  attendanceController.endSession,
);

// Instructor & Student: Get active session for class
router.get("/active-session/:classId", attendanceController.getActiveSession);

module.exports = router;
