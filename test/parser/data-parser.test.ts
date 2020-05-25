import 'jest'

import ASTParser from '../../src/parser/ast-parser'
import ErrorCodes from '../../src/errors/io-error-codes'
import { VAL } from '../../src/parser/constants'

describe('Data Parser Tests', () => {
  it('handles key errors', () => {
    expect(() => {
      const parser = new ASTParser(String.raw`
        name: John Doe: age: 40
      `)
      parser.parse()
    }).toThrowError(ErrorCodes.unexpectedColon)
  })

  it('handles empty values in object', () => {
    // {,,,}  An object with four undefined values
    let parser = new ASTParser('{,,,}')
    parser.parse()
    expect(parser.data.values.length).toBe(4)
    expect(parser.data.values[0]).toBeUndefined()
    expect(parser.data.values[1]).toBeUndefined()
    expect(parser.data.values[2]).toBeUndefined()
    expect(parser.data.values[3]).toBeUndefined()

    // { , , , }  An object with four undefined values (spaced)
    parser = new ASTParser('{ , , , }')
    parser.parse()
    expect(parser.data.values.length).toBe(4)
    expect(parser.data.values[0]).toBeUndefined()
    expect(parser.data.values[1]).toBeUndefined()
    expect(parser.data.values[2]).toBeUndefined()
    expect(parser.data.values[3]).toBeUndefined()

    // {a,b,c,,,}    An object with four undefined values
    parser = new ASTParser('{a,b,c,,,}')
    parser.parse()
    expect(parser.data.values.length).toBe(6)
    expect(parser.data.values[0].value).toBe('a')
    expect(parser.data.values[1].value).toBe('b')
    expect(parser.data.values[2].value).toBe('c')
    expect(parser.data.values[3]).toBeUndefined()
    expect(parser.data.values[4]).toBeUndefined()
    expect(parser.data.values[5]).toBeUndefined()
  })

  it('handles empty values in array', () => {
    // [,,,]    An array with four undefined values
    let parser = new ASTParser('[,,,]')
    parser.parse()
    expect(parser.data.values.length).toBe(4)
    expect(parser.data.values[0]).toBeUndefined()
    expect(parser.data.values[1]).toBeUndefined()
    expect(parser.data.values[2]).toBeUndefined()
    expect(parser.data.values[3]).toBeUndefined()

    // [ , , , ]    An array with four undefined values (spaced)
    parser = new ASTParser('[ , , , ]')
    parser.parse()
    expect(parser.data.values.length).toBe(4)
    expect(parser.data.values[0]).toBeUndefined()
    expect(parser.data.values[1]).toBeUndefined()
    expect(parser.data.values[2]).toBeUndefined()
    expect(parser.data.values[3]).toBeUndefined()

    // [a,b,c,,,]    An array with four undefined values
    parser = new ASTParser('[a,b,c,,,]')
    parser.parse()
    expect(parser.data.values.length).toBe(6)
    expect(parser.data.values[0].value).toBe('a')
    expect(parser.data.values[1].value).toBe('b')
    expect(parser.data.values[2].value).toBe('c')
    expect(parser.data.values[3]).toBeUndefined()
    expect(parser.data.values[4]).toBeUndefined()
    expect(parser.data.values[5]).toBeUndefined()
  })
})
