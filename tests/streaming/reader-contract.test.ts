import { describe, it, expect } from 'vitest';
import { createStreamReader } from '../../src/streaming/reader';
import parse from '../../src/parser/index';

const collect = (src: any, defs?: any, opts?: any) => createStreamReader(src, defs, opts).collect();

describe('reader contract (Group A: Gaps 1, 6, 10, 12, 14)', () => {
  describe('Gap 1 — single object section emits exactly one complete IOObject', () => {
    it('one object section => one record item, not tuples/collection', async () => {
      const items = await collect('---\n~ { id: 1, name: "Alice" }\n');
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe('record');
      expect((items[0] as any).data.toJSON()).toEqual({ id: 1, name: 'Alice' });
      // must not be a [key,value] tuple stream
      expect(Array.isArray((items[0] as any).data.toJSON())).toBe(false);
    });

    it('multi-record collection => one item per record', async () => {
      const items = await collect('---\n~ { id: 1 }\n~ { id: 2 }\n~ { id: 3 }\n');
      expect(items.map((i) => i.kind)).toEqual(['record', 'record', 'record']);
      expect(items.map((i) => (i as any).data.toJSON())).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    });
  });

  describe('Gap 6 — streamed record equals the non-streaming parse', () => {
    it('value matches core parse for the same text + schema', async () => {
      const text = '~ $User: { name: string, age: int, active: { bool, default: T } }\n--- $User\n~ Alice, 30\n~ Bob, 25\n';
      const streamed = (await collect(text)).map((i) => (i as any).data.toJSON());

      const doc: any = parse(text);
      const expected: any[] = [];
      for (let s = 0; s < doc.sections.length; s++) {
        const d = doc.sections.get(s)?.data;
        if (d && typeof d[Symbol.iterator] === 'function' && typeof d.toJSON === 'function') {
          for (const it of d) expected.push(it.toJSON());
        }
      }
      expect(streamed).toEqual(expected);
      expect(streamed).toEqual([
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 25, active: true },
      ]);
    });
  });

  describe('Gap 10 — partial frame at end of stream becomes one record-error', () => {
    it('unterminated object at EOF', async () => {
      const items = await collect('---\n~ { id: 1 }\n~ { id: 2\n');
      expect(items[0].kind).toBe('record');
      expect((items[0] as any).data.toJSON()).toEqual({ id: 1 });
      expect(items[1].kind).toBe('record-error');
      expect((items[1] as any).data).toBeNull();
      expect((items[1] as any).error).toBeDefined();
    });

    it('unterminated string at EOF', async () => {
      const items = await collect('---\n~ { a: "oops\n');
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe('record-error');
    });
  });

  describe('Gap 12 — degenerate and empty inputs', () => {
    it('empty source => zero items', async () => {
      expect(await collect('')).toHaveLength(0);
    });
    it('whitespace-only => zero items', async () => {
      expect(await collect('   \n\n  \n')).toHaveLength(0);
    });
    it('header-only stream => zero items', async () => {
      expect(await collect('~ $User: { name: string }\n---\n')).toHaveLength(0);
    });
    it('bare ~ is delegated to core: under a schema it is a record-error (missing member)', async () => {
      const items = await collect('~ $User: { name: string }\n--- $User\n~\n');
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe('record-error');
    });
    it('bare ~ is delegated to core: schemaless it is core\'s empty record (equivalence, §2)', async () => {
      const items = await collect('---\n~\n');
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe('record');
      expect((items[0] as any).data.toJSON()).toEqual({});
    });
    it('trailing bare --- with no records => no item, no error', async () => {
      const items = await collect('---\n~ { id: 1 }\n---\n');
      expect(items).toHaveLength(1);
      expect(items[0].kind).toBe('record');
    });
  });

  describe('Gap 14 — exceeding maxBufferedChars is fatal, not a record-error', () => {
    it('rejects the iterator when a single pending frame exceeds the cap', async () => {
      const big = `~ "${'a'.repeat(500)}"\n`;
      await expect(collect(big, null, { maxBufferedChars: 50 })).rejects.toThrow();
    });
  });
});
