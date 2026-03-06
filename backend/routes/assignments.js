/**
 * Assignment Routes
 * Instructors create assignments inside classes
 * Students submit their work
 */

const express = require("express");
const mongoose = require("mongoose");
const Assignment = require("../models/Assignment");
const Submission = require("../models/Submission");
const Class = require("../models/Class");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// ============================================
// ASSIGNMENT ENDPOINTS
// ============================================

/**
 * POST /assignments
 * Instructor creates a new assignment inside a class
 * Body: { classId, title, description, dueDate, maxGrade, attachmentUrl }
 */
router.post(
  "/",
  authenticateToken,
  authorizeRole("instructor"),
  async (req, res) => {
    try {
      const { classId, title, description, dueDate, maxGrade, attachmentUrl } =
        req.body;

      if (!classId || !title || !dueDate) {
        return res.status(400).json({
          message: "classId, title, and dueDate are required",
          code: "MISSING_FIELDS",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({
          message: "Invalid class ID",
          code: "INVALID_ID",
        });
      }

      // Verify instructor owns this class
      const foundClass = await Class.findById(classId);
      if (!foundClass) {
        return res.status(404).json({
          message: "Class not found",
          code: "CLASS_NOT_FOUND",
        });
      }

      if (foundClass.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You can only create assignments in your own classes",
          code: "FORBIDDEN",
        });
      }

      const assignment = await Assignment.create({
        title: title.trim(),
        description: description ? description.trim() : null,
        class: classId,
        instructor: req.user._id,
        dueDate: new Date(dueDate),
        maxGrade: maxGrade || 100,
        attachmentUrl: attachmentUrl || null,
      });

      res.status(201).json({
        message: "Assignment created successfully",
        code: "ASSIGNMENT_CREATED",
        assignment,
      });
    } catch (err) {
      console.error("[ERROR] Create assignment failed:", err.message);
      res.status(500).json({
        message: "Failed to create assignment",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * GET /assignments/class/:classId
 * Get all assignments for a class
 * Accessible by enrolled students and the class instructor
 */
router.get("/class/:classId", authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        message: "Invalid class ID",
        code: "INVALID_ID",
      });
    }

    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({
        message: "Class not found",
        code: "CLASS_NOT_FOUND",
      });
    }

    // Check access
    const isInstructor =
      foundClass.instructor.toString() === req.user._id.toString();
    const isEnrolled = foundClass.students.some(
      (s) => s.toString() === req.user._id.toString(),
    );
    const isAdmin = ["admin", "super_admin"].includes(req.user.role);

    if (!isInstructor && !isEnrolled && !isAdmin) {
      return res.status(403).json({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    const assignments = await Assignment.find({ class: classId })
      .sort({ dueDate: 1 })
      .lean();

    res.status(200).json({
      message: "Assignments fetched successfully",
      code: "ASSIGNMENTS_FETCHED",
      count: assignments.length,
      assignments,
    });
  } catch (err) {
    console.error("[ERROR] Get assignments failed:", err.message);
    res.status(500).json({
      message: "Failed to fetch assignments",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * DELETE /assignments/:id
 * Instructor deletes their assignment
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid assignment ID",
        code: "INVALID_ID",
      });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found",
        code: "ASSIGNMENT_NOT_FOUND",
      });
    }

    const isOwner =
      assignment.instructor.toString() === req.user._id.toString();
    const isAdmin = ["admin", "super_admin"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    await Assignment.findByIdAndDelete(id);
    // Delete all submissions for this assignment
    await Submission.deleteMany({ assignment: id });

    res.status(200).json({
      message: "Assignment deleted successfully",
      code: "ASSIGNMENT_DELETED",
    });
  } catch (err) {
    console.error("[ERROR] Delete assignment failed:", err.message);
    res.status(500).json({
      message: "Failed to delete assignment",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

// ============================================
// SUBMISSION ENDPOINTS
// ============================================

/**
 * POST /assignments/:id/submit
 * Student submits their work for an assignment
 * Body: { fileUrl, note }
 */
router.post(
  "/:id/submit",
  authenticateToken,
  authorizeRole("student"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { fileUrl, note } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid assignment ID",
          code: "INVALID_ID",
        });
      }

      if (!fileUrl) {
        return res.status(400).json({
          message: "File URL is required",
          code: "MISSING_FIELDS",
        });
      }

      const assignment = await Assignment.findById(id);
      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found",
          code: "ASSIGNMENT_NOT_FOUND",
        });
      }

      // Check if student is enrolled in the class
      const foundClass = await Class.findById(assignment.class);
      const isEnrolled = foundClass.students.some(
        (s) => s.toString() === req.user._id.toString(),
      );

      if (!isEnrolled) {
        return res.status(403).json({
          message: "You are not enrolled in this class",
          code: "NOT_ENROLLED",
        });
      }

      // Check if already submitted
      const existingSubmission = await Submission.findOne({
        assignment: id,
        student: req.user._id,
      });

      if (existingSubmission) {
        return res.status(409).json({
          message: "You have already submitted this assignment",
          code: "ALREADY_SUBMITTED",
        });
      }

      // Check if submission is late
      const isLate = new Date() > new Date(assignment.dueDate);

      const submission = await Submission.create({
        assignment: id,
        student: req.user._id,
        fileUrl,
        note: note || null,
        status: isLate ? "late" : "submitted",
      });

      res.status(201).json({
        message: isLate
          ? "Assignment submitted (late)"
          : "Assignment submitted successfully",
        code: "SUBMISSION_CREATED",
        isLate,
        submission,
      });
    } catch (err) {
      console.error("[ERROR] Submit assignment failed:", err.message);
      res.status(500).json({
        message: "Failed to submit assignment",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * GET /assignments/:id/submissions
 * Instructor views all submissions for an assignment
 */
router.get(
  "/:id/submissions",
  authenticateToken,
  authorizeRole("instructor"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid assignment ID",
          code: "INVALID_ID",
        });
      }

      const assignment = await Assignment.findById(id);
      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found",
          code: "ASSIGNMENT_NOT_FOUND",
        });
      }

      // Only the instructor who owns the assignment can see submissions
      if (assignment.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "Access denied",
          code: "FORBIDDEN",
        });
      }

      const submissions = await Submission.find({ assignment: id })
        .populate("student", "fullName email studentId")
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        message: "Submissions fetched successfully",
        code: "SUBMISSIONS_FETCHED",
        count: submissions.length,
        submissions,
      });
    } catch (err) {
      console.error("[ERROR] Get submissions failed:", err.message);
      res.status(500).json({
        message: "Failed to fetch submissions",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * PUT /assignments/:id/submissions/:submissionId/grade
 * Instructor grades a submission
 * Body: { grade, feedback }
 */
router.put(
  "/:id/submissions/:submissionId/grade",
  authenticateToken,
  authorizeRole("instructor"),
  async (req, res) => {
    try {
      const { id, submissionId } = req.params;
      const { grade, feedback } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(submissionId)
      ) {
        return res.status(400).json({
          message: "Invalid ID",
          code: "INVALID_ID",
        });
      }

      if (grade === undefined || grade === null) {
        return res.status(400).json({
          message: "Grade is required",
          code: "MISSING_FIELDS",
        });
      }

      const assignment = await Assignment.findById(id);
      if (!assignment) {
        return res.status(404).json({
          message: "Assignment not found",
          code: "ASSIGNMENT_NOT_FOUND",
        });
      }

      if (assignment.instructor.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "Access denied",
          code: "FORBIDDEN",
        });
      }

      if (grade < 0 || grade > assignment.maxGrade) {
        return res.status(400).json({
          message: `Grade must be between 0 and ${assignment.maxGrade}`,
          code: "INVALID_GRADE",
        });
      }

      const submission = await Submission.findByIdAndUpdate(
        submissionId,
        { grade, feedback: feedback || null, status: "graded" },
        { new: true },
      ).populate("student", "fullName email studentId");

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
          code: "SUBMISSION_NOT_FOUND",
        });
      }

      res.status(200).json({
        message: "Submission graded successfully",
        code: "SUBMISSION_GRADED",
        submission,
      });
    } catch (err) {
      console.error("[ERROR] Grade submission failed:", err.message);
      res.status(500).json({
        message: "Failed to grade submission",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

module.exports = router;
