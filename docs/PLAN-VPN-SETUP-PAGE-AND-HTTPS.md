# Plan: VPN Setup Page & HTTPS Support

## Overview

This document outlines the implementation plan for two features:
1. **VPN Setup Page** - A web page to help users configure VPN clients
2. **HTTPS Support** - Enable secure HTTPS connections for the web manager

---

## Feature 1: VPN Setup Page

### Goal
Create a user-friendly web page that allows users to:
- View available VPN peer configurations
- Display QR codes for mobile device setup
- Download configuration files for desktop clients
- View setup instructions for different platforms (iOS, Android, Windows, macOS, Linux)

### Current State
- WireGuard container uses `linuxserver/wireguard` image
- Peer configs are stored in `/opt/n-guard-vpn/wireguard/config/`
- Each peer has: `peer1/`, `peer2/`, etc. with `.conf` and `.png` (QR) files
- Container can generate QR codes via: `docker exec n-guard-wireguard /app/show-peer <peer_number>`

### Implementation Plan

#### 1. Backend: New API Endpoints

**File:** `web-manager/src/routes/api.js`

```javascript
// VPN/WireGuard endpoints
GET  /api/vpn/status          - WireGuard server status
GET  /api/vpn/peers           - List all configured peers
GET  /api/vpn/peers/:id       - Get specific peer details
GET  /api/vpn/peers/:id/qr    - Get QR code image for peer
GET  /api/vpn/peers/:id/conf  - Download .conf file for peer
POST /api/vpn/peers           - Create new peer (optional, advanced)
DELETE /api/vpn/peers/:id     - Remove peer (optional, advanced)
```

#### 2. Backend: New Service

**File:** `web-manager/src/services/wireguardService.js`

```javascript
class WireGuardService {
  // Get WireGuard server status
  async getStatus() {
    // Execute: docker exec n-guard-wireguard wg show
    // Parse output for: interface, public key, listening port, peers
  }

  // List all peers with their configs
  async listPeers() {
    // Read /config/peer* directories
    // For each peer: read .conf, check for .png QR
    // Return: [{id, name, config, hasQR, lastHandshake}]
  }

  // Get specific peer details
  async getPeer(peerId) {
    // Read peer config file
    // Parse: Address, DNS, AllowedIPs, Endpoint
  }

  // Get QR code for peer
  async getQRCode(peerId) {
    // Option 1: Read existing PNG from /config/peer{id}/peer{id}.png
    // Option 2: Generate using qrencode library
    // Return: base64 encoded image or file path
  }

  // Get config file content
  async getConfig(peerId) {
    // Read /config/peer{id}/peer{id}.conf
    // Return: raw config content for download
  }
}
```

#### 3. Backend: New Controller

**File:** `web-manager/src/controllers/vpnController.js`

```javascript
class VPNController {
  async getStatus(req, res, next) { ... }
  async listPeers(req, res, next) { ... }
  async getPeer(req, res, next) { ... }
  async getQRCode(req, res, next) { ... }
  async downloadConfig(req, res, next) { ... }
}
```

#### 4. Frontend: New Page

**File:** `web-manager/views/vpn-setup.ejs`

**Layout:**
```
+------------------------------------------+
|  Header (existing)                       |
+------------------------------------------+
|                                          |
|  VPN Setup Guide                         |
|  ================                        |
|                                          |
|  Server Status: [Connected/Offline]      |
|  Public Endpoint: vpn.example.com:51820  |
|                                          |
|  +------------------------------------+  |
|  |  Your VPN Configurations          |  |
|  +------------------------------------+  |
|  |  [Peer 1] [Peer 2] [Peer 3] tabs  |  |
|  +------------------------------------+  |
|  |                                    |  |
|  |  +------------+   Config Details   |  |
|  |  |            |   Name: peer1      |  |
|  |  |  QR Code   |   IP: 10.13.13.2   |  |
|  |  |            |   DNS: 10.13.13.1  |  |
|  |  +------------+                    |  |
|  |                                    |  |
|  |  [Download .conf] [Copy Config]    |  |
|  +------------------------------------+  |
|                                          |
|  +------------------------------------+  |
|  |  Setup Instructions               |  |
|  +------------------------------------+  |
|  |  [iOS] [Android] [Windows] [Mac]  |  |
|  +------------------------------------+  |
|  |  Step-by-step guide for selected  |  |
|  |  platform with screenshots...     |  |
|  +------------------------------------+  |
|                                          |
+------------------------------------------+
|  Footer (existing)                       |
+------------------------------------------+
```

