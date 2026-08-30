#!/usr/bin/env node
/**
 * The completeness gate for the ADR 0005 API change.
 *
 * A checklist cannot prove *"nothing is left"*. This can: it scans every surface for the idioms the
 * new API retires, and exits non-zero while any remain. Run it alongside the suite, the corpus and
 * the examples harness.
 *
 *   node scripts/check-api-idioms.mjs        # or: npm run check:idioms
 *
 * ## What counts as a violation
 *
 * Only *ceremonial* uses. `toObject()` and `toJSON()` at a genuine boundary are the documented
 * conversions and stay — what goes is `parseDocument(text).toObject()`, which is `parse(text)`
 * spelled the long way, and the five-hop reads `doc.sections.get(0).data` replaced.
 *
 * ## The allowlist
 *
 * Per path and per idiom, never blanket, and every entry carries a reason. A file that must show
 * the old spelling — a migration guide's "before" column, a changelog describing what changed, a
 * test pinning the old behaviour — says so here rather than being quietly skipped.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The surfaces that must be clean, in the order the report prints them. */
const SURFACES = ['README.md', 'MIGRATION.md', 'examples', 'src', 'tests', 'tools', 'scripts'];

/**
 * Where a *style* rule applies.
 *
 * A deleted API — `ParserOptions`, the facade `strict`, `errorCollector` as an option — has to be
 * gone from every surface, tests included: it does not exist any more. An idiom preference is a
 * different kind of claim. It says *this is the spelling we recommend*, and that is a statement
 * about what we teach and what we ship, not about how a test reaches below the public API to check
 * the layer underneath. Tests are held honest by the suite; holding them to a recommendation as
 * well would only produce allowlist entries with nothing to say.
 */
const TEACHING = ['README.md', 'MIGRATION.md', 'examples', 'src'];

