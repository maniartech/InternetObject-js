import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false, // Keep readable for debugging; use minify: true for production
  target: 'es2022',
  outDir: 'dist',
  // Generate separate folders for ESM and CJS
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js',
    };
  },
  esbuildOptions(options) {
    options.banner = {
      js: '// Internet Object - https://internetobject.org',
    };
  },
  // Add package.json exports automatically
  onSuccess: async () => {
    console.log('✅ Build complete!');
  },
});
