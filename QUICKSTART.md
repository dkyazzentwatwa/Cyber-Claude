# 🚀 Quick Start Guide

## Setup (2 minutes)

### 1. Set up your API key

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
# Get your key at: https://console.anthropic.com/
nano .env
```

In `.env`, set:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### 2. Install and Build

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Try It Out! 🎯

### View the Welcome Screen
```bash
npm run dev
```

You'll see:
- 🎨 Beautiful ASCII art banner with gradient colors
- 🛡️ Security shield showing "Safe Mode"
- 📋 Quick command reference

### Quick Security Check
```bash
npm run dev -- scan --quick
```

This performs a rapid security assessment of your system:
- Checks for high CPU processes
- Identifies listening ports
- Detects external network connections
- AI analysis of findings

### Full System Scan
```bash
npm run dev -- scan
```

Comprehensive security scan with AI-powered analysis:
- System information
- Running processes and services
- Network connections
- Storage information
- User sessions

### Check System Hardening
```bash
npm run dev -- harden
```

Evaluates your security posture:
- Firewall status (macOS, Linux, Windows)
- Disk encryption (FileVault, LUKS, BitLocker)
- Security features (Gatekeeper, SELinux, etc.)
- Running services analysis
- AI-powered recommendations

### Interactive Chat Mode
```bash
npm run dev -- chat
```

Start chatting with Cyber Claude:
- Ask security questions
- Get real-time analysis
- Switch between modes (red team, blue team, desktop security)
- Learn about security best practices

**Chat Commands:**
- `/mode redTeam` - Switch to red team perspective
- `/mode blueTeam` - Switch to defensive operations
- `/mode desktopSecurity` - Focus on personal security
- `/clear` - Clear conversation history
- `/exit` - Exit chat

### Try Different Modes
```bash
# Red Team mode (offensive security perspective)
npm run dev -- chat --mode redTeam

# Blue Team mode (defensive operations)
npm run dev -- chat --mode blueTeam

# Desktop Security mode (personal computer)
npm run dev -- chat --mode desktopSecurity
```

## Example Interactions

### Ask About Your System
```
You: What security issues should I be most concerned about on macOS?

Cyber Claude: [Provides detailed analysis of macOS security considerations]
```

### Analyze a Specific Issue
```
You: I have port 8080 open. Is this a security risk?

Cyber Claude: [Analyzes the port and provides context-specific advice]
```

### Get Hardening Recommendations
```
You: What are the top 5 things I should do to harden my system?

Cyber Claude: [Provides prioritized, actionable recommendations]
```

## Export Reports

Save your scan results:

```bash
# Export to JSON
npm run dev -- scan --json report.json

# Export to Markdown
npm run dev -- scan --md report.md

# Both formats
npm run dev -- scan --json report.json --md report.md
```

## Tips for Best Results

1. **Run with elevated privileges** (when safe):
   ```bash
   sudo npm run dev -- scan
   ```
   This allows more comprehensive security checks (firewall, encryption status, etc.)

2. **Be specific in chat mode**:
   - ✅ "Analyze my network connections for suspicious activity"
   - ✅ "Check if my SSH configuration is secure"
   - ❌ "Check everything" (too broad)

3. **Use the right mode**:
   - **Red Team**: Finding vulnerabilities, attack surface analysis
   - **Blue Team**: Threat detection, incident response
   - **Desktop Security**: Personal computer hardening

4. **Export findings for tracking**:
   - Keep reports to track improvements over time
   - Share with team members
   - Use for compliance documentation

## Troubleshooting

### "API Key Not Configured"
- Make sure `.env` file exists
- Check that `ANTHROPIC_API_KEY` is set
- Verify the key is valid at https://console.anthropic.com/

### "Permission Denied" errors
- Some security checks require elevated privileges
- Run with `sudo` for full functionality
- Or run as regular user for basic checks

### TypeScript errors during build
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## What's Next?

- 📚 Read the full [README.md](README.md)
- 🔍 Explore the [research documentation](research/)
- 🛠️ Check the [project roadmap](README.md#-roadmap)
- 💡 Suggest features or report issues on GitHub

---

**Enjoy using Cyber Claude! 🛡️✨**