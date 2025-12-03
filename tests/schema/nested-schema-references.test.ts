import io from '../../src';

describe('Nested Schema References', () => {
  describe('Direct nested schema references', () => {
    test('should resolve nested schema reference with keyed values', () => {
      const doc = io.parse(`
~ $inner: {value: int}
~ $outer: {data: $inner}
~ $schema: $outer
---
{ data: { value: 42 } }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({ data: { value: 42 } });
    });

    test('should resolve nested schema reference with positional values', () => {
      const doc = io.parse(`
~ $inner: {value: int}
~ $outer: {data: $inner}
~ $schema: $outer
---
{ data: { 42 } }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({ data: { value: 42 } });
    });

    test('should resolve simple schema with positional values', () => {
      const doc = io.parse(`
~ $inner: {value: int}
~ $schema: $inner
---
{ 42 }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({ value: 42 });
    });
  });

  describe('Additional properties (*:) with schema references', () => {
    test('should resolve additional properties with keyed values', () => {
      const doc = io.parse(`
~ $inner: {value: int}
~ $outer: {*: $inner}
~ $schema: $outer
---
{ key1: { value: 42 }, key2: { value: 100 } }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({
        key1: { value: 42 },
        key2: { value: 100 }
      });
    });

    test('should resolve additional properties with positional values', () => {
      const doc = io.parse(`
~ $inner: {value: int}
~ $outer: {*: $inner}
~ $schema: $outer
---
{ key1: { 42 }, key2: { 100 } }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({
        key1: { value: 42 },
        key2: { value: 100 }
      });
    });

    test('should resolve inline schema in additional properties with keyed values', () => {
      const doc = io.parse(`
~ $outer: {*: {value: int}}
~ $schema: $outer
---
{ key1: { value: 42 } }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({ key1: { value: 42 } });
    });

    test('should resolve inline schema in additional properties with positional values', () => {
      const doc = io.parse(`
~ $outer: {*: {value: int}}
~ $schema: $outer
---
{ key1: { 42 } }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({ key1: { value: 42 } });
    });

    test('should error on undefined schema reference in additional properties', () => {
      expect(() => {
        io.parse(`
~ $inner: {value: int}
~ $outer: {*: $undefined}
~ $schema: $outer
---
{ key1: { value: 42 } }
`);
      }).toThrow('$undefined');
    });
  });

  describe('Regular member with inline schema', () => {
    test('should resolve regular member with inline schema and positional values', () => {
      const doc = io.parse(`
~ $outer: {key1: {value: int}}
~ $schema: $outer
---
{ key1: { 42 } }
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({ key1: { value: 42 } });
    });
  });

  describe('Complex nested schemas (questionnaire pattern)', () => {
    test('should error on undefined schema reference ($choiceNo instead of $choice)', () => {
      expect(() => {
        io.parse(`
~ $choice: {*: {recode: int}}
~ $questions: { *: {questionName, choices: $choiceNo} }
~ $result: { questions: $questions}
~ $schema: $result
---
{
  questions: {
    QID1: { questionName: Q1, choices: { 1: { recode: 4234230 }, 2: { recode: 1 } } }
  }
}
`);
      }).toThrow('$choiceNo');
    });

    test('should resolve deeply nested schemas with keyed values', () => {
      const doc = io.parse(`
~ $choice: {*: {recode: int}}
~ $questions: { *: {questionName, choices: $choice} }
~ $result: { questions: $questions}
~ $schema: $result
---
{
  questions: {
    QID1: { questionName: Q1, choices: { 1: { recode: 4234230 }, 2: { recode: 1 } } }
  }
}
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({
        questions: {
          QID1: {
            questionName: 'Q1',
            choices: {
              '1': { recode: 4234230 },
              '2': { recode: 1 }
            }
          }
        }
      });
    });

    test('should resolve deeply nested schemas with positional values', () => {
      const doc = io.parse(`
~ $choice: {*: {recode: int}}
~ $questions: { *: {questionName, choices: $choice} }
~ $result: { questions: $questions}
~ $schema: $result
---
{
  questions: {
    QID1: { Q1, { 1: { 4234230 }, 2: { 1 } } }
  }
}
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({
        questions: {
          QID1: {
            questionName: 'Q1',
            choices: {
              '1': { recode: 4234230 },
              '2': { recode: 1 }
            }
          }
        }
      });
    });

    test('should resolve multiple questions with nested schemas', () => {
      const doc = io.parse(`
~ $choice: {*: {recode: string}}
~ $questions: { *: {questionName, choices: $choice} }
~ $result: { questions: $questions}
~ $schema: $result
---
{
  questions: {
    "QID1": { questionName: "Q1", choices: { "1": { recode: "4234230" }, "2": { recode: "1" } } },
    "QID2": { questionName: "Q2", choices: { "1": { recode: "0" }, "2": { recode: "1" } } }
  }
}
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({
        questions: {
          QID1: {
            questionName: 'Q1',
            choices: {
              '1': { recode: '4234230' },
              '2': { recode: '1' }
            }
          },
          QID2: {
            questionName: 'Q2',
            choices: {
              '1': { recode: '0' },
              '2': { recode: '1' }
            }
          }
        }
      });
    });

    test('should resolve multiple questions with positional values (compact format)', () => {
      const doc = io.parse(`
~ $choice: {*: {recode: string}}
~ $questions: { *: {questionName, choices: $choice} }
~ $result: { questions: $questions}
~ $schema: $result
---
{
  {
    "QID1": { "Q1", { "1": { "4234230" }, "2": { "1" } } },
    "QID2": { "Q2", { "1": { "0" }, "2": { "1" } } }
  }
}
`);
      expect(doc.errors.length).toBe(0);
      expect(doc.toJSON()).toEqual({
        questions: {
          QID1: {
            questionName: 'Q1',
            choices: {
              '1': { recode: '4234230' },
              '2': { recode: '1' }
            }
          },
          QID2: {
            questionName: 'Q2',
            choices: {
              '1': { recode: '0' },
              '2': { recode: '1' }
            }
          }
        }
      });
    });
  });

  describe('Schema header inspection', () => {
    test('should correctly compile schema with additional properties', () => {
      const doc = io.parse(`
~ $outer: {*: {value: int}}
~ $schema: $outer
---
{ key1: { 42 } }
`);

      const schema = doc.header.schema;
      expect(schema).toBeDefined();
      expect(schema?.names).toEqual([]);
      expect(schema?.open).toBeDefined();
      expect(typeof schema?.open).toBe('object');
      expect((schema?.open as any)?.type).toBe('object');
      expect((schema?.open as any)?.schema?.names).toEqual(['value']);
    });
  });
});
