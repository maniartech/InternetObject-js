import { Rng } from './rng';
import { genDocument, shrink, DEFAULT_OPTS, GenOptions, KNOWN_LIMITATIONS } from './arbitrary';
import { checkValue, Failure } from './properties';

/**
 * Round-trip property fuzzer (FINALIZATION-TRACKER 1.1).
 *
 * Usage:
 *   npm run fuzz                      -- 10,000 cases, random seed
 *   npm run fuzz -- --runs 1000000    -- a long soak
 *   npm run fuzz -- --seed 12345      -- replay an exact run
 *   npm run fuzz -- --known           -- include inputs with known-open defects
 *
 * Exits non-zero on the first distinct failure so it can gate CI. Every failure prints the seed
 * and case index that produced it, plus a SHRUNK counterexample -- a minimized value is one you
 * can paste into a test; a raw one is noise.
 */

interface Args {
  runs: number;
  seed: number;
  known: boolean;
  maxDepth: number;
  quiet: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    runs: Number(get('--runs') ?? 10000),
    // A random default seed keeps successive runs exploring new ground; it is always echoed so any
    // failure remains reproducible.
    seed: Number(get('--seed') ?? Math.floor(Math.random() * 2 ** 31)),
    known: argv.includes('--known'),
    maxDepth: Number(get('--depth') ?? DEFAULT_OPTS.maxDepth),
    quiet: argv.includes('--quiet'),
  };
}

/**
 * Repeatedly replace the value with the simplest simplification that still fails THE SAME WAY.
 *
 * Matching on the specific property+mode matters: shrinking against "fails at all" collapses every
 * counterexample onto whatever the most degenerate failing input happens to be (here `{}`), hiding
 * every other bug behind one. The shrunk value must still demonstrate the ORIGINAL defect.
 */
function minimize(value: any, targetKey: string, budget = 3000): any {
  const stillTarget = (v: any): boolean => {
    try {
      return checkValue(v).some(f => `${f.property}|${f.mode}` === targetKey);
    } catch {
      return targetKey === 'harness-crash|-';
    }
  };

  let current = value;
  let steps = 0;
  let progress = true;

  while (progress && steps < budget) {
    progress = false;
    for (const candidate of shrink(current)) {
      if (steps++ >= budget) break;
      if (stillTarget(candidate)) {
        current = candidate;
        progress = true;
        break;               // restart from the simpler value
      }
    }
  }
  return current;
}


function describe(v: any): string {
  return JSON.stringify(v, (_k, x) => {
    if (typeof x === 'bigint') return `«${x}n»`;
    if (x instanceof Uint8Array) return `«bytes:${Array.from(x).join(',')}»`;
    return x;
  }, 2) ?? String(v);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const opts: GenOptions = { maxDepth: args.maxDepth, includeKnownFailures: args.known };
  const rng = new Rng(args.seed);

  if (!args.quiet) {
    console.log(`fuzz: ${args.runs} cases · seed ${args.seed} · depth ${args.maxDepth}` +
      (args.known ? ' · including known-failing inputs' : ''));
    if (!args.known) {
      console.log('excluded (known, tracked):');
      for (const k of KNOWN_LIMITATIONS) console.log(`  - ${k}`);
    }
  }

  const started = Date.now();
  const seen = new Set<string>();
  let failed = 0;

  for (let i = 0; i < args.runs; i++) {
    const value = genDocument(rng, opts);

    let found: Failure[];
    try {
      found = checkValue(value);
    } catch (e: any) {
      found = [{ property: 'harness-crash', mode: '-', detail: String(e?.message ?? e) }];
    }
    if (found.length === 0) continue;

    // Report each distinct property/mode pair once -- a systemic bug otherwise floods the output.
    const key = `${found[0].property}|${found[0].mode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    failed++;

    const minimal = minimize(value, key);
    const minimalFailures = checkValue(minimal).filter(f => `${f.property}|${f.mode}` === key);
    const report = minimalFailures.length > 0 ? minimalFailures : found.filter(f => `${f.property}|${f.mode}` === key);

    console.error(`\n─── FAIL ${key}  (seed ${args.seed}, case ${i})`);
    for (const f of report) console.error(`  ${f.property} [${f.mode}]: ${f.detail}`);
    console.error(`  minimized input:\n${describe(minimal).split('\n').map(l => '    ' + l).join('\n')}`);
    console.error(`  replay: npm run fuzz -- --seed ${args.seed} --runs ${i + 1}`);
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (failed > 0) {
    console.error(`\nfuzz: ${failed} distinct failure(s) in ${args.runs} cases (${secs}s)`);
    process.exit(1);
  }
  if (!args.quiet) console.log(`fuzz: ${args.runs} cases clean in ${secs}s`);
}

main();
