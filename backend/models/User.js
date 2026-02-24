/**
 * User Schema
 * Defines the database structure for user accounts
 * Supports both student and instructor roles
 */

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // User's full name (trimmed to remove whitespace)
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    // University email address (unique, case-insensitive)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    // Student ID - extracted from 7-digit student email (unique, optional)
    studentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Hashed password (bcrypt with salt 10)
    password: {
      type: String,
      required: true,
    },
    // User role: either 'student' or 'instructor'
    role: {
      type: String,
      enum: ["student", "instructor"],
      required: true,
    },
  },
  // Enable automatic createdAt and updatedAt timestamps
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
