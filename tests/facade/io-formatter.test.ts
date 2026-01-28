import { describe, it, expect } from 'vitest';
import { formatRecord, formatCollection, createIndentString, FormatContext } from '../../src/serializer/io-formatter';
import InternetObject from '../../src/core/internet-object';
import { loadInferred, stringify, parse } from '../../src/index';

describe('IO Formatter', () => {
  describe('createIndentString', () => {
    it('should return empty string for undefined', () => {
      expect(createIndentString(undefined)).toBe('');
    });

    it('should return spaces for number', () => {
      expect(createIndentString(2)).toBe('  ');
      expect(createIndentString(4)).toBe('    ');
    });

    it('should return string as-is', () => {
      expect(createIndentString('\t')).toBe('\t');
      expect(createIndentString('    ')).toBe('    ');
    });
  });

  describe('formatRecord - compact mode', () => {
    it('should format simple object compactly', () => {
      const obj = new InternetObject();
      obj.set('name', 'John');
      obj.set('age', 25);

      const ctx: FormatContext = {
        indentStr: '',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);
      expect(result).toBe('John, 25');
    });

    it('should format object with nested object compactly', () => {
      const address = new InternetObject();
      address.set('street', 'Bond Street');
      address.set('city', 'New York');

      const obj = new InternetObject();
      obj.set('name', 'John');
      obj.set('age', 25);
      obj.set('address', address);

      const ctx: FormatContext = {
        indentStr: '',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);
      expect(result).toBe('John, 25, {Bond Street, New York}');
    });

    it('should format object with array of primitives compactly', () => {
      const obj = new InternetObject();
      obj.set('name', 'John');
      obj.set('colors', ['red', 'blue', 'green']);

      const ctx: FormatContext = {
        indentStr: '',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);
      expect(result).toBe('John, [red, blue, green]');
    });

    it('should format object with array of objects compactly', () => {
      const item1 = new InternetObject();
      item1.set('id', 1);
      item1.set('name', 'Apple');

      const item2 = new InternetObject();
      item2.set('id', 2);
      item2.set('name', 'Banana');

      const obj = new InternetObject();
      obj.set('order', 'ORD001');
      obj.set('items', [item1, item2]);

      const ctx: FormatContext = {
        indentStr: '',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);
      expect(result).toBe('ORD001, [{1, Apple}, {2, Banana}]');
    });
  });

  describe('formatRecord - formatted mode', () => {
    it('should add spaces inside braces for simple nested objects', () => {
      const address = new InternetObject();
      address.set('street', 'Bond Street');
      address.set('city', 'New York');

      const obj = new InternetObject();
      obj.set('name', 'John');
      obj.set('age', 25);
      obj.set('address', address);

      const ctx: FormatContext = {
        indentStr: '  ',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);
      expect(result).toBe('John, 25, { Bond Street, New York }');
    });

    it('should add spaces inside brackets for array of primitives', () => {
      const obj = new InternetObject();
      obj.set('name', 'John');
      obj.set('colors', ['red', 'blue', 'green']);

      const ctx: FormatContext = {
        indentStr: '  ',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);
      expect(result).toBe('John, [ red, blue, green ]');
    });

    it('should expand array of objects with each item on its own line', () => {
      const item1 = new InternetObject();
      item1.set('id', 1);
      item1.set('name', 'Apple');

      const item2 = new InternetObject();
      item2.set('id', 2);
      item2.set('name', 'Banana');

      const obj = new InternetObject();
      obj.set('order', 'ORD001');
      obj.set('items', [item1, item2]);

      const ctx: FormatContext = {
        indentStr: '  ',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);
      // Array of objects expands, but line break is BEFORE [, not after }
      expect(result).toContain('ORD001, [');
      expect(result).toContain('{ 1, Apple }');
      expect(result).toContain('{ 2, Banana }');
    });

    it('should NOT break line after closing } - next value continues on same line', () => {
      // This is the key test for the fix
      const venue = new InternetObject();
      venue.set('name', 'Convention Center');
      venue.set('address', { street: '1000 Convention Way', city: 'Las Vegas', country: 'USA' });
      venue.set('capacity', 5000);

      const dates = new InternetObject();
      dates.set('start', '2024-06-15');
      dates.set('end', '2024-06-17');

      const organizer = new InternetObject();
      organizer.set('name', 'TechEvents Inc.');
      organizer.set('email', 'info@techsummit.com');

      const session1 = new InternetObject();
      session1.set('id', 'S001');
      session1.set('title', 'Keynote');

      const obj = new InternetObject();
      obj.set('eventId', 'CONF-2024');
      obj.set('name', 'TechSummit');
      obj.set('venue', venue);
      obj.set('dates', dates);
      obj.set('organizer', organizer);
      obj.set('sessions', [session1]);

      const ctx: FormatContext = {
        indentStr: '  ',
        level: 0,
        isNested: false
      };

      const result = formatRecord(obj, undefined, ctx);

      // The key assertion: after venue closes with }, dates should be on SAME line
      // Should be: ...}, { 2024-06-15, 2024-06-17 }, { TechEvents Inc., ...
      // NOT: ...}\n{ 2024-06-15, ...
      expect(result).toMatch(/\}, \{ /); // Should have }, { pattern (same line)
      expect(result).not.toMatch(/\}\n\{/); // Should NOT have }\n{ pattern (line break after })
    });
  });

  describe('Integration with stringify', () => {
    it('should format document with indent option', () => {
      const data = {
        name: 'John Doe',
        age: 25,
        address: {
          street: 'Bond Street',
          city: 'New York'
        }
      };

      const doc = loadInferred(data);
      const result = stringify(doc, { indent: 2 });

      // Should have spaces inside braces for nested object
      expect(result).toContain('{ Bond Street, New York }');
    });

    it('should format document with array of objects', () => {
      const data = {
        orderId: 'ORD-001',
        customer: 'John Smith',
        items: [
          { product: 'Widget A', qty: 2, price: 29.99 },
          { product: 'Widget B', qty: 1, price: 49.99 }
        ],
        total: 109.97
      };

      const doc = loadInferred(data);
      const result = stringify(doc, { indent: 2 });

      console.log('Formatted output:\n', result);

      // Array of objects should expand
      expect(result).toContain('[');
      expect(result).toContain('{ Widget A, 2, 29.99 }');
      expect(result).toContain('{ Widget B, 1, 49.99 }');
    });

    it('should match Example 8 formatting from docs (complex event)', () => {
      const data = {
        eventId: 'CONF-2024-TECH',
        name: 'TechSummit 2024',
        description: 'Annual technology conference',
        venue: {
          name: 'Convention Center',
          address: {
            street: '1000 Convention Way',
            city: 'Las Vegas',
            country: 'USA'
          },
          capacity: 5000
        },
        dates: {
          start: '2024-06-15',
          end: '2024-06-17'
        },
        organizer: {
          name: 'TechEvents Inc.',
          email: 'info@techsummit.com',
          company: 'TechEvents Inc.'
        },
        sessions: [
          {
            id: 'S001',
            title: 'Keynote: Future of AI',
            speaker: {
              name: 'Dr. James Watson',
              bio: 'AI Research Lead',
              company: 'DeepMind'
            },
            room: 'Main Hall',
            time: '2024-06-15T09:00:00',
            topics: ['AI', 'machine learning', 'future tech']
          },
          {
            id: 'S002',
            title: 'Building Scalable Systems',
            speaker: {
              name: 'Lisa Park',
              bio: 'Principal Engineer',
              company: 'Netflix'
            },
            room: 'Room A',
            time: '2024-06-15T11:00:00',
            topics: ['architecture', 'scalability', 'microservices']
          }
        ],
        totalAttendees: 3500,
        status: 'registration_open'
      };

      const doc = loadInferred(data);
      const result = stringify(doc, { indent: 2 });

      console.log('Example 8 output:\n', result);

      // Key assertions based on the formatting spec:
      // 1. Venue should expand (complex object with nested address)
      // 2. After venue closes, dates should be on SAME line: }, { 2024-06-15, ...
      // 3. Sessions array should expand with each session on its own line
      // 4. Inside session items, speaker object stays inline

      // Check that dates follows venue on same line (no line break after })
      expect(result).toMatch(/\}, \{ /); // }, { pattern exists
    });
  });
});
