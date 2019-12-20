import 'jest'
import InternetObject from '../../src'
import ErrorCodes from '../../src/errors/io-error-codes'

describe('Array', () => {
  it('handles variables', () => {
    const text = String.raw`
        ~ noName: Anonymous
        ~ r: red
        ~ g: green
        ~ b: blue
        ~ colors: [$r, $g, $b]
        ~ options: { color:$r, list: $colors }
        ~ $schema: {name?, age?, tag?:[{color:{red?, green?, blue?}}]}
        ---
        ~ Spiderman, 25, [{{red: $r}}, {{green: $g}}, {{blue: $b}}]
        ~ $noName, 10
      `

    const io = new InternetObject(text)
    const [o1, o2] = io.data

    expect(io.header.get('options')).toMatchObject({
      color: 'red',
      list: ['red', 'green', 'blue']
    })

    expect(o1).toMatchObject({
      name: 'Spiderman',
      age: 25,
      tag: [{ color: { red: 'red' } }, { color: { green: 'green' } }, { color: { blue: 'blue' } }]
    })

    expect(o2).toMatchObject({
      name: 'Anonymous',
      age: 10
    })
  })

  // TODO: It should throw the error in the following case
  // ~ name:,age:10
})
