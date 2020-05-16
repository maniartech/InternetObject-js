import 'jest'
import InternetObject from '../../src'

describe('Object', () => {
  it('serializes untyped object', () => {
    const schema = String.raw`
    name, age, address: {stree, city, state}, tags?, profile?
    `

    const d1 = 'John Doe, 50, {Bond Street, New York, NY}, [one, two, three]'
    const d2 = 'John Doe, 50, {Bond Street, New York, NY}'

    expect(new InternetObject(d1, schema).serialize()).toBe(
      'John Doe,50,{Bond Street,New York,NY},[one,two,three]'
    )

    expect(new InternetObject(d2, schema).serialize()).toBe('John Doe,50,{Bond Street,New York,NY}')
  })

  it('serializes typed object', () => {
    const schema = String.raw`
    name:string, age:number, address: {stree:string, city:string, state:string}, tags?:[], profile?:string
    `

    const d1 = 'John Doe, 50, {Bond Street, New York, NY}, [one, two, three]'
    const d2 = 'John Doe, 50, {Bond Street, New York, NY}'

    expect(new InternetObject(d1, schema).serialize()).toBe(
      'John Doe,50,{Bond Street,New York,NY},[one,two,three]'
    )

    expect(new InternetObject(d2, schema).serialize()).toBe('John Doe,50,{Bond Street,New York,NY}')
  })
})

describe('POJO', () => {
  it('loads plain JavaScript objects', () => {
    const schema = 'name, age:{number, max:20}'

    const obj = new InternetObject(
      {
        name: 'John Doe',
        age: 20
      },
      schema
    )

    expect(obj).toBeInstanceOf(InternetObject)
    expect(obj.data.name).toBe('John Doe')
  })

  it('complex JavaScript objects', () => {
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
