import "jest"
import InternetObject from '../../src';


describe("Int32", () => {
  it("valid int32s", () => {
    const objStr = String.raw`
    v1:int32, v2:int32, v3:int32
    ---
    -2147483648, 2147483647, 100
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(-2147483648)
    expect(obj.data.v2).toBe(2147483647)
    expect(obj.data.v3).toBe(100)
  })

  it("invalid int32s", () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        v1:int32
        ---
        2147483648
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
      v1:int32
      ---
      -2247483647
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
      v1:int32
      ---
      100.5
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })
})
