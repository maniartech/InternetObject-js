# Documentation

This directory contains comprehensive documentation for the Internet Object JavaScript/TypeScript library development and maintenance.

## 📚 Available Documentation

### Development
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Complete development guidelines, workflow, and best practices
- **[SECURITY.md](./SECURITY.md)** - Security policies, vulnerability reporting, and security best practices

### Schema and Language
- **[SCHEMA_DEFINITION_LANGUAGE.md](./SCHEMA_DEFINITION_LANGUAGE.md)** - Comprehensive guide to Internet Object's schema definition language
- **[SCHEMA_ARCHITECTURE.md](./SCHEMA_ARCHITECTURE.md)** - Schema architecture and data flow documentation

### Quick Links
- [Main README](../README.md) - Project overview and basic usage
- [Contributing Guidelines](../CONTRIBUTING.md) - How to contribute to the project
- [Code of Conduct](../CODE_OF_CONDUCT.md) - Community guidelines

## 🛠️ Development Quick Start

### Prerequisites
- Node.js 18+ or 20+ (recommended)
- Yarn package manager
- TypeScript knowledge

### Setup
```bash
# Run the development setup script
./scripts/dev-setup.sh

# Or manually:
yarn install
yarn build
yarn test
```

### Daily Workflow
```bash
yarn build:watch          # TypeScript compilation in watch mode
yarn test:watch           # Tests in watch mode
yarn precommit            # Pre-commit checks (lint + type-check + test)
```

## 🔒 Security

### Regular Security Maintenance
```bash
# Run comprehensive security audit
./scripts/security-audit.sh

# Or manually:
yarn security:audit       # Check vulnerabilities
yarn security:audit-fix   # Fix vulnerabilities
yarn deps:check          # Check outdated packages
```

### Automated Security
- **Dependabot**: Automated dependency updates (weekly)
- **GitHub Actions**: Security scanning on every PR/push
- **Vulnerability Monitoring**: GitHub security advisories

## 📁 Project Structure

```
io-js2/
├── docs/                  # Documentation (this folder)
│   ├── DEVELOPMENT.md     # Development guidelines
│   ├── SECURITY.md        # Security practices
│   └── README.md          # This file
├── scripts/               # Development scripts
│   ├── dev-setup.sh       # Environment setup
│   └── security-audit.sh  # Security maintenance
├── .github/               # GitHub configuration
│   ├── workflows/         # CI/CD pipelines
│   │   ├── ci.yml         # Continuous integration
│   │   └── security-audit.yml # Security scanning
│   └── dependabot.yml     # Dependency updates
├── src/                   # Source code
├── dist/                  # Compiled output
├── tests/                 # Test files
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Jest test configuration
└── yarn.lock              # Yarn lock file
```

## 🚀 Available Scripts

### Core Development
- `yarn build` - Compile TypeScript
- `yarn build:watch` - Compile in watch mode
- `yarn test` - Run tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage

### Quality Assurance
- `yarn lint` - Code linting (placeholder)
- `yarn type-check` - TypeScript type checking
- `yarn precommit` - Pre-commit checks

### Security & Maintenance
- `yarn security:audit` - Security vulnerability check
- `yarn security:audit-fix` - Fix security vulnerabilities
- `yarn security:check` - Check moderate+ vulnerabilities
- `yarn deps:check` - Check outdated dependencies
- `yarn deps:update` - Update dependencies

### Build & Release
- `yarn clean` - Clean build directory
- `yarn clean-build` - Clean and rebuild
- `yarn minify` - Create minified version

## 🔄 CI/CD Pipeline

### Continuous Integration (`ci.yml`)
- **Triggers**: Push to master/main/develop, Pull requests
- **Node Versions**: 18.x, 20.x, 22.x
- **Steps**: Install → Lint → Test → Build → Type Check

### Security Audit (`security-audit.yml`)
- **Triggers**: Weekly schedule, Push to master, Pull requests, Manual
- **Features**: Vulnerability scanning, Dependency review, PR comments
- **Artifacts**: Security audit results

### Dependabot (`dependabot.yml`)
- **Schedule**: Weekly updates (Mondays)
- **Scope**: npm/yarn dependencies + GitHub Actions
- **Grouping**: Production, development, and security updates
- **Auto-merge**: Compatible updates with passing tests

## 📋 Security Checklist

### Before Every Commit
- [ ] No hardcoded secrets
- [ ] Tests pass: `yarn test`
- [ ] Type check passes: `yarn type-check`
- [ ] Security audit clean: `yarn security:audit`

### Weekly Maintenance
- [ ] Review Dependabot PRs
- [ ] Run security audit: `./scripts/security-audit.sh`
- [ ] Check for outdated packages: `yarn deps:check`

### Before Release
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Security audit clean
- [ ] Build successful

## 🆘 Troubleshooting

### Build Issues
```bash
yarn clean-build          # Clean and rebuild
yarn type-check           # Check TypeScript errors
```

### Test Issues
```bash
yarn test --verbose       # Detailed test output
yarn test:coverage        # Check test coverage
```

### Security Issues
```bash
yarn security:audit       # Check vulnerabilities
yarn security:audit-fix   # Attempt automatic fix
yarn deps:check          # Check outdated packages
```

### Dependency Issues
```bash
rm -rf node_modules yarn.lock
yarn install              # Fresh install
```

## 📞 Getting Help

1. **Documentation**: Check this docs folder first
2. **GitHub Issues**: [Create an issue](https://github.com/maniartech/InternetObject-js/issues)
3. **Discussions**: [GitHub Discussions](https://github.com/maniartech/InternetObject-js/discussions)
4. **Security**: Email `security@maniartech.com` for security issues

## 🤝 Contributing

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed guidelines
2. Follow the security practices in [SECURITY.md](./SECURITY.md)
3. Use the development scripts for consistent workflow
4. Ensure all checks pass before submitting PRs

---

**Maintained by**: ManiarTech
**Last Updated**: December 2024
**Next Review**: March 2025
