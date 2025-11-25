#!/bin/bash

# Cyber Claude v0.6.0 - Performance Benchmark Script
# Measures execution time and performance of key commands

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CLI="./dist/cli/index.js"

# Check if CLI exists
if [ ! -f "$CLI" ]; then
    echo -e "${RED}Error: CLI not built. Run 'npm run build' first.${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Cyber Claude Performance Benchmark      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Measuring performance of key operations..."
echo ""

# Function to benchmark a command
benchmark() {
    local test_name=$1
    local command=$2

    echo -e "${BLUE}Testing: $test_name${NC}"
    echo "Command: $command"

    # Run command and measure time
    START=$(date +%s.%N)
    eval "$command" > /dev/null 2>&1
    EXIT_CODE=$?
    END=$(date +%s.%N)

    # Calculate duration
    DURATION=$(echo "$END - $START" | bc)

    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ Completed in ${DURATION}s${NC}"
    else
        echo -e "${YELLOW}⚠ Failed (exit code: $EXIT_CODE)${NC}"
    fi
    echo ""
}

# ============================================
# BENCHMARK TESTS
# ============================================

echo "=== Core Commands ==="
echo ""

benchmark "Version Check" "$CLI --version"
benchmark "Help Display" "$CLI --help"

echo "=== Desktop Security ==="
echo ""

benchmark "Quick System Scan" "timeout 60s $CLI scan --quick"
benchmark "Hardening Check" "timeout 60s $CLI harden"

echo "=== Web Security ==="
echo ""

benchmark "Quick Web Scan" "timeout 90s $CLI webscan https://example.com --quick"

echo "=== CVE Database (v0.6.0) ==="
echo ""

benchmark "CVE Lookup (Direct)" "timeout 30s $CLI cve CVE-2024-21762"
benchmark "CVE Search (Keyword)" "timeout 30s $CLI cve apache"

echo "=== Log Analysis (v0.6.0) ==="
echo ""

# Create test log
TEST_LOG="benchmark_test.log"
cat > "$TEST_LOG" << 'EOF'
Jan 1 10:00:00 server sshd[1234]: Failed password for user from 192.168.1.100
Jan 1 10:00:01 server sshd[1234]: Failed password for user from 192.168.1.100
Jan 1 10:00:02 server sshd[1234]: Accepted password for user from 192.168.1.101
EOF

benchmark "Log File Analysis" "timeout 60s $CLI logs $TEST_LOG"

rm -f "$TEST_LOG"

echo "=== Daemon Mode (v0.6.0) ==="
echo ""

benchmark "Daemon Status" "timeout 10s $CLI daemon status"
benchmark "Daemon Jobs List" "timeout 10s $CLI daemon jobs"

echo "=== OSINT Reconnaissance ==="
echo ""

benchmark "Quick Recon" "timeout 90s $CLI recon example.com --quick"

echo "=== Autonomous Mode (CRITICAL) ==="
echo ""

# Only run if API key is available
if [ -n "$ANTHROPIC_API_KEY" ] || [ -n "$GOOGLE_API_KEY" ]; then
    benchmark "Simple Auto Task" "timeout 120s $CLI auto 'check system version'"
else
    echo -e "${YELLOW}⊘ Skipped (no API key)${NC}"
    echo ""
fi

echo "=== Memory Usage Test ==="
echo ""

# Test memory usage with time command
echo -e "${BLUE}Testing: Memory Usage (Scan)${NC}"
if command -v /usr/bin/time &> /dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        /usr/bin/time -l $CLI scan --quick 2>&1 | grep "maximum resident set size" || echo "Memory info not available"
    else
        # Linux
        /usr/bin/time -v $CLI scan --quick 2>&1 | grep "Maximum resident set size" || echo "Memory info not available"
    fi
else
    echo -e "${YELLOW}⊘ /usr/bin/time not available${NC}"
fi
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Benchmark Complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Recommendations:"
echo "  • Commands under 10s: Excellent"
echo "  • Commands 10-30s: Good"
echo "  • Commands 30-60s: Acceptable"
echo "  • Commands over 60s: May need optimization"
echo ""
