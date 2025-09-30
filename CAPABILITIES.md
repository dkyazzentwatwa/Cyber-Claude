# Cyber Claude Capabilities Overview

**Version:** 0.4.0
**Last Updated:** 2025-09-29

## Command Summary

| Command | Description | Key Features |
|---------|-------------|--------------|
| `cyber-claude` / `interactive` | Interactive REPL session | Persistent conversation, mode switching, model selection, command history |
| `scan` | Desktop security scanning | Quick/full/network scans, Nmap integration, AI analysis |
| `webscan` | Web application security testing | OWASP Top 10, MCP tools (Nuclei, SSLScan, SQLmap), ethical framework |
| `pcap` | Network traffic analysis | Protocol dissection, IOC extraction, MITRE mapping, evidence preservation |
| `harden` | System hardening checks | Platform-specific checks, compliance validation, recommendations |
| `chat` | One-off chat mode | Single conversation with security agent |

---

## Desktop Security Scanning

| Feature | Command | Description | MCP Tools |
|---------|---------|-------------|-----------|
| **Quick Scan** | `scan --quick` | Rapid security assessment | - |
| **Full Scan** | `scan --full` | Comprehensive system analysis | - |
| **Network Scan** | `scan --network` | Connection monitoring and analysis | - |
| **Nmap Scan** | `scan --network --nmap --target <ip>` | Professional network scanning | ✅ Nmap MCP |
| **Aggressive Scan** | `scan --network --nmap --nmap-aggressive` | Service/OS detection with Nmap -A | ✅ Nmap MCP |

### Desktop Scan Capabilities

| Capability | Status | Details |
|------------|--------|---------|
| OS Information | ✅ | Platform, version, architecture, uptime |
| Process Monitoring | ✅ | Running processes, suspicious activity detection |
| Network Connections | ✅ | Active connections, unusual ports, remote IPs |
| Storage Analysis | ✅ | Disk usage, mount points, file systems |
| Nmap Integration | ✅ | Host discovery, port scanning, service detection, OS fingerprinting |
| AI Analysis | ✅ | Security assessment with Claude/Gemini models |
| Export | ✅ | JSON and Markdown reports |

---

## Web Application Security Testing

| Feature | Command | Description | MCP Tools |
|---------|---------|-------------|-----------|
| **Quick Scan** | `webscan --quick <url>` | Security headers analysis only | - |
| **Full Scan** | `webscan --full <url>` | Complete vulnerability assessment | - |
| **Nuclei Scan** | `webscan <url> --nuclei` | 5000+ vulnerability templates | ✅ Nuclei MCP |
| **SSL/TLS Scan** | `webscan <url> --sslscan` | Certificate and cipher analysis | ✅ SSLScan MCP |
| **SQL Injection Test** | `webscan <url> --sqlmap` | Automated SQLi detection | ✅ SQLmap MCP |
| **All MCP Tools** | `webscan <url> --with-mcp` | Run all available MCP scanners | ✅ All MCP |
| **CTF Mode** | `webscan --ctf <url>` | Challenge-specific authorization | - |

### Web Security Capabilities

| Capability | Built-in | MCP Tools | Details |
|------------|----------|-----------|---------|
| **OWASP Top 10** | ✅ | - | SQL injection, XSS, CSRF, SSRF detection |
| **Security Headers** | ✅ | ✅ HTTP Headers MCP | CSP, HSTS, X-Frame-Options, etc. |
| **Cookie Security** | ✅ | - | Secure, HttpOnly, SameSite flags |
| **CSRF Protection** | ✅ | - | Token detection and validation |
| **Form Analysis** | ✅ | - | Security misconfigurations |
| **SSL/TLS Analysis** | - | ✅ SSLScan MCP | Grade (A+ to F), vulnerabilities, certificate validation |
| **Vulnerability Scanning** | - | ✅ Nuclei MCP | CVEs, OWASP, misconfigurations (5000+ templates) |
| **SQL Injection** | ✅ | ✅ SQLmap MCP | Automated injection point detection |
| **Technology Detection** | - | ✅ Httpx MCP | Server, frameworks, CMS detection |
| **Web Crawling** | - | ✅ Katana MCP | Deep crawling with JavaScript parsing |
| **Subdomain Enumeration** | - | ✅ Amass MCP | Reconnaissance and asset discovery |

### Web Scan Export

