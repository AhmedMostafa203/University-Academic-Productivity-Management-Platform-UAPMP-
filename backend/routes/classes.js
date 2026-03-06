/**
 * Class Routes
 * Instructors create classes, students join using a code
 */

const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Class = require("../models/Class");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// ============================================
// HELPER
// ============================================

/**
 * Generates a random 6-character uppercase join code
 * @returns {string}
 */
const generateJoinCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "A3F9C2"
};

// ============================================
// CLASS ENDPOINTS
// ============================================

/**
 * POST /classes
 * Instructor creates a new class
 * Body: { name, description }
 */
router.post(
  "/",
  authenticateToken,
  authorizeRole("instructor"),
  async (req, res) => {
    try {
      const { name, description } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          message: "Class name is required",
          code: "MISSING_FIELDS",
        });
      }

      // Generate a unique join code
      let joinCode;
      let isUnique = false;
      while (!isUnique) {
        joinCode = generateJoinCode();
        const existing = await Class.findOne({ joinCode });
        if (!existing) isUnique = true;
      }

      const newClass = await Class.create({
        name: name.trim(),
        description: description ? description.trim() : null,
        instructor: req.user._id,
        joinCode,
      });

      res.status(201).json({
        message: "Class created successfully",
        code: "CLASS_CREATED",
        class: newClass,
      });
    } catch (err) {
      console.error("[ERROR] Create class failed:", err.message);
      res.status(500).json({
        message: "Failed to create class",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * POST /classes/join
 * Student joins a class using a join code
 * Body: { joinCode }
 */
router.post(
  "/join",
  authenticateToken,
  authorizeRole("student"),
  async (req, res) => {
    try {
      const { joinCode } = req.body;

      if (!joinCode) {
        return res.status(400).json({
          message: "Join code is required",
          code: "MISSING_FIELDS",
        });
      }

      const foundClass = await Class.findOne({
        joinCode: joinCode.toUpperCase(),
      });

      if (!foundClass) {
        return res.status(404).json({
          message: "Invalid join code",
          code: "CLASS_NOT_FOUND",
        });
      }

      if (!foundClass.isActive) {
        return res.status(403).json({
          message: "This class is no longer accepting students",
          code: "CLASS_INACTIVE",
        });
      }

      // Check if student already enrolled
      const alreadyEnrolled = foundClass.students.some(
        (s) => s.toString() === req.user._id.toString(),
      );

      if (alreadyEnrolled) {
        return res.status(409).json({
          message: "You are already enrolled in this class",
          code: "ALREADY_ENROLLED",
        });
      }

      foundClass.students.push(req.user._id);
      await foundClass.save();

      res.status(200).json({
        message: "Joined class successfully",
        code: "CLASS_JOINED",
        class: {
          id: foundClass._id,
          name: foundClass.name,
          description: foundClass.description,
          joinCode: foundClass.joinCode,
        },
      });
    } catch (err) {
      console.error("[ERROR] Join class failed:", err.message);
      res.status(500).json({
        message: "Failed to join class",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * GET /classes/my
 * Get all classes for the current user
 * Students see classes they enrolled in
 * Instructors see classes they created
 */
router.get("/my", authenticateToken, async (req, res) => {
  try {
    let classes;

    if (req.user.role === "student") {
      classes = await Class.find({ students: req.user._id })
        .populate("instructor", "fullName email")
        .select("-students")
        .sort({ createdAt: -1 })
        .lean();
    } else if (req.user.role === "instructor") {
      classes = await Class.find({ instructor: req.user._id })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      // Admin sees all classes
      classes = await Class.find({})
        .populate("instructor", "fullName email")
        .sort({ createdAt: -1 })
        .lean();
    }

    res.status(200).json({
      message: "Classes fetched successfully",
      code: "CLASSES_FETCHED",
      count: classes.length,
      classes,
    });
  } catch (err) {
    console.error("[ERROR] Get classes failed:", err.message);
    res.status(500).json({
      message: "Failed to fetch classes",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * GET /classes/:id
 * Get a single class by ID with its students
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid class ID",
        code: "INVALID_ID",
      });
    }

    const foundClass = await Class.findById(id)
      .populate("instructor", "fullName email")
      .populate("students", "fullName email studentId");

    if (!foundClass) {
      return res.status(404).json({
        message: "Class not found",
        code: "CLASS_NOT_FOUND",
      });
    }

    // Only instructor of this class or admin can see full details
    const isInstructor =
      foundClass.instructor._id.toString() === req.user._id.toString();
    const isAdmin = ["admin", "super_admin"].includes(req.user.role);
    const isEnrolled = foundClass.students.some(
      (s) => s._id.toString() === req.user._id.toString(),
    );

    if (!isInstructor && !isAdmin && !isEnrolled) {
      return res.status(403).json({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    res.status(200).json({
      message: "Class fetched successfully",
      code: "CLASS_FETCHED",
      class: foundClass,
    });
  } catch (err) {
    console.error("[ERROR] Get class failed:", err.message);
    res.status(500).json({
      message: "Failed to fetch class",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * DELETE /classes/:id
 * Instructor deletes their own class
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid class ID",
        code: "INVALID_ID",
      });
    }

    const foundClass = await Class.findById(id);

    if (!foundClass) {
      return res.status(404).json({
        message: "Class not found",
        code: "CLASS_NOT_FOUND",
      });
    }

    const isOwner =
      foundClass.instructor.toString() === req.user._id.toString();
    const isAdmin = ["admin", "super_admin"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    await Class.findByIdAndDelete(id);

    res.status(200).json({
      message: "Class deleted successfully",
      code: "CLASS_DELETED",
    });
  } catch (err) {
    console.error("[ERROR] Delete class failed:", err.message);
    res.status(500).json({
      message: "Failed to delete class",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

module.exports = router;
