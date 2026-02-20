# N-Guard VPN Update Management System

## Overview

N-Guard VPN includes a web-based update management system that allows you to easily check for updates, install new versions, and manage your system through a user-friendly interface.

## Features

- ✅ **One-Click Updates** - Install updates from GitHub with a single click
- ✅ **Automatic Backup** - Creates backup before every update
- ✅ **Rollback on Failure** - Automatically reverts to previous version if update fails
- ✅ **Real-Time Progress** - Monitor update progress with live status updates
- ✅ **Version Display** - Current version shown on all pages
- ✅ **System Status** - View health status of all containers
- ✅ **Backup Management** - View and manage system backups

## Accessing the Web Interface

The N-Guard Manager web interface is available at:

```
http://<your-pi-ip>:8080
```

Replace `<your-pi-ip>` with your Raspberry Pi's IP address.

### Pages

- **About** (`/about`) - Project information and quick update check
- **Update** (`/update`) - Update management and system status
- **Status** (`/status`) - Detailed system status and container health

## Checking for Updates

### Via Web Interface

1. Open `http://<your-pi-ip>:8080/about`
2. Click the **"Check for Updates"** button
3. The system will query GitHub for the latest release
4. If an update is available, you'll see:
   - Latest version number
   - Release date
   - Release notes
   - "Install Update" button

### Via Command Line

```bash
# Check current version
cat /opt/n-guard-vpn/VERSION

# Check via API
curl http://localhost:8080/api/version/check | jq

# Run health check script
/opt/n-guard-vpn/scripts/verify-health.sh
```

## Installing Updates

### Web Interface (Recommended)

1. Click **"Check for Updates"** on the About or Update page
2. Review the release notes for the new version
3. Click **"Install Update to vX.X.X"**
4. Confirm the update in the dialog box
5. Monitor the progress bar and status messages
6. Wait for completion (typically 2-5 minutes)

The update process will:
- ✅ Create a backup of the current version
- ✅ Download the new release from GitHub
- ✅ Verify the download integrity (checksum)
- ✅ Install new files (preserving your configuration)
- ✅ Update Docker images
- ✅ Restart services
- ✅ Verify all services are healthy
- ✅ Automatically rollback if any step fails

### Command Line

```bash
# Manual update using scripts
cd /opt/n-guard-vpn

# Check for updates
curl -s https://api.github.com/repos/nyonnguyen/n-guard-vpn/releases/latest | jq -r .tag_name

# Update to specific version
sudo ./scripts/update.sh 0.2.0

# Or update via docker-compose
docker-compose pull
docker-compose up -d
```

## Update Process Details

### Phase 1: Pre-Update Validation
- Checks available disk space (minimum 500MB required)
- Verifies all containers are accessible
- Confirms GitHub API is reachable

### Phase 2: Backup Creation
- Creates timestamped backup: `pre-update-<version>-<timestamp>.tar.gz`
- Stored in `/opt/n-guard-vpn/backups/`
- Includes all files except large/temporary data

### Phase 3: Download & Verification
- Downloads release archive from GitHub
- Verifies SHA256 checksum (if available)
- Ensures file integrity

### Phase 4: File Installation
- Extracts new files to temporary directory
- Copies files to installation directory
- Preserves user configuration:
  - `.env` file
  - WireGuard peer configurations
  - AdGuard Home settings
  - Custom blocklists
- Updates VERSION file

### Phase 5: Docker Update
- Pulls latest Docker images
- Restarts all services with new configuration
- Waits for services to stabilize

### Phase 6: Health Verification
- Checks all containers are running
- Tests DNS resolution (via AdGuard)
- Tests WireGuard functionality
- If any check fails → automatic rollback

## Rollback

### Automatic Rollback

If the update fails during verification, the system automatically:
1. Stops all services
2. Restores files from the backup
3. Restarts services
4. Verifies restoration was successful

### Manual Rollback

If you need to manually rollback to a previous version:

#### Via Command Line

