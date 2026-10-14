/**
 * ThermalMind Database Seed Script
 * Initializes user accounts (Admin & Operator), facility topology (DataCenter, Racks, Servers),
 * system thresholds, historical sensor readings from CSV, initial AI forecasts, and audit logs.
 */

const path = require('path');
// Ensure module resolution finds backend dependencies
module.paths.push(path.resolve(__dirname, '../backend/node_modules'));

const fs = require('fs');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../backend/src/config/db');

// Models
const User = require('../backend/src/models/User');
const DataCenter = require('../backend/src/models/DataCenter');
const Rack = require('../backend/src/models/Rack');
const Server = require('../backend/src/models/Server');
const SensorReading = require('../backend/src/models/SensorReading');
const SystemSetting = require('../backend/src/models/SystemSetting');
const AnomalyEvent = require('../backend/src/models/AnomalyEvent');
const CoolingRecommendation = require('../backend/src/models/CoolingRecommendation');
const EnergyMeasurement = require('../backend/src/models/EnergyMeasurement');
const IngestionJob = require('../backend/src/models/IngestionJob');
const AuditLog = require('../backend/src/models/AuditLog');

const { trainForecastingModels, generateAndSaveForecasts } = require('../backend/src/ai/forecasting');
const { scanAndDetectAnomalies } = require('../backend/src/ai/anomalyDetector');
const { evaluateAndGenerateRecommendation } = require('../backend/src/services/recommendationEngine');

