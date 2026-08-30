import { describe, expect, test } from 'vitest';

import { parseDocument, stringify } from '../../src';

describe('parse/stringify round-trip', () => {
  test('stringify(parseDocument(text)) is stable (idempotent) with explicit document options', () => {
    const input = `
~ $User: { name: string, age: int }
~ $schema: $User
~ @version: 1
--- users
~ Alice, 30
~ Bob, 25
`.trim();

    const doc1 = parseDocument(input);

    const opts = {
      includeHeader: true,
      includeSectionNames: true,
    } as const;

    const text1 = stringify(doc1, opts);
    const doc2 = parseDocument(text1);
    const text2 = stringify(doc2, opts);

    expect(text2).toBe(text1);
    expect(doc2.toJSON()).toEqual(doc1.toJSON());
  });

  test('round-trip works for data-only single-section documents', () => {
    const input = `Alice, 30`;

    const doc1 = parseDocument(input);
    const text1 = stringify(doc1);
    const doc2 = parseDocument(text1);

    expect(doc2.toJSON()).toEqual(doc1.toJSON());
  });
});
