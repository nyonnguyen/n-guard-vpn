#!/bin/bash
#
# N-Guard VPN - Blocklist Update Script
# Automatically update AdGuard Home filter lists
# Add to cron: 0 3 * * * /opt/n-guard-vpn/scripts/update-blocklists.sh
#

set -e

# Configuration
LOG_FILE="/var/log/n-guard-updates.log"
CONTAINER_NAME="n-guard-adguard"
MAX_LOG_SIZE=10485760  # 10MB

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Log rotated" > "$LOG_FILE"
fi

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "=== Starting blocklist update ==="

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    log "ERROR: $CONTAINER_NAME container is not running"
    exit 1
fi

# Trigger filter update
log "Updating filter lists..."
docker exec "$CONTAINER_NAME" /opt/adguardhome/AdGuardHome --update-filters || {
    log "ERROR: Failed to update filters"
    exit 1
}

log "✓ Filter lists updated successfully"

# Get statistics
STATS=$(docker exec "$CONTAINER_NAME" /opt/adguardhome/AdGuardHome --check-config 2>&1 || echo "Stats unavailable")
log "Container health: $STATS"

log "=== Blocklist update complete ==="

exit 0
