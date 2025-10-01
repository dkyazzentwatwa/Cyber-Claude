# 🎭 Agent Modes Guide

**Cyber Claude Agent Modes - Complete Reference**

Agent modes are **specialized behavioral contexts** that change how the AI analyzes security data and responds to your questions. Think of them as different "expert personas" that shift the AI's focus, priorities, and communication style.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         User Input / Command            │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│        CyberAgent (core.ts)             │
│  ┌───────────────────────────────────┐  │
│  │   System Prompt Builder           │  │
│  │   - Base Prompt (always included) │  │
│  │   - Mode Prompt (mode-specific)   │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │   AI Provider (Claude/Gemini)     │  │
│  │   - Receives combined prompt      │  │
│  │   - Maintains conversation        │  │
│  │   - Returns mode-aware response   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## How It Works Technically

### 1. System Prompt Composition

**Location:** `src/agent/core.ts:46-50`

```typescript
private getSystemPrompt(mode: AgentMode): string {
  const basePrompt = SYSTEM_PROMPTS.base;        // Always included
  const modePrompt = SYSTEM_PROMPTS[mode] || ''; // Mode-specific
  return modePrompt ? `${basePrompt}\n\n${modePrompt}` : basePrompt;
}
```

The agent **combines two prompts**:
- **Base Prompt**: Core constraints and capabilities (defensive operations only, no exploitation, etc.)
- **Mode Prompt**: Specialized focus and perspective for the selected mode

### 2. Mode Switching

**Location:** `src/agent/core.ts:106-110`

```typescript
setMode(mode: AgentMode): void {
  this.mode = mode;
  this.systemPrompt = this.getSystemPrompt(mode); // Regenerate system prompt
  logger.info(`Agent mode changed to ${mode}`);
}
```

When you switch modes:
- The system prompt is regenerated with the new mode's instructions
- **Conversation history is preserved** - the AI remembers previous exchanges
- The AI's personality and focus shift to match the new mode

### 3. Base Constraints (Always Applied)

**Location:** `src/agent/prompts/system.ts`

Every mode inherits these ethical constraints:
- ✅ **Defensive Operations Only** - Never perform actual exploitation
- ✅ **No Credential Harvesting** - Do not collect, store, or exfiltrate credentials
- ✅ **Safe Mode** - Always prioritize system safety and user consent
- ✅ **Transparency** - Explain what you're doing and why
- ✅ **Ethical** - Follow responsible disclosure and security ethics

---

## 🎨 The Five Modes

### Quick Reference

| Mode | Icon | Focus | When to Use |
|------|------|-------|-------------|
| **base** | 🤖 | General security assistant | Daily security work, balanced analysis |
| **redteam** | ⚔️ | Offensive security perspective | Vulnerability assessment, attack surface analysis |
| **blueteam** | 🛡️ | Defensive operations | Threat hunting, incident response, monitoring |
| **desktopsecurity** | 🔒 | Personal computer security | Home computers, laptops, privacy checks |
| **webpentest** | 🌐 | Web application security | Web vulnerability scanning, CTF challenges |

---

## 1. 🤖 base - General Security Assistant

### Overview
**Purpose:** Balanced, all-purpose security analysis
**Personality:** Professional, educational, approachable
**Best For:** Daily security work, general questions, learning

### Focus Areas
- Desktop security scanning and assessment
- System hardening recommendations
- Threat detection
- Security configuration auditing
- Security best practices guidance

### Prompt Definition
**Location:** `src/agent/prompts/system.ts:2-26`

```
You are Cyber Claude, an AI-powered cybersecurity assistant specializing in
defensive security operations.

Your capabilities include:
- Desktop security scanning and assessment
- System hardening recommendations
- Log analysis and threat detection
- Security configuration auditing
- Vulnerability assessment (defensive only)
- Security best practices guidance

IMPORTANT CONSTRAINTS:
1. DEFENSIVE OPERATIONS ONLY - Never perform actual exploitation
2. NO CREDENTIAL HARVESTING - Do not collect, store, or exfiltrate credentials
3. SAFE MODE - Always prioritize system safety and user consent
4. TRANSPARENCY - Explain what you're doing and why
5. ETHICAL - Follow responsible disclosure and security ethics

When analyzing systems:
- Always explain your findings clearly
- Provide actionable remediation steps
- Prioritize risks by severity
- Consider the user's environment and constraints
- Ask for permission before making system changes

Your output should be professional, accurate, and educational.
```

### Example Conversation

```bash
$ cyber-claude
Mode: base | Model: Claude Sonnet 4.5

🤖 [base] > scan --quick
✓ Quick check completed: 2 info findings

🤖 [base] > What should I fix first?
💭 Based on the scan results, I'd prioritize:

1. **Update your system** - You're running macOS 13.5, but 13.6 is available
   - Addresses 12 CVEs including 3 critical vulnerabilities
   - Takes about 15 minutes to install

2. **Enable FileVault disk encryption**
   - Protects your data if laptop is stolen or lost
   - No performance impact on M-series chips
   - Setup: System Settings → Privacy & Security → FileVault

3. **Review network connections** - 3 connections to port 443
   - github.com (code push) - legitimate ✓
   - npmjs.org (package download) - legitimate ✓
   - api.openai.com (API calls) - legitimate ✓

The updates address known CVEs and the encryption protects your data at rest.

🤖 [base] > How does FileVault work?
💭 FileVault is macOS's full-disk encryption using XTS-AES-128...
[Educational explanation follows]
```

