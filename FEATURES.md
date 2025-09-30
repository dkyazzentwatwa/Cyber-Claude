# 🎯 New Features - Interactive Session & Model Selector

## 🚀 Interactive Session Mode (Like Claude Code!)

The **biggest new feature** - a persistent REPL-style session where you don't need to keep entering commands!

### Quick Start
```bash
# Start interactive session (now the default!)
cyber-claude

# Or explicitly
cyber-claude interactive

# Short alias
cyber-claude i
```

### What Makes It Special?

**🔄 Persistent State**
- No need to re-type `cyber-claude` for every command
- Conversation history persists across commands
- Mode and model selection stays active

**⚡ Quick Commands**
```
# Inside session, just type:
scan           → Quick security scan
scan full      → Full system scan
scan network   → Network analysis
harden         → System hardening check
mode redTeam   → Switch to red team mode
model          → Select AI model
status         → Show session info
help           → Show all commands
```

**💬 Natural Chat**
Just type naturally - if it's not a built-in command, it goes to the AI agent:
```
> Tell me about the most common macOS security misconfigurations
> How can I check if my SSH is secure?
> What ports should I be concerned about?
```

**🎨 Session Features**
- Command history (use ↑/↓ arrows)
- Current mode displayed in prompt: `🔒 [desktopSecurity] >`
- Color-coded by mode (red team = red, blue team = blue, etc.)
- Easy mode switching without leaving session
- Model selection on-the-fly

### Session Workflow Example

```bash
$ cyber-claude

# Cyber Claude banner appears...
Mode: base | Model: Claude Sonnet 4

🤖 [base] > mode redTeam
✔ Switched to redTeam mode

⚔️ [redTeam] > scan
Running quick security check...
✔ Quick check completed
[Results displayed]

⚔️ [redTeam] > What are the key findings I should focus on?
💭 Thinking...
[AI responds with analysis]

⚔️ [redTeam] > model
? Select AI model:
  Claude Sonnet 4 (Recommended)
> Claude Opus 4

✔ Switched to Claude Opus 4

⚔️ [redTeam] > help
[Shows all commands]

⚔️ [redTeam] > exit
Goodbye! 👋
```

## 🤖 AI Model Selector

Choose which Claude model to use for your security analysis!

### Available Models

| Model | Key | Best For |
|-------|-----|----------|
| **Claude Sonnet 4** ✅ | `sonnet-4` | Balanced performance (Recommended) |
| **Claude Opus 4** | `opus-4` | Complex security analysis |
| **Claude Haiku 4** | `haiku-4` | Quick responses |
| **Claude 3.5 Sonnet** | `sonnet-3.5` | Previous generation |

### How to Use

**In Interactive Session:**
```bash
🤖 [base] > model
# Interactive menu appears - select with arrow keys
```

**On Command Line:**
```bash
# Use any command with --model flag
cyber-claude scan --model opus-4
cyber-claude harden --model haiku-4
cyber-claude chat --mode redTeam --model sonnet-3.5

# Start interactive session with specific model
cyber-claude interactive --model opus-4
```

**In .env File:**
```bash
MODEL=claude-opus-4-20250514
```

### When to Use Which Model?

**🎯 Sonnet 4 (Default - Recommended)**
- General security analysis
- Daily security checks
- Good balance of speed and quality

**🧠 Opus 4 (Most Capable)**
- Complex threat analysis
- In-depth vulnerability assessment
- When you need the best possible analysis
- Red team operations

**⚡ Haiku 4 (Fastest)**
- Quick security checks
- Simple queries
- When speed matters
- Batch scanning

**🔄 Sonnet 3.5 (Reliable)**
- If you prefer the previous generation
- Proven and tested
- Fallback option

## 🎯 Enhanced Commands & UX

### New Command Options

All commands now support `--model` flag:
```bash
cyber-claude scan --quick --model opus-4
cyber-claude scan --network --model haiku-4
cyber-claude harden --model sonnet-3.5
cyber-claude chat --mode blueTeam --model opus-4
```

### Interactive Session Commands

Inside `cyber-claude interactive`:

**📊 Scanning**
- `scan` - Quick security check
- `scan full` - Full system scan
- `scan network` - Network analysis

**🔒 Hardening**
- `harden` - Check system hardening

**⚙️ Session Control**
- `mode <mode>` - Switch mode (base, redTeam, blueTeam, desktopSecurity)
- `model` - Select AI model interactively
- `status` - Show session status
- `clear` - Clear conversation history
- `history` - Show command history (last 10)
- `help` - Show all commands

**💬 Chat**
- Just type naturally - anything not a command goes to AI

**🚪 Exit**
- `exit` or `quit` - Exit session

### Default Behavior

**New:** Running `cyber-claude` with no args now starts an **interactive session**!

**Before:**
```bash
$ cyber-claude
# Showed welcome screen and instructions
```

**Now:**
```bash
$ cyber-claude
# Starts interactive session immediately (if API key configured)
# Shows welcome screen only if API key not configured
```

## 🔥 Comparison: One-Off vs Interactive

### One-Off Commands (Old Way)
```bash
cyber-claude scan --quick
cyber-claude scan --network
cyber-claude harden
cyber-claude chat --mode redTeam
# Each command exits after running
# Need to re-type cyber-claude every time
```

### Interactive Session (New Way!)
```bash
cyber-claude
# Now you're in a persistent session

> scan
> scan network
> harden
> mode redTeam
> tell me about SSH security
> exit

# Much faster workflow!
```

## 📖 Updated Command Reference

### Interactive Session
```bash
cyber-claude                                    # Start session (default)
cyber-claude interactive                        # Explicit start
cyber-claude i                                  # Short alias
cyber-claude interactive --mode redTeam         # Start in specific mode
cyber-claude interactive --model opus-4         # Start with specific model
```

### One-Off Commands (Still Available!)
```bash
cyber-claude scan [--quick|--full|--network]    # Security scan
cyber-claude harden [--check|--recommendations] # Hardening check
cyber-claude chat --mode <mode>                 # One-off chat

# All support --model flag
cyber-claude scan --model opus-4
cyber-claude harden --model haiku-4
```

## 🎨 UI/UX Improvements

1. **Mode-Colored Prompts**
   - Base mode: 🤖 cyan
   - Red Team: ⚔️ red
   - Blue Team: 🛡️ blue
   - Desktop Security: 🔒 green

2. **Session Status Display**
   - Always shows current mode and model
   - `status` command for detailed info

3. **Command History**
   - Use ↑/↓ arrows to navigate history
   - `history` command to see last 10

4. **Better Feedback**
   - Success/error messages for mode/model changes
   - Confirmation when switching contexts

## 💡 Pro Tips

1. **Start in Your Preferred Mode**
   ```bash
   cyber-claude i --mode redTeam --model opus-4
   ```

2. **Quick Security Workflow**
   ```bash
   cyber-claude
   > scan
   > What should I fix first?
   > harden
   > How do I enable FileVault?
   ```

3. **Mode Switching for Different Perspectives**
   ```bash
   > mode redTeam
   > scan
   # Get attacker perspective

   > mode blueTeam
   > How would I detect this?
   # Get defender perspective
   ```

4. **Use Fast Model for Quick Checks**
   ```bash
   cyber-claude i --model haiku-4
   > scan
   # Quick results
   ```

5. **Use Opus for Deep Analysis**
   ```bash
   > model
   # Select Opus 4
   > scan full
   # Get most thorough analysis
   ```

---

**These features make Cyber Claude work just like Claude Code - a persistent, interactive session where you can naturally work without constantly re-entering commands!** 🚀