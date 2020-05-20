import 'jest'
import InternetObject from '../../src'
import ErrorCodes from '../../src/errors/io-error-codes'

describe('Internet Object', () => {
  it('Structure', () => {
    const io = new InternetObject(String.raw`
      name, age, gender
      ---
      Spiderman, 25, M
      `)
    expect(io.data).toBeDefined()
    expect(io.header).toBeDefined()
    expect(io.schema).toBeDefined()
  })

  it('Types', () => {
    expect(new InternetObject('N').data).toBeNull()
    expect(new InternetObject('10').data).toBe(10)
  })

  it('checks whether there is a data', () => {
    expect(new InternetObject('').data).toBeUndefined()
    expect(new InternetObject('   ').data).toBeUndefined()
    expect(new InternetObject('   ').data).toBeUndefined()
    // expect(new InternetObject('\n').data).toBeUndefined()
  })

  it('Structure Positional and Keyword Arguments', () => {
    const t1 = () => {
      const io = new InternetObject(String.raw`
        name, age, gender
        ---
        Spiderman, age:25, M
        `)
    }
    const t2 = () => {
      const io = new InternetObject(String.raw`
        name, age, gender
        ---
        name:Spiderman, 25, M
        `)
    }

    expect(t1).toThrowError(ErrorCodes.positionalMemberAfterKeywordMember)
    expect(t2).toThrowError(ErrorCodes.positionalMemberAfterKeywordMember)
  })

  it('handles variables', () => {
    const text = String.raw`
        ~ noName: Anonymous
        ~ r: red
        ~ g: green
        ~ b: blue
        ~ colors: [$r, $g, $b]
        ~ options: { color:$r, list: $colors }
        ~ $schema: {name?, age?, tag?:{colors:{red, green, blue}}}
        ---
        ~ Spiderman, 25, {colors:{red: $r, green: $g, blue: $b}}
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
      tag: {
        colors: {
          red: 'red',
          green: 'green',
          blue: 'blue'
        }
      }
    })

    expect(o2).toMatchObject({
      name: 'Anonymous',
      age: 10
    })
  })

  it('loads top level object with curly braces', () => {
    expect(new InternetObject('{}').data).toMatchObject({})
    expect(new InternetObject('{test}').data).toMatchObject({ '0': 'test' })
  })

  // TODO: It should throw the error in the following case
  // ~ name:,age:10
})
