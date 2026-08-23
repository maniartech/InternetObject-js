import { runFile, ELSEWHERE, isSuiteFile } from './runner';

/**
 * Corpus verifier CLI — runs the language-independent conformance corpus (io-test-cases) against
 * this implementation and prints a report.
 *
 *   npm run corpus -- ../io-test-cases/validation/*.io
 *   npx tsx tools/corpus/verify.ts <file.io> [...]
 *
 * The comparators live in `runner.ts`, shared with `tests/conformance/corpus.test.ts` so that
 * `npm test` fails whenever this would. This file is only the report: use it to run a subset while
 * working, and trust the test suite to run all of it.
 */

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: tsx tools/corpus/verify.ts <file.io> [...]');
  process.exit(2);
}

let pass = 0;
let fail = 0;
let inert = 0;       // no `input`/`schemaDef` — the row asserts nothing runnable
let elsewhere = 0;   // executed by another runner, NOT unchecked
let unchecked = 0;   // no comparator at all

for (const file of files) {
  // A `find ... -name '*.io'` hands us the generated catalogue too; it holds counts, not cases.
  if (!isSuiteFile(file)) {
    console.log(`skip ${file.padEnd(52)}     the corpus catalogue, not a suite`);
    continue;
  }
  const result = await runFile(file);

  if (result.suiteError) {
    console.log(`FAIL ${file} — ${result.suiteError}`);
    fail++;
    continue;
  }

  if (result.coverage !== 'run') {
    const via = ELSEWHERE.get(result.kind);
    if (via) elsewhere += result.rowCount; else unchecked += result.rowCount;
    console.log(`skip ${file.padEnd(52)} ${String(result.rowCount).padStart(3)} cases — ` +
      (via ? `run by \`${via}\`` : `NO '${result.kind}' COMPARATOR — unchecked`));
    continue;
  }

  let suitePass = 0;
  let suiteFail = 0;
  for (const c of result.cases) {
    if (c.problems.length === 0) { pass++; suitePass++; continue; }
    fail++; suiteFail++;
    console.log(`FAIL ${file} :: ${c.name}`);
    for (const p of c.problems) console.log(`   ${p}`);
  }
  inert += result.inert;

  const tag = suiteFail > 0 ? 'FAIL' : ' ok ';
  const note = result.inert > 0 ? `, ${result.inert} inert` : '';
  console.log(`${tag} ${file.padEnd(52)} ${String(suitePass).padStart(3)} passed, ${suiteFail} failed${note}`);
}

// Report the reasons a case did not run APART. A case run by another runner is covered; a case
// with no comparator is not, and folding them together is how 85 unchecked cases sat behind a
// "63%" that read like ordinary partial coverage.
const total = pass + fail + inert + elsewhere + unchecked;
const covered = pass + fail + elsewhere;
const parts = [`${pass} passed`, `${fail} failed`];
if (elsewhere > 0) parts.push(`${elsewhere} run by another runner`);
if (inert > 0) parts.push(`${inert} inert`);
if (unchecked > 0) parts.push(`${unchecked} UNCHECKED`);
console.log(`\n${files.length} suite(s): ${parts.join(', ')} ` +
  `— ${covered} of ${total} cases covered (${Math.round((covered / total) * 100)}%)`);
process.exit(fail > 0 ? 1 : 0);
