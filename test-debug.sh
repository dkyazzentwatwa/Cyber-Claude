#!/bin/bash

# Quick debug script to test individual commands

CLI="./dist/cli/index.js"

echo "Testing individual commands to find the issue..."
echo ""

echo "Test 1: Version"
$CLI --version
echo "Exit code: $?"
echo ""

echo "Test 2: Help"
$CLI --help | head -10
echo "Exit code: $?"
echo ""

echo "Test 3: Quick Scan (with output)"
echo "Running: $CLI scan --quick"
$CLI scan --quick
EXIT_CODE=$?
echo "Exit code: $EXIT_CODE"
echo ""

if [ $EXIT_CODE -ne 0 ]; then
    echo "ERROR: Quick scan failed!"
    echo "Checking for common issues..."
    echo ""

    # Check if dist exists
    if [ ! -f "$CLI" ]; then
        echo "❌ CLI not found at $CLI"
        echo "Run: npm run build"
        exit 1
    fi

    # Check Node version
    echo "Node version:"
    node --version
    echo ""

    # Try running with node directly
    echo "Trying: node $CLI scan --quick"
    node $CLI scan --quick
    echo "Exit code: $?"
fi
