# Bundle Size & Tree-Shaking

Internet Object is optimized for minimal bundle impact with excellent tree-shaking support.

## 📦 Bundle Sizes

| Import Style | Size (gzipped) | What's Included |
|--------------|----------------|-----------------|
| **Minimal** | 1KB | Only what you import (e.g., `IOObject` alone) |
| **Full** | 22KB | Entire library with all features |

### Tree-Shaking Effectiveness

**Ratio: 4.5%** (minimal/full) - Excellent! ✅

This means importing just `IOObject` pulls in only 4.5% of the full bundle size, proving that tree-shaking works exceptionally well.

## 🌲 How to Minimize Bundle Size

### Import Only What You Need

```typescript
// ✅ Minimal - imports only IOObject (~1KB)
import { IOObject } from 'internet-object';

const obj = new IOObject();
obj.set('name', 'Alice');

// ✅ Still minimal - add only what you use
import { IOObject, IOCollection } from 'internet-object';

// ❌ Larger - imports everything
import io from 'internet-object';
```

### Tree-Shaking Configuration

Internet Object is pre-configured for optimal tree-shaking:

```json
{
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

**Requirements for tree-shaking:**
- Use ES modules (ESM) - `import` not `require`
- Modern bundler (webpack 5+, rollup, esbuild, vite)
- Production build with minification enabled

## 📊 Bundle Analysis Scripts

Run these commands to analyze your bundle:

```bash
# Full bundle analysis with health score
yarn bundle:analyze

# Test minimal import size (tree-shaking verification)
yarn bundle:test-minimal

# Test full import size
yarn bundle:test-full

# Compare current build with baseline
yarn bundle:compare

# Check against size budgets (CI-ready)
yarn bundle:budget-check
```

## 🎯 Size Budgets

We enforce strict size budgets in CI/CD:

| Type | Target | Maximum | Status |
|------|--------|---------|--------|
| Minimal import | < 5KB | < 15KB | ✅ 1KB |
| Full import | < 25KB | < 50KB | ✅ 22KB |
| Tree-shaking ratio | < 30% | < 50% | ✅ 4.5% |

### CI Integration

Bundle size is automatically checked on every pull request:

- ✅ Enforces size budgets
- ✅ Detects regressions (>10% increase)
- ✅ Comments on PRs with size reports
- ✅ Tracks historical trends

## 🔍 What's in the Bundle?

Top modules by size (unminified):

1. **decimal.js** (32KB) - High-precision decimal math
2. **decimal-utils.js** (31KB) - Decimal utilities
3. **ast-parser.js** (22KB) - AST parsing logic
4. **compile-object.js** (15KB) - Object compilation

**Note:** These are unminified sizes. With minification + gzip, the actual impact is much smaller.

## 📈 Bundle Size History

We track bundle size changes over time to prevent regressions:

- Baseline sizes saved in `scripts/.bundle-baseline-*.txt`
- Historical data logged in `scripts/.bundle-history.csv`
- Automated comparison on every build

## 🛠️ For Contributors

When making changes:

1. **Run bundle tests locally:**
   ```bash
   yarn build
   yarn bundle:compare
   ```

2. **Check for size increases:**
   - Minimal import increased by >5KB? Investigate!
   - Full import increased by >10KB? Review carefully!

3. **CI will fail if:**
   - Minimal import exceeds 15KB
   - Full import exceeds 50KB
   - Size increase >10% without updating baseline

## 💡 Tips for Keeping Bundles Small

1. **Import selectively** - Only import what you need
2. **Avoid barrel exports** - Don't re-export everything
3. **Use named imports** - Better for tree-shaking than default imports
4. **Dynamic imports** - Use `import()` for optional features
5. **Check bundle impact** - Run `yarn bundle:analyze` before committing

## 🔗 Resources

- [Webpack Tree Shaking Guide](https://webpack.js.org/guides/tree-shaking/)
- [Rollup Tree Shaking](https://rollupjs.org/guide/en/#tree-shaking)
- [Module Federation Best Practices](https://module-federation.github.io/)

---

**Bundle Health Score: 100/100** 🎉

Our bundle optimization is production-ready with excellent tree-shaking, minimal overhead, and automated quality checks.
