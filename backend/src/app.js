/**
 * ThermalMind Express Application
 * Configures security headers, CORS, rate limiters, routes, and error handling.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');

const { apiLimiter } = require('./middleware/rateLimiter');
const { requestMetricsLogger } = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const rackRoutes = require('./routes/rackRoutes');
const aiRoutes = require('./routes/aiRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const energyRoutes = require('./routes/energyRoutes');
const cloudRoutes = require('./routes/cloudRoutes');
const securityRoutes = require('./routes/securityRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false // Allow local dashboard asset loading
}));

// Cross-Origin Resource Sharing
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging & metrics
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}
app.use(requestMetricsLogger);

const cloudController = require('./controllers/cloudController');

// Global API rate limiting
app.use('/api', apiLimiter);

// Health check endpoint (Public)
app.get('/api/health', cloudController.healthCheck);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/racks', rackRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/settings', settingsRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    service: 'ThermalMind: AI-Powered Data Center Cooling Optimization API',
    status: 'OPERATIONAL',
    version: '1.0.0',
    documentation: '/api/cloud/status'
  });
});

// 404 & Central Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
