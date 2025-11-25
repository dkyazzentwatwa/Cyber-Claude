# Cyber Claude v0.6.0 - Comprehensive Testing Guide

This guide will help you thoroughly test all features and commands in Cyber Claude to ensure everything works properly.

## Prerequisites

Before testing, ensure you have:
```bash
# 1. Build the project
npm run build

# 2. Set up environment (at least one provider)
cp .env.example .env
# Edit .env and add ANTHROPIC_API_KEY or GOOGLE_API_KEY
# OR install Ollama for local testing

# 3. Verify CLI is accessible
./dist/cli/index.js --help
# Or if installed globally:
cyber-claude --help
```

---

## Test Plan Overview

1. **Basic CLI Tests** - Verify help, version, basic functionality
2. **Desktop Security Tests** - System scanning and hardening
3. **Web Security Tests** - Website vulnerability scanning
4. **Network Analysis Tests** - PCAP file analysis
5. **OSINT Tests** - Reconnaissance and intelligence gathering
6. **Log Analysis Tests** - Security log analysis (NEW v0.6.0)
7. **CVE Lookup Tests** - Vulnerability database (NEW v0.6.0)
8. **Daemon Mode Tests** - Scheduled scanning (NEW v0.6.0)
9. **Autonomous Mode Tests** - AI-powered task execution (CRITICAL)
10. **Interactive Session Tests** - REPL mode
11. **Provider Fallback Tests** - Multi-provider switching
12. **Performance & Stress Tests** - Load testing

---

## 1. Basic CLI Tests

### Test 1.1: Help and Version
```bash
# Should display help text
cyber-claude --help

# Should show version 0.6.0
cyber-claude --version
```
**Expected:** Clean output with all commands listed, version shows "0.6.0"

### Test 1.2: Invalid Command
```bash
# Should show error and suggest valid commands
cyber-claude invalid-command
```
**Expected:** Error message with suggestions

### Test 1.3: Provider Health Check
```bash
# Should check all providers at startup
cyber-claude
```
**Expected:** Shows provider availability (Claude, Gemini, Ollama)

---

## 2. Desktop Security Tests

### Test 2.1: Quick System Scan
```bash
cyber-claude scan --quick
```
**Expected:**
- Completes in < 10 seconds
- Shows OS info, processes, network connections
- Displays findings with severity colors
- No errors

### Test 2.2: Full System Scan
```bash
cyber-claude scan --full
```
**Expected:**
- Runs comprehensive scan
- AI analysis included
- Report saved to scans/ directory
- Duration displayed

### Test 2.3: Network Scan
```bash
cyber-claude scan --network
```
**Expected:**
- Shows active connections
- Lists listening ports
- AI analysis of suspicious activity

### Test 2.4: System Hardening Check
```bash
cyber-claude harden
```
**Expected:**
- Checks firewall status
- Checks disk encryption
- Checks antivirus/security tools
- Provides recommendations

---

## 3. Web Security Tests

### Test 3.1: Basic Web Scan (Safe Target)
```bash
# Test with a safe, public website
cyber-claude webscan https://example.com --quick
```
**Expected:**
- Authorization check passes
- Completes scan
- Shows security headers analysis
- Saves report to scans/

### Test 3.2: Full Web Scan
```bash
cyber-claude webscan https://httpbin.org --full
```
**Expected:**
- Deeper analysis than quick scan
- CSRF token checking
- Cookie security assessment
- AI recommendations

### Test 3.3: Aggressive Scan (NEW v0.6.0) - LOCAL ONLY!
```bash
# ONLY test on local development server you own!
# Example: Set up a vulnerable test app first
# cyber-claude webscan http://localhost:3000 --aggressive --skip-auth
```
**Expected:**
- WARNING message about authorization
- Payload testing with 65+ payloads
- Evidence collection (payload, parameter, response)
- SQLi, XSS, Command Injection, Path Traversal, SSRF detection
- Detailed findings with evidence

### Test 3.4: Custom Payload Testing
```bash
# Test specific vulnerability types
cyber-claude webscan http://localhost:3000 --aggressive --skip-auth --test-types sqli,xss --max-payloads 5
```
**Expected:**
- Only tests specified types
- Limited to 5 payloads per type
- Faster execution

