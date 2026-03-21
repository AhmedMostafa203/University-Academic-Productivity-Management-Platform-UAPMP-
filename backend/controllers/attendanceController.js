// controllers/attendanceController.js
// Attendance System controller logic

const AttendanceSession = require("../models/AttendanceSession");
const Attendance = require("../models/Attendance");

const { generateAttendanceExcel } = require("../utils/excelExport");
const fs = require("fs");
const path = require("path");

/**
 * Create a new attendance session (Instructor only)
 * POST /api/attendance/session
 */
exports.createSession = async (req, res) => {
  try {
    const { classId, duration, location } = req.body;
    // 1. Check for existing active session for this class
    const now = new Date();
    const activeSession = await AttendanceSession.findOne({
      classId,
      isActive: true,
      expiresAt: { $gt: now },
    });
    if (activeSession) {
      return res
        .status(400)
        .json({ message: "An active session already exists for this class." });
    }
    // 2. Create new session
    const expiresAt = new Date(now.getTime() + (duration || 15) * 60000); // default 15 min
    console.log("[createSession] Requested radius:", location.radius);
    const session = new AttendanceSession({
      classId,
      instructorId: req.user._id,
      startedAt: now,
      expiresAt,
      location: {
        lat: location.lat,
        lng: location.lng,
        radius: location.radius || 50, // meters, default to 50 if not provided
      },
      totalStudents: 0,
      isActive: true,
      exported: false,
    });
    await session.save();
    // Schedule auto end of session
    const msUntilExpire = expiresAt.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        const freshSession = await AttendanceSession.findById(session._id);
        if (!freshSession) {
          console.log(`[autoEndSession] Session ${session._id} not found.`);
          return;
        }
        if (!freshSession.isActive) {
          console.log(`[autoEndSession] Session ${session._id} already ended.`);
          return;
        }
        if (freshSession.expiresAt <= new Date()) {
          freshSession.isActive = false;
          await freshSession.save();
          await handleSessionEnd(freshSession._id, freshSession.instructorId);
          console.log(
            `[autoEndSession] Session ${freshSession._id} auto-ended and exported. isActive: ${freshSession.isActive}`,
          );
        } else {
          console.log(
            `[autoEndSession] Session ${freshSession._id} not expired yet. Skipping auto-end.`,
          );
        }
      } catch (err) {
        console.error(
          "[autoEndSession] Failed to auto-end session:",
          err.message,
        );
      }
    }, msUntilExpire);
    return res
      .status(201)
      .json({ message: "Attendance session started.", session });
  } catch (err) {
    console.error("[createSession]", err);
    res.status(500).json({ message: "Failed to create session." });
  }
};

/**
 * Student check-in to session (Student only)
 * POST /api/attendance/check-in
 */
const { getDistanceMeters } = require("../utils/gps");

exports.checkIn = async (req, res) => {
  try {
    const { sessionId, lat, lng, radius } = req.body;
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    const now = new Date();
    if (!session.isActive || session.expiresAt < now) {
      return res
        .status(400)
        .json({ message: "Session is not active or has expired." });
    }
    // GPS radius check
    const distance = getDistanceMeters(
      session.location.lat,
      session.location.lng,
      lat,
      lng,
    );
    // Use radius from request if provided, else from session, else default 50
    const allowedRadius =
      typeof radius === "number" ? radius : session.location.radius || 50;
    console.log("[checkIn] Allowed radius:", allowedRadius);
    if (distance > allowedRadius) {
      return res.status(400).json({
        message: `You are outside the allowed check-in radius (${allowedRadius}m).`,
      });
    }
    // Prevent duplicate check-in
    const existing = await Attendance.findOne({
      sessionId,
      studentId: req.user._id,
    });
    if (existing) {
      return res.status(400).json({ message: "You have already checked in." });
    }
    // Save attendance
    const attendance = new Attendance({
      sessionId,
      studentId: req.user._id,
      studentName: req.user.fullName, // Use fullName from User schema
      timestamp: now,
    });
    await attendance.save();
    // Increment totalStudents
    session.totalStudents += 1;
    await session.save();
    return res
      .status(201)
      .json({ message: "Check-in successful.", attendance });
  } catch (err) {
    console.error("[checkIn]", err);
    res.status(500).json({ message: "Failed to check in." });
  }
};

