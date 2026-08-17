import { describe, test, expect } from 'vitest';
import parse from '../../src/parser/index';

/**
 * RECORD ENCLOSURE — exhaustive behavioral matrix.
 *
 * Covers how a data row's curly braces are interpreted: schemaless (pure value model) and under
 * schema validation, across brace depth 0..4, empty braces, keyed vs positional members, mixed
 * nesting, collections (`~` rows), and schema references.
 *
 * Spec: io-specs `the-structure/values/object.md` — "Record Enclosure Under Schema Validation"
 *       and "Precautions and Ambiguity Prevention".
 *
 * Cases known to be UNRESOLVED are grouped under `ISSUE-15` at the bottom and asserted against
 * CURRENT behavior, so that settling the rule makes those tests fail loudly (by design).
 */

/** Parse and return either the value model (POJO-normalized) or `ERR:<code>` / `THROW:<code>`. */
function run(header: string | null, row: string): any {
  const src = header ? `${header}\n---\n${row}` : `---\n${row}`;
  try {
    const doc: any = parse(src, null);
    const errs = doc.getErrors().map((e: any) => e.errorCode);
    if (errs.length) return `ERR:${errs[0]}`;
    return JSON.parse(JSON.stringify(doc.toJSON()));
  } catch (e: any) {
    return `THROW:${e.errorCode ?? String(e.message).slice(0, 40)}`;
  }
}

const S_SCALAR = '~ $schema: {a: string}';
const S_OBJ2 = '~ $schema: {o1: object, o2?: object}';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Schemaless — the value model. The record's OWN outermost braces are optional.
// ─────────────────────────────────────────────────────────────────────────────
describe('schemaless: a record\'s outermost braces are its own enclosure (optional)', () => {
  test('zero vs one brace are equivalent — positional', () => {
    expect(run(null, 'x')).toEqual({ '0': 'x' });
    expect(run(null, '{x}')).toEqual({ '0': 'x' });
  });

  test('zero vs one brace are equivalent — keyed', () => {
    expect(run(null, 'key: val')).toEqual({ key: 'val' });
    expect(run(null, '{key: val}')).toEqual({ key: 'val' });
  });

  test('zero vs one brace are equivalent — multi-member', () => {
    expect(run(null, 'x, 4')).toEqual({ '0': 'x', '1': 4 });
    expect(run(null, '{x, 4}')).toEqual({ '0': 'x', '1': 4 });
  });

  test('empty record', () => {
    expect(run(null, '{}')).toEqual({});
  });
});

describe('schemaless: each brace level beyond the first adds one nesting level', () => {
  test('positional depth 2..4', () => {
    expect(run(null, '{{x}}')).toEqual({ '0': { '0': 'x' } });
    expect(run(null, '{{{x}}}')).toEqual({ '0': { '0': { '0': 'x' } } });
    expect(run(null, '{{{{x}}}}')).toEqual({ '0': { '0': { '0': { '0': 'x' } } } });
  });

  test('keyed depth 2..3', () => {
    expect(run(null, '{{key: val}}')).toEqual({ '0': { key: 'val' } });
    expect(run(null, '{{{key: val}}}')).toEqual({ '0': { '0': { key: 'val' } } });
  });

  test('empty braces depth 2..3', () => {
    expect(run(null, '{{}}')).toEqual({ '0': {} });
    expect(run(null, '{{{}}}')).toEqual({ '0': { '0': {} } });
  });

  test('multi-member nested', () => {
    expect(run(null, '{{x, 4}}')).toEqual({ '0': { '0': 'x', '1': 4 } });
  });
});

describe('schemaless: trailing content makes the leading braces a VALUE, not the enclosure', () => {
  test('one object plus a scalar', () => {
    // Contrast with `{x, 4}` (→ two members): the trailing `, 9` means the first `{...}` is a value.
    expect(run(null, '{x, 4}, 9')).toEqual({ '0': { '0': 'x', '1': 4 }, '1': 9 });
  });
});

