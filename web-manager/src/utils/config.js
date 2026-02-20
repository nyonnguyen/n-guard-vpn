const path = require('path');

module.exports = {
  // Server configuration
  port: process.env.PORT || 8080,
  nodeEnv: process.env.NODE_ENV || 'production',

  // GitHub configuration
  github: {
    repo: process.env.GITHUB_REPO || 'nyonnguyen/n-guard-vpn',
    apiUrl: 'https://api.github.com'
  },

  // Paths
  paths: {
    versionFile: process.env.VERSION_FILE || '/app/VERSION',
    backupDir: '/app/backups',
    tempDir: '/tmp',
    scriptsDir: '/opt/n-guard-vpn/scripts',
    projectRoot: '/opt/n-guard-vpn'
  },

  // Update configuration
  update: {
    autoCheck: process.env.AUTO_CHECK_UPDATES === 'true',
    createBackup: process.env.CREATE_BACKUP_BEFORE_UPDATE !== 'false',
    minFreeSpace: 500 * 1024, // 500MB in KB
    verificationTimeout: 15000, // 15 seconds
    downloadTimeout: 300000 // 5 minutes
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logDir: '/app/logs'
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 requests per window
  },

  // Docker
  docker: {
    socketPath: '/var/run/docker.sock',
    composeFile: '/opt/n-guard-vpn/docker-compose.yml'
  }
};
