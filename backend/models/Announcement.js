/**
 * Announcement Schema
 * For admin-created announcements visible to students (and optionally instructors)
 */

const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibleTo: {
      type: [String], // e.g. ["student", "instructor", "staff"]
      enum: ["student", "instructor", "staff", "admin", "super_admin"],
      default: ["student"],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Announcement", announcementSchema);