### Test 3.5: Authorization Checks
```bash
# Should FAIL - blocked domain
cyber-claude webscan https://google.com
```
**Expected:** Authorization denied, error message

```bash
# Should prompt for confirmation
cyber-claude webscan https://production-site.com
```
**Expected:** Warning, requires explicit confirmation

---

## 4. Network Analysis Tests

### Test 4.1: PCAP Analysis (Quick)
```bash
# First, get a sample pcap file
# You can download from: https://wiki.wireshark.org/SampleCaptures
# Or create one with tcpdump

cyber-claude pcap sample.pcap --mode quick
```
**Expected:**
- File parsed successfully
- Protocol statistics displayed
- Top conversations listed
- AI analysis of traffic patterns

### Test 4.2: PCAP with Filters
```bash
cyber-claude pcap sample.pcap --filter tcp --port 443
```
**Expected:**
- Only TCP traffic shown
- Only port 443 traffic
- Filtered statistics

### Test 4.3: PCAP with IOC Extraction
```bash
cyber-claude pcap sample.pcap --extract-iocs --mitre
```
**Expected:**
- IP addresses extracted
- Domains extracted
- MITRE ATT&CK techniques mapped
- Security assessment

### Test 4.4: PCAP Evidence Preservation
```bash
cyber-claude pcap sample.pcap --preserve-evidence --case-number TEST-001 --analyst "Test User"
```
**Expected:**
- Evidence package created
- Chain of custody recorded
- Triple hash verification
- Forensically sound export

---

## 5. OSINT Tests

### Test 5.1: Quick Domain Recon
```bash
cyber-claude recon example.com --quick
```
**Expected:**
- DNS records
- WHOIS info
- Basic domain info
- Completes in < 30 seconds

### Test 5.2: Full Domain Scan
```bash
cyber-claude recon example.com --full
```
**Expected:**
- All 10 OSINT tools run
- DNS, WHOIS, subdomains, emails
- Technology detection
- Wayback machine data
- Takes 2-5 minutes
- Risk score calculated

### Test 5.3: Username Enumeration
```bash
cyber-claude recon johndoe --person
```
**Expected:**
- Searches 35+ platforms
- Social media profiles found
- Risk assessment

### Test 5.4: Subdomain Enumeration
```bash
cyber-claude recon subdomains example.com
```
**Expected:**
- Certificate transparency logs
- DNS brute force
- Subdomain list

---

## 6. Log Analysis Tests (NEW v0.6.0)

### Test 6.1: Auth Log Analysis
```bash
# On Linux/Mac
cyber-claude logs /var/log/auth.log

# On Mac (alternative)
cyber-claude logs /var/log/system.log

# Or create a test log file
echo "Jan 1 10:00:00 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100" > test.log
echo "Jan 1 10:00:01 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100" >> test.log
echo "Jan 1 10:00:02 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100" >> test.log
cyber-claude logs test.log
```
**Expected:**
- Format auto-detected (syslog/auth)
- Brute force attack detected
- Severity distribution shown
- AI analysis with recommendations

### Test 6.2: Apache Log Analysis
```bash
# Create sample Apache log
cat > apache_test.log << 'EOF'
192.168.1.100 - - [01/Jan/2024:10:00:00 +0000] "GET /admin/login.php HTTP/1.1" 200 1234
192.168.1.100 - - [01/Jan/2024:10:00:01 +0000] "GET /../../etc/passwd HTTP/1.1" 404 234
192.168.1.100 - - [01/Jan/2024:10:00:02 +0000] "GET /index.php?id=1' OR '1'='1 HTTP/1.1" 500 567
EOF

cyber-claude logs apache_test.log
```
**Expected:**
- Apache format detected
- Path traversal attempt detected
- SQL injection attempt detected
- Anomaly alerts

### Test 6.3: Log Analysis with Options
```bash
cyber-claude logs test.log --mode full --export-json results.json
```
**Expected:**
- Full analysis mode
- JSON export created
- All anomaly types checked

