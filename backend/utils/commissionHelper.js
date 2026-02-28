const SystemSettings = require("../models/SystemSettings");

async function getEffectivePlatformCommission(categoryId) {
  const settings = await SystemSettings.findOne();
  if (!settings) return 30;

  const overrides = settings.categoryCommissionOverrides || [];
  const categoryOverride = overrides.find(
    (c) => c.categoryId?.toString() === categoryId?.toString()
  );

  if (categoryOverride && typeof categoryOverride.platformCommission === "number") {
    return categoryOverride.platformCommission;
  }

  return settings.defaultPlatformCommission ?? 30;
}

module.exports = { getEffectivePlatformCommission };