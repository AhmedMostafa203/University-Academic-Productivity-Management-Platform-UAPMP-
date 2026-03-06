/**
 * Class Schema
 * Represents a course/class created by an instructor
 * Students join using a unique join code
 */

const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    // Class display name (e.g., "Data Structures - Section 1")
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    // Optional description
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    // The instructor who owns this class
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Unique code students use to join (e.g., "ABC123")
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    // List of enrolled students
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Whether the class is accepting new students
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Class", classSchema);
