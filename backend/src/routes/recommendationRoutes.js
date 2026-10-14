const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, recommendationController.getRecommendations);
router.patch('/:id/status', authenticateToken, recommendationController.updateRecommendationStatus);

module.exports = router;
