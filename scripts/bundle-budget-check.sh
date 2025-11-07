#!/bin/bash

# Bundle Optimization CI Script
# Runs in CI to enforce bundle size budgets

set -e

echo "🔍 Bundle Size Budget Check (CI)"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_pass() { echo -e "${GREEN}✓${NC} $1"; }
print_fail() { echo -e "${RED}✗${NC} $1"; }
print_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Configuration - Size budgets in KB (gzipped)
MINIMAL_TARGET=10
MINIMAL_MAX=15
FULL_TARGET=25
FULL_MAX=50

FAILED=false

echo ""
echo "Budget Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Minimal Import:"
echo "    Target: < ${MINIMAL_TARGET}KB (ideal)"
echo "    Maximum: < ${MINIMAL_MAX}KB (acceptable)"
echo ""
echo "  Full Import:"
echo "    Target: < ${FULL_TARGET}KB (ideal)"
echo "    Maximum: < ${FULL_MAX}KB (acceptable)"
echo ""

# Run bundle tests
echo "Running bundle tests..."
bash scripts/bundle-test-minimal.sh > /tmp/ci-minimal.txt 2>&1
bash scripts/bundle-test-full.sh > /tmp/ci-full.txt 2>&1

# Extract sizes
MINIMAL_SIZE=$(grep "Gzipped size:" /tmp/ci-minimal.txt | awk '{print $3}' | sed 's/KB.*//')
FULL_SIZE=$(grep "Gzipped size:" /tmp/ci-full.txt | awk '{print $3}' | sed 's/KB.*//')

echo "Current Sizes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Minimal Import: ${MINIMAL_SIZE}KB (gzipped)"
echo "  Full Import: ${FULL_SIZE}KB (gzipped)"
echo ""

# Check minimal import
echo "Minimal Import Budget Check:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$MINIMAL_SIZE" -lt "$MINIMAL_TARGET" ]; then
    print_pass "Excellent! Size is under target (${MINIMAL_SIZE}KB < ${MINIMAL_TARGET}KB)"
elif [ "$MINIMAL_SIZE" -lt "$MINIMAL_MAX" ]; then
    print_warn "Acceptable but could improve (${MINIMAL_SIZE}KB < ${MINIMAL_MAX}KB)"
else
    print_fail "BUDGET EXCEEDED! (${MINIMAL_SIZE}KB > ${MINIMAL_MAX}KB)"
    FAILED=true
fi
echo ""

# Check full import
echo "Full Import Budget Check:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FULL_SIZE" -lt "$FULL_TARGET" ]; then
    print_pass "Excellent! Size is under target (${FULL_SIZE}KB < ${FULL_TARGET}KB)"
elif [ "$FULL_SIZE" -lt "$FULL_MAX" ]; then
    print_warn "Acceptable but could improve (${FULL_SIZE}KB < ${FULL_MAX}KB)"
else
    print_fail "BUDGET EXCEEDED! (${FULL_SIZE}KB > ${FULL_MAX}KB)"
    FAILED=true
fi
echo ""

# Check for regressions if baselines exist
if [ -f "scripts/.bundle-baseline-minimal.txt" ] && [ -f "scripts/.bundle-baseline-full.txt" ]; then
    echo "Regression Check:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    MINIMAL_BASELINE=$(cat "scripts/.bundle-baseline-minimal.txt")
    MINIMAL_BASELINE_KB=$((MINIMAL_BASELINE / 1024))
    FULL_BASELINE=$(cat "scripts/.bundle-baseline-full.txt")
    FULL_BASELINE_KB=$((FULL_BASELINE / 1024))

    MINIMAL_CURRENT=$((MINIMAL_SIZE * 1024))
    FULL_CURRENT=$((FULL_SIZE * 1024))

    # Check for significant regressions (> 10% increase)
    MINIMAL_DIFF=$((MINIMAL_CURRENT - MINIMAL_BASELINE))
    MINIMAL_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($MINIMAL_DIFF/$MINIMAL_BASELINE)*100}")
    MINIMAL_PERCENT_INT=$(awk "BEGIN {printf \"%.0f\", ($MINIMAL_DIFF/$MINIMAL_BASELINE)*100}")

    if [ "$MINIMAL_DIFF" -gt 0 ]; then
        if [ "$MINIMAL_PERCENT_INT" -gt 10 ]; then
            print_fail "Minimal import REGRESSION: +${MINIMAL_PERCENT}% from baseline"
            FAILED=true
        else
            print_warn "Minimal import increased: +${MINIMAL_PERCENT}% from baseline"
        fi
    else
        print_pass "Minimal import: No regression"
    fi

    FULL_DIFF=$((FULL_CURRENT - FULL_BASELINE))
    FULL_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($FULL_DIFF/$FULL_BASELINE)*100}")
    FULL_PERCENT_INT=$(awk "BEGIN {printf \"%.0f\", ($FULL_DIFF/$FULL_BASELINE)*100}")

    if [ "$FULL_DIFF" -gt 0 ]; then
        if [ "$FULL_PERCENT_INT" -gt 10 ]; then
            print_fail "Full import REGRESSION: +${FULL_PERCENT}% from baseline"
            FAILED=true
        else
            print_warn "Full import increased: +${FULL_PERCENT}% from baseline"
        fi
    else
        print_pass "Full import: No regression"
    fi
    echo ""
fi

# Final result
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILED" = true ]; then
    echo ""
    print_fail "BUNDLE SIZE CHECK FAILED!"
    echo ""
    echo "Actions Required:"
    echo "  1. Review recent changes for bundle size impact"
    echo "  2. Run 'yarn bundle:analyze' for detailed analysis"
    echo "  3. Consider code splitting or lazy loading"
    echo "  4. Remove unused dependencies"
    echo "  5. Optimize large modules"
    echo ""
    exit 1
else
    echo ""
    print_pass "BUNDLE SIZE CHECK PASSED!"
    echo ""
    echo "All bundle sizes are within acceptable limits."
    exit 0
fi
