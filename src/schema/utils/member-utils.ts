import Node from '../../parser/nodes/nodes';
import TokenNode from '../../parser/nodes/tokens';
import TokenType from '../../parser/tokenizer/token-types';
import Token from '../../parser/tokenizer/tokens';
import SyntaxError from '../../errors/io-syntax-error';
import ErrorCodes from '../../errors/io-error-codes';
import assertNever from '../../errors/asserts/asserts';

// Normalize a key token: accept Token or TokenNode(STRING) and return a TokenNode(STRING)
export function normalizeKeyToken(keyNode: Node): Node {
  if (!keyNode) {
    assertNever('Key node must not be null in schema definition.');
  }
  if (keyNode instanceof TokenNode) {
    if (keyNode.type === TokenType.STRING) return keyNode;
  } else if (keyNode instanceof Token) {
    if (keyNode.type === TokenType.STRING) return new TokenNode(keyNode);
  }
  throw new SyntaxError(ErrorCodes.invalidKey, 'The key must be a string.', keyNode as any);
}
