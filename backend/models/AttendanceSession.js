// models/AttendanceSession.js
// Mongoose model for attendance sessions

const mongoose = require("mongoose");

const AttendanceSessionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    location: {
      // { lat: Number, lng: Number, radius: Number }
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      radius: {
        type: Number,
        required: false,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    exported: {
      type: Boolean,
      default: false,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("AttendanceSession", AttendanceSessionSchema);