### Use Cases
- ✅ General security questions
- ✅ Learning security concepts
- ✅ Daily security checks
- ✅ Balanced analysis without specific perspective
- ✅ Explaining findings to non-technical users

---

## 2. ⚔️ redteam - Offensive Security Perspective

### Overview
**Purpose:** Simulate attacker mindset to find vulnerabilities
**Personality:** Adversarial thinking, threat-focused, MITRE ATT&CK aware
**Best For:** Vulnerability assessment, penetration testing simulation, attack path analysis

### Focus Areas
- Reconnaissance and enumeration
- Attack surface analysis
- Vulnerability identification from attacker's viewpoint
- Attack path mapping
- Risk assessment

### Prompt Definition
**Location:** `src/agent/prompts/system.ts:28-42`

```
You are operating in RED TEAM mode - simulating attacker perspectives to find
vulnerabilities.

Focus on:
- Reconnaissance and enumeration
- Attack surface analysis
- Vulnerability identification
- Attack path mapping
- Risk assessment

Remember:
- SIMULATION ONLY - No actual exploitation
- Document all findings with evidence
- Map to MITRE ATT&CK framework when relevant
- Provide remediation recommendations
- Maintain ethical boundaries
```

### Example Conversation

```bash
$ cyber-claude interactive --mode redteam
Mode: redteam | Model: Claude Sonnet 4.5

⚔️ [redteam] > scan network
✓ Network scan completed: 47 connections found

⚔️ [redteam] > Analyze these from an attacker's perspective
💭 From a red team perspective, here are the attack vectors:

**Initial Access Opportunities (T1190 - Exploit Public-Facing Application):**
- Port 8080 exposed on 0.0.0.0 (all interfaces) - likely dev server
  ➜ Attack vector: Direct access from internet if router forwards port
  ➜ Risk: Unauthenticated access to development endpoints
  ➜ Enumeration: Banner grabbing reveals Node.js/Express

- No firewall filtering on inbound connections
  ➜ All ports accessible to local network
  ➜ No defense against local threat actors

**Discovery (T1046 - Network Service Discovery):**
- Multiple outbound HTTPS connections reveal your tech stack:
  ➜ github.com → Git usage, potential for credential harvesting if .git exposed
  ➜ npmjs.org → Node.js development, dependency confusion attacks possible
  ➜ docker.io → Container usage, look for exposed Docker socket (2375/tcp)

**Credential Access (T1552 - Unsecured Credentials):**
- Development server on 8080 may expose:
  ➜ Environment variables via /env endpoints
  ➜ API keys in client-side JavaScript
  ➜ Debug information with internal paths

**Recommended Blue Team Countermeasures:**
1. Bind dev server to 127.0.0.1 ONLY (not 0.0.0.0)
2. Enable macOS firewall in stealth mode
3. Use VPN for development traffic to mask reconnaissance
4. Implement network segmentation (dev network ≠ production)
5. Add authentication to all dev endpoints

⚔️ [redteam] > mode blueteam
✓ Switched to blueteam mode

🛡️ [blueteam] > How would I detect the issues you just identified?
💭 To detect these as a blue team operator...
[Defensive strategies follow]
```

### Use Cases
- ✅ Pre-deployment security assessments
- ✅ Red team exercises
- ✅ Vulnerability research
- ✅ Attack surface enumeration
- ✅ Understanding attacker TTPs
- ✅ Risk modeling and threat assessment

### MITRE ATT&CK Integration
Red team mode automatically maps findings to ATT&CK techniques when using `--mitre` flag:
- T1190: Exploit Public-Facing Application
- T1046: Network Service Discovery
- T1552: Unsecured Credentials
- T1078: Valid Accounts
- And 16+ more techniques

---

## 3. 🛡️ blueteam - Defensive Operations

### Overview
**Purpose:** Defensive security operations and threat detection
**Personality:** Defensive mindset, prioritizes active threats, operational focus
**Best For:** Threat hunting, incident response, security monitoring, IOC analysis

### Focus Areas
- Threat detection and hunting
- Log analysis and correlation
- Incident response procedures
- Security monitoring
- Defensive hardening

### Prompt Definition
**Location:** `src/agent/prompts/system.ts:44-58`

```
You are operating in BLUE TEAM mode - defending and monitoring for threats.

Focus on:
- Threat detection and hunting
- Log analysis and correlation
- Incident response
- Security monitoring
- Defensive hardening

Remember:
- Prioritize active threats
- Look for indicators of compromise
- Suggest preventive measures
- Create actionable alerts
- Consider operational impact
```

