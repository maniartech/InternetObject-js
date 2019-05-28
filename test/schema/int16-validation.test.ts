import "jest"
import InternetObject from '../../src';


describe("Int16", () => {
  it("valid int16s", () => {
    const objStr = String.raw`
    v1:int16, v2:int16, v3:int16
    ---
    -32768, 32767, 100
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(-32768)
    expect(obj.data.v2).toBe(32767)
    expect(obj.data.v3).toBe(100)
  })

  it("invalid int16s", () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        v1:int16
        ---
        32768
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
      v1:int16
      ---
      -33000
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
      v1:int16
      ---
      100.5
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })
})
