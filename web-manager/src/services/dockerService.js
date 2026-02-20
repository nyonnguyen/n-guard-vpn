const Docker = require('dockerode');
const { exec } = require('child_process');
const { promisify } = require('util');
const config = require('../utils/config');
const { sleep } = require('../utils/helpers');

const execAsync = promisify(exec);

class DockerService {
  constructor() {
    this.docker = new Docker({ socketPath: config.docker.socketPath });
    this.projectRoot = config.paths.projectRoot;
  }

  /**
   * Get list of N-Guard containers
   * @returns {Promise<Array>}
   */
  async getNGuardContainers() {
    try {
      const containers = await this.docker.listContainers({ all: true });

      return containers.filter(container =>
        container.Names.some(name => name.includes('n-guard-'))
      );
    } catch (error) {
      throw new Error(`Failed to list containers: ${error.message}`);
    }
  }

  /**
   * Check if all containers are healthy
   * @returns {Promise<{healthy: boolean, containers: Array}>}
   */
  async checkHealth() {
    const containers = await this.getNGuardContainers();

    const containerStatus = containers.map(container => ({
      name: container.Names[0].replace('/', ''),
      status: container.State,
      health: container.Status,
      running: container.State === 'running'
    }));

    const allHealthy = containerStatus.every(c => c.running);

    return {
      healthy: allHealthy,
      containers: containerStatus
    };
  }

  /**
   * Pull latest images using docker-compose
   * @returns {Promise<void>}
   */
  async pullImages() {
    try {
      const { stdout, stderr } = await execAsync(
        `cd ${this.projectRoot} && docker-compose pull`,
        { timeout: 300000 } // 5 minutes
      );

      return { stdout, stderr };
    } catch (error) {
      throw new Error(`Failed to pull images: ${error.message}`);
    }
  }

  /**
   * Restart containers using docker-compose
   * @returns {Promise<void>}
   */
  async restartContainers() {
    try {
      // Stop containers gracefully
      await execAsync(
        `cd ${this.projectRoot} && docker-compose down`,
        { timeout: 60000 }
      );

      // Wait a bit
      await sleep(2000);

      // Start containers
      const { stdout, stderr } = await execAsync(
        `cd ${this.projectRoot} && docker-compose up -d`,
        { timeout: 120000 }
      );

      return { stdout, stderr };
    } catch (error) {
      throw new Error(`Failed to restart containers: ${error.message}`);
    }
  }

  /**
   * Verify all services are running
   * @param {number} maxRetries - Maximum number of retry attempts
   * @param {number} retryDelay - Delay between retries in ms
   * @returns {Promise<boolean>}
   */
  async verifyServices(maxRetries = 5, retryDelay = 3000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const { healthy, containers } = await this.checkHealth();

        if (healthy) {
          return true;
        }

        // If not all healthy, wait and retry
        if (i < maxRetries - 1) {
          console.log(`Waiting for services to become healthy (attempt ${i + 1}/${maxRetries})...`);
          await sleep(retryDelay);
        }
      } catch (error) {
        console.error(`Health check failed: ${error.message}`);
        if (i < maxRetries - 1) {
          await sleep(retryDelay);
        }
      }
    }

    return false;
  }

  /**
   * Test DNS resolution through AdGuard
   * @returns {Promise<boolean>}
   */
  async testDNS() {
    try {
      // Test DNS using the AdGuard container
      const { stdout } = await execAsync(
        `docker exec n-guard-adguard nslookup google.com 127.0.0.1`,
        { timeout: 10000 }
      );

      return stdout.includes('Address:');
    } catch (error) {
      console.error(`DNS test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Test WireGuard status
   * @returns {Promise<boolean>}
   */
  async testWireGuard() {
    try {
      const { stdout } = await execAsync(
        `docker exec n-guard-wireguard wg show`,
        { timeout: 10000 }
      );

      // If wg show returns output without error, WireGuard is working
      return true;
    } catch (error) {
      console.error(`WireGuard test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get container logs
   * @param {string} containerName - Name of container
   * @param {number} lines - Number of lines to retrieve
   * @returns {Promise<string>}
   */
  async getLogs(containerName, lines = 50) {
    try {
      const container = this.docker.getContainer(containerName);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines
      });

      return logs.toString();
    } catch (error) {
      throw new Error(`Failed to get logs for ${containerName}: ${error.message}`);
    }
  }
}

module.exports = new DockerService();