### Example Conversation

```bash
$ cyber-claude interactive --mode blueteam
Mode: blueteam | Model: Claude Sonnet 4.5

🛡️ [blueteam] > pcap suspicious.pcap --mode threat-hunt --extract-iocs
✓ PCAP analysis complete
✓ Extracted 47 IOCs

**Traffic Summary:**
- Total packets: 15,847
- Suspicious connections: 12
- Unique external IPs: 8

🛡️ [blueteam] > What IOCs should I prioritize?
💭 Based on the traffic analysis, prioritize these IOCs in order:

**🔴 CRITICAL - Immediate Action Required:**

1. **IP: 185.220.101.45** (127 connections to port 9001)
   - Classification: Known Tor exit node
   - Behavior: Regular beaconing every 60 seconds
   - Risk: C2 communication channel
   - Action:
     ✓ Isolate host from network immediately
     ✓ Check EDR for process initiating connections
     ✓ Search SIEM for other hosts contacting this IP

2. **Domain: updatecheck.evil.com** (23 DNS queries)
   - Classification: Newly registered domain (<7 days old)
   - Behavior: DNS tunneling pattern (long TXT records)
   - Risk: Data exfiltration via DNS
   - Action:
     ✓ Block domain at DNS resolver
     ✓ Analyze DNS query payload for encoded data
     ✓ Review firewall logs for associated IPs

**🟠 HIGH - Investigate Within 24 Hours:**

3. **IP: 192.168.1.105** (Port scan detected)
   - Scanned ports: 22, 23, 3389, 445, 1433, 3306
   - Risk: Internal reconnaissance
   - Action: Identify host, check for unauthorized access

**Detection Rules to Deploy:**

```yaml
# Splunk
index=firewall dest_ip="185.220.101.45"
| stats count by src_ip
| where count > 10

# Sigma Rule
title: Tor Exit Node Communication
detection:
  selection:
    destination_ip: '185.220.101.45'
    destination_port: 9001
  condition: selection
```

**Incident Response Playbook:**
1. ✓ Isolate compromised host (done if you've blocked it)
2. ⏳ Capture memory dump before shutdown
3. ⏳ Collect disk image for forensics
4. ⏳ Review authentication logs for lateral movement
5. ⏳ Check for persistence mechanisms (cron, startup items)

🛡️ [blueteam] > Export these IOCs for our SIEM
[Exports STIX 2.1 format for threat intelligence platforms]
```

### Use Cases
- ✅ Threat hunting exercises
- ✅ Incident response
- ✅ PCAP analysis for threats
- ✅ IOC extraction and analysis
- ✅ SIEM rule creation
- ✅ Security monitoring setup
- ✅ Post-breach forensics

### Integration with Professional Features
Blue team mode works seamlessly with:
- **IOC Extraction** (`--extract-iocs`) - Automatically identifies IPs, domains, hashes, CVEs
- **MITRE ATT&CK Mapping** (`--mitre`) - Maps threats to defensive techniques
- **STIX 2.1 Export** (`--export-iocs`) - Shares IOCs with threat intel platforms
- **Evidence Preservation** (`--preserve-evidence`) - Maintains chain of custody

---

## 4. 🔒 desktopsecurity - Personal Computer Security

### Overview
**Purpose:** Personal computer security and privacy
**Personality:** User-friendly, explains the "why", balances security with usability
**Best For:** Home computers, laptops, personal devices, privacy concerns

### Focus Areas
- System configuration security
- Running processes and services
- Network connections and firewall
- Installed software and updates
- File permissions and access control
- Privacy and data protection

### Prompt Definition
**Location:** `src/agent/prompts/system.ts:60-75`

```
You are analyzing DESKTOP SECURITY for a personal computer.

Focus on:
- System configuration security
- Running processes and services
- Network connections and firewall
- Installed software and updates
- File permissions and access control
- Privacy and data protection

Remember:
- Check against security baselines
- Consider the user's workflow
- Balance security with usability
- Provide clear, actionable steps
- Explain the "why" behind recommendations
```

### Example Conversation

