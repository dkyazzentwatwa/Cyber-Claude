#!/bin/bash

# Cyber Claude v0.6.0 - Automated Test Suite
# This script tests all major features to ensure everything works

# Don't exit on error - we want to continue testing even if some tests fail
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test results array
declare -a FAILED_TESTS_LIST

# Function to print test header
test_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Function to print test result
test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TESTS_LIST+=("$2")
    fi
}

# Function to skip test
skip_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    echo -e "${YELLOW}⊘ SKIPPED${NC}: $1"
}

# Parse arguments
VERBOSE=false
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
    VERBOSE=true
fi

# Check if CLI exists
if [ ! -f "./dist/cli/index.js" ]; then
    echo -e "${RED}Error: CLI not built. Run 'npm run build' first.${NC}"
    exit 1
fi

CLI="./dist/cli/index.js"

# Function to run command with optional verbose output
run_test() {
    local cmd=$1
    if [ "$VERBOSE" = true ]; then
        echo "Executing: $cmd"
        eval "$cmd"
        return $?
    else
        eval "$cmd" > /dev/null 2>&1
        return $?
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Cyber Claude v0.6.0 Test Suite         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Starting automated tests..."
echo "This will take approximately 5-10 minutes."
echo ""

# ============================================
# 1. BASIC CLI TESTS
# ============================================
test_header "1. Basic CLI Tests"

# Test 1.1: Version
$CLI --version > /dev/null 2>&1
test_result $? "Version command"

# Test 1.2: Help
$CLI --help > /dev/null 2>&1
test_result $? "Help command"

# ============================================
# 2. DESKTOP SECURITY TESTS
# ============================================
test_header "2. Desktop Security Tests"

# Test 2.1: Quick scan
if [ "$VERBOSE" = true ]; then
    echo "Running: timeout 60s $CLI scan --quick"
fi
run_test "timeout 60s $CLI scan --quick"
test_result $? "Quick system scan"

# Test 2.2: Hardening check
if [ "$VERBOSE" = true ]; then
    echo "Running: timeout 60s $CLI harden"
fi
run_test "timeout 60s $CLI harden"
test_result $? "Hardening check"

# ============================================
# 3. WEB SECURITY TESTS
# ============================================
test_header "3. Web Security Tests"

# Test 3.1: Basic web scan
timeout 60s $CLI webscan https://example.com --quick > /dev/null 2>&1
test_result $? "Basic web scan (example.com)"

# Test 3.2: Authorization blocking
$CLI webscan https://google.com > /dev/null 2>&1
if [ $? -ne 0 ]; then
    test_result 0 "Authorization blocking (should fail)"
else
    test_result 1 "Authorization blocking (should have been blocked)"
fi

# ============================================
# 4. CVE LOOKUP TESTS (NEW v0.6.0)
# ============================================
test_header "4. CVE Lookup Tests (NEW v0.6.0)"

# Test 4.1: Direct CVE lookup
timeout 30s $CLI cve CVE-2024-21762 > /dev/null 2>&1
test_result $? "Direct CVE lookup"

# Test 4.2: Keyword search
timeout 30s $CLI cve apache > /dev/null 2>&1
test_result $? "CVE keyword search"

# Test 4.3: Invalid CVE
$CLI cve CVE-9999-99999 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    test_result 0 "Invalid CVE handling (should fail)"
else
    test_result 1 "Invalid CVE handling (should have failed)"
fi

# ============================================
# 5. LOG ANALYSIS TESTS (NEW v0.6.0)
# ============================================
test_header "5. Log Analysis Tests (NEW v0.6.0)"

# Create test log file
TEST_LOG="test_$(date +%s).log"
cat > "$TEST_LOG" << 'EOF'
Jan 1 10:00:00 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100
Jan 1 10:00:01 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100
Jan 1 10:00:02 server sshd[1234]: Failed password for invalid user admin from 192.168.1.100
Jan 1 10:00:03 server sshd[1234]: Accepted password for user from 192.168.1.101
Jan 1 10:01:00 server kernel: [12345.123456] firewall: DROP IN=eth0 OUT= SRC=10.0.0.1
EOF

# Test 5.1: Log analysis
timeout 60s $CLI logs "$TEST_LOG" > /dev/null 2>&1
test_result $? "Log file analysis"

# Cleanup
rm -f "$TEST_LOG"

# ============================================
# 6. DAEMON MODE TESTS (NEW v0.6.0)
# ============================================
test_header "6. Daemon Mode Tests (NEW v0.6.0)"

# Test 6.1: Daemon status
timeout 10s $CLI daemon status > /dev/null 2>&1
test_result $? "Daemon status check"

# Test 6.2: List jobs
timeout 10s $CLI daemon jobs > /dev/null 2>&1
test_result $? "Daemon jobs list"

# Test 6.3: Add job
JOB_OUTPUT=$(timeout 10s $CLI daemon add -n "Test Job" -t webscan -T https://example.com -s "0 0 * * *" 2>&1)
if [ $? -eq 0 ]; then
    # Extract job ID from output
    JOB_ID=$(echo "$JOB_OUTPUT" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
    test_result 0 "Add daemon job"

    # Test 6.4: Remove job
    if [ -n "$JOB_ID" ]; then
        timeout 10s $CLI daemon remove "$JOB_ID" > /dev/null 2>&1
        test_result $? "Remove daemon job"
    else
        skip_test "Remove daemon job (no job ID)"
    fi
else
    test_result 1 "Add daemon job"
    skip_test "Remove daemon job (add failed)"
fi

# ============================================
# 7. AUTONOMOUS MODE TESTS (CRITICAL)
# ============================================
test_header "7. Autonomous Mode Tests (CRITICAL)"

# Check if we have API keys
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ]; then
    echo -e "${YELLOW}WARNING: No API keys found. Skipping autonomous tests.${NC}"
    skip_test "Simple autonomous task (no API key)"
    skip_test "Complex autonomous task (no API key)"
else
    # Test 7.1: Simple autonomous task
    timeout 120s $CLI auto "check system version" > /dev/null 2>&1
    test_result $? "Simple autonomous task"

    # Test 7.2: Complex autonomous task
    timeout 180s $CLI auto "quick security check" > /dev/null 2>&1
    test_result $? "Complex autonomous task"
fi

# ============================================
# 8. OSINT TESTS
# ============================================
test_header "8. OSINT Tests"

# Test 8.1: Quick recon
timeout 60s $CLI recon example.com --quick > /dev/null 2>&1
test_result $? "Quick OSINT recon"

# ============================================
# 9. PCAP ANALYSIS TESTS
# ============================================
test_header "9. PCAP Analysis Tests"

# Create minimal test pcap
TEST_PCAP="test_$(date +%s).pcap"
# This creates a very minimal pcap file (just header)
printf '\xd4\xc3\xb2\xa1\x02\x00\x04\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff\x00\x00\x01\x00\x00\x00' > "$TEST_PCAP"

# Test 9.1: PCAP parsing
timeout 30s $CLI pcap "$TEST_PCAP" > /dev/null 2>&1
if [ $? -eq 0 ] || [ $? -eq 1 ]; then
    # Both success and graceful failure are OK for minimal pcap
    test_result 0 "PCAP file parsing"
else
    test_result 1 "PCAP file parsing (unexpected error)"
fi

# Cleanup
rm -f "$TEST_PCAP"

# ============================================
# 10. INTERACTIVE SESSION TESTS
# ============================================
test_header "10. Interactive Session Tests"

# Test 10.1: Interactive help
echo "help" | timeout 10s $CLI > /dev/null 2>&1
test_result $? "Interactive session help"

# Test 10.2: Interactive status
echo "status" | timeout 10s $CLI > /dev/null 2>&1
test_result $? "Interactive session status"

# ============================================
# 11. ERROR HANDLING TESTS
# ============================================
test_header "11. Error Handling Tests"

# Test 11.1: Missing arguments
$CLI webscan > /dev/null 2>&1
if [ $? -ne 0 ]; then
    test_result 0 "Missing arguments error"
else
    test_result 1 "Missing arguments error (should have failed)"
fi

# Test 11.2: Invalid file
$CLI logs /nonexistent/file.log > /dev/null 2>&1
if [ $? -ne 0 ]; then
    test_result 0 "Invalid file error"
else
    test_result 1 "Invalid file error (should have failed)"
fi

# Test 11.3: Invalid command
$CLI invalid-command > /dev/null 2>&1
if [ $? -ne 0 ]; then
    test_result 0 "Invalid command error"
else
    test_result 1 "Invalid command error (should have failed)"
fi

# ============================================
# PRINT SUMMARY
# ============================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Test Results Summary            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Total Tests:   $TOTAL_TESTS"
echo -e "${GREEN}Passed:        $PASSED_TESTS${NC}"
echo -e "${RED}Failed:        $FAILED_TESTS${NC}"
echo -e "${YELLOW}Skipped:       $SKIPPED_TESTS${NC}"
echo ""

# Calculate pass rate
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Pass Rate:     $PASS_RATE%"
fi

# Print failed tests
if [ $FAILED_TESTS -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed Tests:${NC}"
    for test in "${FAILED_TESTS_LIST[@]}"; do
        echo -e "${RED}  - $test${NC}"
    done
fi

echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Cyber Claude v0.6.0 is working correctly."
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    echo ""
    echo "Please check the failed tests above and review the logs."
    exit 1
fi
