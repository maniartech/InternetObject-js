# Development Guidelines

## Table of Contents
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Security](#security)
- [Deployment](#deployment)

## Getting Started

### Prerequisites
- Node.js 18+ or 20+ (recommended)
- Yarn package manager
- TypeScript knowledge

### Setup
```bash
# Clone the repository
git clone https://github.com/maniartech/InternetObject-js.git
cd InternetObject-js

# Install dependencies
yarn install

# Build the project
yarn build

# Run tests
yarn test
```

## Development Workflow

### Daily Development
```bash
# Start development mode
yarn build:watch          # Watch mode for TypeScript compilation

# Run tests in watch mode
yarn test:watch           # Jest in watch mode

# Type checking
yarn type-check           # TypeScript type checking without emit
```

### Before Committing
```bash
# Run the pre-commit checklist
yarn precommit           # Runs lint + type-check + test

# Or run individually:
yarn lint                # Code linting
yarn type-check          # TypeScript compilation check
yarn test                # Run all tests
yarn test:coverage       # Run tests with coverage report
```

## Code Standards

### TypeScript
- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public APIs
- Follow naming conventions:
  - PascalCase for classes, interfaces, types
  - camelCase for variables, functions, methods
  - UPPER_SNAKE_CASE for constants

### File Structure
```
src/
├── index.ts              # Main entry point
├── types/                # Type definitions
├── utils/                # Utility functions
├── core/                 # Core functionality
└── __tests__/            # Test files (co-located)
```

### Documentation
- Use JSDoc comments for public APIs
- Include examples in documentation
- Keep README.md up to date

## Testing

### Test Strategy
- Unit tests for all public APIs
- Integration tests for complex workflows
- 80%+ code coverage target

### Running Tests
```bash
yarn test                 # Run all tests
yarn test:watch          # Watch mode
yarn test:coverage       # With coverage report
yarn test --verbose      # Detailed output
```

### Writing Tests
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases and error conditions
- Mock external dependencies

## Security

### Dependency Management
```bash
# Check for vulnerabilities
yarn security:audit      # Same as 'yarn audit'
yarn security:check      # Check moderate+ vulnerabilities

# Fix vulnerabilities
yarn security:audit-fix  # Same as 'yarn audit fix'

# Check outdated packages
yarn deps:check          # Same as 'yarn outdated'
yarn deps:update         # Same as 'yarn upgrade'
```

### Security Best Practices
1. **Regular Updates**: Run security audits weekly
2. **Dependency Review**: Review all new dependencies
3. **Version Pinning**: Use exact versions for critical dependencies
4. **Minimal Dependencies**: Only add necessary packages
5. **Security Scanning**: Automated via GitHub Actions

### GitHub Security Features
- **Dependabot**: Automated dependency updates
- **Security Advisories**: GitHub vulnerability database
- **Dependency Review**: PR-based security checks
- **Code Scanning**: Static analysis (when configured)

## Deployment

### Build Process
```bash
yarn clean               # Clean dist directory
yarn build               # TypeScript compilation
yarn minify              # Create minified version
```

### Release Checklist
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite: `yarn test`
4. Build and verify: `yarn clean-build`
5. Create git tag: `git tag v1.0.0`
6. Push changes: `git push origin master --tags`
7. Publish to npm: `yarn publish`

### CI/CD Pipeline
- **Continuous Integration**: Runs on every PR and push
- **Security Scanning**: Weekly automated scans
- **Dependency Updates**: Automatic PR creation via Dependabot
- **Multi-Node Testing**: Tests against Node.js 18.x, 20.x, 22.x

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clean and rebuild
yarn clean-build

# Check TypeScript errors
yarn type-check
```

**Test Failures**
```bash
# Run tests with verbose output
yarn test --verbose

# Run specific test file
yarn test src/specific-test.test.ts
```

**Security Vulnerabilities**
```bash
# Check what's vulnerable
yarn audit

# Try automatic fix
yarn audit fix

# Manual investigation
yarn audit --level moderate
```

### Getting Help
1. Check existing [GitHub Issues](https://github.com/maniartech/InternetObject-js/issues)
2. Review [documentation](../README.md)
3. Ask questions in [Discussions](https://github.com/maniartech/InternetObject-js/discussions)
