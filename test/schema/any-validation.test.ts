import 'jest'
import InternetObject from '../../src'

describe('Any', () => {
  it('parses boolean anys', () => {
    const objStr = String.raw`
    v1, v2, v3, v4
    ---
    T, F, true, false
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.v1).toBe(true)
    expect(obj.data.v2).toBe(false)
    expect(obj.data.v3).toBe(true)
    expect(obj.data.v4).toBe(false)
  })

  it('handles properly handles null and undefined', () => {
    const objStr = String.raw`
    v1?, v2?*, v3?*, v4?*
    ---
    ~ test,N,,N,
    ~ ,,,,
    `
    const obj = new InternetObject(objStr)
    const [o1, o2, o3] = obj.data
    expect(o1.v1).toBe('test')
    expect(o1.v2).toBe(null)
    expect(o1.v3).toBe(undefined)
    expect(o1.v4).toBe(null)
    expect(o1.v5).toBe(undefined)

    expect(o2.v1).toBe(undefined)
    expect(o2.v2).toBe(undefined)
    expect(o2.v3).toBe(undefined)
    expect(o2.v4).toBe(undefined)
    expect(o2.v5).toBe(undefined)
  })

  it('handles variables', () => {
    const text = String.raw`
        ~ defaultName: Anonymous
        ~ r: red
        ~ g: green
        ~ b: blue
        ~ colors: [$r, $g, $b]
        ~ options: { color:$r, list: $colors }
        ~ schema: {name, age, tag?:[]}
        ---
        ~ Spiderman, 100, [{ colors:[{c:[[{colors: $colors}]]}]}, {color: $g}]
        ~ $defaultName, $noVar
      `

    const io = new InternetObject(text)
    const [o1, o2] = io.data
    expect(o1.name).toBe('Spiderman')
    expect(o1.tag[0].colors[0].c[0][0].colors.join(',')).toBe('red,green,blue')
    expect(o1.tag[1].color).toBe('green')

    expect(o2.name).toBe('Anonymous')
    // When the variable does not exists
    // it should not replace it with any value
    expect(o2.age).toBe('$noVar')
  })
})