```bash
# List available backups
ls -lh /opt/n-guard-vpn/backups/

# Rollback to most recent backup
sudo /opt/n-guard-vpn/scripts/rollback.sh

# Rollback to specific backup
sudo /opt/n-guard-vpn/scripts/rollback.sh /opt/n-guard-vpn/backups/pre-update-0.1.0-2026-02-20.tar.gz
```

#### Via Web Interface (Future)

A rollback button will be added in a future update.

## Backup Management

### Viewing Backups

```bash
# List all backups
ls -lh /opt/n-guard-vpn/backups/

# Check backup size
du -sh /opt/n-guard-vpn/backups/
```

### Via API

```bash
# Get backup list
curl http://localhost:8080/api/system/backups | jq
```

### Automatic Cleanup

The system automatically keeps the 5 most recent backups and deletes older ones after each successful update.

### Manual Backup

```bash
# Create manual backup
/opt/n-guard-vpn/scripts/backup.sh

# Backup will be saved to /opt/n-guard-vpn/backups/
```

## API Endpoints

The N-Guard Manager provides a REST API for automation and integration.

### Version Management

```bash
# Get current version
GET /api/version/current

# Get latest version from GitHub
GET /api/version/latest

# Check if update is available
GET /api/version/check
```

### Update Operations

```bash
# Start update installation
POST /api/update/install
Content-Type: application/json
{"version": "0.2.0"}

# Get update status
GET /api/update/status

# Stream real-time update progress (SSE)
GET /api/update/stream

# Rollback to previous version
POST /api/update/rollback
```

### System Information

```bash
# Health check
GET /api/health

# System status
GET /api/system/status

# Container logs
GET /api/system/logs/:container?lines=50

# List backups
GET /api/system/backups

# About information
GET /api/about
```

### Example Usage

```bash
# Check for updates
curl http://localhost:8080/api/version/check | jq

# Install update
curl -X POST http://localhost:8080/api/update/install \
  -H "Content-Type: application/json" \
  -d '{"version": "0.2.0"}'

# Monitor progress
curl -N http://localhost:8080/api/update/stream
```

## Security

### Rate Limiting

- Update check API: 5 requests per 15 minutes per IP
- Other APIs: 30 requests per minute per IP

### Access Control

The web interface is currently accessible without authentication. For production use, consider:

1. **Firewall Rules** - Restrict access to local network
   ```bash
   sudo ufw allow from 192.168.1.0/24 to any port 8080
   ```

2. **Reverse Proxy** - Add authentication via Nginx/Caddy
3. **VPN Only** - Access only through WireGuard VPN

### Integrity Verification

- All downloads are verified using SHA256 checksums
- Only releases from the official GitHub repository are allowed
- Repository whitelist prevents unauthorized sources

## Troubleshooting

### Update Failed

**Issue:** Update fails and automatically rolls back

**Solution:**
1. Check internet connection
2. Verify disk space: `df -h /opt`
3. Check logs: `docker logs n-guard-manager`
4. Try manual update: `sudo ./scripts/update.sh <version>`

### Web Interface Not Accessible

**Issue:** Cannot access http://localhost:8080

**Solution:**
```bash
# Check if container is running
docker ps | grep n-guard-manager

# Check container logs
docker logs n-guard-manager

# Restart container
docker-compose restart web-manager

# Check port is listening
netstat -tuln | grep 8080
```

### Version Mismatch

**Issue:** Web interface shows different version than expected

**Solution:**
```bash
# Check VERSION file
cat /opt/n-guard-vpn/VERSION

# Restart web manager
docker-compose restart web-manager

# Force rebuild
docker-compose up -d --build web-manager
```

### Backup Creation Failed

**Issue:** Update fails during backup phase

**Solution:**
```bash
# Check disk space
df -h /opt

# Manually create backup
sudo /opt/n-guard-vpn/scripts/backup.sh

# Check backup directory permissions
ls -ld /opt/n-guard-vpn/backups
sudo chmod 755 /opt/n-guard-vpn/backups
```

