import { stringifyMemberDef } from '../../../src/schema/types/memberdef-stringify'
import MemberDef from '../../../src/schema/types/memberdef'
import Schema from '../../../src/schema/schema'

describe('stringifyMemberDef', () => {
  describe('Basic types without constraints', () => {
    it('should return type name for number without constraints', () => {
      const memberDef: MemberDef = { type: 'number' }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })

    it('should return type name for string without constraints', () => {
      const memberDef: MemberDef = { type: 'string' }
      expect(stringifyMemberDef(memberDef, true)).toBe('string')
    })

    it('should return type name for boolean without constraints', () => {
      const memberDef: MemberDef = { type: 'bool' }
      expect(stringifyMemberDef(memberDef, true)).toBe('bool')
    })

    it('should return type name for datetime without constraints', () => {
      const memberDef: MemberDef = { type: 'datetime' }
      expect(stringifyMemberDef(memberDef, true)).toBe('datetime')
    })

    it('should return type name for array without constraints', () => {
      const memberDef: MemberDef = { type: 'array' }
      expect(stringifyMemberDef(memberDef, true)).toBe('array')
    })

    it('should return empty string for any type', () => {
      const memberDef: MemberDef = { type: 'any' }
      expect(stringifyMemberDef(memberDef, true)).toBe('')
    })

    it('should return empty string when includeTypes is false', () => {
      const memberDef: MemberDef = { type: 'number', min: 10 }
      expect(stringifyMemberDef(memberDef, false)).toBe('')
    })
  })

  describe('Number type with constraints', () => {
    it('should use bracket notation with min constraint', () => {
      const memberDef: MemberDef = { type: 'number', min: 20 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, min:20}')
    })

    it('should use bracket notation with max constraint', () => {
      const memberDef: MemberDef = { type: 'number', max: 100 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, max:100}')
    })

    it('should use bracket notation with min and max constraints', () => {
      const memberDef: MemberDef = { type: 'number', min: 10, max: 100 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, min:10, max:100}')
    })

    it('should use bracket notation with multipleOf constraint', () => {
      const memberDef: MemberDef = { type: 'number', multipleOf: 5 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, multipleOf:5}')
    })

    it('should use bracket notation with format constraint', () => {
      const memberDef: MemberDef = { type: 'number', format: 'hex' }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, format:"hex"}')
    })

    it('should handle all number constraints together', () => {
      const memberDef: MemberDef = {
        type: 'number',
        min: 0,
        max: 255,
        multipleOf: 5,
        format: 'hex'
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, min:0, max:255, multipleOf:5, format:"hex"}')
    })
  })

  describe('String type with constraints', () => {
    it('should use bracket notation with minLen constraint', () => {
      const memberDef: MemberDef = { type: 'string', minLen: 5 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, minLen:5}')
    })

    it('should use bracket notation with maxLen constraint', () => {
      const memberDef: MemberDef = { type: 'string', maxLen: 100 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, maxLen:100}')
    })

    it('should use bracket notation with len constraint', () => {
      const memberDef: MemberDef = { type: 'string', len: 10 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, len:10}')
    })

    it('should use bracket notation with pattern constraint', () => {
      const memberDef: MemberDef = { type: 'string', pattern: '^[A-Z]+$' }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, pattern:"^[A-Z]+$"}')
    })

    it('should use bracket notation with pattern and flags', () => {
      const memberDef: MemberDef = { type: 'string', pattern: '^test', flags: 'i' }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, pattern:"^test", flags:"i"}')
    })

    it('should use bracket notation with format constraint', () => {
      const memberDef: MemberDef = { type: 'string', format: 'open' }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, format:"open"}')
    })

    it('should use bracket notation with encloser constraint', () => {
      const memberDef: MemberDef = { type: 'string', encloser: "'" }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, encloser:"\'"}')
    })

    it('should use bracket notation with escapeLines constraint', () => {
      const memberDef: MemberDef = { type: 'string', escapeLines: true }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, escapeLines:T}')
    })
  })

  describe('Array type with constraints', () => {
    it('should use bracket notation with len constraint', () => {
      const memberDef: MemberDef = { type: 'array', len: 3 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{array, len:3}')
    })

    it('should use bracket notation with minLen constraint', () => {
      const memberDef: MemberDef = { type: 'array', minLen: 1 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{array, minLen:1}')
    })

    it('should use bracket notation with maxLen constraint', () => {
      const memberDef: MemberDef = { type: 'array', maxLen: 10 }
      expect(stringifyMemberDef(memberDef, true)).toBe('{array, maxLen:10}')
    })

    it('should handle array with of property (TODO: needs proper implementation)', () => {
      const memberDef: MemberDef = {
        type: 'array',
        of: { type: 'number' }
      }
      // Currently returns just 'array' - needs enhancement
      expect(stringifyMemberDef(memberDef, true)).toBe('array')
    })
  })

  describe('Choices constraint', () => {
    it('should format number choices', () => {
      const memberDef: MemberDef = {
        type: 'number',
        choices: [1, 2, 3]
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, choices:[1, 2, 3]}')
    })

    it('should format string choices', () => {
      const memberDef: MemberDef = {
        type: 'string',
        choices: ['red', 'green', 'blue']
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, choices:["red", "green", "blue"]}')
    })

    it('should format boolean choices', () => {
      const memberDef: MemberDef = {
        type: 'bool',
        choices: [true, false]
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{bool, choices:[T, F]}')
    })
  })

  describe('Default values', () => {
    it('should include default value for number', () => {
      const memberDef: MemberDef = {
        type: 'number',
        default: 42
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, default:42}')
    })

    it('should include default value for string', () => {
      const memberDef: MemberDef = {
        type: 'string',
        default: 'hello'
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, default:"hello"}')
    })

    it('should include default value for boolean', () => {
      const memberDef: MemberDef = {
        type: 'bool',
        default: true
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{bool, default:T}')
    })
  })

  describe('Nested objects', () => {
    it('should format nested object with fields', () => {
      const nestedSchema = new Schema(
        'address',
        { street: { type: 'string' } },
        { city: { type: 'string' } },
        { zip: { type: 'string' } }
      )

      const memberDef: MemberDef = {
        type: 'object',
        schema: nestedSchema
      }

      expect(stringifyMemberDef(memberDef, true)).toBe('{street, city, zip}')
    })

    it('should format nested object with optional fields', () => {
      const nestedSchema = new Schema(
        'address',
        { street: { type: 'string' } },
        { city: { type: 'string' } },
        { state: { type: 'string', optional: true } }
      )

      const memberDef: MemberDef = {
        type: 'object',
        schema: nestedSchema
      }

      expect(stringifyMemberDef(memberDef, true)).toBe('{street, city, state?}')
    })

    it('should format nested object regardless of includeTypes flag', () => {
      const nestedSchema = new Schema(
        'address',
        { street: { type: 'string' } },
        { city: { type: 'string' } }
      )

      const memberDef: MemberDef = {
        type: 'object',
        schema: nestedSchema
      }

      // Nested objects always show their structure
      expect(stringifyMemberDef(memberDef, false)).toBe('{street, city}')
    })
  })

  describe('Standard properties exclusion', () => {
    it('should not include optional in bracket notation', () => {
      const memberDef: MemberDef = {
        type: 'number',
        optional: true
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })

    it('should not include null in bracket notation', () => {
      const memberDef: MemberDef = {
        type: 'number',
        null: true
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })

    it('should not include path in bracket notation', () => {
      const memberDef: MemberDef = {
        type: 'number',
        path: 'user.age'
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })

    it('should not include name in bracket notation', () => {
      const memberDef: MemberDef = {
        type: 'number',
        name: 'age'
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })

    it('should not include schema in bracket notation for non-object types', () => {
      const memberDef: MemberDef = {
        type: 'number',
        schema: null as any
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })

    it('should not include internal __memberdef property', () => {
      const memberDef: MemberDef = {
        type: 'number',
        __memberdef: true
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })

    it('should not include internal re (compiled regex) property', () => {
      const memberDef: MemberDef = {
        type: 'string',
        pattern: '^test',
        re: /^test/ as any
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, pattern:"^test"}')
    })
  })

  describe('Complex combinations', () => {
    it('should handle number with all standard properties and one constraint', () => {
      const memberDef: MemberDef = {
        type: 'number',
        name: 'age',
        path: 'user.age',
        optional: true,
        null: false,
        min: 18
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, min:18}')
    })

    it('should handle string with multiple constraints and standard properties', () => {
      const memberDef: MemberDef = {
        type: 'string',
        name: 'username',
        path: 'user.username',
        optional: false,
        null: false,
        minLen: 3,
        maxLen: 20,
        pattern: '^[a-z]+$'
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, minLen:3, maxLen:20, pattern:"^[a-z]+$"}')
    })

    it('should return type name when only standard properties exist', () => {
      const memberDef: MemberDef = {
        type: 'number',
        name: 'count',
        path: 'stats.count',
        optional: true,
        null: true
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })
  })

  describe('Edge cases', () => {
    it('should handle null constraint values', () => {
      const memberDef: MemberDef = {
        type: 'number',
        default: null
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, default:null}')
    })

    it('should handle zero as constraint value', () => {
      const memberDef: MemberDef = {
        type: 'number',
        min: 0
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{number, min:0}')
    })

    it('should handle empty string as constraint value', () => {
      const memberDef: MemberDef = {
        type: 'string',
        default: ''
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{string, default:""}')
    })

    it('should handle false as constraint value', () => {
      const memberDef: MemberDef = {
        type: 'bool',
        default: false
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{bool, default:F}')
    })

    it('should not include undefined constraint values', () => {
      const memberDef: MemberDef = {
        type: 'number',
        min: undefined
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('number')
    })
  })

  describe('Special number types', () => {
    it('should handle int type', () => {
      const memberDef: MemberDef = { type: 'int' }
      expect(stringifyMemberDef(memberDef, true)).toBe('int')
    })

    it('should handle uint type', () => {
      const memberDef: MemberDef = { type: 'uint' }
      expect(stringifyMemberDef(memberDef, true)).toBe('uint')
    })

    it('should handle bigint type', () => {
      const memberDef: MemberDef = { type: 'bigint' }
      expect(stringifyMemberDef(memberDef, true)).toBe('bigint')
    })

    it('should handle decimal type', () => {
      const memberDef: MemberDef = { type: 'decimal' }
      expect(stringifyMemberDef(memberDef, true)).toBe('decimal')
    })

    it('should handle decimal type with precision and scale', () => {
      const memberDef: MemberDef = {
        type: 'decimal',
        precision: 10,
        scale: 2
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{decimal, precision:10, scale:2}')
    })
  })

  describe('Special string types', () => {
    it('should handle email type', () => {
      const memberDef: MemberDef = { type: 'email' }
      expect(stringifyMemberDef(memberDef, true)).toBe('email')
    })

    it('should handle url type', () => {
      const memberDef: MemberDef = { type: 'url' }
      expect(stringifyMemberDef(memberDef, true)).toBe('url')
    })

    it('should handle email type with constraints', () => {
      const memberDef: MemberDef = {
        type: 'email',
        maxLen: 100
      }
      expect(stringifyMemberDef(memberDef, true)).toBe('{email, maxLen:100}')
    })
  })
})
