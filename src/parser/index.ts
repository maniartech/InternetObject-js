

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

export function instanceOfParserTree(object: any): object is ASTParserTree {
  try {
    return "type" in object && "values" in object
  }
  catch {
    return false
  }
}

export function instanceOfKeyVal(object: any): object is KeyVal {
  try {
    return "key" in object && "value" in object
  }
  catch {
    return false
  }
}