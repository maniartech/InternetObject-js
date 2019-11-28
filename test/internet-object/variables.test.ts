import 'jest'
import KeyValueCollection from '../../src/header'
import { InternetObject } from '../../src/internet-object'

describe('Variables in KeyValueCollection', () => {
  it('allows you to define variables in the header', () => {
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

  it('applies variables in the data (when no schema is present)', () => {
    const io = new InternetObject(String.raw`
      ~ r: red
      ~ g: green
      ~ b: blue
      ---
      ~ name:Spiderman, color:$r
      ~ name:Ironman, color:$b
      `)

    expect(io.data[0]).toMatchObject({
      name: 'Spiderman',
      color: 'red'
    })

    expect(io.data[1]).toMatchObject({
      name: 'Ironman',
      color: 'blue'
    })
  })
})
