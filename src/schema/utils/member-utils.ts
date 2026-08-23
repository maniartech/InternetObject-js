import MemberDef from '../types/memberdef';
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

/**
 * The MemberDef for an UNDECLARED member — one carried by an open (`*`) or untyped container.
 *
 * An untyped container constrains NOTHING, and that has to include nullability. It did not:
 * `{a: null}` inside a member typed `object` (or `{}`, or an open `{name, *}`) was rejected with
 * `null-not-allowed`, while the identical record with no schema at all round-tripped fine. `any`
 * defaults to `null: false`, and all four sites that synthesized this def by hand inherited that
 * default — the same decision written out four times, each missing the same case.
 *
 * When the container declares a TYPE for its extras (`*: int`), that wins: the nullability is then
 * the schema author's choice, not an inference.
 *
 * @param path  the member's path, for error messages
 * @param open  the container's `open`: `true` for a bare `*`, or the wildcard's MemberDef
 */
export function undeclaredMemberDef(path: string, open: boolean | MemberDef | undefined): MemberDef {
  if (open && typeof open === 'object' && (open as MemberDef).type) {
    return { ...(open as MemberDef), path };
  }
  return { type: 'any', path, null: true };
}
