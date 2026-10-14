/**
 * ThermalMind AI Engineering Controller
 * Exposes temperature forecasting, anomaly detection, explainable AI metrics, and model training.
 */

const Forecast = require('../models/Forecast');
const AnomalyEvent = require('../models/AnomalyEvent');
const {
  trainForecastingModels,
  predictTemperature,
  generateAndSaveForecasts,
  getModelMetadata
} = require('../ai/forecasting');
const { scanAndDetectAnomalies } = require('../ai/anomalyDetector');
const { generateRiskAssessment } = require('../ai/riskAssessment');
const { forecastRequestSchema } = require('../validators/schemas');
const { logAuditEvent } = require('../audit/auditLogger');

async function getForecasts(req, res, next) {
  try {
    const { rackId, serverId, horizon } = req.query;
    const filter = {};
    if (rackId && rackId !== 'ALL') filter.rackId = rackId;
    if (serverId && serverId !== 'ALL') filter.serverId = serverId;
    if (horizon) filter.horizonMinutes = parseInt(horizon, 10);

    let forecasts = await Forecast.find(filter)
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();

    // If no forecasts generated yet, generate them on the fly
    if (forecasts.length === 0) {
      await generateAndSaveForecasts();
      forecasts = await Forecast.find(filter)
        .sort({ createdAt: -1 })
        .limit(60)
        .lean();
    }

    res.json({
      success: true,
      count: forecasts.length,
      modelMetadata: getModelMetadata(),
      forecasts
    });
  } catch (err) {
    next(err);
  }
}

async function predictCustom(req, res, next) {
  try {
    const { error, value } = forecastRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const predictions = await predictTemperature(value);
    res.json({
      success: true,
      inputFeatures: value,
      predictions
    });
  } catch (err) {
    next(err);
  }
}

async function getAnomalies(req, res, next) {
  try {
    const { rackId, riskCategory, status, limit = 50 } = req.query;
    const filter = {};
    if (rackId && rackId !== 'ALL') filter.rackId = rackId;
    if (riskCategory && riskCategory !== 'ALL') filter.riskCategory = riskCategory;
    if (status && status !== 'ALL') filter.status = status;

    const anomalies = await AnomalyEvent.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      success: true,
      count: anomalies.length,
      anomalies
    });
  } catch (err) {
    next(err);
  }
}

async function runThermalAnalysis(req, res, next) {
  try {
    const anomalies = await scanAndDetectAnomalies();
    const forecasts = await generateAndSaveForecasts();
    const riskAssessment = await generateRiskAssessment();

    await logAuditEvent({
      action: 'RUN_AI_THERMAL_SCAN',
      module: 'AI_FORECAST',
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      details: {
        anomaliesDetected: anomalies.length,
        forecastsGenerated: forecasts.length,
        thermalHealthIndex: riskAssessment.thermalHealthIndex
      },
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: `Thermal analysis completed: ${anomalies.length} anomalies detected, ${forecasts.length} forecasts updated.`,
      anomaliesCount: anomalies.length,
      anomalies,
      riskAssessment
    });
  } catch (err) {
    next(err);
  }
}

async function getModelMetrics(req, res) {
  const meta = getModelMetadata();
  res.json({
    success: true,
    metadata: meta
  });
}

async function trainModel(req, res, next) {
  try {
    const result = await trainForecastingModels();

    await logAuditEvent({
      action: 'RETRAIN_FORECAST_MODEL',
      module: 'AI_FORECAST',
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      details: {
        trainingSamples: result.trainingSamples,
        testSamples: result.testSamples,
        metrics: result.metrics
      },
      status: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Forecasting model retrained successfully with chronological split.',
      metadata: result
    });
  } catch (err) {
    next(err);
  }
}

async function getRiskAssessmentEndpoint(req, res, next) {
  try {
    const assessment = await generateRiskAssessment();
    res.json({ success: true, assessment });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getForecasts,
  predictCustom,
  getAnomalies,
  runThermalAnalysis,
  getModelMetrics,
  trainModel,
  getRiskAssessmentEndpoint
};
