/**
 * ThermalMind Cooling Recommendation Engine
 * Analyzes sensor metrics, forecast trajectories, and anomaly records to synthesize
 * actionable, physics-backed operator recommendations with lifecycle tracking.
 */

const { v4: uuidv4 } = require('uuid');
const CoolingRecommendation = require('../models/CoolingRecommendation');
const { logAuditEvent } = require('../audit/auditLogger');

/**
 * Evaluates an anomaly event and sensor reading to generate a cooling recommendation.
 */
async function evaluateAndGenerateRecommendation(anomaly, reading) {
  // Check if an open or acknowledged recommendation already exists for this server & issue
  const existing = await CoolingRecommendation.findOne({
    serverId: reading.serverId,
    status: { $in: ['Open', 'Acknowledged'] }
  });

  if (existing) {
    return existing; // Avoid duplicate unresolved alerts
  }

  let title = '';
  let explanation = '';
  let recommendedAction = '';
  let severity = 'Medium';

  switch (anomaly.anomalyType) {
    case 'CRITICAL_HOTSPOT':
      severity = 'Critical';
      title = `Critical Hotspot Escalation on Rack ${reading.rackId}`;
      explanation = `Server ${reading.serverId} temperature has reached ${reading.temperature}°C, exceeding the safety ceiling. At this temperature, compute hardware is at acute risk of thermal degradation and clock throttling.`;
      recommendedAction = `1. Check cold-aisle containment doors and verify perforated floor tile dampers around ${reading.rackId}.\n2. Ensure CRAH/CRAC supply temperature is within 18-22°C.\n3. Consider migrating non-essential container pods off server ${reading.serverId} to cooler nodes.`;
      break;

    case 'SUDDEN_SPIKE':
      severity = reading.temperature > 34 ? 'High' : 'Medium';
      title = `Transient Thermal Surge Detected on ${reading.serverId}`;
      explanation = `Rapid temperature increase of +${anomaly.evidence.temperatureDelta}°C observed within the monitoring window. Likely driven by sudden computational batch jobs or localized fan failure.`;
      recommendedAction = `1. Review host process list and CPU utilization schedule on ${reading.serverId}.\n2. Check chassis tachometer telemetry to confirm internal fans have accelerated to target RPM.\n3. If temperature persists above 34°C for >15 minutes, inspect rear exhaust perforated door.`;
      break;

    case 'COOLING_DEGRADATION':
      severity = 'High';
      title = `Cooling Delivery Degradation in Row ${reading.rackId.charAt(5)}`;
      explanation = `Server fan speed is saturated at ${reading.fanSpeed}%, yet temperature remains elevated at ${reading.temperature}°C. The cooling infrastructure is failing to extract heat effectively.`;
      recommendedAction = `1. Inspect CRAC chilled water valve position and supply fan static pressure.\n2. Verify that rack blanking panels are properly installed to prevent hot-exhaust recirculation.\n3. Check air filter differential pressure manometer on local air handler.`;
      break;

    case 'WORKLOAD_MISMATCH':
      severity = 'Medium';
      title = `Thermal-to-Workload Inconsistency on ${reading.serverId}`;
      explanation = `Temperature is ${reading.temperature}°C despite minimal CPU workload (${reading.cpuUtilization}%). In normal conditions, low compute load should maintain near-ambient temperatures.`;
      recommendedAction = `1. Verify temperature sensor calibration against an infrared thermography probe.\n2. Inspect adjacent high-density blade servers for hot air leakage into this chassis intake.\n3. Confirm chassis intake dust filters are clear of lint or debris.`;
      break;

    case 'PERSISTENT_HIGH':
    default:
      severity = reading.temperature > 35 ? 'High' : 'Low';
      title = `Prolonged Elevated Temperature on Rack ${reading.rackId}`;
      explanation = `Server ${reading.serverId} temperature has deviated by +${Math.round(anomaly.evidence.zScore * 10) / 10} standard deviations from baseline for multiple sampling periods.`;
      recommendedAction = `1. Review rack power density and check if overall rack load exceeds airflow design capacity.\n2. Verify CRAH floor plenum static pressure under tile ${reading.rackId}.\n3. Schedule preventive maintenance inspection during next maintenance window.`;
      break;
  }

  const rec = await CoolingRecommendation.create({
    recommendationId: `REC-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`,
    rackId: reading.rackId,
    serverId: reading.serverId,
    anomalyId: anomaly.anomalyId,
    severity,
    title,
    explanation,
    supportingEvidence: {
      currentTemp: reading.temperature,
      safeLimit: 32.0,
      cpuUtilization: reading.cpuUtilization,
      powerWatts: reading.powerWatts,
      coolingIntensity: reading.fanSpeed,
      forecast60Min: Math.round((reading.temperature + 1.5) * 10) / 10
    },
    recommendedAction,
    status: 'Open'
  });

  console.log(`[RECOMMENDATIONS] Generated cooling recommendation: ${rec.recommendationId} (${rec.title})`);
  return rec;
}

/**
 * Acknowledge a recommendation by operator.
 */
async function acknowledgeRecommendation(recommendationId, user) {
  const rec = await CoolingRecommendation.findOne({ recommendationId });
  if (!rec) throw new Error('Recommendation not found');

  rec.status = 'Acknowledged';
  rec.acknowledgedBy = `${user.name} (${user.email})`;
  rec.acknowledgedAt = new Date();
  await rec.save();

  await logAuditEvent({
    action: 'ACKNOWLEDGE_RECOMMENDATION',
    module: 'RECOMMENDATIONS',
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    details: { recommendationId, title: rec.title, severity: rec.severity },
    status: 'SUCCESS'
  });

  return rec;
}

/**
 * Resolve a recommendation with operator resolution notes.
 */
async function resolveRecommendation(recommendationId, user, resolutionNotes) {
  const rec = await CoolingRecommendation.findOne({ recommendationId });
  if (!rec) throw new Error('Recommendation not found');

  rec.status = 'Resolved';
  rec.resolvedBy = `${user.name} (${user.email})`;
  rec.resolvedAt = new Date();
  rec.resolutionNotes = resolutionNotes || 'Investigated and resolved by operator.';
  await rec.save();

  await logAuditEvent({
    action: 'RESOLVE_RECOMMENDATION',
    module: 'RECOMMENDATIONS',
    userId: user._id,
    userEmail: user.email,
    userRole: user.role,
    details: { recommendationId, title: rec.title, resolutionNotes: rec.resolutionNotes },
    status: 'SUCCESS'
  });

  return rec;
}

module.exports = {
  evaluateAndGenerateRecommendation,
  acknowledgeRecommendation,
  resolveRecommendation
};
