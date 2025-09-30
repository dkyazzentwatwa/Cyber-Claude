# 📁 Project Structure

## Overview
```
cyber_claude/
├── src/                      # Source code
├── dist/                     # Compiled output
├── research/                 # Research documentation
├── node_modules/             # Dependencies
├── package.json              # Project configuration
├── tsconfig.json             # TypeScript configuration
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── README.md                 # Main documentation
├── QUICKSTART.md             # Quick start guide
└── PROJECT_STRUCTURE.md      # This file
```

## Source Code Structure (`src/`)

### 📂 `agent/` - Core Agent System
The heart of Cyber Claude - AI agent implementation using Claude SDK.

```
agent/
├── core.ts              # Main agent class with Claude SDK integration
├── types.ts             # TypeScript interfaces and types
├── prompts/
│   └── system.ts        # System prompts for different modes
└── tools/
    ├── scanner.ts       # Desktop security scanner
    ├── hardening.ts     # System hardening checker
    └── reporter.ts      # Report generation and formatting
```

**Key Files:**
- `core.ts` - CyberAgent class that communicates with Claude API
- `types.ts` - Defines SecurityFinding, ScanResult, AgentMode, etc.
- `prompts/system.ts` - Contains prompts for base, redTeam, blueTeam, desktopSecurity modes
- `tools/scanner.ts` - Uses systeminformation library to gather system data
- `tools/hardening.ts` - Platform-specific security checks
- `tools/reporter.ts` - Beautiful terminal reports with tables and colors

### 📂 `cli/` - Command Line Interface
Beautiful CLI implementation with Commander.js and rich UI components.

```
cli/
├── index.ts             # Main CLI entry point
└── commands/
    ├── scan.ts          # Security scan command
    ├── harden.ts        # Hardening check command
    └── chat.ts          # Interactive chat command
```

**Key Files:**
- `index.ts` - CLI setup, command registration, default action
- `commands/scan.ts` - Implements: scan, scan --quick, scan --network
- `commands/harden.ts` - Implements: harden, harden --recommendations
- `commands/chat.ts` - Interactive mode with inquirer.js

### 📂 `utils/` - Utility Functions
Shared utilities for configuration, logging, and UI.

```
utils/
├── config.ts            # Environment configuration
├── logger.ts            # Winston logger setup
└── ui.ts                # Beautiful UI components
```

**Key Files:**
- `config.ts` - Loads .env, validates API key, exports config object
- `logger.ts` - File and console logging with Winston
- `ui.ts` - ASCII art, gradients, spinners, boxes, colors

### 📂 `integrations/` - External Integrations
Reserved for future integrations (MITRE ATT&CK, CVE database, etc.)

```
integrations/
└── (empty - ready for future integrations)
```

### 📄 `index.ts` - Public API
Main entry point for programmatic usage (if imported as a library).

```typescript
export { CyberAgent } from './agent/core.js';
export { DesktopScanner } from './agent/tools/scanner.js';
export { HardeningChecker } from './agent/tools/hardening.js';
// ... etc
```

## Research Documentation (`research/`)

```
research/
├── claude-agent-sdk-overview.md              # SDK documentation
├── cybersecurity-agent-capabilities.md       # Security features research
└── implementation-recommendations.md         # Architecture decisions
```

## Configuration Files

### `package.json`
- Dependencies: Claude SDK, CLI libraries, UI libraries
- Scripts: dev, build, start, test
- Binary: cyber-claude command

### `tsconfig.json`
- Target: ES2022
- Module: ES2022
- Strict mode enabled
- Output to `dist/`

### `.env.example`
Template for environment variables:
```
ANTHROPIC_API_KEY=your_key_here
MODEL=claude-sonnet-4-20250514
MAX_TOKENS=4096
LOG_LEVEL=info
SAFE_MODE=true
```

## Build Output (`dist/`)

Compiled TypeScript → JavaScript with source maps:
```
dist/
├── agent/
│   ├── core.js
│   ├── types.js
│   ├── prompts/
│   └── tools/
├── cli/
│   ├── index.js          # #!/usr/bin/env node
│   └── commands/
├── utils/
└── index.js
```

## Data Flow

### 1. Scan Command Flow
```
User runs: cyber-claude scan
    ↓
cli/commands/scan.ts
    ↓
agent/tools/scanner.ts → Collects system data
    ↓
agent/core.ts → Sends to Claude API
    ↓
agent/tools/reporter.ts → Formats output
    ↓
Beautiful terminal UI displayed
```

### 2. Chat Command Flow
```
User runs: cyber-claude chat
    ↓
cli/commands/chat.ts → Interactive loop
    ↓
User types message
    ↓
agent/core.ts → Sends to Claude with system prompt
    ↓
Response displayed with formatting
    ↓
Loop continues until /exit
```

### 3. Harden Command Flow
```
User runs: cyber-claude harden
    ↓
cli/commands/harden.ts
    ↓
agent/tools/hardening.ts → Runs platform checks
    ↓
agent/core.ts → AI analyzes findings
    ↓
agent/tools/reporter.ts → Creates report
    ↓
Terminal output + optional JSON/MD export
```

## Key Dependencies

### Production
- `@anthropic-ai/sdk` - Claude API client
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `gradient-string` - Color gradients
- `figlet` - ASCII art
- `boxen` - Terminal boxes
- `ora` - Loading spinners
- `cli-table3` - Formatted tables
- `systeminformation` - System data collection
- `winston` - Logging
- `dotenv` - Environment variables

### Development
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution
- `@types/*` - Type definitions
- `vitest` - Testing framework

## File Size Reference

**Source Files:**
- Total: ~1,619 lines of TypeScript
- Largest: scanner.ts (~210 lines)
- Average: ~115 lines per file

**Compiled Output:**
- JavaScript + source maps
- ~2-3x source size (with maps and declarations)

## Adding New Features

### Adding a New Command
1. Create `src/cli/commands/your-command.ts`
2. Export createYourCommand() function
3. Register in `src/cli/index.ts`

### Adding a New Tool
1. Create `src/agent/tools/your-tool.ts`
2. Implement tool logic
3. Use in command handler
4. Add types to `src/agent/types.ts`

### Adding a New Agent Mode
1. Add mode to `AgentMode` type in `src/agent/types.ts`
2. Add system prompt in `src/agent/prompts/system.ts`
3. Update chat command mode validation

## Security Considerations

### Sensitive Files (gitignored)
- `.env` - Contains API keys
- `*.log` - May contain system information
- Generated reports - May contain sensitive findings

### Safe to Commit
- Source code (`src/`)
- Configuration templates (`.env.example`)
- Documentation
- Build configuration

### Execution Permissions
- `dist/cli/index.js` - Executable CLI entry point
- Other files - Regular file permissions

## Logs and Output

### Log Files
- `cyber-claude.log` - All log levels
- `cyber-claude-error.log` - Errors only
- Location: Project root directory

### Report Files
- `*.json` - JSON export (when using --json flag)
- `*.md` - Markdown export (when using --md flag)
- Location: Current working directory

---

**Navigation:**
- [Main README](README.md)
- [Quick Start Guide](QUICKSTART.md)
- [Research Notes](research/)