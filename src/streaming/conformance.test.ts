/**
 * Streaming conformance harness.
 *
 * Runs the language-neutral fixtures in specs/conformance/cases against the JS
 * streaming reader, across multiple chunkings, and checks emitted items + fatal
 * outcome vs. the fixture's `expected`. See specs/conformance/README.md.
 *
 * This is the executable form of the protocol. It is GATED behind RUN_CONFORMANCE
 * so the default suite stays green while the runtime is still being brought up to
 * the frozen contract (see IMPLEMENTATION-GAPS.md). Run on demand:
 *
 *   RUN_CONFORMANCE=1 npx vitest run src/streaming/conformance.test.ts
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStreamReader } from './index';
import parse from '../parser/index';

const here = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(here, 'specs', 'conformance', 'cases');

type Strategy = string | { offsets: number[] };

function buildDefs(defText: string | null): any {
  if (!defText) return null;
  const doc: any = parse(defText.trimEnd() + '\n---\n');
  return doc.header?.definitions ?? null;
}

function* chunksFor(strategy: Strategy, input: string): Generator<string | Uint8Array> {
  if (strategy === 'whole') { if (input) yield input; return; }
  if (strategy === 'per-line') {
    for (const part of input.split(/(?<=\n)/)) if (part) yield part;
    return;
  }
  if (strategy === 'per-byte') {
    for (const b of new TextEncoder().encode(input)) yield new Uint8Array([b]);
    return;
  }
  if (typeof strategy === 'object' && Array.isArray(strategy.offsets)) {
    let prev = 0;
    for (const off of strategy.offsets) { yield input.slice(prev, off); prev = off; }
    yield input.slice(prev);
    return;
  }
  throw new Error(`unknown chunking strategy: ${JSON.stringify(strategy)}`);
}

async function* asyncChunks(strategy: Strategy, input: string) {
  for (const c of chunksFor(strategy, input)) yield c;
}

function category(e: any): string {
  const n = String(e?.name ?? e?.constructor?.name ?? '');
  if (n.includes('SyntaxError')) return 'syntax';
  if (n.includes('ValidationError')) return 'validation';
  if (n.includes('Stream')) return 'stream';
  return 'general';
}

function dropUndefined<T extends Record<string, any>>(o: T): T {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

async function runCase(c: any, strategy: Strategy) {
  const defs = buildDefs(c.definitions ?? null);
  const opts: any = {};
  if (c.options?.defaultSchema) opts.defaultSchema = c.options.defaultSchema;
  const source: any = strategy === 'whole' ? (c.input ?? '') : asyncChunks(strategy, c.input ?? '');
  const reader = createStreamReader(source, defs, opts);

  const items: any[] = [];
  let fatal: any = null;
  try {
    for await (const it of reader as any) {
      const recordIndex = it.recordIndex ?? it.index;
      if (it.error) {
        items.push(dropUndefined({ kind: 'record-error', recordIndex, schemaName: it.schemaName ?? undefined, error: { category: category(it.error), code: it.error.errorCode } }));
      } else {
        items.push(dropUndefined({ kind: 'record', recordIndex, schemaName: it.schemaName ?? undefined, value: it.data?.toJSON?.() ?? it.data }));
      }
    }
  } catch (e: any) {
    fatal = { category: category(e), code: e?.errorCode ?? null };
  }
  return { items, fatal };
}

function normalizeExpected(c: any) {
  const items = (c.expected?.items ?? []).map((i: any) =>
    i.kind === 'record-error'
      ? dropUndefined({ kind: 'record-error', recordIndex: i.recordIndex, schemaName: i.schemaName, error: { category: i.error.category, code: i.error.code } })
      : dropUndefined({ kind: 'record', recordIndex: i.recordIndex, schemaName: i.schemaName, value: i.value })
  );
  const f = c.expected?.fatal;
  return { items, fatal: f ? { category: f.category, code: f.code } : null };
}

const files = fs.readdirSync(CASES_DIR).filter(f => f.endsWith('.json'));

describe.skipIf(!process.env.RUN_CONFORMANCE)('streaming conformance corpus', () => {
  for (const file of files) {
    const c = JSON.parse(fs.readFileSync(path.join(CASES_DIR, file), 'utf8'));
    const expected = normalizeExpected(c);
    for (const strategy of c.chunkings as Strategy[]) {
      const label = typeof strategy === 'string' ? strategy : `offsets:${strategy.offsets.join(',')}`;
      it(`${c.name} [${label}]`, async () => {
        const actual = await runCase(c, strategy);
        expect(actual).toEqual(expected);
      });
    }
  }
});
