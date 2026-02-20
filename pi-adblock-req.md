# N-Guard VPN: Requirements & Technical Specification Document

**Project:** Network-Wide Ad-Blocking VPN Solution
**Target Platform:** Raspberry Pi 4, miniPC, or Linux-based devices
**Primary Client:** iOS (iPhone/iPad) with multi-platform support
**Version:** 1.0
**Date:** February 2026

---

## Executive Summary

This document outlines the technical requirements and specifications for developing a comprehensive ad-blocking VPN solution that transforms a Raspberry Pi 4 or miniPC into a network-wide ad blocker and privacy-focused VPN server. The solution will provide DNS-level filtering, optional HTTPS interception, and complete privacy protection for all connected devices, with primary focus on iOS platform compatibility.

**Key Objective:** Deploy a self-hosted proxy/VPN server capable of blocking network-wide advertisements for all devices (prioritizing iPhone) through VPN connectivity. The solution includes DNS-level blocking (AdGuard Home), optional HTTP(S) proxy capabilities, and evaluation of YouTube in-stream advertisement blocking effectiveness.

**Critical Limitation:** Complete (100%) YouTube ad blocking is technically infeasible using DNS-level filtering alone. HTTPS interception (requiring Certificate Authority installation on client devices) or client-side browser extensions are required for enhanced YouTube ad blocking. YouTube Premium remains the only solution offering 100% ad removal.

---

## 1. Requirements & Constraints

### 1.1 Functional Requirements

#### FR1: Network-Wide Ad Blocking
- **Priority:** Critical
- **Description:** Block advertisements for all devices connected via VPN
- **Target:** iOS (iPhone/iPad) as primary platform, with support for Android, macOS, Windows, Linux
- **Success Criteria:** >90% of DNS-queryable ad domains blocked

#### FR2: Infrastructure Requirements
- **Hardware:** Raspberry Pi 4 (4GB+ RAM recommended) or equivalent miniPC/x86 device
- **Operating System:** Linux-based (Raspberry Pi OS 64-bit, Debian, or Ubuntu)
- **Deployment:** Self-hosted, on-premises solution (no cloud services)
- **Network:** Home router with port forwarding capability

#### FR3: Remote Management
- **Interface:** Web-based GUI for configuration and monitoring
- **Access:** SSH access for system administration
- **Monitoring:** Real-time statistics and query logs

#### FR4: Performance Requirements
- **Latency:** Minimal impact on network performance (<20ms increase)
- **Throughput:** Support HD video streaming (1080p) without buffering
- **Concurrent Users:** Support 3-6 simultaneous VPN connections
- **System Load:** CPU utilization <70% under typical household workload

### 1.2 Technical Constraints

#### TC1: DNS-Level Blocking Limitations
- **Constraint:** DNS filtering cannot block advertisements served from the same domain as legitimate content
- **Impact:** YouTube in-stream ads will largely bypass DNS-level blocking (~30-40% effectiveness)
- **Mitigation:** Optional HTTPS interception or client-side filtering required for enhanced blocking

#### TC2: HTTPS Interception Trade-offs
- **Requirement:** Installing custom Certificate Authority (CA) on client devices
- **User Impact:** Requires user interaction and understanding of security implications
- **Security Risk:** Potential for breaking certificate-pinned applications (banking apps, etc.)
- **Implementation:** Optional feature, not enabled by default

#### TC3: Hardware Performance
- **Platform:** Raspberry Pi 4 sufficient for household/small-scale deployment
- **Limitation:** HTTPS interception at high throughput is CPU-intensive
- **Recommendation:** Consider x86 miniPC for enhanced performance if HTTPS interception is required with multiple concurrent streams

### 1.3 Non-Functional Requirements

#### NFR1: Reliability
- **Uptime:** 99%+ availability target
- **Fault Tolerance:** Automatic service restart on failure
- **Health Monitoring:** Periodic health checks (5-minute intervals)

#### NFR2: Maintainability
- **Updates:** Automated daily blocklist updates
- **Backups:** Weekly configuration backups
- **Documentation:** Comprehensive installation, configuration, and troubleshooting guides

#### NFR3: Security
- **Encryption:** WireGuard VPN with modern cryptography
- **DNS Privacy:** No third-party DNS logging (local recursive resolver)
- **DNS Leak Prevention:** Forced DNS routing through filtering system

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐
│  iOS Client     │  (iPhone/iPad)
│  WireGuard App  │
└────────┬────────┘
         │ Encrypted VPN Tunnel
         │ UDP Port 51820
         ↓
