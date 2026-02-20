/**
 * Validates version string format (semver)
 * @param {string} version - Version string to validate
 * @returns {boolean}
 */
function validateVersion(version) {
  const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  if (!version || typeof version !== 'string') {
    return false;
  }

  return semverRegex.test(version);
}

/**
 * Validates GitHub repository format (owner/repo)
 * @param {string} repo - Repository string to validate
 * @returns {boolean}
 */
function validateRepo(repo) {
  const repoRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;

  if (!repo || typeof repo !== 'string') {
    return false;
  }

  return repoRegex.test(repo);
}

/**
 * Validates GitHub download URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function validateDownloadUrl(url) {
  try {
    const parsed = new URL(url);

    // Must be GitHub domain
    if (!parsed.hostname.includes('github.com') && !parsed.hostname.includes('githubusercontent.com')) {
      return false;
    }

    // Must be HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates repository source against whitelist
 * @param {string} url - URL to validate
 * @param {Array<string>} allowedRepos - Array of allowed repositories
 * @returns {boolean}
 */
function validateSource(url, allowedRepos = ['nyonnguyen/n-guard-vpn']) {
  try {
    const parsed = new URL(url);
    const repoMatch = parsed.pathname.match(/^\/([^/]+\/[^/]+)\//);

    if (!repoMatch) {
      return false;
    }

    const repo = repoMatch[1];
    return allowedRepos.includes(repo);
  } catch (error) {
    return false;
  }
}

/**
 * Sanitizes user input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string}
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove any potentially dangerous characters
  return input.replace(/[;&|`$(){}[\]<>]/g, '');
}

module.exports = {
  validateVersion,
  validateRepo,
  validateDownloadUrl,
  validateSource,
  sanitizeInput
};
