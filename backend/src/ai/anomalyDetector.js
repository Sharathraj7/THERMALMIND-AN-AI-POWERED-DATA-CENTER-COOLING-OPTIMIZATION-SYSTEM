/**
 * ThermalMind Thermal Anomaly Detection Module
 * Implements statistical anomaly detection using rolling baseline statistics (mean, std dev, z-score),
 * multi-criteria thermal heuristic checks, explainable evidence generation, and risk classification.
 */

const { v4: uuidv4 } = require('uuid');
const SensorReading = require('../models/SensorReading');
const AnomalyEvent = require('../models/AnomalyEvent');
const SystemSetting = require('../models/SystemSetting');

/**
 * Computes rolling baseline statistics for a server over its last N readings.
 */
async function getRollingBaseline(serverId, windowSize = 20) {
  const readings = await SensorReading.find({ serverId, validationStatus: 'VALID' })
    .sort({ timestamp: -1 })
    .limit(windowSize)
    .select('temperature powerWatts cpuUtilization fanSpeed timestamp')
    .lean();

  if (readings.length < 3) {
    return {
      meanTemp: 24.0,
      stdTemp: 1.5,
      meanPower: 220,
      meanCpu: 40,
      sampleCount: readings.length,
      recentReadings: readings
    };
  }

  const temps = readings.map(r => r.temperature);
  const meanTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const variance = temps.reduce((sum, t) => sum + Math.pow(t - meanTemp, 2), 0) / temps.length;
  const stdTemp = Math.max(0.4, Math.sqrt(variance)); // Floor at 0.4 to prevent division by zero in flat runs

  const powers = readings.map(r => r.powerWatts);
  const meanPower = powers.reduce((a, b) => a + b, 0) / powers.length;

  const cpus = readings.map(r => r.cpuUtilization);
  const meanCpu = cpus.reduce((a, b) => a + b, 0) / cpus.length;

  return {
    meanTemp: Math.round(meanTemp * 10) / 10,
    stdTemp: Math.round(stdTemp * 100) / 100,
    meanPower: Math.round(meanPower),
    meanCpu: Math.round(meanCpu * 10) / 10,
    sampleCount: readings.length,
    recentReadings: readings
  };
}

/**
 * Evaluates a single sensor reading against statistical baselines and threshold rules.
 * Returns AnomalyEvent document if anomalous, or null if normal.
 */
