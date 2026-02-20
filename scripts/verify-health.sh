#!/bin/bash
# N-Guard VPN Health Verification Script
# This script verifies that all N-Guard VPN components are healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✓${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ✗${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] !${NC} $1"
}

# Configuration
PROJECT_ROOT="/opt/n-guard-vpn"
EXPECTED_CONTAINERS=("n-guard-wireguard" "n-guard-adguard" "n-guard-unbound" "n-guard-manager")
HEALTH_PASSED=0
HEALTH_FAILED=0

log "Starting N-Guard VPN health check..."
echo ""

# Check 1: Docker availability
log "Check 1: Docker availability"
if command -v docker >/dev/null 2>&1; then
    success "Docker is installed"
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    log "  Version: ${DOCKER_VERSION}"
    ((HEALTH_PASSED++))
else
    error "Docker is not installed or not in PATH"
    ((HEALTH_FAILED++))
    exit 1
fi
echo ""

# Check 2: Docker Compose availability
log "Check 2: Docker Compose availability"
if command -v docker-compose >/dev/null 2>&1; then
    success "Docker Compose is installed"
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f4 | tr -d ',')
    log "  Version: ${COMPOSE_VERSION}"
    ((HEALTH_PASSED++))
else
    error "Docker Compose is not installed or not in PATH"
    ((HEALTH_FAILED++))
fi
echo ""

# Check 3: Project directory
log "Check 3: Project directory"
if [ -d "$PROJECT_ROOT" ]; then
    success "Project directory exists: ${PROJECT_ROOT}"
    ((HEALTH_PASSED++))

    # Check VERSION file
    if [ -f "${PROJECT_ROOT}/VERSION" ]; then
        VERSION=$(cat "${PROJECT_ROOT}/VERSION")
        log "  Current version: ${VERSION}"
    else
        warn "  VERSION file not found"
    fi
else
    error "Project directory not found: ${PROJECT_ROOT}"
    ((HEALTH_FAILED++))
fi
echo ""

# Check 4: Container status
log "Check 4: Container status"
ALL_CONTAINERS_RUNNING=true

for container in "${EXPECTED_CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^${container}$"; then
        STATUS=$(docker ps --filter "name=${container}" --format "{{.Status}}")
        success "${container}: ${STATUS}"
    else
        error "${container}: Not running"
        ALL_CONTAINERS_RUNNING=false
    fi
done

if $ALL_CONTAINERS_RUNNING; then
    ((HEALTH_PASSED++))
else
    ((HEALTH_FAILED++))
fi
echo ""

# Check 5: Container health checks
log "Check 5: Container health checks"
UNHEALTHY_COUNT=0

for container in "${EXPECTED_CONTAINERS[@]}"; do
    if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^${container}$"; then
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

        if [ "$HEALTH" = "healthy" ]; then
            success "${container}: healthy"
        elif [ "$HEALTH" = "none" ]; then
            log "  ${container}: no health check configured"
        else
            warn "${container}: ${HEALTH}"
            ((UNHEALTHY_COUNT++))
        fi
    fi
done

if [ $UNHEALTHY_COUNT -eq 0 ]; then
    ((HEALTH_PASSED++))
else
    warn "Some containers are unhealthy"
    ((HEALTH_FAILED++))
fi
echo ""

# Check 6: DNS resolution (via AdGuard)
log "Check 6: DNS resolution test"
if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^n-guard-adguard$"; then
    if docker exec n-guard-adguard nslookup google.com 127.0.0.1 >/dev/null 2>&1; then
        success "DNS resolution working"
        ((HEALTH_PASSED++))
    else
        error "DNS resolution failed"
        ((HEALTH_FAILED++))
    fi
else
    warn "AdGuard container not running, skipping DNS test"
fi
echo ""

# Check 7: WireGuard status
log "Check 7: WireGuard status"
if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^n-guard-wireguard$"; then
    if docker exec n-guard-wireguard wg show >/dev/null 2>&1; then
        success "WireGuard is operational"

        # Get peer count
        PEER_COUNT=$(docker exec n-guard-wireguard wg show 2>/dev/null | grep -c "peer:" || echo "0")
        log "  Connected peers: ${PEER_COUNT}"

        ((HEALTH_PASSED++))
    else
        error "WireGuard check failed"
        ((HEALTH_FAILED++))
    fi
else
    warn "WireGuard container not running, skipping test"
fi
echo ""

# Check 8: Web Manager availability
log "Check 8: Web Manager availability"
if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^n-guard-manager$"; then
    if curl -s -f http://localhost:8080/api/health >/dev/null 2>&1; then
        success "Web Manager is responding"
        ((HEALTH_PASSED++))
    else
        error "Web Manager is not responding"
        ((HEALTH_FAILED++))
    fi
else
    warn "Web Manager container not running"
    ((HEALTH_FAILED++))
fi
echo ""

# Check 9: Disk space
log "Check 9: Disk space"
FREE_SPACE=$(df /opt 2>/dev/null | tail -1 | awk '{print $4}')
FREE_SPACE_MB=$((FREE_SPACE / 1024))

if [ "$FREE_SPACE" -gt 512000 ]; then  # 500MB
    success "Sufficient disk space: ${FREE_SPACE_MB}MB available"
    ((HEALTH_PASSED++))
elif [ "$FREE_SPACE" -gt 102400 ]; then  # 100MB
    warn "Low disk space: ${FREE_SPACE_MB}MB available"
    ((HEALTH_FAILED++))
else
    error "Critical: Very low disk space: ${FREE_SPACE_MB}MB available"
    ((HEALTH_FAILED++))
fi
echo ""

# Check 10: Backup directory
log "Check 10: Backup system"
BACKUP_DIR="${PROJECT_ROOT}/backups"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        success "Backup system operational: ${BACKUP_COUNT} backup(s) available"
        LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            BACKUP_NAME=$(basename "$LATEST_BACKUP")
            log "  Latest backup: ${BACKUP_NAME}"
        fi
    else
        warn "No backups found"
    fi
    ((HEALTH_PASSED++))
else
    warn "Backup directory not found"
    ((HEALTH_FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo "Health Check Summary"
echo "=========================================="
echo -e "Passed: ${GREEN}${HEALTH_PASSED}${NC}"
echo -e "Failed: ${RED}${HEALTH_FAILED}${NC}"
echo "=========================================="

if [ $HEALTH_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All health checks passed!${NC}"
    exit 0
elif [ $HEALTH_FAILED -le 2 ]; then
    echo -e "${YELLOW}! Some checks failed, but system is mostly operational${NC}"
    exit 1
else
    echo -e "${RED}✗ Multiple health checks failed!${NC}"
    exit 2
fi
