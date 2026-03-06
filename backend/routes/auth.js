/**
 * Authentication Routes
 * Handles user registration and credential validation
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Universities = require("../constants/universities");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// ============================================
// HELPER FUNCTIONS
// ============================================

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

const extractUserDataFromEmail = (email) => {
  const regex = /^([a-zA-Z0-9._%+-]+)@(?:(std)\.)?([^.]+)\.(cu\.edu\.eg)$/i;
  const match = email.match(regex);

  if (!match) {
    throw new Error("Invalid Cairo University email format");
  }

  const emailPrefix = match[1];
  const isStudent = !!match[2];
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

  let studentId = null;
  if (isStudent) {
    if (/^\d{9}$/.test(emailPrefix)) {
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

const getEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendVerificationEmail = async (email, userId, userName) => {
  const verificationUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/verify-email/${userId}`;

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
  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    throw error;
  }
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Invalid request: all fields are required",
        code: "MISSING_FIELDS",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Password confirmation does not match",
        code: "PASSWORD_MISMATCH",
      });
    }

    const { isStrong, requirements } = validatePasswordStrength(password);
    if (!isStrong) {
      return res.status(400).json({
        message: "Password does not meet security requirements",
        code: "WEAK_PASSWORD",
        requirements: {
          minLength: { status: requirements.length, message: "Minimum 6 characters" },
          hasLetters: { status: requirements.hasLetter, message: "Must contain letters (a-z, A-Z)" },
          hasNumbers: { status: requirements.hasDigit, message: "Must contain numbers (0-9)" },
          hasSpecialChar: { status: requirements.hasSpecial, message: "Must contain special character (!@#$%^&*)" },
        },
      });
    }

    const emailLower = email.toLowerCase();

    let studentId = null;
    let role = null;
    let displayName = fullName;
    let university = null;
    let college = null;

    try {
      const emailData = extractUserDataFromEmail(emailLower);
      role = emailData.role;
      university = emailData.university;
      college = emailData.faculty;
      studentId = emailData.studentId;

      if (role === "admin" || role === "super_admin") {
        return res.status(403).json({
          message: "Registration for admin and super_admin is not allowed.",
          code: "FORBIDDEN_ROLE_REGISTRATION",
        });
      }

      if (role === "instructor" && !displayName.toLowerCase().startsWith("dr.")) {
        displayName = `Dr. ${fullName}`;
      }
    } catch (emailError) {
      return res.status(400).json({
        message: "Invalid email format",
        code: "INVALID_EMAIL_FORMAT",
        details: emailError.message,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userPayload = {
      fullName: displayName,
      email: emailLower,
      password: hashedPassword,
      role,
      university,
      college,
      isEmailVerified: false,
    };

    if (role === "student" && studentId) {
      userPayload.studentId = studentId;
    }

    const newUser = await User.create(userPayload);

    try {
      await sendVerificationEmail(emailLower, newUser._id, displayName);
    } catch (emailError) {
      console.error("[WARNING] Failed to send verification email:", emailError.message);
    }

    res.status(201).json({
      message: "Account created successfully. Please verify your email to activate your account.",
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
      details: "A verification link has been sent to your email. Please check your inbox (and spam folder).",
    });
  } catch (error) {
    console.error("[ERROR] Registration process failed:", error.message);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `Account with this ${field} already exists`,
        code: "DUPLICATE_ENTRY",
        field: field,
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: messages,
      });
    }

    res.status(500).json({
      message: "An unexpected error occurred during registration",
      code: "INTERNAL_SERVER_ERROR",
    });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "Verification uid is required", code: "MISSING_UID" });
    }

    const user = await User.findById(uid);

    if (!user) {
      return res.status(400).json({ message: "Invalid verification link or user not found", code: "INVALID_UID" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified", code: "ALREADY_VERIFIED" });
    }

    const createdAt = user.createdAt || user._id.getTimestamp();
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000;

    if (ageMs > maxAgeMs) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (delError) {
        console.error("[WARNING] Failed to delete expired unverified user:", delError.message);
      }

      return res.status(400).json({
        message: "Verification link has expired and the unverified account has been removed. Please register again.",
        code: "TOKEN_EXPIRED_ACCOUNT_REMOVED",
      });
    }

    user.isEmailVerified = true;
    await user.save();

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

router.get("/verify-email/:uid", async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).send("<html><body><h1>❌ Invalid Verification Link</h1><p>User ID is missing.</p></body></html>");
    }

    const user = await User.findById(uid);

    if (!user) {
      return res.status(400).send("<html><body><h1>❌ Invalid Verification Link</h1><p>User not found.</p></body></html>");
    }

    const buildRedirect = (user) => {
      const token = jwt.sign(
        { id: user._id, role: user.role, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
      );
      const userPayload = encodeURIComponent(
        Buffer.from(JSON.stringify({
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          university: user.university,
          college: user.college,
          studentId: user.studentId,
        })).toString("base64"),
      );
      const dashboardUrl = user.role === "student"
        ? process.env.STUDENT_DASHBOARD_URL || "http://127.0.0.1:5501/frontend/html/student-profile.html"
        : process.env.INSTRUCTOR_DASHBOARD_URL || "http://127.0.0.1:5501/frontend/html/instructor-profile.html";
      return `${dashboardUrl}?token=${token}&user=${userPayload}`;
    };

    if (user.isEmailVerified) {
      return res.redirect(buildRedirect(user));
    }

    const createdAt = user.createdAt || user._id.getTimestamp();
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000;

    if (ageMs > maxAgeMs) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (delError) {
        console.error("[WARNING] Failed to delete expired unverified user:", delError.message);
      }
      return res.status(400).send("<html><body><h1>⏰ Verification Link Expired</h1><p>The verification link has expired. Please register again.</p></body></html>");
    }

    user.isEmailVerified = true;
    await user.save();

    res.redirect(buildRedirect(user));
  } catch (error) {
    console.error("[ERROR] Direct email verification failed:", error.message);
    res.status(500).send("<html><body><h1>❌ Verification Failed</h1><p>An error occurred.</p></body></html>");
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required", code: "MISSING_FIELDS" });
    }
    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Please verify your email first", code: "EMAIL_NOT_VERIFIED" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password", code: "INVALID_CREDENTIALS" });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
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
    res.status(500).json({ message: "Internal server error", code: "INTERNAL_SERVER_ERROR" });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found", code: "USER_NOT_FOUND" });
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
    res.status(401).json({ message: "Invalid or expired token", code: "INVALID_TOKEN" });
  }
});

router.post("/google-login", async (req, res) => {
  try {
    const { token: idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "Google ID token is required", code: "MISSING_TOKEN" });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.error("[ERROR] Google token verification failed:", err.message);
      return res.status(401).json({ message: "Invalid Google token", code: "INVALID_GOOGLE_TOKEN" });
    }

    const email = payload.email ? payload.email.toLowerCase() : null;
    const googleId = payload.sub;
    const googleName = payload.name || "User";

    if (!email) {
      return res.status(400).json({ message: "Email not found in Google account", code: "NO_EMAIL_IN_GOOGLE" });
    }

    let emailData;
    let existingUser = await User.findOne({ email });

    if (existingUser && (existingUser.role === "admin" || existingUser.role === "super_admin")) {
      emailData = {
        role: existingUser.role,
        university: existingUser.university || "N/A",
        faculty: existingUser.college || "N/A",
        studentId: existingUser.studentId || null,
      };
    } else {
      try {
        emailData = extractUserDataFromEmail(email);
      } catch (emailError) {
        return res.status(403).json({
          message: "Google account email must be from a supported university",
          code: "UNSUPPORTED_UNIVERSITY_EMAIL",
          details: emailError.message,
        });
      }
    }

    let user = await User.findOne({ email });

    if (user) {
      if (user.authProvider === "local") {
        user.googleId = googleId;
        await user.save();
      } else if (user.authProvider === "google" && user.googleId !== googleId) {
        user.googleId = googleId;
        await user.save();
      }

      if (user.isProfileComplete) {
        const jwtToken = jwt.sign(
          { id: user._id, role: user.role, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
        );
        return res.status(200).json({
          message: "Google login successful",
          code: "GOOGLE_LOGIN_SUCCESS",
          needsProfileCompletion: false,
          token: jwtToken,
          user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, university: user.university, college: user.college, studentId: user.studentId },
        });
      } else {
        const tempToken = jwt.sign(
          { id: user._id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "1h" },
        );
        return res.status(202).json({
          message: "Please complete your profile",
          code: "PROFILE_INCOMPLETE",
          needsProfileCompletion: true,
          token: tempToken,
          user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, university: user.university, college: user.college, studentId: user.studentId },
        });
      }
    } else {
      user = await User.create({
        fullName: googleName,
        email: email,
        password: null,
        googleId: googleId,
        authProvider: "google",
        role: emailData.role,
        university: emailData.university,
        college: emailData.faculty,
        studentId: emailData.studentId,
        isEmailVerified: true,
        isProfileComplete: false,
      });

      console.log(`[INFO] New Google user created: ${email}`);

      const tempToken = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      return res.status(201).json({
        message: "Please complete your profile to finish signup",
        code: "PROFILE_INCOMPLETE",
        needsProfileCompletion: true,
        token: tempToken,
        user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, university: user.university, college: user.college, studentId: user.studentId },
      });
    }
  } catch (error) {
    console.error("[ERROR] Google login failed:", error.message);
    res.status(500).json({ message: "An error occurred during Google login", code: "GOOGLE_LOGIN_ERROR" });
  }
});

router.post("/complete-profile", authenticateToken, async (req, res) => {
  try {
    const { fullName, password, confirmPassword } = req.body;
    const userId = req.user.id;

    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ message: "Full name is required and must be at least 2 characters", code: "INVALID_NAME" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required", code: "PASSWORD_REQUIRED" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password confirmation does not match", code: "PASSWORD_MISMATCH" });
    }

    const { isStrong, requirements } = validatePasswordStrength(password);
    if (!isStrong) {
      return res.status(400).json({ message: "Password does not meet security requirements", code: "WEAK_PASSWORD", requirements });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found", code: "USER_NOT_FOUND" });
    }
    if (user.isProfileComplete) {
      return res.status(400).json({ message: "Profile is already complete", code: "PROFILE_ALREADY_COMPLETE" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let displayName = fullName.trim();
    if (user.role === "instructor" && !displayName.startsWith("Dr.")) {
      displayName = "Dr. " + displayName;
    }

    user.fullName = displayName;
    user.password = hashedPassword;
    user.isProfileComplete = true;
    await user.save();

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    res.status(200).json({
      message: "Profile completed successfully",
      code: "PROFILE_COMPLETED",
      token: jwtToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        university: user.university,
        college: user.college,
        studentId: user.studentId,
        authProvider: user.authProvider,
        isProfileComplete: true,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "An error occurred during profile completion", code: "PROFILE_COMPLETION_ERROR", details: error.message });
  }
});

module.exports = router;
