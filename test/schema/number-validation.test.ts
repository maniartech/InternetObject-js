import 'jest'
import InternetObject from '../../src'
import ASTParser from '../../src/parser/ast-parser'
import { print } from '../../src/utils/index'
import ErrorCodes from '../../src/errors/io-error-codes'

const min = Number.MIN_SAFE_INTEGER
const max = Number.MAX_SAFE_INTEGER

describe('Number Parse', () => {
  it('valid ints', () => {
    const objStr = String.raw`
    v1:number, v2:number, v3:number
    ---
    ${min}, ${max}, 0
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(min)
    expect(obj.data.v2).toBe(max)
    expect(obj.data.v3).toBe(0)
  })

  it('all optional ints', () => {
    const objStr = String.raw`
    v1?:number, v2?:number, v3?:number
    ---
    ,,0
    `
    const obj = new InternetObject(objStr)

    const parser = new ASTParser(objStr)
    parser.parse()
    // print(parser)
    // console.warn(obj.data)
    expect(obj.data.v1).toBe(undefined)
    expect(obj.data.v2).toBe(undefined)
    expect(obj.data.v3).toBe(0)
  })

  it('invalid ints', () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        v1:int
        ---
        0.005
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
      v1:int
      ---
      -100.005
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
      v1:int
      ---
      100.5
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })
})

describe('Number Load', () => {
  it('valid ints', () => {
    const schema = String.raw`
    v1:number, v2:number, v3:number
    `
    const obj = new InternetObject(
      {
        v1: min,
        v2: max,
        v3: 0
      },
      schema
    )
    expect(obj.data.v1).toBe(min)
    expect(obj.data.v2).toBe(max)
    expect(obj.data.v3).toBe(0)
  })

  it('invalid ints', () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        v1:int
        ---
        0.005
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
      v1:int
      ---
      -100.005
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
      v1:int
      ---
      100.5
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })

  it('handles variables', () => {
    const text = String.raw`
        ~ a:1
        ~ b:2
        ~ $schema: {a:number, b:number, tags:[{o:{number, choices: [1, 2]}}]}
        ---
        ~ $a, $b, [{$a}, {o:$b}]
        ~ a:$a, b:$b, tags:[{o:$a}, {o:$b}]
      `

    const io = new InternetObject(text)
    const [o1, o2] = io.data

    expect(o1.a).toBe(1)
    expect(o1.b).toBe(2)
    expect(o1.tags[0].o).toBe(1)
    expect(o1.tags[1].o).toBe(2)

    expect(o2.a).toBe(1)
    expect(o2.b).toBe(2)
    expect(o2.tags[0].o).toBe(1)
    expect(o2.tags[1].o).toBe(2)

    const e1 = () => {
      const text = String.raw`
        ~ a:1
        ~ b:2
        ~ $schema: {a:number, b:number, tags:[{o:{number, choices: [1, 3]}}]}
        ---
        ~ $a, $b, [{$a}, {o:$b}]
      `

      const io = new InternetObject(text)
    }
    expect(e1).toThrowError(ErrorCodes.invalidChoice)
  })
})
