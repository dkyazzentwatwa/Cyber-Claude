# 🔮 Google Gemini Integration

Cyber Claude now supports **Google Gemini** models alongside Anthropic Claude! Use Gemini 2.5 Flash for fast, cost-effective security analysis.

## 🎯 Available Gemini Models

| Model | Key | Best For |
|-------|-----|----------|
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | Most balanced - Fast & capable |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | Most powerful thinking model |
| **Gemini 2.5 Flash Lite** | `gemini-2.5-flash-lite` | Fastest & most cost-efficient |

## 🔑 Setup

### 1. Get Your Google API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Get API Key"
3. Copy your API key

### 2. Add to Environment

Edit your `.env` file:
```bash
# API Keys (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key_here
GOOGLE_API_KEY=your_google_api_key_here    # Add this!

# You can use Gemini as default
MODEL=gemini-2.5-flash
```

## 🚀 Usage

### Interactive Session

```bash
# Start with Gemini model
cyber-claude i --model gemini-2.5-flash

# In session, select Gemini interactively
cyber-claude
> model
? Select AI model:
  Claude Opus 4.1
  Claude Opus 4
  Claude Sonnet 4.5 (Recommended)
  Claude Sonnet 4
  Claude Sonnet 3.7
  Claude Haiku 3.5
❯ Gemini 2.5 Flash
  Gemini 2.5 Pro
  Gemini 2.5 Flash Lite
```

### One-Off Commands

```bash
# Quick scan with Gemini Flash
cyber-claude scan --quick --model gemini-2.5-flash

# Full scan with Gemini Pro
cyber-claude scan --full --model gemini-2.5-pro

# Hardening check with Gemini Flash Lite (fastest)
cyber-claude harden --model gemini-2.5-flash-lite

# Chat with Gemini
cyber-claude chat --mode redTeam --model gemini-2.5-flash
```

## 🔄 Switching Between Providers

### In Interactive Session

```bash
$ cyber-claude i --model gemini-2.5-flash
Mode: base | Model: Gemini 2.5 Flash

🤖 [base] > scan
# Uses Gemini for analysis

🤖 [base] > model
# Select Claude Sonnet 4.5

Mode: base | Model: Claude Sonnet 4.5

🤖 [base] > scan
# Now uses Claude for analysis
```

### Environment Configuration

```bash
# Set default to Gemini
MODEL=gemini-2.5-flash

# Or keep Claude as default
MODEL=claude-sonnet-4-5
```

## 💡 When to Use Gemini vs Claude

### Use Gemini When:
- ✅ **Cost-efficiency** is important
- ✅ **Speed** is priority (Flash Lite is very fast)
- ✅ **Quick security checks** and scans
- ✅ **Batch operations** with many requests
- ✅ **Experimentation** and development

### Use Claude When:
- ✅ **Complex security analysis** required
- ✅ **Detailed explanations** needed
- ✅ **Red team operations** (Opus excels here)
- ✅ **Code security review** (Claude's strength)
- ✅ **Comprehensive reporting** desired

## 📊 Model Comparison

| Feature | Gemini 2.5 Flash | Claude Sonnet 4.5 | Claude Opus 4.1 |
|---------|------------------|-------------------|-----------------|
| **Speed** | ⚡⚡⚡ Very Fast | ⚡⚡ Fast | ⚡ Moderate |
| **Capability** | 🎯 High | 🎯 Very High | 🎯 Highest |
| **Cost** | 💰 Low | 💰💰 Medium | 💰💰💰 High |
| **Security Analysis** | Good | Excellent | Outstanding |
| **Code Review** | Good | Excellent | Excellent |
| **Explanations** | Good | Excellent | Excellent |

## 🛠️ Configuration Examples

### Multi-Provider Setup

Keep both API keys configured for flexibility:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIza...

# Default to Gemini for speed
MODEL=gemini-2.5-flash
```

### Claude-Only Setup

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=

MODEL=claude-sonnet-4-5
```

### Gemini-Only Setup

```bash
# .env
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=AIza...

MODEL=gemini-2.5-flash
```

## 🔧 Advanced Usage

### Workflow: Fast Triage with Gemini, Deep Dive with Claude

```bash
$ cyber-claude

# Quick scan with Gemini (fast)
> model gemini-2.5-flash
> scan
✔ Quick check completed [2 findings]

# Found issues? Switch to Claude for deep analysis
> model opus-4.1
> Tell me more about these findings and potential attack vectors
💭 Thinking...
[Detailed Claude Opus analysis]
```

### Batch Scanning Script

```bash
#!/bin/bash
# Use Gemini for fast batch scans

for target in server1 server2 server3; do
  echo "Scanning $target..."
  cyber-claude scan --quick --model gemini-2.5-flash-lite \
    --json "scan-$target.json"
done
```

## 📝 API Key Best Practices

1. **Never commit API keys to git**
   - ✅ Use `.env` file (already in `.gitignore`)
   - ❌ Don't hardcode keys in scripts

2. **Rotate keys regularly**
   - Update both Claude and Gemini keys periodically

3. **Use separate keys for dev/prod**
   - Dev: Use Gemini Flash Lite for cost savings
   - Prod: Use Claude Sonnet/Opus for quality

4. **Monitor usage**
   - [Anthropic Console](https://console.anthropic.com/)
   - [Google AI Studio](https://aistudio.google.com/)

## 🐛 Troubleshooting

### "Google API key required for Gemini models"

**Solution:** Add your Google API key to `.env`:
```bash
GOOGLE_API_KEY=your_key_here
```

### Gemini model not appearing in selector

**Solution:** Make sure you've rebuilt after updates:
```bash
npm run build
```

### "At least one API key is required"

**Solution:** You need either Claude OR Gemini (or both):
```bash
# Option 1: Add Claude key
ANTHROPIC_API_KEY=sk-ant-api03-...

# Option 2: Add Google key
GOOGLE_API_KEY=AIza...

# Option 3: Add both!
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_API_KEY=AIza...
```

## 🎉 Examples

### Security Audit with Both Providers

```bash
$ cyber-claude i

# Start with fast Gemini scan
🤖 [base] > model gemini-2.5-flash
✔ Switched to Gemini 2.5 Flash

🤖 [base] > scan full
⚡ Fast comprehensive scan...
[Results in 3 seconds]

# Found critical issue? Get Claude's expert opinion
🤖 [base] > model opus-4.1
✔ Switched to Claude Opus 4.1

🤖 [base] > Tell me the exploit chain for the critical finding
💭 Analyzing deeply...
[Detailed exploitation analysis]
```

### Cost-Optimized Workflow

```bash
# Daily routine: Gemini for monitoring
MODEL=gemini-2.5-flash-lite cyber-claude scan --quick

# Weekly deep dive: Claude for thorough analysis
MODEL=claude-opus-4-1 cyber-claude scan --full --json weekly-audit.json
```

---

## 🎯 Quick Reference

**To use Gemini:**
1. Get API key: https://aistudio.google.com/apikey
2. Add to `.env`: `GOOGLE_API_KEY=your_key`
3. Use flag: `--model gemini-2.5-flash`
4. Or set default: `MODEL=gemini-2.5-flash`

**Models:**
- `gemini-2.5-flash` - Balanced (recommended)
- `gemini-2.5-pro` - Most powerful
- `gemini-2.5-flash-lite` - Fastest

**Both providers work seamlessly - switch anytime!** 🚀