const RULES = [
  {
    id: 'projection-ceremony',
    // `parseDocument(...).toObject()` across a line break too -- the long way to say `parse(...)`.
    test: /\bparse(?:Document)?\s*\([^;]{0,400}?\)\s*\.\s*toObject\s*\(/g,
    says: 'parseDocument(text).toObject() is io.parse(text)',
    surfaces: TEACHING,
    // A file holding the CORE parser is below the public API by choice: `src/parser/index` returns
    // a plain Document, and projecting it there is the point rather than ceremony.
    skipWhen: (source) => /from ['"][^'"]*parser\/index['"]/.test(source),
  },
  {
    id: 'five-hop-read',
    test: /\.sections\s*\.\s*get\s*\(\s*\d+\s*\)\s*\.\s*data/g,
    says: 'doc.sections.get(0).data is doc.data, or doc.sections.<name>',
    surfaces: TEACHING,
  },
  {
    id: 'spread-to-array',
    test: /\[\s*\.\.\.[A-Za-z_$][\w$]*\s*\.\s*(?:map|filter|slice)\s*\(/g,
    says: 'IOCollection carries the array surface now -- the spread is not needed',
    // Only on the teaching surfaces. Inside the library the same shape is ordinary array work on
    // an ordinary array, and there is no collection anywhere near it.
    surfaces: TEACHING,
  },
  {
    id: 'parser-options',
    // Only where it is USED — constructed, annotated, imported, or written as an object key. Prose
    // that explains the deletion has to name the thing it deleted, and should.
    test: /\bnew\s+ParserOptions\b|import[^\n]*\bParserOptions\b|\b(?:trueTokens|falseTokens|normalizeNewline|allowEmptyRecords|numberOfSections|headerOnly|dataOnly)\s*:/g,
    says: 'ParserOptions and its ten fields were deleted (A3)',
  },
  {
    id: 'facade-strict',
    test: /\{[^{}\n]*\bstrict\s*:\s*(?:true|false)[^{}\n]*\}/g,
    says: 'the facade strict option was deleted -- passing a sink is the same question (A3)',
  },
  {
    id: 'error-collector-option',
    test: /\berrorCollector\s*:/g,
    says: 'the sink is the third positional argument, never an option (A3)',
  },
];

/**
 * Per-path, per-idiom exceptions. Each entry names the idiom it excuses and why — an entry without
 * a reason is not an allowlist, it is a blind spot.
 */
const ALLOW = [
  { path: 'CHANGELOG.md', rules: '*', why: 'describes what the old behaviour WAS' },
  { path: 'MIGRATION.md', rules: '*', why: 'its whole job is the before/after columns' },
  { path: 'src/facade/options.ts', rules: ['error-collector-option'], why: 'declares the deprecated load/stringify option it is documenting' },
  { path: 'src/facade/load-document.ts', rules: ['facade-strict'], why: 'LoadDocumentOptions.strict is a different option and genuinely works (ADR 0001 §7 stays deferred)' },
  { path: 'src/facade/parse.ts', rules: ['projection-ceremony'], why: 'this IS the implementation -- parse is parseDocument(...).toObject()' },
  { path: 'tests/facade/parse-entry-points.test.ts', rules: ['projection-ceremony'], why: 'pins that the two stay equal, which requires writing both' },
  { path: 'tests/core/proxied-document.test.ts', rules: ['projection-ceremony', 'five-hop-read'], why: 'compares the proxied read against the old one' },
  { path: 'tests/core/collection-array-surface.test.ts', rules: ['five-hop-read'], why: 'tests the collection directly, below the proxy' },
  { path: 'tests/core/accessor-symmetry.test.ts', rules: ['five-hop-read'], why: 'the accessors under test are the method layer itself' },
  { path: 'tests/streaming', rules: ['facade-strict'], why: "the streaming reader's strict framing is a different option and stays deferred (ADR 0001 §7)" },
  { path: 'scripts/check-api-idioms.mjs', rules: '*', why: 'the rules themselves' },
  { path: 'tools/behaviour', rules: ['projection-ceremony'], why: 'the snapshot replays the corpus below the public API on purpose' },
  { path: 'src/proxy/index.ts', rules: ['five-hop-read'], why: 'its header shows the read it replaces, before and after' },
  { path: 'examples/10-core-classes', rules: ['five-hop-read'], why: 'this example teaches the core CLASSES; the method layer is its subject' },
  { path: 'src/core/collection.ts', rules: ['spread-to-array'], why: 'quotes the idiom it retired, to say why the methods exist' },
  { path: 'src/core/internet-object.ts', rules: ['spread-to-array'], why: 'ordinary array work on an ordinary array, with no collection in sight' },
  { path: 'tests/facade/document.test.ts', rules: ['error-collector-option', 'facade-strict'], why: 'LoadDocumentOptions genuinely carries both and they work -- a different option from the facade one A3 deleted' },
  { path: 'tests/facade/load.test.ts', rules: ['facade-strict'], why: 'a comment recording the option that was removed and why the assertion never needed it' },
  // `errorCollector` is retired on the PARSE family only. `load()`, `loadInferred()` and
  // `stringify()` still declare it, because §2.5 -- the (data, defs?, sink?, options?) sweep across
  // the load/validate family -- has not landed. These come off the list when it does.
  { path: 'src/facade/load-document.ts', rules: ['error-collector-option'], why: 'load still takes it; §2.5 pending' },
  { path: 'src/facade/load-inferred.ts', rules: ['error-collector-option'], why: 'load still takes it; §2.5 pending' },
  { path: 'tests/facade/load.test.ts', rules: ['error-collector-option'], why: 'tests load, which still takes it; §2.5 pending' },
  { path: 'tools/corpus/verify-both.ts', rules: ['error-collector-option'], why: 'drives load, which still takes it; §2.5 pending' },
];

function allowed(rel, ruleId) {
  return ALLOW.some((entry) => {
    const p = entry.path.replace(/\\/g, '/');
    if (!(rel === p || rel.startsWith(p + '/'))) return false;
    return entry.rules === '*' || entry.rules.includes(ruleId);
  });
}

const EXTENSIONS = new Set(['.ts', '.tsx', '.mjs', '.js', '.md']);

function filesUnder(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (EXTENSIONS.has(path.extname(entry.name))) out.push(p);
    }
  };
  walk(full);
  return out;
}

/** `line:column` of an index, so a hit is clickable rather than merely counted. */
function locate(source, index) {
  const before = source.slice(0, index);
  const row = before.split('\n').length;
  return `${row}`;
}

let violations = 0;
const perSurface = new Map();

for (const surface of SURFACES) {
  const hits = [];
  for (const file of filesUnder(surface)) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    const source = fs.readFileSync(file, 'utf8');
    for (const rule of RULES) {
      if (allowed(rel, rule.id)) continue;
      if (rule.surfaces && !rule.surfaces.includes(surface)) continue;
      if (rule.skipWhen && rule.skipWhen(source)) continue;
      rule.test.lastIndex = 0;
      let match;
      while ((match = rule.test.exec(source)) !== null) {
        hits.push({ rel, line: locate(source, match.index), rule, text: match[0].replace(/\s+/g, ' ').slice(0, 70) });
      }
    }
  }
  perSurface.set(surface, hits.length);
  violations += hits.length;
  for (const hit of hits) {
    console.error(`  ${hit.rel}:${hit.line}  [${hit.rule.id}]  ${hit.text}\n      ${hit.rule.says}`);
  }
}

console.log('\nRetired idioms per surface:');
for (const [surface, count] of perSurface) {
  console.log(`  ${count === 0 ? '✓' : '✗'} ${surface.padEnd(12)} ${count}`);
}

if (violations > 0) {
  console.error(`\n✗ ${violations} retired idiom${violations === 1 ? '' : 's'} left.`);
  console.error('  Fix them, or add an allowlist entry that says why the old spelling has to stay.');
  process.exit(1);
}
console.log('\n✓ no retired idioms left');