---

## 7. CVE Lookup Tests (NEW v0.6.0)

### Test 7.1: Direct CVE Lookup
```bash
cyber-claude cve CVE-2024-21762
```
**Expected:**
- CVE details retrieved
- CVSS score displayed
- Description shown
- References listed
- < 5 seconds (cached after first lookup)

### Test 7.2: Keyword Search
```bash
cyber-claude cve apache
```
**Expected:**
- Multiple CVEs returned
- Sorted by relevance
- Severity colors
- Top 10 results

### Test 7.3: Product Search
```bash
cyber-claude cve --product apache --version 2.4.49
```
**Expected:**
- CVEs affecting specific version
- Severity assessment
- Fix recommendations

### Test 7.4: Invalid CVE
```bash
cyber-claude cve CVE-9999-99999
```
**Expected:** Error message "CVE not found"

---

## 8. Daemon Mode Tests (NEW v0.6.0)

### Test 8.1: Daemon Status
```bash
cyber-claude daemon status
```
**Expected:**
- Shows daemon status (running/stopped)
- Job statistics
- Next scheduled job

### Test 8.2: List Jobs
```bash
cyber-claude daemon jobs
```
**Expected:**
- Lists all scheduled jobs
- Shows schedule, last run, next run
- Status (enabled/disabled)

### Test 8.3: Add Scheduled Job
```bash
# Add a test job (every 5 minutes)
cyber-claude daemon add \
  -n "Test Web Scan" \
  -t webscan \
  -T https://example.com \
  -s "*/5 * * * *" \
  -o '{"quick": true}'
```
**Expected:**
- Job created successfully
- Job ID returned
- Next run time calculated

### Test 8.4: Run Job Immediately
```bash
# Get job ID from previous test
cyber-claude daemon jobs
# Copy the job ID
cyber-claude daemon run <job-id>
```
**Expected:**
- Job executes immediately
- Result saved to .cyber-claude/results/
- Duration and findings count shown

### Test 8.5: Disable/Enable Job
```bash
cyber-claude daemon disable <job-id>
cyber-claude daemon jobs
# Verify job is disabled

cyber-claude daemon enable <job-id>
cyber-claude daemon jobs
# Verify job is enabled
```
**Expected:** Job status changes correctly

### Test 8.6: Remove Job
```bash
cyber-claude daemon remove <job-id>
cyber-claude daemon jobs
# Verify job is removed
```
**Expected:** Job deleted from list

### Test 8.7: Start Daemon (Foreground)
```bash
# Start daemon in terminal
cyber-claude daemon start

# Press Ctrl+C to stop after a minute
```
**Expected:**
- Daemon starts
- Shows scheduled jobs
- Logs job executions
- Stops cleanly on Ctrl+C

---

## 9. Autonomous Mode Tests (CRITICAL)

### Test 9.1: Simple Autonomous Task
```bash
cyber-claude auto "scan example.com for security issues"
```
**Expected:**
- AI generates plan
- Shows steps (e.g., webscan, analyze results)
- Executes steps automatically
- Provides summary
- Duration: 30-60 seconds

### Test 9.2: Complex Multi-Step Task
```bash
cyber-claude auto "gather intelligence on example.com including DNS, WHOIS, and subdomain enumeration"
```
**Expected:**
- Multi-step plan generated
- Executes recon tools in sequence
- Aggregates results
- AI provides comprehensive analysis
- Duration: 2-3 minutes

### Test 9.3: Autonomous with Verbose Output
```bash
cyber-claude auto "analyze my system security" --verbose
```
**Expected:**
- Detailed step-by-step output
- Shows tool selection reasoning
- Shows reflection after each step
- Adapts plan if needed

### Test 9.4: Autonomous with Mode
```bash
cyber-claude auto "find vulnerabilities in https://httpbin.org" --mode webpentest
```
**Expected:**
- Uses webpentest mode system prompt
- Focuses on web vulnerabilities
- Detailed security analysis

