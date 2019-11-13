import 'jest'
import InternetObject from '../../src'

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
})
