import { defineConfig } from 'tsup';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts', '!src/test-parser-crash.ts', '!src/examples/**/*'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  bundle: false,
  sourcemap: true,
  splitting: false,
  // NOTE: tsup/esbuild already performs tree-shaking.
  // We avoid the optional Rollup-based extra treeshaking here to keep builds warning-free.
  minify: false, // Don't minify individual files for library
  target: 'es2022',
  outDir: 'dist',
  // Generate separate folders for ESM and CJS
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
  esbuildOptions(options) {
    options.legalComments = 'none'; // Remove license comments (we have LICENSE file)
    options.drop = isProd ? ['console', 'debugger'] : []; // Drop console in prod
    options.pure = ['console.log', 'console.debug']; // Mark as side-effect free
  },
  onSuccess: async () => {
    console.log('✅ Build complete!');
  },
});
