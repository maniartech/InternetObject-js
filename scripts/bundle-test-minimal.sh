#!/bin/bash

# Test minimal import tree-shaking
# Creates a temporary test that imports only IOObject and bundles it

set -e

echo "🌲 Tree-shaking Test: Minimal Import"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Ensure we're in project root
cd "$(dirname "$0")/.."

# Create temp directory
TEMP_DIR=".bundle-test"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

print_info "Creating minimal import test..."

# Create test file that imports only IOObject
cat > "$TEMP_DIR/minimal.js" << 'EOF'
import { IOObject } from '../dist/esm/index.js';

// Use it to ensure it's not tree-shaken
const obj = new IOObject();
obj.set('test', 'value');
console.log(obj.get('test'));
EOF

print_info "Bundling with esbuild..."

# Check if esbuild is available
if ! command -v npx &> /dev/null; then
    echo "npx not found. Installing esbuild temporarily..."
    npm install -g esbuild
fi

# Bundle with esbuild
npx esbuild "$TEMP_DIR/minimal.js" \
    --bundle \
    --format=esm \
    --minify \
    --outfile="$TEMP_DIR/minimal.bundle.js" \
    2>/dev/null

BUNDLE_SIZE=$(wc -c < "$TEMP_DIR/minimal.bundle.js")
BUNDLE_SIZE_KB=$((BUNDLE_SIZE / 1024))

# Gzip the bundle
gzip -c "$TEMP_DIR/minimal.bundle.js" > "$TEMP_DIR/minimal.bundle.js.gz" 2>/dev/null
GZIP_SIZE=$(wc -c < "$TEMP_DIR/minimal.bundle.js.gz")
GZIP_SIZE_KB=$((GZIP_SIZE / 1024))

print_info "Bundle created successfully!"
echo ""
echo "📊 Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Import: import { IOObject } from 'internet-object'"
echo "  Raw size:     ${BUNDLE_SIZE_KB}KB (${BUNDLE_SIZE} bytes)"
echo "  Gzipped size: ${GZIP_SIZE_KB}KB (${GZIP_SIZE} bytes)"
echo ""

# Evaluation
if [ "$GZIP_SIZE_KB" -lt 5 ]; then
    print_status "Excellent! Tree-shaking is working very well (< 5KB gzipped)"
elif [ "$GZIP_SIZE_KB" -lt 10 ]; then
    print_status "Good! Tree-shaking is working (< 10KB gzipped)"
elif [ "$GZIP_SIZE_KB" -lt 20 ]; then
    echo -e "${YELLOW}⚠${NC} Acceptable but could be better (< 20KB gzipped)"
else
    echo -e "${RED}✗${NC} Tree-shaking may not be working properly (> 20KB gzipped)"
    echo "  Expected: < 10KB for minimal IOObject import"
fi

# Save baseline if it doesn't exist
BASELINE_FILE="scripts/.bundle-baseline-minimal.txt"
if [ ! -f "$BASELINE_FILE" ]; then
    echo "$GZIP_SIZE" > "$BASELINE_FILE"
    print_info "Baseline saved: ${GZIP_SIZE_KB}KB"
else
    BASELINE=$(cat "$BASELINE_FILE")
    BASELINE_KB=$((BASELINE / 1024))
    DIFF=$((GZIP_SIZE - BASELINE))
    DIFF_KB=$((DIFF / 1024))

    echo "📈 Comparison with baseline:"
    echo "  Baseline: ${BASELINE_KB}KB"
    echo "  Current:  ${GZIP_SIZE_KB}KB"

    if [ "$DIFF" -eq 0 ]; then
        print_status "No change from baseline"
    elif [ "$DIFF" -gt 0 ]; then
        echo -e "${YELLOW}⚠${NC} Increased by ${DIFF_KB}KB (+$(awk "BEGIN {printf \"%.1f\", ($DIFF/$BASELINE)*100}")%)"
    else
        print_status "Decreased by ${DIFF_KB#-}KB (-$(awk "BEGIN {printf \"%.1f\", (${DIFF#-}/$BASELINE)*100}")%)"
    fi
fi

# Cleanup
print_info "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
print_status "Minimal import test complete!"