### Rollback Failed

**Issue:** Automatic or manual rollback fails

**Solution:**
```bash
# Check backup file exists
ls -lh /opt/n-guard-vpn/backups/

# Stop all services
cd /opt/n-guard-vpn
docker-compose down

# Manual extraction
sudo tar -xzf /opt/n-guard-vpn/backups/<backup-file>.tar.gz -C /opt/

# Restart services
docker-compose up -d
```

## Configuration

### Environment Variables

Set these in `.env` file:

```bash
# GitHub repository (default: nyonnguyen/n-guard-vpn)
GITHUB_REPO=nyonnguyen/n-guard-vpn

# Web manager port (default: 8080)
WEB_MANAGER_PORT=8080

# Auto-check for updates on page load (default: true)
AUTO_CHECK_UPDATES=true

# Create backup before update (default: true)
CREATE_BACKUP_BEFORE_UPDATE=true

# Logging level: debug, info, warn, error (default: info)
LOG_LEVEL=info
```

### Docker Configuration

Edit `docker-compose.yml` to customize the web-manager service:

```yaml
web-manager:
  environment:
    - NODE_ENV=production
    - PORT=8080
    - GITHUB_REPO=nyonnguyen/n-guard-vpn
    - LOG_LEVEL=info
```

## Best Practices

### Before Updating

1. ✅ Review release notes on GitHub
2. ✅ Check system has sufficient disk space (500MB+)
3. ✅ Ensure all services are healthy
4. ✅ Verify you have recent backups
5. ✅ Schedule update during low-usage period

### After Updating

1. ✅ Verify all containers are running: `docker ps`
2. ✅ Test VPN connection from a client device
3. ✅ Check DNS resolution: `nslookup google.com <server-ip>`
4. ✅ Review update logs: `docker logs n-guard-manager`
5. ✅ Test ad blocking is still working

### Regular Maintenance

- Check for updates weekly
- Review system logs monthly
- Test backups quarterly
- Monitor disk space regularly
- Keep at least 3 backups

## FAQ

**Q: How often should I update?**
A: Check for updates monthly, or whenever a security update is released. You'll be notified of available updates in the web interface.

**Q: Will updates break my VPN configurations?**
A: No. Updates preserve all your settings:
- WireGuard peer configs
- AdGuard settings
- Custom blocklists
- Environment variables (.env)

**Q: How long does an update take?**
A: Typically 2-5 minutes, depending on your internet connection and Raspberry Pi model.

**Q: What if my internet cuts out during update?**
A: The update will fail and automatically rollback to the previous version. You can retry once internet is restored.

**Q: Can I schedule automatic updates?**
A: Not currently. Automatic updates are planned for v2.0. For now, updates require manual confirmation.

**Q: How do I update if the web interface is broken?**
A: Use the command-line scripts:
```bash
sudo /opt/n-guard-vpn/scripts/update.sh <version>
```

**Q: Where are backups stored?**
A: `/opt/n-guard-vpn/backups/`

**Q: How much disk space do backups use?**
A: Typically 50-200MB per backup, depending on your configuration.

**Q: Can I update from v0.1.0 directly to v0.3.0?**
A: Yes, you can skip versions. The update system handles version differences automatically.

**Q: What if the rollback fails?**
A: Manual intervention is required. See the "Rollback Failed" section in Troubleshooting.

## Support

For issues or questions:

- 📖 Read the [Troubleshooting Guide](TROUBLESHOOTING.md)
- 🐛 Report bugs on [GitHub Issues](https://github.com/nyonnguyen/n-guard-vpn/issues)
- 💬 Ask questions in [GitHub Discussions](https://github.com/nyonnguyen/n-guard-vpn/discussions)
- 📧 Contact: [nyon@example.com](mailto:nyon@example.com)

## Version History

See [CHANGELOG.md](../CHANGELOG.md) for full version history.

---

**Last Updated:** February 20, 2026
**Current Version:** 0.1.0 (Beta)
