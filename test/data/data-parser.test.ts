import 'jest'

import InternetObject from '../../src'

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
