const mongoose = require("mongoose");
const COURSE_CODES = require("../constants/courseCodes");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },

    // Academic info
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
      enum: Object.keys(COURSE_CODES),
      required: true,
    },

    semester: {
      type: String,
      enum: ["Spring", "Summer", "Fall", "Winter"],
    },

    year: {
      type: Number,
    },

    section: {
      type: String,
      trim: true,
      uppercase: true,
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Class", classSchema);
