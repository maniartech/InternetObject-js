import 'jest'

import InternetObject from '../../src'
import DataParser from '../../src/data/index'

describe('Array', () => {
  it('KeyVal in array', () => {
    const text = String.raw`
    a, b
    ---
    T, [A:T, B:F, C:N]
    `

    const io = new InternetObject(text)
    expect(io.data.b[0].A).toBeTruthy()
    expect(io.data.b[1].B).toBeFalsy()
    expect(io.data.b[2].C).toBeNull()
  })
})

describe('Data Parser Test', () => {
  it('Null', () => {
    const tree: any = undefined
    const result = DataParser.parse(tree)
    expect(result).toBeNull()
  })
})
