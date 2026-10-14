/**
 * Data Engineering & Sensor Validation Unit Tests
 */

const { validateSensorRecord } = require('../src/data-engineering/validator');

describe('Sensor Data Engineering & Validation', () => {
  test('should validate and sanitize normal sensor reading', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      dataCenterId: 'DC-EAST-01',
      rackId: 'RACK-A01',
      serverId: 'SRV-A01-01',
      temperature: 24.5,
      humidity: 48.0,
      cpuUtilization: 45.0,
      workload: 'Low',
      powerWatts: 240,
      coolingStatus: 'Optimal',
      fanSpeed: 52
    };

    const result = validateSensorRecord(raw);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VALID');
    expect(result.sanitized.temperature).toBe(24.5);
    expect(result.sanitized.workload).toBe('Low');
  });

  test('should reject physically implausible temperatures (>100°C)', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      rackId: 'RACK-A01',
      serverId: 'SRV-A01-01',
      temperature: 145.0,
      cpuUtilization: 50,
      powerWatts: 250
    };

    const result = validateSensorRecord(raw);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('outside plausible physical bounds');
  });

  test('should reject physically implausible negative temperatures (<-10°C)', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      rackId: 'RACK-A01',
      serverId: 'SRV-A01-01',
      temperature: -35.0,
      cpuUtilization: 10,
      powerWatts: 150
    };

    const result = validateSensorRecord(raw);
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('INVALID');
    expect(result.reason).toContain('outside plausible physical bounds');
  });

  test('should reject missing mandatory fields (missing temperature)', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      rackId: 'RACK-A01',
      serverId: 'SRV-A01-01',
      cpuUtilization: 50,
      powerWatts: 200
    };

    const result = validateSensorRecord(raw);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Missing mandatory numeric field: "temperature"');
  });

  test('should reject invalid timestamp formats', () => {
    const raw = {
      timestamp: 'not-a-valid-timestamp',
      rackId: 'RACK-A01',
      serverId: 'SRV-A01-01',
      temperature: 24.0,
      cpuUtilization: 30,
      powerWatts: 200
    };

    const result = validateSensorRecord(raw);
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain('Invalid timestamp format');
  });

  test('should flag suspect readings with high CPU and zero power consumption', () => {
    const raw = {
      timestamp: new Date().toISOString(),
      rackId: 'RACK-A01',
      serverId: 'SRV-A01-01',
      temperature: 28.0,
      cpuUtilization: 95.0,
      powerWatts: 40.0 // Physically implausible for 95% CPU on enterprise server
    };

    const result = validateSensorRecord(raw);
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('SUSPECT');
    expect(result.reason).toContain('Power consumption abnormally low');
  });
});
