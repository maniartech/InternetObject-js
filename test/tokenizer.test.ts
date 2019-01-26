import "jest"
import Tokenizer from "../src/tokenizer"


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
    const test = '   One,Two,  "One and , two" ,F, { Six, Seven }, [8, 9]    '
    const test2 =
`
,
one
   ,,
two`

    let tokenizer = new Tokenizer(test)
    tokenizer.readAll()

    console.log("Tokens for", test)
    console.log(tokenizer.tokens)
  })
})

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
