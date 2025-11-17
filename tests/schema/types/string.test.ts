import { parse } from '../../../src'

describe('StringDef - String, Email, and URL Types', () => {
  describe('Basic string validation', () => {
    test('should accept simple strings', () => {
      expect(() => parse('s: string\n---\n"hello"', null)).not.toThrow()
      expect(() => parse('s: string\n---\n"world"', null)).not.toThrow()
    })

    test('should accept empty string', () => {
      expect(() => parse('s: string\n---\n""', null)).not.toThrow()
    })

    test('should accept unicode and whitespace', () => {
      expect(() => parse('s: string\n---\n"नमस्ते दुनिया"', null)).not.toThrow()
      expect(() => parse('s: string\n---\n" hello\tworld\n"', null)).not.toThrow()
    })

    test('should reject non-string values', () => {
      expect(() => parse('s: string\n---\n123', null)).toThrow(/Expecting a string|string value/i)
      expect(() => parse('s: string\n---\ntrue', null)).toThrow(/Expecting a string|string value/i)
    })
  })

  describe('Pattern and flags', () => {
    test('should validate pattern without flags', () => {
      const schema = 's: { string, pattern: "^[A-Z]{3}[0-9]{2}$" }'
      expect(() => parse(`${schema}\n---\n"ABC12"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"Abc12"`, null)).toThrow(/pattern/i)
    })

    test('should validate pattern with flags (case-insensitive)', () => {
      const schema = 's: { string, pattern: "^[A-Z]{3}[0-9]{2}$", flags: "i" }'
      expect(() => parse(`${schema}\n---\n"abc12"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"ab12"`, null)).toThrow(/pattern/i) // too short
    })

    test('should throw for invalid regex pattern compilation', () => {
      // Invalid regex: missing closing bracket
      const schema = 's: { string, pattern: "[" }'
      expect(() => parse(`${schema}\n---\n"anything"`, null)).toThrow(/pattern/i)
    })
  })

  describe('Length constraints', () => {
    test('should validate exact length (len)', () => {
      const schema = 's: { string, len: 5 }'
      expect(() => parse(`${schema}\n---\n"hello"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"hell"`, null)).toThrow(/length/i)
      expect(() => parse(`${schema}\n---\n"helloo"`, null)).toThrow(/length/i)
    })

    test('should validate minLen', () => {
      const schema = 's: { string, minLen: 3 }'
      expect(() => parse(`${schema}\n---\n"abc"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"abcd"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"ab"`, null)).toThrow(/minLen/i)
    })

    test('should validate maxLen', () => {
      const schema = 's: { string, maxLen: 3 }'
      expect(() => parse(`${schema}\n---\n"abc"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"ab"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"abcd"`, null)).toThrow(/maxLen|maxLength/i)
    })

    test('should allow empty string when minLen is 0', () => {
      const schema = 's: { string, minLen: 0 }'
      expect(() => parse(`${schema}\n---\n""`, null)).not.toThrow()
    })
  })

  describe('Choices', () => {
    test('should accept value from choices', () => {
      const schema = 'color: { string, choices: ["red", "green", "blue"] }'
      expect(() => parse(`${schema}\n---\n"red"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n"green"`, null)).not.toThrow()
    })

    test('should reject value not in choices', () => {
      const schema = 'color: { string, choices: ["red", "green", "blue"] }'
      expect(() => parse(`${schema}\n---\n"yellow"`, null)).toThrow(/must be one of/i)
    })
  })

  describe('Email type', () => {
    test('should accept valid email addresses', () => {
      expect(() => parse('e: email\n---\n"test@example.com"', null)).not.toThrow()
      expect(() => parse('e: email\n---\n"user.name+tag@sub.example.co"', null)).not.toThrow()
    })

    test('should reject invalid email addresses', () => {
      expect(() => parse('e: email\n---\n"invalid@"', null)).toThrow(/email/i)
      expect(() => parse('e: email\n---\n"justtext"', null)).toThrow(/email/i)
    })
  })

  describe('URL type', () => {
    test('should accept valid URLs', () => {
      expect(() => parse('u: url\n---\n"https://example.com"', null)).not.toThrow()
      expect(() => parse('u: url\n---\n"http://example.org/path?x=1#y"', null)).not.toThrow()
      expect(() => parse('u: url\n---\n"www.example.net"', null)).not.toThrow()
    })

    test('should reject invalid URLs', () => {
      expect(() => parse('u: url\n---\n"not a url"', null)).toThrow(/url/i)
      expect(() => parse('u: url\n---\n"htp:/broken"', null)).toThrow(/url/i)
    })
  })

  describe('Multiple string fields', () => {
    test('should validate each field independently', () => {
      const schema = 'a: { string, minLen: 2 }, b: { string, maxLen: 3 }, c: { string, pattern: "^x+$" }'
      const data = `${schema}\n---\n"hi", "hey", "xxx"`
      expect(() => parse(data, null)).not.toThrow()
    })

    test('should report errors for the correct field', () => {
      const schema = 'a: { string, minLen: 2 }, b: { string, maxLen: 3 }, c: { string, pattern: "^x+$" }'
      expect(() => parse(`${schema}\n---\n"h", "ok", "xxx"`, null)).toThrow(/minLen/i) // a too short
      expect(() => parse(`${schema}\n---\n"hi", "longer", "xxx"`, null)).toThrow(/maxLen|maxLength/i) // b too long
      expect(() => parse(`${schema}\n---\n"hi", "ok", "xyx"`, null)).toThrow(/pattern/i) // c fails pattern
    })
  })
})
