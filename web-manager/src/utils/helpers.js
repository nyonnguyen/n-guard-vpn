const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const crypto = require('crypto');

const execAsync = promisify(exec);

/**
 * Compare two semver version strings
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {number} -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (v1Parts[i] > v2Parts[i]) return 1;
    if (v1Parts[i] < v2Parts[i]) return -1;
  }

  return 0;
}

/**
 * Check if version1 is newer than version2
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {boolean}
 */
function isNewerVersion(version1, version2) {
  return compareVersions(version1, version2) > 0;
}

/**
 * Calculate SHA256 checksum of a file
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - Hex string of checksum
 */
async function calculateChecksum(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Verify file checksum
 * @param {string} filePath - Path to file
 * @param {string} expectedChecksum - Expected checksum
 * @returns {Promise<boolean>}
 */
async function verifyChecksum(filePath, expectedChecksum) {
  const actualChecksum = await calculateChecksum(filePath);
  return actualChecksum === expectedChecksum.toLowerCase();
}

/**
 * Check available disk space
 * @param {string} path - Path to check
 * @returns {Promise<number>} - Free space in KB
 */
async function getFreeDiskSpace(path = '/opt') {
  try {
    const { stdout } = await execAsync(`df ${path} | tail -1 | awk '{print $4}'`);
    return parseInt(stdout.trim(), 10);
  } catch (error) {
    throw new Error(`Failed to check disk space: ${error.message}`);
  }
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute shell command with timeout
 * @param {string} command - Command to execute
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
async function execWithTimeout(command, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });

    setTimeout(() => {
      process.kill();
      reject(new Error(`Command timed out after ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Get current timestamp in ISO format
 * @returns {string}
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

module.exports = {
  compareVersions,
  isNewerVersion,
  calculateChecksum,
  verifyChecksum,
  getFreeDiskSpace,
  formatBytes,
  sleep,
  execWithTimeout,
  getTimestamp,
  formatDate
};
