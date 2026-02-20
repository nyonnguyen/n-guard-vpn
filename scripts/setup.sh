#!/bin/bash
#
# N-Guard VPN - Complete Setup Script
# One-command installation for Raspberry Pi / miniPC
#
# Usage: sudo ./scripts/setup.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║   N-Guard VPN - Installation Script   ║"
echo "║   Complete Ad-Blocking VPN Solution    ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo -e "${RED}ERROR: Cannot detect OS${NC}"
    exit 1
fi

echo -e "${BLUE}Detected OS: $OS $VER${NC}"
echo ""

# Confirmation
read -p "This will install Docker, configure firewall, and set up N-Guard VPN. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}═══ Phase 1: System Update ═══${NC}"
apt-get update
apt-get upgrade -y

echo ""
echo -e "${YELLOW}═══ Phase 2: Installing Dependencies ═══${NC}"
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    iptables \
    iptables-persistent \
    ca-certificates \
    gnupg \
    lsb-release

echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${YELLOW}═══ Phase 3: Installing Docker ═══${NC}"

if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker already installed${NC}"
else
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh

    # Add current user to docker group (if not root)
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
        echo -e "${GREEN}✓ User $SUDO_USER added to docker group${NC}"
    fi

    # Enable Docker service
    systemctl enable docker
    systemctl start docker

    echo -e "${GREEN}✓ Docker installed and started${NC}"
fi

echo ""
echo -e "${YELLOW}═══ Phase 4: Installing Docker Compose ═══${NC}"

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
else
    # Install docker-compose via apt (Debian/Ubuntu)
    apt-get install -y docker-compose || {
        # Fallback: Install via pip
        apt-get install -y python3-pip
        pip3 install docker-compose
    }
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
fi

echo ""
echo -e "${YELLOW}═══ Phase 5: Enabling IP Forwarding ═══${NC}"

# Enable IP forwarding
if ! grep -q "^net.ipv4.ip_forward=1" /etc/sysctl.conf; then
    echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
fi

if ! grep -q "^net.ipv6.conf.all.forwarding=1" /etc/sysctl.conf; then
    echo "net.ipv6.conf.all.forwarding=1" >> /etc/sysctl.conf
fi

sysctl -p

echo -e "${GREEN}✓ IP forwarding enabled${NC}"

echo ""
echo -e "${YELLOW}═══ Phase 6: Environment Configuration ═══${NC}"

cd "$PROJECT_DIR"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"

    # Detect public IP
    PUBLIC_IP=$(curl -s -4 icanhazip.com || echo "")

    # Detect WAN interface
    WAN_IFACE=$(ip route | grep default | awk '{print $5}' | head -n1)

    # Create .env file
    cp .env.template .env

    if [ -n "$PUBLIC_IP" ]; then
        sed -i "s/your-public-ip-or-ddns-hostname/$PUBLIC_IP/" .env
        echo -e "${GREEN}✓ Detected public IP: $PUBLIC_IP${NC}"
    else
        echo -e "${YELLOW}⚠ Could not detect public IP. Please edit .env manually${NC}"
    fi

    if [ -n "$WAN_IFACE" ]; then
        sed -i "s/WAN_INTERFACE=eth0/WAN_INTERFACE=$WAN_IFACE/" .env
        echo -e "${GREEN}✓ Detected WAN interface: $WAN_IFACE${NC}"
    fi

    echo -e "${YELLOW}⚠ Please review and edit .env file with your settings:${NC}"
    echo "  - PUBLIC_IP_OR_DDNS (currently: $PUBLIC_IP)"
    echo "  - ADGUARD_ADMIN_PASSWORD (currently: change-this-password)"
    echo ""
    read -p "Press Enter to edit .env now, or Ctrl+C to exit and edit later..."
    ${EDITOR:-nano} .env

else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

source .env

echo ""
echo -e "${YELLOW}═══ Phase 7: Configuring Firewall ═══${NC}"

bash "$SCRIPT_DIR/../firewall/iptables-rules.sh"

echo -e "${GREEN}✓ Firewall configured${NC}"

echo ""
echo -e "${YELLOW}═══ Phase 8: Starting Docker Containers ═══${NC}"

# Pull images first
docker-compose pull

# Start services
docker-compose up -d

echo -e "${GREEN}✓ Docker containers started${NC}"

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to initialize...${NC}"
sleep 10

# Check container status
echo ""
echo -e "${YELLOW}Container Status:${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}═══ Phase 9: Setting Up Cron Jobs ═══${NC}"

# Add cron jobs for automation
CRON_FILE="/etc/cron.d/n-guard-vpn"

cat > "$CRON_FILE" <<EOF
# N-Guard VPN Automated Tasks

# Daily blocklist update at 3 AM
0 3 * * * root $PROJECT_DIR/scripts/update-blocklists.sh >/dev/null 2>&1

# Health check every 5 minutes
*/5 * * * * root $PROJECT_DIR/scripts/healthcheck.sh >/dev/null 2>&1

# Weekly backup on Sunday at 2 AM
0 2 * * 0 root $PROJECT_DIR/scripts/backup.sh >/dev/null 2>&1
EOF

chmod 644 "$CRON_FILE"

echo -e "${GREEN}✓ Cron jobs installed${NC}"

echo ""
echo -e "${YELLOW}═══ Phase 10: Generating WireGuard Client Configs ═══${NC}"

echo -e "${YELLOW}Waiting for WireGuard to generate peer configs...${NC}"
sleep 5

if [ -d "$PROJECT_DIR/wireguard/config" ]; then
    echo -e "${GREEN}✓ WireGuard configs generated${NC}"
    echo ""
    echo "Client QR codes are located in:"
    echo "  $PROJECT_DIR/wireguard/config/"
    echo ""
    echo "To view QR code for peer1:"
    echo "  docker exec n-guard-wireguard /app/show-peer 1"
else
    echo -e "${YELLOW}⚠ WireGuard config directory not found yet${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                ║${NC}"
echo -e "${GREEN}║   Installation Complete! 🎉                    ║${NC}"
echo -e "${GREEN}║                                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo -e "${YELLOW}1. Access AdGuard Home Web UI:${NC}"
echo "   URL: http://$(hostname -I | awk '{print $1}')"
echo "   Complete initial setup wizard"
echo ""
echo -e "${YELLOW}2. View WireGuard QR codes:${NC}"
echo "   docker exec n-guard-wireguard /app/show-peer 1"
echo "   (Change 1 to 2, 3, etc. for other peers)"
echo ""
echo -e "${YELLOW}3. Connect from iPhone:${NC}"
echo "   - Install WireGuard app from App Store"
echo "   - Scan QR code"
echo "   - Enable VPN connection"
echo ""
echo -e "${YELLOW}4. Test ad blocking:${NC}"
echo "   - Visit: https://d3ward.github.io/toolz/adblock.html"
echo "   - Should block >90% of ads"
echo ""
echo -e "${YELLOW}5. Check DNS leak:${NC}"
echo "   - Visit: https://dnsleaktest.com"
echo "   - Should show your home IP only"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:       docker-compose logs -f"
echo "  Restart service: docker-compose restart"
echo "  Stop all:        docker-compose down"
echo "  Update:          docker-compose pull && docker-compose up -d"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  Installation:    $PROJECT_DIR/docs/INSTALL.md"
echo "  Client Setup:    $PROJECT_DIR/docs/CLIENT-SETUP.md"
echo "  Troubleshooting: $PROJECT_DIR/docs/TROUBLESHOOTING.md"
echo ""
echo -e "${GREEN}Happy ad-free browsing! 🚀${NC}"
echo ""