┌────────────────────────────────────────────┐
│         Raspberry Pi 4 / miniPC            │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  WireGuard Server                    │ │
│  │  - Full-tunnel or split-tunnel       │ │
│  └──────────┬───────────────────────────┘ │
│             ↓                              │
│  ┌──────────────────────────────────────┐ │
│  │  AdGuard Home                        │ │
│  │  - DNS filtering engine              │ │
│  │  - Blocklist management              │ │
│  │  - Web UI (port 80)                  │ │
│  │  - DHCP server (optional)            │ │
│  └──────────┬───────────────────────────┘ │
│             ↓                              │
│  ┌──────────────────────────────────────┐ │
│  │  Unbound DNS Resolver                │ │
│  │  - Local recursive resolver          │ │
│  │  - Privacy-focused (no upstream DNS) │ │
│  │  - DNS-over-HTTPS upstream option    │ │
│  └──────────┬───────────────────────────┘ │
│             ↓                              │
│  ┌──────────────────────────────────────┐ │
│  │  Optional: Squid Proxy               │ │
│  │  - HTTPS interception (ssl-bump)     │ │
│  │  - YouTube ad filtering              │ │
│  └──────────┬───────────────────────────┘ │
│             ↓                              │
│  ┌──────────────────────────────────────┐ │
│  │  Firewall / NAT (iptables)           │ │
│  │  - IP forwarding                     │ │
│  │  - NAT masquerading                  │ │
│  │  - DNS leak prevention               │ │
│  └──────────────────────────────────────┘ │
│                                            │
└────────────┬───────────────────────────────┘
             ↓
        Internet
