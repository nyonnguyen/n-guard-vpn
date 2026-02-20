#!/bin/bash
# N-Guard VPN Update Script
# This script handles the update installation process

set -e  # Exit on error

# Configuration
TARGET_VERSION=$1
ARCHIVE_PATH=$2
PROJECT_ROOT="/opt/n-guard-vpn"
TEMP_DIR="/tmp/n-guard-update-$$"

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

# Validate arguments
if [ -z "$TARGET_VERSION" ]; then
    error "Target version not specified"
    error "Usage: $0 <version> [archive_path]"
    exit 1
fi

log "Starting update to version ${TARGET_VERSION}..."

# Phase 1: Validation
log "Phase 1: Validating environment..."

# Check disk space (need at least 500MB)
FREE_SPACE=$(df /opt | tail -1 | awk '{print $4}')
MIN_SPACE=512000  # 500MB in KB

if [ "$FREE_SPACE" -lt "$MIN_SPACE" ]; then
    error "Insufficient disk space: ${FREE_SPACE}KB free, need ${MIN_SPACE}KB"
    exit 1
fi

log "Disk space check passed: ${FREE_SPACE}KB available"

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ] && [ -z "$SUDO_USER" ]; then
    warn "Not running as root. Some operations may fail."
fi

# Phase 2: Download (if archive not provided)
if [ -z "$ARCHIVE_PATH" ]; then
    log "Phase 2: Downloading version ${TARGET_VERSION}..."

    REPO="nyonnguyen/n-guard-vpn"
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${TARGET_VERSION}/n-guard-vpn-v${TARGET_VERSION}.tar.gz"
    ARCHIVE_PATH="${TEMP_DIR}/release.tar.gz"

    mkdir -p "$TEMP_DIR"

    log "Downloading from: ${DOWNLOAD_URL}"
    if ! wget -q --show-progress -O "$ARCHIVE_PATH" "$DOWNLOAD_URL"; then
        error "Download failed"
        rm -rf "$TEMP_DIR"
        exit 1
    fi

    log "Download complete"
else
    log "Using provided archive: ${ARCHIVE_PATH}"
fi

# Verify archive exists
if [ ! -f "$ARCHIVE_PATH" ]; then
    error "Archive not found: ${ARCHIVE_PATH}"
    exit 1
fi

# Phase 3: Extract
log "Phase 3: Extracting archive..."

mkdir -p "$TEMP_DIR/extract"
if ! tar -xzf "$ARCHIVE_PATH" -C "$TEMP_DIR/extract" 2>/dev/null; then
    error "Failed to extract archive"
    rm -rf "$TEMP_DIR"
    exit 1
fi

log "Extraction complete"

# Phase 4: Install files
log "Phase 4: Installing files..."

# Determine the extracted directory (handle both with and without root directory in archive)
EXTRACT_DIR="$TEMP_DIR/extract"
if [ -d "$EXTRACT_DIR/n-guard-vpn" ]; then
    EXTRACT_DIR="$EXTRACT_DIR/n-guard-vpn"
elif [ "$(ls -A $EXTRACT_DIR | wc -l)" -eq 1 ] && [ -d "$EXTRACT_DIR/$(ls $EXTRACT_DIR)" ]; then
    EXTRACT_DIR="$EXTRACT_DIR/$(ls $EXTRACT_DIR)"
fi

log "Installing from: ${EXTRACT_DIR}"

# Use rsync to copy files, excluding user data
if command -v rsync >/dev/null 2>&1; then
    log "Using rsync to copy files..."
    rsync -av \
        --exclude='wireguard/config/peer*/' \
        --exclude='adguard/work/' \
        --exclude='adguard/conf/AdGuardHome.yaml' \
        --exclude='.env' \
        --exclude='backups/' \
        --exclude='web-manager/node_modules' \
        --exclude='web-manager/logs' \
        "${EXTRACT_DIR}/" "${PROJECT_ROOT}/" || {
        error "Failed to copy files with rsync"
        rm -rf "$TEMP_DIR"
        exit 1
    }
else
    warn "rsync not found, using cp (may be slower)"

    # Create a list of files to exclude
    EXCLUDE_PATTERNS="wireguard/config/peer adguard/work/ adguard/conf/AdGuardHome.yaml .env backups/ web-manager/node_modules web-manager/logs"

    # Copy files excluding patterns
    (cd "$EXTRACT_DIR" && find . -type f) | while read file; do
        SKIP=0
        for pattern in $EXCLUDE_PATTERNS; do
            if echo "$file" | grep -q "$pattern"; then
                SKIP=1
                break
            fi
        done

        if [ $SKIP -eq 0 ]; then
            mkdir -p "${PROJECT_ROOT}/$(dirname $file)"
            cp -f "${EXTRACT_DIR}/${file}" "${PROJECT_ROOT}/${file}"
        fi
    done
fi

# Update VERSION file
echo "$TARGET_VERSION" > "${PROJECT_ROOT}/VERSION"
log "Updated VERSION file to ${TARGET_VERSION}"

# Set correct permissions
if [ -d "${PROJECT_ROOT}/scripts" ]; then
    chmod +x "${PROJECT_ROOT}/scripts"/*.sh 2>/dev/null || true
    log "Updated script permissions"
fi

# Phase 5: Cleanup
log "Phase 5: Cleaning up..."
rm -rf "$TEMP_DIR"
log "Cleanup complete"

log "Update to version ${TARGET_VERSION} completed successfully!"
log "Next steps:"
log "  1. Pull new Docker images: docker-compose pull"
log "  2. Restart services: docker-compose up -d"

exit 0
