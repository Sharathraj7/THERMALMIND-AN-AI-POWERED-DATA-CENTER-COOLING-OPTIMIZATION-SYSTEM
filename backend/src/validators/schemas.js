/**
 * ThermalMind Request Validation Schemas
 * Uses Joi for strict type, format, and boundary validation on incoming API requests.
 */

const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  })
});

const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('Administrator', 'Operator').default('Operator')
});

const updateSettingsSchema = Joi.object({
  warningTempThreshold: Joi.number().min(20).max(45),
  criticalTempThreshold: Joi.number().min(30).max(60),
  maxAllowedDelta: Joi.number().min(1).max(15),
  anomalySensitivity: Joi.number().min(1.0).max(5.0),
  autoRecommendation: Joi.boolean(),
  simulatorIntervalMs: Joi.number().min(1000).max(60000),
  cloudSyncEnabled: Joi.boolean()
});

const updateRecommendationSchema = Joi.object({
  status: Joi.string().valid('Acknowledged', 'Resolved').required(),
  resolutionNotes: Joi.string().max(500).allow('', null)
});

const simulatorControlSchema = Joi.object({
  action: Joi.string().valid('start', 'stop', 'step', 'set_scenario').required(),
  scenario: Joi.string().valid('NORMAL', 'GRADUAL_RISE', 'SUDDEN_SPIKE', 'HIGH_LOAD', 'COOLING_DEGRADATION', 'SENSOR_FAULT'),
  intervalMs: Joi.number().min(1000).max(60000)
});

const forecastRequestSchema = Joi.object({
  rackId: Joi.string(),
  serverId: Joi.string(),
  currentTemp: Joi.number().min(-10).max(100).required(),
  cpuUtilization: Joi.number().min(0).max(100).required(),
  powerWatts: Joi.number().min(0).max(3000).required(),
  fanSpeed: Joi.number().min(0).max(100).default(50),
  humidity: Joi.number().min(0).max(100).default(45),
  tempTrend: Joi.number().default(0)
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateSettingsSchema,
  updateRecommendationSchema,
  simulatorControlSchema,
  forecastRequestSchema
};