### Test 9.5: Autonomous Error Recovery
```bash
# Intentionally cause error with invalid target
cyber-claude auto "scan invalid://bad-url"
```
**Expected:**
- AI detects error
- Reflects on failure
- Suggests alternative approach or fails gracefully

### Test 9.6: Autonomous Task Export
```bash
cyber-claude auto "quick security check" --export results.json
```
**Expected:**
- Task completes
- Results exported to JSON
- Contains plan, steps, findings

---

## 10. Interactive Session Tests

### Test 10.1: Start Interactive Session
```bash
cyber-claude
```
**Expected:**
- Welcome banner shown
- Provider status displayed
- Quick start guide
- Prompt shown

### Test 10.2: Interactive Commands
```bash
# In interactive session, test each command:
scan
scan full
webscan https://example.com
recon example.com
pcap sample.pcap
harden
flows
cve CVE-2024-21762
logs test.log
daemon status
daemon jobs
auto "quick security check"
```
**Expected:** All commands work as in standalone mode

### Test 10.3: Session Management
```bash
# In interactive session:
status
# Shows session info

history
# Shows command history

clear
# Clears conversation

mode webpentest
# Changes mode

model
# Select different model

help
# Shows full help
```
**Expected:** All session commands work

### Test 10.4: Natural Chat
```bash
# In interactive session:
How do I secure SSH?
What is XSS?
Explain SQL injection
```
**Expected:**
- AI responds naturally
- Context maintained
- Relevant security advice

### Test 10.5: Exit Session
```bash
exit
```
**Expected:** Clean exit

---

## 11. Provider Fallback Tests

### Test 11.1: Test with Claude
```bash
# Set only ANTHROPIC_API_KEY
cyber-claude scan --model sonnet-4
```
**Expected:** Uses Claude provider

### Test 11.2: Test with Gemini
```bash
# Set only GOOGLE_API_KEY
cyber-claude scan --model gemini-2.5-flash
```
**Expected:** Uses Gemini provider

### Test 11.3: Test with Ollama (if installed)
```bash
# Make sure Ollama is running
ollama pull gemma2:2b
cyber-claude scan --model gemma2-2b
```
**Expected:** Uses Ollama (local, offline)

### Test 11.4: Provider Error Handling
```bash
# Temporarily remove API keys or use invalid key
ANTHROPIC_API_KEY=invalid cyber-claude scan
```
**Expected:**
- Clear error message
- Suggests checking API key
- Lists available providers

### Test 11.5: Auto-Detect Provider
```bash
# Start without specifying model
cyber-claude
```
**Expected:**
- Checks all providers
- Shows which are available
- Suggests setup for unavailable ones

---

## 12. Performance & Stress Tests

### Test 12.1: Concurrent Commands
```bash
# Run multiple commands simultaneously
cyber-claude scan --quick &
cyber-claude webscan https://example.com &
cyber-claude recon example.com --quick &
wait
```
**Expected:** All complete without conflicts

### Test 12.2: Large File Handling
```bash
# Test with large pcap file (>100MB)
cyber-claude pcap large_capture.pcap
```
**Expected:**
- Processes without memory issues
- Progress indicators work
- Reasonable performance

### Test 12.3: Large Log File
```bash
# Test with large log file (>10,000 lines)
cyber-claude logs /var/log/syslog
```
**Expected:**
- Handles max_lines limit
- Doesn't crash
- Provides meaningful analysis

### Test 12.4: Rate Limiting
```bash
# Test CVE rate limits (if no API key)
for i in {1..10}; do
  cyber-claude cve CVE-2024-$i
done
```
**Expected:**
- Respects rate limits
- Doesn't crash
- Shows appropriate delays

### Test 12.5: Memory Usage
```bash
# Monitor memory during autonomous task
/usr/bin/time -l cyber-claude auto "comprehensive security audit"
# Or on Linux:
/usr/bin/time -v cyber-claude auto "comprehensive security audit"
```
**Expected:** Memory usage stays reasonable (< 500MB)

---

## 13. Error Handling Tests

### Test 13.1: Missing Arguments
```bash
cyber-claude webscan
cyber-claude logs
cyber-claude cve
cyber-claude recon
```
**Expected:** Clear error messages with usage examples

