import { defineConfig, type Options } from 'tsup';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Shared build settings.
 *
 * `bundle: false` is load-bearing, not a default. It keeps one output file per source module, and
 * that granularity is what lets a consumer's bundler drop what it does not import: a minimal
 * `import { IOObject }` tree-shakes to ~1.6 KB gzip, where a single bundled file leaves ~30 KB.
 */
const common: Options = {
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  bundle: false,
  dts: true,
  sourcemap: true,
  splitting: false,
  // NOTE: tsup/esbuild already performs tree-shaking.
  // We avoid the optional Rollup-based extra treeshaking here to keep builds warning-free.
  minify: false, // Don't minify individual files for library
  target: 'es2022',
  esbuildOptions(options) {
    options.legalComments = 'none'; // Remove license comments (we have LICENSE file)
    options.drop = isProd ? ['console', 'debugger'] : []; // Drop console in prod
    options.pure = ['console.log', 'console.debug']; // Mark as side-effect free
  },
};

/**
 * ESM and CJS go to SEPARATE directories, each keeping the `.js` extension.
 *
 * Why not one directory with `.js` + `.cjs`: with `bundle: false`, esbuild rewrites the output
 * FILE extension but never the extensions inside import specifiers. Source that says
 * `from './core/document.js'` therefore emits `require("./core/document.js")` into the CJS output
 * — pointing at a file that is `.cjs` on disk. Node then resolves `./core/document.js` instead,
 * which is ESM under the root `"type": "module"`, and `require()` of an ESM file throws
 * ERR_REQUIRE_ESM on Node 18 and 20. (It happens to work on Node 22.12+/24, which support
 * require(ESM) — so the bug is invisible on a modern machine and breaks the versions `engines`
 * promises to support.)
 *
 * Splitting the directories removes the problem instead of patching it. `dist/cjs/` gets its own
 * `package.json` marking it CommonJS (written by scripts/finalize-dist.mjs), so the `.js` files in
 * there ARE CommonJS. One specifier form in the source serves both outputs, and no post-build
 * rewriting is needed.
 */
export default defineConfig([
  {
    ...common,
    format: ['esm'],
    outDir: 'dist/esm',
    clean: true,
    // Declarations are rolled up from the PUBLIC entry only, not from all 112 modules. `exports`
    // exposes just ".", so that entry is the only thing a consumer can import types from -- and
    // rolling up 112 entry points made the dts pass crash intermittently on Windows (silent
    // exit 127, no declarations emitted).
    dts: { entry: 'src/index.ts' },
  },
  {
    ...common,
    format: ['cjs'],
    outDir: 'dist/cjs',
    clean: true,
    // Declarations are rolled up from the PUBLIC entry only, not from all 112 modules. `exports`
    // exposes just ".", so that entry is the only thing a consumer can import types from -- and
    // rolling up 112 entry points made the dts pass crash intermittently on Windows (silent
    // exit 127, no declarations emitted).
    dts: { entry: 'src/index.ts' },
    // CJS is BUNDLED, unlike ESM above. Unbundled CJS cannot express a cross-file default import:
    // esbuild emits `__toESM(require('./x.js'), 1)`, and in node mode that sets `default` to the
    // whole module object, shadowing the real default export -- so `class X extends Y.default`
    // fails with "Class extends value #<Object> is not a constructor". Bundling removes every
    // cross-file boundary, so the problem cannot arise.
    //
    // Nothing is lost by it: tree-shaking is an ESM property, and the ESM build above stays
    // per-module. A `require()` consumer gets the whole library either way.
    bundle: true,
    entry: ['src/index.ts'],
    // Keep `.js` here: dist/cjs/package.json declares the whole directory CommonJS.
    outExtension: () => ({ js: '.js' }),
  },
]);
