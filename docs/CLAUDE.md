# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cyber Claude is an AI-powered cybersecurity agent CLI that supports multiple AI providers (Claude and Gemini). It provides desktop security scanning, web application vulnerability testing, network traffic analysis (pcap), OSINT reconnaissance, system hardening checks, and interactive chat capabilities with persistent REPL-style sessions.

**Key Differentiators**:
- Multi-provider architecture allowing seamless switching between Claude (Anthropic) and Gemini (Google) models
- Comprehensive web security testing with OWASP Top 10 coverage
- AI-powered network traffic analysis with pcap file support (Wireshark-inspired CLI)
- Professional OSINT suite with 10+ reconnaissance tools (no API keys required)
- Ethical-first design with built-in authorization framework and domain blocklists

## Build & Development Commands

```bash
# Development (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Run built CLI
npm start
# or
cyber-claude

# Test CLI in dev mode
npm run dev -- scan --quick
npm run dev -- webscan https://example.com
npm run dev -- pcap capture.pcap
npm run dev -- recon example.com --full
npm run dev -- interactive
```

## Project Architecture

### Multi-Provider System

The core architecture uses a **provider abstraction pattern** to support multiple AI backends:

```
CyberAgent (src/agent/core.ts)
    ↓
AIProvider interface (src/agent/providers/base.ts)
    ↓
├─ ClaudeProvider (src/agent/providers/claude.ts) - Anthropic SDK
└─ GeminiProvider (src/agent/providers/gemini.ts) - Google Generative AI SDK
```

**Critical Implementation Details:**
- Provider selection happens in `CyberAgent` constructor based on model's `provider` field
- Both providers must conform to `AIProvider.chat()` interface: `(messages: ConversationMessage[], systemPrompt: string) => Promise<string>`
- Conversation history is provider-agnostic (`ConversationMessage[]`) and preserved across provider switches
- Model metadata in `src/utils/models.ts` includes `provider: 'claude' | 'gemini'` field that drives provider selection

### Agent Modes & System Prompts

Six operational modes defined in `src/agent/prompts/system.ts` (all lowercase):
- `base` - General security assistant
- `redteam` - Offensive security perspective (defensive only)
- `blueteam` - Defensive operations focus
- `desktopsecurity` - Personal computer security
- `webpentest` - Web application security testing (OWASP Top 10, CTF support)
- `osint` - Open Source Intelligence reconnaissance

**Important**: All mode names are lowercase (changed in v0.3.0).

System prompts are composed by combining base prompt + mode-specific prompt in `CyberAgent.getSystemPrompt()`.

### Interactive Session Architecture

`InteractiveSession` class (`src/cli/session.ts`) implements persistent REPL:
- Maintains `SessionState` with agent instance, mode, model, and command history
- Built-in commands (`scan`, `webscan`, `pcap`, `harden`, `mode`, `model`, `status`, `help`) are parsed in `handleCommand()`
- Non-command input is passed directly to `CyberAgent.chat()`
- Model switching recreates `CyberAgent` instance with new provider but preserves session context

### CLI Structure

```
src/cli/index.ts (entry point)
    ↓
Commands (Commander.js):
├─ interactive (default) - Persistent REPL session
├─ flows - Pre-configured workflows for common tasks
├─ auto - Autonomous AI execution with planning and self-correction (NEW! v0.6.0 - Advanced)
├─ scan - Desktop security scanning (quick/full/network)
├─ webscan - Web application vulnerability scanning
├─ recon - OSINT reconnaissance (quick/full/domain/person)
├─ pcap - Network traffic analysis (.pcap/.pcapng files)
├─ harden - System hardening checks
└─ chat - One-off chat mode
```

Default behavior: `cyber-claude` with no args starts interactive session.

**New in v0.6.0 - Auto Command**: The `auto` command enables autonomous AI execution where the agent plans tasks, executes steps, reflects on results, and self-corrects. Powered by agentic core (`src/agent/core/agentic.ts`) with planning, reflection, and validation. See `src/cli/commands/auto.ts` for implementation.

**Flows Command**: The `flows` command provides beginner-friendly, pre-configured workflows that combine multiple tools and steps into guided experiences. Perfect for learning or quickly executing common security tasks. See `src/cli/commands/flows.ts` for workflow definitions.

### Security Tools