```

### 2.2 Component Specifications

#### C1: WireGuard VPN Server
- **Function:** Secure VPN connectivity for client devices
- **Configuration:** Full-tunnel (route all traffic) or split-tunnel (DNS/HTTP only)
- **Protocol:** WireGuard (UDP-based, modern cryptography)
- **Port:** 51820/UDP
- **Deployment:** Docker container (linuxserver/wireguard)

#### C2: AdGuard Home
- **Function:** DNS filtering and blocklist management
- **Features:**
  - Web-based administration interface
  - Support for multiple blocklist sources (EasyList, EasyPrivacy, etc.)
  - Query logging and statistics
  - Custom filtering rules
  - DNS-over-HTTPS/TLS/QUIC upstream support
- **Deployment:** Docker container (adguard/adguardhome)
- **Recommendation:** Preferred over Pi-hole due to superior UI and protocol support

#### C3: Unbound DNS Resolver
- **Function:** Local recursive DNS resolver
- **Purpose:** Eliminate dependency on upstream DNS providers for enhanced privacy
- **Features:**
  - DNSSEC validation
  - Query caching
  - Minimal logging
- **Deployment:** Docker container or host installation

#### C4: Squid Proxy (Optional)
- **Function:** HTTPS interception for enhanced ad blocking
- **Configuration:** SSL bump mode for man-in-the-middle inspection
- **Use Case:** Enhanced YouTube ad blocking (~70-80% effectiveness)
- **Requirement:** Custom CA certificate installation on client devices
- **Warning:** May break certificate-pinned applications

#### C5: Docker & Docker Compose
- **Function:** Containerized deployment and orchestration
- **Benefits:** Simplified deployment, updates, and management on Raspberry Pi

#### C6: Firewall & NAT Rules
- **Function:** Traffic routing and DNS leak prevention
- **Implementation:** iptables/nftables
- **Features:**
  - NAT masquerading for VPN clients
  - Forced DNS redirection (prevent DNS leaks)
  - Port forwarding configuration

---

## 3. Technical Design Decisions

### 3.1 DNS-Level Blocking (AdGuard Home + Unbound)

**Advantages:**
- Easy deployment with minimal configuration
- Reduces tracking and telemetry
- Effective against popups, banners, and domain-based advertisements
- No client-side CA certificate installation required

**Disadvantages:**
- Cannot block in-stream/same-domain advertisements (e.g., YouTube)
- CDN-hosted advertisements may bypass filtering

**Recommendation:** Deploy AdGuard Home as primary DNS filtering solution due to superior web interface, DNS-over-HTTPS/TLS/QUIC support, and ease of administration.

### 3.2 VPN Protocol Selection (WireGuard)

**Advantages:**
- Modern, audited cryptography
- Superior performance compared to OpenVPN
- Lightweight and stable
- Native iOS support with official app
- Simple configuration

**Disadvantages:**
- Full-tunnel configuration adds latency
- Requires proper NAT/forwarding configuration

**Recommendation:** WireGuard is the optimal choice for performance and iOS compatibility.

### 3.3 HTTPS Interception (Squid ssl-bump / mitmproxy)

**Advantages:**
- Can intercept and filter YouTube advertisement requests
- Ability to modify HTTP responses and remove ad content
- Enhanced blocking effectiveness (~70-80% for YouTube)

**Disadvantages:**
- Requires custom CA certificate installation on iPhone
- Breaks certificate-pinned applications
- Performance overhead
- Legal and ethical considerations

**Recommendation:** Implement as optional feature only. Enable only for users who:
- Understand security implications
- Accept potential application breakage
- Primarily concerned with YouTube ad blocking
- Use on personal devices only

### 3.4 Alternative Approaches

#### Rule-Based Proxies (Clash, V2Ray)
**Advantages:** Domain/path-based filtering, advanced routing rules
**Disadvantages:** Complex iOS integration, may require custom client applications
**Status:** Not recommended for this implementation

---

## 4. Implementation Phases

### Phase 0: Preparation
**Duration:** 1 day
**Tasks:**
- Select hardware platform (Raspberry Pi 4 or miniPC)
- Install operating system (Raspberry Pi OS 64-bit or Debian)
- Configure SSH access
- Update system packages
- Set static IP address or DHCP reservation
- Install Docker and Docker Compose

### Phase 1: Core VPN & DNS Filtering
**Duration:** 1 day
**Tasks:**
- Deploy WireGuard container
- Generate client configuration profiles with QR codes
- Deploy AdGuard Home container
- Configure initial blocklists (EasyList, AdGuard filters, tracking lists)
- Configure WireGuard to route DNS through AdGuard (DNS = 10.13.13.1)
- **Testing:** iPhone connectivity, verify ad domains blocked via web tests

### Phase 2: Hardening & Privacy Enhancement
**Duration:** 1 day
**Tasks:**
- Deploy Unbound for local recursive DNS resolution (or configure DNS-over-HTTPS/TLS upstream)
- Configure firewall rules (iptables/nftables):
  - NAT masquerading for internet access
  - DNS leak prevention (port 53 redirection)
- Implement logging and monitoring (logrotate, fail2ban)

### Phase 3: HTTPS Interception (Optional)
**Duration:** 1 day
**Tasks:**
- Deploy Squid with ssl-bump or mitmproxy
- Generate custom Certificate Authority
- Document CA installation procedure for iPhone
- Configure WireGuard routing to redirect HTTP/HTTPS through proxy
- Test YouTube request interception with mitmproxy logs
- Validate ad endpoint blocking

### Phase 4: Automation & Production Readiness
**Duration:** 1 day
**Tasks:**
- Implement automated blocklist updates (cron jobs)
- Configure backup procedures for critical configurations
- Implement health check monitoring
- Set Docker restart policies
- Configure AdGuard Home web UI access
- Generate WireGuard client configuration backups
- **Documentation:** Recovery procedures, MITM disable instructions

---

## 5. Reference Implementation Examples

### 5.1 Docker Compose Configuration (Basic)

```yaml
version: "3.8"
services:
  wireguard:
    image: linuxserver/wireguard
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Asia/Ho_Chi_Minh
      - SERVERURL=YOUR_DYNAMIC_DNS_OR_PUBLIC_IP
      - SERVERPORT=51820
      - PEERS=3
      - PEERDNS=10.13.13.1
    volumes:
      - ./wireguard/config:/config
      - /lib/modules:/lib/modules
    ports:
      - "51820:51820/udp"
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped

  adguard:
    image: adguard/adguardhome
    container_name: adguard
    ports:
      - "80:80"
      - "3000:3000"
      - "53:53/tcp"
      - "53:53/udp"
      - "853:853"
    volumes:
      - ./adguard/work:/opt/adguardhome/work
      - ./adguard/conf:/opt/adguardhome/conf
    restart: unless-stopped
```

**Note:** Internal IP addresses and PEERDNS configuration should be adjusted based on Docker network configuration (bridge vs. host networking). The example assumes AdGuard Home will listen on container IP 10.13.13.1.

### 5.2 WireGuard Client Configuration (iOS)

**Client configuration file (wg0-client.conf):**
```ini
[Interface]
PrivateKey = <client_private_key>
Address = 10.13.13.2/32
DNS = 10.13.13.1

