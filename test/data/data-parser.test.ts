import 'jest'

import InternetObject from '../../src'
import DataParser from '../../src/data/index'
import Tokenizer from '../../src/parser/tokenizer'
import ASTParser from '../../src/parser/ast-parser'

describe('Array', () => {
  it('KeyVal in array', () => {
    const text = String.raw`
    a, b
    ---
    T, [A:T, B:F, C:N]
    `

    const io = new InternetObject(text)
    expect(io.data.b[0].A).toBeTruthy()
    expect(io.data.b[1].B).toBeFalsy()
    expect(io.data.b[2].C).toBeNull()
  })
})

describe('Data Parser Test', () => {
  it('Null', () => {
    const tree: any = undefined
    const result = DataParser.parse(tree)
    expect(result).toBeUndefined()
  })
})

describe('Collection', () => {
  it('loads collection values', () => {
    const io = new InternetObject(String.raw`
    ~ a, b, c, d
    ~
    ~ T, F, N
    ~
    ~ scalar string
    `)

    const [o1, o2, o3] = io.data

    expect(o1['0']).toBe('a')
    expect(o1['1']).toBe('b')
    expect(o1['2']).toBe('c')
    expect(o1['3']).toBe('d')
    expect(o1['4']).toBeUndefined()

    expect(o2['0']).toBeTruthy()
    expect(o2['1']).toBeFalsy()
    expect(o2['2']).toBeNull()
    expect(o2['3']).toBeUndefined()

    // skips empty collection items
    expect(io.data.length).toBe(3)
  })

  it('does not treat single collection item as scalar', () => {
    const parser = new ASTParser(String.raw`
    ~
    ~
    ~
    ~
    `)
    parser.parse()
    parser.data

    // Since none of the collection item has any values
    // the
    // expect(io.data).toBeUndefined()
  })

  it('skips empty collection items', () => {
    const io = new InternetObject(String.raw`
    ~
    ~
    ~
    ~
    `)

    // Since none of the collection item has any values
    // the
    // expect(io.data).toBeUndefined()
  })
})
