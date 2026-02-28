/**
 * Authentication Routes
 * Handles user registration and credential validation
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Universities = require("../constants/universities");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

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

/**
 * Extracts user data from university email address
 * Supports Cairo University email formats (student and staff)
 * Student emails: [7-digits]@std.[subdomain].cu.edu.eg
 * Staff emails: [name]@[subdomain].cu.edu.eg
 * @param {string} email - The university email address
 * @returns {object} - Contains university name, faculty name, role, and studentId (if student)
 * @throws {Error} - If email format is invalid or faculty not recognized
 */
const extractUserDataFromEmail = (email) => {
  const regex = /^([a-zA-Z0-9._%+-]+)@(?:(std)\.)?([^.]+)\.(cu\.edu\.eg)$/i;
  const match = email.match(regex);

  if (!match) {
    throw new Error("Invalid Cairo University email format");
  }

  const emailPrefix = match[1]; // Part before @
  const isStudent = !!match[2]; // Check if 'std' subdomain is present
  const subdomain = match[3].toLowerCase();
  const domain = match[4].toLowerCase();

  const universityData = Universities[domain];

  if (!universityData) {
    throw new Error(`University '${domain}' is not supported yet`);
  }

  const faculty = universityData.subdomains[subdomain];

  if (!faculty) {
    throw new Error(
      `Faculty '${subdomain}' is not recognized at ${universityData.name}`,
    );
  }

  // Extract student ID if user is a student.
  // New format: 9-digit prefix where the actual student ID is 7 digits
  // starting from the 3rd character. Support legacy 7-digit prefixes too.
  let studentId = null;
  if (isStudent) {
    if (/^\d{9}$/.test(emailPrefix)) {
      // take 7 digits starting from the 3rd character (index 2)
      studentId = emailPrefix.substr(2, 7);
    } else if (/^\d{7}$/.test(emailPrefix)) {
      studentId = emailPrefix;
    } else {
      throw new Error(
        "Student email must have a 9-digit prefix (new) or 7-digit prefix (legacy) as student ID",
      );
    }
  }

  return {
    university: universityData.name,
    faculty: faculty,
    role: isStudent ? "student" : "instructor",
    studentId: studentId,
  };
};

/**
 * Configures and returns a Nodemailer transporter
 * Uses environment variables for email configuration
 * @returns {object} - Nodemailer transporter instance
 */
const getEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true", // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends email verification link to user
 * Uses the user id in the link and relies on the user's `createdAt` timestamp
 * @param {string} email - User's email address
 * @param {string} userId - User's database id
 * @param {string} userName - User's full name
 * @returns {Promise} - Email sending result
 */
