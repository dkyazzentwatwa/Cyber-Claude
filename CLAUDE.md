# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cyber Claude is an AI-powered cybersecurity agent CLI that supports multiple AI providers (Claude and Gemini). It provides desktop security scanning, web application vulnerability testing, system hardening checks, and interactive chat capabilities with persistent REPL-style sessions.

**Key Differentiators**:
- Multi-provider architecture allowing seamless switching between Claude (Anthropic) and Gemini (Google) models
- Comprehensive web security testing with OWASP Top 10 coverage
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

Five operational modes defined in `src/agent/prompts/system.ts` (all lowercase):
- `base` - General security assistant
- `redteam` - Offensive security perspective (defensive only)
- `blueteam` - Defensive operations focus
- `desktopsecurity` - Personal computer security
- `webpentest` - Web application security testing (OWASP Top 10, CTF support)

**Important**: All mode names are lowercase (changed in v0.3.0).

System prompts are composed by combining base prompt + mode-specific prompt in `CyberAgent.getSystemPrompt()`.

### Interactive Session Architecture

`InteractiveSession` class (`src/cli/session.ts`) implements persistent REPL:
- Maintains `SessionState` with agent instance, mode, model, and command history
- Built-in commands (`scan`, `webscan`, `harden`, `mode`, `model`, `status`, `help`) are parsed in `handleCommand()`
- Non-command input is passed directly to `CyberAgent.chat()`
- Model switching recreates `CyberAgent` instance with new provider but preserves session context

### CLI Structure

```
src/cli/index.ts (entry point)
    ↓
Commands (Commander.js):
├─ interactive (default) - Persistent REPL session
├─ scan - Desktop security scanning (quick/full/network)
├─ webscan - Web application vulnerability scanning
├─ harden - System hardening checks
└─ chat - One-off chat mode
```

Default behavior: `cyber-claude` with no args starts interactive session (changed in v0.2.0).

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

Tools collect data, then `CyberAgent.analyze()` passes data + task description to AI for analysis.

**Web Security Features**:
- OWASP Top 10 vulnerability detection
- Security header analysis
- CSRF token detection
- Cookie security assessment
- Form security analysis
- Information disclosure checks
- CTF challenge support

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
- `systeminformation` - Desktop system information gathering
- `axios` - HTTP client for web scanning
- `cheerio` - HTML parsing for web analysis
- `validator` - URL and input validation
- `inquirer` - Interactive CLI prompts
- `chalk`, `boxen`, `ora` - Terminal UI
- `uuid` - Unique ID generation

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