**Desktop Security Tools** (`src/agent/tools/`):
- **DesktopScanner** - Uses `systeminformation` npm package to gather OS, process, network, storage data
- **HardeningChecker** - Platform-specific checks (macOS FileVault, Linux UFW, Windows Defender) via shell commands
- **SecurityReporter** - Formats `SecurityFinding[]` into terminal UI and exports to JSON/Markdown

**Web Security Tools** (`src/agent/tools/web/`):
- **HttpClient** - HTTP operations with cookie management, timeout controls, custom headers
- **HeaderAnalyzer** - Security header analysis (CSP, HSTS, X-Frame-Options, cookie security)
- **WebScanner** - Orchestrates quick/full web vulnerability scans
- **Authorization** - Ethical scanning framework with domain blocklists and user consent workflows

**Network Analysis Tools** (`src/agent/tools/`):
- **PcapAnalyzer** - Parses pcap/pcapng files, extracts packets, protocols, conversations, endpoints
- **PcapReporter** - Formats pcap analysis results with statistics, exports to JSON/Markdown/CSV

**OSINT Tools** (`src/agent/tools/osint/`):
- **DNSRecon** - DNS reconnaissance using Node.js built-in dns module (no API key)
- **WhoisLookup** - Domain WHOIS information using whois-json package (no API key)
- **SubdomainEnum** - Certificate transparency logs (crt.sh) + DNS brute forcing (no API key)
- **EmailHarvest** - Email harvesting from websites and common patterns (no API key)
- **UsernameEnum** - Username enumeration across 35+ social media platforms (no API key)
- **BreachCheck** - Data breach lookup using Have I Been Pwned API (no API key)
- **Wayback** - Wayback Machine/Archive.org historical data (no API key)
- **TechDetect** - Technology stack detection (reverse-engineered Wappalyzer approach, no API key)
- **IPLookup** - IP geolocation (ip-api.com) and reverse IP lookup (HackerTarget, no API key)
- **OSINTOrchestrator** - Coordinates all OSINT tools for comprehensive reconnaissance
- **OSINTReporter** - Formats and exports OSINT results to JSON/Markdown

Tools collect data, then `CyberAgent.analyze()` passes data + task description to AI for analysis.

**Web Security Features**:
- OWASP Top 10 vulnerability detection
- Security header analysis
- CSRF token detection
- Cookie security assessment
- Form security analysis
- Information disclosure checks
- CTF challenge support

**Network Traffic Analysis Features**:
- Protocol dissection (Ethernet, IPv4/IPv6, TCP/UDP, HTTP, DNS, ICMP, ARP)
- Packet parsing and statistics
- Conversation/flow tracking
- Endpoint analysis
- DNS query extraction
- HTTP request extraction
- Anomaly detection (port scans, suspicious ports, unencrypted traffic)
- Display filters (protocol, IP, port filtering)
- Multiple analysis modes (quick, full, threat-hunt)
- Export capabilities (JSON, Markdown, CSV)
- Link layer type detection (Ethernet, Raw IP, Linux SLL)

**OSINT Reconnaissance Features** (All tools require NO API keys):
- **DNS Reconnaissance** - A/AAAA/MX/NS/TXT/CNAME/SOA records, reverse DNS, security posture analysis
- **WHOIS Lookup** - Domain registration info, age analysis, DNSSEC status, expiration tracking
- **Subdomain Enumeration** - Certificate transparency logs (crt.sh), DNS brute forcing, 100+ common subdomains
- **Email Harvesting** - Website scraping, mailto links, meta tags, common email patterns (info@, contact@, etc.)
- **Username Enumeration** - 35+ platforms (GitHub, Twitter, Instagram, LinkedIn, Reddit, YouTube, etc.)
- **Breach Data Lookup** - Have I Been Pwned integration, password breach checking (k-anonymity), breach severity analysis
- **Technology Detection** - Web server, CMS, frameworks, analytics, CDN, security tools (50+ signatures)
- **Wayback Machine** - Historical snapshots, first/last archived dates, change detection, domain history
- **IP Geolocation** - Country/city/ISP/org lookup, timezone, coordinates (ip-api.com)
- **Reverse IP Lookup** - Find other domains on same IP, shared hosting detection (HackerTarget)
- **Risk Scoring** - Automated risk assessment based on exposed data, age, breaches, and attack surface
- **Export Options** - JSON and Markdown export for all reconnaissance results