const sendVerificationEmail = async (email, userId, userName) => {
  const verificationUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/verify-email/${userId}`;
  // Always send email via Nodemailer (ensure SMTP env vars are set)
  const transporter = getEmailTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"UAPMP Support" <noreply@uapmp.edu.eg>',
    to: email,
    subject: "Verify Your Email - UAPMP",
    html: `
      <h2>Welcome to UAPMP, ${userName}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
      </p>
      <p>Or copy this link: <a href="${verificationUrl}">${verificationUrl}</a></p>
      <p><strong>This link will expire in 24 hours.</strong></p>
      <p>If you did not register for UAPMP, please ignore this email.</p>
    `,
  };
  return await transporter.sendMail(mailOptions);
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
    let university = null;
    let college = null;

    // Extract faculty, university, role, and student ID from email
    try {
      const emailData = extractUserDataFromEmail(emailLower);
      role = emailData.role;
      university = emailData.university;
      college = emailData.faculty;
      studentId = emailData.studentId;

      // Add "Dr." prefix to instructor name if not already present
      if (
        role === "instructor" &&
        !displayName.toLowerCase().startsWith("dr.")
      ) {
        displayName = `Dr. ${fullName}`;
      }
    } catch (emailError) {
      // Email validation failed
      return res.status(400).json({
        message: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT",
        details: emailError.message,
      });
    }

    // Hash password with bcrypt salt for secure storage
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user record with unverified status (no token stored)
    // Only include studentId if role is student
    const userPayload = {
      fullName: displayName,
      email: emailLower,
      password: hashedPassword,
      role,
      university,
      college,
      isEmailVerified: false,
    };

    // Only add studentId for students
    if (role === "student" && studentId) {
      userPayload.studentId = studentId;
    }

    const newUser = await User.create(userPayload);

    // Send verification email (link contains user id; verification checks createdAt)
    try {
      await sendVerificationEmail(
        emailLower, // Use the actual user email in production
        newUser._id,
        displayName,
      );
    } catch (emailError) {
      // Log email error but don't fail registration
      console.error(
        "[WARNING] Failed to send verification email:",
        emailError.message,
      );
    }

    // Return response indicating email verification is required
    res.status(201).json({
      message:
        "Account created successfully. Please verify your email to activate your account.",
      code: "REGISTRATION_SUCCESS_VERIFY_EMAIL",
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        studentId: newUser.studentId,
        role: newUser.role,
        university: newUser.university,
        college: newUser.college,
        isEmailVerified: newUser.isEmailVerified,
      },
      details:
        "A verification link has been sent to your email. Please check your inbox (and spam folder).",
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
    });
  }
});

/**
 * POST /verify-email
 * Verifies user's email address using the verification token
 * Allows user to login after successful email verification
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({
        message: "Verification uid is required",
        code: "MISSING_UID",
      });
    }

    // Find user by id
    const user = await User.findById(uid);

    if (!user) {
      return res.status(400).json({
        message: "Invalid verification link or user not found",
        code: "INVALID_UID",
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
        code: "ALREADY_VERIFIED",
      });
    }

    // Ensure the verification link is used within 24 hours of registration
    const createdAt = user.createdAt || user._id.getTimestamp();
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    if (ageMs > maxAgeMs) {
      // Remove the unverified user record to avoid stale accounts
      try {
        await User.deleteOne({ _id: user._id });
      } catch (delError) {
        console.error(
          "[WARNING] Failed to delete expired unverified user:",
          delError.message,
        );
      }

      return res.status(400).json({
        message:
          "Verification link has expired and the unverified account has been removed. Please register again.",
        code: "TOKEN_EXPIRED_ACCOUNT_REMOVED",
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    // Return success response (email verified)
    res.status(200).json({
      message: "Email verified successfully. You can now login.",
      code: "EMAIL_VERIFIED_SUCCESS",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        university: user.university,
        college: user.college,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("[ERROR] Email verification failed:", error.message);

    res.status(500).json({
      message: "An unexpected error occurred during email verification",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * GET /verify-email/:uid
 * Direct verification link - verifies email and redirects to dashboard
 * Used in email verification links for automatic redirect
 */
router.get("/verify-email/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res
        .status(400)
        .send(
          "<html><body><h1>❌ Invalid Verification Link</h1><p>User ID is missing.</p></body></html>",
        );
    }

    // Find user by id
    const user = await User.findById(uid);

    if (!user) {
      return res
        .status(400)
        .send(
          "<html><body><h1>❌ Invalid Verification Link</h1><p>User not found.</p></body></html>",
        );
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      // Already verified - build login redirect
      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET || "dev_jwt_secret",
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
      );
      const userPayload = encodeURIComponent(
        Buffer.from(
          JSON.stringify({
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            university: user.university,
            college: user.college,
            studentId: user.studentId,
          }),
        ).toString("base64"),
      );
      const dashboardUrl =
        user.role === "student"
          ? "http://127.0.0.1:5501/frontend/html/student-profile.html"
          : "http://127.0.0.1:5501/frontend/html/instructor-profile.html";
      return res.redirect(`${dashboardUrl}?token=${token}&user=${userPayload}`);
    }

    // Ensure the verification link is used within 24 hours of registration
    const createdAt = user.createdAt || user._id.getTimestamp();
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

    if (ageMs > maxAgeMs) {
      // Link expired - delete user and show error
      try {
        await User.deleteOne({ _id: user._id });
      } catch (delError) {
        console.error(
          "[WARNING] Failed to delete expired unverified user:",
          delError.message,
        );
      }

      return res
        .status(400)
        .send(
          "<html><body><h1>⏰ Verification Link Expired</h1><p>The verification link has expired. Please register again.</p></body></html>",
        );
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    // After verification generate JWT & redirect with token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "dev_jwt_secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
    const userPayload = encodeURIComponent(
      Buffer.from(
        JSON.stringify({
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          university: user.university,
          college: user.college,
          studentId: user.studentId,
        }),
      ).toString("base64"),
    );
    const dashboardUrl =
      user.role === "student"
        ? "http://127.0.0.1:5501/frontend/html/student-profile.html"
        : "http://127.0.0.1:5501/frontend/html/instructor-profile.html";
    res.redirect(`${dashboardUrl}?token=${token}&user=${userPayload}`);
  } catch (error) {
    console.error("[ERROR] Direct email verification failed:", error.message);

    res
      .status(500)
      .send(
        "<html><body><h1>❌ Verification Failed</h1><p>An error occurred.</p></body></html>",
      );
  }
});

/**
 * POST /login
 * Authenticate existing user and issue JWT
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        code: "MISSING_FIELDS",
      });
    }
    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || "dev_jwt_secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        university: user.university,
        college: user.college,
        studentId: user.studentId,
      },
    });
  } catch (err) {
    console.error("[ERROR] Login failed:", err.message);
    res.status(500).json({
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

/**
 * GET /me
 * Verify JWT token and return authenticated user data
 * Protected endpoint - requires valid JWT token in Authorization header
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.status(200).json({
      message: "User authenticated successfully",
      code: "AUTH_VERIFIED",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        university: user.university,
        college: user.college,
        studentId: user.studentId,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error("[ERROR] Token verification failed:", err.message);
    res.status(401).json({
      message: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
});

module.exports = router;
