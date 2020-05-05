import 'jest'
import InternetObject from '../../src'

describe('Data Parser Tests', () => {
  it('Blank string', () => {
    expect(new InternetObject('').data).toBeUndefined()
    expect(new InternetObject('         ').data).toBeUndefined()
    expect(new InternetObject(String.raw`    \n,\t     `).data[0]).toBe('\\n')
    expect(new InternetObject(String.raw`    \n,\t     `).data[1]).toBe('\\t')
    expect(new InternetObject(String.raw`    \n \t,     `).data[0]).toBe('\\n \\t')
    // expect(() => {
    //   return new InternetObject(String.raw`  \n  \t `)
    // }).toThrowError()
  })

  it('All optional with no value', () => {
    expect(new InternetObject('"   "').data).toBe('   ')
    expect(new InternetObject('""').data).toBe('')
    expect(new InternetObject(String.raw`"  \n  \t "`).data).toBe('  \n  \t ')
  })

  it('handles empty ending commas', () => {
    expect(new InternetObject(String.raw`  \n \t , `).data[0]).toBe('\\n \\t')
    expect(new InternetObject(String.raw`  \n \t , `).data[1]).toBe(undefined)
    expect(new InternetObject(String.raw`  \n \t ,,, `).data[0]).toBe('\\n \\t')
    expect(Object.keys(new InternetObject(String.raw`  \n \t , `).data).join(',')).toBe('0,1')
    expect(Object.keys(new InternetObject(String.raw`  \n \t , , , `).data).join(',')).toBe(
      '0,1,2,3'
    )
    expect(
      Object.keys(
        new InternetObject(String.raw`
    ~ ,,,`).data[0]
      ).join(',')
    ).toBe('0,1,2,3')

    expect(
      new InternetObject(String.raw`
    ~ 
    `).data
    ).toBeUndefined()

    expect(
      Object.keys(
        new InternetObject(String.raw`
    ~ ,,,`).data[0]
      ).join(',')
    ).toBe('0,1,2,3')
  })
})

// {,,,}    An object with four undefined values
// [,,,]    An array with four undefined items
// --- ,,,  A data object with four undefined values
// ,,,      An object with four undefined values
// k:,
// ~,
// ~
