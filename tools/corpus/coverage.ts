import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { requireCorpusPath, specsDir } from './sibling-repos'
import { join, relative } from 'path';
import { isSuiteFile } from './runner';

/**
 * The COVERAGE MATRIX — which specification page is pinned by which corpus cases, and which is
 * pinned by none. FINALIZATION-TRACKER item 3.9.
 *
 *   npx tsx tools/corpus/coverage.ts        (CLI)
 *   buildCoverage()                         (module, used by tests/conformance/coverage.test.ts)
 *
 * Writes `io-test-cases/COVERAGE.md`. Exported as a function as well as a CLI so the test can
 * call it directly — spawning `npx` from a test is platform-dependent and slow, and a second
 * copy of the rules would be one more thing to keep in step.
 *
 * A corpus can be large and still leave a rule untested, and there is no way to notice from inside
 * it: every case passes, the count goes up, and the gap is invisible until a port implements that
 * rule differently and nothing complains. This maps the other way round — from the SPEC to the
 * cases — so an uncovered page shows up as an empty row.
 *
 * THE MAPPING IS CURATED, and deliberately so. Nothing in a corpus file says which spec page it
 * pins, and inferring it from filenames would produce a matrix that looks authoritative and is
 * wrong. So the map below is written by hand and the tool only keeps it HONEST: it fails if a
 * mapping names a corpus category that does not exist, or if a spec page is neither mapped nor
 * explicitly classified as narrative. Adding a page to the spec therefore breaks this until
 * somebody says what covers it.
 */

const SPECS = specsDir() ?? '';
const CORPUS = requireCorpusPath();

/**
 * Pages that state no testable rule: introductions, rationale, process, and reference material
 * that repeats rules stated normatively elsewhere. Listing them explicitly is the point — it is
 * the difference between "no cases needed" and "nobody has looked".
 */
const NARRATIVE = new Set<string>([
  'README.md', 'SUMMARY.md', 'best-practices.md', 'contributors.md', 'conventions.md',
  'faqs-1.md', 'json-compatibility.md', 'license.md', 'roadmap.md',
  'appendices/glossary.md',
  'core-concepts/document-oriented.md', 'core-concepts/schema-first.md',
  'internet-object/abstract.md', 'internet-object/getting-started.md',
  'internet-object/introduction.md', 'internet-object/manifesto.md',
  'internet-object/objectives.md', 'internet-object/the-zen-of-internet-object.md',
  'internet-object/why-internet-object.md',
  'interoperability/conversions.md',
  'tools/README.md',
  'versioning/README.md', 'versioning/feature-status.md', 'versioning/version-history.md',
  'conformance/requirements.md',
  'schema-definition-language/data-types/README.md',
  'schema-definition-language/data-types/number/README.md',
  'schema-definition-language/data-types/string/README.md',
  'the-structure/introduction/README.md',
  'the-structure/structural-elements/README.md',
  'the-structure/values/README.md',
  'the-structure/values/number/README.md',
  'the-structure/values/string/README.md',
  'serialization/README.md',
  'streaming/README.md',
  'parsing-and-errors/README.md',
]);

/**
 * spec page -> the corpus categories that pin its rules, as `suite/category`.
 *
 * A category may appear against several pages: `tokenizer/numbers-rules` pins the two numeric
 * rules, and those rules are stated on more than one page.
 */
