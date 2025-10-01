# Cyber Claude Workflows & Playbook

> **Complete guide to getting the most out of Cyber Claude**
> From beginner basics to advanced security workflows

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Choosing the Right Mode](#choosing-the-right-mode)
3. [Desktop Security Workflows](#desktop-security-workflows)
4. [Web Application Testing Workflows](#web-application-testing-workflows)
5. [OSINT Investigation Workflows](#osint-investigation-workflows)
6. [Network Traffic Analysis Workflows](#network-traffic-analysis-workflows)
7. [Incident Response Workflows](#incident-response-workflows)
8. [CTF & Bug Bounty Workflows](#ctf--bug-bounty-workflows)
9. [Best Practices & Pro Tips](#best-practices--pro-tips)
10. [Common Scenarios](#common-scenarios)

---

## Getting Started

### First Time User Workflow

```bash
# 1. Start interactive session
cyber-claude

# 2. Check your current status
status

# 3. Get familiar with commands
help

# 4. Try a quick scan of your system
scan

# 5. Ask the AI to explain results
What are the most important security issues you found?

# 6. Get recommendations
What should I do first to improve my security?
```

### Understanding Modes

Before diving into workflows, understand that **modes change how the AI thinks**:

- **base** 🤖 - General assistant, good for learning
- **redteam** ⚔️ - Thinks like an attacker (finding vulnerabilities)
- **blueteam** 🛡️ - Thinks like a defender (monitoring, responding)
- **desktopsecurity** 🔒 - Focused on personal computer security
- **webpentest** 🌐 - Web application security expert
- **osint** 🔍 - Intelligence gathering and reconnaissance

**Pro Tip:** Switch modes based on your current task for best results!

---

## Choosing the Right Mode

### Quick Mode Selection Guide

| Task | Best Mode | Why |
|------|-----------|-----|
| Securing your laptop | `desktopsecurity` | Focused on personal device security |
| Testing a website | `webpentest` | Specialized in web vulnerabilities |
| Finding what info is public about a domain | `osint` | Expert in reconnaissance |
| Analyzing suspicious network traffic | `blueteam` | Defensive mindset, threat hunting |
| Learning about security concepts | `base` | Balanced, educational approach |
| Penetration testing assessment | `redteam` | Offensive perspective |
| Investigating a pcap file | `blueteam` | Looks for threats and anomalies |

### Mode Switching Strategy

```bash
# Start in base mode to explore
mode base
What should I check first on my system?

# Switch to desktopsecurity for focused scanning
mode desktopsecurity
scan full

# Switch to webpentest for testing web apps
mode webpentest
webscan https://example.com
```

---

## Desktop Security Workflows

### 1. **Personal Computer Security Audit**

**Goal:** Understand and improve your computer's security posture

```bash
# Step 1: Switch to desktop security mode
mode desktopsecurity

# Step 2: Quick scan to get overview
scan

# Step 3: Ask AI to prioritize findings
Which of these findings should I address first?

# Step 4: Deep dive with full scan
scan full

# Step 5: Check hardening status
harden

# Step 6: Get actionable recommendations
Give me a step-by-step plan to harden my system

# Step 7: Analyze network activity
scan network

# Step 8: Ask about suspicious connections
Are any of these connections suspicious?
```

**Expected Outcome:** Prioritized list of security improvements with implementation steps

---

### 2. **Malware Investigation Workflow**

**Goal:** Investigate suspicious system behavior

```bash
# Step 1: Switch to blueteam mode (defensive mindset)
mode blueteam

# Step 2: Scan for suspicious processes
scan full

# Step 3: Analyze network connections
scan network

# Step 4: Ask AI to look for indicators
Look for signs of malware or suspicious activity

# Step 5: Get specific processes analyzed
Is this process [name] legitimate? What ports should it use?

# Step 6: Get remediation steps
If this is malware, how do I safely remove it?
```

**Pro Tip:** Take notes of suspicious findings before taking action

---

### 3. **Privacy & Data Protection Check**

```bash
mode desktopsecurity

# Check what's running
scan

# Ask privacy-focused questions
What processes might be collecting data on me?
How can I improve my privacy on this system?
What network connections are sending data externally?

# Check for weak configurations
harden

Are there any privacy-invasive settings I should change?
```

---

## Web Application Testing Workflows

### 1. **Quick Website Security Check**

**Goal:** Rapid assessment of a website's security headers and basic vulnerabilities

```bash
# Step 1: Switch to web pentest mode
mode webpentest

# Step 2: Run quick scan
webscan https://target.com

# Step 3: Ask AI to explain findings
Explain each vulnerability in simple terms

# Step 4: Get remediation guidance
How do I fix the missing security headers?

# Step 5: Check specific concerns
Is this site vulnerable to XSS?
Does it have CSRF protection?
```

**Use Case:** Quick assessment before deploying a website, or checking a site's security posture

---

### 2. **Comprehensive Web Application Penetration Test**

**Goal:** Thorough security assessment with detailed findings

```bash
mode webpentest

# Step 1: Initial reconnaissance
webscan https://target.com

# Step 2: Ask about attack surface
What are the main attack vectors on this site?

# Step 3: Analyze specific features
How should I test the login form for vulnerabilities?
What should I check in the cookie configuration?

# Step 4: Get testing methodology
Walk me through testing for SQL injection on this site

# Step 5: Document findings
Summarize all vulnerabilities by severity with OWASP categories

# Step 6: Create remediation report
Generate a prioritized fix list for the development team
```

**Deliverable:** Comprehensive vulnerability report with remediation steps

---

### 3. **CTF Web Challenge Workflow**

**Goal:** Solve Capture The Flag web challenges

```bash
mode webpentest

# Step 1: Reconnaissance
webscan http://ctf-challenge.local:8080

# Step 2: Analyze the challenge
I'm looking at a CTF challenge. What vulnerabilities do you see?

# Step 3: Get methodology (not answers!)
What approach should I take to find the flag?
What tools or techniques would be useful here?

# Step 4: Understand concepts
Explain how [vulnerability type] works in this context

# Step 5: Hint-based guidance
I found [something]. What does this tell me about the vulnerability?
```

**Note:** Cyber Claude will teach methodology, not give direct answers!

---

### 4. **API Security Testing**

```bash
mode webpentest

# Test API endpoints
webscan https://api.example.com

# Ask specific API questions
How should I test REST API authentication?
What are common API vulnerabilities I should check?
How do I test for IDOR in API endpoints?

# Get testing checklist
Give me a comprehensive API security testing checklist
```

---

## OSINT Investigation Workflows

### 1. **Domain/Company Investigation**

**Goal:** Understand a domain's attack surface and exposed information

```bash
# Step 1: Switch to OSINT mode
mode osint

# Step 2: Quick reconnaissance
recon example.com

# Step 3: Comprehensive scan (if authorized)
recon example.com --full

# Step 4: Domain-focused deep dive
recon example.com --domain

# Step 5: Analyze results
What's the biggest security risk based on these findings?
What information is publicly exposed that shouldn't be?

# Step 6: Get hardening advice
How can this organization reduce their digital footprint?

# Step 7: Check specific aspects
What do the DNS records tell us about infrastructure?
Are any subdomains potentially vulnerable?
```

**Use Cases:**
- Pre-engagement reconnaissance for penetration testing
- Security audit of your own organization
- Understanding attack surface before hardening

---

### 2. **Personal Digital Footprint Assessment**

**Goal:** See what information about you is publicly available

```bash
mode osint

# Step 1: Check username across platforms
recon your-username --person

# Step 2: Check email for breaches (if you have one)
What should I check for data breaches?

# Step 3: Analyze findings
What privacy risks do these findings represent?

# Step 4: Get recommendations
How can I reduce my digital footprint?
What information should I remove or secure?
```

**Outcome:** Understanding of your online exposure and steps to improve privacy

---

### 3. **Threat Intelligence Workflow**

**Goal:** Gather intelligence on a potential threat actor or domain

```bash
mode osint

# Step 1: Gather all available data
recon suspicious-domain.com --full

# Step 2: Check IP information (if you have the IP)
How can I investigate an IP address for threats?

# Step 3: Analyze patterns
Based on this data, what can we infer about this domain?
Is this domain associated with malicious activity?

# Step 4: Timeline analysis
When was this domain registered? Any suspicious timing?

# Step 5: Infrastructure mapping
What hosting provider is this using? What does that tell us?
```

---

### 4. **Subdomain Discovery for Bug Bounty**

```bash
mode osint

# Discover all subdomains
recon target.com --domain

# Focus on subdomain enumeration
What subdomains look most interesting for testing?
Which subdomains might be staging/dev environments?

# Identify technology stacks
What technologies are these subdomains running?

# Prioritize targets
Which subdomains should I test first for vulnerabilities?
```

---

## Network Traffic Analysis Workflows

### 1. **Basic Pcap Analysis**

**Goal:** Understand what's in a network capture file

```bash
# Step 1: Switch to blueteam mode
mode blueteam

# Step 2: Analyze the capture
pcap capture.pcap

# Step 3: Ask for overview
Summarize the key findings from this traffic

# Step 4: Look for specific protocols
What HTTP traffic did you find?
Are there any DNS queries worth investigating?

# Step 5: Identify anomalies
What looks suspicious in this capture?
Are there any signs of malicious activity?
```

---

### 2. **Threat Hunting in Network Traffic**

**Goal:** Find indicators of compromise or malicious activity

```bash
mode blueteam

# Step 1: Analyze traffic
pcap suspicious-traffic.pcap

# Step 2: Hunt for specific threats
Look for signs of:
- Port scanning
- Data exfiltration
- C2 (Command & Control) communication
- Lateral movement
- Credential theft

# Step 3: Analyze suspicious conversations
What can you tell me about the conversation between [IP1] and [IP2]?

# Step 4: Get IOCs
List all suspicious IP addresses, domains, and ports

# Step 5: Map to MITRE ATT&CK
What ATT&CK techniques might these findings indicate?

# Step 6: Remediation
Based on these findings, what should be blocked or monitored?
```

---

### 3. **Malware Traffic Analysis**

```bash
mode blueteam

# Analyze pcap with potential malware traffic
pcap malware-sample.pcap

# Look for C2 communication
Are there any beaconing patterns?
What domains or IPs is the malware communicating with?

# Analyze protocols
What protocols is this malware using?
Are there any HTTP requests that look like C2?

# Extract indicators
Give me all IOCs (IPs, domains, URLs, file hashes)

# Understand behavior
Based on this traffic, what is the malware trying to do?
```

---

### 4. **Forensics Workflow**

```bash
mode blueteam

# Step 1: Establish timeline
pcap incident-traffic.pcap

When did this incident start based on the traffic?

# Step 2: Identify actors
What IP addresses were involved?
Who initiated the suspicious activity?

# Step 3: Document evidence
List all evidence of [specific activity]

# Step 4: Create incident report
Summarize this incident with timeline and IOCs
```

---

## Incident Response Workflows

### 1. **Initial Incident Triage**

**Goal:** Quickly assess an ongoing security incident

```bash
# Step 1: Switch to blueteam mode
mode blueteam

# Step 2: Quick system scan
scan

# Step 3: Check network connections
scan network

# Step 4: Ask AI to prioritize
What findings require immediate attention?
Is this an active compromise?

# Step 5: Get immediate actions
What should I do RIGHT NOW to contain this?

# Step 6: Document
What evidence should I preserve?
```

**Timeline:** 5-10 minutes for initial assessment

---

### 2. **Post-Incident Analysis**

```bash
mode blueteam

# Analyze collected evidence
pcap incident-capture.pcap

# System state at time of incident
scan full

# Timeline reconstruction
Based on all this data, build a timeline of the attack

# Root cause analysis
What was the initial access vector?
How could this have been prevented?

# Lessons learned
What detections should be implemented?
What hardening steps would have prevented this?
```

---

## CTF & Bug Bounty Workflows

### 1. **CTF Reconnaissance Phase**

```bash
mode osint

# Gather intelligence on target
recon ctf-target.com

# Analyze findings
What attack vectors do these findings suggest?
What technology stack is in use?

# Switch to appropriate mode for exploitation
mode webpentest  # for web challenges
mode base  # for general challenges
```

---

### 2. **Bug Bounty Methodology**

```bash
# Phase 1: Reconnaissance
mode osint
recon target.com --full

# Phase 2: Asset discovery
What subdomains and services were discovered?
Which assets are most interesting for testing?

# Phase 3: Web application testing
mode webpentest
webscan https://target.com

# Phase 4: Vulnerability analysis
Which vulnerabilities are confirmed vs potential?
What's the severity and impact of each finding?

# Phase 5: Report preparation
Write a bug bounty report for [vulnerability] with:
- Title, severity, description, impact, reproduction steps, remediation
```

---

### 3. **Challenge-Specific Workflows**

**Web Challenges:**
```bash
mode webpentest
webscan [challenge-url]
What vulnerabilities are present?
How would I exploit [specific vulnerability]?
```

**Network Challenges:**
```bash
mode blueteam
pcap challenge.pcap
What's hidden in this traffic?
What protocols should I analyze?
```

**OSINT Challenges:**
```bash
mode osint
recon [target]
What information can be gathered passively?
```

---

## Best Practices & Pro Tips

### 1. **Effective Mode Switching**

```bash
# Start broad, then narrow down
mode base → mode desktopsecurity → specific questions

# Match mode to task
- Scanning? Use desktopsecurity or blueteam
- Testing web app? Use webpentest
- Gathering intel? Use osint
- Analyzing threats? Use blueteam
- Finding vulnerabilities? Use redteam
```

### 2. **Getting Better Answers**

**❌ Don't Ask:**
```
Is my system secure?
```

**✅ Do Ask:**
```
scan full
Based on these scan results, what are the top 3 security risks and how do I fix them?
```

**The Difference:** Provide context and data for better analysis!

---

### 3. **Combining Commands with Chat**

```bash
# Pattern: Command → Analysis → Specific Questions

# Step 1: Run command
scan

# Step 2: Get AI analysis
Analyze these results for security issues

# Step 3: Ask specific follow-ups
Why is process X running?
Should port Y be open?
How do I close port Z?
```

---

### 4. **Building Context**

The AI remembers your conversation in the session, so build context:

```bash
# Build context progressively
scan
# AI sees system state

I'm running a web server on port 8080
# AI now knows your context

scan network
# AI can correlate with previous information

Is the traffic to port 8080 normal based on what you know?
# AI uses accumulated context
```

---

### 5. **Handling Large Results**

```bash
# For large scan results
scan full

# Don't ask "tell me everything"
# Instead, be specific:
Show me only critical and high severity findings
What's the most important issue to fix first?
Explain the top 3 risks in simple terms
```

---

### 6. **Learning Mode**

Use Cyber Claude as a security mentor:

```bash
# Pattern: Find → Learn → Practice

# Find a vulnerability
webscan https://example.com

# Learn about it
Explain what CSRF is and why it's dangerous
How does CSRF protection work?

# Practice preventing it
How do I implement CSRF protection in [your framework]?
Show me code examples
```

---

### 7. **Documentation Workflow**

```bash
# Use AI to help document findings

scan full

Create a security audit report with:
1. Executive summary
2. Critical findings
3. Remediation roadmap
4. Technical details

# Or for bug bounties
Create a vulnerability report for [finding] in bug bounty format
```

---

### 8. **Using History Effectively**

```bash
# Check what you've done
history

# Reference previous commands
status

# Clear context when starting new task
clear
mode [new-mode]
```

---

## Common Scenarios

### Scenario 1: "I Think I've Been Hacked"

```bash
mode blueteam

# Check for active threats
scan network
scan full

Look for indicators of compromise:
- Unexpected network connections
- Suspicious processes
- Unknown services
- Unusual system behavior

# Analyze findings
Are any of these findings indicators of compromise?
What should I do immediately?

# If confirmed breach
What evidence should I preserve?
How do I safely contain this?
```

---

### Scenario 2: "I'm Deploying a New Website"

```bash
mode webpentest

# Pre-deployment security check
webscan https://staging.mysite.com

# Check all major security controls
Does this site have:
- Proper security headers?
- CSRF protection?
- Secure cookies?
- XSS prevention?

# Get deployment checklist
What security checks should I do before going live?

# Final check
webscan https://mysite.com
```

---

### Scenario 3: "I'm Starting a Penetration Test"

```bash
# Phase 1: Reconnaissance
mode osint
recon target.com --full

# Phase 2: Asset analysis
What assets were discovered?
What technologies are in use?

# Phase 3: Vulnerability identification
mode redteam
webscan [discovered-assets]

# Phase 4: Attack surface mapping
What are the main attack vectors?
Where should I focus testing efforts?
```

---

### Scenario 4: "I Found Suspicious Network Traffic"

```bash
mode blueteam

# Analyze the capture
pcap suspicious.pcap

# Identify threats
What malicious activity is present?
What IPs should I block?

# Get IOCs
List all indicators of compromise

# Map to MITRE
What ATT&CK techniques are being used?

# Remediation
What should I do to prevent this in the future?
```

---

### Scenario 5: "Learning About a New Vulnerability"

```bash
mode base

# Start with education
Explain what [vulnerability name] is
How does this attack work?
Show me examples of vulnerable code

# See it in practice
mode webpentest
webscan [test-site]

# Learn to fix it
How do I prevent [vulnerability]?
Show me secure code examples
```

---

### Scenario 6: "Hardening a New Server"

```bash
mode desktopsecurity

# Check current state
scan full
harden

# Get hardening checklist
What should I do to harden this system?

# Step-by-step guidance
Walk me through:
1. Configuring the firewall
2. Securing SSH
3. Enabling automatic updates
4. Setting up fail2ban
5. Configuring logging

# Verify after changes
scan full
Did my changes improve security?
```

---

## Advanced Techniques

### 1. **Multi-Mode Investigation**

For complex investigations, use multiple modes:

```bash
# Start with OSINT
mode osint
recon target.com --full

# Switch to redteam for vulnerability analysis
mode redteam
webscan https://target.com

# Switch to blueteam for defensive recommendations
mode blueteam
Based on these vulnerabilities, what detections should be implemented?
```

---

### 2. **Iterative Testing**

```bash
mode webpentest

# Initial test
webscan https://app.com

# Get list of endpoints
What endpoints should I test more thoroughly?

# Test each endpoint
webscan https://app.com/api/users
webscan https://app.com/admin

# Compare results
What's the most critical vulnerability across all endpoints?
```

---

### 3. **Creating Custom Workflows**

```bash
# Save your effective workflows in scripts
# Example: daily security check

scan
scan network
harden
Summarize any new security concerns compared to yesterday
```

---

## Conclusion

### Key Takeaways

1. **Choose the right mode** for your task - it makes a huge difference
2. **Provide context** - run commands first, then ask the AI to analyze
3. **Be specific** - detailed questions get better answers
4. **Build on context** - use the conversation history to your advantage
5. **Combine commands** - use scans, then ask questions about results
6. **Use help** - type `help` anytime for command reference
7. **Learn progressively** - start with `base` mode, specialize as needed

### Getting Help

- **In-session:** Type `help` for detailed command reference
- **GitHub Issues:** [Report bugs or request features](https://github.com/anthropics/cyber-claude/issues)
- **Documentation:** See CLAUDE.md for technical details
- **README:** See README.md for setup and installation

### Workflow Templates

**Quick Security Check:**
```bash
mode desktopsecurity
scan
harden
What should I fix first?
```

**Website Testing:**
```bash
mode webpentest
webscan https://site.com
Summarize vulnerabilities by severity
```

**OSINT Investigation:**
```bash
mode osint
recon target.com --full
What's the attack surface?
```

**Network Analysis:**
```bash
mode blueteam
pcap capture.pcap
Find malicious activity
```

---

**Happy Hacking! 🛡️**

*Remember: Use Cyber Claude ethically and only on systems you have permission to test.*
