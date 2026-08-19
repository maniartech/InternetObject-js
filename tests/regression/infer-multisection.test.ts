import { describe, test, expect } from 'vitest';
import { loadInferred } from '../../src/facade/load-inferred';
import { stringifyDocument, stringifyHeader } from '../../src/facade/stringify-document';
import parse from '../../src/parser/index';

/**
 * DEV-ISSUES "Multisection Document Inference": a top-level object whose every value is a
 * non-empty array of records infers as a multi-section document (`--- key: $item` per key) —
 * IO's native form — instead of one nested single-section document.
 */

const data = {
  accounting: [
    { firstName: 'John', lastName: 'Doe', age: 23 },
    { firstName: 'Mary', lastName: 'Smith', age: 32 }
  ],
  sales: [
    { firstName: 'Sally', lastName: 'Green', age: 27 },
    { firstName: 'Jim', lastName: 'Galley', age: 41 }
  ]
};

describe('multi-section inference (default for object-of-record-arrays)', () => {
  test('emits one named, schema-bound section per key; no wrapper $schema', () => {
    const io = stringifyDocument(loadInferred(data), { includeHeader: true, includeTypes: true });
    // Both sections' items share one shape, so ONE definition serves both bindings --
    // `--- sales: $accounting` is legal (the section NAME stays `sales`).
    expect(io).toContain('~ $accounting: {firstName: string, lastName: string, age: number}');
    expect(io).not.toContain('~ $sale:');
    expect(io).toContain('--- accounting: $accounting');
    expect(io).toContain('--- sales: $accounting');
    expect(io).toContain('~ John, Doe, 23');
    expect(io).not.toContain('~ $schema:');
    // Readability: a blank line separates the defs block and each section marker.
    expect(io).toContain('\n\n--- accounting: $accounting');
    expect(io).toContain('\n\n--- sales: $accounting');
  });

  test('round-trips the value model', () => {
    const io = stringifyDocument(loadInferred(data), { includeHeader: true, includeTypes: true });
    const back: any = parse(io, null);
    expect(back.getErrors()).toEqual([]);
    expect(JSON.parse(JSON.stringify(back.toJSON()))).toEqual(data);
  });

  test('document exposes named sections', () => {
    const doc: any = loadInferred(data);
    expect(doc.sections.length).toBe(2);
    expect(doc.sections.get(0).name).toBe('accounting');
    expect(doc.sections.get(1).name).toBe('sales');
  });

  test('does NOT trigger for mixed shapes (single section preserved)', () => {
    // A scalar member alongside arrays → not the multi-section shape.
    const mixed = { company: 'Acme', employees: [{ a: 1 }] };
    const doc: any = loadInferred(mixed);
    expect(doc.sections.length).toBe(1);
    const io = stringifyDocument(doc, { includeHeader: true, includeTypes: true });
    const back: any = parse(io, null);
    expect(back.getErrors()).toEqual([]);
    expect(JSON.parse(JSON.stringify(back.toJSON()))).toEqual(mixed);
  });

  test('does NOT trigger for a single-key object (existing shape preserved)', () => {
    const single = { employees: [{ a: 1 }, { a: 2 }] };
    const doc: any = loadInferred(single);
    expect(doc.sections.length).toBe(1);
  });

  test('does NOT trigger for arrays of primitives', () => {
    const prim = { xs: [1, 2], ys: ['a', 'b'] };
    const doc: any = loadInferred(prim);
    expect(doc.sections.length).toBe(1);
  });
});

describe('stringifyHeader — the library-owned header/data separation API', () => {
  test('header-only + data-only compose to the full document (multisection)', () => {
    const doc: any = loadInferred(data);
    const header = stringifyHeader(doc);
    const dataOnly = stringifyDocument(doc, { includeHeader: false });
    expect(header).toContain('~ $accounting:');
    expect(header).not.toContain('---');
    // Section markers belong to the DATA side.
    expect(dataOnly.startsWith('--- accounting: $accounting')).toBe(true);
    expect(stringifyDocument(doc, { includeHeader: true, includeTypes: true }))
      .toBe(`${header}\n\n${dataOnly}`);
  });

  test('header-only for simple single-section documents (schema-only mode)', () => {
    const doc: any = loadInferred({ name: 'John', age: 30 });
    expect(stringifyHeader(doc)).toBe('name: string, age: number');
    expect(stringifyDocument(doc, { includeHeader: false })).toBe('John, 30');
  });
});
