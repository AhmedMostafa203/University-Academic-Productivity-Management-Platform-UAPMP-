/**
 * Submission Schema
 * Represents a student's submission for a specific assignment
 */

const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    // The assignment being submitted
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    // The student who submitted
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Submitted file URL or path
    fileUrl: {
      type: String,
      required: true,
    },
    // Optional text note from student
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    // Grade given by instructor (null until graded)
    grade: {
      type: Number,
      default: null,
      min: 0,
    },
    // Feedback from instructor
    feedback: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },
    // Submission status
    status: {
      type: String,
      enum: ["submitted", "graded", "late"],
      default: "submitted",
    },
  },
  { timestamps: true },
);

// One submission per student per assignment
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
