import { describe, test, expect } from 'vitest';
import { parse, stringify, loadObject } from '../../src';
import ErrorCodes from '../../src/errors/io-error-codes';

/**
 * R8 — schema resolution by name is uniform across the facade: one primitive, one failure mode.
 *
 * Regression: `load*` threw `schemaNotFound` on an unknown `schemaName`, while `stringify` used a
 * different primitive and SILENTLY serialized schema-less. Both now go through `resolveSchema` and
 * throw the same `schemaNotFound`. (Documents resolve their schema from the header, so this governs
 * the InternetObject / Collection stringify path.)
 */
describe('R8 — one schema resolver, one failure mode', () => {
  const defs = () => (parse('~ $User: {name}\n~ $schema: $User\n---') as any).header.definitions;
  const codeOf = (fn: () => any) => { try { fn(); return undefined; } catch (e: any) { return e.errorCode; } };

  test('loadObject: unknown schemaName throws schemaNotFound', () => {
    expect(codeOf(() => loadObject({ name: 'A' }, defs(), { schemaName: '$Nope' } as any)))
      .toBe(ErrorCodes.schemaNotFound);
  });

  test('stringify(InternetObject): unknown schemaName throws the SAME error (was silent before)', () => {
    const io = loadObject({ name: 'A' }, defs(), { schemaName: '$User' } as any);
    expect(codeOf(() => stringify(io as any, defs(), { schemaName: '$Nope' } as any)))
      .toBe(ErrorCodes.schemaNotFound);
  });

  test('valid schemaName resolves for both', () => {
    const io = loadObject({ name: 'A' }, defs(), { schemaName: '$User' } as any);
    expect(stringify(io as any, defs(), { schemaName: '$User' } as any)).toBe('A');
  });
});
