const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { heavyJobLimiter } = require('../middleware/rateLimiter');

router.get('/forecasts', authenticateToken, aiController.getForecasts);
router.post('/forecast', authenticateToken, aiController.predictCustom);
router.get('/anomalies', authenticateToken, aiController.getAnomalies);
router.post('/analyze', authenticateToken, aiController.runThermalAnalysis);
router.get('/metrics', authenticateToken, aiController.getModelMetrics);
router.post('/train', authenticateToken, requireRole('Administrator'), heavyJobLimiter, aiController.trainModel);
router.get('/risk-assessment', authenticateToken, aiController.getRiskAssessmentEndpoint);

module.exports = router;
