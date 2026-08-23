import { loadCases, runTokenCase, DEFAULT_CSV } from './bootstrap-runner';

/**
 * Run the bootstrap CSV corpus against this tokenizer, and print a report.
 *
 *   npm run corpus:bootstrap        regenerate ../io-test-cases/bootstrap/tokenizer.csv
 *   npm run corpus:tokens           run it against this tokenizer
 *
 * The comparator lives in `bootstrap-runner.ts`, shared with `tests/conformance/bootstrap.test.ts`
 * so `npm test` fails whenever this would.
 */

const file = process.argv[2] ?? DEFAULT_CSV;
const cases = loadCases(file);

let pass = 0;
let fail = 0;

for (const c of cases) {
  const problems = runTokenCase(c);
  if (problems.length === 0) { pass++; continue; }
  fail++;
  console.log(`FAIL ${c.suite}/${c.name}   input=${JSON.stringify(c.input)}`);
  for (const p of problems) console.log(`   ${p}`);
}

console.log(`\n${file}: ${pass} passed, ${fail} failed (${cases.length} cases)`);
process.exit(fail > 0 ? 1 : 0);
