/**
 * ClassAnnouncement Schema
 * For instructor-created, class-specific announcements
 */

const mongoose = require("mongoose");

const classAnnouncementSchema = new mongoose.Schema(
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
    links: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        fileUrl: { type: String, required: true },
        originalName: { type: String, required: true },
        mimetype: { type: String },
        size: { type: Number },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    visibleTo: {
      type: [String],
      enum: ["student", "instructor", "staff"],
      default: ["student"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ClassAnnouncement", classAnnouncementSchema);
