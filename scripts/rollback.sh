#!/bin/bash
# N-Guard VPN Rollback Script
# This script restores N-Guard VPN from a backup

set -e  # Exit on error

# Configuration
BACKUP_FILE=$1
PROJECT_ROOT="/opt/n-guard-vpn"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Find backup file if not specified
if [ -z "$BACKUP_FILE" ]; then
    log "No backup file specified, searching for most recent backup..."

    # Find the most recent backup
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/pre-update-*.tar.gz 2>/dev/null | head -1)

    if [ -z "$BACKUP_FILE" ]; then
        # Try any backup
        BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | head -1)
    fi

    if [ -z "$BACKUP_FILE" ]; then
        error "No backup file found in ${BACKUP_DIR}"
        exit 1
    fi

    log "Found backup: ${BACKUP_FILE}"
fi

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

log "Starting rollback from: ${BACKUP_FILE}"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_USER" ]; then
    warn "Not running as root. Some operations may fail."
fi

# Phase 1: Stop containers
log "Phase 1: Stopping containers..."
cd "${PROJECT_ROOT}"

if command -v docker-compose >/dev/null 2>&1; then
    docker-compose down 2>/dev/null || warn "Failed to stop containers gracefully"
else
    warn "docker-compose not found, skipping container shutdown"
fi

log "Containers stopped"

# Phase 2: Extract backup
log "Phase 2: Restoring from backup..."

# Create temporary extraction directory
TEMP_DIR="/tmp/n-guard-rollback-$$"
mkdir -p "$TEMP_DIR"

# Extract backup
log "Extracting backup archive..."
if ! tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" 2>/dev/null; then
    error "Failed to extract backup"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Determine extracted directory structure
EXTRACT_DIR="$TEMP_DIR"
if [ -d "$TEMP_DIR/opt/n-guard-vpn" ]; then
    EXTRACT_DIR="$TEMP_DIR/opt/n-guard-vpn"
elif [ -d "$TEMP_DIR/n-guard-vpn" ]; then
    EXTRACT_DIR="$TEMP_DIR/n-guard-vpn"
fi

log "Backup extracted to: ${EXTRACT_DIR}"

# Phase 3: Restore files
log "Phase 3: Restoring files..."

# Copy files back
if command -v rsync >/dev/null 2>&1; then
    log "Using rsync to restore files..."
    rsync -av \
        --exclude='backups/' \
        --exclude='web-manager/node_modules' \
        --exclude='web-manager/logs' \
        "${EXTRACT_DIR}/" "${PROJECT_ROOT}/" || {
        error "Failed to restore files"
        rm -rf "$TEMP_DIR"
        exit 1
    }
else
    warn "rsync not found, using cp"
    cp -rf "${EXTRACT_DIR}"/* "${PROJECT_ROOT}/"
fi

log "Files restored"

# Update permissions
if [ -d "${PROJECT_ROOT}/scripts" ]; then
    chmod +x "${PROJECT_ROOT}/scripts"/*.sh 2>/dev/null || true
fi

# Phase 4: Restart containers
log "Phase 4: Restarting containers..."
cd "${PROJECT_ROOT}"

if command -v docker-compose >/dev/null 2>&1; then
    log "Pulling latest images..."
    docker-compose pull 2>/dev/null || warn "Failed to pull images"

    log "Starting containers..."
    docker-compose up -d || {
        error "Failed to start containers"
        exit 1
    }
else
    warn "docker-compose not found, skipping container restart"
fi

# Wait for containers to start
log "Waiting for services to start..."
sleep 15

# Phase 5: Verify
log "Phase 5: Verifying restoration..."

if command -v docker >/dev/null 2>&1; then
    # Check if containers are running
    RUNNING_CONTAINERS=$(docker ps --filter "name=n-guard-" --format "{{.Names}}" 2>/dev/null | wc -l)

    if [ "$RUNNING_CONTAINERS" -gt 0 ]; then
        log "✓ ${RUNNING_CONTAINERS} containers are running"
    else
        warn "No N-Guard containers are running!"
    fi

    # List container status
    log "Container status:"
    docker ps --filter "name=n-guard-" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || true
fi

# Check VERSION file
if [ -f "${PROJECT_ROOT}/VERSION" ]; then
    RESTORED_VERSION=$(cat "${PROJECT_ROOT}/VERSION")
    log "Restored to version: ${RESTORED_VERSION}"
fi

# Phase 6: Cleanup
log "Phase 6: Cleaning up..."
rm -rf "$TEMP_DIR"

log "Rollback completed successfully!"
log "Please verify that all services are working correctly."

exit 0
