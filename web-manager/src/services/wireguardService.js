const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const config = require('../utils/config');

const execAsync = promisify(exec);

class WireGuardService {
  constructor() {
    this.containerName = 'n-guard-wireguard';
    this.configPath = '/opt/n-guard-vpn/wireguard/config';
  }

  /**
   * Get WireGuard server status
   * @returns {Promise<Object>}
   */
  async getStatus() {
    try {
      const { stdout } = await execAsync(
        `docker exec ${this.containerName} wg show`,
        { timeout: 10000 }
      );

      const status = this.parseWgShow(stdout);
      status.running = true;

      return status;
    } catch (error) {
      return {
        running: false,
        error: error.message
      };
    }
  }

  /**
   * Parse wg show output
   * @param {string} output
   * @returns {Object}
   */
  parseWgShow(output) {
    const lines = output.trim().split('\n');
    const result = {
      interface: null,
      publicKey: null,
      listeningPort: null,
      peers: []
    };

    let currentPeer = null;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('interface:')) {
        result.interface = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('public key:')) {
        if (currentPeer) {
          currentPeer.publicKey = trimmed.split(':')[1].trim();
        } else {
          result.publicKey = trimmed.split(':')[1].trim();
        }
      } else if (trimmed.startsWith('listening port:')) {
        result.listeningPort = parseInt(trimmed.split(':')[1].trim());
      } else if (trimmed.startsWith('peer:')) {
        if (currentPeer) {
          result.peers.push(currentPeer);
        }
        currentPeer = {
          publicKey: trimmed.split(':')[1].trim()
        };
      } else if (trimmed.startsWith('endpoint:') && currentPeer) {
        currentPeer.endpoint = trimmed.split('endpoint:')[1].trim();
      } else if (trimmed.startsWith('allowed ips:') && currentPeer) {
        currentPeer.allowedIps = trimmed.split(':')[1].trim();
      } else if (trimmed.startsWith('latest handshake:') && currentPeer) {
        currentPeer.latestHandshake = trimmed.split('latest handshake:')[1].trim();
      } else if (trimmed.startsWith('transfer:') && currentPeer) {
        currentPeer.transfer = trimmed.split('transfer:')[1].trim();
      }
    }

    if (currentPeer) {
      result.peers.push(currentPeer);
    }

    return result;
  }

  /**
   * List all configured peers
   * @returns {Promise<Array>}
   */
  async listPeers() {
    try {
      const dirs = await fs.readdir(this.configPath);
      const peerDirs = dirs.filter(d => d.startsWith('peer'));

      const peers = [];

      for (const dir of peerDirs) {
        const peerPath = path.join(this.configPath, dir);
        const stat = await fs.stat(peerPath);

        if (stat.isDirectory()) {
          const peerNum = dir.replace('peer', '');
          const peer = await this.getPeer(peerNum);
          if (peer) {
            peers.push(peer);
          }
        }
      }

      // Sort by peer number
      peers.sort((a, b) => a.id - b.id);

      return peers;
    } catch (error) {
      throw new Error(`Failed to list peers: ${error.message}`);
    }
  }

  /**
   * Get specific peer details
   * @param {string|number} peerId
   * @returns {Promise<Object|null>}
   */
  async getPeer(peerId) {
    try {
      const peerDir = path.join(this.configPath, `peer${peerId}`);
      const confFile = path.join(peerDir, `peer${peerId}.conf`);
      const qrFile = path.join(peerDir, `peer${peerId}.png`);

      // Check if config file exists
      try {
        await fs.access(confFile);
      } catch {
        return null;
      }

      const configContent = await fs.readFile(confFile, 'utf8');
      const parsed = this.parseConfig(configContent);

      // Check if QR code exists
      let hasQR = false;
      try {
        await fs.access(qrFile);
        hasQR = true;
      } catch {
        // QR file doesn't exist
      }

      return {
        id: parseInt(peerId),
        name: `peer${peerId}`,
        ...parsed,
        hasQR,
        configPath: confFile,
        qrPath: hasQR ? qrFile : null
      };
    } catch (error) {
      throw new Error(`Failed to get peer ${peerId}: ${error.message}`);
    }
  }

  /**
   * Parse WireGuard config file
   * @param {string} content
   * @returns {Object}
   */
  parseConfig(content) {
    const result = {
      address: null,
      privateKey: null,
      dns: null,
      publicKey: null,
      presharedKey: null,
      endpoint: null,
      allowedIPs: null
    };

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();

      switch (key.trim().toLowerCase()) {
        case 'address':
          result.address = value;
          break;
        case 'privatekey':
          result.privateKey = value;
          break;
        case 'dns':
          result.dns = value;
          break;
        case 'publickey':
          result.publicKey = value;
          break;
        case 'presharedkey':
          result.presharedKey = value;
          break;
        case 'endpoint':
          result.endpoint = value;
          break;
        case 'allowedips':
          result.allowedIPs = value;
          break;
      }
    }

    return result;
  }

  /**
   * Get QR code for peer
   * @param {string|number} peerId
   * @returns {Promise<Buffer>}
   */
  async getQRCode(peerId) {
    const qrFile = path.join(this.configPath, `peer${peerId}`, `peer${peerId}.png`);

    try {
      const data = await fs.readFile(qrFile);
      return data;
    } catch (error) {
      // Try to generate QR code using docker exec
      try {
        await execAsync(
          `docker exec ${this.containerName} /app/show-peer ${peerId}`,
          { timeout: 10000 }
        );
        // Try reading again
        const data = await fs.readFile(qrFile);
        return data;
      } catch (genError) {
        throw new Error(`QR code not available for peer ${peerId}`);
      }
    }
  }

  /**
   * Get config file content for download
   * @param {string|number} peerId
   * @returns {Promise<string>}
   */
  async getConfig(peerId) {
    const confFile = path.join(this.configPath, `peer${peerId}`, `peer${peerId}.conf`);

    try {
      const content = await fs.readFile(confFile, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Config file not found for peer ${peerId}`);
    }
  }

  /**
   * Create a new peer
   * @param {string} peerName - Optional custom name
   * @returns {Promise<Object>}
   */
  async createPeer(peerName = null) {
    try {
      // Get current peer count
      const peers = await this.listPeers();
      const newPeerNum = peers.length > 0 ? Math.max(...peers.map(p => p.id)) + 1 : 1;

      // Update PEERS environment variable and restart WireGuard
      // The linuxserver/wireguard image handles peer creation through env vars
      const { stdout, stderr } = await execAsync(
        `docker exec ${this.containerName} /bin/bash -c "PEERS=${newPeerNum} /etc/s6-overlay/s6-rc.d/svc-wireguard/run"`,
        { timeout: 30000 }
      );

      // Alternative: Use the container's built-in peer creation
      // This recreates configs which we don't want
      // Instead, we'll modify the approach - use docker-compose to update PEERS

      // For now, we need to update docker-compose and restart
      // This is a bit heavy-handed but safest approach

      // Read current .env
      const envPath = '/opt/n-guard-vpn/.env';
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch {
        envContent = '';
      }

      // Update NUM_PEERS
      if (envContent.includes('NUM_PEERS=')) {
        envContent = envContent.replace(/NUM_PEERS=\d+/, `NUM_PEERS=${newPeerNum}`);
      } else {
        envContent += `\nNUM_PEERS=${newPeerNum}`;
      }

      await fs.writeFile(envPath, envContent);

      // Restart WireGuard container to pick up new peer count
      await execAsync(
        `cd /opt/n-guard-vpn && docker compose up -d wireguard`,
        { timeout: 60000 }
      );

      // Wait for container to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Get the new peer
      const newPeer = await this.getPeer(newPeerNum);

      return newPeer;
    } catch (error) {
      throw new Error(`Failed to create peer: ${error.message}`);
    }
  }

  /**
   * Delete a peer
   * @param {string|number} peerId
   * @returns {Promise<boolean>}
   */
  async deletePeer(peerId) {
    try {
      const peerDir = path.join(this.configPath, `peer${peerId}`);

      // Check if peer exists
      try {
        await fs.access(peerDir);
      } catch {
        throw new Error(`Peer ${peerId} not found`);
      }

      // Remove peer directory
      await fs.rm(peerDir, { recursive: true });

      // Restart WireGuard to apply changes
      await execAsync(
        `docker exec ${this.containerName} wg syncconf wg0 <(wg-quick strip wg0)`,
        { timeout: 10000 }
      ).catch(() => {
        // If syncconf fails, restart container
        return execAsync(
          `docker restart ${this.containerName}`,
          { timeout: 30000 }
        );
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to delete peer ${peerId}: ${error.message}`);
    }
  }

  /**
   * Get server endpoint info
   * @returns {Promise<Object>}
   */
  async getServerInfo() {
    try {
      const envPath = '/opt/n-guard-vpn/.env';
      let endpoint = 'localhost';
      let port = 51820;

      try {
        const envContent = await fs.readFile(envPath, 'utf8');
        const endpointMatch = envContent.match(/PUBLIC_IP_OR_DDNS=(.+)/);
        if (endpointMatch) {
          endpoint = endpointMatch[1].trim();
        }
      } catch {
        // Use default
      }

      return {
        endpoint: `${endpoint}:${port}`,
        publicEndpoint: endpoint,
        port
      };
    } catch (error) {
      throw new Error(`Failed to get server info: ${error.message}`);
    }
  }
}

module.exports = new WireGuardService();
