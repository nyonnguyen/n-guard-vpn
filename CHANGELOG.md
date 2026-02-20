# Changelog

All notable changes to N-Guard VPN will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-20

### Added
- Initial release of N-Guard VPN
- WireGuard VPN server with full-tunnel support
- AdGuard Home DNS filtering with 8+ blocklists
- Unbound recursive DNS resolver for privacy
- Automated setup script (setup.sh)
- Complete documentation (INSTALL.md, CLIENT-SETUP.md, TROUBLESHOOTING.md)
- Health monitoring and automated maintenance scripts
- DNS leak prevention via iptables
- Optional HTTPS interception for YouTube ad blocking (MITM-SETUP.md)
- Support for iOS, Android, macOS, Windows, Linux clients

### Features
- Network-wide ad blocking (>90% effectiveness)
- Auto-updating blocklists (daily)
- Web-based management interface (AdGuard Home)
- Docker-based deployment for easy updates
- Backup and restore functionality
- Performance optimized for Raspberry Pi 4

[1.0.0]: https://github.com/nyonnguyen/n-guard-vpn/releases/tag/v1.0.0
