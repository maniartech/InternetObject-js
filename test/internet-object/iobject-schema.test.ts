import 'jest'
import InternetObject from '../../src'
import Schema from '../../src/header/schema'

describe('Internet Object', () => {
  it('supports compiled schema', () => {
    const schema = Schema.compile(String.raw`
    name, age, gender
    `)

    const data = String.raw`Spiderman, 25, Male`

    const io = new InternetObject(data, schema)

    expect(io.data.name).toBe('Spiderman')
  })

  it('supports compiled schema', () => {
    const schema = Schema.compile(String.raw`
    name, age, gender
    `)

    const data = {
      name: 'Spiderman',
      age: 25,
      gender: 'M'
    }

    const io = new InternetObject(data, schema)

    expect(io.serialize()).toBe('Spiderman,25,M')
  })

  it('sets the schema to null when not supplied', () => {
    const io = new InternetObject({
      name: 'Spiderman',
      age: 25,
      gender: 'M'
    })
    expect(io.data).toBeDefined()
    expect(io.header).toBeDefined()
    expect(io.schema).toBeNull()
  })

  it('throws an error when invalid schema type is passed', () => {
    const intializer = () => {
      const data = String.raw`Spiderman, 25, Male`
      const schema: any = true // Invalid schema

      const io = new InternetObject(data, schema)
    }

    expect(intializer).toThrowError()
  })
})