```bash
$ cyber-claude interactive --mode desktopsecurity
Mode: desktopsecurity | Model: Claude Sonnet 4.5

🔒 [desktopsecurity] > scan full
✓ Full system scan completed

**Your Mac Security Status:**

✅ **Good:**
- macOS 14.1 (latest version)
- Firewall enabled
- Gatekeeper active
- Automatic updates on

⚠️ **Needs Attention:**
- FileVault: ❌ Disabled
- Firewall stealth mode: ❌ Off
- 47 processes running (12 unknown)

📊 **Details:**
- 12 network connections active
- 247 GB free space / 500 GB total
- Last backup: 3 days ago (Time Machine)

🔒 [desktopsecurity] > Why is FileVault important for my laptop?
💭 FileVault is macOS's full-disk encryption. Here's why it matters for YOUR laptop:

**🎯 Real-World Scenario:**

Imagine you're at a coffee shop and your MacBook is stolen. Without FileVault:

❌ **What the thief can do:**
1. Boot your Mac from a USB drive (bypasses login screen)
2. Mount your hard drive and copy ALL your files:
   - Your photos and documents
   - Saved passwords in Chrome/Safari
   - Your SSH keys and API tokens
   - Your Messages history
   - Your browser cookies (can hijack logged-in sessions)
3. Sell your data on the dark web
4. Use your credentials to access your accounts

✅ **With FileVault enabled:**
1. Thief boots from USB drive
2. Your drive shows up as encrypted gibberish
3. Without your login password, data is unreadable
4. Even removing the SSD and reading it elsewhere = still encrypted
5. Your data remains safe 🔒

**💻 Technical Details (if you're curious):**
- Encryption: XTS-AES-128 (military-grade)
- Key derivation: Your login password + hardware key in T2/M-series chip
- Brute force protection: Hardware-enforced rate limiting

**⚡ Performance Impact:**
- Modern Macs (2018+): **ZERO performance hit**
- Why? Hardware encryption in T2/M-series chips
- Encryption/decryption happens in dedicated hardware
- You won't notice any difference in speed

**⏱️ Setup Time:**
- Initial encryption: 1-2 hours (use Mac normally during this)
- After setup: Completely transparent, no maintenance needed

**📝 How to Enable:**
1. System Settings → Privacy & Security → FileVault
2. Click "Turn On FileVault"
3. Choose recovery method (iCloud or recovery key)
4. Let it encrypt in background

**⚠️ Important:** Save your recovery key somewhere safe (password manager,
printed and stored securely). Without it and your password, your data is gone.

🔒 [desktopsecurity] > What about the firewall stealth mode?
💭 Stealth mode makes your Mac "invisible" on networks. Here's what it does:

**Normal Firewall:**
- Someone pings your Mac → Mac responds "I'm here but ports are closed"
- Port scanner sees your Mac exists → may target you

**Stealth Mode:**
- Someone pings your Mac → *crickets* (no response)
- Your Mac appears offline to port scanners
- Harder for attackers to even know you exist on the network

**When it matters:**
- ✅ Coffee shops, airports, hotels (untrusted networks)
- ✅ Conferences, coworking spaces
- ❌ Home network (usually fine without it)

**Enable:** System Settings → Network → Firewall → Options →
            ☑️ "Enable stealth mode"
```

### Use Cases
- ✅ Personal laptop/desktop security
- ✅ Privacy-focused users
- ✅ Non-technical users needing guidance
- ✅ Home office security
- ✅ Security awareness training
- ✅ Family computer protection

### Educational Approach
Desktop security mode excels at:
- **Explaining the "why"** behind recommendations
- **Real-world scenarios** to illustrate risks
- **Balancing security with usability** - won't suggest impractical measures
- **Step-by-step guidance** with exact menu paths
- **Privacy considerations** beyond just security

---

## 5. 🌐 webpentest - Web Application Security Testing

### Overview
**Purpose:** Web application vulnerability assessment
**Personality:** Web security specialist, teaches methodology, respects authorization
**Best For:** Web vulnerability scanning, CTF challenges, API security, OWASP Top 10

### Focus Areas
- OWASP Top 10 vulnerabilities
- Input validation testing
- Authentication and authorization issues
- Session management
- Security header analysis
- CTF challenge methodology
- API security

### Prompt Definition
**Location:** `src/agent/prompts/system.ts:77-102`

```
You are operating in WEB PENTEST mode - analyzing web applications for security
vulnerabilities.

Focus on:
- OWASP Top 10 vulnerabilities
- Input validation testing
- Authentication and authorization issues
- Session management
- Security header analysis
- CTF challenge analysis
- API security

Remember:
- AUTHORIZATION REQUIRED - Only test authorized targets
- NO LIVE EXPLOITATION - Analysis and detection only
- EDUCATIONAL FOCUS - Explain vulnerabilities clearly
- CTF ASSISTANCE - Help with challenge methodology, not direct answers
- DEFENSIVE PURPOSE - Testing for protection, not attack
- RESPECT SCOPE - Stay within authorized testing boundaries

When analyzing web vulnerabilities:
- Explain the vulnerability mechanism
- Assess real-world impact
- Provide remediation guidance
- Reference OWASP standards
- Consider defense-in-depth approaches
- For CTF challenges, focus on teaching methodology and understanding rather
  than just providing answers
```

### Example Conversation