const COVERS: Record<string, string[]> = {
  // ---- the structure -------------------------------------------------------------------------
  'the-structure/case-sensitivity.md': ['tokenizer/booleans', 'tokenizer/nulls', 'validation/booleans'],
  'the-structure/comments.md': ['tokenizer/comments', 'tokenizer/structure-tokens', 'document/structure'],
  'the-structure/encoding.md': ['tokenizer/strings-escapes', 'serializer/scalars', 'streaming/wire-format', 'validation/strings-depth'],
  'the-structure/syntax-errors.md': ['parser/errors', 'parser/errors-extended', 'tokenizer/errors'],
  'the-structure/introduction/data.md': ['document/structure', 'parser/objects', 'parser/collections', 'parser/sections'],
  'the-structure/introduction/header.md': ['document/structure', 'document/definitions', 'parser/header'],
  'the-structure/structural-elements/literals.md': ['tokenizer/booleans', 'tokenizer/nulls', 'parser/values'],
  'the-structure/structural-elements/other-special-characters.md': ['document/definitions', 'schema/memberdef'],
  'the-structure/structural-elements/structural-characters-n-keywords.md': ['tokenizer/structure-tokens', 'tokenizer/punctuation', 'tokenizer/braces', 'tokenizer/operators', 'tokenizer/sections'],
  'the-structure/structural-elements/whitespaces.md': ['tokenizer/whitespace', 'tokenizer/structure-tokens', 'document/structure'],

  // ---- values --------------------------------------------------------------------------------
  'the-structure/values/array.md': ['parser/arrays', 'validation/arrays', 'serializer/containers'],
  'the-structure/values/binary.md': ['tokenizer/strings-binary', 'parser/values', 'serializer/scalars', 'validation/binary'],
  'the-structure/values/booleans.md': ['tokenizer/booleans', 'parser/values', 'validation/booleans'],
  'the-structure/values/date-and-time.md': ['tokenizer/datetime', 'parser/values', 'validation/datetime', 'validation/temporal-depth'],
  'the-structure/values/null.md': ['tokenizer/nulls', 'parser/values', 'validation/any-null'],
  'the-structure/values/object.md': ['parser/objects', 'validation/objects', 'document/projection'],
  'the-structure/values/number/number.md': ['tokenizer/numbers', 'tokenizer/numbers-rules', 'parser/values', 'validation/numbers', 'validation/integer-bounds', 'validation/numeric-depth'],
  'the-structure/values/number/bigint.md': ['tokenizer/bigints', 'validation/bigints', 'parser/values'],
  'the-structure/values/number/decimal.md': ['tokenizer/decimals', 'validation/decimals', 'parser/values', 'validation/numeric-depth'],
  'the-structure/values/number/nan-and-infinity.md': ['tokenizer/numbers', 'parser/values', 'serializer/scalars'],
  'the-structure/values/number/special-formats.md': ['tokenizer/numbers-rules', 'parser/values'],
  'the-structure/values/string/open-strings.md': ['tokenizer/strings-open', 'tokenizer/strings-forms'],
  'the-structure/values/string/raw-strings.md': ['tokenizer/strings-raw', 'tokenizer/strings-forms'],
  'the-structure/values/string/regular-strings.md': ['tokenizer/strings-regular', 'tokenizer/strings-escapes', 'tokenizer/strings-forms'],

  // ---- collections and sections ----------------------------------------------------------------
  'the-collections/collection.md': ['parser/collections', 'document/structure', 'validation/collections'],
  'the-collections/collection-rules.md': ['parser/collections', 'validation/accumulation-depth', 'validation/collections'],
  'the-collections/creating-collection.md': ['parser/collections', 'serializer/documents'],
  'the-collections/data-streaming.md': ['streaming/framing', 'streaming/framing-depth', 'streaming/wire-format'],

  // ---- definitions ------------------------------------------------------------------------------
  'the-definitions/definitions.md': ['document/definitions', 'parser/header'],
  'the-definitions/variables.md': ['document/definitions'],
  'the-definitions/schema-references.md': ['document/definitions', 'schema/nested', 'streaming/schema-precedence'],
  'the-definitions/error-handling.md': ['parser/errors-extended', 'document/definitions'],

  // ---- schema definition language ---------------------------------------------------------------
  'schema-definition-language/internet-object-schema.md': ['schema/primitives', 'schema/nested'],
  'schema-definition-language/memberdef.md': ['schema/memberdef', 'schema/constraints', 'validation/choices', 'validation/defaults'],
  'schema-definition-language/typedef.md': ['schema/primitives', 'schema/sized-types'],
  'schema-definition-language/schema-representation.md': ['schema/primitives', 'schema/nested'],
  'schema-definition-language/composition.md': ['schema/nested', 'schema/arrays'],
  'schema-definition-language/dynamic-schema.md': ['document/sections', 'streaming/schema-state-depth'],
  'schema-definition-language/union-types.md': ['validation/unions'],
  'schema-definition-language/data-types/any.md': ['validation/any-null', 'schema/sized-types'],
  'schema-definition-language/data-types/array.md': ['schema/arrays', 'validation/arrays-depth'],
  'schema-definition-language/data-types/binary.md': ['tokenizer/strings-binary', 'validation/binary'],
  'schema-definition-language/data-types/bool.md': ['validation/booleans', 'schema/primitives'],
  'schema-definition-language/data-types/date-and-time.md': ['validation/datetime', 'schema/sized-types', 'validation/temporal-depth'],
  'schema-definition-language/data-types/object.md': ['validation/objects-and-paths', 'schema/nested'],
  'schema-definition-language/data-types/number/bigint.md': ['validation/bigints', 'schema/sized-types'],
  'schema-definition-language/data-types/number/decimal.md': ['validation/decimals', 'schema/constraints'],
  'schema-definition-language/data-types/string/README.md': ['validation/strings', 'validation/strings-constraints', 'validation/strings-depth'],
  'schema-definition-language/data-types/string/string-derived-types/email.md': ['validation/sub-formats'],
  'schema-definition-language/data-types/string/string-derived-types/url.md': ['validation/sub-formats'],

  // ---- parsing and errors -----------------------------------------------------------------------
  'parsing-and-errors/error-model.md': ['parser/errors', 'parser/errors-extended', 'schema/errors-extended'],
  'parsing-and-errors/error-codes.md': ['parser/errors-extended', 'schema/errors', 'schema/errors-extended', 'validation/type-names'],
  'parsing-and-errors/error-accumulation.md': ['validation/accumulation', 'validation/accumulation-depth', 'document/recovery'],
  'parsing-and-errors/parser-behavior.md': ['parser/errors', 'parser/errors-extended', 'document/recovery'],

  // ---- serialization ------------------------------------------------------------------------------
  'serialization/document-output.md': ['serializer/documents', 'serializer/headers'],
  'serialization/key-emission.md': ['serializer/quoting'],
  'serialization/round-trip.md': ['serializer/scalars', 'serializer/containers', 'serializer/documents'],
  'serialization/value-formatting.md': ['serializer/quoting', 'serializer/scalars'],

  // ---- streaming ------------------------------------------------------------------------------------
  'streaming/wire-format.md': ['streaming/framing', 'streaming/framing-depth', 'streaming/wire-format'],
  'streaming/stream-items.md': ['streaming/framing-depth', 'streaming/errors-depth'],
  'streaming/error-model.md': ['streaming/errors', 'streaming/errors-depth'],
  'streaming/schema-and-state.md': ['streaming/schema-state', 'streaming/schema-state-depth', 'streaming/schema-precedence'],
  'streaming/readers-and-writers.md': ['streaming/framing-depth', 'streaming/wire-format'],

  // ---- conformance and grammar ----------------------------------------------------------------------
  'conformance/validation-model.md': ['validation/optionality', 'validation/objects-and-paths'],
  'appendices/grammar.md': ['tokenizer/structure-tokens', 'parser/values', 'parser/keys'],
};

