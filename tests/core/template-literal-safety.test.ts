import { describe, it, expect } from 'vitest';
import io from '../../src/index';
import { toIOLiteral } from '../../src/template-literal';
import { parse } from '../../src/index';
import Decimal from '../../src/core/decimal/decimal';

/**
 * A1 — an interpolated value can never become syntax.
 *
 * The tags used to build their source by raw concatenation, so anything in a variable was pasted in
 * as CODE. Ordinary data then rewrote the document's structure — a name with a comma split into two
 * members, `'1,000'` became `1`, a URL returned `null` for the whole document. Three corrupted
 * silently, three returned null, none threw. Only a value with no comma or colon survived, which is
 * why every hand-written example passed and the bug shipped.
 *
 * The contract these tests pin: **`${…}` is always a value.** No exceptions, and no `io.raw` escape
 * — see `.private/decisions/0005-public-api-plain-by-default.md` §5.
 */
describe('template tags: interpolation is always a value', () => {
  describe('the values that used to corrupt', () => {
    const cases: Array<[string, string]> = [
      ['a name with a comma', 'Smith, John'],
      ['a city', 'Paris, France'],
      ['a formatted quantity', '1,000'],
      ['a time', '12:30'],
      ['a URL', 'https://x.com'],
      ['a note with a colon', 'Meeting: 3pm'],
      ['a value with nothing special', 'Alice'],
    ];

    for (const [why, value] of cases) {
      it(`${why}: ${JSON.stringify(value)} stays one member`, () => {
        const obj = (io as any).object`name: ${value}, age: 30`;
        expect(obj.toObject()).toEqual({ name: value, age: 30 });
      });
    }
  });

  it('cannot inject a member', () => {
    // Previously produced { name: 'Alice', role: 'admin', age: 30 }.
    const hostile = 'Alice, role: admin';
    const obj = (io as any).object`name: ${hostile}, age: 30`;
    expect(obj.toObject()).toEqual({ name: hostile, age: 30 });
  });

  it('cannot inject a section break', () => {
    const hostile = 'Bob\n---\n~ injected';
    const obj = (io as any).object`name: ${hostile}`;
    expect(obj.toObject()).toEqual({ name: hostile });
  });

  it('applies to every tag, since they share one builder', () => {
    const value = 'Smith, John';
    expect((io as any).doc`name: ${value}`.toObject()).toEqual({ name: value });
    expect((io as any).object`name: ${value}`.toObject()).toEqual({ name: value });
  });

  it('leaves documents without interpolation untouched', () => {
    expect((io as any).object`name: Alice, age: 30`.toObject()).toEqual({ name: 'Alice', age: 30 });
  });
});

describe('toIOLiteral round-trips every value kind', () => {
  const roundTrip = (v: any) => (parse(`v: ${toIOLiteral(v)}`) as any).toObject().v;

  it('strings, including ones full of syntax characters', () => {
    for (const s of ['Smith, John', '12:30', 'https://x.com', '1,000', "it's", 'say "hi"', '', 'a\nb']) {
      expect(roundTrip(s)).toBe(s);
    }
  });

  it('numbers, booleans and null', () => {
    expect(roundTrip(42)).toBe(42);
    expect(roundTrip(-3.5)).toBe(-3.5);
    expect(roundTrip(true)).toBe(true);
    expect(roundTrip(false)).toBe(false);
    expect(roundTrip(null)).toBe(null);
  });

  it('undefined becomes null — a value, not a disappearance', () => {
    // The old behaviour spliced '' for undefined, which is the raw-splice mechanism itself.
    expect(toIOLiteral(undefined)).toBe('N');
    expect(roundTrip(undefined)).toBe(null);
  });

  it('keeps bigint and decimal from decaying into numbers', () => {
    expect(toIOLiteral(900719925474099100n)).toBe('900719925474099100n');
    expect(roundTrip(900719925474099100n)).toBe(900719925474099100n);
    expect(toIOLiteral(new Decimal('10.50'))).toBe('10.50m');
    expect(String(roundTrip(new Decimal('10.50')))).toBe('10.50');
  });

  it('dates survive as the same instant, whatever the machine timezone', () => {
    // Formatted in UTC deliberately: a date-only literal parses back as UTC midnight, so formatting
    // from local time would shift the value by the machine's offset.
    for (const d of [
      new Date(2024, 2, 1),                        // local midnight
      new Date(2024, 2, 1, 14, 30, 5),             // local, with a time
      new Date(Date.UTC(2024, 2, 1)),              // UTC midnight -> short form
      new Date(Date.UTC(2024, 2, 1, 9, 0, 0, 123)) // sub-second precision
    ]) {
      const back = roundTrip(d);
      expect(back).toBeInstanceOf(Date);
      expect(+back).toBe(+d);
    }
    expect(toIOLiteral(new Date(Date.UTC(2024, 2, 1)))).toBe("d'2024-03-01'");
  });

  it('arrays and objects keep their contents and their keys', () => {
    expect(roundTrip(['a, b', 'c'])).toEqual(['a, b', 'c']);
    expect(roundTrip({ city: 'NYC', zip: '10001' })).toEqual({ city: 'NYC', zip: '10001' });
    expect(roundTrip({ a: { b: 'x, y' } })).toEqual({ a: { b: 'x, y' } });
  });
});
