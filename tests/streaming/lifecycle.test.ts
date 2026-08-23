import { describe, it, expect } from 'vitest';
import { createStreamReader } from '../../src/streaming/reader';
import { IOStreamError, StreamErrorCode } from '../../src/streaming/errors';
import IOError from '../../src/errors/io-error';

const STREAM = '---\n~ { id: 1 }\n~ { id: 2 }\n~ { id: 3 }\n';

describe('reader lifecycle & stream errors (Gaps 11, 17)', () => {
  describe('IOStreamError', () => {
    it('is an IOError with the stream category name and the given code', () => {
      const e = new IOStreamError(StreamErrorCode.aborted, 'x');
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(IOError);
      expect(e.name).toContain('StreamError');
      expect(e.errorCode).toBe('stream-aborted');
    });
  });

  describe('single-consumption', () => {
    it('rejects a second iteration', async () => {
      const reader = createStreamReader(STREAM);
      const first = await reader.collect();
      expect(first).toHaveLength(3);
      await expect(reader.collect()).rejects.toThrow(/single-consumption/);
    });
  });

  describe('AbortSignal cancellation', () => {
    it('a pre-aborted signal rejects with stream-aborted before any item', async () => {
      const ctrl = new AbortController();
      ctrl.abort();
      const reader = createStreamReader(STREAM, null, { signal: ctrl.signal });
      await expect(reader.collect()).rejects.toMatchObject({ errorCode: StreamErrorCode.aborted });
    });

    it('aborting mid-stream rejects with stream-aborted and emits no record-error', async () => {
      const ctrl = new AbortController();
      async function* src() {
        yield '---\n';
        for (let i = 0; i < 50; i++) {
          yield `~ { id: ${i} }\n`;
          await Promise.resolve();
        }
      }
      const reader = createStreamReader(src(), null, { signal: ctrl.signal });
      const got: any[] = [];
      let err: any;
      try {
        for await (const it of reader) {
          got.push(it);
          if (got.length === 1) ctrl.abort();
        }
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(IOStreamError);
      expect(err.errorCode).toBe(StreamErrorCode.aborted);
      expect(got.every((i) => i.kind === 'record')).toBe(true);
    });
  });

  describe('source release on early termination', () => {
    it('breaking out of the loop releases the underlying source', async () => {
      let released = false;
      async function* src() {
        try {
          yield '---\n';
          yield '~ { id: 1 }\n';
          yield '~ { id: 2 }\n';
          yield '~ { id: 3 }\n';
          yield '~ { id: 4 }\n';
        } finally {
          released = true;
        }
      }
      const reader = createStreamReader(src());
      for await (const _ of reader) {
        break; // early termination
      }
      expect(released).toBe(true);
    });

    it('releases the source when iteration throws fatally', async () => {
      let released = false;
      async function* src() {
        try {
          yield '--- $Missing\n';
          yield '~ Alice\n';
        } finally {
          released = true;
        }
      }
      const reader = createStreamReader(src());
      await expect(reader.collect()).rejects.toBeDefined(); // unknown schema => fatal
      expect(released).toBe(true);
    });
  });

  describe('source/transport failure => stream-source-error', () => {
    it('wraps a source error with stream-source-error and preserves the cause', async () => {
      async function* src(): AsyncGenerator<string> {
        yield '---\n';
        throw new Error('Network Fail');
      }
      const reader = createStreamReader(src());
      let err: any;
      try {
        await reader.collect();
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(IOStreamError);
      expect(err.errorCode).toBe(StreamErrorCode.sourceError);
      expect(err.cause).toBeInstanceOf(Error);
      expect(err.cause.message).toBe('Network Fail');
    });
  });

  describe('buffer overflow => stream-buffer-exceeded', () => {
    it('rejects fatally with the stream-buffer-exceeded code', async () => {
      const big = `~ "${'a'.repeat(500)}"\n`;
      await expect(
        createStreamReader(big, null, { maxBufferedChars: 50 }).collect()
      ).rejects.toMatchObject({ errorCode: StreamErrorCode.bufferExceeded });
    });
  });
});
