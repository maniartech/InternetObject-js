import Definitions  from '../../core/definitions';
import TokenType from '../tokenizer/token-types';
import Token        from '../tokenizer/tokens';
import Node         from './nodes';

/**
 * Represents a token node. It represents the leaf nodes in the AST.
 */
class TokenNode extends Token implements Node {
  constructor (token: Token) {
    super();
    Object.assign(this, token);
  }

  /**
   * Returns the parsed value from the token.
   *
   * A string token may name a definition — `@name` a variable, `$name` a schema — in which
   * case its VALUE is what this node stands for. `getValue` is used rather than `getV` because
   * `getV` returns the stored AST node, which the schema type-checkers want and the value model
   * emphatically does not: reading a scalar variable this way used to project
   * `{ pos, row, col, token, value, type, subType }` in place of the value.
   *
   * Note that a reference is recognised by the token's VALUE, not its subType, so `"@a"` and
   * `r'@a'` are references exactly as a bare `@a` is. That is deliberate — confirmed
   * 2026-06-30, the conformance corpus FINDINGS #3 — and it means a literal `@`/`$`-leading string
   * cannot be written as data.
   *
   * @param defs Definitions to resolve a reference against, when the token names one.
   * @returns The parsed value.
   */
  toValue(defs?: Definitions): any {
    if (this.type === TokenType.STRING && defs !== undefined) {
      const valueFound = defs.getValue(this.value);
      return valueFound === undefined ? this.value : valueFound;
    }
    return this.value;
  }
}

export default TokenNode;
