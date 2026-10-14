/**
 * ThermalMind Sensor Data Validator
 * Validates sensor telemetry against physical plausibility bounds, data types, and integrity constraints.
 */

const ALLOWED_WORKLOADS = ['Idle', 'Low', 'Medium', 'High', 'Critical'];
const ALLOWED_COOLING_STATUS = ['Optimal', 'Active', 'Warning', 'Degraded', 'Critical', 'Failed'];

const PHYSICAL_BOUNDS = {
  temperature: { min: -10.0, max: 100.0, unit: '°C' },
  humidity: { min: 0.0, max: 100.0, unit: '%' },
  cpuUtilization: { min: 0.0, max: 100.0, unit: '%' },
  powerWatts: { min: 0.0, max: 3000.0, unit: 'W' },
  fanSpeed: { min: 0.0, max: 100.0, unit: '%' }
};

/**
 * Validates a single sensor record.
 * Returns { isValid: boolean, status: 'VALID'|'INVALID'|'SUSPECT', reason: string|null, sanitized: object|null }
 */
function validateSensorRecord(rawRecord) {
  const errors = [];
  const warnings = [];

  // 1. Mandatory structural fields
  if (!rawRecord.rackId || typeof rawRecord.rackId !== 'string' || !rawRecord.rackId.trim()) {
    errors.push('Missing or empty rackId');
  }
  if (!rawRecord.serverId || typeof rawRecord.serverId !== 'string' || !rawRecord.serverId.trim()) {
    errors.push('Missing or empty serverId');
  }

  // 2. Timestamp validation
  let parsedTimestamp = null;
  if (!rawRecord.timestamp) {
    errors.push('Missing timestamp');
  } else {
    parsedTimestamp = new Date(rawRecord.timestamp);
    if (isNaN(parsedTimestamp.getTime())) {
      errors.push(`Invalid timestamp format: "${rawRecord.timestamp}"`);
    } else {
      const now = new Date();
      // Allow up to 10 minutes clock drift in the future
      if (parsedTimestamp.getTime() > now.getTime() + 10 * 60 * 1000) {
        errors.push(`Timestamp is in the future (${parsedTimestamp.toISOString()})`);
      }
      if (parsedTimestamp.getFullYear() < 2020) {
        errors.push(`Timestamp is implausibly in the past (${parsedTimestamp.toISOString()})`);
      }
    }
  }

  // 3. Numeric bounds validation
  const numFields = [
    { key: 'temperature', required: true },
    { key: 'cpuUtilization', required: true },
    { key: 'powerWatts', required: true },
    { key: 'humidity', required: false, default: 45.0 },
    { key: 'fanSpeed', required: false, default: 50.0 }
  ];

  const sanitized = {
    timestamp: parsedTimestamp,
    dataCenterId: (rawRecord.dataCenterId || 'DC-EAST-01').trim(),
    rackId: (rawRecord.rackId || '').trim(),
    serverId: (rawRecord.serverId || '').trim(),
    dataSource: rawRecord.dataSource || 'csv_upload'
  };

  for (const field of numFields) {
    const rawVal = rawRecord[field.key];
    if (rawVal === undefined || rawVal === null || rawVal === '') {
      if (field.required) {
        errors.push(`Missing mandatory numeric field: "${field.key}"`);
      } else {
        sanitized[field.key] = field.default;
      }
      continue;
    }

    const num = parseFloat(rawVal);
    if (isNaN(num)) {
      errors.push(`Field "${field.key}" must be a valid number, received: "${rawVal}"`);
      continue;
    }

    const bounds = PHYSICAL_BOUNDS[field.key];
    if (bounds && (num < bounds.min || num > bounds.max)) {
      errors.push(
        `Field "${field.key}" value ${num}${bounds.unit} is outside plausible physical bounds [${bounds.min}${bounds.unit} - ${bounds.max}${bounds.unit}]`
      );
      continue;
    }

    sanitized[field.key] = Math.round(num * 10) / 10;
  }

  // 4. Categorical fields validation
  sanitized.workload = rawRecord.workload;
  if (!sanitized.workload || !ALLOWED_WORKLOADS.includes(sanitized.workload)) {
    // Derive from cpu if valid
    if (sanitized.cpuUtilization !== undefined) {
      if (sanitized.cpuUtilization < 20) sanitized.workload = 'Idle';
      else if (sanitized.cpuUtilization < 50) sanitized.workload = 'Low';
      else if (sanitized.cpuUtilization < 75) sanitized.workload = 'Medium';
      else if (sanitized.cpuUtilization < 90) sanitized.workload = 'High';
      else sanitized.workload = 'Critical';
    } else {
      sanitized.workload = 'Low';
    }
  }

  sanitized.coolingStatus = rawRecord.coolingStatus;
  if (!sanitized.coolingStatus || !ALLOWED_COOLING_STATUS.includes(sanitized.coolingStatus)) {
    sanitized.coolingStatus = 'Optimal';
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      status: 'INVALID',
      reason: errors.join('; '),
      sanitized: null
    };
  }

  // Check for suspect physical anomalies (e.g. CPU 100% but 0W power, or 80°C temp with 0% CPU)
  if (sanitized.cpuUtilization > 85 && sanitized.powerWatts < 80) {
    warnings.push('Power consumption abnormally low for high CPU utilization (possible metering error)');
  }

  return {
    isValid: true,
    status: warnings.length > 0 ? 'SUSPECT' : 'VALID',
    reason: warnings.length > 0 ? warnings.join('; ') : null,
    sanitized
  };
}

module.exports = {
  validateSensorRecord,
  PHYSICAL_BOUNDS,
  ALLOWED_WORKLOADS,
  ALLOWED_COOLING_STATUS
};
