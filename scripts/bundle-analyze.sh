#!/bin/bash

# Bundle Analysis Script for Internet Object
# Analyzes bundle sizes, tree-shaking, and provides optimization insights

set -e

echo "📦 Internet Object Bundle Analysis"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_section() { echo -e "\n${CYAN}▶${NC} $1\n${CYAN}$(echo "$1" | sed 's/./-/g')${NC}"; }

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Check if build exists
if [ ! -d "dist" ]; then
    print_warning "Build directory not found. Building project..."
    yarn build
fi

print_section "1. Bundle Size Analysis"

# Function to get file size
get_size() {
    if [ -f "$1" ]; then
        # Use stat for cross-platform compatibility
        if [[ "$OSTYPE" == "darwin"* ]]; then
            stat -f%z "$1" 2>/dev/null || echo "0"
        else
            stat -c%s "$1" 2>/dev/null || echo "0"
        fi
    else
        echo "0"
    fi
}

# Function to format bytes
format_bytes() {
    local bytes=$1
    if [ "$bytes" -lt 1024 ]; then
        echo "${bytes}B"
    elif [ "$bytes" -lt 1048576 ]; then
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1024}")KB"
    else
        echo "$(awk "BEGIN {printf \"%.2f\", $bytes/1048576}")MB"
    fi
}

# Function to get gzipped size
get_gzipped_size() {
    if [ -f "$1" ]; then
        gzip -c "$1" 2>/dev/null | wc -c
    else
        echo "0"
    fi
}

# Analyze ESM build
echo "📊 ESM Build Analysis:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ESM_INDEX="dist/index.js"
if [ -f "$ESM_INDEX" ]; then
    ESM_SIZE=$(get_size "$ESM_INDEX")
    ESM_GZIP=$(get_gzipped_size "$ESM_INDEX")

    echo "  File: $ESM_INDEX"
    echo "  Raw:     $(format_bytes $ESM_SIZE)"
    echo "  Gzipped: $(format_bytes $ESM_GZIP)"

    # Check against thresholds - for full library bundle, 30-50KB gzipped is good
    ESM_GZIP_KB=$((ESM_GZIP / 1024))
    if [ "$ESM_GZIP_KB" -lt 25 ]; then
        print_status "Size is excellent (< 25KB gzipped)"
    elif [ "$ESM_GZIP_KB" -lt 35 ]; then
        print_status "Size is good for a parser library (< 35KB gzipped)"
    elif [ "$ESM_GZIP_KB" -lt 50 ]; then
        print_warning "Size is acceptable but could be optimized (< 50KB gzipped)"
    else
        print_warning "Size is large (> 50KB gzipped)"
    fi
else
    print_error "ESM build not found!"
fi

echo ""

# Analyze CJS build
echo "📦 CJS Build Analysis:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CJS_INDEX="dist/index.cjs"
if [ -f "$CJS_INDEX" ]; then
    CJS_SIZE=$(get_size "$CJS_INDEX")
    CJS_GZIP=$(get_gzipped_size "$CJS_INDEX")

    echo "  File: $CJS_INDEX"
    echo "  Raw:     $(format_bytes $CJS_SIZE)"
    echo "  Gzipped: $(format_bytes $CJS_GZIP)"
else
    print_error "CJS build not found!"
fi

print_section "2. Module Count & Structure"

# With tsup, we have single bundle files instead of multiple modules
echo "  Bundle Format: Single file bundles (esbuild via tsup)"
echo "  ESM: dist/index.js"
echo "  CJS: dist/index.cjs"
echo "  DTS: dist/index.d.ts, dist/index.d.cts"

print_section "3. Dependency Analysis"

# Check for sideEffects
SIDE_EFFECTS=$(grep -o '"sideEffects"[[:space:]]*:[[:space:]]*[a-z]*' package.json || echo "not found")
echo "  sideEffects: $SIDE_EFFECTS"

