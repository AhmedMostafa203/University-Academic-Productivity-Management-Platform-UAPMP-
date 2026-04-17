/**
 * Class Announcement Routes
 * Instructors can create, update, delete class-specific announcements
 * Students can view class announcements
 */

const express = require("express");
const ClassAnnouncement = require("../models/ClassAnnouncement");
const { authenticateToken } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Get all announcements for a specific class (students/instructors)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    const classId = req.query.classId;
    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }
    // Only announcements for this class, visible to the user's role, and not admin-created
    const announcements = await ClassAnnouncement.find({
      classId: classId,
      visibleTo: role,
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch class announcements" });
  }
});

// Instructors: Create class announcement with file upload
router.post(
  "/",
  authenticateToken,
  upload.array("files", 10),
  async (req, res) => {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Forbidden" });
    }
    let { title, message, visibleTo, links, classId } = req.body;
    if (!title || !message || !classId) {
      return res
        .status(400)
        .json({ message: "Title, message, and classId required" });
    }
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        fileUrl: "/uploads/" + file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      }));
    }
    // Parse links if sent as JSON string (from FormData)
    if (typeof links === "string") {
      try {
        links = JSON.parse(links);
      } catch {
        links = [];
      }
    }
    if (!Array.isArray(links)) links = [];
    try {
      // Always set visibleTo to both student and instructor unless explicitly provided as an array
      let visibleToArr = ["student", "instructor"];
      if (visibleTo && Array.isArray(visibleTo)) {
        visibleToArr = visibleTo;
      } else if (typeof visibleTo === "string") {
        try {
          const parsed = JSON.parse(visibleTo);
          if (Array.isArray(parsed)) visibleToArr = parsed;
        } catch {}
      }
      const announcement = await ClassAnnouncement.create({
        title,
        message,
        links,
        attachments,
        createdBy: req.user._id,
        visibleTo: visibleToArr,
        classId,
      });
      res.status(201).json({ announcement });
    } catch (err) {
      res.status(500).json({ message: "Failed to create class announcement" });
    }
  },
);

// Instructors: Delete class announcement
router.delete("/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "instructor") {
    return res.status(403).json({ message: "Forbidden" });
  }
  try {
    await ClassAnnouncement.findByIdAndDelete(req.params.id);
    res.json({ message: "Class announcement deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete class announcement" });
  }
});

// Instructors: Update class announcement
router.put("/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "instructor") {
    return res.status(403).json({ message: "Forbidden" });
  }
  const { title, message, visibleTo, link } = req.body;
  if (!title || !message) {
    return res.status(400).json({ message: "Title and message required" });
  }
  try {
    const updated = await ClassAnnouncement.findByIdAndUpdate(
      req.params.id,
      { title, message, visibleTo, link },
      { new: true },
    );
    if (!updated)
      return res.status(404).json({ message: "Class announcement not found" });
    res.json({ announcement: updated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update class announcement" });
  }
});

module.exports = router;
