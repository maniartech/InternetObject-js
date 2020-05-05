import 'jest'

import InternetObject from '../../src'
import Schema from '../../src/header/schema'

describe('Schema Structure', () => {
  it('defines simple structure', () => {
    const schemaStr = 'name, age, address:{street, city, state}'
    const compiled: any = Schema.compile(schemaStr)
    const schema = compiled._schema

    expect(schema.keys).toBeDefined()
    expect(schema.defs).toBeDefined()

    expect(schema.keys).toMatchObject(['name', 'age', 'address'])
    expect(schema.defs).toMatchObject({
      name: {
        type: 'any',
        optional: false,
        null: false,
        path: 'name'
      },
      age: {
        type: 'any',
        optional: false,
        null: false,
        path: 'age'
      },
      address: {
        type: 'object',
        optional: false,
        null: false,
        path: 'address'
      }
    })

    expect(schema.defs['address'].schema.keys).toMatchObject(['street', 'city', 'state'])
    expect(schema.defs['address'].schema.defs).toMatchObject({
      street: {
        type: 'any',
        optional: false,
        null: false,
        path: 'address.street'
      },
      city: { type: 'any', optional: false, null: false, path: 'address.city' },
      state: { type: 'any', optional: false, null: false, path: 'address.state' }
    })
  })

  it('defines optionals and nulls', () => {
    const schemaStr = 'name, age*, address?*:{street, city?, state?}'
    const compiled: any = Schema.compile(schemaStr)
    const schema = compiled._schema

    expect(schema.keys).toBeDefined()
    expect(schema.defs).toBeDefined()

    expect(schema.keys).toMatchObject(['name', 'age', 'address'])
    expect(schema.defs).toMatchObject({
      name: {
        type: 'any',
        optional: false,
        null: false,
        path: 'name'
      },
      age: {
        type: 'any',
        optional: false,
        null: true,
        path: 'age'
      },
      address: {
        type: 'object',
        optional: true,
        null: true,
        path: 'address'
      }
    })

    expect(schema.defs['address'].schema.defs).toMatchObject({
      street: {
        type: 'any',
        optional: false,
        null: false,
        path: 'address.street'
      },
      city: { type: 'any', optional: true, null: false, path: 'address.city' },
      state: { type: 'any', optional: true, null: false, path: 'address.state' }
    })
  })

  it('handles variables', () => {
    const text = String.raw`
        ~ r: red
        ~ g: green
        ~ b: blue
        ~ id: 0000-0000-0000-0000
        ~ tag: [a, b, c]
        ~ $person: {name, age}
        ~ $address: {street, city, zip}
        ~ $schema: {
          person: $$person,
          address: $$address,
          id?:{string, default:$id},
          color?: {string, default:$r, choices:[$r, $g, $b]},
          tag?: {string, choices:$tag}
        }
        ---
        ~ {Spiderman, 25}, {100, NY, 50001}, "8888-8888-8888-8888", $g, a
        ~ {Ironman, 45}, {200, Malibu, 60001}
      `

    const io = new InternetObject(text)

    const [o1, o2] = io.data

    expect(io.schema.schema.defs['color']).toMatchObject({
      type: 'string',
      default: 'red',
      choices: ['red', 'green', 'blue']
    })

    expect(o1).toMatchObject({
      id: '8888-8888-8888-8888',
      person: { name: 'Spiderman', age: 25 },
      address: { street: 100, city: 'NY', zip: 50001 },
      color: 'green',
      tag: 'a'
    })

    expect(o2).toMatchObject({
      id: '0000-0000-0000-0000',
      person: { name: 'Ironman', age: 45 },
      address: { street: 200, city: 'Malibu', zip: 60001 },
      color: 'red',
      tag: undefined
    })
  })
})

// describe('Complex Schema', () => {
//   it('tryout', () => {
//     // expect(typeof IO.parse).toBe("function")

//     const test = `
//     name:{string}, age?:{number, choices:[30, 20, 10]}, address:{num:{number, max:10}, street, city, zip}, test: {first, second, subtest: {x, y, z}}, colors:[string]
//     ---
//     Spiderman,25, {5, Bond Street, New York, 50001 }, {10, 20, {"T", A, A}}, ["red", "blue", "green"]
//     `

//     const s1 =
//       'name:string, age?:{number, min:30, null}, address:{street, city, zip}, test: {first, second, subtest: {x, y, z}}'
//     const d1 = 'Spiderman, 25, { Bond Street, New York, 50001 }, {10, 20, {"T", A, A}}'
//     const d2 = 'Ironman, 40,,N, a:b'

//     const test2 = 'Aamir, 40, [1, 2, 3],,{}, test:T, test2:{a, b}'

//     const schemaTest = `
//     id: number,
//     name?: {firstName:string, lastName:string},
//     dept: {{name, deptNo}, null},
//     age,
//     tags?: {[{name:string, slug:string}], null},
//     category?:{{name:string, slug:string}, null},
//     test?: {string,  maxLength:10},
//     test2: {string, maxLength:20},
//     emptyObj: {},
//     emptyArr: [],
//     strArr: [string],
//     optionalEmptyObj?: {},
//     optionalEmptyArr?: [],
//     optionalStringArr?: [string],
//     address: {
//       {
//         building?: {
//           string,
//           maxLength: 100
//         },
//         street?,
//         city,
//         latlng: {{latitude:number, longitude:number}, null, optional}
//       }, null
//     },
//     colors:{[
//       {[{r:number, g:number, b:number}], maxLength:10}
//     ], maxLength:3},
//     complex:{{a, b:{c, d:{e, f, g:{{h?},optional, null}, i?:[number]}}}, null}`

//     const testableSchema = `
//       a: [string]
//     `

//     // const obj = IObject.parse(test).data
//     // print("Data", obj)

//     // const schema = IObject.compileSchema(schemaTest)
//     // print("Schema ", schema)

//     // const o = IO.parse(test2)
//     // print("Output:", obj)

//     // const s = IObject.parse(schemaTest).data
//     // print("Schema", s)

//     interface Persona {
//       firstName: string
//       lastName: string
//       age?: number
//     }

//     const obj = `
//     ~ success: T
//     ~ $schema: {firstName, lastName, age?}
//     ---
//     ~ Aam"ir""                 , Maniar
//     ~ Kabir, Maniar, 15
//     `
//     // const parser = new ASTParser(obj)
//     // parser.parse()
//     // print(">>>", parser.tree)
//     const str = '\\"aam,ir\\"'
//     const s2 = '   "Aam",ir\\"                 , Maniar'
//     const date = new Date()
//     // const io = new InternetObject(s2)
//     // const json = JSON.parse('{"name": "aamir", "age":40}')
//     // print("IO", io.data)
//     // console.log(`Executed in ${(new Date()).getTime() - date.getTime()} milliseconds`)
//   })
// })
