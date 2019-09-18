import 'jest'
import InternetObject from '../../src'
import { print } from '../../src/utils/index'

describe('pojo load', () => {
  it('load', () => {
    const schema = 'name, age:{number, max:20}'

    const obj = new InternetObject(
      {
        name: 'John Doe',
        age: 20
      },
      schema
    )

    // console.warn(">>>", obj.data)

    expect(obj).toBeInstanceOf(InternetObject)
    expect(obj.data.name).toBe('John Doe')
  })

  it('load2', () => {
    const schema = `
    name:{string}, age?:{number, choices:[30, 20, 10]}, address:{num:number, street, city, zip},
    test: {first, second, subtest: {x, y, z}},
    colors:[string]
    `
    const obj = new InternetObject(
      {
        name: 'John Doe',
        age: 30,
        address: {
          num: 1001,
          street: 'Bond Street',
          city: 'NY',
          zip: 50001
        },
        test: {
          first: 1,
          second: 2,
          subtest: {
            x: true,
            y: false,
            z: true
          }
        },
        colors: ['red', 'green', 'blue']
      },
      schema
    )

    expect(obj).toBeInstanceOf(InternetObject)
    expect(obj.data.name).toBe('John Doe')
    expect(obj.data.address.num).toBe(1001)
  })
})
