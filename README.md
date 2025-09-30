# 🛡️ Cyber Claude

**AI-Powered Cybersecurity Agent for Red/Blue Teaming and Desktop Security**

An MVP cybersecurity agent built with the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview), designed for defensive security operations, system hardening, and security analysis.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Claude](https://img.shields.io/badge/Claude-Sonnet%204-purple)

## 🆕 What's New in v0.3.0

**🎉 Google Gemini Integration + Multi-Provider Support!**

- **🔮 Gemini API Support**: Use Google's Gemini 2.5 models alongside Claude!
  ```bash
  cyber-claude scan --model gemini-2.5-flash    # Fast & cost-effective
  cyber-claude scan --model opus-4.1            # Or use Claude
  > model                                        # Switch in session!
  ```

- **9 Total Models**: 6 Claude models + 3 Gemini models to choose from
- **Provider Abstraction**: Seamless switching between Claude and Gemini
- **📖 See [GEMINI_INTEGRATION.md](GEMINI_INTEGRATION.md)** for Gemini setup!

**Previous Updates (v0.2.0):**
- ✨ Interactive Session (REPL) - persistent, no re-typing commands
- 🤖 Model Selector - choose from multiple AI models
- 📖 See [FEATURES.md](FEATURES.md) for all features

## ✨ Features

### 🔄 Interactive Session (NEW!)
- **Persistent REPL Interface**: Like Claude Code - single session, no re-typing
- **Natural Commands**: Just type `scan`, `harden`, `mode redTeam`, etc.
- **Command History**: Use ↑/↓ arrows to navigate
- **Mode-Colored Prompts**: Visual feedback for current mode
- **Built-in Help**: Type `help` for all commands

### 🔍 Security Scanning
- **Desktop Security Scan**: Comprehensive system analysis
- **Quick Check**: Rapid security assessment
- **Network Analysis**: Connection monitoring and threat detection
- **Process Monitoring**: Identify suspicious activity

### 🔒 System Hardening
- **Hardening Checks**: Verify security configurations
- **Platform-Specific Recommendations**: macOS, Linux, Windows
- **Compliance Validation**: Security baseline checking
- **AI-Powered Recommendations**: Prioritized, actionable advice

### 🤖 Multi-Provider AI Models (NEW!)
- **9 Models Total**: 6 Claude + 3 Gemini models
- **Claude Models**: Opus 4.1, Opus 4, Sonnet 4.5 (default), Sonnet 4, Sonnet 3.7, Haiku 3.5
- **Gemini Models**: 2.5 Flash, 2.5 Pro, 2.5 Flash Lite
- **Interactive Selector**: Choose any model in session with menu
- **Seamless Switching**: Switch between Claude and Gemini anytime
- **Use Cases**: Opus for complex analysis, Gemini Flash for speed & cost-efficiency

### 💬 Multiple Agent Modes
- **Switch On-The-Fly**: Change modes without restarting
- **Modes Available**:
  - 🤖 **Base Mode**: General security assistant
  - ⚔️ **Red Team Mode**: Offensive security perspective (defensive only)
  - 🛡️ **Blue Team Mode**: Defensive operations focus
  - 🔒 **Desktop Security Mode**: Personal computer security

### 📊 Reporting
- **Beautiful Terminal UI**: Gradient colors, ASCII art, formatted tables
- **Export Options**: JSON and Markdown reports
- **Severity Classification**: Critical, High, Medium, Low, Info
- **Actionable Remediation**: Clear steps to fix issues

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd cyber_claude

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Basic Usage

**🌟 NEW: Interactive Session (Recommended!)**
```bash
# Start interactive session (now the default!)
cyber-claude

# Inside session, just type commands:
> scan                    # Quick security check
> scan full               # Full system scan
> harden                  # Check hardening
> mode redTeam            # Switch to red team mode
> model                   # Select AI model
> What are the top 3 risks on my system?  # Natural chat
> exit                    # Leave session
```

**📋 One-Off Commands (Still Available)**
```bash
# Perform security scan
cyber-claude scan
cyber-claude scan --quick
cyber-claude scan --network --model opus-4

# Check system hardening
cyber-claude harden --model haiku-4

# One-off chat mode
cyber-claude chat --mode redTeam
```

## 📖 Commands

### `cyber-claude` (default) / `cyber-claude interactive`
Start interactive session (NEW!)

**Options:**
- `-m, --mode <mode>` - Initial mode (base, redTeam, blueTeam, desktopSecurity)
- `--model <model>` - AI model (sonnet-4, opus-4, haiku-4, sonnet-3.5)

**Session Commands:**
- `scan` / `scan full` / `scan network` - Security scans
- `harden` - Hardening check
- `mode <mode>` - Switch mode
- `model` - Select AI model
- `status` - Show session info
- `clear` - Clear conversation
- `history` - Show command history
- `help` - Show help
- `exit` / `quit` - Exit

**Examples:**
```bash
cyber-claude                              # Start session
cyber-claude i                            # Short alias
cyber-claude interactive --mode redTeam   # Start in red team mode
cyber-claude i --model opus-4             # Start with Opus 4
```

### `cyber-claude scan`
Scan your system for security issues

**Options:**
- `-q, --quick` - Quick security check
- `-f, --full` - Full system scan (default)
- `-n, --network` - Network connections scan
- `--model <model>` - AI model to use
- `--json <file>` - Export results to JSON
- `--md <file>` - Export results to Markdown

**Examples:**
```bash
cyber-claude scan --quick
cyber-claude scan --network
cyber-claude scan --json report.json --md report.md
```

### `cyber-claude harden`
Check system hardening and get recommendations

**Options:**
- `-c, --check` - Check hardening status (default)
- `-r, --recommendations` - Get hardening recommendations
- `--model <model>` - AI model to use
- `--json <file>` - Export results to JSON
- `--md <file>` - Export results to Markdown

**Examples:**
```bash
cyber-claude harden
cyber-claude harden --recommendations
cyber-claude harden --json hardening-report.json
```

### `cyber-claude chat`
Interactive chat with security agent (one-off conversation)

**Note:** Consider using `cyber-claude interactive` for a better experience!

**Options:**
- `-m, --mode <mode>` - Agent mode (base, redTeam, blueTeam, desktopSecurity)
- `--model <model>` - AI model to use

**Chat Commands:**
- `/mode <mode>` - Switch agent mode
- `/clear` - Clear conversation history
- `/help` - Show help
- `/exit` - Exit chat mode

**Examples:**
```bash
cyber-claude chat
cyber-claude chat --mode blueTeam
```

## 🎨 Beautiful CLI Interface

Cyber Claude features a gorgeous terminal UI with:
- 🌈 **Gradient colors** for cybersecurity theme
- 🎭 **ASCII art banner** with ANSI Shadow font
- 📦 **Boxed messages** for important information
- ⚡ **Animated spinners** for loading states
- 🎯 **Severity indicators** with color coding
- 📊 **Formatted tables** for scan results

## 🔐 Security & Ethics

### Defensive Operations Only
- ✅ Security scanning and assessment
- ✅ Vulnerability identification
- ✅ Hardening recommendations
- ✅ Threat detection and analysis
- ❌ **NO** actual exploitation
- ❌ **NO** credential harvesting
- ❌ **NO** malicious operations

### Built-in Guardrails
- **Safe Mode**: Enabled by default
- **Audit Logging**: All actions logged
- **User Consent**: Required for system changes
- **Transparency**: Explains all actions
- **Ethical Boundaries**: Follows responsible disclosure

## 📁 Project Structure

```
cyber_claude/
├── src/
│   ├── agent/
│   │   ├── core.ts              # Main agent with Claude SDK
│   │   ├── types.ts             # TypeScript types
│   │   ├── prompts/
│   │   │   └── system.ts        # Agent system prompts
│   │   └── tools/
│   │       ├── scanner.ts       # Desktop security scanner
│   │       ├── hardening.ts     # System hardening checker
│   │       └── reporter.ts      # Report generation
│   ├── cli/
│   │   ├── index.ts             # CLI entry point
│   │   └── commands/
│   │       ├── scan.ts          # Scan command
│   │       ├── harden.ts        # Harden command
│   │       └── chat.ts          # Chat command
│   └── utils/
│       ├── config.ts            # Configuration
│       ├── logger.ts            # Logging
│       └── ui.ts                # Beautiful UI components
├── research/                     # Research documentation
├── .env.example                 # Environment template
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies
```

## 🛠️ Technology Stack

### Core
- **[Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)** - AI agent framework
- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment

### CLI & UI
- **Commander.js** - CLI framework
- **Inquirer.js** - Interactive prompts
- **Chalk** - Terminal colors
- **Gradient String** - Beautiful gradients
- **Figlet** - ASCII art
- **Boxen** - Terminal boxes
- **Ora** - Elegant spinners
- **CLI Table 3** - Formatted tables

### Security Tools
- **systeminformation** - System data collection
- **Winston** - Logging

## 🔧 Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build TypeScript
npm run build

# Run built version
npm start

# Run tests
npm test
```

## 📚 Resources

- [Claude Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
- [Building Agents with Claude](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Research Notes](./research/) - Detailed research on cybersecurity agents

## 🎯 Roadmap

### Phase 1: Core Agent ✅
- [x] Basic CLI with beautiful UI
- [x] Claude Agent SDK integration
- [x] Chat interface
- [x] Desktop security scanner
- [x] System hardening checker
- [x] Reporting system

### Phase 2: Enhanced Features
- [ ] Log file analysis
- [ ] MITRE ATT&CK mapping
- [ ] Vulnerability database integration
- [ ] Scheduled scanning (daemon mode)
- [ ] Security posture dashboard

### Phase 3: Advanced Capabilities
- [ ] Custom security rules
- [ ] Integration with security tools (nmap, etc.)
- [ ] Incident response playbooks
- [ ] Threat intelligence feeds
- [ ] Compliance frameworks (CIS, NIST)

### Phase 4: Agent Enhancements
- [ ] Subagents for parallel analysis
- [ ] Memory and context management
- [ ] Custom tool creation
- [ ] MCP integrations
- [ ] Multi-language support

## 🤝 Contributing

This is an MVP project. Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Follow the code style
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## ⚠️ Disclaimer

This tool is for defensive security purposes only. Users are responsible for ensuring they have proper authorization before scanning systems. The authors are not responsible for misuse of this tool.

---

**Built with ❤️ using Claude Agent SDK**

For questions or feedback, please open an issue on GitHub.
## 🎯 Workflow Examples

### Quick Security Audit (Interactive Session)
```bash
$ cyber-claude
Mode: base | Model: Claude Sonnet 4

🤖 [base] > scan
✔ Quick check completed
[Results: 2 info findings]

🤖 [base] > What should I prioritize?
💭 Thinking...
Based on the scan, I recommend...

🤖 [base] > harden
✔ Hardening check completed
[Results with AI recommendations]

🤖 [base] > exit
Goodbye! 👋
```

### Red Team Assessment
```bash
$ cyber-claude i --mode redTeam --model opus-4
Mode: redTeam | Model: Claude Opus 4

⚔️ [redTeam] > scan network
✔ Network scan completed
[47 active connections found]

⚔️ [redTeam] > Analyze these connections from an attacker's perspective
💭 Thinking...
From a red team perspective, here are the notable findings...

⚔️ [redTeam] > mode blueTeam
✔ Switched to blueTeam mode

🛡️ [blueTeam] > How would I detect the issues you just identified?
💭 Thinking...
To detect these as a blue team operator...
```

### Quick One-Off Scan
```bash
# Fast scan with Haiku for speed
cyber-claude scan --quick --model haiku-4

# Deep analysis with Opus
cyber-claude scan --full --model opus-4 --json deep-scan.json
```

## 🔑 Model Selection Guide

| Scenario | Recommended Model | Reason |
|----------|------------------|---------|
| Daily security checks | **Sonnet 4** | Balanced speed & quality |
| Deep vulnerability analysis | **Opus 4** | Most capable, thorough |
| Quick status checks | **Haiku 4** | Fastest responses |
| Batch scanning | **Haiku 4** | Speed for multiple scans |
| Complex red team ops | **Opus 4** | Best reasoning |
| Learning & questions | **Sonnet 4** | Great explanations |


## 🔮 Google Gemini Support

Cyber Claude now supports **Google Gemini** models! Use Gemini for fast, cost-effective security analysis.

**Quick Start with Gemini:**
1. Get API key: [Google AI Studio](https://aistudio.google.com/apikey)
2. Add to `.env`: `GOOGLE_API_KEY=your_key_here`
3. Use: `cyber-claude scan --model gemini-2.5-flash`

**Available Gemini Models:**
- `gemini-2.5-flash` - Most balanced (recommended for Gemini)
- `gemini-2.5-pro` - Most powerful thinking model
- `gemini-2.5-flash-lite` - Fastest & most cost-efficient

**📖 Full Guide**: See [GEMINI_INTEGRATION.md](GEMINI_INTEGRATION.md) for complete details!

