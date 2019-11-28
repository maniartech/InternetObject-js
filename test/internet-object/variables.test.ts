import 'jest'
import KeyValueCollection from '../../src/header'

describe('Variables in KeyValueCollection', () => {
  it('can define variables in header', () => {
    const collection = KeyValueCollection.compile(String.raw`
      ~ colors: [red, green, blue]
      ~ boolT: T
      ~ v1: $colors
      ~ v2: $boolT
      `)

    expect(collection.get('v1')).toHaveLength(3)
    expect(collection.get('v1').join(',')).toBe('red,green,blue')
    expect(collection.get('v2')).toBeTruthy()
  })
})