**OSINT Command Modes**:
- `recon <target>` or `recon <target> --quick` - Essential information only (WHOIS, DNS, IPs)
- `recon <target> --full` - Comprehensive scan (all 10 tools, takes 2-5 minutes)
- `recon <domain> --domain` - Domain-focused (WHOIS, DNS, subdomains, emails, tech, wayback)
- `recon <username> --person` - Person-focused (username enumeration, breach data if email)

**OSINT Subcommands**:
- `recon dns <domain>` - DNS reconnaissance only
- `recon subdomains <domain>` - Subdomain enumeration only
- `recon emails <domain>` - Email harvesting only
- `recon username <username>` - Username enumeration only
- `recon breach <email>` - Breach data check only
- `recon tech <url>` - Technology detection only
- `recon ip <ip>` - IP analysis only (geolocation + reverse IP)

### Autonomous Agent Mode (v0.6.0)

**Agentic Core Architecture** (`src/agent/core/`):
- **AgenticCore** (`src/agent/core/agentic.ts`) - Main orchestrator for autonomous task execution
- **Planner** (`src/agent/core/planner.ts`) - AI-powered task decomposition and step generation
- **Context Manager** (`src/agent/core/context.ts`) - Execution state, findings, and conversation history
- **Reflection** (`src/agent/core/reflection.ts`) - Self-assessment and strategy adaptation
- **Validator** (`src/agent/core/validator.ts`) - Step validation and safety checks

**Autonomous Execution Flow**:
```typescript
// Create autonomous agent
const agent = new AgenticCore({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-5',
  mode: 'webpentest',
  maxSteps: 20,
  useExtendedThinking: true,
  requireApprovalCallback: requestUserApproval
});

// Execute task autonomously
const result = await agent.executeTask(
  "scan example.com for OWASP Top 10 vulnerabilities"
);

// Agent automatically:
// 1. Plans steps (using Planner)
// 2. Executes tools (using ToolRegistry)
// 3. Reflects on results (using Reflection)
// 4. Adapts strategy if needed
// 5. Generates findings and recommendations
```

**Tool Registry** (`src/agent/tools/registry.ts`):
- Comprehensive metadata for all available security tools
- Enables AI to intelligently select appropriate tools
- Supports parameter inference and validation
- Includes risk levels and approval requirements

**Safety Controls**:
- Step-by-step approval for high-risk operations
- Risk level assessment (low/medium/high)
- Maximum step and duration limits
- Validation of tool parameters and outputs
- Ethical constraints enforced in system prompts

### Professional Analysis Features

**IOC Extraction** (`src/utils/ioc.ts`):
- Pattern-based extraction: IPv4, domains, URLs, emails, MD5/SHA1/SHA256 hashes, CVEs
- Smart filtering: excludes private IPs (10.x, 192.168.x, 127.x), reserved ranges, false positives
- Context tracking: associates IOCs with their source (DNS query, HTTP request, alert)
- Frequency analysis: counts IOC occurrences
- STIX 2.1 export: standard threat intelligence format

**MITRE ATT&CK Mapping** (`src/utils/mitre.ts`):
- 20+ technique definitions covering all attack phases
- Automatic mapping based on keywords and patterns
- Confidence scoring (high/medium/low)
- Multiple tactics support per technique
- Direct links to MITRE documentation
- Categories: Initial Access, Execution, Persistence, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Exfiltration, Command & Control

**Evidence Preservation** (`src/utils/evidence.ts`):
- Triple hash calculation: MD5, SHA1, SHA256 for file integrity
- Chain of custody tracking: analyst name, case number, timestamps
- Collection metadata: method, location, system info
- Integrity verification: rehash and compare
- JSON export: forensically sound evidence packages
- Case management: organizes evidence by case number

**PCAP Command Professional Options**:
- `--extract-iocs` - Extract indicators of compromise
- `--export-iocs <file>` - Export IOCs in STIX 2.1 format
- `--mitre` - Map findings to MITRE ATT&CK techniques
- `--preserve-evidence` - Create evidence package with chain of custody
- `--case-number <number>` - Case number for evidence tracking
- `--analyst <name>` - Analyst name for chain of custody

## Environment Configuration

Two API keys supported (at least one required):
```bash
ANTHROPIC_API_KEY=sk-ant-...  # For Claude models
GOOGLE_API_KEY=AIza...         # For Gemini models
MODEL=claude-sonnet-4-5        # Default model (can be any key from AVAILABLE_MODELS)
```

