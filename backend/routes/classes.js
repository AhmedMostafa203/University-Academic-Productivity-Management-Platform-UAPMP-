/**
 * Class Routes
 * Instructors create classes, students join using a code
 */

const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Class = require("../models/Class");
const COURSE_CODES = require("../constants/courseCodes");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// ============================================
// HELPER
// ============================================

const generateJoinCode = () => {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
};

// ============================================
// CREATE CLASS
// ============================================

router.post(
  "/",
  authenticateToken,
  authorizeRole("instructor"),
  async (req, res) => {
    try {
      const { name, description, courseCode, semester, year, section } =
        req.body;
      console.log("[CREATE CLASS DEBUG] req.body:", req.body);

      if (!Object.keys(COURSE_CODES).includes(courseCode)) {
        return res.status(400).json({
          message:
            "Invalid course code. Allowed codes: " +
            Object.keys(COURSE_CODES).join(", "),
          code: "INVALID_COURSE_CODE",
        });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          message: "Class name is required",
          code: "MISSING_FIELDS",
        });
      }

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
        courseCode,
        semester,
        year,
        section,
      });

      res.status(201).json({
        message: "Class created successfully",
        code: "CLASS_CREATED",
        class: newClass,
      });
    } catch (err) {
      console.error("[ERROR] Create class failed:", err.message, err.stack);
      res.status(500).json({
        message: "Failed to create class",
        code: "INTERNAL_SERVER_ERROR",
        error: err.message,
        stack: err.stack,
      });
    }
  },
);

// ============================================
// JOIN CLASS
// ============================================

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
          message: "This class is not accepting students",
          code: "CLASS_INACTIVE",
        });
      }

      // Prevent instructor joining their own class
      if (foundClass.instructor.toString() === req.user._id.toString()) {
        return res.status(400).json({
          message: "Instructor cannot join their own class",
          code: "INVALID_ACTION",
        });
      }

      const alreadyEnrolled = foundClass.students.some(
        (s) => s.toString() === req.user._id.toString(),
      );

      if (alreadyEnrolled) {
        return res.status(409).json({
          message: "Already enrolled in this class",
          code: "ALREADY_ENROLLED",
        });
      }

      await Class.findByIdAndUpdate(foundClass._id, {
        $addToSet: { students: req.user._id },
      });

      res.status(200).json({
        message: "Joined class successfully",
        code: "CLASS_JOINED",
        class: {
          id: foundClass._id,
          name: foundClass.name,
          description: foundClass.description,
          courseCode: foundClass.courseCode,
          semester: foundClass.semester,
          year: foundClass.year,
          section: foundClass.section,
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

// ============================================
// LEAVE CLASS (NEW FEATURE)
// ============================================

router.delete(
  "/leave/:id",
  authenticateToken,
  authorizeRole("student"),
  async (req, res) => {
    try {
      const { id } = req.params;

      await Class.findByIdAndUpdate(id, {
        $pull: { students: req.user._id },
      });

      res.json({
        message: "You left the class successfully",
        code: "CLASS_LEFT",
      });
    } catch (err) {
      res.status(500).json({
        message: "Failed to leave class",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// ============================================
// GET USER CLASSES
// ============================================

router.get("/my", authenticateToken, async (req, res) => {
  try {
    let classes;

    if (req.user.role === "student") {
      classes = await Class.find({ students: req.user._id })
        .populate("instructor", "fullName email")
        .sort({ createdAt: -1 })
        .lean();
    } else if (req.user.role === "instructor") {
      classes = await Class.find({ instructor: req.user._id })
        .populate("instructor", "fullName email")
        .sort({ createdAt: -1 })
        .lean();
    } else {
      classes = await Class.find({})
        .populate("instructor", "fullName email")
        .sort({ createdAt: -1 })
        .lean();
    }

    res.json({
      message: "Classes fetched successfully",
      code: "CLASSES_FETCHED",
      count: classes.length,
      classes,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch classes",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// ============================================
// GET CLASS DETAILS
// ============================================

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

    res.json({
      message: "Class fetched successfully",
      code: "CLASS_FETCHED",
      class: foundClass,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch class",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// ============================================
// REGENERATE JOIN CODE (NEW FEATURE)
// ============================================

router.patch("/:id/regenerate-code", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const foundClass = await Class.findById(id);

    if (!foundClass) {
      return res.status(404).json({
        message: "Class not found",
      });
    }

    if (foundClass.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only instructor can regenerate join code",
      });
    }

    let newCode;
    let unique = false;

    while (!unique) {
      newCode = generateJoinCode();
      const exists = await Class.findOne({ joinCode: newCode });
      if (!exists) unique = true;
    }

    foundClass.joinCode = newCode;
    await foundClass.save();

    res.json({
      message: "Join code regenerated",
      joinCode: newCode,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

// ============================================
// DELETE CLASS
// ============================================

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

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

    res.json({
      message: "Class deleted successfully",
      code: "CLASS_DELETED",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete class",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

module.exports = router;
