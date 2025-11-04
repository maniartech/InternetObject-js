import { parse } from '../../../src';

describe('Decimal Min/Max Validation', () => {
  it('should reject decimal value below min constraint', () => {
    const schema = `num1: decimal, num2: {decimal, min:999999999999999999999999999999999999999999999999.9999999999999999999m}`
    const data = `123123m, 99m`
    const io = `${schema}\n---\n${data}`

    expect(() => {
      parse(io, null)
    }).toThrow(/must be within the specified range/)
  })

  it('should accept decimal value equal to min constraint', () => {
    const schema = `num: {decimal, min:100m}`
    const data = `100m`
    const io = `${schema}\n---\n${data}`

    const result = parse(io, null)
    expect(result).toBeDefined()
  })

  it('should accept decimal value above min constraint', () => {
    const schema = `num: {decimal, min:100m}`
    const data = `200m`
    const io = `${schema}\n---\n${data}`

    const result = parse(io, null)
    expect(result).toBeDefined()
  })

  it('should reject decimal value above max constraint', () => {
    const schema = `num: {decimal, max:100m}`
    const data = `200m`
    const io = `${schema}\n---\n${data}`

    expect(() => {
      parse(io, null)
    }).toThrow(/must be within the specified range/)
  })

  it('should accept decimal value equal to max constraint', () => {
    const schema = `num: {decimal, max:100m}`
    const data = `100m`
    const io = `${schema}\n---\n${data}`

    const result = parse(io, null)
    expect(result).toBeDefined()
  })

  it('should accept decimal value below max constraint', () => {
    const schema = `num: {decimal, max:100m}`
    const data = `50m`
    const io = `${schema}\n---\n${data}`

    const result = parse(io, null)
    expect(result).toBeDefined()
  })

  it('should validate decimal with both min and max constraints', () => {
    const schema = `num: {decimal, min:10m, max:100m}`

    // Below min - should fail
    expect(() => {
      parse(`${schema}\n---\n5m`, null)
    }).toThrow(/must be within the specified range/)

    // Above max - should fail
    expect(() => {
      parse(`${schema}\n---\n150m`, null)
    }).toThrow(/must be within the specified range/)

    // Within range - should pass
    const result = parse(`${schema}\n---\n50m`, null)
    expect(result).toBeDefined()
  })

  it('should validate very large decimal min values', () => {
    const schema = `num: {decimal, min:9999.9999999999999999999m}`

    // Below min - should fail
    expect(() => {
      parse(`${schema}\n---\n999m`, null)
    }).toThrow(/must be within the specified range/)

    // Above min - should pass
    const result = parse(`${schema}\n---\n10000m`, null)
    expect(result).toBeDefined()
  })
})