/**
 * End attendance session (Instructor only)
 * POST /api/attendance/end-session/:id
 */

exports.endSession = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    if (!session.isActive) {
      return res.status(400).json({ message: "Session is already ended." });
    }
    session.isActive = false;
    await session.save();
    // Generate Excel and mark as exported
    await handleSessionEnd(sessionId, session.instructorId);
    return res
      .status(200)
      .json({ message: "Session ended and attendance exported." });
  } catch (err) {
    console.error("[endSession]", err);
    res.status(500).json({ message: "Failed to end session." });
  }
};

/**
 * Handle session end: generate Excel and (placeholder) send to instructor
 * @param {string} sessionId
 * @param {string} instructorId
 */
const nodemailer = require("nodemailer");
const User = require("../models/User");
const Class = require("../models/Class");

async function handleSessionEnd(sessionId, instructorId) {
  // Get all attendance records for the session
  const attendanceList = await Attendance.find({ sessionId });
  // Get class name for file naming
  const session = await AttendanceSession.findById(sessionId);
  console.log("[handleSessionEnd] session.classId:", session?.classId); // is it populated?
  let className = "Class";
  if (session && session.classId) {
    // Force classId to string to avoid ObjectId type mismatch
    const classIdStr = session.classId.toString();
    const classObj = await Class.findById(classIdStr);
    if (classObj && classObj.name)
      className = classObj.name.trim().replace(/[^a-zA-Z0-9-_ ]/g, "");
  }
  let fileBaseName = "Class Attendance";
  // Prepare data: only Name, Student ID (real), Timestamp
  const exportData = [];
  for (const a of attendanceList) {
    let realStudentId = "";
    const user = await User.findById(a.studentId);
    if (user && user.studentId) realStudentId = user.studentId; // Get real student ID from User schema
    exportData.push({
      studentName: a.studentName,
      studentId: realStudentId,
      timestamp: a.timestamp,
    });
  }
  // Generate Excel file buffer
  const buffer = await generateAttendanceExcel(exportData);
  // Save file to disk (for demo/testing)
  const exportDir = path.join(__dirname, "../exports");
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir);
  const filePath = path.join(exportDir, `${fileBaseName}.xlsx`);
  fs.writeFileSync(filePath, buffer);
  // Mark session as exported
  await AttendanceSession.findByIdAndUpdate(sessionId, { exported: true });

  // Send Excel file to instructor via email (dev/test only)
  try {
    const instructor = await User.findById(instructorId);
    if (!instructor || !instructor.email) {
      console.warn("[handleSessionEnd] Instructor email not found.");
      return;
    }
    // Configure nodemailer for Gmail
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    let info = await transporter.sendMail({
      from: "attendance@uapmp.dev",
      to: "ahmedloby8@gmail.com", // Always send to this email for dev
      subject: "Attendance Excel Export",
      text: "Attached is the attendance Excel sheet for your session.",
      attachments: [
        {
          filename: `${fileBaseName}.xlsx`,
          content: buffer,
        },
      ],
    });
    console.log("[handleSessionEnd] Excel sent to instructor:", info.messageId);
    // Log Ethereal preview URL for dev
    if (nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log("[handleSessionEnd] Preview URL:", previewUrl);
      }
    }
  } catch (err) {
    console.error("[handleSessionEnd] Failed to send email:", err.message);
  }
}

/**
 * Get active session for a class (Instructor & Student)
 * GET /api/attendance/active-session/:classId
 */
exports.getActiveSession = async (req, res) => {
  try {
    const { classId } = req.params;
    const now = new Date();
    const session = await AttendanceSession.findOne({
      classId,
      isActive: true,
      expiresAt: { $gt: now },
    });
    if (!session) {
      return res.status(404).json({ message: "No active session." });
    }
    return res.status(200).json({ session });
  } catch (err) {
    console.error("[getActiveSession]", err);
    res.status(500).json({ message: "Failed to get active session." });
  }
};