Validation in `src/utils/config.ts` checks that at least one API key exists.

## Model System

9 total models defined in `src/utils/models.ts` as `AVAILABLE_MODELS` object:
- 6 Claude models (opus-4.1, opus-4, sonnet-4.5, sonnet-4, sonnet-3.7, haiku-3.5)
- 3 Gemini models (gemini-2.5-flash, gemini-2.5-pro, gemini-2.5-flash-lite)

Model object structure:
```typescript
{
  id: string,           // API model identifier
  name: string,         // Display name
  description: string,  // Usage description
  provider: 'claude' | 'gemini',  // CRITICAL: drives provider selection
  recommended: boolean
}
```

Model selection throughout codebase uses `--model <key>` flag (e.g., `--model gemini-2.5-flash`), where `<key>` is the object key in `AVAILABLE_MODELS`, NOT the `id` field.

## Important Patterns

### Adding a New AI Provider

1. Create provider class in `src/agent/providers/` implementing `AIProvider` interface
2. Add provider type to `Provider` union type in `src/utils/models.ts`
3. Add provider's models to `AVAILABLE_MODELS` with correct `provider` field
4. Add provider initialization case in `CyberAgent` constructor
5. Pass new API key through `AgentConfig` interface in `src/agent/types.ts`
6. Update `config.ts` to load new API key from environment
7. Update all `new CyberAgent()` calls to pass new API key

### Adding a New Command

1. Create command file in `src/cli/commands/` exporting `createXCommand()` function
2. Register command in `src/cli/index.ts` with `program.addCommand()`
3. If command should work in interactive session, add handling in `InteractiveSession.handleCommand()`

### Module System

**Critical**: This is an ESM-only project (`"type": "module"` in package.json). All imports MUST include `.js` extension:
```typescript
import { config } from '../utils/config.js';  // ✓ Correct
import { config } from '../utils/config';     // ✗ Will not resolve
```

TypeScript compiles `.ts` to `.js` but doesn't change import paths, so `.js` extensions are required even in `.ts` source files.

## UI System

`src/utils/ui.ts` provides consistent terminal styling:
- `ui.banner()` - ASCII art with gradient
- `ui.section()`, `ui.box()` - Formatted sections
- `ui.spinner()` - Loading states (returns Ora instance)
- `ui.finding()` - Security finding with severity colors
- `ui.success/error/warning/info()` - Status messages
- `ui.formatAIResponse()` - Converts markdown to terminal-friendly formatting (bold, italic, code blocks, headers, lists)

All CLI output should use `ui` module for consistency, NOT direct `console.log()`. All AI responses should be passed through `ui.formatAIResponse()` before display.

## Logging

Winston logger in `src/utils/logger.ts` logs to files:
- `cyber-claude.log` - All levels
- `cyber-claude-error.log` - Errors only

Logger is used internally for debugging. User-facing output goes through `ui` module.

## Dependencies

**Core Dependencies**:
- `@anthropic-ai/sdk` - Claude AI integration
- `@google/generative-ai` - Gemini AI integration
- `@modelcontextprotocol/sdk` - MCP client for security tool integration
- `systeminformation` - Desktop system information gathering
- `pcap-parser` - Network capture file parsing
- `axios` - HTTP client for web scanning
- `cheerio` - HTML parsing for web analysis
- `validator` - URL and input validation
- `inquirer` - Interactive CLI prompts
- `chalk`, `boxen`, `ora` - Terminal UI
- `uuid` - Unique ID generation
- `winston` - Logging framework

**Professional Features**:
- IOC extraction patterns (built-in regex)
- MITRE ATT&CK mappings (built-in database)
- Evidence preservation (crypto module for hashing)

## Security Constraints

All system prompts enforce defensive-only operations:
- No actual exploitation
- No credential harvesting
- Simulation and assessment only
- User consent required for system changes

**Web Scanning Ethical Framework**:
- **Authorization required** before every web scan
- **Domain blocklists** prevent scanning of banks, government, production services
- **Legal warnings** displayed prominently to users
- **Double confirmation** required for production websites
- **CTF mode** with separate authorization flow
- **Rate limiting** respects target servers
- **Non-destructive testing** (read-only by default)
- **Audit logging** tracks all scan authorizations

These constraints are embedded in `SYSTEM_PROMPTS.base` and the `Authorization` class, and should be preserved in any modifications.
- Always update claude.md and readme.md when you make important updates