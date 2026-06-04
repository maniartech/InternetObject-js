import { describe, it, expect } from 'vitest';
import { createPushSource, BufferTransport } from '../../src/streaming/adapters';
import { createStreamReader } from '../../src/streaming/reader';
import { createStreamWriter } from '../../src/streaming/writer';
import io from '../../src/facade';

describe('Streaming Adapters', () => {
  describe('createPushSource', () => {
    it('bridges manual pushes to createStreamReader', async () => {
      const { source, push, close } = createPushSource();

      // Start consumer
      const items: any[] = [];
      const consumer = (async () => {
        const reader = createStreamReader(source);
        for await (const item of reader) {
          items.push(item.data);
        }
      })();

      // Push data
      push('---\n');
      push('~ "A"\n');
      push('~ "B"\n');
      close();

      await consumer;

      // IOObject wraps scalar values in {0: val} if no schema
      // We expect the raw data to be IOObjects
      expect(items[0].toJSON()).toEqual({0: 'A'});
      expect(items[1].toJSON()).toEqual({0: 'B'});
    });

    it('propagates errors', async () => {
      const { source, push, close } = createPushSource();

      const consumer = (async () => {
        try {
          const reader = createStreamReader(source);
          for await (const _ of reader) { /* noop */ }
          return undefined;
        } catch (e) {
          return e;
        }
      })();

      push('---\n');
      close(new Error('Network Fail'));

      const err = await consumer;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Network Fail');
    });
  });

  describe('BufferTransport', () => {
    it('accumulates output into a string', async () => {
      const transport = new BufferTransport();
      const writer = createStreamWriter(transport);

      writer.setHeader(io.defs`~ id: "test"`);
      await writer.sendHeader();
      writer.write("Hello");

      const output = transport.getOutput();
      expect(output).toContain('id: test');
      // The writer output depends on how stringify handles scalar values without schema
      // It seems it might be outputting just the value or wrapped.
      // Let's check what it actually outputs.
      // Based on previous tests, it seems to output `~ Hello` or `~ "Hello"` depending on quoting.
      // But wait, the failure says: expected '~ id: test\n---\n' to contain '~ Hello'
      // This means the writer.write("Hello") part is NOT in the output?
      // Ah, writer.write returns the string, but also sends it to transport.
      // Wait, createStreamWriter(transport) should send to transport.
      // Let's debug by printing output.
      // console.log('BUFFER OUTPUT:', output);

      // If writer.write is synchronous, it should be there.
      // But writer.write returns the string. Does it call transport.send?
      // Yes, let's check writer.ts.
      // writer.ts: write() returns string. It does NOT call transport.send().
      // The user must call transport.send(writer.write(...)).
      // Ah! That's the API design.

      transport.send(writer.write("Hello"));

      const output2 = transport.getOutput();
      expect(output2).toContain('~ Hello');
    });

    describe('UTF-8 safety across split byte chunks (Gap 2)', () => {
      const enc = (s: string) => new TextEncoder().encode(s);

      it('reassembles a 4-byte emoji split across two send() calls', () => {
        const bytes = enc('🚀'); // F0 9F 9A 80
        const t = new BufferTransport();
        t.send(bytes.slice(0, 2));
        t.send(bytes.slice(2));
        expect(t.getOutput()).toBe('🚀');
      });

      it('reassembles regardless of where the byte boundary falls', () => {
        const text = 'Hello 🚀 世界 café';
        const bytes = enc(text);
        for (let k = 1; k < bytes.length; k++) {
          const t = new BufferTransport();
          t.send(bytes.slice(0, k));
          t.send(bytes.slice(k));
          expect(t.getOutput(), `split at byte ${k}`).toBe(text);
        }
      });

      it('handles byte-at-a-time feeding of multibyte content', () => {
        const text = '日本語 🎉 ñ';
        const bytes = enc(text);
        const t = new BufferTransport();
        for (const b of bytes) t.send(Uint8Array.of(b));
        expect(t.getOutput()).toBe(text);
      });

      it('passes string chunks through unchanged and mixes with bytes', () => {
        const t = new BufferTransport();
        t.send('plain ');
        const e = enc('🚀');
        t.send(e.slice(0, 1));
        t.send(e.slice(1));
        t.send(' end');
        expect(t.getOutput()).toBe('plain 🚀 end');
      });

      it('getOutput is idempotent', () => {
        const e = enc('café 🚀');
        const t = new BufferTransport();
        t.send(e.slice(0, 5));
        t.send(e.slice(5));
        expect(t.getOutput()).toBe('café 🚀');
        expect(t.getOutput()).toBe('café 🚀');
      });

      it('buffered output matches direct (non-split) decoding', () => {
        const text = '---\n~ { message: "Hello 🚀 世界" }\n';
        const bytes = enc(text);
        const direct = new TextDecoder().decode(bytes);
        const t = new BufferTransport();
        const mid = Math.floor(bytes.length / 2);
        t.send(bytes.slice(0, mid));
        t.send(bytes.slice(mid));
        expect(t.getOutput()).toBe(direct);
      });
    });
  });
});
