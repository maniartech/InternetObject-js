/**
 * 14 — Streaming: read records as they arrive
 *
 * Run me:  npx tsx examples/14-streaming/index.ts
 */
import { createStreamReader } from '../../src/index';

// A large export does not fit comfortably in memory, and you should not have to
// wait for the last byte before handling the first record.

// ── Reading a stream ──────────────────────────────────────────────────────────

const source = `~ $schema: {name: string, age: int}
---
~ Alice, 30
~ Bob, 25
~ Carol, 28
`;

async function main() {
  const reader = createStreamReader(source);
  for await (const item of reader as any) {
    if (item.data) console.log(`record ${item.recordIndex}:`, item.data.toObject());
  }

  // ── Chunk boundaries do not matter ──────────────────────────────────────────

  // The same stream split into arbitrary pieces gives the same records. A record
  // that straddles a chunk is reassembled for you.
  async function* inPieces(text: string, size: number) {
    for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
  }

  const names: string[] = [];
  for await (const item of createStreamReader(inPieces(source, 7)) as any) {
    if (item.data) names.push(item.data.toObject().name);
  }
  console.log('\nsplit every 7 chars ->', names.join(', '), ' <- identical');

  // ── A bad record does not end the stream ────────────────────────────────────

  const withBad = `~ $schema: {name: string, age: int}
---
~ Alice, 30
~ Bob, notanumber
~ Carol, 28
`;
  for await (const item of createStreamReader(withBad) as any) {
    if (item.data) console.log('\nok   :', item.data.toObject());
    else if (item.error) console.log('bad  :', item.error.errorCode, '- and the stream continues');
  }

  console.log(`
  createStreamReader(source)   a string, a Response, a ReadableStream, an async iterable
  item.data                    one record
  item.error                   one bad record; iteration continues`);
}

main();
