/**
 * Authentication Routes
 * Handles user registration and credential validation
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validates password against security requirements
 * Requirements: minimum 6 characters, contains letter, digit, and special character
 * @param {string} password - The password to validate
 * @returns {object} - Contains isStrong flag and individual requirement statuses
 */
const validatePasswordStrength = (password) => {
  const requirements = {
    length: password.length >= 6,
    hasLetter: /[a-zA-Z]/.test(password),
    hasDigit: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isStrong = Object.values(requirements).every((req) => req === true);

  return { isStrong, requirements };
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * POST /register
 * Creates a new user account with automatic role detection from email format
 * Student emails: [7-digits]@std.sci.cu.edu.eg
 * Instructor emails: [name]@sci.cu.edu.eg
 */
router.post("/register", async (req, res) => {
  try {
    // Extract credentials from request body
    const { fullName, email, password, confirmPassword } = req.body;

    // Validate all required fields are provided
    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Invalid request: all fields are required",
        code: "MISSING_FIELDS",
      });
    }

    // Verify password confirmation matches original password
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Password confirmation does not match",
        code: "PASSWORD_MISMATCH",
      });
    }

    // Check password meets security requirements
    const { isStrong, requirements } = validatePasswordStrength(password);
    if (!isStrong) {
      return res.status(400).json({
        message: "Password does not meet security requirements",
        code: "WEAK_PASSWORD",
        requirements: {
          minLength: {
            status: requirements.length,
            message: "Minimum 6 characters",
          },
          hasLetters: {
            status: requirements.hasLetter,
            message: "Must contain letters (a-z, A-Z)",
          },
          hasNumbers: {
            status: requirements.hasDigit,
            message: "Must contain numbers (0-9)",
          },
          hasSpecialChar: {
            status: requirements.hasSpecial,
            message: "Must contain special character (!@#$%^&*)",
          },
        },
      });
    }

    // Normalize email to lowercase for consistency
    const emailLower = email.toLowerCase();

    // Initialize user properties
    let studentId = null;
    let role = null;
    let displayName = fullName;

    // Auto-detect user role and validate email format
    const studentEmailRegex = /^(\d{7})@std\.sci\.cu\.edu\.eg$/i;
    const instructorEmailRegex = /^[a-zA-Z0-9._-]+@sci\.cu\.edu\.eg$/i;

    const studentMatch = emailLower.match(studentEmailRegex);

    if (studentMatch) {
      // Student email format matched: extract 7-digit student ID and set role
      role = "student";
      studentId = studentMatch[1];
    } else if (instructorEmailRegex.test(emailLower)) {
      // Instructor email format matched: set role and add "Dr." prefix to name
      role = "instructor";
      if (!displayName.toLowerCase().startsWith("dr.")) {
        displayName = `Dr. ${fullName}`;
      }
    } else {
      // Email format does not match any valid university email pattern
      return res.status(400).json({
        message: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT",
        details:
          "Email must be either: [7-digits]@std.sci.cu.edu.eg (student) or [name]@sci.cu.edu.eg (instructor)",
      });
    }

    // Hash password with bcrypt salt for secure storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user record in database
    const newUser = await User.create({
      fullName: displayName,
      email: emailLower,
      studentId,
      password: hashedPassword,
      role,
    });

    // Generate JWT token valid for 7 days
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Return success response with user data and authentication token
    res.status(201).json({
      message: "User account created successfully",
      code: "REGISTRATION_SUCCESS",
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        studentId: newUser.studentId,
        role: newUser.role,
      },
    });
  } catch (error) {
    // ============================================
    // ERROR HANDLING
    // ============================================
    console.error("[ERROR] Registration process failed:", error.message);

    // Handle MongoDB duplicate key constraint violation
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `Account with this ${field} already exists`,
        code: "DUPLICATE_ENTRY",
        field: field,
      });
    }

    // Handle schema validation errors from database
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: messages,
      });
    }

    // Handle all other unexpected errors
    res.status(500).json({
      message: "An unexpected error occurred during registration",
      code: "INTERNAL_SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
