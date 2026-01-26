
import { parse } from '../../../src'

describe('ObjectDef - Variable References and Schema Resolution', () => {

  test('should handle variable reference to object with no explicit schema definition (open object)', () => {
    // Schema defines 'config' as generic 'object'
    // Reference variable provides the object
    const input = `
      ~ @defaultConfig: { host: "localhost", port: 8080 }
      ~ $schema: { config: object }
      ---
      @defaultConfig
    `

    // The parser should resolve @defaultConfig, sees it matches 'object' type.
    // Since 'config' has no inner schema defined, it treats it as open object.
    const result = parse(input)
    expect(result.toJSON()).toEqual({
      config: { host: "localhost", port: 8080 }
    })
  })

  test('should handle variable reference to object with implicit object type via nested variable', () => {
    // @user is an object.
    // 'current' field in schema expects an object (inferred structure or open)
    // We pass an object literal that uses a variable shorthand
    const input = `
      ~ @user: { name: "Alice", admin: T }
      ~ $schema: { current: object }
      ---
      { user: @user }
    `

    const result = parse(input)
    expect(result.toJSON()).toEqual({
      current: {
        user: { name: "Alice", admin: true }
      }
    })
  })

  test('should handle invalid object reference correctly', () => {
    // Tests that validation actually runs on the referenced object
    // and correctly identifies type mismatch within the resolved object
    const input = `
      ~ @badConfig: { host: 123 }
      ~ $schema: { config: { host: string } }
      ---
      @badConfig
    `

    // Should throw because host is number (123), expected string
    expect(() => parse(input)).toThrow()
  })
})
