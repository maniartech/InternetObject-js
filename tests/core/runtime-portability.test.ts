import { describe, it, expect, vi, afterEach } from 'vitest';
import parse from '../../src/parser/index';
import { toBase64, fromBase64 } from '../../src/utils/base64';

/**
 * The library must work wherever JavaScript does — Node, browsers, Deno, Bun — and the browser is
 * the strict case: it is the only one of the four with neither `Buffer` nor `process`.
 *
 * `Buffer` is a Node global. Reaching for it unguarded is the easy mistake, and it is invisible on
 * a developer machine: every test passes, and the library breaks the moment it reaches a browser.
 *
 * That is exactly what had happened. `utils/base64.ts` carried a browser-safe `toBase64()` whose
 * own header said it was "kept free of any Node-only dependency so they work in a browser build
 * too" — but the DECODE half was never written, and the tokenizer called `Buffer.from(v,'base64')`
 * directly. So a browser could WRITE a binary value and could not READ one: `b"SGVsbG8="` threw
 * `Buffer is not defined`. Found 2026-08-23 by running the built package with the global deleted.
 *
 * Note Deno and Bun both PROVIDE `Buffer`, so neither would have caught this. Only the browser
 * case does, which is why these tests simulate it rather than trusting a runtime to differ.
 */

/** Run `fn` as a browser would see the world: no `Buffer`, but `atob`/`btoa` present. */
function withoutBuffer<T>(fn: () => T): T {
  vi.stubGlobal('Buffer', undefined);
  try {
    return fn();
  } finally {
    vi.unstubAllGlobals();
  }
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('runtime portability — no Node globals required', () => {
  it('the simulation is real: Buffer is genuinely gone inside it', () => {
    expect(typeof Buffer).toBe('function');
    withoutBuffer(() => expect(typeof Buffer).toBe('undefined'));
    expect(typeof Buffer).toBe('function');
  });

  describe('base64 helpers work with and without Buffer', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

    it('encodes identically either way', () => {
      expect(toBase64(bytes)).toBe('SGVsbG8=');
      expect(withoutBuffer(() => toBase64(bytes))).toBe('SGVsbG8=');
    });

    it('decodes identically either way', () => {
      expect([...fromBase64('SGVsbG8=')]).toEqual([...bytes]);
      expect([...withoutBuffer(() => fromBase64('SGVsbG8='))]).toEqual([...bytes]);
    });

    it('round-trips through both branches', () => {
      const roundTripped = withoutBuffer(() => fromBase64(toBase64(bytes)));
      expect([...roundTripped]).toEqual([...bytes]);
    });

    it('returns a Uint8Array in both — Buffer is a subclass, so callers cannot tell', () => {
      expect(fromBase64('SGVsbG8=')).toBeInstanceOf(Uint8Array);
      expect(withoutBuffer(() => fromBase64('SGVsbG8='))).toBeInstanceOf(Uint8Array);
    });

    it('handles empty input', () => {
      expect(toBase64(new Uint8Array([]))).toBe('');
      expect([...withoutBuffer(() => fromBase64(''))]).toEqual([]);
    });

    it('survives every byte value, not just ASCII', () => {
      const all = new Uint8Array(256);
      for (let i = 0; i < 256; i++) all[i] = i;
      const viaNode = toBase64(all);
      const viaBrowser = withoutBuffer(() => toBase64(all));
      expect(viaBrowser).toBe(viaNode);
      expect([...withoutBuffer(() => fromBase64(viaBrowser))]).toEqual([...all]);
    });
  });

  describe('parsing a binary literal — the case that was broken', () => {
    const value = (src: string) => (parse(src, null).toObject() as any).v;

    it('parses without Buffer', () => {
      expect([...withoutBuffer(() => value('v: b"SGVsbG8="'))]).toEqual([72, 101, 108, 108, 111]);
    });

    it('produces the same bytes with and without Buffer', () => {
      expect([...withoutBuffer(() => value('v: b"SGVsbG8="'))]).toEqual([...value('v: b"SGVsbG8="')]);
    });

    it('parses an empty binary literal without Buffer', () => {
      expect([...withoutBuffer(() => value('v: b""'))]).toEqual([]);
    });

    it('reports invalid base64 identically — the two branches cannot disagree on errors', () => {
      // Base64 is validated by regex BEFORE decoding, so `atob` never receives malformed input and
      // the browser branch cannot reach a different verdict. The diagnosis for a malformed literal
      // rides on the projected VALUE rather than an accumulated error list, so read it there.
      const code = (src: string) => (parse(src, null).toObject() as any).v?.errorCode;
      expect(code('v: b"!!!"')).toBe('invalid-binary');
      expect(withoutBuffer(() => code('v: b"!!!"'))).toBe('invalid-binary');
    });

    it('projects to JSON identically — the portable form is a base64 string', () => {
      const json = (src: string) => JSON.stringify(parse(src, null).toJSON());
      expect(withoutBuffer(() => json('v: b"SGVsbG8="'))).toBe('{"v":"SGVsbG8="}');
      expect(json('v: b"SGVsbG8="')).toBe('{"v":"SGVsbG8="}');
    });
  });

  describe('a document with no binary in it never needed Buffer', () => {
    it('parses normally without Buffer', () => {
      const doc = withoutBuffer(() => parse('name: string, age: int\n---\n~ Alice, 30', null));
      expect(doc.toObject()).toEqual([{ name: 'Alice', age: 30 }]);
    });
  });
});