[Peer]
PublicKey = <server_public_key>
Endpoint = your-public-ip:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
```

**Deployment:** Generate QR code from configuration file, import into iPhone WireGuard application.

### 5.3 Firewall Configuration (iptables)

```bash
# Enable IPv4 forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# NAT: Forward VPN subnet to internet (eth0 = WAN interface)
sudo iptables -t nat -A POSTROUTING -s 10.13.13.0/24 -o eth0 -j MASQUERADE

# DNS leak prevention: Redirect all DNS queries to AdGuard
sudo iptables -t nat -A PREROUTING -s 10.13.13.0/24 -p udp --dport 53 \
    -j DNAT --to-destination 10.13.13.1:53
sudo iptables -t nat -A PREROUTING -s 10.13.13.0/24 -p tcp --dport 53 \
    -j DNAT --to-destination 10.13.13.1:53
```

---

## 6. HTTPS Interception Implementation (Optional)

### 6.1 Prerequisites
- User acceptance of security trade-offs
- Understanding of application compatibility issues
- Commitment to secure CA private key storage

### 6.2 Implementation Procedure

1. **Generate Certificate Authority** using OpenSSL on server
2. **Configure Squid** with `ssl-bump` directive for HTTPS interception and re-encryption
3. **Export CA Certificate** → Install on iPhone:
   - Settings → General → About → Certificate Trust Settings
   - Enable full trust for custom CA
4. **Configure Filtering Rules** for known advertisement endpoints (project-specific)
5. **Validation:** Test YouTube request flow using mitmproxy logs

### 6.3 Security Warnings

- **Risk:** Installing CA on mobile device increases risk if CA is compromised
- **Impact:** Many applications (banking apps, certificate-pinned apps) will fail to connect
- **iOS Behavior:** "User Trusted Certificate" mechanism differs from system trust
- **Recommendation:** Use only on personal devices with secure CA key storage

---

## 7. Testing & Validation Plan

### 7.1 Connectivity Testing
- **Test:** WireGuard connection from iPhone
- **Validation:** Ping 10.13.13.1 (AdGuard IP), access HTTP/HTTPS websites
- **Expected Result:** Successful connectivity

### 7.2 DNS Blocking Validation
- **Test:** Access test pages for ad domains (e.g., `ads.example.test`)
- **Expected Result:** Domains blocked (confirmed)
- **DNS Leak Check:** https://ipleak.net or https://dnsleaktest.com

### 7.3 Ad Blocking Effectiveness
- **Test Sites:** News websites with heavy advertising, YouTube, streaming platforms
- **Metrics:** Before/after comparison of advertisement frequency
- **YouTube Specific:** Verify pre-roll advertisement presence/frequency

### 7.4 Performance Testing
- **Streaming Test:** 1080p video playback
- **Metrics:**
  - CPU load on Raspberry Pi 4 (<70% target)
  - Packet loss (minimal)
  - Latency (ping) increase (<20ms target)

### 7.5 Security Validation
- **MITM Testing:** Verify CA trust (if MITM enabled)
- **Certificate Pinning:** Test 1-2 applications with certificate pinning

### 7.6 Success Criteria
- ✅ >80% third-party advertisements blocked (DNS-level)
- ✅ YouTube pre-roll ads reduced (not guaranteed eliminated without MITM/client-side solution)
- ✅ CPU utilization <70% under typical household load

---

## 8. Monitoring & Maintenance

### 8.1 Logging Strategy
- **AdGuard Home:** Query logs (top blocked domains)
- **WireGuard:** Session logs (client connections)
- **System:** CPU/memory usage graphs (collectd or Prometheus optional)
- **Network:** Latency and packet loss tests (iperf3 optional)
- **Log Rotation:** Implement for AdGuard logs

### 8.2 Scheduled Maintenance
- **Blocklist Updates:** Daily cron job
- **Health Checks:** Script to monitor services and restart if down
- **Configuration Backups:** Automatic backup of `/config` folders to NAS or Git (sensitive information redacted)

---

## 9. Risk Assessment & Legal Considerations

### 9.1 Privacy Trade-offs
- **Risk:** MITM-enabled configuration allows reading HTTPS traffic content
- **Mitigation:** Keep private and secure, use only on personal devices

### 9.2 Security Risk
- **Risk:** Installing CA on mobile device is a security risk if CA storage is not secure
- **Mitigation:** Secure CA private key storage, periodic rotation

### 9.3 Legal Considerations
- **Personal Use:** Ad blocking for personal purposes is generally legal
- **Restrictions:**
  - Avoid using to circumvent subscription/paywalled content
  - Comply with platform terms of service

### 9.4 Application Stability
- **Risk:** MITM may cause some applications to fail
- **Mitigation:** Maintain compatibility lists, provide quick disable procedures

---

## 10. Alternative Solutions

### 10.1 For Priority YouTube Ad Blocking

1. **YouTube Premium** — Most reliable method to remove ads
2. **Client-Side Blocking:** iPhone browser apps supporting content blockers (Safari + content blockers, though YouTube app will still show ads)
3. **Android Alternative Clients** (Android only, not applicable to iOS) — Vanced-like modifications (not recommended, legal risk)

---

## 11. Deliverables

### 11.1 Code Artifacts
1. Production `docker-compose.yml` for WireGuard + AdGuard Home (starter configuration)
2. WireGuard server configuration + sample client profile (QR code)
3. iptables script to enforce routing & DNS redirection
4. Step-by-step runbook: OS installation, Docker deployment, testing, backup procedures
5. Optional: Squid MITM configuration skeleton + instructions for CA creation and iPhone installation
6. Test checklist and acceptance criteria

### 11.2 Quick Start Runbook

```bash
# 1. Flash Raspberry Pi OS (64-bit)

