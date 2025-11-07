#!/bin/bash

# Bundle Size Comparison Script
# Compares current bundle sizes with baselines and historical data

set -e

echo "📊 Bundle Size Comparison Report"
echo "================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Run both tests to get current sizes
print_info "Running bundle tests..."
bash scripts/bundle-test-minimal.sh > /tmp/minimal-test.txt 2>&1
bash scripts/bundle-test-full.sh > /tmp/full-test.txt 2>&1

# Parse results
MINIMAL_GZIP=$(grep "Gzipped size:" /tmp/minimal-test.txt | awk '{print $3}' | sed 's/KB.*//')
FULL_GZIP=$(grep "Gzipped size:" /tmp/full-test.txt | awk '{print $3}' | sed 's/KB.*//')

echo ""
echo "📦 Current Bundle Sizes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "  %-20s %10s (gzipped)\n" "Minimal Import" "${MINIMAL_GZIP}KB"
printf "  %-20s %10s (gzipped)\n" "Full Import" "${FULL_GZIP}KB"

# Check baselines
MINIMAL_BASELINE_FILE="scripts/.bundle-baseline-minimal.txt"
FULL_BASELINE_FILE="scripts/.bundle-baseline-full.txt"

if [ -f "$MINIMAL_BASELINE_FILE" ] && [ -f "$FULL_BASELINE_FILE" ]; then
    echo ""
    echo "📈 Baseline Comparison"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    MINIMAL_BASELINE=$(cat "$MINIMAL_BASELINE_FILE")
    MINIMAL_BASELINE_KB=$((MINIMAL_BASELINE / 1024))
    FULL_BASELINE=$(cat "$FULL_BASELINE_FILE")
    FULL_BASELINE_KB=$((FULL_BASELINE / 1024))

    # Convert current KB to bytes for calculation
    MINIMAL_CURRENT=$((MINIMAL_GZIP * 1024))
    FULL_CURRENT=$((FULL_GZIP * 1024))

    # Calculate differences
    MINIMAL_DIFF=$((MINIMAL_CURRENT - MINIMAL_BASELINE))
    FULL_DIFF=$((FULL_CURRENT - FULL_BASELINE))

    # Format output
    printf "  %-20s %10s → %10s " "Minimal Import" "${MINIMAL_BASELINE_KB}KB" "${MINIMAL_GZIP}KB"
    if [ "$MINIMAL_DIFF" -eq 0 ]; then
        echo "(no change)"
    elif [ "$MINIMAL_DIFF" -gt 0 ]; then
        MINIMAL_DIFF_KB=$((MINIMAL_DIFF / 1024))
        MINIMAL_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($MINIMAL_DIFF/$MINIMAL_BASELINE)*100}")
        echo -e "${YELLOW}+${MINIMAL_DIFF_KB}KB (+${MINIMAL_PERCENT}%)${NC}"
    else
        MINIMAL_DIFF_KB=$((${MINIMAL_DIFF#-} / 1024))
        MINIMAL_PERCENT=$(awk "BEGIN {printf \"%.1f\", (${MINIMAL_DIFF#-}/$MINIMAL_BASELINE)*100}")
        echo -e "${GREEN}-${MINIMAL_DIFF_KB}KB (-${MINIMAL_PERCENT}%)${NC}"
    fi

    printf "  %-20s %10s → %10s " "Full Import" "${FULL_BASELINE_KB}KB" "${FULL_GZIP}KB"
    if [ "$FULL_DIFF" -eq 0 ]; then
        echo "(no change)"
    elif [ "$FULL_DIFF" -gt 0 ]; then
        FULL_DIFF_KB=$((FULL_DIFF / 1024))
        FULL_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($FULL_DIFF/$FULL_BASELINE)*100}")
        echo -e "${YELLOW}+${FULL_DIFF_KB}KB (+${FULL_PERCENT}%)${NC}"
    else
        FULL_DIFF_KB=$((${FULL_DIFF#-} / 1024))
        FULL_PERCENT=$(awk "BEGIN {printf \"%.1f\", (${FULL_DIFF#-}/$FULL_BASELINE)*100}")
        echo -e "${GREEN}-${FULL_DIFF_KB}KB (-${FULL_PERCENT}%)${NC}"
    fi
else
    print_warning "No baseline found. Run tests to establish baseline."
fi

# Check against targets
echo ""
echo "🎯 Target Compliance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Minimal import target: < 5KB
if [ "$MINIMAL_GZIP" -lt 5 ]; then
    print_status "Minimal Import: Excellent (< 5KB target)"
elif [ "$MINIMAL_GZIP" -lt 10 ]; then
    print_warning "Minimal Import: Good but could improve (< 10KB target)"
else
    print_error "Minimal Import: Exceeds target (> 10KB)"
fi

# Full import target: < 25KB
if [ "$FULL_GZIP" -lt 25 ]; then
    print_status "Full Import: Excellent (< 25KB target)"
elif [ "$FULL_GZIP" -lt 50 ]; then
    print_warning "Full Import: Acceptable (< 50KB target)"
else
    print_error "Full Import: Exceeds target (> 50KB)"
fi

# Tree-shaking effectiveness
echo ""
echo "🌲 Tree-shaking Effectiveness"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RATIO=$(awk "BEGIN {printf \"%.1f\", ($MINIMAL_GZIP/$FULL_GZIP)*100}")
echo "  Minimal is ${RATIO}% of Full Import"

# Convert to integer percentage for comparison (multiply by 10 to preserve 1 decimal)
RATIO_INT=$(awk "BEGIN {printf \"%.0f\", $RATIO * 10}")
if [ "$RATIO_INT" -lt 300 ]; then
    print_status "Excellent tree-shaking (< 30%)"
elif [ "$RATIO_INT" -lt 500 ]; then
    print_status "Good tree-shaking (< 50%)"
else
    print_warning "Tree-shaking could be improved (> 50%)"
    echo "  Suggestion: Review module boundaries and imports"
fi

# Historical tracking
HISTORY_FILE="scripts/.bundle-history.csv"
if [ ! -f "$HISTORY_FILE" ]; then
    echo "timestamp,minimal_kb,full_kb,git_commit" > "$HISTORY_FILE"
fi

# Add current data to history
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "$TIMESTAMP,$MINIMAL_GZIP,$FULL_GZIP,$GIT_COMMIT" >> "$HISTORY_FILE"

# Show recent history
echo ""
echo "📜 Recent History (Last 5 builds)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -n 6 "$HISTORY_FILE" | tail -n 5 | while IFS=',' read -r ts min full commit; do
    if [ "$ts" != "timestamp" ]; then
        printf "  %-19s  Min: %5sKB  Full: %5sKB  (%s)\n" "$ts" "$min" "$full" "$commit"
    fi
done

# Summary and recommendations
echo ""
echo "💡 Recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HAS_RECOMMENDATIONS=false

if [ "$MINIMAL_GZIP" -gt 10 ]; then
    echo "  • Minimal import exceeds 10KB - investigate large dependencies"
    HAS_RECOMMENDATIONS=true
fi

if [ "$FULL_GZIP" -gt 50 ]; then
    echo "  • Full import exceeds 50KB - consider code splitting"
    HAS_RECOMMENDATIONS=true
fi

if [ "$RATIO_INT" -gt 500 ]; then
    echo "  • Tree-shaking ratio high - review module exports and imports"
    HAS_RECOMMENDATIONS=true
fi

# Check for recent regressions
if [ -f "$MINIMAL_BASELINE_FILE" ] && [ "$MINIMAL_DIFF" -gt 5120 ]; then
    echo "  • Minimal import increased by > 5KB - review recent changes"
    HAS_RECOMMENDATIONS=true
fi

if [ -f "$FULL_BASELINE_FILE" ] && [ "$FULL_DIFF" -gt 10240 ]; then
    echo "  • Full import increased by > 10KB - review recent changes"
    HAS_RECOMMENDATIONS=true
fi

if [ "$HAS_RECOMMENDATIONS" = false ]; then
    print_status "No optimization recommendations - bundle sizes look good!"
fi

echo ""
print_status "Bundle size comparison complete!"
echo ""
echo "To update baselines:"
echo "  rm scripts/.bundle-baseline-*.txt"
echo "  yarn bundle:compare"
