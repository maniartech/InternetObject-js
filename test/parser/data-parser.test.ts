import 'jest'
import InternetObject from '../../src'

describe('Data Parser Tests', () => {
  it('Blank string', () => {
    expect(new InternetObject('').data).toBe('')
    expect(new InternetObject('         ').data).toBe('')
    expect(() => {
      return new InternetObject(String.raw`  \n  \t `)
    }).toThrowError()
  })

  it('All optional with no value', () => {
    expect(new InternetObject('"   "').data).toBe('   ')
    expect(new InternetObject('""').data).toBe('')

    expect(new InternetObject(String.raw`"  \n  \t "`).data).toBe('  \n  \t ')
  })
})

// {,,,}
// [,,,]
// --- ,,,
// ,,,
// k:,