**Features:**
- Tabbed interface for multiple peers
- QR code display (scannable from page)
- One-click config download
- Copy-to-clipboard for config
- Platform-specific setup guides
- Connection status indicator

#### 5. Frontend: JavaScript

**File:** `web-manager/public/js/vpn-setup.js`

```javascript
// Functions:
- loadPeers()           // Fetch and display peer list
- selectPeer(id)        // Switch active peer tab
- loadQRCode(id)        // Load and display QR code
- downloadConfig(id)    // Trigger config file download
- copyConfig(id)        // Copy config to clipboard
- showInstructions(os)  // Show OS-specific setup guide
```

#### 6. Route Registration

**File:** `web-manager/src/routes/pages.js`

```javascript
router.get('/vpn-setup', async (req, res, next) => {
  // Render vpn-setup.ejs with peer data
});
```

#### 7. Navigation Update

**File:** `web-manager/views/partials/header.ejs`

Add new navigation item:
```html
<a href="/vpn-setup">VPN Setup</a>
```

### File Structure

```
web-manager/
├── src/
│   ├── controllers/
│   │   └── vpnController.js        # NEW
│   ├── services/
│   │   └── wireguardService.js     # NEW
│   └── routes/
│       ├── api.js                  # MODIFY (add VPN routes)
│       └── pages.js                # MODIFY (add /vpn-setup)
├── views/
│   ├── vpn-setup.ejs               # NEW
│   └── partials/
│       └── header.ejs              # MODIFY (add nav link)
└── public/
    └── js/
        └── vpn-setup.js            # NEW
```

### Dependencies
- None (uses existing Docker exec capabilities)
- Optional: `qrcode` npm package for generating QR codes server-side

### Security Considerations
- Config files contain private keys - serve only over localhost/VPN
- Rate limit QR code and config download endpoints
- Consider adding simple auth for VPN config access

---

## Feature 2: HTTPS Support

### Goal
Enable HTTPS for the web manager to:
- Encrypt traffic between browser and server
- Allow secure access over the network
- Enable modern browser features that require HTTPS

### Options Comparison

| Option | Pros | Cons | Complexity |
|--------|------|------|------------|
| **A: Self-signed cert** | Simple, no external deps | Browser warnings | Low |
| **B: Let's Encrypt** | Trusted cert, free | Needs domain, port 80 | Medium |
| **C: Reverse proxy (Caddy)** | Auto HTTPS, easy config | Extra container | Medium |
| **D: Reverse proxy (AdGuard)** | Already running | Limited config | Low |

### Recommended: Option A (Self-signed) + Option C (Caddy) as upgrade path

#### Phase 1: Self-Signed Certificate (Quick Setup)

**1. Generate certificates on build**

**File:** `web-manager/Dockerfile` (modify)

```dockerfile
# Add openssl for certificate generation
RUN apk add --no-cache docker-cli bash curl wget tar openssl

# Generate self-signed cert if not exists
RUN mkdir -p /app/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /app/certs/server.key \
    -out /app/certs/server.crt \
    -subj "/C=US/ST=State/L=City/O=N-Guard/CN=nguardvpn.local"
```

**2. Update Express server for HTTPS**

**File:** `web-manager/server.js` (modify)

```javascript
const https = require('https');
const http = require('http');
const fs = require('fs');

// ... existing code ...

const HTTP_PORT = process.env.PORT || 8080;
const HTTPS_PORT = process.env.HTTPS_PORT || 8443;

// HTTP server (redirect to HTTPS or serve directly)
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP server on port ${HTTP_PORT}`);
});

// HTTPS server
try {
  const httpsOptions = {
    key: fs.readFileSync('/app/certs/server.key'),
    cert: fs.readFileSync('/app/certs/server.crt')
  };

  https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`HTTPS server on port ${HTTPS_PORT}`);
  });
} catch (err) {
  console.warn('HTTPS not available:', err.message);
}
```

**3. Update docker-compose.yml**

```yaml
web-manager:
  # ... existing config ...
  ports:
    - "8080:8080"    # HTTP
    - "8443:8443"    # HTTPS
  volumes:
    # ... existing volumes ...
    - ./web-manager/certs:/app/certs  # Persist certs
