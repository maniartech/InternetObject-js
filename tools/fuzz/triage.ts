import { Rng } from './rng';
import { genDocument, DEFAULT_OPTS, GenOptions, shrink } from './arbitrary';
import { checkValue, Failure } from './properties';

/**
 * Triage every fuzzer failure across many seeds in ONE pass, grouped by ROOT-CAUSE fingerprint.
 *
 *   npm run fuzz:triage
 *   npx tsx tools/fuzz/triage.ts --seeds 1,7,42 --runs 3000
 *
 * `run.ts` reports one counterexample per property+mode and stops there, which groups failures by
 * SYMPTOM: `shape-preserved` lumps a lost member name together with a mis-typed decimal, while the
 * same underlying cause shows up separately under `output-reparses`. Diagnosing from that list
 * means rediscovering the same cause several times — the slow loop this replaces.
 *
 * Here a failure is fingerprinted by what actually went wrong: the error CODE it produced, or the
 * kind of difference observed. Failures sharing a fingerprint almost always share a cause, so the
 * list below is a list of BUGS rather than a list of sightings — and each one arrives with a
 * minimized, runnable reproduction instead of a description.
 */

interface Args { seeds: number[]; runs: number; maxDepth: number; examples: number }

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  return {
    seeds: (get('--seeds') ?? '1,7,42,99,123,777,2024,31337').split(',').map(Number),
    runs: Number(get('--runs') ?? 3000),
    maxDepth: Number(get('--depth') ?? DEFAULT_OPTS.maxDepth),
    examples: Number(get('--examples') ?? 2),
  };
}

/**
 * Reduce a failure to what actually went wrong, discarding the specific values involved.
 *
 * The detail string carries identifiers, generated keys and whole documents; two sightings of one
 * bug never match on it. An error code, or the SHAPE of a difference, does match.
 */
function fingerprint(f: Failure): string {
  const d = f.detail;

  // Anything that names error codes is grouped by those codes alone.
  const codes = d.match(/errors \[([^\]]+)\]/);
  if (codes) return `${f.property}: errors(${codes[1]})`;

  const thrown = d.match(/THROW "([a-z-]+)"/) ?? d.match(/^"([a-z-]+)"/);
  if (thrown) return `${f.property}: throws(${thrown[1]})`;

  // A value difference is grouped by the KINDS on each side, not the values.
  const inOut = d.match(/in=(.*?) out=(.*)$/);
  if (inOut) {
    const kind = (s: string) => s.startsWith('"#dec') ? 'decimal' : s.startsWith('"#big') ? 'bigint'
      : s.startsWith('"#date') ? 'date' : s.startsWith('"#bin') ? 'binary'
      : s.startsWith('"') ? 'string' : s.startsWith('[') ? 'array' : s.startsWith('{') ? 'object'
      : /^-?\d/.test(s) ? 'number' : 'other';
    return `${f.property}: ${kind(inOut[1])} -> ${kind(inOut[2])}`;
  }

  // Idempotence and shape differences: group by the first structural token that differs.
  const head = d.replace(/\s+/g, ' ').slice(0, 40);
  return `${f.property}: ${head}`;
}

/** Shrink against the SAME fingerprint, so the reproduction still shows the bug it came from. */
function minimize(value: any, target: string, budget = 2000): any {
  const stillTarget = (v: any) => {
    try { return checkValue(v).some(f => fingerprint(f) === target); } catch { return false; }
  };
  let current = value;
  let steps = 0;
  for (let progress = true; progress && steps < budget;) {
    progress = false;
    for (const candidate of shrink(current)) {
      if (steps++ >= budget) break;
      if (stillTarget(candidate)) { current = candidate; progress = true; break; }
    }
  }
  return current;
}

/** A runnable JS literal — bigint, Decimal and byte arrays need constructing, not quoting. */
function literal(v: any): string {
  if (typeof v === 'bigint') return `${v}n`;
  if (v === null || v === undefined) return 'null';
  if (v instanceof Uint8Array) return `new Uint8Array([${Array.from(v).join(', ')}])`;
  if (v instanceof Date) return `new Date(${JSON.stringify(v.toISOString())})`;
  if (v?.constructor?.name === 'Decimal') return `new Decimal(${JSON.stringify(String(v))})`;
  if (Array.isArray(v)) return `[${v.map(literal).join(', ')}]`;
  if (typeof v === 'object') {
    return `{ ${Object.keys(v).map(k => `${JSON.stringify(k)}: ${literal(v[k])}`).join(', ')} }`;
  }
  if (typeof v === 'number' && !Number.isFinite(v)) return Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Infinity' : '-Infinity');
  return JSON.stringify(v);
}

interface Group { fingerprint: string; count: number; examples: any[]; details: string[] }

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const opts: GenOptions = { maxDepth: args.maxDepth, includeKnownFailures: false };
  const groups = new Map<string, Group>();
  let checked = 0;

  for (const seed of args.seeds) {
    const rng = new Rng(seed);
    for (let i = 0; i < args.runs; i++) {
      const value = genDocument(rng, opts);
      checked++;
      let found: Failure[];
      try { found = checkValue(value); } catch { continue; }
      if (found.length === 0) continue;

      // One failure per VALUE -- the first is the cause, the rest usually cascade from it.
      const f = found[0];
      const fp = fingerprint(f);
      let g = groups.get(fp);
      if (!g) { g = { fingerprint: fp, count: 0, examples: [], details: [] }; groups.set(fp, g); }
      g.count++;
      if (g.examples.length < args.examples) {
        g.examples.push(minimize(value, fp));
        g.details.push(f.detail.replace(/\s+/g, ' ').slice(0, 150));
      }
    }
  }

  const ordered = [...groups.values()].sort((a, b) => b.count - a.count);
  const total = ordered.reduce((n, g) => n + g.count, 0);

  console.log(`# Fuzzer triage\n`);
  console.log(`${checked} documents across ${args.seeds.length} seeds · ${total} failed ` +
    `(${((total / checked) * 100).toFixed(1)}%) · **${ordered.length} distinct causes**\n`);

  console.log('| # | Cause | Failures | Share |');
  console.log('| - | ----- | -------- | ----- |');
  ordered.forEach((g, i) => {
    console.log(`| ${i + 1} | \`${g.fingerprint}\` | ${g.count} | ${((g.count / total) * 100).toFixed(0)}% |`);
  });

  ordered.forEach((g, i) => {
    console.log(`\n---\n\n## ${i + 1}. ${g.fingerprint}   (${g.count} failures)\n`);
    console.log(`${g.details[0]}\n`);
    console.log('```ts');
    g.examples.forEach((ex, k) => console.log(`const case${i + 1}_${k + 1} = ${literal(ex)};`));
    console.log('```');
  });
}

main();
