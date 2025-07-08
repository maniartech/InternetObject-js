#!/bin/bash

# Development setup script for Internet Object project
# This script sets up the development environment

set -e

echo "🚀 Internet Object Development Setup"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check Node.js version
print_info "Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"

    # Check if version is 18 or higher
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        print_warning "Node.js 18+ is recommended. Current version: $NODE_VERSION"
    fi
else
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Yarn installation
print_info "Checking Yarn installation..."
if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn --version)
    print_status "Yarn version: $YARN_VERSION"
else
    print_error "Yarn is not installed. Please install Yarn first:"
    echo "  npm install -g yarn"
    exit 1
fi

# Install dependencies
echo ""
print_info "Installing dependencies..."
if yarn install; then
    print_status "Dependencies installed successfully!"
else
    print_error "Failed to install dependencies."
    exit 1
fi

# Run security audit
echo ""
print_info "Running security audit..."
if yarn security:audit; then
    print_status "No security vulnerabilities found!"
else
    print_warning "Security vulnerabilities detected. Running fix..."
    if yarn security:audit-fix; then
        print_status "Security vulnerabilities fixed!"
    else
        print_error "Some vulnerabilities require manual attention."
    fi
fi

# Build the project
echo ""
print_info "Building the project..."
if yarn build; then
    print_status "Project built successfully!"
else
    print_error "Build failed. Please check for errors."
    exit 1
fi

# Run tests
echo ""
print_info "Running tests..."
if yarn test; then
    print_status "All tests passed!"
else
    print_error "Some tests failed. Please check for errors."
    exit 1
fi

# Setup git hooks (if .git exists)
if [ -d ".git" ]; then
    echo ""
    print_info "Setting up git hooks..."

    # Create pre-commit hook
    mkdir -p .git/hooks
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run linting, type check, and tests
yarn precommit

if [ $? -ne 0 ]; then
    echo "Pre-commit checks failed. Commit aborted."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF

    chmod +x .git/hooks/pre-commit
    print_status "Git pre-commit hook installed!"
else
    print_warning "Not in a git repository. Skipping git hooks setup."
fi

echo ""
echo "🎉 Development environment setup completed!"
echo ""
echo "Next steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Development Commands:"
echo "  yarn build:watch     # Start TypeScript compilation in watch mode"
echo "  yarn test:watch      # Start tests in watch mode"
echo "  yarn type-check      # Run TypeScript type checking"
echo ""
echo "🔒 Security Commands:"
echo "  yarn security:audit  # Check for vulnerabilities"
echo "  yarn deps:check      # Check for outdated packages"
echo ""
echo "🚀 Ready Commands:"
echo "  yarn precommit       # Run all pre-commit checks"
echo "  yarn clean-build     # Clean and rebuild"
echo ""
echo "📚 Documentation:"
echo "  docs/DEVELOPMENT.md  # Development guidelines"
echo "  docs/SECURITY.md     # Security practices"
echo ""
print_status "Happy coding! 🎯"
