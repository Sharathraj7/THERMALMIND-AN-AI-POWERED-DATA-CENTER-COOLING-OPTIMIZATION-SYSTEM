/**
 * ThermalMind Cooling Recommendations Controller
 */

const CoolingRecommendation = require('../models/CoolingRecommendation');
const { acknowledgeRecommendation, resolveRecommendation } = require('../services/recommendationEngine');
const { updateRecommendationSchema } = require('../validators/schemas');

async function getRecommendations(req, res, next) {
  try {
    const { status, severity, rackId, limit = 50 } = req.query;
    const filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (severity && severity !== 'ALL') filter.severity = severity;
    if (rackId && rackId !== 'ALL') filter.rackId = rackId;

    const recommendations = await CoolingRecommendation.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    const counts = {
      open: await CoolingRecommendation.countDocuments({ status: 'Open' }),
      acknowledged: await CoolingRecommendation.countDocuments({ status: 'Acknowledged' }),
      resolved: await CoolingRecommendation.countDocuments({ status: 'Resolved' }),
      critical: await CoolingRecommendation.countDocuments({ severity: 'Critical', status: { $in: ['Open', 'Acknowledged'] } })
    };

    res.json({
      success: true,
      counts,
      recommendations
    });
  } catch (err) {
    next(err);
  }
}

async function updateRecommendationStatus(req, res, next) {
  try {
    const { error, value } = updateRecommendationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { status, resolutionNotes } = value;
    const recommendationId = req.params.id;

    let updated;
    if (status === 'Acknowledged') {
      updated = await acknowledgeRecommendation(recommendationId, req.user);
    } else if (status === 'Resolved') {
      updated = await resolveRecommendation(recommendationId, req.user, resolutionNotes);
    }

    res.json({
      success: true,
      message: `Recommendation ${recommendationId} updated to ${status}.`,
      recommendation: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecommendations,
  updateRecommendationStatus
};
