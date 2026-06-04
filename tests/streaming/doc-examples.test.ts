/**
 * Documentation-as-tests: harvest the fenced code blocks from the streaming example
 * docs (specs/examples/*.md) and verify them against the REAL streaming API at runtime.
 *
 * - Every ```io wire-shape block is streamed through createStreamReader across multiple
 *   chunkings (whole / per-line / per-byte). The emitted items (or the fatal outcome)
 *   MUST be identical regardless of how bytes are split — the core streaming guarantee —
 *   and the example MUST actually produce output (or reject, for the *fatal* example).
 * - Every ```ts snippet is scanned for removed/renamed API tokens so the docs can never
 *   drift to APIs that no longer exist.
 *
 * If an example doc is wrong or drifts from the implementation, this test fails — so the
 * docs stay executable truth, not stale prose.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStreamReader } from '../../src/streaming/reader';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.join(here, '..', '..', 'src', 'streaming', 'specs', 'examples');

type Block = { lang: string; body: string };

function fencedBlocks(md: string): Block[] {
  const out: Block[] = [];
  const re = /```(\w+)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) out.push({ lang: m[1], body: m[2] });
  return out;
}

async function* whole(io: string) { yield io; }
async function* perLine(io: string) { for (const p of io.split(/(?<=\n)/)) if (p) yield p; }
async function* perByte(io: string) { for (const b of new TextEncoder().encode(io)) yield Uint8Array.of(b); }

function category(e: any): string {
  const n = String(e?.name ?? '');
  if (n.includes('SyntaxError')) return 'syntax';
  if (n.includes('ValidationError')) return 'validation';
  if (n.includes('Stream')) return 'stream';
  return 'general';
}

async function run(source: AsyncIterable<any>) {
  const items: any[] = [];
  let fatal: any = null;
  try {
    for await (const it of createStreamReader(source) as any) {
      items.push(
        it.kind === 'record'
          ? { kind: 'record', recordIndex: it.recordIndex, schemaName: it.schemaName ?? null, value: it.data?.toJSON?.() ?? it.data }
          : { kind: 'record-error', recordIndex: it.recordIndex, category: category(it.error), code: it.error?.errorCode ?? null }
      );
    }
  } catch (e: any) {
    fatal = { category: category(e), code: e?.errorCode ?? e?.message ?? 'error' };
  }
  return { items, fatal };
}

const REMOVED_API = [
  { re: /\bonError\b/, why: 'StreamWriterOptions.onError was removed (Gap 16)' },
  { re: /\bdefsId\b/, why: 'StreamWriterOptions.defsId was removed (Gap 16)' },
  { re: /---\s*\$error/, why: 'the stream-only $error section was removed (Gap 16)' },
  { re: /\bupdateStringState\b/, why: 'the ad-hoc string scanner was removed (Gap 21)' },
  { re: /\.index\b/, why: 'StreamItem.index was renamed to recordIndex (Gap 5)' },
];

const files = fs.readdirSync(EXAMPLES_DIR)
  .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'TEMPLATE.md');

describe('streaming docs are executable (specs/examples/*.md)', () => {
  for (const file of files) {
    const md = fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8');
    const blocks = fencedBlocks(md);
    const ioBlocks = blocks.filter((b) => b.lang === 'io');
    const tsBlocks = blocks.filter((b) => b.lang === 'ts' || b.lang === 'typescript');
    const expectsFatal = /fatal/i.test(file);

    it(`${file}: TS snippets reference no removed API`, () => {
      for (const b of tsBlocks) {
        for (const { re, why } of REMOVED_API) {
          expect(re.test(b.body), `${file}: doc references removed API — ${why}`).toBe(false);
        }
      }
    });

    ioBlocks.forEach((b, idx) => {
      it(`${file}: io block #${idx + 1} streams identically across chunkings`, async () => {
        const io = b.body;
        const w = await run(whole(io));
        const l = await run(perLine(io));
        const y = await run(perByte(io));

        // Chunk boundaries must never change the outcome.
        expect(l).toEqual(w);
        expect(y).toEqual(w);

        // The documented example must actually do something.
        if (expectsFatal) {
          expect(w.fatal, `${file}: expected a fatal stream error`).toBeTruthy();
        } else {
          expect(w.items.length, `${file}: example produced no records`).toBeGreaterThan(0);
        }
      });
    });
  }
});
