#!/bin/bash

# Test full import bundling
# Creates a temporary test that imports everything via facade

set -e

echo "📦 Bundle Test: Full Import (Facade)"
echo "======================================"

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

print_info "Creating full import test..."

# Create test file that imports via facade
cat > "$TEMP_DIR/full.js" << 'EOF'
import io from '../dist/esm/index.js';

// Use multiple features
const doc = io.doc`name, age --- Alice, 30`;
const defs = io.defs`$schema: { name, age }`;

console.log(doc, defs);
EOF

print_info "Bundling with esbuild..."

# Bundle with esbuild
npx esbuild "$TEMP_DIR/full.js" \
    --bundle \
    --format=esm \
    --minify \
    --outfile="$TEMP_DIR/full.bundle.js" \
    2>/dev/null

BUNDLE_SIZE=$(wc -c < "$TEMP_DIR/full.bundle.js")
BUNDLE_SIZE_KB=$((BUNDLE_SIZE / 1024))

# Gzip the bundle
gzip -c "$TEMP_DIR/full.bundle.js" > "$TEMP_DIR/full.bundle.js.gz" 2>/dev/null
GZIP_SIZE=$(wc -c < "$TEMP_DIR/full.bundle.js.gz")
GZIP_SIZE_KB=$((GZIP_SIZE / 1024))

print_info "Bundle created successfully!"
echo ""
echo "📊 Results:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Import: import io from 'internet-object'"
echo "  Raw size:     ${BUNDLE_SIZE_KB}KB (${BUNDLE_SIZE} bytes)"
echo "  Gzipped size: ${GZIP_SIZE_KB}KB (${GZIP_SIZE} bytes)"
echo ""

# Evaluation
if [ "$GZIP_SIZE_KB" -lt 25 ]; then
    print_status "Excellent! Full bundle is compact (< 25KB gzipped)"
elif [ "$GZIP_SIZE_KB" -lt 50 ]; then
    print_status "Good! Full bundle size is reasonable (< 50KB gzipped)"
else
    echo -e "${YELLOW}⚠${NC} Bundle is large (> 50KB gzipped)"
    echo "  Consider optimization or code splitting"
fi

# Save baseline
BASELINE_FILE="scripts/.bundle-baseline-full.txt"
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
print_status "Full import test complete!"
