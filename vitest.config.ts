import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // TypeScript config for tests
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },

    // Test file patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts', 'src/**/*.test.ts'],

    // Global test APIs (describe, it, expect) - no imports needed
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Timeout for individual tests
    testTimeout: 10000,

    // Watch mode settings
    watch: false,

    // Reporter
    reporters: ['verbose'],

    // TypeScript support via esbuild (fast!)
    typecheck: {
      enabled: false, // Use separate type-check command
    },
  },
});
