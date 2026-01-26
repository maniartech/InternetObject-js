import { describe, it, expect } from 'vitest';
import { createStreamReader } from '../../src/streaming/reader';

describe('IOStreamReader', () => {
    it('reads from a string source', async () => {
      const input = `
      ~ $User: { name: string, age: int }
      --- $User
      ~ Alice, 30
      ~ Bob, 25
      `;
      const reader = createStreamReader(input);
      const items = await reader.collect();

      expect(items).toHaveLength(2);
      expect(items[0].data.toJSON()).toEqual({ name: 'Alice', age: 30 });
      expect(items[1].data.toJSON()).toEqual({ name: 'Bob', age: 25 });
    });

    it('reads from an Array source (Iterable)', async () => {
      const chunks = [
        '~ "Data 1"\n',
        '~ "Data 2"\n'
      ];
      const reader = createStreamReader(chunks);
      const items = await reader.collect();

      expect(items).toHaveLength(2);
      const d0 = items[0].data.toJSON ? items[0].data.toJSON() : items[0].data;
      expect(d0[0] || d0).toBe('Data 1');
    });

    it('reads from an AsyncIterable', async () => {
      async function* gen() {
        yield '~ item1\n';
        await new Promise(r => setTimeout(r, 10));
        yield '~ item2\n';
      }
      const reader = createStreamReader(gen());
      const items = await reader.collect();

      const data = items.map(i => {
         const d = i.data.toJSON ? i.data.toJSON() : i.data;
         return d[0] !== undefined ? d[0] : d;
      });
      expect(data).toEqual(['item1', 'item2']);
    });

    it('is iterable itself (for await)', async () => {
      const reader = createStreamReader('~ 1\n~ 2');
      const results = [];
      for await (const item of reader) {
        const d = item.data.toJSON ? item.data.toJSON() : item.data;
        results.push(d[0] !== undefined ? d[0] : d);
      }
      expect(results).toEqual([1, 2]);
    });

    // Migrated from open-stream.test.ts
    async function* stringSource(chunks: string[]) {
      for (const chunk of chunks) {
        yield chunk;
      }
    }

    it('handles syntax errors gracefully', async () => {
      const source = stringSource([
        '---\n',
        '~ {id: 1}\n',
        '~ {BROKEN_JSON\n', // Syntax error
        '~ {id: 2}\n'
      ]);

      const reader = createStreamReader(source);
      const items = await reader.collect();

      // 1 valid, 1 error, 1 valid
      expect(items).toHaveLength(3);
      expect((items[0].data as any).toJSON()).toEqual({ id: 1 });

      expect(items[1].error).toBeDefined();
      expect(items[1].data).toBeNull();

      expect((items[2].data as any).toJSON()).toEqual({ id: 2 });
    });

    it('handles multi-byte characters split across chunks', async () => {
      const emoji = '🚀'; // F0 9F 86 80
      const jsonStr = `{ "emoji": "${emoji}" }`;
      const streamStr = `---\n~ ${jsonStr}\n`;
      const bytes = new TextEncoder().encode(streamStr);

      const prefix = '---\n~ { "emoji": "';
      const prefixLen = prefix.length;
      const splitIndex = prefixLen + 2;

      const chunk1 = bytes.slice(0, splitIndex);
      const chunk2 = bytes.slice(splitIndex);

      async function* byteSource() {
        yield chunk1;
        yield chunk2;
      }

      const reader = createStreamReader(byteSource());
      const items = await reader.collect();

      expect(items).toHaveLength(1);
      expect((items[0].data as any).toJSON()).toEqual({ emoji: emoji });
    });

    it('handles multi-line strings correctly', async () => {
      const source = stringSource([
        '---\n',
        '~ { name: "Multi", bio: "Line 1\nLine 2" }\n'
      ]);

      const reader = createStreamReader(source);
      const items = await reader.collect();

      expect(items).toHaveLength(1);
      expect(items[0].error).toBeUndefined();
      expect((items[0].data as any).toJSON()).toEqual({
        name: "Multi",
        bio: "Line 1\nLine 2"
      });
    });

    it('handles multi-line strings containing tilde at start of line', async () => {
      const source = stringSource([
        '---\n',
        '~ "Start\n',
        '~ Middle\n',
        'End"\n'
      ]);

      const reader = createStreamReader(source);
      const items = await reader.collect();

      expect(items).toHaveLength(1);
      expect(items[0].error).toBeUndefined();
      expect((items[0].data as any).toJSON()).toEqual({ '0': "Start\n~ Middle\nEnd" });
    });

    it('handles multiple records on a single line', async () => {
      const source = stringSource([
        '---\n',
        '~ John, 50 ~ Jane, 45\n'
      ]);

      const reader = createStreamReader(source);
      const items = await reader.collect();

      expect(items).toHaveLength(2);
      expect((items[0].data as any).toJSON()).toEqual({ '0': 'John', '1': 50 });
      expect((items[1].data as any).toJSON()).toEqual({ '0': 'Jane', '1': 45 });
    });

    it('handles multi-line strings with single quotes', async () => {
      const source = stringSource([
        '---\n',
        "~ 'Start\n",
        "~ Middle\n",
        "End'\n"
      ]);

      const reader = createStreamReader(source);
      const items = await reader.collect();

      expect(items).toHaveLength(1);
      expect(items[0].error).toBeUndefined();
      expect((items[0].data as any).toJSON()).toEqual({ '0': "Start\n~ Middle\nEnd" });
    });
});
