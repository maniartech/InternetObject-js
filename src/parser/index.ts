import { Token } from '../token';


export type KeyVal = {
  key: string,
  value: ParserTreeValue
}



// export type ParserTreeValue =
//   null |
//   undefined |
//   ASTParserTree |
//   string |
//   number |
//   boolean |
//   KeyVal

export type ParserTreeValue =
  null |
  ASTParserTree |
  KeyVal |
  Token

export interface ASTParserTree {
  type: string,
  values: ParserTreeValue[]
}

