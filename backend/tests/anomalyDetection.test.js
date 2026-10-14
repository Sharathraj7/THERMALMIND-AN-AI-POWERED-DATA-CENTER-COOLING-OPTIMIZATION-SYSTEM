/**
 * Thermal Anomaly Detection Tests
 */

const { connectDB, disconnectDB } = require('../src/config/db');
const { detectAnomaliesForReading } = require('../src/ai/anomalyDetector');
const SensorReading = require('../src/models/SensorReading');
const SystemSetting = require('../src/models/SystemSetting');

describe('Thermal Anomaly Detection Engine', () => {
  beforeAll(async () => {
    await connectDB();
    // Seed system settings
    await SystemSetting.findOneAndUpdate(
      { key: 'default_config' },
      {
        warningTempThreshold: 32.0,
        criticalTempThreshold: 38.0,
        maxAllowedDelta: 4.5,
        anomalySensitivity: 2.2
      },
      { upsert: true }
    );

    // Seed baseline readings for test server
    const now = Date.now();
    const baselineReadings = [];
    for (let i = 10; i >= 1; i--) {
      baselineReadings.push({
        timestamp: new Date(now - i * 60 * 1000),
        dataCenterId: 'DC-EAST-01',
        rackId: 'RACK-A01',
        serverId: 'SRV-TEST-01',
        temperature: 23.5,
        cpuUtilization: 30,
        powerWatts: 190,
        fanSpeed: 45,
        coolingStatus: 'Optimal',
        validationStatus: 'VALID'
      });
    }
    await SensorReading.insertMany(baselineReadings);
  });

  afterAll(async () => {
    await SensorReading.deleteMany({ serverId: 'SRV-TEST-01' });
    await disconnectDB();
  });

  test('should detect CRITICAL_HOTSPOT when temperature breaches critical ceiling (>=38°C)', async () => {
    const reading = {
      timestamp: new Date(),
      dataCenterId: 'DC-EAST-01',
      rackId: 'RACK-A01',
      serverId: 'SRV-TEST-01',
      temperature: 39.5,
      cpuUtilization: 85,
      powerWatts: 420,
      fanSpeed: 95,
      coolingStatus: 'Critical',
      validationStatus: 'VALID'
    };

    const anomaly = await detectAnomaliesForReading(reading);
    expect(anomaly).not.toBeNull();
    expect(anomaly.anomalyType).toBe('CRITICAL_HOTSPOT');
    expect(anomaly.riskCategory).toBe('Critical');
    expect(anomaly.observedTemperature).toBe(39.5);
    expect(anomaly.evidence).toBeDefined();
    expect(anomaly.recommendedInvestigation).toContain('Immediate thermal inspection');
  });

  test('should detect SUDDEN_SPIKE when rate of rise exceeds maxAllowedDelta', async () => {
    const reading = {
      timestamp: new Date(),
      dataCenterId: 'DC-EAST-01',
      rackId: 'RACK-A01',
      serverId: 'SRV-TEST-01',
      temperature: 29.5, // +6.0°C rise over 23.5°C baseline
      cpuUtilization: 90,
      powerWatts: 410,
      fanSpeed: 70,
      coolingStatus: 'Active',
      validationStatus: 'VALID'
    };

    const anomaly = await detectAnomaliesForReading(reading);
    expect(anomaly).not.toBeNull();
    expect(anomaly.anomalyType).toBe('SUDDEN_SPIKE');
    expect(anomaly.riskCategory).toBe('Medium Risk');
  });

  test('should return null for normal sensor reading close to baseline', async () => {
    const reading = {
      timestamp: new Date(),
      dataCenterId: 'DC-EAST-01',
      rackId: 'RACK-A01',
      serverId: 'SRV-TEST-01',
      temperature: 23.8,
      cpuUtilization: 32,
      powerWatts: 195,
      fanSpeed: 46,
      coolingStatus: 'Optimal',
      validationStatus: 'VALID'
    };

    const anomaly = await detectAnomaliesForReading(reading);
    expect(anomaly).toBeNull();
  });
});
