import { readFileSync } from 'fs';
import parse from '../../src/parser/index';

/**
 * Corpus verifier — runs the language-independent conformance corpus (io-test-cases) against this
 * implementation. FINALIZATION-TRACKER 1P.6, first cut.
 *
 * Usage:
 *   npm run corpus -- ../io-test-cases/validation/*.io
 *   npx tsx tools/corpus/verify.ts <file.io> [...]
 *
 * Until this existed the corpus was not executed by anything: hundreds of cases asserting
 * behaviour that nothing checked. Its first run found a real drift — `parser/errors.io` still
 * expected `unexpected-token` for duplicate sections, which io-js2 0.3.0 renamed to
 * `duplicate-section-name` — and cleared a previously suspected one that turned out to be a
 * hand-checking mistake.
 *
 * Two case shapes are understood today:
 *   { name, input, expected?, error_codes? }           — `input` is a whole document
 *   { name, schema, input, expected?, error_codes? }   — composed as `~ $schema: { <schema> }` + input
 *
 * NOT yet handled, and silently skipped: `schemaDef` cases (schema/*.io), which assert a compiled
 * shape by SUBSET match, and the tokenizer suites, which assert token streams. Each needs its own
 * comparator.
 *
 * Values are compared against `toObject()`, which keeps them live, reduced to the corpus's neutral
 * spellings: a binary is a byte array, a decimal its digits, a bigint a tagged string (JSON cannot
 * hold one). A cross-language runner maps its own native types onto those same spellings.
 */

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: tsx tools/corpus/verify.ts <file.io> [...]');
  process.exit(2);
}

/** Reduce a value to the corpus's neutral spelling so two languages can be compared at all. */
function norm(v: any): any {
  if (typeof v === 'bigint') return `#big:${v}`;
  if (v === null || typeof v !== 'object') return v === undefined ? null : v;
  if (v instanceof Uint8Array) return [...v];               // binary → byte array
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(norm);
  // A Decimal must be caught BEFORE the generic object branch, or it flattens into its internals
  // ({ coefficient, exponent, … }). The corpus spells a decimal as its digits.
  if (v.constructor?.name === 'Decimal') return String(v);
  const out: Record<string, any> = {};
  for (const k of Object.keys(v)) out[k] = norm(v[k]);
  return out;
}

const show = (v: any) => JSON.stringify(norm(v));

let pass = 0;
let fail = 0;

for (const file of files) {
  const doc: any = parse(readFileSync(file, 'utf8'), null);

  const suiteErrors = doc.getErrors?.() ?? [];
  if (suiteErrors.length > 0) {
    console.log(`FAIL ${file} — the suite file itself does not parse: ` +
      suiteErrors.map((e: any) => e.errorCode).join(', '));
    fail++;
    continue;
  }

  const projected: any = doc.toObject();
  const rows: any[] = Array.isArray(projected) ? projected : (projected?.data ?? []);

  let suitePass = 0;
  let suiteFail = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.input === undefined) { skipped++; continue; }   // a shape this runner cannot judge yet

    // A validation case carries only a schema fragment and a data fragment; compose the document.
    const source: string = row.schema !== undefined
      ? `~ $schema: { ${row.schema} }\n---\n${row.input}\n`
      : row.input;

    let actual: any = null;
    let codes: string[] = [];
    try {
      const result: any = parse(source, null);
      codes = (result.getErrors?.() ?? []).map((e: any) => e.errorCode);
      // A case that expects errors asserts the CODES; its value is not meaningful.
      actual = codes.length > 0 ? null : result.toObject();
    } catch (e: any) {
      codes = [e?.errorCode ?? String(e?.message ?? e)];
    }

    const expectedCodes: string[] = row.error_codes ? [...row.error_codes] : [];
    const codesMatch = JSON.stringify(codes) === JSON.stringify(expectedCodes);
    const valueMatch = expectedCodes.length > 0 || show(actual) === show(row.expected);

    if (codesMatch && valueMatch) {
      pass++; suitePass++;
      continue;
    }

    fail++; suiteFail++;
    console.log(`FAIL ${file} :: ${row.name}`);
    if (!codesMatch) {
      console.log(`   codes  expected=${JSON.stringify(expectedCodes)}  actual=${JSON.stringify(codes)}`);
    }
    if (!valueMatch) {
      console.log(`   value  expected=${show(row.expected)}`);
      console.log(`          actual  =${show(actual)}`);
    }
  }

  const tag = suiteFail > 0 ? 'FAIL' : ' ok ';
  const note = skipped > 0 ? `, ${skipped} skipped (unsupported case shape)` : '';
  console.log(`${tag} ${file.padEnd(52)} ${suitePass} passed, ${suiteFail} failed${note}`);
}

console.log(`\n${files.length} suite(s): ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
