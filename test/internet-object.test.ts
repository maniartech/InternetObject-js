import "jest"
import IObject from "../src"
import { print } from '../src/utils/index';
import InternetObjectSchema from "../src/schema/index";

describe("Internet Object", () => {
  it("tryout", () => {
    // expect(typeof IO.parse).toBe("function")

    const test = `
    name:{string}, age?, address:{street, city, zip}, test: {first, second, subtest: {x, y, z}}, colors:[string]
    ---
    Spiderman,25, { Bond Street, New York, 50001 }, {10, 20, {"T", A, A}}, ["red", "blue", "green"]
    `

    const s1 = 'name:string, age?:{number, min:30, null}, address:{street, city, zip}, test: {first, second, subtest: {x, y, z}}'
    const d1 = 'Spiderman, 25, { Bond Street, New York, 50001 }, {10, 20, {"T", A, A}}'
    const d2 = 'Ironman, 40,,N, a:b'

    const test2 = 'Aamir, 40, [1, 2, 3],,{}, test:T, test2:{a, b}'

    const schemaTest = `
    id: number,
    name?: {firstName:string, lastName:string},
    dept: {{name, deptNo}, null},
    age,
    tags?: {[{name:string, slug:string}], null},
    category?:{{name:string, slug:string}, null},
    test?: {string,  maxLength:10},
    test2: {string, maxLength:20},
    emptyObj: {},
    emptyArr: [],
    strArr: [string],
    optionalEmptyObj?: {},
    optionalEmptyArr?: [],
    optionalStringArr?: [string],
    address: {
      {
        building?: {
          string,
          maxLength: 100
        },
        street?,
        city,
        latlng: {{latitude:number, longitude:number}, null, optional}
      }, null
    },
    colors:{[
      {[{r:number, g:number, b:number}], maxLength:10}
    ], maxLength:3},
    complex:{{a, b:{c, d:{e, f, g:{{h?},optional, null}, i?:[number]}}}, null}`

    const testableSchema = `
      a: [string]
    `

    try {
      const obj = IObject.parse(test).data
      print("Data", obj)

      // const schema = IObject.compileSchema(schemaTest)
      // print("Schema ", schema)

      // const o = IO.parse(test2)
      // print("Output:", obj)

      // const s = IObject.compileSchema(schemaTest)
      // print("Schema", s)
    }
    catch (e) {
      console.error(e.message)
      throw e
    }

  })
})

// describe("Scalar Number", () => {
//   it("parses the integer", () => {
//     expect(IObject.parse("1").data).toBe(1)
//     expect(IObject.parse("10").data).toBe(10)
//     expect(IObject.parse("100").data).toBe(100)
//   })
// })

// describe("Scalar Boolean", () => {
//   it("parses the boolean", () => {
//     expect(IO.parse("T")).toBe(true)
//     expect(IO.parse("F")).toBe(false)
//   })
// })

// describe("Scalar String", () => {
//   it("parses the string", () => {
//     expect(IO.parse("Hello World")).toBe("Hello World")
//     expect(IO.parse("Wow great!")).toBe("Wow great!")
//   })
// })

// describe("Object", () => {
//   it("simple object", () => {
//     const test = "One, Two, 3, 4, T"
//     const o = IO.parse(test)

//     expect(o[0]).toBe("One")
//     expect(o[1]).toBe("Two")
//     expect(o[2]).toBe(3)
//     expect(o[3]).toBe(4)
//     expect(o[4]).toBe(true)
//   })
// })

// describe("Undefined", () => {
//   it("checks undefined", () => {
//     const test = "1,,3,    ,5"
//     const o = IO.parse(test)

//     expect(o[1]).toBeUndefined()
//   })
// })


const o = {

}