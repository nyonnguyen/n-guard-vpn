const fs = require('fs').promises;
const config = require('../utils/config');
const { isNewerVersion } = require('../utils/helpers');
const { validateVersion, validateDownloadUrl, validateSource } = require('../utils/validators');

class GitHubService {
  constructor() {
    this.apiUrl = config.github.apiUrl;
    this.repo = config.github.repo;
  }

  /**
   * Fetch latest release from GitHub
   * @returns {Promise<Object>}
   */
  async getLatestRelease() {
    const url = `${this.apiUrl}/repos/${this.repo}/releases/latest`;

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'N-Guard-Manager/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No releases found for this repository');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Find the main release asset (tar.gz)
      const releaseAsset = data.assets.find(a =>
        a.name.includes('.tar.gz') && !a.name.includes('.sha256')
      );

      // Find the checksum file
      const checksumAsset = data.assets.find(a =>
        a.name.includes('.sha256')
      );

      if (!releaseAsset) {
        throw new Error('No release archive found in latest release');
      }

      const version = data.tag_name.replace(/^v/, '');

      return {
        version,
        tag_name: data.tag_name,
        release_date: data.published_at,
        release_notes: data.body || 'No release notes available',
        download_url: releaseAsset.browser_download_url,
        sha256_url: checksumAsset?.browser_download_url || null,
        prerelease: data.prerelease,
        draft: data.draft
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        throw new Error('Cannot connect to GitHub. Check your internet connection.');
      }
      throw error;
    }
  }

  /**
   * Get current installed version
   * @returns {Promise<string>}
   */
  async getCurrentVersion() {
    try {
      const content = await fs.readFile(config.paths.versionFile, 'utf8');
      const version = content.trim();

      if (!validateVersion(version)) {
        throw new Error(`Invalid version format in VERSION file: ${version}`);
      }

      return version;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('VERSION file not found');
      }
      throw error;
    }
  }

  /**
   * Compare current and latest versions
   * @returns {Promise<Object>}
   */
  async compareVersions() {
    const [currentVersion, latestRelease] = await Promise.all([
      this.getCurrentVersion(),
      this.getLatestRelease()
    ]);

    const updateAvailable = isNewerVersion(latestRelease.version, currentVersion);

    // Validate download URL
    if (latestRelease.download_url && !validateDownloadUrl(latestRelease.download_url)) {
      throw new Error('Invalid download URL from GitHub');
    }

    // Validate source
    if (latestRelease.download_url && !validateSource(latestRelease.download_url)) {
      throw new Error('Download URL is from unauthorized repository');
    }

    return {
      current_version: currentVersion,
      latest_version: latestRelease.version,
      update_available: updateAvailable,
      release_date: latestRelease.release_date,
      release_notes: latestRelease.release_notes,
      download_url: latestRelease.download_url,
      sha256_url: latestRelease.sha256_url,
      prerelease: latestRelease.prerelease
    };
  }

  /**
   * Download checksum file
   * @param {string} url - URL to checksum file
   * @returns {Promise<string>}
   */
  async downloadChecksum(url) {
    if (!url) {
      return null;
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to download checksum: ${response.status}`);
      }

      const text = await response.text();
      // Extract just the hash (first part before any whitespace)
      const hash = text.trim().split(/\s+/)[0];

      return hash;
    } catch (error) {
      console.warn('Failed to download checksum:', error.message);
      return null;
    }
  }
}

module.exports = new GitHubService();
