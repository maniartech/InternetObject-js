import Definitions  from '../../core/definitions';
import Position from '../../core/position';
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
   * @param defs If the token is of type string, then check if it is a reference
   *             and return the value from the definitions.
   * @returns The parsed value.
   */
  toValue(defs?: Definitions): any {
    if (this.type === 'string' && defs !== undefined) {
      const valueFound = defs.getV(this.value);
      return valueFound === undefined ? this.value : valueFound;
    }
    return this.value;
  }
}

export default TokenNode;
