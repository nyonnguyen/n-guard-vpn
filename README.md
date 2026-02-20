# N-Guard VPN 🛡️

![Version](https://img.shields.io/github/v/release/nyonnguyen/n-guard-vpn?label=version)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Raspberry%20Pi%20%7C%20Linux-green.svg)
![Docker](https://img.shields.io/badge/docker-required-blue.svg)

**Complete Ad-Blocking VPN Solution for Raspberry Pi & miniPC**

Transform your Raspberry Pi or miniPC into a powerful network-wide ad blocker and VPN server. Block ads on all devices (iPhone, Android, laptops) with DNS-level filtering, automatic blocklist updates, and complete privacy protection.

---

## ✨ Features

### V1.0 (Current Release)

- ✅ **Web Management Interface** - AdGuard Home dashboard for easy configuration
- ✅ **Network-Wide Ad Blocking** - Block ads on all devices via VPN (>90% effectiveness)
- ✅ **YouTube Ads Blocking** - DNS-level (30-40%) + Optional HTTPS interception (70-80%)
- ✅ **Auto-Updating Blocklists** - Daily updates from 8+ public sources (like antivirus)
- ✅ **Complete Privacy** - Hide your IP, prevent DNS leaks, no third-party DNS logging
- ✅ **WireGuard VPN** - Fast, secure, easy-to-configure VPN for all devices
- ✅ **Automated Maintenance** - Health checks, backups, filter updates via cron jobs
- ✅ **Docker-Based** - Easy deployment, updates, and management

### V2.0 Roadmap (Future)

- 🔄 Advanced threat protection (malware, phishing, ransomware)
- 🔄 Parental controls & content filtering
- 🔄 Performance optimization (Redis caching, load balancing)
- 🔄 Multi-hop VPN & enhanced privacy features
- 🔄 Smart home integration (IoT device isolation)
- 🔄 Native mobile app for easier management
- 🔄 AI-powered ad detection & blocking
- 🔄 Advanced analytics & long-term query storage
- 🔄 Cloud backup & disaster recovery
- 🔄 Enterprise features (LDAP, RBAC, API)

[See full V2.0 feature list](/.claude/plans/shiny-bouncing-meerkat.md)

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [What You'll Get](#what-youll-get)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Documentation](#documentation)
- [Architecture](#architecture)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## 🚀 Quick Start

### One-Command Installation

```bash
# Clone repository
cd /opt
sudo git clone https://github.com/nyonnguyen/n-guard-vpn.git
cd n-guard-vpn

# Run automated setup
sudo ./scripts/setup.sh

# Follow on-screen instructions
```

**That's it!** The script will:
- Install Docker & Docker Compose
- Configure firewall & networking
- Deploy all services (WireGuard, AdGuard Home, Unbound)
- Generate VPN client configurations
- Set up automated maintenance

---

## 🎯 What You'll Get

After installation:

1. **Ad-Free Browsing** on all devices connected via VPN
   - Block 90%+ of web ads (banners, pop-ups, trackers)
   - Reduce YouTube ads (30-80% depending on configuration)
   - Block malicious domains & trackers

2. **Complete Privacy**
   - Hide your real IP from websites
   - Prevent ISP tracking via encrypted DNS
   - No DNS logging by third parties (Unbound local resolver)

3. **Easy Management**
   - Web dashboard at `http://<server-ip>`
   - View blocked queries in real-time
   - Customize blocklists & rules
   - Monitor connected devices

4. **Works Everywhere**
   - iPhone, iPad, Android, macOS, Windows, Linux
   - Connect from anywhere (home, coffee shop, travel)
   - No apps to install on every device - just WireGuard VPN

---

## 📦 Requirements

### Hardware

**Minimum:**
- Raspberry Pi 4 (2GB RAM) or equivalent miniPC
- 16GB SD card / storage
- Ethernet connection (recommended)

**Recommended:**
- Raspberry Pi 4 (4GB+ RAM) or x86 miniPC
- 32GB+ SSD storage
- Gigabit ethernet

### Network

- Home router with port forwarding capability
- Internet connection (10+ Mbps upload for HD streaming)
- Static IP or Dynamic DNS (DuckDNS, No-IP, etc.)

### Software

- Raspberry Pi OS (64-bit) or Debian/Ubuntu Linux
- SSH access
- Basic Linux command-line knowledge

---

## 🔧 Installation

### Method 1: Automated (Recommended)

```bash
cd /opt
sudo git clone https://github.com/nyonnguyen/n-guard-vpn.git
cd n-guard-vpn
sudo ./scripts/setup.sh
```

### Method 2: Manual

See detailed [Installation Guide](docs/INSTALL.md)

### Post-Installation

1. **Configure AdGuard Home**
   - Visit `http://<server-ip>`
   - Complete setup wizard
   - Set admin password

2. **Set Up Port Forwarding**
   - Router → Port Forward: UDP 51820 → Server IP

3. **Get VPN Configs**
   ```bash
   # View QR code for iPhone/Android
   docker exec n-guard-wireguard /app/show-peer 1
   ```

4. **Connect Clients**
   - See [Client Setup Guide](docs/CLIENT-SETUP.md)

---

## 📱 Usage

### Connecting Devices

#### iPhone/iPad

1. Install WireGuard from App Store
2. Scan QR code: `docker exec n-guard-wireguard /app/show-peer 1`
3. Toggle VPN on
4. Enjoy ad-free browsing!

#### Android

1. Install WireGuard from Play Store
2. Scan QR code: `docker exec n-guard-wireguard /app/show-peer 2`
3. Connect

#### Desktop (macOS/Windows/Linux)

- Download WireGuard client
- Import config file from `wireguard/config/`

**Full guide**: [CLIENT-SETUP.md](docs/CLIENT-SETUP.md)

### Managing the System

```bash
# View service status
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Update to latest images
docker-compose pull && docker-compose up -d

# Stop all services
docker-compose down
```

### Maintenance

**Automated (via cron):**
- Blocklists update daily at 3 AM
- Health checks every 5 minutes
- Weekly backups on Sunday at 2 AM

**Manual:**
```bash
# Update blocklists
./scripts/update-blocklists.sh

# Run health check
./scripts/healthcheck.sh

# Backup configuration
./scripts/backup.sh
```

---

## 📚 Documentation

- **[Installation Guide](docs/INSTALL.md)** - Detailed setup instructions
- **[Client Setup](docs/CLIENT-SETUP.md)** - Configure devices (iOS, Android, desktop)
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues & solutions
- **[MITM Setup](docs/MITM-SETUP.md)** - Optional YouTube ad blocking (advanced)
- **[Version Workflow](docs/VERSION-WORKFLOW.md)** - Version management & releases
- **[Changelog](CHANGELOG.md)** - Release history & changes
- **[Complete Plan](/.claude/plans/shiny-bouncing-meerkat.md)** - Full project plan & architecture

---

## 🏗️ Architecture

```
┌─────────────┐
│   iPhone    │  VPN Client
└──────┬──────┘
       │ WireGuard (encrypted)
       ↓
┌──────────────────────────────────────────┐
│         Raspberry Pi 4 / miniPC          │
│  ┌────────────────────────────────────┐  │
│  │     WireGuard Server (51820)       │  │
│  └──────────┬─────────────────────────┘  │
│             ↓                             │
│  ┌────────────────────────────────────┐  │
│  │      AdGuard Home (DNS Filter)     │  │
│  │  - Web UI (port 80)                │  │
│  │  - Blocklists (8+ sources)         │  │
│  └──────────┬─────────────────────────┘  │
│             ↓                             │
│  ┌────────────────────────────────────┐  │
│  │    Unbound (Recursive Resolver)    │  │
│  │  - No third-party DNS logging      │  │
│  └──────────┬─────────────────────────┘  │
│             ↓                             │
│       Firewall & NAT                      │
└─────────────┬─────────────────────────────┘
              ↓
         Internet
```

**Components:**

- **WireGuard**: Fast, modern VPN (full-tunnel)
- **AdGuard Home**: DNS filtering, web UI, blocklist management
- **Unbound**: Local recursive DNS resolver (privacy)
- **Squid** (optional): HTTPS interception for YouTube
- **Docker**: Containerized deployment
- **Cron**: Automated maintenance

---

## 🧪 Testing

### Verify Ad Blocking

Visit: https://d3ward.github.io/toolz/adblock.html

**Expected**: >90% of ads blocked

### Check DNS Leak

Visit: https://dnsleaktest.com

**Expected**: Only your home IP, no ISP DNS servers

### Test YouTube (Optional)

- **Without MITM**: 30-40% ads blocked
- **With MITM**: 70-80% ads blocked

---

## ❓ FAQ

### Does this work on iPhone?

**Yes!** Install WireGuard app, scan QR code, connect. Works perfectly on iOS/iPadOS.

### Can I block 100% of YouTube ads?

**No.** DNS-level blocking achieves 30-40%. With HTTPS interception (MITM), you can reach 70-80%, but it requires installing a CA certificate and may break some apps. YouTube Premium is the only 100% solution.

### Will this slow down my internet?

**Minimal impact.** Expect <10ms latency increase and >80% of your normal speed. Performance depends on your server hardware and internet connection.

### Can multiple devices connect?

**Yes!** Configure multiple peers in `.env` (default: 3). Each device gets its own config.

### Is this legal?

**Yes**, for personal use on your own devices. Don't use it to intercept others' traffic without consent.

### What about privacy?

All DNS queries stay on your server (Unbound) - no third-party logging. Your ISP sees encrypted VPN traffic, not individual websites.

### Do I need a static IP?

**No.** Use Dynamic DNS (DuckDNS, No-IP) if your IP changes. Free and easy to set up.

### Can I access it remotely?

**Yes!** Connect from anywhere via WireGuard VPN. Your phone will use your home internet connection.

### What if something breaks?

See [Troubleshooting Guide](docs/TROUBLESHOOTING.md). Most issues are:
- Port forwarding not configured
- Wrong endpoint IP in config
- Firewall blocking traffic

---

## 🛠️ Useful Commands

```bash
# Service management
docker-compose up -d        # Start all services
docker-compose down         # Stop all services
docker-compose restart      # Restart all services
docker-compose ps           # Service status
docker-compose logs -f      # View logs

# WireGuard
docker exec n-guard-wireguard wg show               # Show status
docker exec n-guard-wireguard /app/show-peer 1      # Show QR code

# Maintenance
./scripts/update-blocklists.sh   # Update filters
./scripts/healthcheck.sh         # Check health
./scripts/backup.sh              # Backup config

# Firewall
sudo ./firewall/iptables-rules.sh               # Apply rules
sudo iptables -L -n -v                          # View rules
sudo iptables -t nat -L POSTROUTING -n -v       # View NAT

# Troubleshooting
docker logs n-guard-wireguard    # WireGuard logs
docker logs n-guard-adguard      # AdGuard logs
sudo tail -f /var/log/syslog     # System logs
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Open Pull Request

### Reporting Issues

- Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md) first
- Search existing issues
- Provide logs and system info

---

## 📌 Versioning

N-Guard VPN follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes requiring manual migration
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes and improvements

### Releases

- All releases are published on [GitHub Releases](https://github.com/nyonnguyen/n-guard-vpn/releases)
- Each release includes:
  - Full source code archive
  - Configuration files bundle
  - Documentation bundle
  - SHA256 checksums for verification

### Upgrading

To upgrade to a new version:

```bash
# 1. Backup your configuration
./scripts/backup.sh

# 2. Download new version
wget https://github.com/nyonnguyen/n-guard-vpn/releases/download/vX.Y.Z/n-guard-vpn-configs-vX.Y.Z.tar.gz
tar -xzf n-guard-vpn-configs-vX.Y.Z.tar.gz

# 3. Review changes
cat CHANGELOG.md

# 4. Apply updates and restart
docker-compose pull
docker-compose up -d
```

For detailed version management information, see [Version Workflow](docs/VERSION-WORKFLOW.md).

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

Built with:
- [WireGuard](https://www.wireguard.com/) - Modern VPN protocol
- [AdGuard Home](https://adguard.com/en/adguard-home/overview.html) - DNS filtering
- [Unbound](https://nlnetlabs.nl/projects/unbound/about/) - DNS resolver
- [Docker](https://www.docker.com/) - Containerization

Blocklists from:
- EasyList, EasyPrivacy
- Hagezi DNS Blocklists
- Steven Black Hosts
- OISD Blocklist
- And more!

---

## 📞 Support

- **Documentation**: See [docs/](docs/) folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

## ⭐ Star History

If this project helps you, please consider giving it a star! ⭐

---

**Made with ❤️ for ad-free internet**

*Block ads, protect privacy, enjoy the web* 🚀