# 2. System update
sudo apt update && sudo apt upgrade

# 3. Install Docker
curl -fsSL https://get.docker.com | sh

# 4. Install docker-compose
sudo apt install docker-compose

# 5. Clone repository containing docker-compose.yml (from deliverables)
git clone <repository> && cd <directory>

# 6. Start services
docker-compose up -d

# 7. Check containers
docker ps

# 8. Configure WireGuard client via QR code

# 9. Connect iPhone → verify whatismyip shows home IP

# 10. Open AdGuard UI
# Browser: http://<pi-ip>/ → Import lists, tune rules
```

---

## 12. Implementation Timeline

- **Day 0:** Prepare hardware, flash image, configure SSH
- **Day 1:** Deploy WireGuard + AdGuard, confirm DNS blocking
- **Day 2:** Tune blocklists, add Unbound, configure firewall rules
- **Day 3 (optional):** Test MITM on one device, evaluate impacts
- **Day 4:** Finalize runbook, implement backups

---

## 13. Metrics & Logging

### 13.1 Metrics to Capture
- AdGuard query logs (top blocked domains)
- WireGuard session logs (client connections)
- CPU/memory usage graphs (collectd / Prometheus optional)
- Latency and packet loss tests (iperf3 optional)

---

## 14. Frequently Asked Questions

### Q1: Can YouTube ads be completely blocked?
**A:** Not guaranteed with DNS-only blocking. Requires MITM or client-side adblocker or YouTube Premium for certainty.

### Q2: Does iPhone support CA installation?
**A:** Yes, but requires enabling trust in Certificate Trust Settings; iOS updates may change UX.

### Q3: What if Raspberry Pi 4 is insufficient?
**A:** Use x86 miniPC for SSL interception at high throughput or hardware offloading.

---

## 15. Stakeholder Questions

To refine this document accurately, please provide answers to the following:

1. Do you want VPN as **full-tunnel** (all traffic through Pi) or **split-tunnel** (only DNS/HTTP through Pi)?

2. Do you accept installing **Certificate Authority** on iPhone? (If not, HTTPS-interception for YouTube blocking is not feasible) (Yes / No)

3. Expected number of devices using VPN simultaneously? (1-2 / 3-6 / >6)

4. Priority: **privacy** (minimal logs) or **debuggable** (detailed logs for tuning blocking)?

5. Do you want complete **docker-compose + iptables scripts + WireGuard QR codes** ready to deploy, or just design document for further development?

6. Do you have static public IP or use dynamic DNS? (If dynamic DNS, we will recommend NAT/port-forward configuration)

7. Are you willing to accept potential breakage of some apps (e.g., banking) if using MITM? (Yes / No)

---

## 16. Final Notes

This document has been designed to be **immediately actionable**, including sample code. Upon receiving answers to the questions in Section 15, the document can be further refined with specific configurations: IP subnets, hostnames, WireGuard peer counts, device selection (Pi4 or miniPC), and MITM acceptance.

If desired, complete `docker-compose.yml`, iptables scripts, WireGuard server configuration (with generated keys), and client QR codes can be generated immediately by providing three key pieces of information:
1. Device type (Pi4 / miniPC)
2. Public IP or DDNS hostname
3. MITM acceptance (Yes / No)

---

**Document Status:** Final
**Approval Required:** Technical Lead, Security Review
**Implementation Ready:** Yes (pending stakeholder question responses)
