# Changelog

All notable changes to N-Guard VPN will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for 1.0.0 Stable Release
- Production testing and validation
- Performance optimization and benchmarking
- User feedback incorporation
- Documentation improvements based on beta testing

---

## [0.1.0] - 2026-02-20 [BETA]

### 🎉 Initial Beta Release

This is the first beta release of N-Guard VPN. The system is functional but not yet production-ready. Use for testing and development purposes.

### Added
- **WireGuard VPN Server** - Full-tunnel VPN with modern cryptography
- **AdGuard Home** - DNS filtering with 8+ blocklists for ad blocking
- **Unbound DNS Resolver** - Recursive DNS resolver for privacy (no third-party logging)
- **Automated Setup Script** - One-command installation via `setup.sh`
- **Client Configuration** - Support for iOS, Android, macOS, Windows, Linux
- **DNS Leak Prevention** - iptables rules to prevent DNS leaks
- **Health Monitoring** - Automated healthcheck script
- **Backup System** - Configuration backup script
- **Blocklist Auto-Update** - Daily automated blocklist updates
- **MITM Setup (Optional)** - HTTPS interception for YouTube ad blocking
- **Docker Compose Deployment** - Easy containerized deployment
- **Comprehensive Documentation**:
  - INSTALL.md - Installation guide
  - CLIENT-SETUP.md - Client setup for all platforms
  - TROUBLESHOOTING.md - Common issues and solutions
  - MITM-SETUP.md - Optional HTTPS interception setup
  - VERSION-WORKFLOW.md - Version management workflow

### Features
- Network-wide ad blocking (>90% effectiveness)
- YouTube ad blocking (30-40% DNS-level, 70-80% with MITM)
- Complete privacy protection (no DNS logging)
- Web-based management interface (AdGuard Home)
- Automated maintenance via cron jobs
- Docker-based for easy updates
- Raspberry Pi 4 optimized

### Known Limitations (Beta)
- ⚠️ **Beta Software**: Not recommended for production use yet
- ⚠️ **Limited Testing**: Tested primarily on Raspberry Pi 4
- ⚠️ **MITM Feature**: Requires manual CA certificate installation
- ⚠️ **IPv6 Support**: IPv6 not fully tested
- ⚠️ **Performance**: Not optimized for high-traffic scenarios

### Beta Testing Notes
- Please report issues on GitHub: https://github.com/nyonnguyen/n-guard-vpn/issues
- Expected to reach stable 1.0.0 after community testing
- Breaking changes may occur before 1.0.0 release

### Technical Details
- Semantic versioning: 0.x.x = Beta/Unstable
- Version 1.0.0 will be first stable production release
- All features functional but may require refinement

[0.1.0]: https://github.com/nyonnguyen/n-guard-vpn/releases/tag/v0.1.0
