// Material controller removed. Only announcements are used in this project.
exports.getMaterialsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const materials = await Material.find({ classId })
      .sort({ createdAt: -1 })
      .populate({ path: "instructorId", select: "fullName email" });
    res.json({ materials });
  } catch (err) {
    console.error("[Material] Get error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch materials", error: err.message });
  }
};

// Update material (only creator can edit)
exports.updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const material = await Material.findById(id);
    if (!material)
      return res.status(404).json({ message: "Material not found" });
    if (String(material.instructorId) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this material" });
    }

    const { title, content, links } = req.body;
    if (title !== undefined) material.title = title;
    if (content !== undefined) material.content = content;
    if (links !== undefined) {
      material.links = normalizeLinks(links);
    }
    // Attachments update (optional, not handled here for simplicity)
    await material.save();
    res.json({ material });
  } catch (err) {
    console.error("[Material] Update error:", err);
    res
      .status(500)
      .json({ message: "Failed to update material", error: err.message });
  }
};

// Delete material (only creator can delete)
exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const material = await Material.findById(id);
    if (!material)
      return res.status(404).json({ message: "Material not found" });
    if (String(material.instructorId) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this material" });
    }
    await material.deleteOne();
    res.json({ message: "Material deleted" });
  } catch (err) {
    console.error("[Material] Delete error:", err);
    res
      .status(500)
      .json({ message: "Failed to delete material", error: err.message });
  }
};
