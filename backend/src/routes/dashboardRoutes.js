const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

router.get('/summary', authenticateToken, dashboardController.getDashboardSummary);
router.get('/trends', authenticateToken, dashboardController.getDashboardTrends);

module.exports = router;
