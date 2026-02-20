#!/bin/bash
#
# N-Guard VPN - Configuration Backup Script
# Backup all configuration files and WireGuard keys
# Add to cron: 0 2 * * 0 /opt/n-guard-vpn/scripts/backup.sh
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/opt/n-guard-vpn/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="n-guard-vpn_${TIMESTAMP}.tar.gz"
LOG_FILE="/var/log/n-guard-backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Log function
log() {
    echo -e "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "=== Starting N-Guard VPN backup ==="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Temporary directory for backup staging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

log "Creating backup in temporary directory: $TEMP_DIR"

# Copy configuration files
log "Backing up configuration files..."
mkdir -p "$TEMP_DIR/n-guard-vpn"

# Copy essential files
cp -r "$PROJECT_DIR/wireguard/config" "$TEMP_DIR/n-guard-vpn/wireguard" 2>/dev/null || log "Warning: WireGuard config not found"
cp -r "$PROJECT_DIR/adguard/conf" "$TEMP_DIR/n-guard-vpn/adguard" 2>/dev/null || log "Warning: AdGuard config not found"
cp -r "$PROJECT_DIR/unbound" "$TEMP_DIR/n-guard-vpn/unbound" 2>/dev/null || log "Warning: Unbound config not found"
cp "$PROJECT_DIR/docker-compose.yml" "$TEMP_DIR/n-guard-vpn/" 2>/dev/null || log "Warning: docker-compose.yml not found"
cp "$PROJECT_DIR/.env" "$TEMP_DIR/n-guard-vpn/" 2>/dev/null || log "Warning: .env not found"

# Create backup archive
log "Creating compressed archive..."
cd "$TEMP_DIR"
tar -czf "$BACKUP_DIR/$BACKUP_NAME" n-guard-vpn/

BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
log "✓ Backup created: $BACKUP_NAME (Size: $BACKUP_SIZE)"

# Create latest symlink
ln -sf "$BACKUP_DIR/$BACKUP_NAME" "$BACKUP_DIR/latest.tar.gz"
log "✓ Latest backup symlink updated"

# Remove old backups
log "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "n-guard-vpn_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "n-guard-vpn_*.tar.gz" -type f | wc -l)
log "✓ Cleanup complete. Remaining backups: $REMAINING"

# List recent backups
log "Recent backups:"
ls -lh "$BACKUP_DIR"/n-guard-vpn_*.tar.gz | tail -n 5 | while read line; do
    log "  $line"
done

log "=== Backup complete ==="

# Optional: Upload to cloud storage (uncomment and configure)
# if command -v rclone &> /dev/null; then
#     log "Uploading to cloud storage..."
#     rclone copy "$BACKUP_DIR/$BACKUP_NAME" remote:n-guard-backups/
#     log "✓ Cloud upload complete"
# fi

exit 0