```bash
$ cyber-claude interactive --mode webpentest
Mode: webpentest | Model: Claude Sonnet 4.5

🌐 [webpentest] > webscan https://staging.myapp.local --full

⚠️  AUTHORIZATION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: https://staging.myapp.local

Do you have explicit permission to scan this target? yes
Is this a production environment? no
Is this for a CTF/educational challenge? no

✓ Authorization confirmed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Web scan completed

**Findings Summary:**
  Total: 5
  🔴 Critical: 0
  🟠 High: 2
  🟡 Medium: 3
  🟢 Low: 0
  🔵 Info: 0

**HIGH Severity:**
🟠 Missing CSRF Protection on State-Changing Endpoints
🟠 Session Cookie Without Secure Flag

**MEDIUM Severity:**
🟡 Missing Content-Security-Policy Header
🟡 X-Frame-Options Not Set (Clickjacking Risk)
🟡 Permissive CORS Configuration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 [webpentest] > Explain the CSRF vulnerability in detail
💭 **Cross-Site Request Forgery (CSRF) - Deep Dive:**

**🔍 What I Found:**
Your application has POST endpoints that:
- Accept state-changing requests (login, transfer, delete)
- Rely ONLY on session cookies for authentication
- Have NO CSRF tokens or additional verification

**Vulnerable Endpoints Detected:**
- POST /api/auth/login
- POST /api/account/transfer
- POST /api/settings/update
- DELETE /api/account/close

**🎯 Attack Scenario (Step-by-Step):**

1. **Victim's Action:** User logs into staging.myapp.local
   → Browser stores session cookie: sessionId=abc123

2. **Attacker's Setup:** Creates malicious page at evil.com:
   ```html
   <!DOCTYPE html>
   <html>
   <body>
     <h1>You Won a Prize!</h1>
     <img src="cute-cat.jpg">

     <!-- Hidden malicious form -->
     <form id="attack" action="https://staging.myapp.local/api/account/transfer"
           method="POST" style="display:none">
       <input name="to" value="attacker@evil.com">
       <input name="amount" value="1000">
     </form>

     <script>
       // Auto-submit when page loads
       document.getElementById('attack').submit();
     </script>
   </body>
   </html>
   ```

3. **Victim Visits:** User clicks link to evil.com while still logged in

4. **Browser Behavior:**
   - Sees form targeting staging.myapp.local
   - Automatically includes session cookie (same domain)
   - Submits POST request as the victim

5. **Server Response:**
   - Validates session cookie ✓ (it's valid!)
   - No CSRF token check ✗ (doesn't exist)
   - Executes transfer as victim
   - Money sent to attacker

**💥 Real-World Impact:**
- Unauthorized money transfers
- Account takeover via email/password changes
- Data deletion
- Privilege escalation
- Social engineering amplification

**🛡️ Remediation (Priority Order):**

**1. Implement CSRF Tokens (Synchronizer Token Pattern):**

```javascript
// Backend (Express.js)
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/api/account/transfer', csrfProtection, (req, res) => {
  // CSRF token automatically validated
  // Will return 403 if token missing/invalid
  processTransfer(req.body);
});
```

```html
<!-- Frontend -->
<form method="POST" action="/api/account/transfer">
  <input type="hidden" name="_csrf" value="{{ csrfToken }}">
  <input name="amount" value="100">
  <button type="submit">Transfer</button>
</form>
```

**2. Set SameSite Cookie Attribute:**

```javascript
// Session cookie configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,        // HTTPS only
    sameSite: 'strict'   // Prevents cross-site cookie sending
  }
}));
```

SameSite values:
- `strict` - Cookie NEVER sent cross-site (most secure)
- `lax` - Cookie sent on top-level navigation (safer default)
- `none` - Cookie always sent (requires Secure flag)

**3. Verify Origin/Referer Headers:**

```javascript
app.post('/api/*', (req, res, next) => {
  const origin = req.get('origin');
  const referer = req.get('referer');

  const allowedOrigins = ['https://staging.myapp.local'];

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden origin' });
  }

  next();
});
```

**4. Require Re-authentication for Sensitive Actions:**

```javascript
app.post('/api/account/close', async (req, res) => {
  // Require password confirmation for critical actions
  const passwordValid = await verifyPassword(
    req.user.id,
    req.body.password
  );

  if (!passwordValid) {
    return res.status(401).json({
      error: 'Password confirmation required'
    });
  }

  closeAccount(req.user.id);
});
```

**📚 References:**
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- CWE-352: https://cwe.mitre.org/data/definitions/352.html
- OWASP Top 10 2021 - A01:2021 Broken Access Control

**🧪 Testing & Verification:**
After implementing fixes, test with:
1. Browser DevTools - check for CSRF token in forms
2. curl - attempt POST without token (should fail)
3. Different browser - try cross-origin request (should fail)

🌐 [webpentest] > Run Nuclei and SQLmap on this target
[Runs MCP professional security tools...]

✓ Nuclei scan complete: 47 vulnerabilities found
✓ SQLmap test complete: No SQL injection detected

[Detailed results with AI analysis follows...]
```

### Use Cases
- ✅ Web application penetration testing
- ✅ Bug bounty hunting
- ✅ CTF web challenges
- ✅ API security assessment
- ✅ OWASP Top 10 compliance testing
- ✅ Security header analysis
- ✅ Learning web security

### CTF Challenge Assistance
When used for CTF challenges:
- Provides **methodology** rather than direct answers
- Teaches **concepts** behind vulnerabilities
- Suggests **tools and techniques** to try
- Explains **why** certain approaches work
- Encourages **learning and understanding**

