const githubService = require('../services/githubService');

class VersionController {
  /**
   * Get current installed version
   * GET /api/version/current
   */
  async getCurrent(req, res, next) {
    try {
      const version = await githubService.getCurrentVersion();

      res.json({
        version,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get latest version from GitHub
   * GET /api/version/latest
   */
  async getLatest(req, res, next) {
    try {
      const release = await githubService.getLatestRelease();

      res.json({
        version: release.version,
        release_date: release.release_date,
        release_notes: release.release_notes,
        prerelease: release.prerelease,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if update is available
   * GET /api/version/check
   */
  async checkForUpdate(req, res, next) {
    try {
      const comparison = await githubService.compareVersions();

      res.json({
        current_version: comparison.current_version,
        latest_version: comparison.latest_version,
        update_available: comparison.update_available,
        release_date: comparison.release_date,
        release_notes: comparison.release_notes,
        download_url: comparison.download_url,
        sha256_url: comparison.sha256_url,
        prerelease: comparison.prerelease,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VersionController();
