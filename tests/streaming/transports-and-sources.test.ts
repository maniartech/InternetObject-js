import { describe, it, expect } from 'vitest';
import { nodeHttpTransport, webSocketTransport } from '../../src/streaming/transports';
import { toAsyncIterable } from '../../src/streaming/source';
import { createStreamReader } from '../../src/streaming/reader';
import { createPushSource } from '../../src/streaming/adapters';

describe('transports', () => {
  it('nodeHttpTransport writes and flushes when flush() exists', () => {
    const writes: any[] = [];
    let flushed = 0;
    const t = nodeHttpTransport({ write: (c) => { writes.push(c); }, flush: () => { flushed++; } });
    t.send('hello');
    expect(writes).toEqual(['hello']);
    expect(flushed).toBe(1);
  });

  it('nodeHttpTransport works when flush() is absent', () => {
    const writes: any[] = [];
    const t = nodeHttpTransport({ write: (c) => { writes.push(c); } });
    t.send('x');
    expect(writes).toEqual(['x']);
  });

  it('webSocketTransport forwards to ws.send', () => {
    const sent: any[] = [];
    const t = webSocketTransport({ send: (d) => { sent.push(d); } });
    t.send('y');
    expect(sent).toEqual(['y']);
  });
});

describe('source adaptation', () => {
  it('reads from a Web ReadableStream<Uint8Array>', async () => {
    const enc = new TextEncoder();
    const rs = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(enc.encode('---\n~ { id: 1 }\n'));
        controller.enqueue(enc.encode('~ { id: 2 }\n'));
        controller.close();
      },
    });
    const items = await createStreamReader(rs).collect();
    expect(items.map((i) => (i as any).data.toJSON())).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('reads from a synchronous iterable', async () => {
    const items = await createStreamReader(['---\n', '~ { id: 1 }\n', '~ { id: 2 }\n']).collect();
    expect(items.map((i) => (i as any).data.toJSON())).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('throws on an unsupported source type', async () => {
    await expect(
      (async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of toAsyncIterable(42 as any)) { /* noop */ }
      })()
    ).rejects.toThrow(/Unsupported stream source/);
  });
});

describe('createPushSource extra paths', () => {
  it('resolves a consumer that is already awaiting when data is pushed', async () => {
    const { source, push, close } = createPushSource();
    const iter = source[Symbol.asyncIterator]();
    const pending = iter.next(); // awaits before any data => registers a resolver
    push('hello');
    const r = await pending;
    expect(r.done).toBe(false);
    expect(r.value).toBe('hello');
    close();
  });

  it('rejects a pending consumer when closed with an error', async () => {
    const { source, close } = createPushSource();
    const iter = source[Symbol.asyncIterator]();
    const pending = iter.next();
    close(new Error('boom'));
    await expect(pending).rejects.toThrow('boom');
  });

  it('ignores push/close after close', async () => {
    const { source, push, close } = createPushSource();
    const iter = source[Symbol.asyncIterator]();
    close();
    push('late'); // ignored
    close();       // ignored
    const r = await iter.next();
    expect(r.done).toBe(true);
  });

  it('delivers queued data when pushed before consumption', async () => {
    const { source, push, close } = createPushSource();
    push('a');
    push('b');
    close();
    const iter = source[Symbol.asyncIterator]();
    expect((await iter.next()).value).toBe('a');
    expect((await iter.next()).value).toBe('b');
    expect((await iter.next()).done).toBe(true);
  });
});