| Format | Command | Description |
|--------|---------|-------------|
| Markdown | `webscan <url>` | Auto-saved to `/scans/` directory |
| Terminal | Built-in | Rich formatted output with severity colors |

---

## Network Traffic Analysis (PCAP)

| Feature | Command | Description |
|---------|---------|-------------|
| **Quick Analysis** | `pcap <file>` | Basic statistics and AI insights |
| **Full Analysis** | `pcap --mode full <file>` | Comprehensive protocol analysis |
| **Threat Hunting** | `pcap --mode threat-hunt <file>` | Security-focused deep analysis |
| **IOC Extraction** | `pcap --extract-iocs <file>` | Extract indicators of compromise |
| **MITRE Mapping** | `pcap --mitre <file>` | Map findings to ATT&CK techniques |
| **Evidence Preservation** | `pcap --preserve-evidence <file>` | Forensically sound evidence package |

### PCAP Analysis Capabilities

| Capability | Status | Details |
|------------|--------|---------|
| **Protocol Dissection** | ✅ | Ethernet, IPv4/IPv6, TCP/UDP, HTTP, DNS, ICMP, ARP |
| **Link Layer Support** | ✅ | Ethernet (type 1), Raw IP (type 101/12), Linux SLL (type 113) |
| **Packet Statistics** | ✅ | Protocol distribution, packet counts, byte volumes |
| **Conversation Tracking** | ✅ | TCP/UDP flows between endpoints |
| **Endpoint Analysis** | ✅ | Most active IPs, traffic patterns |
| **DNS Query Extraction** | ✅ | All DNS queries with timestamps |
| **HTTP Request Extraction** | ✅ | URLs, methods, user agents |
| **Anomaly Detection** | ✅ | Port scans, suspicious ports, unencrypted traffic |
| **Display Filters** | ✅ | Protocol, IP (src/dst), port filtering |
| **IOC Extraction** | ✅ | IPs, domains, URLs, emails, hashes (MD5/SHA1/SHA256), CVEs |
| **STIX 2.1 Export** | ✅ | Threat intelligence sharing format |
| **MITRE ATT&CK Mapping** | ✅ | 20+ technique definitions with auto-mapping |
| **Evidence Preservation** | ✅ | Chain of custody, triple hash verification |

### PCAP Display Filters

| Filter | Command Example | Description |
|--------|-----------------|-------------|
| Protocol | `pcap --filter tcp <file>` | Filter by protocol (tcp, udp, http, dns, icmp) |
| Source IP | `pcap --src 192.168.1.100 <file>` | Filter by source IP |
| Destination IP | `pcap --dst 10.0.0.1 <file>` | Filter by destination IP |
| Port (any) | `pcap --port 443 <file>` | Filter by source or destination port |
| Source Port | `pcap --sport 80 <file>` | Filter by source port |
| Destination Port | `pcap --dport 3389 <file>` | Filter by destination port |

### PCAP Export Formats

| Format | Command | Description |
|--------|---------|-------------|
| JSON | `pcap --export-json report.json <file>` | Complete analysis data |
| Markdown | `pcap --export-md report.md <file>` | Human-readable report |
| CSV | `pcap --export-csv packets.csv <file>` | Packet list for Excel/spreadsheets |
| STIX 2.1 | `pcap --export-iocs iocs.json <file>` | Threat intelligence format |

---

## Professional Security Features

### IOC Extraction

| IOC Type | Pattern | Smart Filtering |
|----------|---------|-----------------|
| IPv4 Addresses | Regex-based | Excludes private IPs (10.x, 192.168.x, 127.x, RFC1918) |
| Domain Names | DNS-valid TLDs | Excludes localhost, common false positives |
| URLs | HTTP/HTTPS | Full URL extraction with paths |
| Email Addresses | RFC-compliant | Email pattern matching |
| MD5 Hashes | 32 hex chars | Hash validation |
| SHA1 Hashes | 40 hex chars | Hash validation |
| SHA256 Hashes | 64 hex chars | Hash validation |
| CVE References | CVE-YYYY-NNNNN | CVE ID extraction |

**Features:**
- Context tracking (associates IOCs with source: DNS query, HTTP request, alert)
- Frequency analysis (counts occurrences)
- Deduplication
- STIX 2.1 export for threat intelligence platforms

### MITRE ATT&CK Mapping

