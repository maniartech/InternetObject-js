#!/bin/bash

# Pre-publish Validation Script
# Runs all checks required before publishing the package

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
yarn clean
print_status "Cleaned"

# 2. Type Checking
print_header "2. Internal Quality Checks"
print_info "Running Type Check..."
yarn type-check
print_status "Type Check Passed"

# 3. Build
print_header "3. Building Project"
print_info "Building production bundles..."
yarn build
print_status "Build Successful"

# 4. Unit Tests
print_header "4. Testing Source"
print_info "Running Unit Tests via Vitest..."
yarn test
print_status "Unit Tests Passed"

# 5. Bundle Validation
print_header "5. Validating Build Artifacts"

print_info "Running Minimal Bundle Test..."
yarn bundle:test-minimal
print_status "Minimal Bundle Valid"

print_info "Running Full Bundle Test..."
yarn bundle:test-full
print_status "Full Bundle Valid"

# 6. Budget Check
print_header "6. Performance Budget"
print_info "Checking Bundle Size..."
yarn bundle:budget-check
print_status "Budget Check Passed"

# Final Success
echo ""
echo -e "${GREEN}✨ All checks passed! The package is ready for publishing.${NC}"
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Update version in package.json (if not done)"
echo "  2. Run 'npm publish' or 'yarn publish'"
echo ""
