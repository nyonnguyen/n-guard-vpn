const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const config = require('../utils/config');
const { getTimestamp } = require('../utils/helpers');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = config.paths.backupDir;
    this.scriptsDir = config.paths.scriptsDir;
    this.projectRoot = config.paths.projectRoot;
  }

  /**
   * Create backup before update
   * @param {string} version - Current version being backed up
   * @returns {Promise<string>} - Path to backup file
   */
  async createBackup(version) {
    const timestamp = getTimestamp().replace(/[:.]/g, '-');
    const backupFileName = `pre-update-${version}-${timestamp}.tar.gz`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      // Use the backup script if it exists
      const backupScriptPath = path.join(this.scriptsDir, 'backup.sh');

      try {
        await fs.access(backupScriptPath);
        // Script exists, use it
        const { stdout, stderr } = await execAsync(
          `bash ${backupScriptPath}`,
          { timeout: 120000 } // 2 minutes
        );

        console.log('Backup script output:', stdout);

        // Find the most recent backup file created
        const files = await fs.readdir(this.backupDir);
        const backupFiles = files
          .filter(f => f.startsWith('backup-') && f.endsWith('.tar.gz'))
          .sort()
          .reverse();

        if (backupFiles.length > 0) {
          const latestBackup = path.join(this.backupDir, backupFiles[0]);
          // Rename it to our expected name
          await fs.rename(latestBackup, backupPath);
          return backupPath;
        }
      } catch (error) {
        console.warn('Backup script not found or failed, creating manual backup...');
      }

      // Manual backup if script doesn't exist or failed
      const { stdout, stderr } = await execAsync(
        `cd ${this.projectRoot} && tar -czf ${backupPath} \
          --exclude='./backups' \
          --exclude='./web-manager/node_modules' \
          --exclude='./adguard/work/data/sessions.db' \
          --exclude='./wireguard/config/peer*/*.png' \
          .`,
        { timeout: 120000 }
      );

      // Verify backup was created
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      console.log(`Backup created: ${backupPath} (${stats.size} bytes)`);

      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Restore from backup
   * @param {string} backupPath - Path to backup file
   * @returns {Promise<void>}
   */
  async restoreBackup(backupPath) {
    try {
      // Verify backup file exists
      await fs.access(backupPath);

      // Use the rollback script if it exists
      const rollbackScriptPath = path.join(this.scriptsDir, 'rollback.sh');

      try {
        await fs.access(rollbackScriptPath);
        // Script exists, use it
        const { stdout, stderr } = await execAsync(
          `bash ${rollbackScriptPath} ${backupPath}`,
          { timeout: 180000 } // 3 minutes
        );

        console.log('Rollback script output:', stdout);
        return;
      } catch (error) {
        console.warn('Rollback script not found or failed, performing manual restore...');
      }

      // Manual restore if script doesn't exist or failed
      // Stop containers first
      await execAsync(
        `cd ${this.projectRoot} && docker-compose down`,
        { timeout: 60000 }
      );

      // Extract backup
      await execAsync(
        `tar -xzf ${backupPath} -C ${this.projectRoot}`,
        { timeout: 120000 }
      );

      // Start containers
      await execAsync(
        `cd ${this.projectRoot} && docker-compose up -d`,
        { timeout: 120000 }
      );

      console.log('Backup restored successfully');
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * List available backups
   * @returns {Promise<Array>}
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);

      const backupFiles = await Promise.all(
        files
          .filter(f => f.endsWith('.tar.gz'))
          .map(async (file) => {
            const filePath = path.join(this.backupDir, file);
            const stats = await fs.stat(filePath);

            return {
              name: file,
              path: filePath,
              size: stats.size,
              created: stats.birthtime
            };
          })
      );

      // Sort by creation time, newest first
      return backupFiles.sort((a, b) => b.created - a.created);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * Get most recent backup
   * @returns {Promise<string|null>}
   */
  async getMostRecentBackup() {
    const backups = await this.listBackups();

    if (backups.length === 0) {
      return null;
    }

    return backups[0].path;
  }

  /**
   * Delete old backups (keep only N most recent)
   * @param {number} keepCount - Number of backups to keep
   * @returns {Promise<number>} - Number of backups deleted
   */
  async cleanupOldBackups(keepCount = 5) {
    const backups = await this.listBackups();

    if (backups.length <= keepCount) {
      return 0;
    }

    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.path);
        deletedCount++;
        console.log(`Deleted old backup: ${backup.name}`);
      } catch (error) {
        console.error(`Failed to delete backup ${backup.name}: ${error.message}`);
      }
    }

    return deletedCount;
  }
}

module.exports = new BackupService();