| Coverage | Techniques | Details |
|----------|------------|---------|
| **Total Techniques** | 20+ | Covering all attack phases |
| **Tactics Covered** | 11 | Initial Access → Command & Control |
| **Confidence Scoring** | High/Medium/Low | Automatic confidence assessment |
| **Keyword Mapping** | Yes | Automatic technique identification |

**Supported Tactics:**
- Initial Access
- Execution
- Persistence
- Defense Evasion
- Credential Access
- Discovery
- Lateral Movement
- Collection
- Exfiltration
- Command & Control
- Impact

**Example Techniques:**
- T1190: Exploit Public-Facing Application
- T1059: Command and Scripting Interpreter
- T1176: Browser Extensions
- T1562: Impair Defenses
- T1078: Valid Accounts
- T1087: Account Discovery
- T1021: Remote Services
- T1005: Data from Local System
- T1041: Exfiltration Over C2 Channel
- T1071: Application Layer Protocol

### Evidence Preservation

| Feature | Status | Details |
|---------|--------|---------|
| **Triple Hash Calculation** | ✅ | MD5, SHA1, SHA256 for integrity verification |
| **Chain of Custody** | ✅ | Analyst name, timestamps, case number |
| **Collection Metadata** | ✅ | Method, location, system information |
| **Integrity Verification** | ✅ | Rehash and compare functionality |
| **Case Management** | ✅ | Organize by case number |
| **Forensic Soundness** | ✅ | Legal admissibility standards |

**Usage:**
```bash
pcap suspicious.pcap \
  --preserve-evidence \
  --case-number CASE-2024-001 \
  --analyst "John Doe"
```

---

## MCP Security Tools Integration

| Tool | Status | Capabilities | Command Flag |
|------|--------|--------------|--------------|
| **Nuclei** | ✅ | Vulnerability scanning with 5000+ templates (CVEs, OWASP) | `--nuclei` |
| **SSLScan** | ✅ | SSL/TLS security grading (A+ to F), certificate validation | `--sslscan` |
| **SQLmap** | ✅ | SQL injection testing with injection point detection | `--sqlmap` |
| **Nmap** | ✅ | Network scanning, service/OS detection | `--nmap` |
| **Httpx** | ✅ | HTTP probing and technology detection | (Planned) |
| **Katana** | ✅ | Web crawler with JavaScript parsing | (Planned) |
| **Amass** | ✅ | Subdomain enumeration | (Planned) |
| **Masscan** | ✅ | Ultra-fast port scanning | (Planned) |
| **HTTP Headers** | ✅ | Security header analysis | (Planned) |

### MCP Configuration

Enable tools in `.env`:
```bash
MCP_NUCLEI_ENABLED=true
MCP_SSLSCAN_ENABLED=true
MCP_SQLMAP_ENABLED=true
MCP_NMAP_ENABLED=true
MCP_HTTPX_ENABLED=true
MCP_KATANA_ENABLED=true
MCP_AMASS_ENABLED=true
MCP_MASSCAN_ENABLED=true
MCP_HTTP_HEADERS_ENABLED=true
```

**Zero Setup Required:** Tools are auto-installed via `npx` when first used!

---

## AI Model Support

| Provider | Models | Total | Use Cases |
|----------|--------|-------|-----------|
| **Anthropic Claude** | Opus 4.1, Opus 4, Sonnet 4.5 (default), Sonnet 4, Sonnet 3.7, Haiku 3.5 | 6 | Deep analysis (Opus), balanced (Sonnet), speed (Haiku) |
| **Google Gemini** | 2.5 Pro, 2.5 Flash, 2.5 Flash Lite | 3 | Cost-effective, fast responses |

### Model Selection

| Command | Description |
|---------|-------------|
| `--model opus-4.1` | Use Claude Opus 4.1 (most capable) |
| `--model sonnet-4.5` | Use Claude Sonnet 4.5 (default, balanced) |
| `--model haiku-3.5` | Use Claude Haiku 3.5 (fastest) |
| `--model gemini-2.5-flash` | Use Gemini 2.5 Flash (cost-effective) |
| `--model gemini-2.5-pro` | Use Gemini 2.5 Pro (thinking model) |
| In interactive: `model` | Interactive model selector menu |

---

## Agent Modes

| Mode | Focus | Description |
|------|-------|-------------|
| **base** | General | All-purpose security assistant |
| **redteam** | Offensive | Attack perspective (defensive operations only) |
| **blueteam** | Defensive | Defense operations and incident response |
| **desktopsecurity** | Desktop | Personal computer security |
| **webpentest** | Web | Web application security testing |