// ---------------------------------------------------------------------------------------------

export interface CoverageResult {
  /** Reasons the map is out of date. Empty when it is sound. */
  problems: string[];
  /** The rendered COVERAGE.md, or '' when `problems` is non-empty. */
  markdown: string;
  covered: number;
  uncovered: string[];
  narrative: number;
  /** Corpus categories mapped to no spec page (regression suites excluded by design). */
  unmapped: { category: string; cases: number }[];
}

function walk(dir: string, pred: (name: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, pred));
    else if (pred(name)) out.push(full);
  }
  return out;
}

/** Every corpus category that exists, as `suite/category`, with its case count. */
const categories = new Map<string, number>();
for (const full of walk(CORPUS, isSuiteFile)) {
  const rel = relative(CORPUS, full).replace(/\\/g, '/');
  const key = rel.replace(/\.io$/, '');
  const text = readFileSync(full, 'utf8');
  const body = text.split(/\n---\n/).slice(1).join('\n---\n');
  const rows = body.split(/\n(?=~\s*[A-Za-z_])/).filter(r => /^~\s*[A-Za-z_]/.test(r));
  categories.set(key, rows.length);
}

const specPages = walk(SPECS, n => n.endsWith('.md'))
  .map(f => relative(SPECS, f).replace(/\\/g, '/'))
  .filter(p => !p.startsWith('.claude/'));

// ---- Keep the map honest ----------------------------------------------------------------------

