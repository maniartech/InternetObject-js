/**
 * Demonstration of correct header definitions format
 * Each definition is on its own line with ~ prefix (not comma-separated)
 */

import { parse, stringify } from '../src/index';
import Document from '../src/core/document';

describe('Header Definitions Format Demo', () => {
  test('header definitions are newline-separated, not comma-separated', () => {
    const io = `
~ @var: "val"
~ $schema: {name, age, email}
---
Alice, 28, alice@example.com
`;
    const doc = parse(io, null) as Document;
    const serialized = stringify(doc);

    // Each definition on its own line
    // Note: Strings use open format (no quotes) unless they contain special characters
    expect(serialized).toContain('~ @var: val');
    expect(serialized).toContain('~ $schema: {name, age, email}');

    // Should NOT have comma-separated definitions
    expect(serialized).not.toContain('~ @var: val, ~ $schema:');

    console.log('Correct format:\n', serialized);
  });

  test('complex header with multiple definition types', () => {
    const io = `
~ appName: "UserAPI"
~ version: 1.0
~ @yes: T
~ @no: F
~ $address: {street, city}
~ $schema: {id, name, $address}
---
`;
    const doc = parse(io, null) as Document;
    const serialized = stringify(doc);

    // Verify each definition is on its own line
    const lines = serialized.split('\n').filter(l => l.trim());
    const defLines = lines.filter(l => l.startsWith('~'));

    expect(defLines.length).toBe(6); // 6 definitions
    // Note: Strings use open format (no quotes) for simple values
    expect(defLines[0]).toContain('~ appName: UserAPI');
    expect(defLines[1]).toContain('~ version: 1');
    expect(defLines[2]).toContain('~ @yes: T');
    expect(defLines[3]).toContain('~ @no: F');
    expect(defLines[4]).toContain('~ $address: {street, city}');
    expect(defLines[5]).toContain('~ $schema: {id, name, $address}');

    console.log('Complex header format:\n', serialized);
  });
});
