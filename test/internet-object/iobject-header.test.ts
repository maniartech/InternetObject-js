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

  it('can have just metadata, data and separate', () => {
    const schema = Schema.compile(String.raw`
      name, age, gender`)
    const io = new InternetObject(
      String.raw`
      ~ recordCount: 1
      ~ isSuccessful: T
      ---
      Spiderman, 25, Male
      `,
      schema
    )

    expect(io.data).toBeDefined()
    expect(io.header).toBeInstanceOf(Header)
    expect(io.schema).toBeInstanceOf(Schema)
  })

  it('can have just schema and data', () => {
    const io = new InternetObject(String.raw`
      name2, age, gender
      ---
      Spiderman, 25, Male
      `)

    expect(io.data).toBeDefined()
    expect(io.header).toBeInstanceOf(Header)
    expect(io.schema).toBeInstanceOf(Schema)
  })
})
