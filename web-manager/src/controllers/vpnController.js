const wireguardService = require('../services/wireguardService');

class VPNController {
  /**
   * Get WireGuard server status
   * GET /api/vpn/status
   */
  async getStatus(req, res, next) {
    try {
      const [status, serverInfo] = await Promise.all([
        wireguardService.getStatus(),
        wireguardService.getServerInfo()
      ]);

      res.json({
        ...status,
        server: serverInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all configured peers
   * GET /api/vpn/peers
   */
  async listPeers(req, res, next) {
    try {
      const peers = await wireguardService.listPeers();

      res.json({
        count: peers.length,
        peers: peers.map(p => ({
          id: p.id,
          name: p.name,
          address: p.address,
          dns: p.dns,
          hasQR: p.hasQR,
          endpoint: p.endpoint
        })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific peer details
   * GET /api/vpn/peers/:id
   */
  async getPeer(req, res, next) {
    try {
      const { id } = req.params;
      const peer = await wireguardService.getPeer(id);

      if (!peer) {
        return res.status(404).json({
          error: 'Peer not found',
          peerId: id
        });
      }

      res.json({
        peer: {
          id: peer.id,
          name: peer.name,
          address: peer.address,
          dns: peer.dns,
          endpoint: peer.endpoint,
          allowedIPs: peer.allowedIPs,
          hasQR: peer.hasQR
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get QR code image for peer (requires auth)
   * GET /api/vpn/peers/:id/qr
   */
  async getQRCode(req, res, next) {
    try {
      const { id } = req.params;
      const qrData = await wireguardService.getQRCode(id);

      res.set('Content-Type', 'image/png');
      res.set('Content-Disposition', `inline; filename="peer${id}-qr.png"`);
      res.send(qrData);
    } catch (error) {
      if (error.message.includes('not available')) {
        return res.status(404).json({
          error: 'QR code not available',
          peerId: id
        });
      }
      next(error);
    }
  }

  /**
   * Download config file for peer (requires auth)
   * GET /api/vpn/peers/:id/config
   */
  async downloadConfig(req, res, next) {
    try {
      const { id } = req.params;
      const config = await wireguardService.getConfig(id);

      res.set('Content-Type', 'text/plain');
      res.set('Content-Disposition', `attachment; filename="peer${id}.conf"`);
      res.send(config);
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Config not found',
          peerId: id
        });
      }
      next(error);
    }
  }

  /**
   * Get config content for peer (requires auth) - for clipboard copy
   * GET /api/vpn/peers/:id/config-content
   */
  async getConfigContent(req, res, next) {
    try {
      const { id } = req.params;
      const config = await wireguardService.getConfig(id);

      res.json({
        peerId: id,
        config: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Config not found',
          peerId: id
        });
      }
      next(error);
    }
  }

  /**
   * Create a new peer
   * POST /api/vpn/peers
   */
  async createPeer(req, res, next) {
    try {
      const { name } = req.body || {};
      const newPeer = await wireguardService.createPeer(name);

      res.status(201).json({
        success: true,
        message: 'Peer created successfully',
        peer: {
          id: newPeer.id,
          name: newPeer.name,
          address: newPeer.address,
          dns: newPeer.dns,
          hasQR: newPeer.hasQR
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a peer
   * DELETE /api/vpn/peers/:id
   */
  async deletePeer(req, res, next) {
    try {
      const { id } = req.params;

      // Prevent deleting peer1 (primary peer)
      if (id === '1') {
        return res.status(400).json({
          error: 'Cannot delete primary peer (peer1)',
          peerId: id
        });
      }

      await wireguardService.deletePeer(id);

      res.json({
        success: true,
        message: `Peer ${id} deleted successfully`,
        peerId: id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Peer not found',
          peerId: req.params.id
        });
      }
      next(error);
    }
  }
}

module.exports = new VPNController();
