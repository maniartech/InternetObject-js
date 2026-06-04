import { describe, it, expect } from 'vitest';
import { createStreamReader } from '../../src/streaming/reader';
import { stripLeadingBom, normalizeNewlines } from '../../src/streaming/text';

const enc = (s: string) => new TextEncoder().encode(s);
const collect = (src: any) => createStreamReader(src).collect();
const values = (items: any[]) => items.map((i) => i.data?.toJSON?.() ?? i.data);

async function* bytes(chunks: Uint8Array[]) {
  for (const c of chunks) yield c;
}

describe('encoding (Gap 13)', () => {
  describe('stripLeadingBom helper', () => {
    it('strips a single leading U+FEFF', () => {
      expect(stripLeadingBom('﻿hello')).toBe('hello');
    });
    it('leaves text without a BOM unchanged', () => {
      expect(stripLeadingBom('hello')).toBe('hello');
    });
    it('does not strip an interior U+FEFF', () => {
      expect(stripLeadingBom('a﻿b')).toBe('a﻿b');
    });
    it('strips at most one BOM', () => {
      expect(stripLeadingBom('﻿﻿x')).toBe('﻿x');
    });
  });

  describe('BOM stripping in the reader', () => {
    it('string source with a leading BOM parses cleanly', async () => {
      const items = await collect('﻿---\n~ { id: 1 }\n');
      expect(values(items)).toEqual([{ id: 1 }]);
    });

    it('byte source with a leading BOM (EF BB BF) is stripped', async () => {
      const b = enc('---\n~ { id: 1 }\n');
      const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...b]);
      const items = await collect(bytes([withBom]));
      expect(values(items)).toEqual([{ id: 1 }]);
    });

    it('byte BOM split across chunks is still stripped', async () => {
      const b = enc('---\n~ { id: 1 }\n');
      const full = new Uint8Array([0xef, 0xbb, 0xbf, ...b]);
      const items = await collect(bytes([full.slice(0, 2), full.slice(2)]));
      expect(values(items)).toEqual([{ id: 1 }]);
    });

    it('an interior BOM-like char inside a string value is preserved', async () => {
      const items = await collect('---\n~ { m: "a﻿b" }\n');
      expect(values(items)).toEqual([{ m: 'a﻿b' }]);
    });
  });

  describe('newline normalization', () => {
    it('normalizeNewlines maps CRLF and lone CR to LF', () => {
      expect(normalizeNewlines('a\r\nb\rc\nd')).toBe('a\nb\nc\nd');
    });

    it('CRLF-framed stream yields the same records as LF', async () => {
      const lf = await collect('---\n~ { id: 1 }\n~ { id: 2 }\n');
      const crlf = await collect('---\r\n~ { id: 1 }\r\n~ { id: 2 }\r\n');
      expect(values(crlf)).toEqual(values(lf));
      expect(values(crlf)).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('lone CR newlines frame identically', async () => {
      const cr = await collect('---\r~ { id: 1 }\r~ { id: 2 }\r');
      expect(values(cr)).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('cross-chunk multibyte decode', () => {
    it('a multibyte code point split across byte chunks decodes correctly', async () => {
      const b = enc('---\n~ { m: "Hello 🚀 世界" }\n');
      for (let k = 1; k < b.length; k++) {
        const items = await collect(bytes([b.slice(0, k), b.slice(k)]));
        expect(values(items), `split at ${k}`).toEqual([{ m: 'Hello 🚀 世界' }]);
      }
    });
  });
});
