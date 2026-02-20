# N-Guard VPN - Installation Guide

Complete step-by-step installation guide for setting up your ad-blocking VPN server on Raspberry Pi 4 or miniPC.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Hardware Requirements](#hardware-requirements)
3. [Quick Installation](#quick-installation)
4. [Manual Installation](#manual-installation)
5. [Post-Installation](#post-installation)
6. [Verification](#verification)

---

## Prerequisites

### Hardware
- Raspberry Pi 4 (4GB+ RAM recommended) OR miniPC/x86 Linux machine
- MicroSD card (32GB+ recommended)
- Ethernet cable (recommended for stability)
- Power supply

### Network
- Router with port forwarding capability
- Static IP or Dynamic DNS service (DuckDNS, No-IP, etc.)
- Internet connection

### Software
- Raspberry Pi OS (64-bit) or Debian/Ubuntu Linux
- SSH access to your device
- Basic Linux command line knowledge

---

## Hardware Requirements

### Minimum Requirements
- **CPU**: Raspberry Pi 4 (quad-core ARM) or equivalent
- **RAM**: 2GB (4GB recommended)
- **Storage**: 16GB (32GB recommended)
- **Network**: 100Mbps Ethernet

### Recommended Specifications
- **CPU**: Raspberry Pi 4 or x86 miniPC
- **RAM**: 4GB+
- **Storage**: 64GB SSD
- **Network**: Gigabit Ethernet

### Performance Notes
- **DNS-only filtering**: Minimal CPU usage (~5-10%)
- **With HTTPS interception**: Higher CPU usage (~20-40%)
- **Multiple clients**: 4GB RAM recommended for 5+ simultaneous connections

---

## Quick Installation

### Step 1: Prepare Your Device

1. **Flash OS** (if using Raspberry Pi):
   ```bash
   # Download Raspberry Pi Imager
   # Flash Raspberry Pi OS (64-bit) to SD card
   # Enable SSH in advanced options
   ```

2. **Initial Setup**:
   ```bash
   # SSH into your device
   ssh pi@<your-pi-ip>

   # Update system
   sudo apt update && sudo apt upgrade -y

   # Set static IP (optional but recommended)
   sudo nmtui  # Or edit /etc/dhcpcd.conf
   ```

### Step 2: Download N-Guard VPN

```bash
# Clone or download the project
cd /opt
sudo git clone https://github.com/yourusername/n-guard-vpn.git
cd n-guard-vpn

# Or if you have the files locally
sudo mkdir -p /opt/n-guard-vpn
# Copy all files to /opt/n-guard-vpn
```

### Step 3: Run Automated Setup

```bash
cd /opt/n-guard-vpn
sudo ./scripts/setup.sh
```

The script will:
- Install Docker and Docker Compose
- Configure system settings (IP forwarding)
- Set up firewall rules
- Create and start all services
- Generate WireGuard peer configs
- Install cron jobs for automation

**That's it!** Follow the on-screen instructions to complete setup.

---

## Manual Installation

If you prefer to install manually or the automated script fails:

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    curl wget git vim htop net-tools \
    iptables iptables-persistent \
    ca-certificates gnupg lsb-release
```

### Step 2: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Enable Docker
sudo systemctl enable docker
sudo systemctl start docker

# Verify
docker --version
```

### Step 3: Install Docker Compose

```bash
# Install via apt
sudo apt install -y docker-compose

# Or via pip (if apt fails)
sudo apt install -y python3-pip
sudo pip3 install docker-compose

# Verify
docker-compose --version
```

### Step 4: Configure Environment

```bash
cd /opt/n-guard-vpn

# Copy .env template
cp .env.template .env

# Edit configuration
nano .env
```

**Required settings in .env**:
- `PUBLIC_IP_OR_DDNS`: Your public IP or DDNS hostname
- `WAN_INTERFACE`: Your WAN network interface (use `ip link` to find)
- `ADGUARD_ADMIN_PASSWORD`: Set a strong password

### Step 5: Enable IP Forwarding

```bash
# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Step 6: Configure Firewall

```bash
cd /opt/n-guard-vpn
sudo ./firewall/iptables-rules.sh
```

Verify rules:
```bash
sudo iptables -L -n -v
```

### Step 7: Start Services

```bash
cd /opt/n-guard-vpn

# Pull Docker images
docker-compose pull

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

Expected output:
```
Name                   State       Ports
----------------------------------------------------
n-guard-wireguard      Up          51820/udp
n-guard-adguard        Up          53/tcp, 53/udp, 80/tcp, ...
n-guard-unbound        Up          5335/tcp, 5335/udp
```

### Step 8: Set Up Automation

```bash
# Create cron job file
sudo nano /etc/cron.d/n-guard-vpn
```

Add these lines:
```
# Daily blocklist update at 3 AM
0 3 * * * root /opt/n-guard-vpn/scripts/update-blocklists.sh

# Health check every 5 minutes
*/5 * * * * root /opt/n-guard-vpn/scripts/healthcheck.sh

# Weekly backup on Sunday at 2 AM
0 2 * * 0 root /opt/n-guard-vpn/scripts/backup.sh
```

---

## Post-Installation

### 1. Configure AdGuard Home

1. Open browser: `http://<server-ip>`
2. Complete setup wizard:
   - Choose admin interface port: **80**
   - DNS port: **53**
   - Create admin username and password
3. Configure upstream DNS:
   - Go to Settings → DNS settings
   - Upstream DNS: `10.13.13.2:53` (Unbound)
   - Fallback: `1.1.1.1`, `1.0.0.1`
4. Enable filters:
   - Go to Filters → DNS blocklists
   - Verify all 8+ blocklists are enabled
   - Click "Update filters"

### 2. Configure Port Forwarding

On your router:
- Forward UDP port **51820** to your server's local IP
- This allows WireGuard VPN connections from internet

Example (varies by router):
```
Protocol: UDP
External Port: 51820
Internal IP: 192.168.1.100 (your server)
Internal Port: 51820
```

### 3. Set Up Dynamic DNS (Optional)

If you don't have a static public IP:

1. Create free DDNS account (DuckDNS, No-IP, etc.)
2. Install DDNS updater on your device:
   ```bash
   # Example for DuckDNS
   echo "echo url=\"https://www.duckdns.org/update?domains=YOUR_DOMAIN&token=YOUR_TOKEN&ip=\" | curl -k -o ~/duckdns/duck.log -K -" > ~/duckdns/duck.sh
   chmod +x ~/duckdns/duck.sh

   # Add to cron (every 5 minutes)
   */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
   ```
3. Update `.env` with your DDNS hostname

---

## Verification

### 1. Check Service Status

```bash
# View all containers
docker-compose ps

# View logs
docker-compose logs -f

# Check specific service
docker logs n-guard-adguard
```

### 2. Test DNS Resolution

```bash
# Test AdGuard DNS
docker exec n-guard-adguard nslookup google.com 127.0.0.1

# Should resolve successfully
```

### 3. Test WireGuard

```bash
# View WireGuard status
docker exec n-guard-wireguard wg show

# View peer configs
ls -la wireguard/config/
```

### 4. Access Web UI

- AdGuard Home: `http://<server-ip>`
- Should show dashboard with statistics

---

## Common Issues

### Docker Permission Denied

```bash
sudo usermod -aG docker $USER
# Logout and login again
```

### Port Already in Use

Check if port 53 or 80 is already used:
```bash
sudo netstat -tulpn | grep -E ':53|:80'
```

Disable conflicting services:
```bash
# Example: Disable systemd-resolved
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved
```

### WireGuard Not Starting

Check kernel module:
```bash
sudo modprobe wireguard
lsmod | grep wireguard
```

If missing, install headers:
```bash
sudo apt install raspberrypi-kernel-headers  # Raspberry Pi
# OR
sudo apt install linux-headers-$(uname -r)   # Generic Linux
```

### Firewall Rules Not Persisting

Install iptables-persistent:
```bash
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

---

## Next Steps

1. **Set up clients**: See [CLIENT-SETUP.md](CLIENT-SETUP.md)
2. **Configure YouTube blocking**: See [MITM-SETUP.md](MITM-SETUP.md) (optional)
3. **Customize filters**: Access AdGuard UI to add custom rules
4. **Monitor performance**: Use `htop` and AdGuard statistics

---

## Uninstallation

To completely remove N-Guard VPN:

```bash
cd /opt/n-guard-vpn

# Stop and remove containers
docker-compose down -v

# Remove Docker images (optional)
docker rmi $(docker images -q 'linuxserver/wireguard' 'adguard/adguardhome' 'mvance/unbound')

# Remove project files
cd /opt
sudo rm -rf n-guard-vpn

# Remove cron jobs
sudo rm /etc/cron.d/n-guard-vpn

# Reset firewall (CAREFUL!)
sudo iptables -F
sudo iptables -t nat -F
sudo iptables -P INPUT ACCEPT
sudo iptables -P FORWARD ACCEPT
sudo netfilter-persistent save
```

---

## Support

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Review logs: `docker-compose logs -f`
- Community forum: [Link to forum]
- GitHub issues: [Link to issues]

---

**Installation complete!** Proceed to [CLIENT-SETUP.md](CLIENT-SETUP.md) to configure your devices.
