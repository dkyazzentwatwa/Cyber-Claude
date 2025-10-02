# CLI Commands Reference

Complete reference for all Cyber Claude CLI commands and interactive mode capabilities.

---

## Table of Contents
- [CLI Mode (One-Off Commands)](#cli-mode-one-off-commands)
- [Interactive Mode (REPL)](#interactive-mode-repl)
- [Workflows](#workflows)
- [Agent Modes](#agent-modes)
- [AI Models](#ai-models)
- [MCP Security Tools](#mcp-security-tools)

---

## CLI Mode (One-Off Commands)

### `cyber-claude` (Default)
Start interactive session.

```bash
cyber-claude
cyber-claude i
cyber-claude interactive
cyber-claude interactive --mode redteam --model opus-4
```

**Options:**
- `-m, --mode <mode>` - Initial agent mode (base, redteam, blueteam, desktopsecurity, webpentest, osint)
- `--model <model>` - AI model to use (sonnet-4-5, opus-4-1, haiku-4, gemini-2.5-flash, etc.)

---

### `cyber-claude flows`
**NEW!** Pre-configured workflows for guided security tasks.

```bash
cyber-claude flows                        # Interactive menu
cyber-claude flows --list                 # List all workflows
cyber-claude flows --category security    # Filter by category
cyber-claude flows --difficulty beginner  # Filter by difficulty
```

**Options:**
- `-l, --list` - List all available workflows
- `-c, --category <category>` - Filter: security, recon, analysis, incident, ctf, learning
- `-d, --difficulty <level>` - Filter: beginner, intermediate, advanced
- `-m, --model <model>` - AI model for workflow execution

**Available Workflows** (10 total):
1. Quick Security Health Check (2-3 min, beginner)
2. Website Security Audit (3-5 min, beginner)
3. Domain Intelligence Gathering (3-5 min, beginner)
4. Incident Response Triage (5-7 min, intermediate)
5. Network Traffic Threat Hunting (4-6 min, intermediate)
6. Full OSINT Investigation (5-10 min, intermediate)
7. System Hardening Guide (10-15 min, intermediate)
8. Red Team Reconnaissance (10-15 min, advanced)
9. CTF Web Challenge Solver (10-20 min, advanced)
10. Learn OSINT Basics (15-20 min, beginner)

---

### `cyber-claude scan`
Desktop and network security scanning.

```bash
cyber-claude scan                                # Full desktop scan
cyber-claude scan --quick                        # Quick security check
cyber-claude scan --network                      # Network connections
cyber-claude scan --network --nmap --target 192.168.1.0/24  # Nmap scan
cyber-claude scan --json report.json --md report.md
```

**Options:**
- `-q, --quick` - Quick security check
- `-f, --full` - Full system scan (default)
- `-n, --network` - Network connections scan
- `--nmap` - Use Nmap for professional scanning (requires MCP_NMAP_ENABLED=true)
- `--target <target>` - Target IP/hostname/CIDR for Nmap
- `--ports <ports>` - Ports to scan (default: top-1000)
- `--nmap-aggressive` - Enable aggressive Nmap scanning
- `--model <model>` - AI model to use
- `--json <file>` - Export results to JSON
- `--md <file>` - Export results to Markdown

---

### `cyber-claude webscan`
Web application vulnerability scanning.

```bash
cyber-claude webscan https://example.com
cyber-claude webscan --full https://myapp.local
cyber-claude webscan --ctf https://ctf.example.com
cyber-claude webscan https://example.com --nuclei --sslscan --sqlmap
cyber-claude webscan https://example.com --with-mcp  # Run all MCP tools
```

**Options:**
- `-q, --quick` - Quick scan (headers only)
- `-f, --full` - Full vulnerability scan (CSRF, XSS detection)
- `--ctf` - CTF challenge mode
- `--nuclei` - Run Nuclei vulnerability scan (requires MCP_NUCLEI_ENABLED=true)
- `--sslscan` - Run SSL/TLS security analysis (requires MCP_SSLSCAN_ENABLED=true)
- `--sqlmap` - Test for SQL injection (requires MCP_SQLMAP_ENABLED=true)
- `--ffuf` - Run web fuzzing (requires MCP_FFUF_ENABLED=true)
- `--wpscan` - WordPress vulnerability scan (requires MCP_WPSCAN_ENABLED=true)
- `--with-mcp` - Run all available MCP tools
- `--model <model>` - AI model to use
- `--timeout <ms>` - Request timeout

---

### `cyber-claude mobilescan`
**NEW!** Mobile app security scanning (Android APK / iOS IPA).

```bash
cyber-claude mobilescan app.apk
cyber-claude mobilescan --scan-type static app.apk
cyber-claude mobilescan --scan-type dynamic app.apk
cyber-claude mobilescan app.ipa --model opus-4
cyber-claude mobilescan app.apk --json report.json --md report.md
```

**Options:**
- `-s, --scan-type <type>` - Scan type: static or dynamic (default: static)
- `--rescan` - Force re-scan if already analyzed
- `--model <model>` - AI model for security analysis
- `--json <file>` - Export results to JSON
- `--md <file>` - Export results to Markdown

**Requirements:**
- MCP_MOBSF_ENABLED=true in .env
- Supported formats: .apk (Android), .ipa (iOS), .xapk

---

### `cyber-claude recon`
OSINT reconnaissance (NO API keys required).

```bash
# Full reconnaissance
cyber-claude recon example.com --full
cyber-claude recon user@example.com --full

# Domain-focused scan
cyber-claude recon example.com --domain

# Person/username lookup
cyber-claude recon john_doe --person

# Individual tools
cyber-claude recon subdomains example.com
cyber-claude recon breach user@example.com
cyber-claude recon tech https://example.com
cyber-claude recon username john_doe
cyber-claude recon dns example.com
cyber-claude recon whois example.com
cyber-claude recon emails example.com
cyber-claude recon wayback example.com
cyber-claude recon ip 1.1.1.1
cyber-claude recon reverse-ip 1.1.1.1
```

**Options:**
- `--full` - Full reconnaissance (all tools)
- `--domain` - Domain-focused reconnaissance
- `--person` - Person/username lookup
- `--model <model>` - AI model for analysis
- `--json <file>` - Export results to JSON
- `--md <file>` - Export results to Markdown

**10 Free OSINT Tools:**
1. DNS Reconnaissance (A/AAAA/MX/NS/TXT/SOA records)
2. WHOIS Lookup (registration, age, expiration)
3. Subdomain Enumeration (certificate transparency + DNS)
4. Email Harvesting (website scraping, common patterns)
5. Username Enumeration (35+ platforms)
6. Breach Data Lookup (Have I Been Pwned)
7. Technology Detection (server, CMS, frameworks)
8. Wayback Machine (historical snapshots)
9. IP Geolocation (country, city, ISP)
10. Reverse IP Lookup (other domains on same IP)

---

### `cyber-claude pcap`
Network traffic analysis (Wireshark-inspired AI-powered PCAP analysis).

```bash
cyber-claude pcap capture.pcap
cyber-claude pcap --mode full network-traffic.pcap
cyber-claude pcap --mode threat-hunt suspicious.pcap
cyber-claude pcap --filter tcp --port 443 traffic.pcap
cyber-claude pcap --extract-iocs --mitre capture.pcap
cyber-claude pcap suspicious.pcap --preserve-evidence --case-number CASE-2024-001
```

**Options:**
- `-m, --mode <mode>` - Analysis mode: quick, full, or threat-hunt (default: quick)
- `--model <model>` - AI model to use
- `-f, --filter <protocol>` - Display filter (tcp, udp, dns, http, etc.)
- `--src <ip>` - Filter by source IP
- `--dst <ip>` - Filter by destination IP
- `--port <port>` - Filter by port
- `--sport <port>` - Filter by source port
- `--dport <port>` - Filter by destination port
- `--packets` - Display packet list (up to 50)
- `--max-packets <n>` - Maximum packets to analyze
- `--stats-only` - Show statistics only (no AI analysis)
- `--extract-iocs` - Extract IOCs (IPs, domains, URLs, hashes, CVEs)
- `--export-iocs <file>` - Export IOCs in STIX 2.1 format
- `--mitre` - Map findings to MITRE ATT&CK techniques
- `--preserve-evidence` - Create forensically sound evidence package
- `--case-number <number>` - Case number for evidence preservation
- `--analyst <name>` - Analyst name for chain of custody
- `--export-json <file>` - Export analysis to JSON
- `--export-md <file>` - Export report to Markdown
- `--export-csv <file>` - Export packets to CSV

---

### `cyber-claude harden`
System hardening checks and recommendations.

```bash
cyber-claude harden
cyber-claude harden --recommendations
cyber-claude harden --json hardening-report.json
```

**Options:**
- `-c, --check` - Check hardening status (default)
- `-r, --recommendations` - Get hardening recommendations
- `--model <model>` - AI model to use
- `--json <file>` - Export results to JSON
- `--md <file>` - Export results to Markdown

---

### `cyber-claude chat`
One-off chat mode (consider using `interactive` instead for better experience).

```bash
cyber-claude chat
cyber-claude chat --mode blueteam
cyber-claude chat --mode webpentest --model opus-4
```

**Options:**
- `-m, --mode <mode>` - Agent mode
- `--model <model>` - AI model to use

**Chat Commands:**
- `/mode <mode>` - Switch agent mode
- `/clear` - Clear conversation history
- `/help` - Show help
- `/exit` - Exit chat mode

---

## Interactive Mode (REPL)

Start interactive mode with `cyber-claude` or `cyber-claude interactive`.

### Session Commands

#### Security Scanning
```bash
> scan                      # Quick security check
> scan full                 # Full system scan
> scan network              # Network connections scan
> webscan https://example.com  # Web vulnerability scan
> mobilescan app.apk        # Mobile app security scan
> pcap capture.pcap         # Analyze PCAP file
> harden                    # Check system hardening
> recon example.com --full  # OSINT reconnaissance
```

#### Workflows
```bash
> flows                     # Browse pre-configured workflows
> flows --category security # Security workflows
> flows --difficulty beginner  # Beginner workflows
```

#### Mode & Model Management
```bash
> mode redteam              # Switch to red team mode
> mode blueteam             # Switch to blue team mode
> mode desktopsecurity      # Switch to desktop security mode
> mode webpentest           # Switch to web pentest mode
> mode osint                # Switch to OSINT mode
> mode base                 # Switch to base mode
> model                     # Interactive model selector
```

#### Session Management
```bash
> status                    # Show session info (mode, model, history)
> clear                     # Clear conversation history
> history                   # Show command history
> help                      # Show help
> exit / quit               # Exit interactive session
```

#### Natural Language
You can also use natural language in interactive mode:
```bash
> What are the top 3 security risks on my system?
> Analyze this domain for reconnaissance
> How would an attacker exploit this?
> What MITRE ATT&CK techniques would be used here?
```

---

## Workflows

### Categories
- **🛡️ Security**: Health checks, hardening, security audits
- **🔍 Reconnaissance**: Domain intelligence, OSINT investigations
- **📊 Analysis**: Network traffic, incident response
- **🚩 CTF**: Capture The Flag challenge solving
- **📚 Learning**: Interactive tutorials

### Difficulty Levels
- **Beginner**: 2-5 minutes, guided, educational
- **Intermediate**: 5-15 minutes, moderate complexity
- **Advanced**: 10-20+ minutes, professional level

---

## Agent Modes

Cyber Claude has 6 specialized agent modes. Switch anytime with `mode <name>` in interactive mode or `--mode <name>` in CLI.

### 1. **base** (Default)
General-purpose security assistant.
- Balanced approach to security questions
- Good for learning and exploration
- Suitable for all skill levels

### 2. **redteam** ⚔️
Offensive security perspective (defensive only).
- Attack surface analysis
- Vulnerability identification
- Security testing mindset
- No actual exploitation

### 3. **blueteam** 🛡️
Defensive operations focus.
- Threat detection
- Incident response
- Security monitoring
- Defense strategies

### 4. **desktopsecurity** 🔒
Personal computer security.
- Desktop/laptop hardening
- Personal security best practices
- Privacy protection
- Consumer-focused recommendations

### 5. **webpentest** 🌐
Web application security testing.
- OWASP Top 10 focus
- Web vulnerability analysis
- API security testing
- Ethical scanning framework

### 6. **osint** 🕵️
Open source intelligence reconnaissance.
- Information gathering
- Passive reconnaissance
- OSINT tool expertise
- Privacy-respecting techniques

---

## AI Models

Cyber Claude supports 9 AI models across 2 providers (Claude and Gemini).

### Claude Models (6)

**Claude Sonnet 4.5** (Default)
- Model ID: `claude-sonnet-4-5` or `sonnet-4-5`
- Best for: Balanced speed & quality, daily security work
- Use when: General scanning, analysis, recommendations

**Claude Opus 4.1**
- Model ID: `claude-opus-4-1` or `opus-4-1`
- Best for: Most capable reasoning, complex analysis
- Use when: Deep vulnerability analysis, red team ops

**Claude Opus 4**
- Model ID: `claude-opus-4` or `opus-4`
- Best for: Advanced security analysis
- Use when: Thorough investigations

**Claude Sonnet 4**
- Model ID: `claude-sonnet-4` or `sonnet-4`
- Best for: Everyday security tasks
- Use when: Standard scanning and analysis

**Claude Sonnet 3.7**
- Model ID: `claude-sonnet-3-7` or `sonnet-3.7`
- Best for: Fallback option
- Use when: Budget constraints

**Claude Haiku 4**
- Model ID: `claude-haiku-4` or `haiku-4`
- Best for: Fastest responses, batch scanning
- Use when: Quick checks, multiple scans

### Gemini Models (3)

**Gemini 2.5 Flash** (Recommended for Gemini)
- Model ID: `gemini-2.5-flash`
- Best for: Balanced Gemini option
- Use when: Fast analysis with Google AI

**Gemini 2.5 Pro**
- Model ID: `gemini-2.5-pro`
- Best for: Most powerful Gemini model
- Use when: Complex Gemini-based analysis

**Gemini 2.5 Flash Lite**
- Model ID: `gemini-2.5-flash-lite`
- Best for: Fastest & most cost-efficient
- Use when: Simple tasks, batch operations

### Model Selection Examples

```bash
# CLI mode
cyber-claude scan --model opus-4-1
cyber-claude webscan https://example.com --model gemini-2.5-flash
cyber-claude pcap traffic.pcap --model haiku-4

# Interactive mode
> model                     # Interactive selector
> scan --model opus-4       # Override for single command
```

---

## MCP Security Tools

Cyber Claude integrates 14 professional security tools via Model Context Protocol (MCP).

### Web Security (8 tools)
1. **Nuclei** - 5000+ vulnerability templates (MCP_NUCLEI_ENABLED)
2. **SSLScan** - SSL/TLS security grading (MCP_SSLSCAN_ENABLED)
3. **HTTP Headers** - Security header analysis (MCP_HTTP_HEADERS_ENABLED)
4. **SQLmap** - SQL injection testing (MCP_SQLMAP_ENABLED)
5. **Httpx** - HTTP probing & tech detection (MCP_HTTPX_ENABLED)
6. **Katana** - Web crawler with JS parsing (MCP_KATANA_ENABLED)
7. **FFUF** - Fast web fuzzer (MCP_FFUF_ENABLED) **NEW!**
8. **WPScan** - WordPress security (MCP_WPSCAN_ENABLED) **NEW!**

### Mobile Security (1 tool)
9. **MobSF** - Android/iOS analysis (MCP_MOBSF_ENABLED) **NEW!**

### Network Security (2 tools)
10. **Nmap** - Network scanning (MCP_NMAP_ENABLED)
11. **Masscan** - Ultra-fast port scanning (MCP_MASSCAN_ENABLED)

### Reconnaissance (3 tools)
12. **Amass** - Subdomain enumeration (MCP_AMASS_ENABLED)
13. **Gowitness** - Visual recon (MCP_GOWITNESS_ENABLED) **NEW!**
14. **Cero** - Certificate transparency (MCP_CERO_ENABLED) **NEW!**

### Enabling MCP Tools

Edit `.env` file:
```bash
# Enable specific tools
MCP_NUCLEI_ENABLED=true
MCP_SSLSCAN_ENABLED=true
MCP_MOBSF_ENABLED=true

# Or enable all web security tools
MCP_NUCLEI_ENABLED=true
MCP_SSLSCAN_ENABLED=true
MCP_SQLMAP_ENABLED=true
MCP_FFUF_ENABLED=true
MCP_WPSCAN_ENABLED=true
```

No installation needed! MCP tools are automatically installed via `npx` when first used.

---

## Quick Reference

### Most Common Commands

```bash
# Get started
cyber-claude                           # Interactive session (recommended)
cyber-claude flows                     # Browse workflows (beginner-friendly)

# Security scanning
cyber-claude scan                      # Desktop security scan
cyber-claude webscan https://example.com  # Web vulnerability scan
cyber-claude mobilescan app.apk        # Mobile app scan (NEW!)

# OSINT
cyber-claude recon example.com --full  # Full reconnaissance

# Analysis
cyber-claude pcap capture.pcap         # Network traffic analysis

# Interactive mode
> mode redteam                         # Switch to red team perspective
> model                                # Select AI model
> webscan https://staging.myapp.com    # Scan in session
> exit                                 # Leave session
```

### Getting Help

```bash
cyber-claude --help                    # Show all commands
cyber-claude <command> --help          # Command-specific help
> help                                 # Help in interactive mode
```

---

## Tips & Best Practices

1. **Start with Workflows**: `cyber-claude flows` provides guided experiences
2. **Use Interactive Mode**: Better experience than one-off commands
3. **Enable MCP Tools**: Set environment variables for professional tools
4. **Model Selection**:
   - Daily work → Sonnet 4.5
   - Deep analysis → Opus 4.1
   - Quick checks → Haiku 4
   - Cost-efficient → Gemini Flash
5. **Authorization Required**: Always get written permission before scanning systems
6. **Export Results**: Use `--json` and `--md` flags for reporting

---

## Version
v0.6.0 - Updated with mobile security, web fuzzing, WordPress scanning, and enhanced OSINT tools