### Authorization Framework
Web pentest mode includes built-in ethical controls:
- **Pre-scan authorization** prompts
- **Domain blocklists** (banks, government, production services)
- **Legal warnings** displayed
- **CTF mode** separate authorization flow
- **Audit logging** of all scan authorizations

---

## 🔄 Mode Switching

### How to Switch Modes

#### In Interactive Session

```bash
# View current mode
> mode
Current mode: base
Available modes: base, redteam, blueteam, desktopsecurity, webpentest

# Switch to a different mode
> mode redteam
✓ Switched to redteam mode

# Switch again
> mode blueteam
✓ Switched to blueteam mode
```

#### Via Command Line

```bash
# Start in specific mode
cyber-claude --mode redteam
cyber-claude interactive --mode webpentest
cyber-claude i --mode blueteam

# One-off commands
cyber-claude scan --mode desktopsecurity
cyber-claude webscan https://example.com --mode webpentest
```

### Mode Switching Flow Diagram

```
┌─────────────────────────────────────────────────┐
│   User Command: "mode redteam"                  │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│   InteractiveSession.handleModeChange()         │
│   - Validates mode name                         │
│   - Updates session state                       │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│   CyberAgent.setMode(newMode)                   │
│   - Updates internal mode property              │
│   - Calls getSystemPrompt(newMode)              │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│   System Prompt Regeneration                    │
│   - Combines base + new mode prompt             │
│   - Preserves conversation history              │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│   Next User Message Uses New Mode Context       │
└─────────────────────────────────────────────────┘
```

---

## 🧠 Key Concepts

### 1. Conversation History is Preserved

When you switch modes, the AI **remembers** previous exchanges:

```bash
🤖 [base] > What process is running on port 8080?
💭 It's a Node.js development server (Express.js)

🤖 [base] > mode redteam
✓ Switched to redteam mode

⚔️ [redteam] > Is that port secure?
💭 No, the Node.js server on port 8080 is exposed on 0.0.0.0...
    ↑ AI remembers "that port" refers to 8080
```

**Technical Implementation:**
- Conversation history stored in `CyberAgent.conversationHistory[]`
- Array of `ConversationMessage` objects (role + content)
- Preserved across mode switches (only system prompt changes)
- Cleared only when explicitly requested (`clear` command)

### 2. Base Constraints Always Apply

Every mode inherits the base ethical constraints from `SYSTEM_PROMPTS.base`:

- ❌ **No actual exploitation**
- ❌ **No credential harvesting**
- ❌ **No malicious operations**
- ✅ **Defensive operations only**
- ✅ **User consent required**
- ✅ **Transparency in actions**
- ✅ **Educational focus**

Even in "redteam" mode, the AI simulates an attacker's **perspective** without actually attacking.

### 3. Modes Don't Change Tools, Just Perspective

All modes have access to the same commands (`scan`, `webscan`, `pcap`, `harden`), but they **analyze and explain** results differently.

**Example: Same network scan, different mode responses**

| Mode | Response Style |
|------|----------------|
| **base** | "You have 47 network connections. 3 are to port 443 (HTTPS) which is normal. Port 8080 is listening on all interfaces - consider binding to localhost only for development servers." |
| **redteam** | "Attack surface includes exposed dev server on 0.0.0.0:8080 (T1190). No firewall filtering detected. OS fingerprinting possible via TTL values. Recommend enumerate /api endpoints for information disclosure." |
| **blueteam** | "Monitoring priorities: (1) Alert on port 8080 external connections, (2) Baseline normal HTTPS destinations for anomaly detection, (3) Enable firewall with default-deny policy. No active threats detected." |
| **desktopsecurity** | "Your Mac has 47 network connections, which is normal. Port 8080 is a development server - make sure it's only for local testing (it should be 127.0.0.1:8080, not 0.0.0.0:8080). Enable your firewall in System Settings for extra protection." |
| **webpentest** | "Port 8080 detected - likely web server. Test for: (1) Directory traversal (../ in paths), (2) Default credentials if admin panel, (3) Information disclosure (/server-status, /.git), (4) Security headers missing. Run `webscan` for detailed analysis." |

### 4. Mode Selection is Flexible

You can:
- ✅ Switch modes mid-conversation
- ✅ Switch modes multiple times
- ✅ Use different modes for different commands in same session
- ✅ Combine modes (e.g., redteam → blueteam workflow)

### 5. Provider-Agnostic

Modes work identically across both AI providers:
- **Claude** (Anthropic) - All 5 modes supported
- **Gemini** (Google) - All 5 modes supported
- System prompts are provider-agnostic
- Switch models without losing mode context

---

## 📊 Mode Selection Guide

### By Task Type

