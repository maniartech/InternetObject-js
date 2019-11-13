import 'jest'
import InternetObject from '../../src'

interface Person {
  name: string
  age: number
  address: {
    street: string
    city: string
    state: string
  }
}

const isPerson = (person: any): person is Person => {
  if (typeof person !== 'object') return false

  return (
    person.name !== undefined &&
    person.age !== undefined &&
    person.address !== undefined &&
    person.address.street !== undefined &&
    person.address.city !== undefined &&
    person.address.state !== undefined
  )
}

describe('Internet Object', () => {
  it('supports complex typed objects', () => {
    const schema = String.raw`
    name, age, address: {street, city, state}
    `

    const data = String.raw`
    Spiderman, 25, { Bond Street, New York, NY }
    `

    const io = new InternetObject<Person>(data, schema)

    expect(isPerson(io.data)).toBeTruthy()
    expect(io.data.name).toBe('Spiderman')
  })
})
