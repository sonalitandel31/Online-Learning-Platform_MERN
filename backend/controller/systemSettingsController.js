const SystemSettings = require("../models/SystemSettings");

async function getOrCreateSettings() {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({});
  }
  return settings;
}

// Admin - full data
exports.getAdminSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin - update
exports.updateSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    const { defaultPlatformCommission, contentApproval } = req.body;

    if (defaultPlatformCommission !== undefined) {
      settings.defaultPlatformCommission = Number(defaultPlatformCommission);
    }

    if (contentApproval) {
      if (contentApproval.mode)
        settings.contentApproval.mode = contentApproval.mode;

      if (contentApproval.reviewNoteRequiredOnReject !== undefined)
        settings.contentApproval.reviewNoteRequiredOnReject =
          contentApproval.reviewNoteRequiredOnReject;

      if (Array.isArray(contentApproval.rejectionReasons))
        settings.contentApproval.rejectionReasons =
          contentApproval.rejectionReasons;
    }

    await settings.save();
    res.json({ message: "Settings updated", settings });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Instructor read-only
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    res.json({
      commission: settings.defaultPlatformCommission,
      instructorShare: 100 - settings.defaultPlatformCommission,
      approvalMode: settings.contentApproval.mode,
      rejectionReasons: settings.contentApproval.rejectionReasons,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};