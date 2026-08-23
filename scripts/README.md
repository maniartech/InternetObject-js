# `scripts/`

Build, verification, and release tooling. Every script here has been run and its documented
behaviour verified — if one stops working, that is a bug, not an expected quirk.

Each script carries a header comment saying what it does, how to run it, what it needs, and what
it exits with. This file is the map; the header is the detail.

## Quick reference

Every script here works. The **Kind** column says what a non-zero exit means, not whether the
script is healthy:

- **Gate** — returns non-zero when something is actually wrong. Safe to wire into CI.
- **Report** — prints numbers and always exits 0. Reading material, not a pass/fail signal.
- **Step** — a build stage; you rarely run it by hand.
- **Release** — publishes to npm. Irreversible.

| Script | npm script | Kind | What it is for |
| ------ | ---------- | ---- | -------------- |
| `pre-publish-check.sh` | `check-release` | Gate | **The release gate.** Runs every check below that matters, in order. |
| `verify-package.mjs` | `verify:package` | Gate | Packs the tarball, installs it into a scratch project, imports it for real. |
| `bundle-budget-check.sh` | `bundle:budget-check` | Gate | Bundle size against budget and the committed baselines. |
| `dev-setup.sh` | — | Gate | One-time setup for a fresh clone; fails if the toolchain is not usable. |
| `security-audit.sh` | `security:audit` | Gate | `npm audit` over devDependencies. |
| `bundle-test-minimal.sh` | `bundle:test-minimal` | Report | Size of a one-symbol import — the tree-shaking floor (~1.6 KB). |
| `bundle-test-full.sh` | `bundle:test-full` | Report | Size of importing everything — the ceiling (~39 KB). |
| `bundle-analyze.sh` | `bundle:analyze` | Report | Where the bytes are: per-module breakdown. |
| `bundle-compare.sh` | `bundle:compare` | Report | Appends to `.bundle-history.csv` so size drift stays visible. |
| `clean-dist.mjs` | `clean`, and inside `build` | Step | Removes `dist/` and `coverage/`, portably (no `rm -rf`). |
| `build-dts.mjs` | inside `build` | Step | Emits declarations, retrying a known flaky tsup crash on Windows. |
| `fix-esm-extensions.mjs` | inside `build` | Step | Adds explicit extensions to the specifiers in `dist/esm`. |
| `finalize-dist.mjs` | inside `build` | Step | Writes `dist/cjs/package.json` marking that tree CommonJS. |
| `publish-latest.sh` | — | Release | Publish to the `latest` dist-tag. **Irreversible.** |
| `publish-next.sh` | — | Release | Publish to the `next` preview dist-tag. **Irreversible.** |

## Publishing, start to finish

```bash
npm run check-release        # must pass — it runs build, tests, package verification, budget
# bump "version" in package.json, add a CHANGELOG entry, commit
npm whoami                   # must print your username, not a 401
bash scripts/publish-latest.sh
```

Use `publish-next.sh` instead when you want the release exercised before it becomes what
`npm install` hands people.

Both are irreversible: npm will not let you re-publish a version number, and unpublishing is
restricted. `check-release` publishes nothing — it is safe to run any time.

## Two things worth understanding before you change anything here

### 1. Never validate a package with a bundler

`verify-package.mjs` exists because of a real defect that shipped.

Until 2026-08-23 the published package **could not be imported at all**. The ESM build left 447
extensionless relative specifiers (`from "./core/document"`), which Node's ESM resolver rejects.
It shipped in 0.2.1 and nobody noticed for seven months — because the only check that touched
`dist/` ran `esbuild --bundle` over it, and esbuild's *bundler* resolves extensionless imports
happily. The build was being validated by a resolver that papers over the exact bug, while every
test imported from `src/` and never touched the artefact at all.

So: `verify-package.mjs` packs a real tarball, installs it into a scratch project outside this
repo, and imports it with **Node** — as ESM, as CommonJS, and type-checked under both
`moduleResolution: node16` and `bundler`. If you add an output format or change `exports`, add a
check here too. A bundler's opinion of `dist/` is not evidence that it works.

### 2. The two builds are shaped differently, on purpose

`tsup.config.ts` emits two trees, and the asymmetry is deliberate:

- **`dist/esm/`** — one file per source module. That granularity is what lets a consumer's bundler
  drop unused code: a minimal `import { IOObject }` tree-shakes to **~1.6 KB gzip** against
  ~39 KB for the whole library. This is why `bundle: false` is not negotiable for ESM, and why the
  bundle-test scripts read `dist/esm/` specifically.
- **`dist/cjs/`** — a single bundled file, plus a `package.json` marking the directory
  `commonjs`. Unbundled CJS cannot express a cross-file default import: esbuild emits
  `__toESM(require('./x.js'), 1)`, which in node mode sets `default` to the whole module object and
  shadows the real default export, so `class X extends Y.default` dies with *"Class extends value
  #<Object> is not a constructor"*. Bundling removes every cross-file boundary, so the problem
  cannot arise. Nothing is lost: tree-shaking is an ESM property, and a `require()` consumer
  receives the whole library either way.

The nested `dist/cjs/package.json` matters more than it looks. The package root is
`"type": "module"`, so without that marker every `.js` file under `dist/cjs/` would be ESM, and
`require()` of an ESM file throws `ERR_REQUIRE_ESM` on Node 18 and 20 — the versions `engines`
promises to support. It happens to work on Node 22.12+ and 24, which support `require(ESM)`, so
this class of bug is invisible on a modern machine and broken for half your users.
`verify-package.mjs` asserts the marker explicitly for that reason.

### 3. The declaration pass is retried, and why

`tsup --dts-only` intermittently dies on Windows inside its declaration worker — a native abort
with no diagnostic (exit 127 / `0xC0000374` heap corruption under node and npm; exit 116 under
bun). Measured over six consecutive runs: the JS pass succeeded 6/6, the declaration pass 5/6.
It is that pass alone, and it is independent of which runner you use.

`build-dts.mjs` retries it up to three times. That is safe because the failure is all-or-nothing:
it either crashes emitting nothing, or completes emitting correct output — there is no partial
state to inherit. Over eight consecutive builds, all eight produced 113 declaration files and two
needed a retry to get there.

It is a workaround. The durable fix is to emit declarations with `tsc --emitDeclarationOnly`,
which has no worker to crash. That is a build-layout change; if the retries ever start being
needed routinely, make it.

## Updating a bundle baseline

`.bundle-baseline-minimal.txt` and `.bundle-baseline-full.txt` hold gzipped **byte** counts and are
committed, so a size regression fails `bundle-budget-check.sh` rather than passing unnoticed.

Raising them is a deliberate act, not a way to silence the script. Growth is legitimate when the
library genuinely gained code; if you cannot say what the extra bytes bought, do not raise the
baseline. Re-measure with the two bundle-test scripts, write the byte counts in, and record the
reason in the commit message.

## Adding a script

1. Start with a header comment: purpose, how to run it, what it requires, what it exits with.
2. Add a row to the table above.
3. Wire it to an npm script if it is something anyone will run twice.
4. Run it. A script nobody has executed is a liability, not tooling.