| Task | Recommended Mode | Why |
|------|------------------|-----|
| Daily security check | **base** | Balanced, general-purpose |
| Testing new web app | **webpentest** | OWASP focus, CTF support |
| Incident response | **blueteam** | Threat hunting, IOC focus |
| Vulnerability assessment | **redteam** | Attacker mindset, finds weaknesses |
| Personal laptop setup | **desktopsecurity** | User-friendly, privacy-focused |
| Network traffic analysis | **blueteam** or **redteam** | Depends on goal (defend vs. assess) |
| CTF web challenge | **webpentest** | Methodology teaching, hints not answers |
| PCAP forensics | **blueteam** | IOC extraction, evidence preservation |
| Bug bounty hunting | **webpentest** + **redteam** | Web vulns + attack chain analysis |
| Security awareness training | **desktopsecurity** | Explains "why" for non-technical users |

### By User Role

| Role | Primary Mode | Secondary Mode | Workflow |
|------|--------------|----------------|----------|
| **Security Analyst** | blueteam | redteam | Hunt threats, understand attack paths |
| **Penetration Tester** | redteam | webpentest | Assess infrastructure, test web apps |
| **Web Developer** | webpentest | base | Test own apps, learn security |
| **Home User** | desktopsecurity | base | Personal security, privacy |
| **Red Team Operator** | redteam | base | Offensive ops, documentation |
| **Blue Team Operator** | blueteam | desktopsecurity | Defense, hardening |
| **CTF Player** | webpentest | redteam | Web challenges, pwn challenges |
| **Security Researcher** | base | All modes | Flexibility for research |

### By Security Phase

| Phase | Mode | Activities |
|-------|------|------------|
| **Reconnaissance** | redteam | Enumerate attack surface, identify targets |
| **Vulnerability Assessment** | redteam | Find weaknesses, identify exploitable paths |
| **Web Testing** | webpentest | OWASP Top 10, API security, headers |
| **Exploitation** | ❌ None | Cyber Claude does not perform exploitation |
| **Post-Exploitation** | ❌ None | Cyber Claude does not perform exploitation |
| **Detection Engineering** | blueteam | Create SIEM rules, detection logic |
| **Threat Hunting** | blueteam | Analyze logs, search for IOCs |
| **Incident Response** | blueteam | Forensics, containment, remediation |
| **Hardening** | desktopsecurity | Apply security baselines, configure protections |
| **Monitoring** | blueteam | Analyze traffic, detect anomalies |

---

## 💡 Pro Tips

### 1. Multi-Mode Workflows

**Red Team → Blue Team Combo:**
```bash
# Find vulnerabilities from attacker perspective
⚔️ [redteam] > scan network
⚔️ [redteam] > Analyze attack surface
💭 [Lists vulnerabilities and attack paths]

# Switch to defensive perspective
⚔️ [redteam] > mode blueteam

# Get defensive strategies
🛡️ [blueteam] > How do I defend against what you just found?
💭 [Provides detection rules, hardening steps, monitoring guidance]
```

**Web Pentest → Red Team Escalation:**
```bash
# Test web application
🌐 [webpentest] > webscan https://app.example.com --full
💭 [Finds SQLi vulnerability in /api/search]

# Escalate to infrastructure assessment
🌐 [webpentest] > mode redteam

# Analyze broader attack chain
⚔️ [redteam] > If SQLi is exploitable, what's the attack path?
💭 [Maps: SQLi → Database access → Credential theft → Lateral movement]
```

### 2. Context Preservation

Reference previous findings across modes:
```bash
🤖 [base] > pcap capture.pcap --extract-iocs
💭 [Extracts 47 IOCs]

🤖 [base] > mode blueteam
✓ Switched to blueteam mode

🛡️ [blueteam] > Create SIEM rules for those IOCs
💭 [Generates Splunk/Sigma rules for the 47 IOCs extracted earlier]
                    ↑ AI remembers "those IOCs"
```

### 3. Mode-Specific Features

Some flags work best with specific modes:

| Flag | Best Mode | Why |
|------|-----------|-----|
| `--extract-iocs` | blueteam | Defensive IOC tracking |
| `--mitre` | redteam or blueteam | Attack/defense technique mapping |
| `--preserve-evidence` | blueteam | Forensic chain of custody |
| `--nuclei` | webpentest | Web vulnerability scanning |
| `--ctf` | webpentest | CTF-specific authorization |

### 4. Learning with Base Mode

Use `base` mode to learn before switching to specialized modes:
```bash
🤖 [base] > What is CSRF?
💭 [Educational explanation of CSRF]

🤖 [base] > mode webpentest
✓ Switched to webpentest mode

🌐 [webpentest] > webscan https://example.com
💭 [Finds CSRF vulnerability - you now understand what it means!]
```

### 5. Quick Mode Reference

Keep this handy:
```bash
# View current mode
> mode

# Switch mode
> mode <mode_name>

# Available modes
base          # General security
redteam       # Attack perspective
blueteam      # Defense operations
desktopsecurity  # Personal computers
webpentest    # Web applications
```

---

## 🔧 Technical Implementation

### File Structure

```
src/agent/
├── core.ts                    # CyberAgent class with mode management
├── types.ts                   # AgentMode type definition
└── prompts/
    └── system.ts              # SYSTEM_PROMPTS object with all 5 modes

src/cli/
└── session.ts                 # InteractiveSession with mode switching
```