**Switch modes:** `mode <mode_name>` in interactive session or `--mode <mode>` flag

---

## Export & Reporting

| Format | Commands | Description |
|--------|----------|-------------|
| **JSON** | `--json <file>`, `--export-json <file>` | Machine-readable data |
| **Markdown** | `--md <file>`, `--export-md <file>` | Human-readable reports |
| **CSV** | `--export-csv <file>` | Spreadsheet format (PCAP packets) |
| **STIX 2.1** | `--export-iocs <file>` | Threat intelligence format |
| **Terminal** | Default | Rich formatted output with colors and tables |

### Auto-saved Reports

| Command | Location | Format |
|---------|----------|--------|
| `webscan` | `/scans/<hostname>_<timestamp>.md` | Markdown |

---

## Security & Ethics

| Feature | Status | Description |
|---------|--------|-------------|
| **Authorization Required** | ✅ | User consent before scanning |
| **Domain Blocklists** | ✅ | Prevents scanning sensitive sites (banks, government) |
| **Legal Warnings** | ✅ | Displayed prominently to users |
| **CTF Mode** | ✅ | Separate authorization for challenges |
| **Audit Logging** | ✅ | All actions logged to `cyber-claude.log` |
| **Defensive Only** | ✅ | No actual exploitation |
| **Rate Limiting** | ✅ | Respects target servers |
| **Read-Only by Default** | ✅ | Non-destructive testing |

---

## Interactive Session Features

| Feature | Description |
|---------|-------------|
| **Persistent REPL** | Single session, no re-typing commands |
| **Natural Commands** | Just type `scan`, `webscan <url>`, `pcap <file>`, etc. |
| **Mode Switching** | Change modes without restarting: `mode redteam` |
| **Model Selection** | Interactive menu: `model` |
| **Command History** | Use ↑/↓ arrows to navigate |
| **Chat Integration** | Ask questions naturally between commands |
| **Status Display** | `status` shows current mode, model, conversation length |
| **Built-in Help** | `help` for command reference |

---

## Technical Specifications

| Aspect | Details |
|--------|---------|
| **Runtime** | Node.js 18+ |
| **Language** | TypeScript 5.9 (ESM modules) |
| **CLI Framework** | Commander.js |
| **AI SDKs** | @anthropic-ai/sdk, @google/generative-ai, @modelcontextprotocol/sdk |
| **System Info** | systeminformation npm package |
| **PCAP Parsing** | pcap-parser (supports Ethernet, Raw IP, Linux SLL) |
| **HTTP Client** | axios |
| **HTML Parsing** | cheerio |
| **Logging** | winston |
| **License** | MIT |

---

## Platform Support

| Platform | Desktop Scan | Web Scan | PCAP Analysis | Hardening Checks |
|----------|--------------|----------|---------------|------------------|
| **macOS** | ✅ | ✅ | ✅ | ✅ (FileVault, Gatekeeper, Firewall) |
| **Linux** | ✅ | ✅ | ✅ | ✅ (UFW, SELinux, updates) |
| **Windows** | ✅ | ✅ | ✅ | ✅ (Defender, Firewall, updates) |

---

## Quick Reference

### Most Common Commands

```bash
# Start interactive session
cyber-claude

# Quick desktop scan
cyber-claude scan --quick

# Web security scan with all MCP tools
cyber-claude webscan https://example.com --with-mcp

# Network scan with Nmap
cyber-claude scan --network --nmap --target 192.168.1.0/24

# Analyze network capture with threat hunting
cyber-claude pcap --mode threat-hunt capture.pcap

# PCAP with IOC extraction and MITRE mapping
cyber-claude pcap capture.pcap --extract-iocs --mitre --export-iocs iocs.json

# Full pcap forensic analysis
cyber-claude pcap suspicious.pcap \
  --preserve-evidence \
  --case-number CASE-2024-001 \
  --analyst "John Doe" \
  --extract-iocs \
  --mitre
```

---

**For detailed usage and examples, see [README.md](README.md) and [CLAUDE.md](CLAUDE.md)**

**Project Repository:** [GitHub](https://github.com/yourusername/cyber-claude)
**License:** MIT
**Built with:** Claude Agent SDK, TypeScript, Model Context Protocol