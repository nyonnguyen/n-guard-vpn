const dockerService = require('../services/dockerService');
const backupService = require('../services/backupService');
const githubService = require('../services/githubService');
const { getFreeDiskSpace, formatBytes } = require('../utils/helpers');
const config = require('../utils/config');

class SystemController {
  /**
   * Health check endpoint
   * GET /api/health
   */
  async health(req, res) {
    res.json({
      status: 'healthy',
      service: 'n-guard-manager',
      version: await githubService.getCurrentVersion().catch(() => 'unknown'),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get system status
   * GET /api/system/status
   */
  async getStatus(req, res, next) {
    try {
      const [containerHealth, freeSpace, backups, currentVersion] = await Promise.all([
        dockerService.checkHealth(),
        getFreeDiskSpace('/opt'),
        backupService.listBackups(),
        githubService.getCurrentVersion()
      ]);

      res.json({
        version: currentVersion,
        containers: {
          healthy: containerHealth.healthy,
          details: containerHealth.containers
        },
        system: {
          free_disk_space: formatBytes(freeSpace * 1024),
          free_disk_space_kb: freeSpace
        },
        backups: {
          count: backups.length,
          latest: backups.length > 0 ? backups[0].name : null,
          total_size: formatBytes(backups.reduce((sum, b) => sum + b.size, 0))
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get about information
   * GET /api/about
   */
  async getAbout(req, res, next) {
    try {
      const currentVersion = await githubService.getCurrentVersion();

      res.json({
        name: 'N-Guard VPN',
        description: 'Complete Ad-Blocking VPN Solution for Raspberry Pi',
        version: currentVersion,
        status: 'Beta',
        author: {
          name: 'Nyon Nguyen',
          github: 'nyonnguyen',
          github_url: 'https://github.com/nyonnguyen'
        },
        repository: {
          name: config.github.repo,
          url: `https://github.com/${config.github.repo}`,
          issues_url: `https://github.com/${config.github.repo}/issues`,
          docs_url: `https://github.com/${config.github.repo}/tree/main/docs`
        },
        license: {
          type: 'MIT',
          url: `https://github.com/${config.github.repo}/blob/main/LICENSE`
        },
        support: {
          kofi_url: 'https://ko-fi.com/nyonnguyen',
          github_sponsor: 'https://github.com/sponsors/nyonnguyen'
        },
        components: [
          {
            name: 'WireGuard',
            description: 'Fast and modern VPN protocol',
            url: 'https://www.wireguard.com/'
          },
          {
            name: 'AdGuard Home',
            description: 'Network-wide ad and tracker blocking',
            url: 'https://adguard.com/en/adguard-home/overview.html'
          },
          {
            name: 'Unbound',
            description: 'Validating, recursive DNS resolver',
            url: 'https://www.nlnetlabs.nl/projects/unbound/'
          }
        ],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get container logs
   * GET /api/system/logs/:container
   */
  async getLogs(req, res, next) {
    try {
      const { container } = req.params;
      const lines = parseInt(req.query.lines) || 50;

      const logs = await dockerService.getLogs(container, lines);

      res.json({
        container,
        lines,
        logs,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of backups
   * GET /api/system/backups
   */
  async getBackups(req, res, next) {
    try {
      const backups = await backupService.listBackups();

      res.json({
        count: backups.length,
        backups: backups.map(b => ({
          name: b.name,
          size: formatBytes(b.size),
          size_bytes: b.size,
          created: b.created
        })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SystemController();
