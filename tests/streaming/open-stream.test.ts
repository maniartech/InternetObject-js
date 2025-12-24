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
});