if [[ "$SIDE_EFFECTS" == *"false"* ]]; then
    print_status "sideEffects: false is set (tree-shaking enabled)"
else
    print_warning "sideEffects is not set to false - tree-shaking may not work optimally"
fi

# Check exports configuration
echo ""
echo "  Package exports:"
if grep -q '"exports"' package.json; then
    print_status "exports field is configured"
    grep -A 10 '"exports"' package.json | grep -E '(import|require|types)' | sed 's/^/    /'
else
    print_warning "exports field is not configured"
fi

print_section "4. Type Definitions Analysis"

DTS_COUNT=$(find dist -name "*.d.ts" -o -name "*.d.cts" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "  Total .d.ts files: $DTS_COUNT"

DTS_SIZE=$(find dist \( -name "*.d.ts" -o -name "*.d.cts" \) -type f -exec du -b {} + 2>/dev/null | awk '{sum+=$1} END {print sum}')
echo "  Total type definitions size: $(format_bytes ${DTS_SIZE:-0})"

print_section "5. Tree-shaking Recommendations"

echo "To verify tree-shaking effectiveness:"
echo ""
echo "1. Test minimal import:"
echo "   ${CYAN}import { IOObject } from 'internet-object'${NC}"
echo "   Expected bundle size: < 5KB gzipped"
echo ""
echo "2. Test full import:"
echo "   ${CYAN}import io from 'internet-object'${NC}"
echo "   Should equal minimal import (facade pattern)"
echo ""
echo "3. Create test with bundler (see scripts/bundle-test-*.sh)"

print_section "6. Optimization Suggestions"

# Check for potential optimizations
SUGGESTIONS=0

# Check if minification is enabled in tsup.config.ts
if [ -f "tsup.config.ts" ] && ! grep -q 'minify:\s*true' tsup.config.ts; then
    echo "  • Enable minification in tsup.config.ts (minify: true)"
    SUGGESTIONS=$((SUGGESTIONS + 1))
fi

# Check for brotli compression
if ! command -v brotli &> /dev/null; then
    echo "  • Install brotli for better compression analysis"
    SUGGESTIONS=$((SUGGESTIONS + 1))
fi

if [ "$SUGGESTIONS" -eq 0 ]; then
    print_status "No immediate optimization suggestions"
else
    print_info "Found $SUGGESTIONS optimization opportunities"
fi

print_section "Summary"

echo "📊 Bundle Health Score:"
echo ""

SCORE=100

# Size scoring - for a full parser library, 30-50KB gzipped is reasonable
ESM_GZIP_KB=$((ESM_GZIP / 1024))
if [ "$ESM_GZIP_KB" -gt 50 ]; then
    SCORE=$((SCORE - 20))
    echo "  [-20] Bundle size > 50KB gzipped"
elif [ "$ESM_GZIP_KB" -gt 35 ]; then
    SCORE=$((SCORE - 10))
    echo "  [-10] Bundle size > 35KB gzipped"
fi

# sideEffects scoring
if [[ "$SIDE_EFFECTS" != *"false"* ]]; then
    SCORE=$((SCORE - 15))
    echo "  [-15] sideEffects not set to false"
fi

# exports scoring
if ! grep -q '"exports"' package.json; then
    SCORE=$((SCORE - 10))
    echo "  [-10] exports field not configured"
fi

echo ""
if [ "$SCORE" -ge 90 ]; then
    print_status "Excellent! Score: $SCORE/100"
elif [ "$SCORE" -ge 70 ]; then
    print_warning "Good but needs improvement. Score: $SCORE/100"
else
    print_error "Needs optimization work. Score: $SCORE/100"
fi

echo ""
print_info "Bundle analysis complete!"
echo ""
echo "Next steps:"
echo "  yarn bundle:test-minimal    # Test minimal import size"
echo "  yarn bundle:test-full       # Test full import size"
echo "  yarn bundle:compare         # Compare with baselines"
