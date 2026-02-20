const express = require('express');
const router = express.Router();

const versionController = require('../controllers/versionController');
const updateController = require('../controllers/updateController');
const systemController = require('../controllers/systemController');
const vpnController = require('../controllers/vpnController');
const { updateLimiter, apiLimiter } = require('../middleware/rateLimiter');
const { login, logout, checkAuthStatus, requireVpnAuth } = require('../middleware/vpnAuth');

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

// VPN Authentication endpoints
router.post('/vpn/auth/login', login);
router.post('/vpn/auth/logout', logout);
router.get('/vpn/auth/status', checkAuthStatus);

// VPN endpoints (public - status and list)
router.get('/vpn/status', vpnController.getStatus.bind(vpnController));
router.get('/vpn/peers', vpnController.listPeers.bind(vpnController));
router.get('/vpn/peers/:id', vpnController.getPeer.bind(vpnController));

// VPN endpoints (protected - requires auth for sensitive data)
router.get('/vpn/peers/:id/qr', requireVpnAuth, vpnController.getQRCode.bind(vpnController));
router.get('/vpn/peers/:id/config', requireVpnAuth, vpnController.downloadConfig.bind(vpnController));
router.get('/vpn/peers/:id/config-content', requireVpnAuth, vpnController.getConfigContent.bind(vpnController));

// VPN management endpoints (protected)
router.post('/vpn/peers', requireVpnAuth, vpnController.createPeer.bind(vpnController));
router.delete('/vpn/peers/:id', requireVpnAuth, vpnController.deletePeer.bind(vpnController));

module.exports = router;
