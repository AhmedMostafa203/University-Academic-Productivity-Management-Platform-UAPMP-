/**
 * Assignment Schema
 * Represents an assignment created by an instructor inside a class
 */

const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    // Assignment title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    // Assignment instructions/description
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    // The class this assignment belongs to
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    // The instructor who created this assignment
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Deadline for submission
    dueDate: {
      type: Date,
      required: true,
    },
    // Maximum grade (e.g., 100)
    maxGrade: {
      type: Number,
      default: 100,
      min: 1,
    },
    // Optional attached file (URL or path)
    attachmentUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Assignment", assignmentSchema);
