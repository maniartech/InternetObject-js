import 'jest'
import InternetObject from '../../src'
import ASTParser from '../../src/parser/ast-parser'
import { print } from '../../src/utils/index'
import ErrorCodes from '../../src/errors/io-error-codes'

const min = Number.MIN_SAFE_INTEGER
const max = Number.MAX_SAFE_INTEGER

const dt11 = '"2020-04-12T08:43:46.619Z"'
const dt12 = '"2020-04-12T08:43:46"'
const dt13 = '"2020-04-12T08:43"'

const dt21 = '20200412T084346.619Z'
const dt22 = '20200412T084346'
const dt23 = '20200412T0843'

describe('Date Parser', () => {
  // it('parsers valid dates', () => {
  //   const objStr = String.raw`
  //   v1:datetime, v2:datetime, v3?:datetime
  //   ---
  //   ~ ${dt11}, ${dt12}
  //   ~ ${dt21}, ${dt22}, ${dt23}
  //   `

  //   const { data } = new InternetObject(objStr)

  //   expect(data[0].v1 instanceof Date).toBeTruthy()
  //   expect(data[0].v2 instanceof Date).toBeTruthy()
  //   // expect(data[0].v3 instanceof Date).toBeTruthy()
  //   expect(data[1].v1 instanceof Date).toBeTruthy()
  //   expect(data[1].v2 instanceof Date).toBeTruthy()
  //   expect(data[1].v3 instanceof Date).toBeTruthy()

  // })

  it('checks validations and default value', () => {
    const objStr = String.raw`
    v1?:datetime, v2?*:{datetime, default:N}, v3:{datetime, default:now}
    ---
    ~ , ${dt12}
    ~ ,,
    ~ ,N,
    `

    const { data } = new InternetObject(objStr)

    // console.warn(data)
    // expect(data[0].v1 instanceof Date).toBeTruthy()
    // expect(data[0].v2 instanceof Date).toBeTruthy()
    // // expect(data[0].v3 instanceof Date).toBeTruthy()
    // expect(data[1].v1 instanceof Date).toBeTruthy()
    // expect(data[1].v2 instanceof Date).toBeTruthy()
    // expect(data[1].v3 instanceof Date).toBeTruthy()
  })

  it('validate dates', () => {
    const objStr = String.raw`
    v1:{datetime, default:now}, v2*:{datetime, N}
    ---
    ~ , 
    `
  })

  // it('all optional ints', () => {
  //   const objStr = String.raw`
  //   v1?:number, v2?:number, v3?:number
  //   ---
  //   ,,0
  //   `
  //   const obj = new InternetObject(objStr)

  //   const parser = new ASTParser(objStr)
  //   parser.parse()
  //   // print(parser)
  //   // console.warn(obj.data)
  //   expect(obj.data.v1).toBe(undefined)
  //   expect(obj.data.v2).toBe(undefined)
  //   expect(obj.data.v3).toBe(0)
  // })

  // it('invalid ints', () => {
  //   const t1 = () => {
  //     return new InternetObject(String.raw`
  //       v1:int
  //       ---
  //       0.005
  //     `)
  //   }
  //   const t2 = () => {
  //     return new InternetObject(String.raw`
  //     v1:int
  //     ---
  //     -100.005
  //     `)
  //   }

  //   const t3 = () => {
  //     return new InternetObject(String.raw`
  //     v1:int
  //     ---
  //     100.5
  //     `)
  //   }
  //   expect(t1).toThrowError()
  //   expect(t2).toThrowError()
  //   expect(t3).toThrowError()
  // })
})

// describe('Number Load', () => {
//   it('valid ints', () => {
//     const schema = String.raw`
//     v1:number, v2:number, v3:number
//     `
//     const obj = new InternetObject(
//       {
//         v1: min,
//         v2: max,
//         v3: 0
//       },
//       schema
//     )
//     expect(obj.data.v1).toBe(min)
//     expect(obj.data.v2).toBe(max)
//     expect(obj.data.v3).toBe(0)
//   })

//   it('invalid ints', () => {
//     const t1 = () => {
//       return new InternetObject(String.raw`
//         v1:int
//         ---
//         0.005
//       `)
//     }
//     const t2 = () => {
//       return new InternetObject(String.raw`
//       v1:int
//       ---
//       -100.005
//       `)
//     }

//     const t3 = () => {
//       return new InternetObject(String.raw`
//       v1:int
//       ---
//       100.5
//       `)
//     }
//     expect(t1).toThrowError()
//     expect(t2).toThrowError()
//     expect(t3).toThrowError()
//   })

//   it('handles variables', () => {
//     const text = String.raw`
//         ~ a:1
//         ~ b:2
//         ~ $schema: {a:number, b:number, tags:[{o:{number, choices: [1, 2]}}]}
//         ---
//         ~ $a, $b, [{$a}, {o:$b}]
//         ~ a:$a, b:$b, tags:[{o:$a}, {o:$b}]
//       `

//     const io = new InternetObject(text)
//     const [o1, o2] = io.data

//     expect(o1.a).toBe(1)
//     expect(o1.b).toBe(2)
//     expect(o1.tags[0].o).toBe(1)
//     expect(o1.tags[1].o).toBe(2)

//     expect(o2.a).toBe(1)
//     expect(o2.b).toBe(2)
//     expect(o2.tags[0].o).toBe(1)
//     expect(o2.tags[1].o).toBe(2)

//     const e1 = () => {
//       const text = String.raw`
//         ~ a:1
//         ~ b:2
//         ~ $schema: {a:number, b:number, tags:[{o:{number, choices: [1, 3]}}]}
//         ---
//         ~ $a, $b, [{$a}, {o:$b}]
//       `

//       const io = new InternetObject(text)
//     }
//     expect(e1).toThrowError(ErrorCodes.invalidChoice)
//   })
// })
