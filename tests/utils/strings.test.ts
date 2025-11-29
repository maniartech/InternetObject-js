
import { toAutoString, toOpenString, toRegularString, toRawString } from '../../src/utils/strings';

describe('String Utilities', () => {
  describe('toAutoString', () => {
    it('should return open string for simple values', () => {
      expect(toAutoString('hello', false)).toBe('hello');
      expect(toAutoString('world', false)).toBe('world');
      expect(toAutoString('user_name', false)).toBe('user_name');
    });

    it('should quote ambiguous values (numbers)', () => {
      expect(toAutoString('123', false)).toBe('"123"');
      expect(toAutoString('-123', false)).toBe('"-123"');
      expect(toAutoString('1.0', false)).toBe('"1.0"');
      expect(toAutoString('0.5', false)).toBe('"0.5"');
      expect(toAutoString('1e5', false)).toBe('"1e5"');
    });

    it('should quote ambiguous values (booleans)', () => {
      expect(toAutoString('true', false)).toBe('"true"');
      expect(toAutoString('false', false)).toBe('"false"');
      expect(toAutoString('T', false)).toBe('"T"');
      expect(toAutoString('F', false)).toBe('"F"');
    });

    it('should quote ambiguous values (null/undefined)', () => {
      expect(toAutoString('null', false)).toBe('"null"');
      expect(toAutoString('N', false)).toBe('"N"');
      expect(toAutoString('undefined', false)).toBe('"undefined"');
    });

    it('should quote ambiguous values (dates)', () => {
      expect(toAutoString('2021-01-01', false)).toBe('"2021-01-01"');
      expect(toAutoString('12:00:00', false)).toBe('"12:00:00"');
      expect(toAutoString('2021-01-01T12:00:00Z', false)).toBe('"2021-01-01T12:00:00Z"');
    });

    it('should quote strings with commas for readability', () => {
      // Commas are quoted instead of escaped for better readability
      expect(toAutoString('hello, world', false)).toBe('"hello, world"');
      expect(toAutoString('[1,2]', false)).toBe('"[1,2]"');
    });

    it('should escape other structural characters as open string', () => {
      // Other structural characters like : { } [ ] are escaped in open strings
      expect(toAutoString('key:value', false)).toBe('key\\:value');
      expect(toAutoString('{a:1}', false)).toBe('\\{a\\:1\\}');
    });

    it('should use raw string for values with escape characters', () => {
      expect(toAutoString('line1\nline2', false)).toBe('r"line1\nline2"');
      expect(toAutoString('tab\tvalue', false)).toBe('r"tab\tvalue"');
    });

    it('should handle empty string', () => {
      expect(toAutoString('', false)).toBe('""');
    });
  });

  describe('toOpenString', () => {
    it('should escape structural characters except comma', () => {
      expect(toOpenString('hello, world', false)).toBe('hello, world'); // comma is NOT escaped
      expect(toOpenString('key:value', false)).toBe('key\\:value');
    });
  });

  describe('toRegularString', () => {
    it('should quote and escape', () => {
      expect(toRegularString('hello', false)).toBe('"hello"');
      expect(toRegularString('hello "world"', false)).toBe('"hello \\"world\\""');
    });
  });

  describe('toRawString', () => {
    it('should use raw format', () => {
      expect(toRawString('hello', '"')).toBe('r"hello"');
      expect(toRawString('line1\nline2', '"')).toBe('r"line1\nline2"');
    });
  });
});
