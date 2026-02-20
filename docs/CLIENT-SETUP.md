# N-Guard VPN - Client Setup Guide

How to configure WireGuard VPN on various devices to connect to your N-Guard VPN server.

## Table of Contents

1. [iOS (iPhone/iPad)](#ios-iphoneipad)
2. [Android](#android)
3. [macOS](#macos)
4. [Windows](#windows)
5. [Linux](#linux)
6. [Testing Connection](#testing-connection)

---

## iOS (iPhone/iPad)

### Method 1: QR Code (Easiest)

1. **Get WireGuard QR Code**:
   ```bash
   # On your server
   docker exec n-guard-wireguard /app/show-peer 1
   ```
   This displays a QR code in your terminal.

2. **Install WireGuard App**:
   - Open App Store
   - Search "WireGuard"
   - Install official WireGuard app (by WireGuard Development Team)

3. **Add Tunnel**:
   - Open WireGuard app
   - Tap "+" button (top right)
   - Select "Create from QR code"
   - Scan the QR code displayed on your server
   - Name your tunnel (e.g., "Home VPN")
   - Tap "Save"

4. **Connect**:
   - Toggle the switch to enable VPN
   - First connection will ask for permission - allow it
   - Status should show "Active"

### Method 2: Manual Configuration

1. **Get Config File**:
   ```bash
   # On server
   cat wireguard/config/peer1/peer1.conf
   ```

2. **Create Tunnel in App**:
   - Open WireGuard app
   - Tap "+" → "Create from scratch"
   - Enter tunnel name
   - Copy/paste each section from config file:
     - Interface: PrivateKey, Address, DNS
     - Peer: PublicKey, Endpoint, AllowedIPs, PersistentKeepalive

3. **Save and Connect**

### iOS Settings

Recommended settings for iOS:

```ini
[Interface]
PrivateKey = <your-private-key>
Address = 10.13.13.2/32
DNS = 10.13.13.1  # AdGuard DNS

[Peer]
PublicKey = <server-public-key>
Endpoint = your-server-ip:51820
AllowedIPs = 0.0.0.0/0, ::/0  # Full tunnel - all traffic
PersistentKeepalive = 25       # Keep connection alive
```

### iOS Troubleshooting

**VPN not connecting?**
- Check Settings → VPN - should show WireGuard
- Verify internet connection without VPN first
- Try disabling and re-enabling

**Apps not working?**
- Disable "Block connections without VPN" if issues persist
- Some banking apps may detect VPN - this is normal

---

## Android

### Method 1: QR Code

1. **Install WireGuard**:
   - Open Google Play Store
   - Search "WireGuard"
   - Install official WireGuard app

2. **Get QR Code**:
   ```bash
   docker exec n-guard-wireguard /app/show-peer 2
   ```

3. **Add Tunnel**:
   - Open WireGuard app
   - Tap "+" button (bottom right)
   - Select "Scan from QR code"
   - Scan QR code
   - Name tunnel
   - Tap "Create tunnel"

4. **Connect**:
   - Toggle switch to connect
   - Grant VPN permission if prompted

### Method 2: Import Config File

1. **Transfer Config File**:
   ```bash
   # On server
   cat wireguard/config/peer2/peer2.conf

   # Send to phone via email or file transfer
   ```

2. **Import**:
   - Open WireGuard app
   - Tap "+" → "Import from file or archive"
   - Select config file
   - Tap "Create tunnel"

### Android Settings

For always-on VPN:
- Settings → Network & Internet → VPN
- Tap gear icon next to WireGuard
- Enable "Always-on VPN"
- Enable "Block connections without VPN" (optional)

---

## macOS

### Method 1: WireGuard App

1. **Install WireGuard**:
   ```bash
   # Via Homebrew
   brew install --cask wireguard-tools

   # Or download from https://www.wireguard.com/install/
   ```

2. **Import Config**:
   ```bash
   # On server, display config
   cat wireguard/config/peer3/peer3.conf

   # On Mac, create file
   nano ~/Desktop/home-vpn.conf
   # Paste config content

   # Import in WireGuard app
   # Open WireGuard app → Import tunnel(s) from file
   ```

3. **Connect**:
   - Select tunnel
   - Click "Activate"

### Method 2: Command Line

```bash
# Install WireGuard tools
brew install wireguard-tools

# Copy config file from server
scp user@server:/opt/n-guard-vpn/wireguard/config/peer3/peer3.conf ~/wireguard/home-vpn.conf

# Start VPN
sudo wg-quick up ~/wireguard/home-vpn.conf

# Stop VPN
sudo wg-quick down ~/wireguard/home-vpn.conf

# Check status
sudo wg show
```

---

## Windows

### Method 1: WireGuard App

1. **Download WireGuard**:
   - Visit https://www.wireguard.com/install/
   - Download Windows installer
   - Run installer (requires admin)

2. **Import Config**:
   ```bash
   # On server
   cat wireguard/config/peer4/peer4.conf
   ```

   - Open WireGuard app
   - Click "Add Tunnel" → "Add empty tunnel"
   - Copy/paste config content
   - Or: "Import tunnel(s) from file" if you have .conf file

3. **Connect**:
   - Select tunnel
   - Click "Activate"

### Windows Troubleshooting

**Activation failed?**
- Run WireGuard as Administrator
- Check Windows Defender Firewall settings
- Temporarily disable other VPN software

**No internet after connecting?**
- Check DNS settings in tunnel config
- Verify `DNS = 10.13.13.1` is set

---

## Linux

### Ubuntu/Debian

```bash
# Install WireGuard
sudo apt update
sudo apt install wireguard wireguard-tools

# Copy config from server
sudo scp user@server:/opt/n-guard-vpn/wireguard/config/peer5/peer5.conf /etc/wireguard/home-vpn.conf

# Set permissions
sudo chmod 600 /etc/wireguard/home-vpn.conf

# Start VPN
sudo wg-quick up home-vpn

# Enable on boot (optional)
sudo systemctl enable wg-quick@home-vpn

# Check status
sudo wg show

# Stop VPN
sudo wg-quick down home-vpn
```

### Alternative: NetworkManager (GUI)

```bash
# Install plugin
sudo apt install network-manager-wireguard

# Add VPN connection:
# Settings → Network → VPN → + → Import from file
# Select .conf file
```

---

## Testing Connection

### 1. Check VPN Status

**On client device:**

iOS/Android:
- WireGuard app should show "Active" with data transfer stats

Desktop:
```bash
# Linux/macOS
sudo wg show

# Should show:
# - interface: your tunnel name
# - peer: server public key
# - latest handshake: recent timestamp
# - transfer: increasing data counters
```

### 2. Verify IP Address

Visit: https://whatismyip.com

- Should show your **home/server IP**, not your device's mobile/current IP
- If it shows your real IP, VPN is not working

### 3. Check DNS Leak

Visit: https://dnsleaktest.com

- Click "Extended test"
- Should show **only your home/server IP**
- DNS servers should be your AdGuard server
- If it shows ISP DNS servers = **DNS leak detected**

Alternative test:
```bash
# From client device terminal
nslookup google.com

# Should show:
# Server: 10.13.13.1 (AdGuard)
```

### 4. Test Ad Blocking

Visit: https://d3ward.github.io/toolz/adblock.html

Expected results:
- Should block **>90%** of ad domains
- Most entries should show "✓ Blocked"

Alternative test sites:
- https://ads-blocker.com/testing/
- https://canyoublockit.com/

### 5. Test YouTube (Optional)

**Without MITM (DNS-level only):**
- YouTube website: Some ads may still appear (30-40% blocked)
- YouTube app: Most ads will still appear (limited effectiveness)

**With MITM enabled:**
- YouTube website: Most ads blocked (70-80%)
- YouTube app: Better blocking but not 100%

### 6. Performance Test

Visit: https://speedtest.net

**Expected impact:**
- Download speed: >80% of baseline (without VPN)
- Upload speed: >80% of baseline
- Ping: +5-20ms increase (acceptable)
- If much slower: Check server CPU usage, network bandwidth

### 7. Check AdGuard Statistics

Visit: `http://10.13.13.1` (while connected to VPN)

- Dashboard should show your queries
- View blocked domains in Query Log
- Check Statistics for blocking percentage

---

## Multiple Devices

You can connect multiple devices simultaneously. Each device should use a separate peer config:

- **peer1**: iPhone
- **peer2**: Android phone
- **peer3**: Laptop
- **peer4**: Tablet
- etc.

Generate more peers if needed:
```bash
# Edit .env file
NUM_PEERS=5  # Increase number

# Restart WireGuard
docker-compose restart wireguard

# View new peer
docker exec n-guard-wireguard /app/show-peer 5
```

---

## Split Tunnel vs Full Tunnel

### Full Tunnel (Default - Recommended)

```ini
AllowedIPs = 0.0.0.0/0, ::/0
```

**Pros:**
- All traffic protected and filtered
- Complete DNS leak prevention
- Hide IP from all services

**Cons:**
- All traffic goes through home internet
- May be slower for international sites

### Split Tunnel (Advanced)

```ini
# Only route specific networks through VPN
AllowedIPs = 10.13.13.0/24, 192.168.1.0/24
```

**Pros:**
- Faster for general browsing
- Only specified traffic goes through VPN

**Cons:**
- No ad blocking for most sites
- Potential DNS leaks
- IP not hidden

**Not recommended** unless you have specific needs.

---

## On-Demand Connection (iOS/Android)

### iOS

Settings → General → VPN & Device Management → VPN → (i)

Enable:
- Connect On Demand
- Add rule: "Connect" when on Wi-Fi or Cellular

### Android

Settings → Network & Internet → VPN

Enable:
- Always-on VPN
- Block connections without VPN (optional)

---

## Troubleshooting

### Cannot Connect

1. **Check server status**:
   ```bash
   docker-compose ps
   # All should be "Up"
   ```

2. **Check port forwarding**: UDP port 51820 on router

3. **Verify endpoint**: Use public IP or DDNS, not local IP

4. **Check firewall**: `sudo iptables -L -n | grep 51820`

### Connected But No Internet

1. **Check DNS**: Should be `10.13.13.1` in config

2. **Test DNS resolution**:
   ```bash
   nslookup google.com
   ```

3. **Check AllowedIPs**: Should be `0.0.0.0/0, ::/0` for full tunnel

4. **Check server routing**:
   ```bash
   sudo iptables -t nat -L POSTROUTING
   # Should show MASQUERADE rule
   ```

### Slow Performance

1. **Check server CPU**: `htop` on server (should be <70%)

2. **Test server bandwidth**: Run speedtest on server

3. **Reduce MTU** in config:
   ```ini
   [Interface]
   MTU = 1280  # Try lower value
   ```

4. **Check distance**: Latency increases with physical distance to server

### DNS Leak Detected

1. **Verify DNS setting** in WireGuard config:
   ```ini
   DNS = 10.13.13.1
   ```

2. **Check DNS redirect rules** on server:
   ```bash
   sudo iptables -t nat -L PREROUTING | grep 53
   ```

3. **Disable IPv6** if issues persist:
   ```ini
   # Remove IPv6 from AllowedIPs
   AllowedIPs = 0.0.0.0/0  # Remove ::/0
   ```

### Apps Not Working (Banking, etc.)

Some apps detect VPN and may block access. This is normal security behavior.

**Options:**
1. **Disable VPN temporarily** for that app
2. **Use browser** instead of app (if available)
3. **Contact app support** - some allow VPN in settings
4. **Split tunnel** (exclude specific apps - advanced)

---

## Best Practices

1. **Use strong WiFi password**: Your VPN is only as secure as your home network

2. **Keep configs private**: Treat WireGuard keys like passwords

3. **Monitor connection**: Check AdGuard stats occasionally to ensure it's working

4. **Update regularly**: Run `docker-compose pull && docker-compose up -d` monthly

5. **Test periodically**: Use dnsleaktest.com and adblock test sites

6. **Backup configs**: Keep WireGuard configs in safe location (password manager)

---

## Next Steps

- Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues
- Set up HTTPS interception for YouTube blocking: [MITM-SETUP.md](MITM-SETUP.md)
- Customize AdGuard filters via web UI
- Monitor performance and blocked queries

---

**Enjoy your ad-free, private internet! 🎉**