async function seedDatabase(options = { keepConnectionOpen: false }) {
  console.log('====================================================');
  console.log('   THERMALMIND DATABASE INITIALIZATION & SEEDING   ');
  console.log('====================================================');

  await connectDB();

  // 1. Seed Users
  console.log('[SEED] Seeding user accounts...');
  await User.deleteMany();

  const admin = new User({
    name: 'ThermalMind Lead Architect',
    email: 'admin@thermalmind.io',
    password: 'Admin@ThermalMind2026',
    role: 'Administrator',
    isActive: true
  });
  await admin.save();

  const operator = new User({
    name: 'Ashburn Data Center Operator',
    email: 'operator@thermalmind.io',
    password: 'Operator@ThermalMind2026',
    role: 'Operator',
    isActive: true
  });
  await operator.save();

  console.log(`[SEED] Created Users:
  - Admin: admin@thermalmind.io / Admin@ThermalMind2026 (Role: Administrator)
  - Operator: operator@thermalmind.io / Operator@ThermalMind2026 (Role: Operator)`);

  // 2. Seed DataCenter
  console.log('[SEED] Seeding Data Center facility...');
  await DataCenter.deleteMany();
  const dc = await DataCenter.create({
    id: 'DC-EAST-01',
    name: 'Ashburn High-Density Cloud Facility 1',
    location: 'Ashburn, VA, USA',
    totalRacks: 4,
    maxCapacityKw: 1200,
    targetPue: 1.2,
    coolingType: 'Indirect Evaporative Cooling + Dual Chilled Water CRAH Loop',
    status: 'Optimal'
  });

  // 3. Seed Racks
  console.log('[SEED] Seeding Racks...');
  await Rack.deleteMany();
  const racksData = [
    { id: 'RACK-A01', dataCenterId: 'DC-EAST-01', row: 'A', bay: 1, warningTempThreshold: 32.0, criticalTempThreshold: 38.0, targetAirflowCfm: 1800, totalServers: 4, status: 'Optimal' },
    { id: 'RACK-A02', dataCenterId: 'DC-EAST-01', row: 'A', bay: 2, warningTempThreshold: 32.0, criticalTempThreshold: 38.0, targetAirflowCfm: 1800, totalServers: 4, status: 'Optimal' },
    { id: 'RACK-B01', dataCenterId: 'DC-EAST-01', row: 'B', bay: 1, warningTempThreshold: 32.0, criticalTempThreshold: 38.0, targetAirflowCfm: 1800, totalServers: 4, status: 'Optimal' },
    { id: 'RACK-B02', dataCenterId: 'DC-EAST-01', row: 'B', bay: 2, warningTempThreshold: 32.0, criticalTempThreshold: 38.0, targetAirflowCfm: 1800, totalServers: 4, status: 'Warning' }
  ];
  await Rack.insertMany(racksData);

  // 4. Seed Servers
  console.log('[SEED] Seeding Servers (16 compute nodes across 4 racks)...');
  await Server.deleteMany();
  const serversData = [];
  for (const r of racksData) {
    for (let s = 1; s <= 4; s++) {
      const srvId = `SRV-${r.id.split('-')[1]}-0${s}`;
      serversData.push({
        id: srvId,
        rackId: r.id,
        dataCenterId: 'DC-EAST-01',
        hostname: `compute-${srvId.toLowerCase()}.internal.thermalmind.io`,
        ipAddress: `10.240.${r.row === 'A' ? 10 : 20}.${r.bay * 10 + s}`,
        cpuModel: s % 2 === 0 ? 'AMD EPYC 9654 96-Core Processor' : 'Intel Xeon Platinum 8480+ 56-Core Processor',
        cores: s % 2 === 0 ? 96 : 56,
        tdpWatts: s % 2 === 0 ? 360 : 350,
        status: r.id === 'RACK-B02' && s === 3 ? 'Warning' : 'Normal'
      });
    }
  }
  await Server.insertMany(serversData);

  // 5. Seed System Settings
  console.log('[SEED] Seeding System Settings...');
  await SystemSetting.deleteMany();
  await SystemSetting.create({
    key: 'default_config',
    warningTempThreshold: 32.0,
    criticalTempThreshold: 38.0,
    maxAllowedDelta: 4.5,
    anomalySensitivity: 2.2,
    autoRecommendation: true,
    simulatorIntervalMs: 4000,
    cloudSyncEnabled: false,
    updatedBy: 'System Seed'
  });

  // 6. Generate and Ingest Historical Sensor Data
  console.log('[SEED] Ingesting historical sensor telemetry...');
  const csvPath = path.resolve(__dirname, '../datasets/data_center_sensors_historical.csv');

  // Ensure CSV exists
  if (!fs.existsSync(csvPath)) {
    console.log('[SEED] Dataset CSV not found. Generating dataset files now...');
    require('./generateDataset');
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  const headers = lines[0].split(',');

  const readings = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length < headers.length) continue;

    readings.push({
      timestamp: new Date(cols[0]),
      dataCenterId: cols[1],
      rackId: cols[2],
      serverId: cols[3],
      temperature: parseFloat(cols[4]),
      humidity: parseFloat(cols[5]),
      cpuUtilization: parseFloat(cols[6]),
      workload: cols[7],
      powerWatts: parseFloat(cols[8]),
      coolingStatus: cols[9],
      fanSpeed: parseFloat(cols[10]),
      dataSource: 'historical_import',
      validationStatus: 'VALID'
    });
  }

  await SensorReading.deleteMany();
  await SensorReading.insertMany(readings);
  console.log(`[SEED] Ingested ${readings.length} historical sensor readings.`);

  // 7. Seed Ingestion Job Record
  await IngestionJob.deleteMany();
  await IngestionJob.create({
    jobId: 'JOB-HISTORICAL-SEED-001',
    filename: 'data_center_sensors_historical.csv',
    dataSource: 'historical_import',
    totalProcessed: readings.length,
    validRecords: readings.length,
    invalidRecords: 0,
    duplicateRecords: 0,
    missingValuesDetected: 0,
    durationMs: 480,
    status: 'COMPLETED',
    executedBy: 'System Seed Pipeline'
  });

  // 8. Seed Energy Measurements
  console.log('[SEED] Seeding energy measurements...');
  await EnergyMeasurement.deleteMany();
  const energyRecords = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const t = new Date(now - i * 60 * 60 * 1000);
    const serverKw = 3.6 + Math.sin(i / 3) * 0.8 + (Math.random() * 0.2 - 0.1);
    const coolingKw = serverKw * 0.34;
    const totalKw = serverKw + coolingKw + 0.3;
    const pue = Math.round((totalKw / serverKw) * 1000) / 1000;
    const kwh = Math.round(totalKw * 1.0 * 100) / 100; // 1 hour period

    energyRecords.push({
      timestamp: t,
      dataCenterId: 'DC-EAST-01',
      totalServerPowerKw: Math.round(serverKw * 100) / 100,
      estimatedCoolingPowerKw: Math.round(coolingKw * 100) / 100,
      totalFacilityPowerKw: Math.round(totalKw * 100) / 100,
      instantaneousPue: pue,
      energyConsumedKwh: kwh,
      isEstimated: true
    });
  }
  await EnergyMeasurement.insertMany(energyRecords);

  // 9. Train AI Forecasting Model & Generate Forecasts
  console.log('[SEED] Training AI forecasting model on historical dataset...');
  await trainForecastingModels();
  await generateAndSaveForecasts();

  // 10. Run Anomaly Detection and Recommendations
  console.log('[SEED] Detecting thermal anomalies and generating cooling recommendations...');
  await AnomalyEvent.deleteMany();
  await CoolingRecommendation.deleteMany();

  const detectedAnomalies = await scanAndDetectAnomalies();
  console.log(`[SEED] Detected ${detectedAnomalies.length} initial thermal anomalies.`);

  // If no anomalies detected automatically from baseline, create representative demonstration anomalies
  if (detectedAnomalies.length === 0) {
    const sampleAnomaly = await AnomalyEvent.create({
      anomalyId: 'ANOM-DEMO-001',
      rackId: 'RACK-B02',
      serverId: 'SRV-B02-03',
      timestamp: new Date(),
      observedTemperature: 38.6,
      baselineTemperature: 25.2,
      anomalyScore: 3.85,
      riskCategory: 'Critical',
      anomalyType: 'CRITICAL_HOTSPOT',
      explanation: 'Server temperature 38.6°C breaches the critical threshold (38.0°C), exceeding baseline by +13.4°C (Z-score: 3.85).',
      evidence: {
        currentTemp: 38.6,
        rollingMean: 25.2,
        rollingStd: 1.2,
        cpuUtilization: 78.4,
        powerWatts: 420,
        fanSpeed: 96,
        zScore: 3.85,
        temperatureDelta: 6.2
      },
      recommendedInvestigation: 'Immediate thermal inspection required. Verify CRAC supply cold-aisle containment, inspect rack perforated tiles, and check for compute thermal throttling.',
      status: 'DETECTED'
    });

    await evaluateAndGenerateRecommendation(sampleAnomaly, {
      rackId: 'RACK-B02',
      serverId: 'SRV-B02-03',
      temperature: 38.6,
      cpuUtilization: 78.4,
      powerWatts: 420,
      fanSpeed: 96
    });

    const warningAnomaly = await AnomalyEvent.create({
      anomalyId: 'ANOM-DEMO-002',
      rackId: 'RACK-A02',
      serverId: 'SRV-A02-02',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      observedTemperature: 33.4,
      baselineTemperature: 24.1,
      anomalyScore: 2.75,
      riskCategory: 'Medium Risk',
      anomalyType: 'SUDDEN_SPIKE',
      explanation: 'Acute temperature surge detected: +5.2°C rise within the last monitoring interval exceeds the maximum allowed delta threshold (4.5°C).',
      evidence: {
        currentTemp: 33.4,
        rollingMean: 24.1,
        rollingStd: 1.1,
        cpuUtilization: 92.0,
        powerWatts: 410,
        fanSpeed: 82,
        zScore: 2.75,
        temperatureDelta: 5.2
      },
      recommendedInvestigation: 'Inspect server fan controller response, verify transient CPU burst or GPU compute load, and check for sudden airflow obstruction.',
      status: 'DETECTED'
    });

    await evaluateAndGenerateRecommendation(warningAnomaly, {
      rackId: 'RACK-A02',
      serverId: 'SRV-A02-02',
      temperature: 33.4,
      cpuUtilization: 92.0,
      powerWatts: 410,
      fanSpeed: 82
    });
  }

  // 11. Seed Audit Logs
  console.log('[SEED] Recording initialization audit trail...');
  await AuditLog.deleteMany();
  await AuditLog.create({
    id: 'AUDIT-INIT-001',
    timestamp: new Date(),
    userId: admin._id,
    userEmail: admin.email,
    userRole: admin.role,
    action: 'SYSTEM_DATABASE_INITIALIZATION',
    module: 'SYSTEM',
    details: {
      message: 'Initial system seeding completed with users, topology, sensors, ML models, and initial alerts.',
      readingsCount: readings.length,
      racksCount: 4,
      serversCount: 16
    },
    ipAddress: '127.0.0.1',
    status: 'SUCCESS'
  });

  console.log('====================================================');
  console.log('   THERMALMIND SEEDING COMPLETED SUCCESSFULLY!      ');
  console.log('====================================================');

  if (!options.keepConnectionOpen) {
    await disconnectDB();
  }
}

// Allow direct execution from CLI
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[SEED ERROR]', err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
