# Changelog

All notable changes to Cyber Claude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
