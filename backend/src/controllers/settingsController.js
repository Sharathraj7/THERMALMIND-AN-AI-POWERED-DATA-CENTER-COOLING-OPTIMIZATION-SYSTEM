/**
 * ThermalMind System Settings Controller
 */

const SystemSetting = require('../models/SystemSetting');
const { updateSettingsSchema } = require('../validators/schemas');
const { logAuditEvent } = require('../audit/auditLogger');

async function getSettings(req, res, next) {
  try {
    let settings = await SystemSetting.findOne({ key: 'default_config' });
    if (!settings) {
      settings = await SystemSetting.create({
        key: 'default_config',
        warningTempThreshold: 32.0,
        criticalTempThreshold: 38.0,
        maxAllowedDelta: 4.5,
        anomalySensitivity: 2.2,
        autoRecommendation: true,
        simulatorIntervalMs: 4000,
        cloudSyncEnabled: false,
        updatedBy: 'System Default'
      });
    }

    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { error, value } = updateSettingsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    let settings = await SystemSetting.findOne({ key: 'default_config' });
    if (!settings) {
      settings = new SystemSetting({ key: 'default_config' });
    }

    const previousValues = {
      warningTempThreshold: settings.warningTempThreshold,
      criticalTempThreshold: settings.criticalTempThreshold,
      maxAllowedDelta: settings.maxAllowedDelta,
      anomalySensitivity: settings.anomalySensitivity
    };

    Object.assign(settings, value);
    settings.updatedBy = `${req.user.name} (${req.user.email})`;
    await settings.save();

    await logAuditEvent({
      action: 'UPDATE_SYSTEM_SETTINGS',
      module: 'SETTINGS',
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      details: {
        updatedFields: value,
        previousValues
      },
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'System thresholds and settings updated successfully.',
      settings
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings
};
