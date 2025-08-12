// Schema System Test Suite Index
// This file organizes and exports all schema-related tests for easy discovery and execution

// Core Tests
export * from './core/schema.test';
export * from './core/typedef-registry.test';

// Utility Tests
export * from './utils/schema-utils.test';
export * from './utils/validation-utils.test';

// Validation Tests
export * from './validation/schema-validator.test';

// Integration Tests
export * from './integration/schema-system.test';

/**
 * Test Suite Organization:
 *
 * /tests/schema/
 * ├── core/                    - Core schema functionality tests
 * │   ├── schema.test.ts       - Schema class and builder pattern tests
 * │   └── typedef-registry.test.ts - Type definition registry tests
 * ├── utils/                   - Utility function tests
 * │   ├── schema-utils.test.ts - Schema utility functions tests
 * │   └── validation-utils.test.ts - Input validation utility tests
 * ├── validation/              - Validation system tests
 * │   └── schema-validator.test.ts - Schema validation tests
 * ├── processing/              - Processing system tests (future)
 * ├── integration/             - Full system integration tests
 * │   └── schema-system.test.ts - End-to-end schema system tests
 * └── index.ts                 - This file
 *
 * Test Coverage Goals:
 * - Unit tests for all core classes and functions
 * - Integration tests for complete workflows
 * - Performance tests for large-scale operations
 * - Error handling and edge case coverage
 * - Backward compatibility validation
 *
 * Running Tests:
 * - Individual: npx jest tests/schema/core/schema.test.ts
 * - Category: npx jest tests/schema/core/
 * - All schema: npx jest tests/schema/
 * - Performance: npx jest --testNamePattern="Performance"
 * - Integration: npx jest tests/schema/integration/
 */
