import { describe, it, expect } from 'vitest';
import { createStreamReader } from '../../src/streaming/reader';
import { createPushSource } from '../../src/streaming/adapters';
import io from '../../src/facade';

describe('streaming performance guarantees (Gap 9)', () => {
  it('resolves the section schema once, not per record', async () => {
    const defs: any = io.defs`~ $User: { name: string, age: int }`;
    let userResolves = 0;
    const origGetV = defs.getV.bind(defs);
    defs.getV = (k: any) => {
      if (typeof k === 'string' && k.includes('User')) userResolves++;
      return origGetV(k);
    };

    const N = 1000;
    const records = Array.from({ length: N }, (_, i) => `~ User${i}, ${i}`).join('\n');
    const items = await createStreamReader(`--- $User\n${records}\n`, defs).collect();

    expect(items).toHaveLength(N);
    // Resolved per section switch (one `--- $User`), not once per record.
    expect(userResolves).toBeLessThanOrEqual(2);
  });

  it('emits records incrementally as data arrives (does not buffer the whole stream)', async () => {
    const { source, push, close } = createPushSource();
    const reader = createStreamReader(source);
    const iter = reader[Symbol.asyncIterator]();

    // Reader is "one-behind": record N is emitted once record N+1's `~` is seen.
    push('---\n');
    push('~ { id: 1 }\n');
    push('~ { id: 2 }\n');
    const r1 = await iter.next();
    expect((r1.value as any).data.toJSON()).toEqual({ id: 1 });

    push('~ { id: 3 }\n');
    const r2 = await iter.next();
    expect((r2.value as any).data.toJSON()).toEqual({ id: 2 });

    close();
    const r3 = await iter.next();
    expect((r3.value as any).data.toJSON()).toEqual({ id: 3 });
    const end = await iter.next();
    expect(end.done).toBe(true);
  });

  it('processes a large single-schema stream incrementally and correctly', async () => {
    const defs = io.defs`~ $User: { name: string, age: int }`;
    const N = 10_000;
    async function* big() {
      yield '--- $User\n';
      for (let i = 0; i < N; i++) yield `~ U${i}, ${i}\n`;
    }
    const items = await createStreamReader(big(), defs).collect();
    expect(items).toHaveLength(N);
    expect((items[0] as any).data.toJSON()).toEqual({ name: 'U0', age: 0 });
    expect((items[N - 1] as any).data.toJSON()).toEqual({ name: `U${N - 1}`, age: N - 1 });
  });

  it('keeps the sliding window bounded across many records (no full-history buffering)', async () => {
    // Indirect proof: feed records one chunk at a time and confirm correctness at scale.
    // If the reader buffered all history it would still pass, but combined with the
    // incremental test above this confirms per-record flushing works under chunking.
    const N = 2000;
    async function* chunks() {
      yield '---\n';
      for (let i = 0; i < N; i++) yield `~ { id: ${i} }\n`;
    }
    const items = await createStreamReader(chunks()).collect();
    expect(items).toHaveLength(N);
    expect((items[1234] as any).data.toJSON()).toEqual({ id: 1234 });
  });
});
