import { describe, it, expect } from 'vitest';
import { openStream } from '../../src/streaming/open-stream';
import { StreamItem } from '../../src/streaming/types';

async function* stringSource(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe('openStream', () => {
  it('parses simple stream', async () => {
    const source = stringSource([
      '---\n',
      '~ {id: 1}\n',
      '~ {id: 2}\n'
    ]);

    const items: StreamItem[] = [];
    for await (const item of openStream(source)) {
      items.push(item);
    }

    expect(items).toHaveLength(2);
    expect((items[0].data as any).toJSON()).toEqual({ id: 1 });
    expect((items[1].data as any).toJSON()).toEqual({ id: 2 });
  });

  it('handles syntax errors gracefully', async () => {
    const source = stringSource([
      '---\n',
      '~ {id: 1}\n',
      '~ {BROKEN_JSON\n', // Syntax error
      '~ {id: 2}\n'
    ]);

    const items: StreamItem[] = [];
    for await (const item of openStream(source)) {
      items.push(item);
    }

    // 1 valid, 1 error, 1 valid
    expect(items).toHaveLength(3);
    expect((items[0].data as any).toJSON()).toEqual({ id: 1 });

    expect(items[1].error).toBeDefined();
    expect(items[1].data).toBeNull();

    expect((items[2].data as any).toJSON()).toEqual({ id: 2 });
  });

  it('handles multi-byte characters split across chunks', async () => {
    const emoji = '🚀'; // F0 9F 86 80
    // Use an object structure to make verification easier and consistent with other tests
    const jsonStr = `{ "emoji": "${emoji}" }`;
    const streamStr = `---\n~ ${jsonStr}\n`;
    const bytes = new TextEncoder().encode(streamStr);

    // We want to split inside the emoji.
    // Calculate offset to the emoji.
    // "---\n~ { "emoji": "" is the prefix.
    const prefix = '---\n~ { "emoji": "';
    const prefixLen = prefix.length; // Should be 17

    // Split 2 bytes into the emoji
    const splitIndex = prefixLen + 2;

    const chunk1 = bytes.slice(0, splitIndex);
    const chunk2 = bytes.slice(splitIndex);

    async function* byteSource() {
      yield chunk1;
      yield chunk2;
    }

    const items: StreamItem[] = [];
    for await (const item of openStream(byteSource())) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect((items[0].data as any).toJSON()).toEqual({ emoji: emoji });
  });

it('handles multi-line strings correctly', async () => {
    const source = stringSource([
      '---\n',
      '~ { name: "Multi", bio: "Line 1\nLine 2" }\n'
    ]);

    const items: StreamItem[] = [];
    for await (const item of openStream(source)) {
      items.push(item);
    }

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

    const items: StreamItem[] = [];
    for await (const item of openStream(source)) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect(items[0].error).toBeUndefined();
    expect((items[0].data as any).toJSON()).toEqual({ '0': "Start\n~ Middle\nEnd" });
  });

  it('handles multiple records on a single line', async () => {
    const source = stringSource([
      '---\n',
      '~ John, 50 ~ Jane, 45\n'
    ]);

    const items: StreamItem[] = [];
    for await (const item of openStream(source)) {
      items.push(item);
    }

    expect(items).toHaveLength(2);
    expect((items[0].data as any).toJSON()).toEqual({ '0': 'John', '1': 50 });
    expect((items[1].data as any).toJSON()).toEqual({ '0': 'Jane', '1': 45 });
  });
});
