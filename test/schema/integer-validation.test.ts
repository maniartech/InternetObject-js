import "jest"
import InternetObject from '../../src';

const min = Number.MIN_SAFE_INTEGER
const max = Number.MAX_SAFE_INTEGER

describe("Int", () => {
  it("valid ints", () => {
    const objStr = String.raw`
    v1:int, v2:int, v3:int
    ---
    ${min}, ${max}, 0
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(min)
    expect(obj.data.v2).toBe(max)
    expect(obj.data.v3).toBe(0)
  })

  it("invalid ints", () => {
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
