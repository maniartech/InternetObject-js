import { describe, expect, test } from 'vitest';

import { parse, stringify } from '../../src';

describe('parse/stringify round-trip', () => {
  test('stringify(parse(text)) is stable (idempotent) with explicit document options', () => {
    const input = `
~ $User: { name: string, age: int }
~ $schema: $User
~ @version: 1
--- users
~ Alice, 30
~ Bob, 25
`.trim();

    const doc1 = parse(input);

    const opts = {
      includeHeader: true,
      includeSectionNames: true,
    } as const;

    const text1 = stringify(doc1, opts);
    const doc2 = parse(text1);
    const text2 = stringify(doc2, opts);

    expect(text2).toBe(text1);
    expect(doc2.toJSON()).toEqual(doc1.toJSON());
  });

  test('round-trip works for data-only single-section documents', () => {
    const input = `Alice, 30`;

    const doc1 = parse(input);
    const text1 = stringify(doc1);
    const doc2 = parse(text1);

    expect(doc2.toJSON()).toEqual(doc1.toJSON());
  });
});
