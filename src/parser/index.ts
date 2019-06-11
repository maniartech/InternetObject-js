
/**
 * Represents the single token identified by the
 * `Tokenizer`
 */
export interface Token {
  value: any,
  token: string,
  type: string,
  col: number,
  row: number,
  index: number
}

export type KeyVal = {
  key: string,
  value: ParserTreeValue
}

export interface ASTParserTree {
  type: string,
  values: ParserTreeValue[]
}

export type ParserTreeValue =
  null |
  ASTParserTree |
  KeyVal |
  Token
