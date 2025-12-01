# Contributing to Internet Object

Thank you for your interest in contributing to Internet Object! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](./code-of-conduct.md).

## How to Contribute

### Reporting Bugs

Before submitting a bug report:

1. Check the [existing issues](https://github.com/maniartech/InternetObject-js/issues) to avoid duplicates
2. Use the latest version to see if the issue has been fixed
3. Provide a clear, descriptive title
4. Include steps to reproduce the issue
5. Add code samples or test cases if possible

### Suggesting Features

We welcome feature suggestions! Please:

1. Check existing issues and discussions first
2. Clearly describe the use case and benefit
3. Provide examples of how the feature would work

### Pull Requests

1. **Fork** the repository and create your branch from `main`
2. **Install** dependencies with `yarn install`
3. **Make** your changes with clear, descriptive commits
4. **Add tests** for any new functionality
5. **Run tests** with `yarn test` to ensure everything passes
6. **Update documentation** if needed
7. **Submit** your pull request with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/maniartech/InternetObject-js.git
cd InternetObject-js

# Install dependencies
yarn install

# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Build the project
yarn build

# Type checking
yarn type-check
```

## Coding Standards

- **TypeScript**: All code must be written in TypeScript
- **Formatting**: Follow the `.editorconfig` settings (2 spaces, UTF-8, LF line endings)
- **Testing**: Write tests for new features and bug fixes
- **Documentation**: Document public APIs with JSDoc comments

## Project Structure

```
src/           # Source code
tests/         # Test files
docs/          # Documentation
dist/          # Built output (generated)
```

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add new validation method`
- `fix: resolve parsing issue with nested objects`
- `docs: update API documentation`
- `test: add tests for edge cases`
- `refactor: simplify schema compilation`

## Questions?

Feel free to open an issue for any questions or reach out to the maintainers.

## License

By contributing, you agree that your contributions will be licensed under the [ISC License](./LICENSE).