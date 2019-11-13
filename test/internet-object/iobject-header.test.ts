import 'jest'
import InternetObject from '../../src'
import Schema from '../../src/header/schema'
import Header from '../../src/header'

describe('Internet Object', () => {
  it('can have metadata, schema and data', () => {
    const io = new InternetObject(String.raw`
      ~ recordCount: 1
      ~ isSuccessful: T
      ~ schema: { name, age, gender }
      ---
      Spiderman, 25, Male
      `)

    expect(io.data).toBeDefined()
    expect(io.header).toBeInstanceOf(Header)
    expect(io.schema).toBeInstanceOf(Schema)
  })
})
