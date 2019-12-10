import 'jest'
import InternetObject from '../../src'
import ErrorCodes from '../../src/errors/io-error-codes'

describe('Boolean', () => {
  it('valid bools', () => {
    const objStr = String.raw`
    v1:bool, v2:bool, v3:bool, v4:bool
    ---
    T, F, true, false
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(true)
    expect(obj.data.v2).toBe(false)
    expect(obj.data.v3).toBe(true)
    expect(obj.data.v4).toBe(false)
  })

  it('null and undefined with bools', () => {
    const objStr = String.raw`
    v1?:bool, v2*:bool, v3?*:bool, v4?*:bool
    ---
    ,N,,N
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(undefined)
    expect(obj.data.v2).toBe(null)
    expect(obj.data.v3).toBe(undefined)
    expect(obj.data.v4).toBe(null)
  })

  it('invalid bools', () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        v1:bool
        ---
        X
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
      v1:bool
      ---
      0
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
      v1:bool
      ---
      1
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })

  it('handles variables', () => {
    const text = String.raw`
        ~ a:T
        ~ b:F
        ~ schema: {a:bool, b:bool, tags?:[{o:bool}]}
        ---
        ~ $a, $b, [{$a}, {o:$b}]
        ~ b:$b, a:$a
      `

    const io = new InternetObject(text)
    const [o1, o2] = io.data

    expect(o1.a).toBeTruthy()
    expect(o1.b).toBeFalsy()
    expect(o1.tags[0].o).toBeTruthy()
    expect(o1.tags[1].o).toBeFalsy()

    expect(o2.a).toBeTruthy()
    expect(o2.b).toBeFalsy()

    const e1 = () => {
      const text = String.raw`
       ~ schema: {active:bool, live:bool}
        ---
        ~ $noName, $noVar`
      const io = new InternetObject(text)
    }
    expect(e1).toThrowError(ErrorCodes.notABool)
  })
})
