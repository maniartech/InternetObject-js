import { describe, it, expect } from 'vitest';
import { createStreamWriter } from '../../src/streaming/writer';
import { IOStreamTransport } from '../../src/streaming/types';
import io from '../../src/facade';

class MockTransport implements IOStreamTransport {
  public chunks: string[] = [];
  send(chunk: string | Uint8Array): void {
    this.chunks.push(chunk.toString());
  }
}

describe('IOStreamWriter', () => {
  it('writes header and data', async () => {
    const transport = new MockTransport();
    const writer = createStreamWriter(transport);

    writer.setHeader(io.defs`
      ~ streamId: "test-1"
    `);

    await writer.sendHeader();
    transport.send(writer.write({ id: 1, name: 'Alice' }));

    expect(transport.chunks[0]).toContain('streamId: test-1');
    expect(transport.chunks[1]).toContain('~ 1, Alice');
  });

  it('throws on a validation error during write() (Gap 16: no onError modes)', () => {
    const transport = new MockTransport();
    const schemaDefs = io.defs`~ $user: { name: {string, minLen: 5} }`;
    const writer = createStreamWriter(transport, schemaDefs);

    expect(() => {
      writer.write({ name: 'Bob' }, '$user'); // too short
    }).toThrow('Invalid minLength');
  });

  describe('writeBatch / sendBatch', () => {
    it('writeBatch formats a batch with a single schema switch', () => {
      const transport = new MockTransport();
      const writer = createStreamWriter(transport);
      const batch = writer.writeBatch([{ name: 'A' }, { name: 'B' }], 'users');
      expect(batch).toContain('--- users');
      expect(batch).toContain('~ A');
      expect(batch).toContain('~ B');
    });

    it('sendBatch does not re-emit a section when the schema is unchanged', async () => {
      const output: string[] = [];
      const transport: IOStreamTransport = { send: (c) => { output.push(c.toString()); } };
      const writer = createStreamWriter(transport);

      await writer.sendBatch([{ name: 'A' }, { name: 'B' }], 'users'); // header + --- users + A,B
      await writer.sendBatch([{ name: 'C' }], 'users');                // users still active

      const last = output[output.length - 1];
      expect(last).toContain('~ C');
      expect(last).not.toContain('--- users');
    });
  });

  describe('header lifecycle (Gap 4)', () => {
    it('auto-emits the header on the first send', async () => {
      const out: string[] = [];
      const writer = createStreamWriter({ send: (c) => { out.push(c.toString()); } });
      await writer.send({ a: 1 });
      expect(out[0]).toBe('---\n');
      expect(out[1]).toContain('~ 1');
    });

    it('emits the header at most once across sendHeader() + send()', async () => {
      const out: string[] = [];
      const writer = createStreamWriter({ send: (c) => { out.push(c.toString()); } });
      await writer.sendHeader();
      await writer.sendHeader(); // no-op
      await writer.send({ a: 1 });
      expect(out.filter((c) => c === '---\n')).toHaveLength(1);
    });

    it('accepts a duck-typed Node Writable', async () => {
      const wrote: string[] = [];
      const mockWritable = { write: (c: string) => { wrote.push(c); return true; }, end: () => {} };
      const writer = createStreamWriter(mockWritable as any);
      await writer.send({ a: 1 });
      expect(wrote.join('')).toContain('~ 1');
    });
  });

  describe('raw forwarding resets schema tracking (Gap 15)', () => {
    it('a structured send after sendRaw re-emits the section marker', async () => {
      const out: string[] = [];
      const defs = io.defs`~ $User: { name: string }`;
      const writer = createStreamWriter({ send: (c) => { out.push(c.toString()); } }, defs);

      await writer.send({ name: 'Alice' }, '$User');
      await writer.sendRaw('~ extra\n');
      await writer.send({ name: 'Bob' }, '$User');

      const joined = out.join('');
      const switches = joined.split('--- $User').length - 1;
      expect(switches).toBe(2); // before Alice, and again after the raw reset before Bob
    });

    it('pipeRaw forwards every chunk from a source, including ArrayBuffer chunks', async () => {
      const out: string[] = [];
      const writer = createStreamWriter({
        send: (c) => { out.push(typeof c === 'string' ? c : new TextDecoder().decode(c as Uint8Array)); },
      });
      async function* src() {
        yield '---\n';
        yield new TextEncoder().encode('~ { id: 1 }\n'); // Uint8Array
        yield new TextEncoder().encode('~ { id: 2 }\n').buffer; // ArrayBuffer
      }
      await writer.pipeRaw(src() as any);
      const joined = out.join('');
      expect(joined).toContain('~ { id: 1 }');
      expect(joined).toContain('~ { id: 2 }');
    });
  });

  describe('poisoning after transport failure (Gap 15)', () => {
    it('becomes unusable after a transport send rejects', async () => {
      let n = 0;
      const transport: IOStreamTransport = {
        send: () => { n++; if (n === 1) return; throw new Error('boom'); }, // header ok, record fails
      };
      const writer = createStreamWriter(transport);
      await expect(writer.send({ a: 1 })).rejects.toThrow('boom');
      await expect(writer.send({ b: 2 })).rejects.toThrow(/unusable/);
    });
  });

  describe('concurrency guard (Gap 15)', () => {
    it('rejects overlapping calls', async () => {
      const slow: IOStreamTransport = { send: () => new Promise<void>((r) => setTimeout(r, 20)) };
      const writer = createStreamWriter(slow);
      const p1 = writer.send({ a: 1 });
      await expect(writer.send({ b: 2 })).rejects.toThrow(/concurrent/);
      await p1;
    });
  });

  describe('Node Writable backpressure (Gap 3)', () => {
    it('awaits drain when write() returns false', async () => {
      let calls = 0;
      const drains: Array<() => void> = [];
      const writable = {
        write: () => { calls++; return calls === 1; }, // header accepted, record backpressured
        once: (ev: string, cb: () => void) => { if (ev === 'drain') drains.push(cb); },
        removeListener: () => {},
      };
      const writer = createStreamWriter(writable as any);

      let done = false;
      const p = writer.send({ a: 1 }).then(() => { done = true; });
      for (let i = 0; i < 20 && drains.length === 0; i++) await Promise.resolve();

      expect(done).toBe(false);     // record write is backpressured, awaiting drain
      expect(drains).toHaveLength(1);
      drains[0]();                  // fire drain
      await p;
      expect(done).toBe(true);
    });
  });
});
