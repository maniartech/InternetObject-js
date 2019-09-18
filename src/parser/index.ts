/**
 * Node represents an object that
 */
export interface Node {
  col: number
  row: number
  index: number
}

/**
 * Represents the single token identified by the
 * `Tokenizer`
 */
export interface Token extends Node {
  value: any
  token: string
  type: string
}

export interface KeyVal extends Node {
  key: string
  value: ParserTreeValue
}

export interface ASTParserTree extends Node {
  type: string
  values: ParserTreeValue[]
}

export type ParserTreeValue = undefined | ASTParserTree | KeyVal | Token