### Type Definition

**Location:** `src/agent/types.ts`

```typescript
export type AgentMode = 'base' | 'redteam' | 'blueteam' | 'desktopsecurity' | 'webpentest';

export interface AgentConfig {
  mode: AgentMode;
  apiKey?: string;           // Anthropic API key
  googleApiKey?: string;     // Google API key
  model?: string;            // Model ID
  maxTokens?: number;
}
```

### Code Examples

**Creating an agent with a specific mode:**
```typescript
import { CyberAgent } from './agent/core.js';

const agent = new CyberAgent({
  mode: 'redteam',
  apiKey: process.env.ANTHROPIC_API_KEY,
  googleApiKey: process.env.GOOGLE_API_KEY,
  model: 'claude-sonnet-4-5',
});

// Use the agent
const response = await agent.chat('Analyze this network scan');
```

**Switching modes programmatically:**
```typescript
// Start in base mode
const agent = new CyberAgent({ mode: 'base', apiKey: '...' });

// Analyze normally
await agent.chat('What are the security issues?');

// Switch to red team perspective
agent.setMode('redteam');

// Same data, different perspective
await agent.chat('What are the attack vectors?');

// Conversation history preserved across mode switches
```

**Validating mode names:**
```typescript
const validModes: AgentMode[] = [
  'base',
  'redteam',
  'blueteam',
  'desktopsecurity',
  'webpentest'
];

function isValidMode(mode: string): mode is AgentMode {
  return validModes.includes(mode as AgentMode);
}
```

---

## 🎯 Quick Reference

### Mode Comparison Table

| Aspect | base | redteam | blueteam | desktopsecurity | webpentest |
|--------|------|---------|----------|-----------------|------------|
| **Icon** | 🤖 | ⚔️ | 🛡️ | 🔒 | 🌐 |
| **Perspective** | Neutral | Attacker | Defender | User | Tester |
| **Complexity** | Medium | High | High | Low | High |
| **Technical Depth** | Medium | High | High | Low-Medium | High |
| **Audience** | General | Security pros | Security pros | End users | Web devs/pentesters |
| **Output Style** | Balanced | Offensive-focused | Defensive-focused | User-friendly | Vulnerability-focused |
| **MITRE Mapping** | ✓ | ✓✓ | ✓✓ | - | ✓ |
| **IOC Focus** | ✓ | ✓ | ✓✓ | - | ✓ |
| **Remediation** | ✓ | ✓ | ✓✓ | ✓✓ | ✓✓ |
| **Education** | ✓✓ | ✓ | ✓ | ✓✓ | ✓✓ |

### Command Quick Reference

```bash
# Interactive session
cyber-claude                              # Starts in base mode
cyber-claude --mode redteam               # Starts in red team mode
cyber-claude i --mode webpentest          # Short alias

# View/switch modes in session
> mode                                    # View current mode
> mode redteam                            # Switch to red team
> mode blueteam                           # Switch to blue team

# Mode-specific workflows
> mode redteam                            # Find vulnerabilities
> [analyze system]
> mode blueteam                           # Get defenses
> [get remediation]

# One-off commands with mode
cyber-claude scan --mode desktopsecurity
cyber-claude webscan https://example.com --mode webpentest
```

---

## 📚 Additional Resources

- **System Prompts:** `src/agent/prompts/system.ts`
- **Agent Core:** `src/agent/core.ts`
- **Interactive Session:** `src/cli/session.ts`
- **Type Definitions:** `src/agent/types.ts`
- **MITRE ATT&CK:** `src/utils/mitre.ts`
- **IOC Extraction:** `src/utils/ioc.ts`

---

## 🤝 Contributing New Modes

Want to add a new mode? Follow these steps:

1. **Add mode to type definition** (`src/agent/types.ts`):
```typescript
export type AgentMode = 'base' | 'redteam' | 'blueteam' | 'desktopsecurity' | 'webpentest' | 'yourmode';
```

2. **Add system prompt** (`src/agent/prompts/system.ts`):
```typescript
export const SYSTEM_PROMPTS = {
  // ... existing modes ...
  yourmode: `You are operating in YOUR MODE...

  Focus on:
  - Thing 1
  - Thing 2

  Remember:
  - Constraint 1
  - Constraint 2`,
};
```

3. **Update validation** (`src/cli/session.ts`):
```typescript
const validModes = ['base', 'redteam', 'blueteam', 'desktopsecurity', 'webpentest', 'yourmode'];
```

4. **Add to documentation**:
- Update this file (AGENT_MODES.md)
- Update README.md
- Update CAPABILITIES.md

---

**For more information, see:**
- [README.md](README.md) - Project overview
- [CAPABILITIES.md](CAPABILITIES.md) - Full feature list
- [CLAUDE.md](CLAUDE.md) - Developer documentation

---

**Built with ❤️ using Claude Agent SDK**
**License:** MIT