describe('schemaless: deep and mixed nesting', () => {
  test('mixed positional and nested object', () => {
    expect(run(null, '{{x, {y}}}')).toEqual({ '0': { '0': 'x', '1': { '0': 'y' } } });
  });

  test('deep keyed chain keeps every level', () => {
    expect(run(null, '{a: {b: {c: {d: 1}}}}')).toEqual({ a: { b: { c: { d: 1 } } } });
  });

  test('nested objects beside scalars at two levels', () => {
    expect(run(null, '{{{a: 1}, 2}, 3}')).toEqual({ '0': { '0': { a: 1 }, '1': 2 }, '1': 3 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Collections — `~` rows follow exactly the same enclosure rules.
// ─────────────────────────────────────────────────────────────────────────────
describe('collections: `~` rows follow the same enclosure rules', () => {
  test('schemaless rows mirror single-record behavior', () => {
    expect(run(null, '~ x')).toEqual([{ '0': 'x' }]);
    expect(run(null, '~ {x}')).toEqual([{ '0': 'x' }]);
    expect(run(null, '~ {{x}}')).toEqual([{ '0': { '0': 'x' } }]);
    expect(run(null, '~ {key: val}')).toEqual([{ key: 'val' }]);
    expect(run(null, '~ {{key: val}}')).toEqual([{ '0': { key: 'val' } }]);
  });

  test('schema-bound rows: lone object with an undeclared key binds to member 0', () => {
    expect(run(S_OBJ2, '~ {key: val}')).toEqual([{ o1: { key: 'val' } }]);
  });

  test('schema-bound rows: enclosed form binds to the member', () => {
    expect(run(S_OBJ2, '~ {{key: val}}')).toEqual([{ o1: { key: 'val' } }]);
  });

  test('multiple rows each enclosed independently', () => {
    expect(run(S_OBJ2, '~ {{a: 1}}\n~ {{b: 2}}')).toEqual([{ o1: { a: 1 } }, { o1: { b: 2 } }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Under schema — scalar-typed first member (no ambiguity is observable).
// ─────────────────────────────────────────────────────────────────────────────
describe('schema with a scalar first member', () => {
  test('depth 0 and 1 both bind the scalar', () => {
    expect(run(S_SCALAR, 'x')).toEqual({ a: 'x' });
    expect(run(S_SCALAR, '{x}')).toEqual({ a: 'x' });
  });

  test('extra enclosure makes member 0 an object → type error', () => {
    expect(run(S_SCALAR, '{{x}}')).toBe('THROW:not-a-string');
    expect(run(S_SCALAR, '{{{x}}}')).toBe('THROW:not-a-string');
  });

  test('a second declared member does not change the reading', () => {
    expect(run('~ $schema: {a: string, b?: string}', 'x')).toEqual({ a: 'x' });
    expect(run('~ $schema: {a: string, b?: string}', '{x}')).toEqual({ a: 'x' });
    expect(run('~ $schema: {a: string, b?: string}', '{{x}}')).toBe('THROW:not-a-string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Under schema — object-typed first member, closed schema, 2+ members.
//    This is the self-consistent reading: outer braces = the record's enclosure.
// ─────────────────────────────────────────────────────────────────────────────
describe('schema with an object first member (closed, 2+ members) — the canonical rule', () => {
  test('a lone object keyed with an undeclared name binds to member 0 (uniform at every arity)', () => {
    // ISSUE-15 fix: this used to raise `unknown-member` for 2+ member schemas while a 1-member
    // schema absorbed it. The reading no longer depends on how many members the schema declares.
    expect(run(S_OBJ2, 'key: val')).toEqual({ o1: { key: 'val' } });
    expect(run(S_OBJ2, '{key: val}')).toEqual({ o1: { key: 'val' } });
    expect(run('~ $schema: {o1: object}', '{key: val}')).toEqual({ o1: { key: 'val' } });
  });

  test('a key that IS declared still binds by name (no absorption)', () => {
    expect(run(S_OBJ2, '{o1: {a: 1}, o2: {b: 2}}')).toEqual({ o1: { a: 1 }, o2: { b: 2 } });
  });

  test('explicit enclosure passes the object as the member value', () => {
    expect(run(S_OBJ2, '{{key: val}}')).toEqual({ o1: { key: 'val' } });
  });

  test('a scalar cannot bind to an object member', () => {
    expect(run(S_OBJ2, 'x')).toBe('THROW:invalid-object');
    expect(run(S_OBJ2, '{x}')).toBe('THROW:invalid-object');
  });

  test('positional values inside the enclosed object', () => {
    expect(run(S_OBJ2, '{{x}}')).toEqual({ o1: { '0': 'x' } });
    expect(run(S_OBJ2, '{{{x}}}')).toEqual({ o1: { '0': { '0': 'x' } } });
    expect(run(S_OBJ2, '{{{{x}}}}')).toEqual({ o1: { '0': { '0': { '0': 'x' } } } });
  });

  test('each extra enclosure level nests inside the member', () => {
    expect(run(S_OBJ2, '{{{key: val}}}')).toEqual({ o1: { '0': { key: 'val' } } });
  });

  test('empty braces', () => {
    // `{}` is an EMPTY record — the required member is missing, not an empty object value.
    expect(run(S_OBJ2, '{}')).toBe('THROW:value-required');
    expect(run(S_OBJ2, '{{}}')).toEqual({ o1: {} });
    expect(run(S_OBJ2, '{{{}}}')).toEqual({ o1: { '0': {} } });
  });

  test('trailing content disambiguates without extra enclosure', () => {
    expect(run('~ $schema: {o1: object, n: number}', '{key: val}, 5'))
      .toEqual({ o1: { key: 'val' }, n: 5 });
  });

  test('trailing content changes what an enclosed object means', () => {
    // With trailing content the leading `{{...}}` is a VALUE of depth 2, so o1 gains a level.
    expect(run('~ $schema: {o1: object, o2: object}', '{{key: val}}, {b: 2}'))
      .toEqual({ o1: { '0': { key: 'val' } }, o2: { b: 2 } });
  });

  test('deeply nested values under a schema-bound member', () => {
    expect(run('~ $schema: {o1: object, n?: number}', '{{a: {b: {c: 1}}}}'))
      .toEqual({ o1: { a: { b: { c: 1 } } } });
    expect(run('~ $schema: {o1: object, n?: number}', '{{a: 1}, 5}'))
      .toEqual({ o1: { a: 1 }, n: 5 });
    expect(run('~ $schema: {o1: object, n?: number}', '{{{a: 1}}, 5}'))
      .toEqual({ o1: { '0': { a: 1 } }, n: 5 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ambiguity prevention — every unambiguous form agrees.
// ─────────────────────────────────────────────────────────────────────────────
describe('ambiguity prevention: unambiguous forms all agree', () => {
  const expected = { o1: { key: 'val' } };

  test('explicit record enclosure', () => {
    expect(run(S_OBJ2, '{{key: val}}')).toEqual(expected);
  });

  test('naming the target member — open record', () => {
    expect(run(S_OBJ2, 'o1: {key: val}')).toEqual(expected);
  });

  test('naming the target member — closed record', () => {
    expect(run(S_OBJ2, '{o1: {key: val}}')).toEqual(expected);
  });

  test('silent-failure case: keys colliding with member names decode differently', () => {
    // Both parse cleanly — but produce different shapes. This is why writers must enclose.
    expect(run(S_OBJ2, '{o1: {a: 1}, o2: {b: 2}}')).toEqual({ o1: { a: 1 }, o2: { b: 2 } });
    expect(run(S_OBJ2, '{{o1: {a: 1}, o2: {b: 2}}}'))
      .toEqual({ o1: { o1: { a: 1 }, o2: { b: 2 } } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ISSUE-15 — UNRESOLVED. Asserted against CURRENT behavior so a rule change fails loudly.
// ─────────────────────────────────────────────────────────────────────────────
describe('ISSUE-15 (FIXED for closed schemas): lone-object reading is arity-independent', () => {
  test('closed schemas agree at every arity — the fix', () => {
    const expected = { o1: { key: 'val' } };
    expect(run('~ $schema: {o1: object}', '{key: val}')).toEqual(expected);              // 1 member
    expect(run('~ $schema: {o1: object, o2?: object}', '{key: val}')).toEqual(expected); // 2 members
    expect(run('~ $schema: {o1: object, o2?: object, o3?: object}', '{key: val}'))
      .toEqual(expected);                                                                // 3 members
  });

  test('single-member object schema: whole record is absorbed as the member value', () => {
    expect(run('~ $schema: {o1: object}', 'key: val')).toEqual({ o1: { key: 'val' } });
    expect(run('~ $schema: {o1: object}', '{key: val}')).toEqual({ o1: { key: 'val' } });
    // …and it collapses with the correctly-enclosed form — three spellings, one result.
    expect(run('~ $schema: {o1: object}', '{{key: val}}')).toEqual({ o1: { key: 'val' } });
  });

  test('REMAINING difference: open schemas still depend on declared-member count', () => {
    // With `*`, an undeclared key is a LEGAL extra member, so there is nothing to disambiguate —
    // except in the single-declared-member case, whose long-standing behavior is preserved.
    expect(run('~ $schema: {o1: object, *}', '{key: val}')).toEqual({ o1: { key: 'val' } });
    expect(run('~ $schema: {a: string, b: number, *}', '{extra: 1, a: x, b: 2}'))
      .toEqual({ extra: 1, a: 'x', b: 2 });
  });

  test('single-member object schema absorbs multi-member records too', () => {
    expect(run('~ $schema: {o1: object}', 'a: 1, b: 2')).toEqual({ o1: { a: 1, b: 2 } });
    expect(run('~ $schema: {o1: object}', '{a: 1, b: 2}')).toEqual({ o1: { a: 1, b: 2 } });
  });

  test('single-member SCALAR schema absorbs the whole record too (type error, not unknown-member)', () => {
    // Evidence the fallback is not object-specific: the record object is bound to `a: string`.
    expect(run('~ $schema: {a: string}', 'key: val')).toBe('THROW:not-a-string');
  });

  test('open schema with an object first member also absorbs the whole record', () => {
    expect(run('~ $schema: {o1: object, *}', 'key: val')).toEqual({ o1: { key: 'val' } });
    expect(run('~ $schema: {o1: object, *}', '{key: val}')).toEqual({ o1: { key: 'val' } });
    expect(run('~ $schema: {o1: object, *}', '{{key: val}}')).toEqual({ o1: { key: 'val' } });
  });

  test('a fully open schema keeps the canonical record reading', () => {
    expect(run('~ $schema: {*}', 'key: val')).toEqual({ key: 'val' });
    expect(run('~ $schema: {*}', '{key: val}')).toEqual({ key: 'val' });
    expect(run('~ $schema: {*}', '{{key: val}}')).toEqual({ '0': { key: 'val' } });
  });

  test('schema-ref member shows the same collapse', () => {
    const hdr = '~ $inner: {k: string}\n~ $schema: {o1: $inner}';
    const expected = { o1: { k: 'v' } };
    expect(run(hdr, 'k: v')).toEqual(expected);
    expect(run(hdr, '{k: v}')).toEqual(expected);
    expect(run(hdr, '{{k: v}}')).toEqual(expected);
    expect(run(hdr, '{o1: {k: v}}')).toEqual(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Remaining members are still validated when the row is absorbed into member 0.
//    (Regression: the absorption path used to bind member 0 and return, silently skipping
//    required-member checks and `default` values for every other member.)
// ─────────────────────────────────────────────────────────────────────────────
describe('absorption path still honors the REST of the schema', () => {
  test('a missing REQUIRED object member errors', () => {
    expect(run('~ $schema: {o1: object, o2: object}', '{key: val}')).toBe('THROW:value-required');
  });

  test('a missing REQUIRED scalar member errors', () => {
    expect(run('~ $schema: {o1: object, n: number}', '{key: val}')).toBe('THROW:value-required');
  });

  test('a missing OPTIONAL member is fine', () => {
    expect(run('~ $schema: {o1: object, o2?: object}', '{key: val}')).toEqual({ o1: { key: 'val' } });
  });

  test('a missing member with a DEFAULT gets its default', () => {
    expect(run('~ $schema: {o1: object, n: {number, default: 7}}', '{key: val}'))
      .toEqual({ o1: { key: 'val' }, n: 7 });
  });

  test('required checks match the non-absorbed path', () => {
    // Same schema, explicitly enclosed row — must reach the same verdict.
    expect(run('~ $schema: {o1: object, o2: object}', '{{key: val}}')).toBe('THROW:value-required');
  });

  test('data consumed by absorption is not re-bound to a later member', () => {
    // The whole row became o1's value; `o2` must NOT be harvested from inside it.
    expect(run('~ $schema: {o1: object, o2: object}', '{key: val, o2: {b: 2}}'))
      .toBe('THROW:value-required');
  });
});
