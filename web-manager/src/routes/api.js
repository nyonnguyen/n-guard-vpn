const express = require('express');
const router = express.Router();

const versionController = require('../controllers/versionController');
const updateController = require('../controllers/updateController');
const systemController = require('../controllers/systemController');
const { updateLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Apply general API rate limiting
router.use(apiLimiter);

// Health check (no rate limit)
router.get('/health', systemController.health);

// Version endpoints
router.get('/version/current', versionController.getCurrent);
router.get('/version/latest', updateLimiter, versionController.getLatest);
router.get('/version/check', updateLimiter, versionController.checkForUpdate);

// Update endpoints
router.post('/update/install', updateLimiter, updateController.install.bind(updateController));
router.post('/update/rollback', updateLimiter, updateController.rollback.bind(updateController));
router.get('/update/status', updateController.getStatus.bind(updateController));
router.get('/update/stream', updateController.streamStatus.bind(updateController));

// System endpoints
router.get('/system/status', systemController.getStatus);
router.get('/system/backups', systemController.getBackups);
router.get('/system/logs/:container', systemController.getLogs);

// About endpoint
router.get('/about', systemController.getAbout);

module.exports = router;
