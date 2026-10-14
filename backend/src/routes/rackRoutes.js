const express = require('express');
const router = express.Router();
const rackController = require('../controllers/rackController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, rackController.getAllRacks);
router.get('/servers/all', authenticateToken, rackController.getAllServers);
router.get('/:id', authenticateToken, rackController.getRackById);

module.exports = router;
