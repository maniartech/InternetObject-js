#!/bin/bash
#
# The release gate — run this before publishing anything.
#
# Runs, in order and stopping at the first failure:
#
#   1. environment      node/npm versions
#   2. quality          type-check, lint
#   3. build            a clean build from scratch
#   4. test             the full suite (which includes the conformance corpus)
#   5. artifacts        `verify-package.mjs` — packs the tarball, installs it into a scratch
#                       project, and imports it as ESM, CJS and TypeScript
#   6. budget           bundle size against the committed baselines
#
# Step 5 is the important one and is newer than the rest. Until 2026-08-23 the artifact check only
# ran `esbuild --bundle` over dist/, and esbuild's bundler resolves extensionless imports that Node
# rejects — so a package that could not be imported at all passed this gate and shipped as 0.2.1.
# Never validate a package with a bundler.
#
#   npm run check-release           # or: bash scripts/pre-publish-check.sh
#
# Exit: 0 ready to publish, non-zero otherwise. This script publishes NOTHING.

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_header() {
    echo ""
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}======================================${NC}"
}

# Ensure we're in project root
cd "$(dirname "$0")/.."

echo "🚀 Starting Pre-publish Checks..."

# 1. Clean and Setup
print_header "1. Environment Setup"
print_info "Cleaning previous builds..."
npm run clean
print_status "Cleaned"

# 2. Type Checking
print_header "2. Internal Quality Checks"
print_info "Running Type Check..."
npm run type-check
print_status "Type Check Passed"

# 3. Build
print_header "3. Building Project"
print_info "Building production bundles..."
npm run build
print_status "Build Successful"

# 4. Unit Tests
print_header "4. Testing Source"
print_info "Running Unit Tests via Vitest..."
npm run test
print_status "Unit Tests Passed"

# 5. Bundle Validation
print_header "5. Validating Build Artifacts"

print_info "Verifying the PACKAGE (pack, install elsewhere, import with Node)..."
npm run verify:package
print_status "Package Installs and Imports"

print_info "Running Minimal Bundle Test..."
npm run bundle:test-minimal
print_status "Minimal Bundle Valid"

print_info "Running Full Bundle Test..."
npm run bundle:test-full
print_status "Full Bundle Valid"

# 6. Budget Check
print_header "6. Performance Budget"
print_info "Checking Bundle Size..."
npm run bundle:budget-check
print_status "Budget Check Passed"

# Final Success
echo ""
echo -e "${GREEN}✨ All checks passed! The package is ready for publishing.${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Update version in package.json (if not done)"
echo "  2. Publish: bash scripts/publish-latest.sh   (or publish-next.sh for a preview)"
echo ""
