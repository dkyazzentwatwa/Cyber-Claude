# Changelog

All notable changes to Cyber Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2025-11-24

### Added

- **Advanced Web Vulnerability Testing** (`webscan --aggressive`): Payload-based vulnerability detection
  - **PayloadDatabase**: 65+ real-world vulnerability payloads
    - 20+ SQL injection payloads (classic, union, error-based, time-based, boolean)
    - 15+ XSS payloads (basic, event handler, encoded, polyglot, DOM-based)
    - 10+ command injection payloads (Unix, Windows, bypass techniques)
    - 10+ path traversal payloads (basic, encoded, null byte, unicode)
    - 10+ SSRF payloads (basic, AWS/GCP/Azure metadata, internal network)
  - **VulnDetector**: Pattern-based vulnerability detection with confidence scoring
  - **VulnTester**: Orchestrated vulnerability testing with rate limiting
  - **WebScanner enhancements**: aggressiveScan() method with evidence collection
  - **CLI updates**: --aggressive, --test-types, --max-payloads flags
  - **Evidence reporting**: Payload, parameter, and response evidence in scan results
  - Supports SQLi, XSS, Command Injection, Path Traversal, and SSRF detection

- **Daemon Mode for Scheduled Scanning** (`cyber-claude daemon`): Background scheduled security scanning
  - **Cron-based scheduling**: Schedule scans to run automatically (every 6 hours, daily, weekly, etc.)
  - **Job management**: Add, remove, enable, disable, and execute jobs
  - **Multiple job types**: webscan (quick/full/aggressive), log-analysis, cve-check
  - **Persistent configuration**: Jobs saved to .cyber-claude/jobs.json
  - **Automatic result storage**: Scan results saved to .cyber-claude/results/{job-id}/
  - **Execution tracking**: Last run, next run, duration, findings count, and error tracking
  - **Status monitoring**: Real-time daemon status, running jobs, and next scheduled runs
  - **Subcommands**: start, stop, status, jobs (list), add, remove, enable, disable, run
  - **Configurable options**: Max concurrent jobs, retry attempts, rate limiting
  - **Future-ready**: Notification infrastructure (email, webhook) for alerts

- **Log Analysis Command** (`cyber-claude logs <file>`): Analyze security logs with AI-powered insights
  - 6 log format parsers: syslog, apache, auth, json, windows, firewall
  - 15+ anomaly detection types: brute force, SQL injection, port scans, privilege escalation, etc.
  - IOC extraction (IPs, domains, hashes, emails) with MITRE ATT&CK mapping
  - Three analysis modes: quick, full, threat-hunt
  - Export capabilities: JSON and Markdown reports

- **CVE Lookup Command** (`cyber-claude cve <cve-id>`): Search National Vulnerability Database
  - Direct CVE ID lookup with detailed information
  - Search by product name and version
  - Keyword and severity filtering
  - CVSS scoring and severity classification
  - CWE (Common Weakness Enumeration) mapping
  - Affected version tracking and fix recommendations
  - Local cache with 24-hour TTL for faster repeated lookups

- **Multi-Provider Smart Fallbacks**: Intelligent provider switching and error recovery
  - Automatic provider availability detection at startup
  - Credit/billing error detection with helpful suggestions
  - Authentication error handling with setup guidance
  - Rate limit error handling
  - Ollama health checking (local model support)
  - Context-aware error messages with alternative provider suggestions

- **Enhanced Provider Support**:
  - Improved Ollama integration for offline/privacy-focused usage
  - Better error messages for all providers (Claude, Gemini, Ollama)
  - Provider health status displayed at startup
  - No API key required messaging when Ollama is available

### Changed

- CLI now checks all providers (Claude, Gemini, Ollama) before requiring setup
- Improved startup experience with provider availability status
- Better error messages when API credits are depleted
- Enhanced type safety in CLI commands (cve.ts, logs.ts)
- Updated CLI version to 0.6.0

### Fixed

- **TypeScript Build Errors**: Resolved 5 compilation errors in new commands
  - Fixed severity emoji/color mapping type errors in cve.ts
  - Fixed LogAnalysisOptions type usage in logs.ts
  - Fixed unknown type for count variable in severity distribution
- Provider type tracking for better error suggestions

### Dependencies

- **Added**: `cron` - Cron-based job scheduling for daemon mode
- **Added**: `@types/cron` - TypeScript type definitions for cron

### Documentation

- Updated CHANGELOG with comprehensive v0.6.0 release notes
- Added log analysis, CVE lookup, daemon mode, and advanced web scanning documentation
- Updated roadmap to reflect all completed Phase 3 features
- Added daemon command documentation with cron expression examples
- Updated webscan command documentation with aggressive scan options

## [0.3.0] - 2025-09-30

### Added

- **Workflows System**: Pre-configured flows command with 10 beginner-friendly workflows
  - Quick security check, website security audit, domain intel gathering
  - Incident response triage, system hardening, CTF reconnaissance
  - Learning workflows for security concepts
  - Interactive workflow selection with step-by-step execution

- **OSINT Reconnaissance Suite**: 10 professional OSINT tools (no API keys required)
  - DNS reconnaissance, WHOIS lookup, subdomain enumeration
  - Email harvesting, username enumeration, breach data checking
  - Technology detection, Wayback Machine integration
  - IP geolocation and reverse IP lookup
  - Automated risk scoring and comprehensive reporting

- **MCP Tool Integration**: 9 professional security tools via Model Context Protocol
  - Nuclei, SSLScan, SQLmap, Nmap, Httpx
  - Katana, Amass, Masscan, HTTP Headers analyzer

- **Professional Analysis Features**:
  - IOC extraction with STIX 2.1 export
  - MITRE ATT&CK technique mapping
  - Evidence preservation with chain of custody
  - Triple hash verification (MD5/SHA1/SHA256)

### Changed

- Agent modes now use lowercase naming (base, redteam, blueteam, etc.)
- Interactive session is now the default command
- Improved error handling and user feedback
- Enhanced terminal UI with better formatting

### Fixed

- Flows command execution in interactive session
- UI section rendering (undefined display bug)
- Model switching with conversation history preservation

## [0.2.0] - 2025-09-25

### Added

- Multi-provider AI architecture (Claude + Gemini support)
- Web application security scanning with OWASP Top 10 coverage
- Network traffic analysis (PCAP/PCAPNG file support)
- System hardening checks
- Interactive REPL session with persistent state

### Changed

- Restructured CLI commands for better usability
- Improved documentation and README

## [0.1.0] - 2025-09-20

### Added

- Initial release
- Desktop security scanning
- Basic AI-powered security analysis
- CLI interface with Commander.js
- TypeScript implementation with ESM modules