```

**4. Update .env.template**

```bash
# HTTPS Configuration
HTTPS_PORT=8443
HTTPS_ENABLED=true
```

#### Phase 2: Let's Encrypt with Caddy (Production Setup)

**1. Add Caddy service to docker-compose.yml**

```yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: n-guard-caddy
    ports:
      - "443:443"
      - "80:80"      # Needed for ACME challenge
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./caddy/data:/data
      - ./caddy/config:/config
    environment:
      - DOMAIN=${PUBLIC_IP_OR_DDNS}
    restart: unless-stopped
    networks:
      vpn_network:
        ipv4_address: 10.13.13.6
    depends_on:
      - web-manager
      - adguard
```

**2. Create Caddyfile**

**File:** `caddy/Caddyfile`

```
{$DOMAIN} {
    # Web Manager
    handle /nguard/* {
        reverse_proxy n-guard-manager:8080
    }

    # AdGuard Home (default)
    handle {
        reverse_proxy n-guard-adguard:80
    }

    # Automatic HTTPS with Let's Encrypt
    tls {
        dns cloudflare {env.CF_API_TOKEN}  # Optional: for wildcard
    }
}
```

**3. Access URLs**
- `https://yourdomain.com/` → AdGuard Home
- `https://yourdomain.com/nguard/` → N-Guard Manager

### File Structure for HTTPS

```
n-guard-vpn/
├── web-manager/
│   ├── server.js                 # MODIFY (add HTTPS)
│   ├── Dockerfile                # MODIFY (add openssl)
│   └── certs/                    # NEW (generated certs)
│       ├── server.key
│       └── server.crt
├── caddy/                        # NEW (Phase 2)
│   ├── Caddyfile
│   ├── data/
│   └── config/
└── docker-compose.yml            # MODIFY (add ports, caddy)
```

### Security Considerations
- Self-signed certs will show browser warning (acceptable for local use)
- Let's Encrypt requires a public domain name
- Private keys should have restricted permissions (600)
- Consider HTTP→HTTPS redirect

---

## Implementation Order

### Phase 1: VPN Setup Page (Priority: High)
1. Create `wireguardService.js`
2. Create `vpnController.js`
3. Add API routes
4. Create `vpn-setup.ejs` page
5. Create `vpn-setup.js` frontend
6. Update navigation
7. Test with running WireGuard container

### Phase 2: Self-Signed HTTPS (Priority: Medium)
1. Update Dockerfile with openssl
2. Modify server.js for dual HTTP/HTTPS
3. Update docker-compose.yml ports
4. Rebuild and test
5. Document browser warning workaround

### Phase 3: Production HTTPS with Caddy (Priority: Low)
1. Create Caddy configuration
2. Add Caddy to docker-compose.yml
3. Configure DNS/domain
4. Test Let's Encrypt certificate issuance
5. Update documentation

---

## Estimated Effort

| Task | Effort |
|------|--------|
| VPN Setup Page - Backend | 2-3 hours |
| VPN Setup Page - Frontend | 2-3 hours |
| VPN Setup Page - Testing | 1 hour |
| Self-Signed HTTPS | 1-2 hours |
| Caddy Integration | 2-3 hours |
| Documentation | 1-2 hours |

**Total: 9-14 hours**

---

## Success Criteria

### VPN Setup Page
- [x] Page loads at `/vpn-setup`
- [x] Shows list of configured peers
- [x] Displays QR codes for each peer (requires auth)
- [x] Config download works (requires auth)
- [x] Copy to clipboard works (requires auth)
- [x] Platform instructions are clear (iOS, Android, Windows, macOS, Linux)
- [x] Mobile responsive
- [x] Authentication required for sensitive operations
- [x] Create/delete peer functionality (requires auth)

### HTTPS
- [x] HTTPS available on port 8443
- [x] Self-signed certificate auto-generated on first start
- [x] HTTP continues to work on 8080
- [x] Certificate includes localhost and container IP SANs

---

## Questions to Clarify

1. **VPN Setup Page:**
   - Should users be able to create/delete peers from the web UI?
   - Should we add authentication to protect config downloads?
   - Do we need to support peer renaming?

2. **HTTPS:**
   - Is self-signed certificate acceptable, or do you need Let's Encrypt?
   - Do you have a domain name for Let's Encrypt?
   - Should HTTP redirect to HTTPS automatically?
