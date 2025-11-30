/**
 * Comprehensive tests for string ambiguity detection and quoting behavior.
 *
 * These tests ensure that strings which LOOK LIKE other data types are properly
 * quoted during serialization to preserve their string type on round-trip.
 *
 * Policy: If the type is `string` but the value looks like either number, bool,
 * null, or contains special structural characters, it MUST be stringified as
 * a regular string with quotes.
 */

import { toAutoString } from '../../src/utils/strings';
import { needsQuoting } from '../../src/utils/string-formatter';

describe('String Ambiguity Detection', () => {

  describe('looksLikeNumber - comprehensive cases', () => {

    describe('pure digit strings (most common case)', () => {
      it('should quote strings that are pure digits', () => {
        // These are the most common cases - IDs, codes, etc.
        expect(toAutoString('0', false)).toBe('"0"');
        expect(toAutoString('1', false)).toBe('"1"');
        expect(toAutoString('9', false)).toBe('"9"');
        expect(toAutoString('10', false)).toBe('"10"');
        expect(toAutoString('99', false)).toBe('"99"');
        expect(toAutoString('100', false)).toBe('"100"');
        expect(toAutoString('999', false)).toBe('"999"');
        expect(toAutoString('1000', false)).toBe('"1000"');
        expect(toAutoString('9999', false)).toBe('"9999"');
      });

      it('should quote strings with leading zeros', () => {
        // Leading zeros are NOT valid JSON numbers but LOOK like numbers
        expect(toAutoString('00', false)).toBe('"00"');
        expect(toAutoString('01', false)).toBe('"01"');
        expect(toAutoString('001', false)).toBe('"001"');
        expect(toAutoString('0001', false)).toBe('"0001"');
        expect(toAutoString('00001', false)).toBe('"00001"');
        expect(toAutoString('007', false)).toBe('"007"');
        expect(toAutoString('0123', false)).toBe('"0123"');
      });

      it('should quote typical ID-like strings', () => {
        // These are the specific cases from the original bug report
        expect(toAutoString('0001', false)).toBe('"0001"');
        expect(toAutoString('1001', false)).toBe('"1001"');
        expect(toAutoString('1002', false)).toBe('"1002"');
        expect(toAutoString('5001', false)).toBe('"5001"');
        expect(toAutoString('5002', false)).toBe('"5002"');
      });
    });

    describe('negative number-like strings', () => {
      it('should quote strings starting with minus followed by digit', () => {
        expect(toAutoString('-0', false)).toBe('"-0"');
        expect(toAutoString('-1', false)).toBe('"-1"');
        expect(toAutoString('-9', false)).toBe('"-9"');
        expect(toAutoString('-10', false)).toBe('"-10"');
        expect(toAutoString('-100', false)).toBe('"-100"');
        expect(toAutoString('-999', false)).toBe('"-999"');
        expect(toAutoString('-42', false)).toBe('"-42"');
        expect(toAutoString('-123', false)).toBe('"-123"');
      });

      it('should NOT quote strings that are just minus', () => {
        // A lone minus is not a number
        expect(toAutoString('-', false)).toBe('-');
      });

      it('should NOT quote strings where minus is followed by non-digit', () => {
        expect(toAutoString('-abc', false)).toBe('-abc');
        expect(toAutoString('-hello', false)).toBe('-hello');
      });
    });

    describe('positive sign strings', () => {
      it('should quote strings starting with plus followed by digit', () => {
        expect(toAutoString('+0', false)).toBe('"+0"');
        expect(toAutoString('+1', false)).toBe('"+1"');
        expect(toAutoString('+9', false)).toBe('"+9"');
        expect(toAutoString('+10', false)).toBe('"+10"');
        expect(toAutoString('+100', false)).toBe('"+100"');
        expect(toAutoString('+42', false)).toBe('"+42"');
      });

      it('should NOT quote strings that are just plus', () => {
        expect(toAutoString('+', false)).toBe('+');
      });

      it('should NOT quote strings where plus is followed by non-digit', () => {
        expect(toAutoString('+abc', false)).toBe('+abc');
        expect(toAutoString('+hello', false)).toBe('+hello');
      });
    });

    describe('decimal number-like strings', () => {
      it('should quote strings with decimal point', () => {
        expect(toAutoString('0.0', false)).toBe('"0.0"');
        expect(toAutoString('0.5', false)).toBe('"0.5"');
        expect(toAutoString('1.0', false)).toBe('"1.0"');
        expect(toAutoString('3.14', false)).toBe('"3.14"');
        expect(toAutoString('99.99', false)).toBe('"99.99"');
        expect(toAutoString('123.456', false)).toBe('"123.456"');
      });

      it('should quote strings starting with decimal point followed by digit', () => {
        expect(toAutoString('.0', false)).toBe('".0"');
        expect(toAutoString('.1', false)).toBe('".1"');
        expect(toAutoString('.5', false)).toBe('".5"');
        expect(toAutoString('.123', false)).toBe('".123"');
        expect(toAutoString('.999', false)).toBe('".999"');
      });

      it('should NOT quote strings that are just a dot', () => {
        expect(toAutoString('.', false)).toBe('.');
      });

      it('should NOT quote strings where dot is followed by non-digit', () => {
        expect(toAutoString('.abc', false)).toBe('.abc');
        expect(toAutoString('.hello', false)).toBe('.hello');
      });

      it('should quote negative decimals', () => {
        expect(toAutoString('-0.5', false)).toBe('"-0.5"');
        expect(toAutoString('-.5', false)).toBe('"-.5"');
        expect(toAutoString('-3.14', false)).toBe('"-3.14"');
      });

      it('should quote positive sign decimals', () => {
        expect(toAutoString('+0.5', false)).toBe('"+0.5"');
        expect(toAutoString('+.5', false)).toBe('"+.5"');
        expect(toAutoString('+3.14', false)).toBe('"+3.14"');
      });
    });

    describe('scientific notation-like strings', () => {
      it('should quote scientific notation strings', () => {
        // These start with a digit, so they're caught by the digit check
        expect(toAutoString('1e5', false)).toBe('"1e5"');
        expect(toAutoString('1E5', false)).toBe('"1E5"');
        expect(toAutoString('1e-5', false)).toBe('"1e-5"');
        expect(toAutoString('1E+5', false)).toBe('"1E+5"');
        expect(toAutoString('2.5e10', false)).toBe('"2.5e10"');
        expect(toAutoString('6.022e23', false)).toBe('"6.022e23"');
      });
    });

    describe('strings that do NOT look like numbers', () => {
      it('should NOT quote alphabetic strings', () => {
        expect(toAutoString('hello', false)).toBe('hello');
        expect(toAutoString('world', false)).toBe('world');
        expect(toAutoString('abc', false)).toBe('abc');
        expect(toAutoString('ABC', false)).toBe('ABC');
      });

      it('should NOT quote strings starting with letters then digits', () => {
        expect(toAutoString('a1', false)).toBe('a1');
        expect(toAutoString('abc123', false)).toBe('abc123');
        expect(toAutoString('user001', false)).toBe('user001');
        expect(toAutoString('ID_1001', false)).toBe('ID_1001');  // underscore is NOT a structural char
      });

      it('should NOT quote mixed alphanumeric starting with letter', () => {
        expect(toAutoString('x1y2z3', false)).toBe('x1y2z3');
        expect(toAutoString('version2', false)).toBe('version2');
      });
    });
  });

  describe('Boolean-like strings', () => {
    it('should quote "true" and "false"', () => {
      expect(toAutoString('true', false)).toBe('"true"');
      expect(toAutoString('false', false)).toBe('"false"');
    });

    it('should quote "T" and "F" (IO short forms)', () => {
      expect(toAutoString('T', false)).toBe('"T"');
      expect(toAutoString('F', false)).toBe('"F"');
    });

    it('should NOT quote similar but different strings', () => {
      expect(toAutoString('True', false)).toBe('True');   // Capital T, not exact match
      expect(toAutoString('False', false)).toBe('False'); // Capital F, not exact match
      expect(toAutoString('TRUE', false)).toBe('TRUE');
      expect(toAutoString('FALSE', false)).toBe('FALSE');
      expect(toAutoString('yes', false)).toBe('yes');
      expect(toAutoString('no', false)).toBe('no');
    });
  });

  describe('Null-like strings', () => {
    it('should quote "null" and "N"', () => {
      expect(toAutoString('null', false)).toBe('"null"');
      expect(toAutoString('N', false)).toBe('"N"');
    });

    it('should quote "undefined"', () => {
      expect(toAutoString('undefined', false)).toBe('"undefined"');
    });

    it('should NOT quote similar but different strings', () => {
      expect(toAutoString('Null', false)).toBe('Null');
      expect(toAutoString('NULL', false)).toBe('NULL');
      expect(toAutoString('nil', false)).toBe('nil');
      expect(toAutoString('none', false)).toBe('none');
    });
  });

  describe('Special number strings', () => {
    it('should quote Infinity representations', () => {
      expect(toAutoString('Inf', false)).toBe('"Inf"');
      expect(toAutoString('+Inf', false)).toBe('"+Inf"');
      expect(toAutoString('-Inf', false)).toBe('"-Inf"');
    });

    it('should quote NaN', () => {
      expect(toAutoString('NaN', false)).toBe('"NaN"');
    });
  });

  describe('Date/Time-like strings', () => {
    it('should quote date-like strings (YYYY-MM-DD)', () => {
      expect(toAutoString('2024-01-15', false)).toBe('"2024-01-15"');
      expect(toAutoString('2000-12-31', false)).toBe('"2000-12-31"');
      expect(toAutoString('1999-01-01', false)).toBe('"1999-01-01"');
    });

    it('should quote time-like strings (HH:MM:SS)', () => {
      expect(toAutoString('10:30:00', false)).toBe('"10:30:00"');
      expect(toAutoString('23:59:59', false)).toBe('"23:59:59"');
      expect(toAutoString('00:00:00', false)).toBe('"00:00:00"');
    });

    it('should quote datetime-like strings', () => {
      expect(toAutoString('2024-01-15T10:30:00', false)).toBe('"2024-01-15T10:30:00"');
      expect(toAutoString('2024-01-15T10:30:00Z', false)).toBe('"2024-01-15T10:30:00Z"');
      expect(toAutoString('2024-01-15 10:30:00', false)).toBe('"2024-01-15 10:30:00"');
    });
  });

  describe('Empty and whitespace strings', () => {
    it('should quote empty string', () => {
      expect(toAutoString('', false)).toBe('""');
    });

    // Note: strings with whitespace may be handled differently (escaped vs quoted)
    // These tests verify the current behavior
  });

  describe('needsQuoting function', () => {
    it('should return true for numeric-looking strings', () => {
      expect(needsQuoting('0')).toBe(true);
      expect(needsQuoting('123')).toBe(true);
      expect(needsQuoting('0001')).toBe(true);
      expect(needsQuoting('1001')).toBe(true);
      expect(needsQuoting('-42')).toBe(true);
      expect(needsQuoting('+42')).toBe(true);
      expect(needsQuoting('.5')).toBe(true);
      expect(needsQuoting('3.14')).toBe(true);
    });

    it('should return true for boolean-like strings', () => {
      expect(needsQuoting('T')).toBe(true);
      expect(needsQuoting('F')).toBe(true);
      expect(needsQuoting('true')).toBe(true);
      expect(needsQuoting('false')).toBe(true);
    });

    it('should return true for null-like strings', () => {
      expect(needsQuoting('N')).toBe(true);
      expect(needsQuoting('null')).toBe(true);
      expect(needsQuoting('undefined')).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(needsQuoting('')).toBe(true);
    });

    it('should return true for strings with whitespace', () => {
      expect(needsQuoting('hello world')).toBe(true);
      expect(needsQuoting(' hello')).toBe(true);
      expect(needsQuoting('hello ')).toBe(true);
    });

    it('should return true for strings with structural characters', () => {
      expect(needsQuoting('a,b')).toBe(true);
      expect(needsQuoting('[1]')).toBe(true);
      expect(needsQuoting('{a}')).toBe(true);
      expect(needsQuoting('a:b')).toBe(true);
    });

    it('should return false for safe identifier strings', () => {
      expect(needsQuoting('hello')).toBe(false);
      expect(needsQuoting('world')).toBe(false);
      expect(needsQuoting('abc123')).toBe(false);
      expect(needsQuoting('user_name')).toBe(false);
    });
  });
});

