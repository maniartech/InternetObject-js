import StringDef from '../../../src/schema/types/string'
import NumberDef from '../../../src/schema/types/number'
import BooleanDef from '../../../src/schema/types/boolean'

describe('load() and stringify() - basic types', () => {
  describe('StringDef.load', () => {
    const str = new StringDef('string')

    test('applies default when undefined and optional/default provided', () => {
      const memberDef: any = { type: 'string', path: 'name', optional: true, default: 'Guest' }
      expect(str.load(undefined as any, memberDef)).toBe('Guest')
    })

    test('validates type and constraints', () => {
      const memberDef: any = { type: 'string', path: 'code', minLen: 2, maxLen: 4 }
      expect(str.load('AB', memberDef)).toBe('AB')
      expect(() => str.load(123 as any, memberDef)).toThrow(/string/i)
      expect(() => str.load('A', memberDef)).toThrow(/minLength|minLen/i)
      expect(() => str.load('ABCDE', memberDef)).toThrow(/maxLength|maxLen/i)
    })

    test('validates pattern', () => {
      const memberDef: any = { type: 'string', path: 'sku', pattern: '^SKU-[0-9]+$' }
      expect(() => str.load('SKU-123', memberDef)).not.toThrow()
      expect(() => str.load('BAD-123', memberDef)).toThrow(/pattern/i)
    })
  })

  describe('StringDef.stringify', () => {
    const str = new StringDef('string')

    test('validates before formatting and uses auto format by default', () => {
      const memberDef: any = { type: 'string', path: 'name' }
      expect(str.stringify('hello', memberDef)).toBe('hello')
      expect(() => str.stringify(123 as any, memberDef)).toThrow(/string/i)
    })

    test('respects minLen during stringify', () => {
      const memberDef: any = { type: 'string', path: 'id', minLen: 2 }
      expect(() => str.stringify('A', memberDef)).toThrow(/minLength|minLen/i)
    })
  })

  describe('NumberDef.load', () => {
    const num = new NumberDef('number') as any

    test('applies default when undefined and default provided', () => {
      const memberDef: any = { type: 'number', path: 'count', default: 5 }
      expect(num.load(undefined, memberDef)).toBe(5)
    })

    test('validates range and multipleOf', () => {
      const memberDef: any = { type: 'number', path: 'age', min: 0, max: 120, multipleOf: 5 }
      expect(num.load(25, memberDef)).toBe(25)
      expect(() => num.load(-1, memberDef)).toThrow(/range|out/i)
      expect(() => num.load(26, memberDef)).toThrow(/multiple/i)
    })
  })

  describe('NumberDef.stringify', () => {
    const num = new NumberDef('number') as any

    test('validates before formatting and supports formats', () => {
      const memberDef: any = { type: 'number', path: 'n', format: 'hex' }
      expect(num.stringify(255, memberDef)).toBe('ff')
    })
  })

  describe('BooleanDef.load/stringify', () => {
    const bool = new BooleanDef()

    test('default and optional', () => {
      const memberDef: any = { type: 'bool', path: 'active', optional: true, default: true }
      expect(bool.load(undefined as any, memberDef)).toBe(true)
    })

    test('type validation', () => {
      const memberDef: any = { type: 'bool', path: 'ok' }
      expect(() => bool.load('true' as any, memberDef)).toThrow(/boolean/i)
      expect(bool.stringify(false, memberDef)).toBe('F')  // IO format: F for false
    })
  })
})
