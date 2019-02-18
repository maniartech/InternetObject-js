import "jest"
import Tokenizer from "../src/tokenizer"
import ASTParser from '../src/parser/ast-parser';

const print = (o:any) => {
  console.log(JSON.stringify(o, null, 2))
}


describe("Tokenizer", () => {
  it("has a parse method", () => {
    // expect(typeof Tokenizer.parse).toBe("function")
  })
})


describe("Scalar Number", () => {
  // it("parses the integer", () => {
  //   let tokenizer = Tokenizer.parse("1")
  //   let token = tokenizer.get(0)
  //   expect(tokenizer.length).toBe(1)
  //   expect(token.index).toBe(0)
  // })
})

describe("Simple Object", () => {
  it("Test 1", () => {
    const test = '   One,Two,  "One and , two", ready:F, { Six, Seven, { nine, ten } }, [8, 9, 10]    '
    const test2 =
`
,
one
   ,,
two`
    const schemaTest = `
      id: number,
      name:{
        string,
        maxLength: 20
      },
      age?,
      tags: [{name:string, slug:string}],
      test:{type: string,  maxLength:10},
      string,
      address?: {
        building: {
          type: string,
          maxLength: 100
        },
        street?,
        city
      }`

    let tokenizer = new Tokenizer(test)
    let parser = new ASTParser()
    let token = tokenizer.read()
    while(token) {
      tokenizer.push(token)
      parser.process(token)
      token = tokenizer.read()
    }

    print(parser.stack[0])
    print(parser.toObject())
    print(parser.toSchema())
  })
})

const template = {
  type: "object",
  values: [
    {
      key: "name",
      value: {
        type: "object",
        values: [
          "string",
          {
            key: "max_length" ,
            value: 20
          }
        ]
      }
    },
    "age",
    {
      key: "address?",
      value: {
        type: "object",
        values: [

        ]
      }
    }
  ]
}

const schemaTemplate = {
  "id": "number",
  "name": {
    "type": "string",
    "max_length": 20
  },
  "age?": "type",
  "address?": {
    "building": {
      "type": "string",
      "max_length": 100
    },
    "street?": "any",
    "city": "any"
  }
}

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
