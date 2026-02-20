#!/bin/bash
#
# N-Guard VPN - Health Check Script
# Monitor service health and restart if needed
# Add to cron: */5 * * * * /opt/n-guard-vpn/scripts/healthcheck.sh
#

set -e

# Configuration
LOG_FILE="/var/log/n-guard-health.log"
MAX_LOG_SIZE=10485760  # 10MB
SERVICES=("n-guard-wireguard" "n-guard-adguard" "n-guard-unbound")

# Rotate log if too large
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Log rotated" > "$LOG_FILE"
fi

# Log function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Check each service
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        # Container is running, check health
        STATUS=$(docker inspect --format='{{.State.Status}}' "$service")

        if [ "$STATUS" != "running" ]; then
            log "WARNING: $service status is $STATUS, restarting..."
            docker restart "$service"
            ALL_HEALTHY=false
        fi
    else
        # Container not running
        log "ERROR: $service is not running! Attempting to start..."
        docker start "$service" 2>&1 | tee -a "$LOG_FILE" || {
            log "CRITICAL: Failed to start $service"
            ALL_HEALTHY=false
        }
    fi
done

# Check DNS resolution through AdGuard
if ! docker exec n-guard-adguard nslookup google.com 127.0.0.1 &>/dev/null; then
    log "WARNING: DNS resolution test failed, restarting AdGuard..."
    docker restart n-guard-adguard
    ALL_HEALTHY=false
fi

# Check WireGuard interface
if ! docker exec n-guard-wireguard wg show &>/dev/null; then
    log "WARNING: WireGuard interface check failed, restarting..."
    docker restart n-guard-wireguard
    ALL_HEALTHY=false
fi

if $ALL_HEALTHY; then
    # Only log success once per hour to reduce log spam
    MINUTE=$(date +%M)
    if [ "$MINUTE" = "00" ]; then
        log "✓ All services healthy"
    fi
else
    log "⚠ Health check completed with issues"
fi

exit 0
