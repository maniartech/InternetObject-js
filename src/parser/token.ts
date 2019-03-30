
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
