import 'jest'
import InternetObject from '../../src'

describe('Trial Tests', () => {
  it('All optional with no value', () => {
    const obj = new InternetObject('""')
    // console.warn(obj.data)
    expect(obj.data).toBe('')
  })

  it('All optional with no value', () => {
    const obj = new InternetObject(String.raw`
    v1?:number, v2?:number, v3?:number
    ---`)

    expect(obj.data).toBe(null)
  })

  it('Data starts on datasep', () => {
    const obj = new InternetObject(String.raw`
    v1?:number, v2?:number, v3?:number
    --- ,`)

    expect(obj.data.v1).toBe(undefined)
    expect(obj.data.v2).toBe(undefined)
    expect(obj.data.v3).toBe(undefined)
  })

  it('All optional and undefinds', () => {
    const obj = new InternetObject(String.raw`
    v1?:number, v2?:number, v3?:number
    ---
    ,,
    `)

    expect(obj.data.v1).toBe(undefined)
    expect(obj.data.v2).toBe(undefined)
    expect(obj.data.v3).toBe(undefined)
  })
})

// {,,,}
// [,,,]
// --- ,,,
// ,,,
// k:,