describe('Round-trip safety for ambiguous strings', () => {
  // These tests use toAutoString directly to verify the quoting behavior
  // that ensures round-trip safety

  it('should maintain string type for ID-like values through serialization', () => {
    const ids = ['0001', '1001', '1002', '5001', '5002'];

    for (const id of ids) {
      const serialized = toAutoString(id, false);
      // Must be quoted to prevent parsing as number
      expect(serialized).toBe(`"${id}"`);
    }
  });

  it('should maintain string type for boolean keywords through serialization', () => {
    const keywords = ['true', 'false', 'T', 'F'];

    for (const kw of keywords) {
      const serialized = toAutoString(kw, false);
      expect(serialized).toBe(`"${kw}"`);
    }
  });

  it('should maintain string type for null keywords through serialization', () => {
    const keywords = ['null', 'N', 'undefined'];

    for (const kw of keywords) {
      const serialized = toAutoString(kw, false);
      expect(serialized).toBe(`"${kw}"`);
    }
  });

  it('should NOT quote regular string identifiers', () => {
    const identifiers = ['hello', 'world', 'userName', 'firstName', 'lastName'];

    for (const id of identifiers) {
      const serialized = toAutoString(id, false);
      // Should NOT be quoted
      expect(serialized).toBe(id);
    }
  });
});
