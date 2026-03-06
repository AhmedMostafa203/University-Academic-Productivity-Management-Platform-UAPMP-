/**
 * SiteSettings Schema
 * Stores global site configuration managed by admin
 * Only one document should exist (singleton pattern)
 */

const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema(
  {
    // Unique key to enforce singleton (always "main")
    key: {
      type: String,
      default: "main",
      unique: true,
    },
    // Site logo URL or path
    logoUrl: {
      type: String,
      default: null,
    },
    // Site display name
    siteName: {
      type: String,
      default: "UAPMP",
      maxlength: 100,
    },
    // Contact email shown on site
    contactEmail: {
      type: String,
      default: null,
    },
    // Any extra config admin might need later
    extraConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
