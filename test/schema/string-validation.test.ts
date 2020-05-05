import 'jest'
import InternetObject from '../../src'
import ErrorCodes from '../../src/errors/io-error-codes'

describe('String Patterns', () => {
  it('Blank string', () => {
    const obj = new InternetObject('')
    expect(obj.data).toBeUndefined()
  })

  it('handles properly handles null and undefined', () => {
    const objStr = String.raw`
    v1?:string, v2?:string, v3?*:string, v4?*:string
    ---
    ~ test,,N,
    ~ ,,,
    `
    const obj = new InternetObject(objStr)
    const [o1, o2, o3] = obj.data
    expect(o1.v1).toBe('test')
    expect(o1.v2).toBeUndefined()
    expect(o1.v3).toBe(null)
    expect(o1.v4).toBeUndefined()

    expect(o2.v1).toBeUndefined()
    expect(o2.v2).toBeUndefined()
    expect(o2.v3).toBeUndefined()
    expect(o2.v4).toBeUndefined()
    expect(o2.v5).toBeUndefined()
  })

  it('All optional with no value', () => {
    const obj = new InternetObject('"   "')
    // console.warn(obj.data)
    expect(obj.data).toBe('   ')
  })

  it('valid pattern values', () => {
    const objStr = String.raw`
    v1:{string, pattern:'[a-zA-Z\s]+'}
    ---
    Lorem ipsum dolor sit amet
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe('Lorem ipsum dolor sit amet')
  })

  it('invalid pattern values', () => {
    const t1 = () => {
      return new InternetObject(String.raw`
      v1:{string, pattern:'[a-zA-Z\s]+'}
      ---
      Lorem ipsum dolor sit amet?
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
        email:email
        ---
        spiderman
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
        email:email
        ---
        @marvel.com
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })

  it('handles variables', () => {
    const text = String.raw`
        ~ noName: Anonymous
        ~ r: red
        ~ g: green
        ~ b: blue
        ~ $schema: {name:string, color:{string, choices:[red, blue]}, tag?:[{color:string}]}
        ---
        ~ Spiderman, $b, [{color:$g}, {color: $r}]
        ~ $noName, color:$b
      `

    const io = new InternetObject(text)
    const [o1, o2] = io.data

    expect(o1.name).toBe('Spiderman')
    // expect(o1.tag[0].colors[0].c[0][0].colors.join(',')).toBe('red,green,blue')
    expect(o1.tag[0].color).toBe('green')
    expect(o1.tag[1].color).toBe('red')

    expect(o2.name).toBe('Anonymous')
    // // When the variable does not exists
    // // it should not replace it with any value
    expect(o2.color).toBe('blue')

    const e1 = () => {
      const text = String.raw`
        ~ noName: Anonymous
        ~ r: red
        ~ g: green
        ~ b: blue
        ~ $schema: {name:string, color:{string, choices:[red, blue]}, tag?:[{color:string}]}
        ---
        ~ Spiderman, $b, [{color:$g}, {color: $r}]
        ~ $noName, $noVar`
      const io = new InternetObject(text)
    }
    expect(e1).toThrowError(ErrorCodes.invalidChoice)
  })
})
