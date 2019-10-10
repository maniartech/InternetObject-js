import 'jest'
import InternetObject from '../../src'
import ASTParser from '../../src/parser/ast-parser'
import { print } from '../../src/utils/index'

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
})
