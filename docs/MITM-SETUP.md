# N-Guard VPN - HTTPS Interception Setup (MITM)

**⚠️ WARNING: Advanced Feature with Security Trade-offs**

This guide explains how to set up HTTPS interception (SSL/TLS man-in-the-middle) to achieve better YouTube ad blocking (~70-80% effectiveness vs ~30-40% DNS-only).

## Table of Contents

1. [Understanding MITM](#understanding-mitm)
2. [Security Considerations](#security-considerations)
3. [Installation](#installation)
4. [Client Configuration](#client-configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Understanding MITM

### What is HTTPS Interception?

**DNS-level blocking** can only block requests to ad domains. YouTube serves ads from the same domains as videos (`googlevideo.com`), making DNS blocking ineffective.

**HTTPS interception** works by:
1. Your device connects to Squid proxy (not directly to YouTube)
2. Squid decrypts HTTPS traffic using your custom CA certificate
3. Squid inspects and blocks ad requests
4. Squid re-encrypts traffic and forwards to YouTube
5. Your device receives video without ads

### Effectiveness

| Method | YouTube Ads Blocked | Trade-offs |
|--------|---------------------|------------|
| DNS-only | 30-40% | No security risks, works everywhere |
| HTTPS interception | 70-80% | Requires CA install, may break apps |

### Why Not 100%?

- Some ads are server-side inserted (can't be blocked by proxy)
- YouTube constantly changes ad endpoints
- Mobile app uses additional anti-blocking techniques

---

## Security Considerations

### Risks

1. **Man-in-the-Middle Attack Vector**:
   - You're essentially performing a MITM attack on yourself
   - If CA private key is stolen, attacker can intercept your HTTPS traffic
   - Must keep CA key secure

2. **App Breakage**:
   - Banking apps often use certificate pinning (will not work)
   - Some apps detect MITM and refuse to connect
   - List of problematic apps below

3. **Privacy**:
   - Squid proxy can see all HTTPS traffic (URLs, data)
   - Logs may contain sensitive information
   - Only use on your own devices

4. **Legal**:
   - Intercepting others' traffic may be illegal
   - Only use on devices you own
   - Inform other users on your network

### Apps Known to Break

These apps use certificate pinning and will NOT work with MITM:

- Most banking apps
- PayPal
- Square Cash
- Instagram (sometimes)
- Twitter (sometimes)
- Facebook Messenger
- Snapchat
- Venmo
- Cryptocurrency wallets
- Many government apps

**Solution**: Disable VPN temporarily when using these apps, or use browser versions.

---

## Installation

### Prerequisites

- Completed basic N-Guard VPN setup
- Server running and accessible
- Understand security risks above

### Step 1: Generate CA Certificate

```bash
cd /opt/n-guard-vpn/squid/certs

# Generate private key
openssl genrsa -out ca-key.pem 4096

# Generate certificate (valid 10 years)
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem \
    -subj "/C=US/ST=State/L=City/O=N-Guard VPN/CN=N-Guard Root CA"

# Set permissions
chmod 600 ca-key.pem
chmod 644 ca-cert.pem

# Verify certificate
openssl x509 -in ca-cert.pem -noout -text
```

**IMPORTANT**: Backup `ca-key.pem` and `ca-cert.pem` to secure location. If lost, you'll need to reinstall on all devices.

### Step 2: Initialize Squid SSL Database

```bash
# Create SSL certificate cache directory
docker-compose run --rm squid \
    /usr/lib/squid/security_file_certgen -c -s /var/lib/ssl_db -M 16MB

# Or if that fails:
mkdir -p squid/ssl_db
chown -R 13:13 squid/ssl_db  # Squid user
```

### Step 3: Enable Squid in Docker Compose

Edit `docker-compose.yml`:

```yaml
# Uncomment the squid service section:
squid:
  image: sameersbn/squid:latest
  container_name: n-guard-squid
  ports:
    - "3128:3128"
  volumes:
    - ./squid/conf/squid.conf:/etc/squid/squid.conf
    - ./squid/conf/no_intercept.txt:/etc/squid/no_intercept.txt
    - ./squid/certs:/etc/squid/certs
    - ./squid/cache:/var/spool/squid
    - ./squid/logs:/var/log/squid
  environment:
    - TZ=Asia/Ho_Chi_Minh
  restart: unless-stopped
  networks:
    vpn_network:
      ipv4_address: 10.13.13.3
```

### Step 4: Start Squid

```bash
cd /opt/n-guard-vpn

# Start Squid service
docker-compose up -d squid

# Check status
docker logs squid

# Should see: "Accepting HTTP Socket connections"
```

### Step 5: Configure Firewall (Optional)

If you want to force all traffic through Squid:

```bash
# Add to firewall/iptables-rules.sh

# Redirect HTTP/HTTPS to Squid proxy
iptables -t nat -A PREROUTING -s 10.13.13.0/24 -p tcp --dport 80 -j DNAT --to-destination 10.13.13.3:3128
iptables -t nat -A PREROUTING -s 10.13.13.0/24 -p tcp --dport 443 -j DNAT --to-destination 10.13.13.3:3128

# Apply rules
sudo ./firewall/iptables-rules.sh
```

**Note**: Forced transparent proxy may cause issues with some apps. Recommended: Configure proxy manually on client instead.

---

## Client Configuration

### iOS (iPhone/iPad)

#### Step 1: Install CA Certificate

1. **Transfer CA certificate to iPhone**:
   ```bash
   # On server, create web server to serve certificate
   cd /opt/n-guard-vpn/squid/certs
   python3 -m http.server 8080
   ```

2. **Download on iPhone**:
   - Connect to VPN first
   - Open Safari
   - Go to: `http://10.13.13.1:8080/ca-cert.pem`
   - Tap "Allow" to download profile

3. **Install Profile**:
   - Go to Settings → General → VPN & Device Management
   - Tap "N-Guard Root CA" profile
   - Tap "Install" (top right)
   - Enter passcode
   - Tap "Install" again (warning will appear)
   - Tap "Install" one more time
   - Tap "Done"

4. **Enable Full Trust**:
   - Go to Settings → General → About → Certificate Trust Settings
   - Enable "N-Guard Root CA"
   - Tap "Continue" on warning

#### Step 2: Configure Proxy

**Option A: Manual Proxy (Recommended)**

1. Go to Settings → Wi-Fi
2. Tap (i) next to your current Wi-Fi
3. Scroll to "HTTP PROXY"
4. Select "Manual"
5. Configure:
   - Server: `10.13.13.3`
   - Port: `3128`
   - Authentication: Off
6. Save

**Note**: Proxy only works when connected to that Wi-Fi. For VPN, configure in WireGuard client (advanced).

**Option B: Transparent Proxy**

If you configured firewall redirection (Step 5 above), no client config needed.

### Android

#### Step 1: Install CA Certificate

1. **Transfer certificate**:
   ```bash
   # On server
   cd /opt/n-guard-vpn/squid/certs
   python3 -m http.server 8080
   ```

2. **Download on Android**:
   - Connect to VPN
   - Open browser
   - Go to: `http://10.13.13.1:8080/ca-cert.pem`
   - Download file

3. **Install**:
   - Go to Settings → Security → Encryption & credentials
   - Tap "Install a certificate"
   - Choose "CA certificate"
   - Tap "Install anyway" (warning)
   - Select downloaded `ca-cert.pem`
   - Name it "N-Guard CA"

#### Step 2: Configure Proxy

1. Settings → Wi-Fi
2. Long-press your Wi-Fi network
3. Choose "Modify network"
4. Tap "Advanced options"
5. Proxy: Manual
6. Configure:
   - Proxy hostname: `10.13.13.3`
   - Proxy port: `3128`
7. Save

### macOS

#### Step 1: Install CA Certificate

```bash
# Download from server
scp user@server:/opt/n-guard-vpn/squid/certs/ca-cert.pem ~/Desktop/

# Install
sudo security add-trusted-cert -d -r trustRoot \
    -k /Library/Keychains/System.keychain ~/Desktop/ca-cert.pem

# Or double-click ca-cert.pem and use Keychain Access app
```

#### Step 2: Configure Proxy

System Preferences → Network → Advanced → Proxies:
- Enable "Web Proxy (HTTP)"
- Enable "Secure Web Proxy (HTTPS)"
- Server: `10.13.13.3`
- Port: `3128`

### Windows

#### Step 1: Install CA Certificate

1. Copy `ca-cert.pem` to Windows machine
2. Rename to `ca-cert.crt`
3. Right-click → Install Certificate
4. Store Location: Local Machine
5. Place in: Trusted Root Certification Authorities
6. Finish

#### Step 2: Configure Proxy

Control Panel → Internet Options → Connections → LAN settings:
- Check "Use a proxy server"
- Address: `10.13.13.3`
- Port: `3128`
- Check "Bypass proxy server for local addresses"

---

## Testing

### 1. Verify CA is Installed

**iOS**: Settings → General → About → Certificate Trust Settings
- Should show "N-Guard Root CA" enabled

**Android**: Settings → Security → Trusted credentials → User
- Should show "N-Guard CA"

**Desktop**: Visit https://badssl.com/ - should show valid certificate

### 2. Test HTTPS Interception

```bash
# On server, watch Squid logs
docker logs -f squid

# From client, visit HTTPS site
# Should see entries in Squid logs
```

### 3. Test YouTube Ad Blocking

1. Open YouTube on client device
2. Watch a video
3. Check Squid logs:
   ```bash
   docker exec squid tail -f /var/log/squid/ads_blocked.log
   ```
4. Should see blocked ad requests

### 4. Check for Broken Apps

Test each important app:
- Banking apps (likely broken)
- Social media
- Email
- Messaging

If app doesn't work:
- Add domain to `squid/conf/no_intercept.txt`
- Restart Squid: `docker-compose restart squid`

---

## Troubleshooting

### Certificate Not Trusted

**iOS**: "This Connection Is Not Private"

- Verify CA is installed in Certificate Trust Settings
- Ensure trust is enabled for Root CA
- Try reinstalling certificate

**Android**: "Your connection is not private"

- Install as "CA certificate" not "VPN certificate"
- Check Security → Trusted credentials → User tab

### Apps Breaking

**Banking apps not working**:

Add to `squid/conf/no_intercept.txt`:
```
\.yourbank\.com$
```

Restart Squid:
```bash
docker-compose restart squid
```

**All apps breaking**:

Check Squid logs:
```bash
docker logs squid
```

Look for SSL errors. May need to add more domains to no_intercept.txt.

### YouTube Ads Still Showing

**Reality check**: Not all YouTube ads can be blocked. Expected effectiveness: 70-80%.

**Improvements**:

1. Update Squid rules:
   ```bash
   # Edit squid/conf/squid.conf
   # Add more YouTube ad patterns to youtube_ad_url ACL
   ```

2. Monitor blocked requests:
   ```bash
   tail -f squid/logs/ads_blocked.log
   ```

3. Add custom rules based on logs

### Squid Not Starting

Check logs:
```bash
docker logs squid
```

Common issues:
- SSL DB not initialized: Re-run Step 2
- Certificate permissions: `chmod 600 ca-key.pem`
- Port 3128 in use: Change port in docker-compose.yml

### Performance Issues

MITM adds overhead:

1. **Increase cache**:
   ```conf
   # In squid.conf
   cache_mem 512 MB
   maximum_object_size 2048 MB
   ```

2. **Disable logging** (temporary):
   ```conf
   access_log none
   ```

3. **Monitor resources**:
   ```bash
   docker stats squid
   ```

---

## Disabling MITM

### Temporary (Quick Test)

```bash
# Stop Squid
docker-compose stop squid

# Remove proxy from client device
# (See client configuration sections above)
```

### Permanent

```bash
# Stop and remove Squid
docker-compose stop squid
docker-compose rm squid

# Comment out squid service in docker-compose.yml

# Remove CA from devices:
# - iOS: Settings → General → VPN & Device Management → Delete Profile
# - Android: Settings → Security → Trusted credentials → Remove
# - macOS: Keychain Access → Delete certificate
# - Windows: Certificate Manager → Delete certificate
```

---

## Best Practices

1. **Secure the CA key**:
   ```bash
   # Backup to encrypted USB drive
   # Set restrictive permissions
   chmod 600 /opt/n-guard-vpn/squid/certs/ca-key.pem
   ```

2. **Rotate certificate** periodically (every 1-2 years):
   - Generate new CA
   - Reinstall on all devices

3. **Monitor logs** for suspicious activity:
   ```bash
   tail -f squid/logs/access.log
   ```

4. **Keep no_intercept.txt updated**:
   - Add domains that break
   - Check certificate pinning lists online

5. **Document everything**:
   - Which devices have CA installed
   - Which apps are broken
   - Custom rules added

---

## Alternatives to MITM

If MITM is too complex or risky:

1. **YouTube Premium** ($11.99/month): 100% effective, no setup

2. **Browser Extensions** (Desktop):
   - uBlock Origin: Very effective on browsers
   - SponsorBlock: Skip sponsored segments

3. **Alternative Clients**:
   - NewPipe (Android): Open-source YouTube client without ads
   - YouTube Vanced (Android): Unofficial mod (use at own risk)

4. **Accept DNS-blocking limitations**: 30-40% is better than nothing

---

## Conclusion

HTTPS interception is a powerful but complex solution with security trade-offs. Only implement if:

- You understand the risks
- You own all devices using it
- You're willing to manage broken apps
- YouTube ads are a major concern

For most users, **DNS-level blocking (default) is sufficient** for web ads. MITM is optional for those who want better YouTube blocking.

---

## Security Reminder

🔐 **Your CA private key is like a master password**

- Never share `ca-key.pem`
- Keep backups encrypted
- If compromised: Regenerate immediately and reinstall on all devices
- Consider this: Anyone with your CA key can impersonate any HTTPS website to you

Use responsibly! 🛡️
