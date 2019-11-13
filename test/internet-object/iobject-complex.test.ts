import 'jest'
import InternetObject from '../../src'
import Tokenizer from '../../src/parser/tokenizer'
import { print } from '../../src/utils/index'
import ASTParser from '../../src/parser/ast-parser'

describe('Internet Object', () => {
  it('supports complext objects', () => {
    const schema = `
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
  })
})
