import { describe, test, expect } from 'vitest';
import parse from '../../src/parser/index';

/**
 * ISSUE-18 — a second unnamed section used to destroy the first.
 *
 * The rules (io-specs):
 *  - `the-structure/introduction/data.md` — each section MUST have a unique name; a bare `---`
 *    defaults to the name `data`; the name may be omitted only once per document.
 *  - `parsing-and-errors/error-accumulation.md` — a duplicate name is auto-renamed
 *    (`users` -> `users_2` -> `users_3`) so the rest of the document still loads.
 *
 * The renamed value used to be written back only onto a name TOKEN, which an unnamed section
 * does not have; its name was then re-derived as the default, so two sections reported the same
 * name and the object projection silently overwrote the first.
 */

const doc = (src: string) => parse(src, null) as any;
const names = (d: any) =>
  Array.from({ length: d.sections?.length ?? 0 }, (_, i) => String(d.sections.get(i).name));
const codes = (d: any) => d.getErrors().map((e: any) => e.errorCode);

describe('a bare `---` section is named `data`', () => {
  test('the default name comes from the spec, not an internal placeholder', () => {
    expect(names(doc('---\n~ Alice'))).toEqual(['data']);
  });

  test('a lone section still projects as a bare collection, not keyed by name', () => {
    expect(doc('---\n~ Alice\n~ Bob').toJSON()).toEqual([{ '0': 'Alice' }, { '0': 'Bob' }]);
  });
});

describe('duplicate section names are recovered by renaming, never by dropping', () => {
  test('two unnamed sections both survive', () => {
    const d = doc('---\n~ Alice\n---\n~ Bob');
    expect(names(d)).toEqual(['data', 'data_2']);
    expect(d.toJSON()).toEqual({ data: [{ '0': 'Alice' }], data_2: [{ '0': 'Bob' }] });
  });

  test('the rename counts upward past the second collision', () => {
    const d = doc('---\n~ A\n---\n~ B\n---\n~ C');
    expect(names(d)).toEqual(['data', 'data_2', 'data_3']);
    expect(Object.keys(d.toJSON())).toEqual(['data', 'data_2', 'data_3']);
  });

  test('named duplicates behave identically — the two paths agree', () => {
    const d = doc('--- users\n~ Alice\n--- users\n~ Bob');
    expect(names(d)).toEqual(['users', 'users_2']);
    expect(d.toJSON()).toEqual({ users: [{ '0': 'Alice' }], users_2: [{ '0': 'Bob' }] });
  });

  test('an invalid document still reports the error while loading the data', () => {
    // Recovery is not forgiveness: the document is invalid per the uniqueness rule, and the
    // error must be visible even though every record was preserved. The code is STRUCTURAL --
    // `unexpected-token` used to send consumers hunting for a bad character that never existed.
    expect(codes(doc('---\n~ Alice\n---\n~ Bob'))).toEqual(['duplicate-section-name']);
    expect(codes(doc('--- users\n~ Alice\n--- users\n~ Bob'))).toEqual(['duplicate-section-name']);
    expect(codes(doc('---\n~ A\n---\n~ B\n---\n~ C')))
      .toEqual(['duplicate-section-name', 'duplicate-section-name']);
  });
});

describe('the duplicate error carries a position', () => {
  // A positionless error is trivially dropped by a consumer: the playground filtered exactly
  // those out of its problem list, so this error was raised but never shown to anyone.
  const locations = (src: string) =>
    doc(src).getErrors().map((e: any) => e.positionRange ? `${e.positionRange.row}:${e.positionRange.col}` : 'NO-POSITION');

  test('an unnamed duplicate points at the start of the offending section', () => {
    expect(locations('---\n~ Alice\n---\n~ Bob')).toEqual(['4:1']);
  });

  test('a named duplicate points at the name itself', () => {
    expect(locations('--- users\n~ A\n--- users\n~ B')).toEqual(['3:5']);
  });

  test('each duplicate gets its own position', () => {
    expect(locations('---\n~ A\n---\n~ B\n---\n~ C')).toEqual(['4:1', '6:1']);
  });
});

describe('legal documents are untouched', () => {
  test('distinct names produce no error', () => {
    const d = doc('--- a\n~ Alice\n--- b\n~ Bob');
    expect(codes(d)).toEqual([]);
    expect(d.toJSON()).toEqual({ a: [{ '0': 'Alice' }], b: [{ '0': 'Bob' }] });
  });

  test('one unnamed section alongside a named one is legal — the name is omitted only once', () => {
    const d = doc('---\n~ Alice\n--- b\n~ Bob');
    expect(codes(d)).toEqual([]);
    expect(names(d)).toEqual(['data', 'b']);
  });

  test('a schema-bound section takes its name from the schema, so `---` twice is fine', () => {
    const d = doc('~ $a: {n: string}\n~ $b: {n: string}\n--- $a\n~ Alice\n--- $b\n~ Bob');
    expect(codes(d)).toEqual([]);
    expect(names(d)).toEqual(['a', 'b']);
  });
});
