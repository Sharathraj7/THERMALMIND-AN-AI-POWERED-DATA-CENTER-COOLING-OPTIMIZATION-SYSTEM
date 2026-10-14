const express = require('express');
const router = express.Router();
const energyController = require('../controllers/energyController');
const { authenticateToken } = require('../middleware/auth');

router.get('/summary', authenticateToken, energyController.getEnergySummary);
router.get('/history', authenticateToken, energyController.getEnergyHistory);

module.exports = router;