async function detectAnomaliesForReading(reading) {
  // Load configured thresholds
  let settings = await SystemSetting.findOne({ key: 'default_config' }).lean();
  if (!settings) {
    settings = {
      warningTempThreshold: 32.0,
      criticalTempThreshold: 38.0,
      maxAllowedDelta: 4.5,
      anomalySensitivity: 2.2
    };
  }

  const baseline = await getRollingBaseline(reading.serverId);
  const deltaFromBaseline = reading.temperature - baseline.meanTemp;
  const zScore = Math.round((deltaFromBaseline / baseline.stdTemp) * 100) / 100;

  // Check temperature delta from previous reading
  let recentDelta = 0;
  if (baseline.recentReadings.length >= 2) {
    recentDelta = Math.round((reading.temperature - baseline.recentReadings[1].temperature) * 10) / 10;
  }

  let isAnomaly = false;
  let anomalyType = null;
  let riskCategory = 'Normal';
  let explanation = '';
  let recommendedInvestigation = '';

  // Rule 1: CRITICAL_HOTSPOT (ASHRAE critical limit reached)
  if (reading.temperature >= settings.criticalTempThreshold) {
    isAnomaly = true;
    anomalyType = 'CRITICAL_HOTSPOT';
    riskCategory = 'Critical';
    explanation = `Server temperature ${reading.temperature}°C breaches the critical threshold (${settings.criticalTempThreshold}°C), exceeding baseline by +${Math.round(deltaFromBaseline * 10) / 10}°C (Z-score: ${zScore}).`;
    recommendedInvestigation = 'Immediate thermal inspection required. Verify CRAC supply cold-aisle containment, inspect rack perforated tiles, and check for compute thermal throttling.';
  }
  // Rule 2: SUDDEN_SPIKE (Rapid rate-of-rise)
  else if (recentDelta >= settings.maxAllowedDelta) {
    isAnomaly = true;
    anomalyType = 'SUDDEN_SPIKE';
    riskCategory = reading.temperature >= settings.warningTempThreshold ? 'High Risk' : 'Medium Risk';
    explanation = `Acute temperature surge detected: +${recentDelta}°C rise within the last monitoring interval exceeds the maximum allowed delta threshold (${settings.maxAllowedDelta}°C).`;
    recommendedInvestigation = 'Inspect server fan controller response, verify transient CPU burst or GPU compute load, and check for sudden airflow obstruction.';
  }
  // Rule 3: COOLING_DEGRADATION (High fan speed failing to dissipate heat)
  else if (reading.fanSpeed >= 88 && reading.temperature >= settings.warningTempThreshold && deltaFromBaseline > 3.0) {
    isAnomaly = true;
    anomalyType = 'COOLING_DEGRADATION';
    riskCategory = 'High Risk';
    explanation = `Cooling degradation detected: Fan speed is saturated at ${reading.fanSpeed}% but temperature remains elevated at ${reading.temperature}°C (+${Math.round(deltaFromBaseline * 10) / 10}°C above baseline).`;
    recommendedInvestigation = 'Inspect CRAC/CRAH chiller delivery pressure, verify cold aisle inlet temperature, and check for server chassis dust accumulation or heat sink detachment.';
  }
  // Rule 4: WORKLOAD_MISMATCH (High heat with low compute workload)
  else if (reading.temperature >= 29.5 && reading.cpuUtilization < 25 && deltaFromBaseline > 3.5) {
    isAnomaly = true;
    anomalyType = 'WORKLOAD_MISMATCH';
    riskCategory = 'Medium Risk';
    explanation = `Thermal-to-workload anomaly: Temperature is ${reading.temperature}°C despite low CPU utilization (${reading.cpuUtilization}%). Inconsistent with expected idle thermal envelope.`;
    recommendedInvestigation = 'Check adjacent server hot air exhaust recirculation, inspect blanking panels in rack ${reading.rackId}, and verify sensor calibration.';
  }
  // Rule 5: Statistical Z-Score outlier
  else if (zScore >= settings.anomalySensitivity) {
    isAnomaly = true;
    anomalyType = 'PERSISTENT_HIGH';
    riskCategory = zScore >= 3.2 ? 'High Risk' : 'Medium Risk';
    explanation = `Statistical thermal deviation: Observed temperature ${reading.temperature}°C is ${zScore} standard deviations above the ${baseline.sampleCount}-sample rolling baseline (${baseline.meanTemp}°C ± ${baseline.stdTemp}°C).`;
    recommendedInvestigation = 'Monitor rack thermal trajectory, cross-reference adjacent rack telemetry, and review cooling supply setpoints.';
  }

  if (!isAnomaly) {
    return null;
  }

  // Deduplicate: avoid creating identical anomaly for same server within 3 minutes
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
  const recentAnomaly = await AnomalyEvent.findOne({
    serverId: reading.serverId,
    anomalyType,
    timestamp: { $gte: threeMinutesAgo }
  });

  if (recentAnomaly) {
    return null;
  }

  const anomalyDoc = await AnomalyEvent.create({
    anomalyId: `ANOM-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`,
    rackId: reading.rackId,
    serverId: reading.serverId,
    timestamp: reading.timestamp || new Date(),
    observedTemperature: reading.temperature,
    baselineTemperature: baseline.meanTemp,
    anomalyScore: Math.abs(zScore),
    riskCategory,
    anomalyType,
    explanation,
    evidence: {
      currentTemp: reading.temperature,
      rollingMean: baseline.meanTemp,
      rollingStd: baseline.stdTemp,
      cpuUtilization: reading.cpuUtilization,
      powerWatts: reading.powerWatts,
      fanSpeed: reading.fanSpeed,
      zScore,
      temperatureDelta: recentDelta
    },
    recommendedInvestigation,
    status: 'DETECTED'
  });

  console.log(`[AI] Thermal anomaly detected: ${anomalyDoc.anomalyId} on ${reading.serverId} (${riskCategory} - ${anomalyType})`);
  return anomalyDoc;
}

/**
 * Scan all latest readings across the data center and detect current anomalies.
 */
async function scanAndDetectAnomalies() {
  const latestReadings = await SensorReading.aggregate([
    { $match: { validationStatus: 'VALID' } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$serverId',
        latest: { $first: '$$ROOT' }
      }
    }
  ]);

  const detectedAnomalies = [];
  const { evaluateAndGenerateRecommendation } = require('../services/recommendationEngine');

  for (const item of latestReadings) {
    const anomaly = await detectAnomaliesForReading(item.latest);
    if (anomaly) {
      detectedAnomalies.push(anomaly);
      try {
        await evaluateAndGenerateRecommendation(anomaly, item.latest);
      } catch (err) {
        // continue
      }
    }
  }

  return detectedAnomalies;
}

module.exports = {
  detectAnomaliesForReading,
  scanAndDetectAnomalies,
  getRollingBaseline
};
