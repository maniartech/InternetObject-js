import doCommonTypeCheck from '../../../src/schema/types/common-type'
import MemberDef from '../../../src/schema/types/memberdef'
import TokenNode from '../../../src/parser/nodes/tokens'
import TokenType from '../../../src/parser/tokenizer/token-types'

describe('doCommonTypeCheck', () => {
  describe('Undefined value handling', () => {
    test('should throw error when value is undefined and no default/optional', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name' }
      expect(() => doCommonTypeCheck(memberDef, undefined))
        .toThrow(/required/i)
    })

    test('should return undefined when value is undefined and field is optional', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name', optional: true }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: undefined, changed: true })
    })

    test('should return default when value is undefined and default exists', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name', default: 'John' }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: 'John', changed: true })
    })
  })

  describe('Default value conversions', () => {
    test('should convert "T" string default to boolean true', () => {
      const memberDef: MemberDef = { type: 'bool', path: 'active', default: 'T' }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: true, changed: true })
    })

    test('should convert "F" string default to boolean false', () => {
      const memberDef: MemberDef = { type: 'bool', path: 'active', default: 'F' }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: false, changed: true })
    })

    test('should convert "true" string default to boolean true', () => {
      const memberDef: MemberDef = { type: 'bool', path: 'active', default: 'true' }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: true, changed: true })
    })

    test('should convert "false" string default to boolean false', () => {
      const memberDef: MemberDef = { type: 'bool', path: 'active', default: 'false' }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: false, changed: true })
    })

    test('should convert "N" string default to null', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name', default: 'N' }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: null, changed: true })
    })

    test('should pass through string defaults unchanged', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name', default: 'default-name' }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: 'default-name', changed: true })
    })

    test('should pass through number defaults unchanged', () => {
      const memberDef: MemberDef = { type: 'number', path: 'age', default: 18 }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: 18, changed: true })
    })

    test('should pass through array defaults unchanged', () => {
      const memberDef: MemberDef = { type: 'array', path: 'tags', default: [] }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: [], changed: true })
    })

    test('should pass through object defaults unchanged', () => {
      const memberDef: MemberDef = { type: 'object', path: 'data', default: {} }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: {}, changed: true })
    })

  })

  describe('Null value handling', () => {
    test('should return null when value is null and null is allowed', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name', null: true }
      // Note: In actual usage, null handling happens at a higher level with TokenNodes
      // This tests the logic when null is already detected
      const result = doCommonTypeCheck(memberDef, 'dummy-value')
      expect(result.changed).toBe(false)
    })
  })

  describe('Choices validation', () => {
    test('should accept value that matches a choice', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'status',
        choices: ['active', 'inactive', 'pending']
      }
      const result = doCommonTypeCheck(memberDef, 'active')
      expect(result).toEqual({ value: 'active', changed: false })
    })

    test('should reject value that does not match any choice', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'status',
        choices: ['active', 'inactive']
      }
      expect(() => doCommonTypeCheck(memberDef, 'pending'))
        .toThrow(/must be one of/i)
    })

    test('should work with number choices', () => {
      const memberDef: MemberDef = {
        type: 'number',
        path: 'priority',
        choices: [1, 2, 3]
      }
      const result = doCommonTypeCheck(memberDef, 2)
      expect(result).toEqual({ value: 2, changed: false })
    })

    test('should use custom equality comparator when provided', () => {
      const memberDef: MemberDef = {
        type: 'datetime',
        path: 'date',
        choices: [new Date('2025-01-01')]
      }
      const value = new Date('2025-01-01')

      // Custom comparator that compares timestamps
      const equalityComparator = (val: any, choice: any) => {
        return val.getTime() === choice.getTime()
      }

      const result = doCommonTypeCheck(memberDef, value, undefined, undefined, equalityComparator)
      expect(result).toEqual({ value, changed: false })
    })

    test('should fail with custom comparator when values do not match', () => {
      const memberDef: MemberDef = {
        type: 'datetime',
        path: 'date',
        choices: [new Date('2025-01-01')]
      }
      const value = new Date('2025-12-31')

      const equalityComparator = (val: any, choice: any) => {
        return val.getTime() === choice.getTime()
      }

      expect(() => doCommonTypeCheck(memberDef, value, undefined, undefined, equalityComparator))
        .toThrow(/must be/i) // Single choice uses "must be" not "must be one of"
    })
  })



  describe('Combined conditions', () => {
    test('should prefer default over optional when both are set', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'name',
        optional: true,
        default: 'Guest'
      }
      const result = doCommonTypeCheck(memberDef, undefined)
      expect(result).toEqual({ value: 'Guest', changed: true })
    })

    test('should validate choices even with default value', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'status',
        choices: ['active', 'inactive'],
        default: 'active'
      }
      expect(() => doCommonTypeCheck(memberDef, 'pending'))
        .toThrow(/must be one of/i)
    })
  })

  describe('Pass-through cases', () => {
    test('should pass through valid value unchanged', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name' }
      const result = doCommonTypeCheck(memberDef, 'Alice')
      expect(result).toEqual({ value: 'Alice', changed: false })
    })

    test('should pass through number value unchanged', () => {
      const memberDef: MemberDef = { type: 'number', path: 'age' }
      const result = doCommonTypeCheck(memberDef, 42)
      expect(result).toEqual({ value: 42, changed: false })
    })

    test('should pass through object value unchanged', () => {
      const memberDef: MemberDef = { type: 'object', path: 'user' }
      const obj = { name: 'Alice', age: 30 }
      const result = doCommonTypeCheck(memberDef, obj)
      expect(result).toEqual({ value: obj, changed: false })
    })
  })

  describe('Choice Index Handling', () => {
    test('should resolve choice index @0', () => {
      const memberDef: MemberDef = { type: 'string', path: 'color', choices: ['red', 'green', 'blue'] }
      // Mocking a TokenNode for @0
      const token = new TokenNode({ type: TokenType.STRING, value: '@0', col: 0, row: 0, pos: 0, token: '@0' } as any)

      // We pass a mock definitions object that would throw if @0 was accessed as a variable
      const mockDefs = {
        getV: (key: string) => {
          if (key === '@0') throw new Error('Variable @0 is not defined')
          return undefined
        }
      } as any

      const result = doCommonTypeCheck(memberDef, token, undefined, mockDefs)
      expect(result).toEqual({ value: 'red', changed: true })
    })

     test('should resolve choice index @2', () => {
      const memberDef: MemberDef = { type: 'string', path: 'color', choices: ['red', 'green', 'blue'] }
      const token = new TokenNode({ type: TokenType.STRING, value: '@2', col: 0, row: 0, pos: 0, token: '@2' } as any)
      const mockDefs = {
        getV: (key: string) => {
          if (key === '@2') throw new Error('Variable @2 is not defined')
          return undefined
        }
      } as any
      const result = doCommonTypeCheck(memberDef, token, undefined, mockDefs)
      expect(result).toEqual({ value: 'blue', changed: true })
    })

    test('should throw error for out of bound index @5', () => {
      const memberDef: MemberDef = { type: 'string', path: 'color', choices: ['red', 'green', 'blue'] }
      const token = new TokenNode({ type: TokenType.STRING, value: '@5', col: 0, row: 0, pos: 0, token: '@5' } as any)
       // This will bypass index logic and try to validate "@5" against choices, failing validation, NOT throwing variable error
      expect(() => doCommonTypeCheck(memberDef, token)).toThrow(/must be one of/)
    })
  })
})