/** Build the matrix. Returns the problems rather than exiting, so a test can assert on them. */
export function buildCoverage(): CoverageResult {
  const problems: string[] = [];

  for (const [page, cats] of Object.entries(COVERS)) {
  if (!specPages.includes(page)) problems.push(`COVERS names a page that does not exist: ${page}`);
  for (const c of cats) {
    if (!categories.has(c)) problems.push(`${page}: no such corpus category '${c}'`);
  }
}
  for (const page of specPages) {
  if (!NARRATIVE.has(page) && !(page in COVERS)) {
    problems.push(`UNCLASSIFIED spec page: ${page} — add it to COVERS or to NARRATIVE`);
  }
}

  if (problems.length) {
    return { problems, markdown: '', covered: 0, uncovered: [], narrative: NARRATIVE.size, unmapped: [] };
  }

  // ---- Report ------------------------------------------------------------------------------------
  const normative = specPages.filter(p => !NARRATIVE.has(p));
  const uncovered = normative.filter(p => (COVERS[p] ?? []).length === 0);
  const covered = normative.filter(p => (COVERS[p] ?? []).length > 0);

  const casesFor = (page: string) =>
  (COVERS[page] ?? []).reduce((n, c) => n + (categories.get(c) ?? 0), 0);

  // Which categories are mapped to nothing — cases that pin no stated rule.
  //
  // `regression/` is excluded by design: those suites guard a FIXED DEFECT, named for the issue
  // rather than for a rule, and the rule they protect is already covered by whichever suite owns it.
  // Requiring them to map to a spec page would either force a false mapping or leave a permanent
  // entry in a list whose whole value is that it is normally empty.
  const mapped = new Set(Object.values(COVERS).flat());
  const unmapped = [...categories.keys()]
  .filter(c => !mapped.has(c) && !c.startsWith('regression/'))
  .sort();

  const md: string[] = [];
  md.push('# Coverage matrix — specification to corpus');
  md.push('');
  md.push('**Generated** by `io-js2 tools/corpus/coverage.ts` — do not edit by hand.');
  md.push('');
  md.push('A corpus can be large and still leave a rule untested, and there is no way to notice from');
  md.push('inside it: every case passes, the count goes up, and the gap stays invisible until a port');
  md.push('implements that rule differently and nothing complains. This maps the other way round —');
  md.push('from the **specification** to the cases — so an uncovered page shows up as an empty row.');
  md.push('');
  md.push('The mapping is **curated**. Nothing in a corpus file says which spec page it pins, and');
  md.push('inferring it from filenames would produce a matrix that looks authoritative and is wrong.');
  md.push('The tool only keeps the map honest: it fails if a mapping names a category that does not');
  md.push('exist, or if a spec page is neither mapped nor classified as narrative. Adding a page to');
  md.push('the spec therefore breaks this until somebody says what covers it.');
  md.push('');
  md.push(`## Summary`);
  md.push('');
  md.push('| | Pages |');
  md.push('| - | ----: |');
  md.push(`| Normative pages **with** corpus coverage | **${covered.length}** |`);
  md.push(`| Normative pages with **no** coverage | **${uncovered.length}** |`);
  md.push(`| Narrative / non-normative (no cases needed) | ${NARRATIVE.size} |`);
  md.push(`| **Total spec pages** | **${specPages.length}** |`);
  md.push('');

  if (uncovered.length) {
  md.push('## Gaps — normative pages with no cases');
  md.push('');
  md.push('These state rules that nothing in the corpus pins. Each is a place a port can differ');
  md.push('silently.');
  md.push('');
  for (const p of uncovered) md.push(`- \`${p}\``);
  md.push('');
}

  if (unmapped.length) {
  md.push('## Corpus categories not mapped to any page');
  md.push('');
  md.push('Cases that pin behaviour no spec page claims. Usually that means the behaviour is real');
  md.push('but undocumented — worth a spec paragraph, not a deletion.');
  md.push('');
  for (const c of unmapped) md.push(`- \`${c}\` (${categories.get(c)} cases)`);
  md.push('');
}

  md.push('## Matrix');
  md.push('');
  md.push('| Spec page | Cases | Corpus categories |');
  md.push('| --------- | ----: | ----------------- |');
  for (const p of normative) {
  const cats = COVERS[p] ?? [];
  const cell = cats.length ? cats.map(c => `\`${c}\``).join(', ') : '**— none —**';
  md.push(`| \`${p}\` | ${casesFor(p) || ''} | ${cell} |`);
}
  md.push('');

  return {
    problems,
    markdown: md.join('\n') + '\n',
    covered: covered.length,
    uncovered,
    narrative: NARRATIVE.size,
    unmapped: unmapped.map(c => ({ category: c, cases: categories.get(c) ?? 0 })),
  };
}

/** Write the matrix to disk. Returns the same result the caller can report on. */
export function writeCoverage(): CoverageResult {
  const result = buildCoverage();
  if (result.problems.length === 0) {
    writeFileSync(join(CORPUS, 'COVERAGE.md'), result.markdown, 'utf8');
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

const result = writeCoverage();

if (result.problems.length) {
  console.error('The coverage map is out of date:\n');
  for (const p of result.problems) console.error(`  ${p}`);
  console.error('\nA new spec page must be classified before this can report anything true.');
  process.exit(1);
}

console.log(`COVERAGE.md  ${result.covered} covered, ${result.uncovered.length} gaps, ${result.narrative} narrative`);
if (result.uncovered.length) {
  console.log('\nGaps:');
  for (const p of result.uncovered) console.log(`  ${p}`);
}
if (result.unmapped.length) {
  console.log(`\n${result.unmapped.length} corpus categories map to no spec page:`);
  for (const u of result.unmapped) console.log(`  ${u.category} (${u.cases} cases)`);
}
