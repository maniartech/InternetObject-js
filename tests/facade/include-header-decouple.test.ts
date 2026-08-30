import { describe, test, expect } from 'vitest';
import { parseDocument, stringify } from '../../src';

/**
 * R9 — `includeHeader` and `includeTypes` are INDEPENDENT.
 *
 * Regression: `stringify(doc)` used to set `includeHeader = includeTypes ?? false`, so asking for type
 * annotations silently also emitted a header. They are now decoupled: `includeTypes` only decorates a
 * header that is actually present; to get a typed header you must pass BOTH.
 */
describe('R9 — includeHeader / includeTypes are independent', () => {
  const untyped = () => parseDocument('~ $schema: {name, age}\n---\nJohn, 30');
  const typed = () => parseDocument('~ $schema: {name: string, age: int}\n---\nJohn, 30');

  test('includeTypes:true alone does NOT emit a header', () => {
    expect(stringify(untyped(), { includeTypes: true } as any)).toBe('John, 30');
  });

  test('includeHeader:true emits the header', () => {
    expect(stringify(untyped(), { includeHeader: true } as any)).toBe('name, age\n---\nJohn, 30');
  });

  test('type annotations appear only with a header (includeHeader + includeTypes)', () => {
    expect(stringify(typed(), { includeHeader: true, includeTypes: true } as any)).toContain('name: string');
    // no header ⇒ no place for types ⇒ data-only
    expect(stringify(typed(), { includeTypes: true } as any)).not.toContain('name: string');
  });

  test('default (neither) is data-only', () => {
    expect(stringify(untyped())).toBe('John, 30');
  });
});
