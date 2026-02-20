#!/bin/bash
#
# N-Guard VPN - Firewall Rules Configuration
# This script sets up iptables rules for VPN routing, NAT, and DNS leak prevention
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== N-Guard VPN Firewall Configuration ===${NC}"

# Load environment variables if .env exists
if [ -f "$(dirname "$0")/../.env" ]; then
    source "$(dirname "$0")/../.env"
fi

# Configuration (with defaults)
WAN_IFACE="${WAN_INTERFACE:-eth0}"
VPN_SUBNET="${VPN_SUBNET:-10.13.13.0/24}"
ADGUARD_IP="${ADGUARD_IP:-10.13.13.1}"
WIREGUARD_IP="${WIREGUARD_IP:-10.13.13.254}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  WAN Interface: $WAN_IFACE"
echo "  VPN Subnet: $VPN_SUBNET"
echo "  AdGuard IP: $ADGUARD_IP"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: This script must be run as root${NC}"
    echo "Please run: sudo $0"
    exit 1
fi

# Verify WAN interface exists
if ! ip link show "$WAN_IFACE" &> /dev/null; then
    echo -e "${RED}ERROR: WAN interface $WAN_IFACE not found${NC}"
    echo "Available interfaces:"
    ip link show | grep -E '^[0-9]+:' | awk '{print "  - " $2}' | sed 's/:$//'
    echo ""
    echo "Please update WAN_INTERFACE in .env file"
    exit 1
fi

echo -e "${YELLOW}Step 1: Flushing existing iptables rules...${NC}"
iptables -F
iptables -t nat -F
iptables -t mangle -F
iptables -X
iptables -t nat -X
iptables -t mangle -X

echo -e "${GREEN}✓ Existing rules cleared${NC}"

echo -e "${YELLOW}Step 2: Setting default policies...${NC}"
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

echo -e "${GREEN}✓ Default policies set (DROP INPUT/FORWARD, ACCEPT OUTPUT)${NC}"

echo -e "${YELLOW}Step 3: Allowing loopback traffic...${NC}"
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

echo -e "${GREEN}✓ Loopback allowed${NC}"

echo -e "${YELLOW}Step 4: Allowing established and related connections...${NC}"
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

echo -e "${GREEN}✓ Stateful firewall rules added${NC}"

echo -e "${YELLOW}Step 5: Allowing SSH access (port 22)...${NC}"
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

echo -e "${GREEN}✓ SSH access allowed${NC}"

echo -e "${YELLOW}Step 6: Allowing WireGuard VPN (port 51820/udp)...${NC}"
iptables -A INPUT -p udp --dport 51820 -j ACCEPT

echo -e "${GREEN}✓ WireGuard port opened${NC}"

echo -e "${YELLOW}Step 7: Allowing AdGuard Home Web UI...${NC}"
iptables -A INPUT -p tcp --dport 80 -j ACCEPT   # Web UI
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT # Initial setup

echo -e "${GREEN}✓ AdGuard Web UI accessible${NC}"

echo -e "${YELLOW}Step 8: Allowing DNS traffic to AdGuard...${NC}"
iptables -A INPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -j ACCEPT
iptables -A INPUT -p tcp --dport 853 -j ACCEPT  # DNS-over-TLS

echo -e "${GREEN}✓ DNS ports opened${NC}"

echo -e "${YELLOW}Step 9: Setting up NAT masquerading for VPN clients...${NC}"
iptables -t nat -A POSTROUTING -s $VPN_SUBNET -o $WAN_IFACE -j MASQUERADE

echo -e "${GREEN}✓ NAT masquerading enabled${NC}"

echo -e "${YELLOW}Step 10: Allowing VPN traffic forwarding...${NC}"
iptables -A FORWARD -i wg+ -j ACCEPT
iptables -A FORWARD -o wg+ -j ACCEPT
iptables -A FORWARD -s $VPN_SUBNET -j ACCEPT
iptables -A FORWARD -d $VPN_SUBNET -j ACCEPT

echo -e "${GREEN}✓ VPN forwarding rules added${NC}"

echo -e "${YELLOW}Step 11: DNS leak prevention (force all DNS to AdGuard)...${NC}"
# Redirect all DNS queries from VPN clients to AdGuard
iptables -t nat -A PREROUTING -s $VPN_SUBNET -p udp --dport 53 -j DNAT --to-destination $ADGUARD_IP:53
iptables -t nat -A PREROUTING -s $VPN_SUBNET -p tcp --dport 53 -j DNAT --to-destination $ADGUARD_IP:53

# Block direct access to external DNS (except to AdGuard)
iptables -A FORWARD -s $VPN_SUBNET ! -d $ADGUARD_IP -p udp --dport 53 -j DROP
iptables -A FORWARD -s $VPN_SUBNET ! -d $ADGUARD_IP -p tcp --dport 53 -j DROP

echo -e "${GREEN}✓ DNS leak prevention active${NC}"

echo -e "${YELLOW}Step 12: Dropping invalid packets...${NC}"
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP
iptables -A FORWARD -m conntrack --ctstate INVALID -j DROP

echo -e "${GREEN}✓ Invalid packet protection added${NC}"

echo -e "${YELLOW}Step 13: Rate limiting (DDoS protection)...${NC}"
# Limit new SSH connections to prevent brute force
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

echo -e "${GREEN}✓ Rate limiting enabled${NC}"

echo -e "${YELLOW}Step 14: Logging dropped packets (last 10/min)...${NC}"
iptables -A INPUT -m limit --limit 10/min -j LOG --log-prefix "iptables-INPUT-dropped: " --log-level 4
iptables -A FORWARD -m limit --limit 10/min -j LOG --log-prefix "iptables-FORWARD-dropped: " --log-level 4

echo -e "${GREEN}✓ Logging configured${NC}"

# Make rules persistent
echo -e "${YELLOW}Step 15: Saving iptables rules...${NC}"

if command -v netfilter-persistent &> /dev/null; then
    # Debian/Ubuntu with netfilter-persistent
    iptables-save > /etc/iptables/rules.v4
    netfilter-persistent save
    echo -e "${GREEN}✓ Rules saved with netfilter-persistent${NC}"
elif command -v iptables-save &> /dev/null; then
    # Generic Linux
    mkdir -p /etc/iptables
    iptables-save > /etc/iptables/rules.v4
    echo -e "${GREEN}✓ Rules saved to /etc/iptables/rules.v4${NC}"
    echo -e "${YELLOW}⚠ Install iptables-persistent for automatic restore on boot:${NC}"
    echo "  sudo apt-get install iptables-persistent"
else
    echo -e "${RED}⚠ Could not save iptables rules permanently${NC}"
fi

# Display current rules
echo ""
echo -e "${GREEN}=== Current iptables rules ===${NC}"
echo -e "${YELLOW}Filter table:${NC}"
iptables -L -v -n --line-numbers
echo ""
echo -e "${YELLOW}NAT table:${NC}"
iptables -t nat -L -v -n --line-numbers

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Firewall configuration complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo "  1. Rules will persist after reboot if iptables-persistent is installed"
echo "  2. View logs: sudo tail -f /var/log/syslog | grep iptables"
echo "  3. Test VPN: Connect with WireGuard and check connectivity"
echo "  4. To disable firewall temporarily: sudo iptables -F && sudo iptables -P INPUT ACCEPT"
echo ""
