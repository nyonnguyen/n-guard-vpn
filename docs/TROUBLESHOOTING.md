# N-Guard VPN - Troubleshooting Guide

Common issues and solutions for N-Guard VPN.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Connection Issues](#connection-issues)
4. [Performance Issues](#performance-issues)
5. [Ad Blocking Issues](#ad-blocking-issues)
6. [DNS Issues](#dns-issues)
7. [Advanced Debugging](#advanced-debugging)

---

## Quick Diagnostics

Run these commands to quickly identify issues:

```bash
# Check all services are running
docker-compose ps

# Expected output: All services "Up"
# n-guard-wireguard   Up   51820/udp
# n-guard-adguard     Up   53/tcp, 53/udp, 80/tcp
# n-guard-unbound     Up   5335/tcp, 5335/udp

# View recent logs
docker-compose logs --tail=50

# Check firewall rules
sudo iptables -L -n -v

# Test DNS resolution
docker exec n-guard-adguard nslookup google.com 127.0.0.1

# Check WireGuard peers
docker exec n-guard-wireguard wg show
```

---

## Installation Issues

### Docker Permission Denied

**Problem**: `permission denied while trying to connect to the Docker daemon socket`

**Solution**:
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, or run:
newgrp docker

# Verify
docker ps
```

### Port 53 Already in Use

**Problem**: `address already in use: :::53`

**Cause**: Another DNS service is using port 53 (systemd-resolved, dnsmasq, etc.)

**Solution**:
```bash
# Check what's using port 53
sudo netstat -tulpn | grep :53

# Disable systemd-resolved (Ubuntu/Debian)
sudo systemctl disable systemd-resolved
sudo systemctl stop systemd-resolved

# Remove symlink
sudo rm /etc/resolv.conf

# Create new resolv.conf
echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf

# Restart services
docker-compose restart
```

### Port 80 Already in Use

**Problem**: AdGuard can't bind to port 80

**Solutions**:

**Option 1**: Change AdGuard port
```yaml
# In docker-compose.yml
ports:
  - "8080:80"  # Change to port 8080
```

**Option 2**: Disable conflicting service
```bash
# Check what's using port 80
sudo netstat -tulpn | grep :80

# Example: Disable Apache
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### WireGuard Module Not Found

**Problem**: `Fatal: Module wireguard not found`

**Solution**:
```bash
# Raspberry Pi
sudo apt update
sudo apt install raspberrypi-kernel-headers wireguard-tools

# Debian/Ubuntu
sudo apt install linux-headers-$(uname -r) wireguard-tools

# Load module
sudo modprobe wireguard

# Verify
lsmod | grep wireguard

# If still fails, try userspace implementation (slower)
# Edit docker-compose.yml:
environment:
  - WG_USERSPACE=true
```

### Docker Compose Version Error

**Problem**: `version is obsolete` or syntax errors

**Solution**:
```bash
# Update docker-compose
sudo apt update
sudo apt install docker-compose

# Or install latest via pip
sudo pip3 install --upgrade docker-compose

# Verify version (need 1.27.0+)
docker-compose --version
```

---

## Connection Issues

### Cannot Connect to VPN

**Checklist**:

1. **Verify server is running**:
   ```bash
   docker-compose ps
   # WireGuard should be "Up"
   ```

2. **Check port forwarding on router**:
   - UDP port 51820 should forward to server local IP
   - Test: https://www.yougetsignal.com/tools/open-ports/
   - Enter your public IP and port 51820

3. **Verify public IP/DDNS**:
   ```bash
   # Check public IP
   curl -4 icanhazip.com

   # Should match endpoint in client config
   cat wireguard/config/peer1/peer1.conf | grep Endpoint
   ```

4. **Check firewall**:
   ```bash
   sudo iptables -L -n | grep 51820
   # Should show ACCEPT rule for port 51820
   ```

5. **Verify client config**:
   - Endpoint must be public IP (not 192.168.x.x or 10.x.x.x)
   - Port should be 51820
   - DNS should be 10.13.13.1

### Handshake Failed

**Problem**: WireGuard shows "handshake did not complete" or "no recent handshake"

**Causes**:
- Clock sync issues
- Firewall blocking
- NAT traversal problems

**Solutions**:

```bash
# 1. Check time sync
timedatectl status
# Should show "System clock synchronized: yes"

# If not synced:
sudo apt install systemd-timesyncd
sudo timedatectl set-ntp true

# 2. Check server logs
docker logs n-guard-wireguard

# 3. Restart WireGuard
docker-compose restart wireguard

# 4. Add PersistentKeepalive to client config
[Peer]
PersistentKeepalive = 25
```

### Connected But No Internet

**Problem**: VPN connects but websites don't load

**Diagnosis**:
```bash
# From client, ping VPN gateway
ping 10.13.13.1
# Should respond

# From client, ping external IP
ping 1.1.1.1
# Should respond

# From client, test DNS
nslookup google.com
# Should return result

# If ping works but DNS fails → DNS issue
# If ping doesn't work → routing issue
```

**Solutions**:

**DNS Issue**:
```ini
# In client config, ensure:
[Interface]
DNS = 10.13.13.1

# Not:
# DNS = 8.8.8.8  (wrong)
```

**Routing Issue**:
```bash
# On server, check NAT
sudo iptables -t nat -L POSTROUTING -n -v
# Should show MASQUERADE rule for VPN subnet

# If missing, run firewall script again
sudo ./firewall/iptables-rules.sh
```

### VPN Disconnects Randomly

**Problem**: Connection drops after few minutes

**Solutions**:

1. **Enable Keepalive**:
   ```ini
   # In client config
   [Peer]
   PersistentKeepalive = 25
   ```

2. **Check server load**:
   ```bash
   htop
   # CPU should be <80%
   # RAM should have free space
   ```

3. **Increase MTU**:
   ```ini
   # In client config
   [Interface]
   MTU = 1420  # Or try 1280
   ```

4. **Check router settings**:
   - Disable "SPI Firewall" or "NAT Filtering" if too strict
   - Update router firmware

---

## Performance Issues

### Slow Internet Speed

**Expected**: VPN should achieve >80% of baseline speed

**Diagnosis**:
```bash
# Test speed on server (without VPN)
speedtest-cli

# Test from client (with VPN)
# Visit: https://speedtest.net

# Compare results
```

**Solutions**:

1. **Check server CPU**:
   ```bash
   htop
   # If CPU >90%: Server is overloaded
   ```

2. **Optimize Unbound cache**:
   ```bash
   # Edit unbound/unbound.conf
   rrset-cache-size: 512m  # Increase
   msg-cache-size: 256m    # Increase
   ```

3. **Reduce MTU**:
   ```ini
   # In client config
   [Interface]
   MTU = 1280
   ```

4. **Disable HTTPS interception** (if enabled):
   - Squid proxy adds significant overhead
   - Comment out squid service in docker-compose.yml

5. **Upgrade hardware**:
   - Pi 4 with 4GB+ RAM recommended
   - Use SSD instead of SD card
   - Consider x86 miniPC for better performance

### High Latency

**Expected**: +10-20ms increase is normal

**If much higher**:

1. **Check server location**: Physical distance affects latency

2. **Check network**:
   ```bash
   # From client, ping server
   ping <server-public-ip>
   # Note latency

   # Compare to ping through VPN
   ping 10.13.13.1
   ```

3. **Optimize DNS**:
   ```yaml
   # In adguard/conf/AdGuardHome.yaml
   cache_size: 8388608  # Increase cache
   ```

### Video Buffering

**Problem**: YouTube/streaming videos buffer frequently

**Solutions**:

1. **Check bandwidth**:
   - Server upload speed should be >10 Mbps for HD streaming

2. **Disable QoS** on router if enabled

3. **Adjust streaming quality**:
   - Temporarily lower video quality to test

4. **Check server load**:
   ```bash
   docker stats
   # Check CPU/memory usage
   ```

---

## Ad Blocking Issues

### Ads Still Appearing

**Expected effectiveness**:
- Web ads (banners, pop-ups): >90% blocked
- YouTube ads (DNS only): ~30-40% blocked
- YouTube ads (with MITM): ~70-80% blocked

**Diagnosis**:

1. **Test ad blocking**:
   - Visit: https://d3ward.github.io/toolz/adblock.html
   - Should block >90% (DNS level)

2. **Check AdGuard is working**:
   ```bash
   # Query known ad domain
   nslookup ads.google.com 10.13.13.1
   # Should return 0.0.0.0 (blocked)
   ```

3. **View AdGuard logs**:
   - Visit: http://10.13.13.1 (via VPN)
   - Go to Query Log
   - Check if queries are being processed

**Solutions**:

1. **Update filter lists**:
   ```bash
   docker exec n-guard-adguard /opt/adguardhome/AdGuardHome --update-filters
   ```

2. **Add more blocklists**:
   - AdGuard UI → Filters → DNS blocklists → Add
   - Recommended: Hagezi Ultimate

3. **Check DNS is forced**:
   ```bash
   sudo iptables -t nat -L PREROUTING | grep 53
   # Should show DNAT rules
   ```

4. **Clear DNS cache** on client:
   - iOS: Airplane mode on/off
   - Android: Reboot
   - Desktop: `ipconfig /flushdns` (Windows) or `sudo killall -HUP mDNSResponder` (Mac)

### YouTube Ads Not Blocked

**Reality check**: YouTube ads are **very difficult** to block with DNS-only filtering.

**Why**: YouTube serves ads from same domains as videos (googlevideo.com)

**Solutions**:

1. **Accept limitation**: DNS blocking is 30-40% effective for YouTube

2. **Enable HTTPS interception**: See MITM-SETUP.md (70-80% effective but requires CA install)

3. **Use browser with uBlock Origin**: Works on desktop browsers

4. **YouTube Premium**: 100% effective (paid solution)

5. **Alternative clients** (Android):
   - NewPipe (open source YouTube client)
   - Vanced (unofficial, use at own risk)

### Legitimate Sites Blocked

**Problem**: Some websites don't load due to overly aggressive blocking

**Solutions**:

1. **Whitelist domain**:
   - AdGuard UI → Filters → Custom filtering rules
   - Add: `@@||example.com^`

2. **Disable specific filter**:
   - AdGuard UI → Filters → DNS blocklists
   - Uncheck problematic filter

3. **Check which filter blocked it**:
   - AdGuard UI → Query Log
   - Find blocked domain
   - See which filter caused it
   - Whitelist or disable that filter

**Common false positives**:
- CDNs: `*.cloudfront.net`, `*.akamaihd.net`
- Analytics: Some sites break without Google Analytics
- Payment processors: PayPal, Stripe trackers may be blocked

---

## DNS Issues

### DNS Leak Detected

**Problem**: https://dnsleaktest.com shows ISP DNS servers

**Cause**: DNS queries bypassing VPN

**Solutions**:

1. **Verify client DNS setting**:
   ```ini
   # In WireGuard config
   [Interface]
   DNS = 10.13.13.1  # Must be set
   ```

2. **Check DNS redirect rules**:
   ```bash
   sudo iptables -t nat -L PREROUTING | grep "dpt:53"
   # Should show DNAT to 10.13.13.1
   ```

3. **Disable IPv6** (if leak persists):
   ```ini
   # In client config
   AllowedIPs = 0.0.0.0/0  # Remove ::/0
   ```

4. **Force DNS on client**:
   - iOS: DNS should auto-apply from WireGuard config
   - Android: Settings → Private DNS → Off
   - Desktop: Verify /etc/resolv.conf

### DNS Resolution Slow

**Problem**: Websites take long to load (waiting for DNS)

**Solutions**:

1. **Increase Unbound cache**:
   ```conf
   # In unbound/unbound.conf
   rrset-cache-size: 512m
   msg-cache-size: 256m
   ```

2. **Enable prefetching**:
   ```conf
   # In unbound/unbound.conf
   prefetch: yes
   prefetch-key: yes
   ```

3. **Add upstream DNS**:
   ```yaml
   # In adguard/conf/AdGuardHome.yaml
   upstream_dns:
     - 10.13.13.2:53  # Unbound
     - 1.1.1.1        # Cloudflare (fallback)
     - 8.8.8.8        # Google (fallback)
   ```

4. **Restart DNS services**:
   ```bash
   docker-compose restart unbound adguard
   ```

### Cannot Access AdGuard UI

**Problem**: http://10.13.13.1 doesn't load

**Solutions**:

1. **Verify AdGuard is running**:
   ```bash
   docker ps | grep adguard
   ```

2. **Check from VPN client**:
   - Must be connected to VPN
   - Try: http://10.13.13.1
   - Don't use https://

3. **Check port binding**:
   ```bash
   docker port n-guard-adguard
   # Should show: 80/tcp -> 0.0.0.0:80
   ```

4. **Access via server**:
   ```bash
   # From server
   curl http://localhost
   # Should return AdGuard page
   ```

5. **Reset AdGuard**:
   ```bash
   docker-compose stop adguard
   sudo rm -rf adguard/work/*
   docker-compose up -d adguard
   # Complete setup wizard again
   ```

---

## Advanced Debugging

### View All Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f n-guard-wireguard
docker logs -f n-guard-adguard
docker logs -f n-guard-unbound

# Last 100 lines
docker-compose logs --tail=100

# System logs
sudo tail -f /var/log/syslog | grep -E 'iptables|wireguard|docker'
```

### Check Network Connectivity

```bash
# From server to internet
ping 1.1.1.1

# From server DNS resolution
nslookup google.com

# From VPN network to server
docker exec n-guard-wireguard ping 10.13.13.1

# From VPN network to AdGuard
docker exec n-guard-wireguard nslookup google.com 10.13.13.1
```

### Packet Capture

```bash
# Install tcpdump
sudo apt install tcpdump

# Capture WireGuard traffic
sudo tcpdump -i wg0 -n

# Capture DNS traffic
sudo tcpdump -i any port 53 -n

# Save to file for analysis
sudo tcpdump -i wg0 -w /tmp/capture.pcap
```

### Reset Everything

If all else fails:

```bash
cd /opt/n-guard-vpn

# Stop all containers
docker-compose down

# Remove all data (WARNING: Deletes configs)
sudo rm -rf wireguard/config/* adguard/work/* adguard/conf/*

# Reset firewall
sudo iptables -F
sudo iptables -t nat -F

# Start fresh
./scripts/setup.sh
```

### Performance Monitoring

```bash
# Server resources
htop

# Docker stats
docker stats

# Network bandwidth
sudo apt install iftop
sudo iftop -i eth0

# Disk I/O
sudo iotop
```

---

## Getting Help

If you're still experiencing issues:

1. **Collect diagnostics**:
   ```bash
   # Run diagnostics
   docker-compose ps > diag.txt
   docker-compose logs --tail=200 >> diag.txt
   sudo iptables -L -n -v >> diag.txt
   sudo iptables -t nat -L -n -v >> diag.txt
   cat .env >> diag.txt  # Remove passwords first!
   ```

2. **Check documentation**:
   - INSTALL.md
   - CLIENT-SETUP.md
   - This file (TROUBLESHOOTING.md)

3. **Community support**:
   - GitHub Issues
   - Reddit: r/WireGuard, r/pihole
   - Discord/Forums

4. **Provide information**:
   - OS version: `cat /etc/os-release`
   - Docker version: `docker --version`
   - Error messages from logs
   - What you've already tried

---

## Common Error Messages

### "bind: address already in use"
- Port conflict (see [Port 53 Already in Use](#port-53-already-in-use))

### "Fatal: Module wireguard not found"
- Missing kernel module (see [WireGuard Module Not Found](#wireguard-module-not-found))

### "permission denied" (Docker)
- User not in docker group (see [Docker Permission Denied](#docker-permission-denied))

### "no such file or directory: /dev/net/tun"
- Container needs NET_ADMIN capability (already in docker-compose.yml)

### "Failed to establish connection" (WireGuard)
- Port forwarding or firewall issue (see [Cannot Connect to VPN](#cannot-connect-to-vpn))

### "DNS resolution failed"
- DNS not configured correctly (see [DNS Issues](#dns-issues))

---

## Prevention Tips

1. **Keep backups**:
   ```bash
   # Run backup script weekly
   ./scripts/backup.sh
   ```

2. **Monitor health**:
   - Check AdGuard dashboard weekly
   - Review Query Log for issues
   - Monitor server resources (CPU/RAM/disk)

3. **Update regularly**:
   ```bash
   # Monthly
   docker-compose pull
   docker-compose up -d
   ```

4. **Test after changes**:
   - Always test VPN after router changes
   - Verify ad blocking after filter updates
   - Check DNS leaks periodically

5. **Document custom changes**:
   - Keep notes of any modifications
   - Helpful for troubleshooting later

---

**Still stuck? Check the logs first, they usually contain the answer!**

```bash
docker-compose logs -f
```
