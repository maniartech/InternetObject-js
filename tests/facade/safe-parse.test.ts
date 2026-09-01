import { describe, it, expect } from 'vitest';
import io, { parse, safeParse, safeParseDocument, IOErrorItem } from '../../src/index';

/**
 * The safe pair (ADR 0006 D3): `parse` with the throw traded for a result object.
 *
 * The point of the shape is structural: the data and the errors travel in ONE return value, so
 * they cannot be discarded separately. A sink array can be thrown away while the data is kept —
 * which is exactly how errors used to get lost. `{ ok, data, errors }` cannot lose them.
 */
const GOOD = 'age: int\n---\n~ 30\n~ 40';
const MIXED = 'age: int\n---\n~ 30\n~ abc\n~ 40';
const FATAL = 'a: 1, a: 2'; // duplicate-member throws even with a sink

describe('safeParse', () => {
  it('good input: ok, data, empty errors', () => {
    const r = safeParse(GOOD);
    expect(r.ok).toBe(true);
    expect(r.data).toEqual([{ age: 30 }, { age: 40 }]);
    expect(r.errors).toEqual([]);
  });

  it('mixed input: not ok, every row present, the failure embedded and listed', () => {
    const r = safeParse<any[]>(MIXED);
    expect(r.ok).toBe(false);
    expect(r.data).toHaveLength(3);
    expect(r.data![0]).toEqual({ age: 30 });
    expect(io.isError(r.data![1])).toBe(true);
    expect(r.data![1]).toBeInstanceOf(IOErrorItem);
    expect(r.errors).toHaveLength(1);
    expect((r.errors[0] as any).errorCode).toBe('expected-integer');
    expect((r.errors[0] as any).collectionIndex).toBe(1);
  });

  it('never throws — a fatal comes back as ok:false with the fatal in errors', () => {
    const r = safeParse(FATAL);
    expect(r.ok).toBe(false);
    expect(r.data).toBeUndefined();
    expect((r.errors.at(-1) as any).errorCode).toBe('duplicate-member');
  });

  it('skipErrors: the row leaves data but stays in errors with its index — traceable, not lost', () => {
    const r = safeParse<any[]>(MIXED, null, { skipErrors: true });
    expect(r.ok).toBe(false);
    expect(r.data).toEqual([{ age: 30 }, { age: 40 }]);
    expect((r.errors[0] as any).collectionIndex).toBe(1);
  });

  it('is parse with an internal sink — one pipeline, pinned', () => {
    expect(safeParse(MIXED).data).toEqual(parse(MIXED, null, []));
    expect(safeParse(GOOD).data).toEqual(parse(GOOD));
  });

  it('isError narrows in a loop — the discriminated-union contract', () => {
    const r = safeParse<Array<{ age: number }>>(MIXED);
    const ages: number[] = [];
    for (const row of r.data ?? []) {
      if (io.isError(row)) continue;
      ages.push(row.age);
    }
    expect(ages).toEqual([30, 40]);
  });
});

describe('safeParseDocument', () => {
  it('good input: ok, the proxied document under `doc`', () => {
    const r = safeParseDocument(GOOD);
    expect(r.ok).toBe(true);
    expect(r.doc.data[0].age).toBe(30);
    expect(r.errors).toEqual([]);
  });

  it('mixed input: not ok, the document still usable, errors listed', () => {
    const r = safeParseDocument(MIXED);
    expect(r.ok).toBe(false);
    expect(r.doc).toBeDefined();
    expect(r.errors).toHaveLength(1);
  });

  it('never throws on a fatal', () => {
    const r = safeParseDocument(FATAL);
    expect(r.ok).toBe(false);
    expect(r.doc).toBeUndefined();
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('on the io facade', () => {
  it('io.safeParse and io.safeParseDocument are the same functions', () => {
    expect(io.safeParse).toBe(safeParse);
    expect(io.safeParseDocument).toBe(safeParseDocument);
  });
});
