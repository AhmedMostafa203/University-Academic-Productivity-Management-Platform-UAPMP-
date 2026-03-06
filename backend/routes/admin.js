/**
 * Admin Routes
 * Handles user management and site settings
 * All routes require admin or super_admin role
 */

const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const SiteSettings = require("../models/SiteSettings");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /admin/users
 * Get all users (optionally filter by role)
 * Query: ?role=student|instructor|admin
 */
router.get(
  "/users",
  authenticateToken,
  authorizeRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const filter = {};
      if (req.query.role) {
        filter.role = req.query.role;
      }

      const users = await User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        message: "Users fetched successfully",
        code: "USERS_FETCHED",
        count: users.length,
        users,
      });
    } catch (err) {
      console.error("[ERROR] Get users failed:", err.message);
      res.status(500).json({
        message: "Failed to fetch users",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * POST /admin/users
 * Create a new student or instructor manually
 * Body: { fullName, email, password, role, university, college }
 */
router.post(
  "/users",
  authenticateToken,
  authorizeRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { fullName, email, password, role, university, college } = req.body;

      if (!fullName || !email || !password || !role || !university || !college) {
        return res.status(400).json({
          message: "All fields are required",
          code: "MISSING_FIELDS",
        });
      }

      if (!["student", "instructor"].includes(role)) {
        return res.status(400).json({
          message: "Role must be student or instructor",
          code: "INVALID_ROLE",
        });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({
          message: "Email already registered",
          code: "EMAIL_ALREADY_EXISTS",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      let displayName = fullName.trim();
      if (role === "instructor" && !displayName.toLowerCase().startsWith("dr.")) {
        displayName = `Dr. ${displayName}`;
      }

      const user = await User.create({
        fullName: displayName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        university,
        college,
        isEmailVerified: true, // Admin-created users are pre-verified
        authProvider: "local",
        isProfileComplete: true,
      });

      res.status(201).json({
        message: "User created successfully",
        code: "USER_CREATED",
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          university: user.university,
          college: user.college,
        },
      });
    } catch (err) {
      console.error("[ERROR] Create user failed:", err.message);
      res.status(500).json({
        message: "Failed to create user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * DELETE /admin/users/:id
 * Delete a user by ID
 */
router.delete(
  "/users/:id",
  authenticateToken,
  authorizeRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid user ID",
          code: "INVALID_ID",
        });
      }

      // Prevent admin from deleting themselves
      if (req.user._id.toString() === id) {
        return res.status(400).json({
          message: "You cannot delete your own account",
          code: "CANNOT_DELETE_SELF",
        });
      }

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      res.status(200).json({
        message: "User deleted successfully",
        code: "USER_DELETED",
      });
    } catch (err) {
      console.error("[ERROR] Delete user failed:", err.message);
      res.status(500).json({
        message: "Failed to delete user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * PUT /admin/users/:id
 * Update a user's info (name, college, university)
 */
router.put(
  "/users/:id",
  authenticateToken,
  authorizeRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid user ID",
          code: "INVALID_ID",
        });
      }

      const allowedUpdates = ["fullName", "university", "college"];
      const updates = {};
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "No valid fields to update",
          code: "NO_UPDATES",
        });
      }

      const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      res.status(200).json({
        message: "User updated successfully",
        code: "USER_UPDATED",
        user,
      });
    } catch (err) {
      console.error("[ERROR] Update user failed:", err.message);
      res.status(500).json({
        message: "Failed to update user",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

// ============================================
// SITE SETTINGS
// ============================================

/**
 * GET /admin/settings
 * Get current site settings
 */
router.get(
  "/settings",
  authenticateToken,
  authorizeRole("admin", "super_admin"),
  async (req, res) => {
    try {
      let settings = await SiteSettings.findOne({ key: "main" });

      // Create default settings if not found
      if (!settings) {
        settings = await SiteSettings.create({ key: "main" });
      }

      res.status(200).json({
        message: "Settings fetched successfully",
        code: "SETTINGS_FETCHED",
        settings,
      });
    } catch (err) {
      console.error("[ERROR] Get settings failed:", err.message);
      res.status(500).json({
        message: "Failed to fetch settings",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

/**
 * PUT /admin/settings
 * Update site settings (logo, siteName, contactEmail)
 * Body: { logoUrl, siteName, contactEmail }
 */
router.put(
  "/settings",
  authenticateToken,
  authorizeRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const allowedUpdates = ["logoUrl", "siteName", "contactEmail"];
      const updates = {};
      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "No valid fields to update",
          code: "NO_UPDATES",
        });
      }

      const settings = await SiteSettings.findOneAndUpdate(
        { key: "main" },
        updates,
        { new: true, upsert: true, runValidators: true },
      );

      res.status(200).json({
        message: "Settings updated successfully",
        code: "SETTINGS_UPDATED",
        settings,
      });
    } catch (err) {
      console.error("[ERROR] Update settings failed:", err.message);
      res.status(500).json({
        message: "Failed to update settings",
        code: "INTERNAL_SERVER_ERROR",
      });
    }
  },
);

module.exports = router;
