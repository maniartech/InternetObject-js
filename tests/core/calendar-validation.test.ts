import { describe, it, expect } from 'vitest';
import { parseDate, parseDateTime, parseTime } from '../../src/utils/datetime';

/**
 * A temporal literal must name a real day, or be rejected.
 *
 * The regexes check the SHAPE of each field — month 01..12, day 00..31 — which is a lexical range
 * and not a calendar. Everything they let through went straight to `new Date()`, which does not
 * reject an impossible date: it ROLLS OVER. So `d"2024-04-31"` loaded as 2024-05-01 and
 * `d"2023-02-29"` as 2023-03-01, silently, with nothing raised. The document said one date and the
 * value model held another.
 *
 * That is the worst failure mode this format has, and it was a guaranteed divergence for a port:
 * Go's `time.Parse` and Python's `datetime` both REJECT April 31 rather than moving it. The
 * specification agrees — "the content between the quotes must be valid for its kind".
 *
 * ISSUE-22, open since 2026-08-21 and flagged in the corpus as "pinned as observed, not endorsed".
 */

describe('calendar validation', () => {
  describe('month lengths', () => {
    const valid = ['2024-01-31', '2024-03-31', '2024-04-30', '2024-06-30', '2024-12-31'];
    const invalid = ['2024-04-31', '2024-06-31', '2024-09-31', '2024-11-31'];

    for (const d of valid) it(`accepts ${d}`, () => expect(parseDate(d)).not.toBeNull());
    for (const d of invalid) it(`rejects ${d}`, () => expect(parseDate(d)).toBeNull());
  });

  describe('leap years — the rule is not divisible-by-four', () => {
    it('accepts Feb 29 in an ordinary leap year', () => {
      expect(parseDate('2024-02-29')).not.toBeNull();
    });
    it('rejects Feb 29 in a common year', () => {
      expect(parseDate('2023-02-29')).toBeNull();
    });
    it('rejects Feb 29 in 1900 — divisible by 100, not by 400', () => {
      expect(parseDate('1900-02-29')).toBeNull();
    });
    it('accepts Feb 29 in 2000 — divisible by 400', () => {
      expect(parseDate('2000-02-29')).not.toBeNull();
    });
    it('accepts Feb 28 in any year', () => {
      expect(parseDate('2023-02-28')).not.toBeNull();
    });
  });

  describe('day and month zero are not days or months', () => {
    it('rejects day 00', () => expect(parseDate('2024-01-00')).toBeNull());
    it('rejects month 00', () => expect(parseDate('2024-00-15')).toBeNull());
  });

  describe('partial dates still default', () => {
    it('accepts a year alone', () => expect(parseDate('2024')).not.toBeNull());
    it('accepts a year and month', () => expect(parseDate('2024-04')).not.toBeNull());
  });

  describe('a timezone offset may legitimately cross the day boundary', () => {
    // This is why the check runs on the date FIELDS rather than on the constructed Date: these
    // are valid instants whose UTC day differs from the written one, and comparing the built
    // Date's UTC components against the written ones would reject them.
    it('accepts an instant that is the previous day in UTC', () => {
      const d = parseDateTime('2024-03-20T01:00:00.000+05:30');
      expect(d).not.toBeNull();
      expect(d!.toISOString()).toBe('2024-03-19T19:30:00.000Z');
    });
    it('accepts an instant that is the next day in UTC', () => {
      const d = parseDateTime('2024-03-20T23:00:00.000-08:00');
      expect(d).not.toBeNull();
      expect(d!.toISOString()).toBe('2024-03-21T07:00:00.000Z');
    });
    it('still rejects an impossible date carrying an offset', () => {
      expect(parseDateTime('2024-04-31T00:00:00.000+05:30')).toBeNull();
    });
  });

  describe('no parser may return an Invalid Date', () => {
    // An Invalid Date serializes to nothing and compares equal to nothing, itself included. It
    // crashed the corpus generator, which is how day 00 was found.
    const probes = ['2024-01-00', '2024-04-31', '2023-02-29'];
    for (const p of probes) {
      it(`${p} yields null, never an Invalid Date`, () => {
        for (const parsed of [parseDate(p), parseDateTime(p)]) {
          expect(parsed === null || !Number.isNaN(parsed.getTime())).toBe(true);
        }
      });
    }
    it('a time is never an Invalid Date either', () => {
      const t = parseTime('23:59:59.999');
      expect(t).not.toBeNull();
      expect(Number.isNaN(t!.getTime())).toBe(false);
    });
  });
});
