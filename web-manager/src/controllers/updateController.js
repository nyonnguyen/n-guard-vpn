const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const githubService = require('../services/githubService');
const dockerService = require('../services/dockerService');
const backupService = require('../services/backupService');
const config = require('../utils/config');
const { verifyChecksum, getFreeDiskSpace, sleep } = require('../utils/helpers');
const { validateVersion } = require('../utils/validators');

const execAsync = promisify(exec);

class UpdateController {
  constructor() {
    this.updateStatus = {
      state: 'idle', // idle, backing_up, downloading, verifying, installing, restarting, verifying_health, success, failed
      progress: 0,
      message: '',
      logs: [],
      backupPath: null,
      startTime: null,
      endTime: null
    };

    // Event listeners for SSE
    this.listeners = [];
  }

  /**
   * Install update
   * POST /api/update/install
   */
  async install(req, res, next) {
    try {
      const { version } = req.body;

      // Validate version
      if (!version || !validateVersion(version)) {
        return res.status(400).json({
          error: 'Invalid version format'
        });
      }

      // Check if update already in progress
      if (this.updateStatus.state !== 'idle' && this.updateStatus.state !== 'success' && this.updateStatus.state !== 'failed') {
        return res.status(409).json({
          error: 'Update already in progress',
          status: this.updateStatus
        });
      }

      // Reset status
      this.updateStatus = {
        state: 'initializing',
        progress: 0,
        message: 'Initializing update...',
        logs: [],
        backupPath: null,
        startTime: new Date().toISOString(),
        endTime: null
      };

      // Start update process in background
      this.runUpdate(version).catch(error => {
        console.error('Update process error:', error);
      });

      res.json({
        status: 'started',
        message: 'Update process initiated',
        version
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run the update process
   * @param {string} version - Target version
   */
  async runUpdate(version) {
    try {
      // Phase 1: Pre-update validation
      this.updateProgress('validating', 5, 'Validating environment...');
      await this.validateEnvironment();

      // Phase 2: Create backup
      this.updateProgress('backing_up', 15, 'Creating backup...');
      const currentVersion = await githubService.getCurrentVersion();
      const backupPath = await backupService.createBackup(currentVersion);
      this.updateStatus.backupPath = backupPath;
      this.addLog(`Backup created: ${backupPath}`);

      // Phase 3: Download release
      this.updateProgress('downloading', 30, `Downloading version ${version}...`);
      const { filePath, checksumPath } = await this.downloadRelease(version);

      // Phase 4: Verify checksum
      this.updateProgress('verifying', 50, 'Verifying download...');
      await this.verifyDownload(filePath, checksumPath);

      // Phase 5: Install files
      this.updateProgress('installing', 60, 'Installing update...');
      await this.installFiles(filePath, version);

      // Phase 6: Update Docker images
      this.updateProgress('updating_images', 70, 'Updating Docker images...');
      await dockerService.pullImages();

      // Phase 7: Restart services
      this.updateProgress('restarting', 80, 'Restarting services...');
      await dockerService.restartContainers();

      // Wait for services to start
      await sleep(5000);

      // Phase 8: Verify health
      this.updateProgress('verifying_health', 90, 'Verifying services...');
      const healthy = await this.verifyHealth();

      if (!healthy) {
        throw new Error('Health verification failed after update');
      }

      // Success!
      this.updateProgress('success', 100, `Successfully updated to version ${version}!`);
      this.updateStatus.endTime = new Date().toISOString();

      // Cleanup old backups
      await backupService.cleanupOldBackups(5);

    } catch (error) {
      console.error('Update failed:', error);
      this.updateProgress('failed', 0, `Update failed: ${error.message}`);
      this.addLog(`ERROR: ${error.message}`);

      // Attempt rollback
      if (this.updateStatus.backupPath) {
        await this.performRollback();
      }
    }
  }

  /**
   * Validate environment before update
   */
  async validateEnvironment() {
    // Check disk space
    const freeSpace = await getFreeDiskSpace('/opt');
    const minSpace = config.update.minFreeSpace;

    if (freeSpace < minSpace) {
      throw new Error(`Insufficient disk space: ${freeSpace}KB free, need ${minSpace}KB`);
    }

    this.addLog(`Disk space check: ${freeSpace}KB available`);

    // Check Docker is accessible
    const { healthy, containers } = await dockerService.checkHealth();
    this.addLog(`Container health check: ${containers.length} containers found`);

    if (!healthy) {
      console.warn('Warning: Not all containers are healthy before update');
    }
  }

  /**
   * Download release from GitHub
   * @param {string} version - Version to download
   * @returns {Promise<{filePath: string, checksumPath: string|null}>}
   */
  async downloadRelease(version) {
    const release = await githubService.getLatestRelease();

    if (release.version !== version) {
      throw new Error(`Version mismatch: requested ${version}, got ${release.version}`);
    }

    const tempDir = config.paths.tempDir;
    const fileName = `n-guard-vpn-v${version}.tar.gz`;
    const filePath = path.join(tempDir, fileName);
    const checksumPath = release.sha256_url ? path.join(tempDir, `${fileName}.sha256`) : null;

    try {
      // Download main file
      this.addLog(`Downloading from: ${release.download_url}`);
      await execAsync(
        `wget -q --show-progress -O ${filePath} ${release.download_url}`,
        { timeout: config.update.downloadTimeout }
      );

      // Download checksum if available
      if (release.sha256_url) {
        this.addLog(`Downloading checksum from: ${release.sha256_url}`);
        await execAsync(
          `wget -q -O ${checksumPath} ${release.sha256_url}`,
          { timeout: 30000 }
        );
      }

      this.addLog(`Download complete: ${filePath}`);

      return { filePath, checksumPath };
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * Verify downloaded file
   * @param {string} filePath - Path to downloaded file
   * @param {string|null} checksumPath - Path to checksum file
   */
  async verifyDownload(filePath, checksumPath) {
    // Verify file exists and is not empty
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    this.addLog(`File size: ${stats.size} bytes`);

    // Verify checksum if available
    if (checksumPath) {
      try {
        const checksumContent = await fs.readFile(checksumPath, 'utf8');
        const expectedChecksum = checksumContent.trim().split(/\s+/)[0];

        this.addLog(`Verifying checksum: ${expectedChecksum}`);

        const isValid = await verifyChecksum(filePath, expectedChecksum);

        if (!isValid) {
          throw new Error('Checksum verification failed');
        }

        this.addLog('Checksum verified successfully');
      } catch (error) {
        throw new Error(`Checksum verification failed: ${error.message}`);
      }
    } else {
      this.addLog('Warning: No checksum available, skipping verification');
    }
  }

  /**
   * Install files from downloaded archive
   * @param {string} filePath - Path to tar.gz file
   * @param {string} version - Target version
   */
  async installFiles(filePath, version) {
    const updateScriptPath = path.join(config.paths.scriptsDir, 'update.sh');

    try {
      // Check if update script exists
      await fs.access(updateScriptPath);

      // Run update script
      this.addLog(`Running update script: ${updateScriptPath}`);
      const { stdout, stderr } = await execAsync(
        `bash ${updateScriptPath} ${version} ${filePath}`,
        { timeout: 180000 } // 3 minutes
      );

      this.addLog(stdout);
      if (stderr) {
        this.addLog(`STDERR: ${stderr}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Script doesn't exist, do manual installation
        this.addLog('Update script not found, performing manual installation...');
        await this.manualInstall(filePath, version);
      } else {
        throw error;
      }
    }
  }

  /**
   * Manual installation (if update.sh doesn't exist)
   * @param {string} filePath - Path to tar.gz file
   * @param {string} version - Target version
   */
  async manualInstall(filePath, version) {
    const extractDir = path.join(config.paths.tempDir, `update-${version}`);

    try {
      // Create extraction directory
      await fs.mkdir(extractDir, { recursive: true });

      // Extract archive
      this.addLog(`Extracting to: ${extractDir}`);
      await execAsync(`tar -xzf ${filePath} -C ${extractDir}`);

      // Copy files (excluding user data)
      this.addLog('Copying files...');
      await execAsync(
        `rsync -av \
          --exclude='wireguard/config/' \
          --exclude='adguard/work/' \
          --exclude='adguard/conf/AdGuardHome.yaml' \
          --exclude='.env' \
          --exclude='backups/' \
          --exclude='web-manager/node_modules' \
          ${extractDir}/ ${config.paths.projectRoot}/`
      );

      // Update VERSION file
      await fs.writeFile(config.paths.versionFile, version);
      this.addLog(`Updated VERSION file to ${version}`);

      // Cleanup
      await execAsync(`rm -rf ${extractDir}`);
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Manual installation failed: ${error.message}`);
    }
  }

  /**
   * Verify health after update
   * @returns {Promise<boolean>}
   */
  async verifyHealth() {
    // Wait for containers to stabilize
    this.addLog('Waiting for services to stabilize...');
    const verified = await dockerService.verifyServices(5, 3000);

    if (!verified) {
      this.addLog('Container health check failed');
      return false;
    }

    this.addLog('All containers are healthy');

    // Test DNS
    this.addLog('Testing DNS resolution...');
    const dnsWorks = await dockerService.testDNS();
    if (!dnsWorks) {
      this.addLog('DNS test failed');
      return false;
    }
    this.addLog('DNS test passed');

    // Test WireGuard
    this.addLog('Testing WireGuard...');
    const wgWorks = await dockerService.testWireGuard();
    if (!wgWorks) {
      this.addLog('WireGuard test failed');
      return false;
    }
    this.addLog('WireGuard test passed');

    return true;
  }

  /**
   * Perform rollback to backup
   */
  async performRollback() {
    try {
      this.updateProgress('rolling_back', 0, 'Rolling back to previous version...');
      this.addLog(`Starting rollback to: ${this.updateStatus.backupPath}`);

      await backupService.restoreBackup(this.updateStatus.backupPath);

      this.addLog('Rollback complete');
      this.updateProgress('failed', 0, 'Update failed and was rolled back');
    } catch (error) {
      this.addLog(`Rollback failed: ${error.message}`);
      this.updateProgress('failed', 0, 'Update and rollback both failed - manual intervention required');
    }
  }

  /**
   * Update progress and notify listeners
   */
  updateProgress(state, progress, message) {
    this.updateStatus.state = state;
    this.updateStatus.progress = progress;
    this.updateStatus.message = message;

    // Notify SSE listeners
    this.notifyListeners();
  }

  /**
   * Add log entry
   */
  addLog(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    this.updateStatus.logs.push(logEntry);
    console.log(logEntry);
  }

  /**
   * Get current update status
   * GET /api/update/status
   */
  getStatus(req, res) {
    res.json(this.updateStatus);
  }

  /**
   * SSE endpoint for real-time updates
   * GET /api/update/stream
   */
  streamStatus(req, res) {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add this client to listeners
    const listenerId = Date.now();
    this.listeners.push({ id: listenerId, res });

    // Send current status immediately
    res.write(`data: ${JSON.stringify(this.updateStatus)}\n\n`);

    // Remove listener on disconnect
    req.on('close', () => {
      this.listeners = this.listeners.filter(l => l.id !== listenerId);
    });
  }

  /**
   * Notify all SSE listeners
   */
  notifyListeners() {
    const data = JSON.stringify(this.updateStatus);
    this.listeners.forEach(listener => {
      try {
        listener.res.write(`data: ${data}\n\n`);
      } catch (error) {
        console.error('Failed to send SSE update:', error);
      }
    });
  }

  /**
   * Rollback to previous version
   * POST /api/update/rollback
   */
  async rollback(req, res, next) {
    try {
      const { backupPath } = req.body;

      let pathToRestore = backupPath;

      if (!pathToRestore) {
        // Use most recent backup
        pathToRestore = await backupService.getMostRecentBackup();
      }

      if (!pathToRestore) {
        return res.status(404).json({
          error: 'No backup found'
        });
      }

      // Start rollback in background
      this.performRollback();

      res.json({
        status: 'started',
        message: 'Rollback initiated',
        backup: pathToRestore
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UpdateController();
