import "jest"
import InternetObject from '../../src';


describe("Byte", () => {
  it("valid bytes", () => {
    const objStr = String.raw`
    v1:byte, v2:byte, v3:byte
    ---
    -128, 127, 100
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(-128)
    expect(obj.data.v2).toBe(127)
    expect(obj.data.v3).toBe(100)
  })

  it("invalid bytes", () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        v1:byte
        ---
        128
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
      v1:byte
      ---
      -130
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
      v1:byte
      ---
      100.5
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })
})
