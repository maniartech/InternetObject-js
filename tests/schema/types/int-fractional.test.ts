import parse from '../../../src/parser';

/**
 * Internet Object value types are number / decimal / bigint. `int` (and sized ints) are SCHEMA
 * types, not value types: the parser parses `3.7` as a `number` value, and the schema validator
 * must REJECT it when an integer type is expected — with the designated `expected-integer` code.
 */
function codes(schema: string, data: string): string[] {
  // Use a collection so validation errors accumulate on the document (single objects fail fast).
  const doc: any = parse(`~ $schema: { ${schema} }\n---\n~ ${data}\n`, null);
  return doc.getErrors().map((e: any) => e.errorCode);
}

describe('int schema type rejects fractional numbers', () => {
  it('rejects a number with a decimal point against `int` (expected-integer)', () => {
    expect(codes('n: int', '3.7')).toContain('expected-integer');
  });

  it('rejects fractional values for sized int types', () => {
    expect(codes('n: int8', '3.5')).toContain('expected-integer');
    expect(codes('n: uint', '3.14')).toContain('expected-integer');
  });

  it('accepts whole-number values for int', () => {
    expect(codes('n: int', '3')).toHaveLength(0);
    expect(codes('n: int', '-42')).toHaveLength(0);
  });

  it('still accepts fractional values for `number` (a fraction is a valid number)', () => {
    expect(codes('n: number', '3.7')).toHaveLength(0);
  });
});