### Test 13.2: Invalid File Paths
```bash
cyber-claude logs /nonexistent/file.log
cyber-claude pcap /invalid/capture.pcap
```
**Expected:** File not found errors

### Test 13.3: Network Errors
```bash
# Disconnect network and test
cyber-claude webscan https://example.com
```
**Expected:** Timeout error with clear message

### Test 13.4: Invalid Model
```bash
cyber-claude scan --model invalid-model
```
**Expected:** Error listing valid models

### Test 13.5: Permission Errors
```bash
# Try to read protected file
cyber-claude logs /etc/shadow
```
**Expected:** Permission denied error

---

## Test Results Template

Use this template to track your testing:

```markdown
## Test Results - Cyber Claude v0.6.0

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** macOS/Linux/Windows
**Node Version:** X.X.X

### Test Summary
- Total Tests: X
- Passed: X
- Failed: X
- Skipped: X

### Failed Tests
| Test ID | Command | Expected | Actual | Notes |
|---------|---------|----------|--------|-------|
| 9.3 | auto verbose | Detailed output | Crashed | See logs |

### Performance Metrics
| Test | Duration | Memory | Notes |
|------|----------|--------|-------|
| Full scan | 45s | 250MB | ✓ Good |
| Auto task | 120s | 180MB | ✓ Good |
| PCAP large | 180s | 400MB | ⚠ Slow |

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## Quick Smoke Test (5 minutes)

If you want to quickly verify everything works:

```bash
# 1. Basic functionality
cyber-claude --version
cyber-claude --help

# 2. Quick scan
cyber-claude scan --quick

# 3. Web scan (safe site)
cyber-claude webscan https://example.com --quick

# 4. CVE lookup
cyber-claude cve CVE-2024-21762

# 5. Simple autonomous task
cyber-claude auto "check my system security"

# 6. Interactive session
cyber-claude
# Type: help
# Type: status
# Type: exit

# If all 6 complete successfully, core functionality is working!
```

---

## Benchmarking Script

Save this as `benchmark.sh`:

```bash
#!/bin/bash

echo "=== Cyber Claude Performance Benchmark ==="
echo ""

# Test 1: Quick scan
echo "Test 1: Quick Scan"
time cyber-claude scan --quick > /dev/null 2>&1
echo ""

# Test 2: Web scan
echo "Test 2: Web Scan"
time cyber-claude webscan https://example.com --quick > /dev/null 2>&1
echo ""

# Test 3: CVE lookup
echo "Test 3: CVE Lookup"
time cyber-claude cve CVE-2024-21762 > /dev/null 2>&1
echo ""

# Test 4: Autonomous task
echo "Test 4: Autonomous Task"
time cyber-claude auto "quick security check" > /dev/null 2>&1
echo ""

echo "=== Benchmark Complete ==="
```

Run with: `chmod +x benchmark.sh && ./benchmark.sh`

---

## Continuous Integration Test Script

For automated testing, save as `ci-test.sh`:

```bash
#!/bin/bash
set -e

echo "Running CI tests for Cyber Claude v0.6.0"

# Build
echo "Building..."
npm run build

# Test basic commands
echo "Testing basic commands..."
./dist/cli/index.js --version || exit 1
./dist/cli/index.js --help || exit 1

# Test scan (basic)
echo "Testing scan..."
./dist/cli/index.js scan --quick || exit 1

# Test CVE (should work without auth)
echo "Testing CVE lookup..."
./dist/cli/index.js cve CVE-2024-21762 || exit 1

echo "All CI tests passed!"
```

---

## Notes

- **Authentication:** Some tests require API keys (ANTHROPIC_API_KEY or GOOGLE_API_KEY)
- **Network:** Most tests require internet connection
- **Permissions:** Some log file tests may need sudo/admin rights
- **Time:** Full test suite takes 30-45 minutes
- **Aggressive Scans:** ONLY test on servers you own with explicit authorization

**Important:** The autonomous mode (`auto`) is the most complex feature. Test it thoroughly with various tasks to ensure the AI planning and execution works correctly.
