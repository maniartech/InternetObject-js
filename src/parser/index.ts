

export type KeyVal = {
  key: string,
  value: ParserTreeValue
}

export type ParserTreeValue =
  null |
  undefined |
  ASTParserTree |
  string |
  number |
  boolean |
  KeyVal

export interface ASTParserTree {
  type: string,
  values: ParserTreeValue[]
}

