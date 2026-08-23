import Definitions    from '../../core/definitions';
import ErrorCodes     from '../../errors/io-error-codes';
import ValidationError from '../../errors/io-validation-error';
import InternetObject from '../../core/internet-object';
import { Position } from '../../core/positions';
import Token from '../tokenizer/tokens';
import ContainerNode  from './containers';
import ErrorNode      from './error';
import MemberNode     from './members';

/**
 * Reject a member name that has already been used in this object.
 *
 * `duplicate-member` is stated unconditionally in the specification — "a member name appears more
 * than once" — and the row beside it qualifies itself explicitly ("a **strict** schema was given
 * a member it does not declare"), so the absence of a qualifier here is deliberate.
 *
 * Only the SCHEMA path enforced it. Without a schema the object was assembled with `set()`, which
 * overwrites, so `a: 1, a: 2` quietly loaded as `{a: 2}` and the first value was gone with no
 * diagnostic. Same shape as every other silent-corruption defect in this format: the document said
 * one thing and the value model held another.
 *
 * It was also a porting trap. A port that builds records into a map gets last-wins for free, so
 * the implementation that does the natural thing passed every corpus row and the one that bothered
 * to check failed them — the corpus was encoding a JavaScript accident as law.
 *
 * The check lives here rather than in `InternetObject.set`, which is a general API where
 * overwriting is legitimate and expected.
 */
function assertNotDuplicate(seen: Set<string>, key: string, member: MemberNode): void {
  if (seen.has(key)) {
    throw new ValidationError(
      ErrorCodes.duplicateMember,
      `Member '${key}' appears more than once.`,
      member.key
    );
  }
  seen.add(key);
}

class ObjectNode extends ContainerNode {
  openBracket?: Token;
  closeBracket?: Token;

  constructor(children: Array<MemberNode | undefined> = [], openBracket?: Token, closeBracket?: Token) {
    super('object', children);

    if (openBracket) {
      this.openBracket = openBracket;
    }

    if (closeBracket) {
      this.closeBracket = closeBracket;
    }
  }

  toObject(defs?: Definitions): any {
    const value: any = {};
    const seen = new Set<string>();
    let index = 0;
    for (const child of this.children as Array<MemberNode>) {
      if (child && child.value) {
        if (child.key) {
          const key = child.key.value as string;
          assertNotDuplicate(seen, key, child);
          value[key] = child.value.toValue(defs);
        } else {
          value[index] = child.value.toValue(defs);
        }
      } else {
        value[index] = undefined;
      }

      index++;
    }
    return value;
  }

  getStartPos(): Position {
    if (this.openBracket) {
      return this.openBracket.getStartPos();
    }

    return this.children[0]?.getStartPos() ?? Position.unknown;
  }

  getEndPos(): Position {
    if (this.closeBracket) {
      return this.closeBracket.getEndPos();
    }

    return this.children[this.children.length - 1]?.getEndPos() ?? Position.unknown;
  }

  toValue (defs?: Definitions): InternetObject {
    const o = new InternetObject();
    const seen = new Set<string>();
    for (let i=0; i<this.children.length; i++) {
      const member = this.children[i] as MemberNode;
      if (member && member.value) {
        if (member.key) {
          const key = member.key.value as string;
          assertNotDuplicate(seen, key, member);
          o.set(key, member.value.toValue(defs));
        } else {
          // Positional member: store WITHOUT a key via pushValue (NOT push — push would misread an
          // array value like ["a","b"] as a [key,value] tuple and drop elements). The author wrote no
          // key, so the model carries none; rendering handles keyless members positionally, and the
          // JSON projection falls back to `key || index`.
          o.pushValue(member.value.toValue(defs))
        }
      }
    }

    return o;
  }

  // Utility Methods
  isEmpty(): boolean {
    return this.children.length === 0 || this.children.every(child => child === undefined);
  }

  toDebugString(): string {
    const memberStrings = this.children.map((child, index) => {
      if (!child) return `[${index}]: undefined`;

      const member = child as MemberNode;
      const keyStr = member.key ? member.key.value : `[${index}]`;
      const valueStr = member.value ?
        (typeof member.value.toValue === 'function' ?
          JSON.stringify(member.value.toValue()) :
          String(member.value)) :
        'undefined';

      return `${keyStr}: ${valueStr}`;
    });

    return `ObjectNode { ${memberStrings.join(', ')} }`;
  }

  hasKey(key: string): boolean {
    return this.children.some(child => {
      if (!child) return false;
      const member = child as MemberNode;
      return member.key && member.key.value === key;
    });
  }

  getKeys(): string[] {
    const keys: string[] = [];
    this.children.forEach((child, index) => {
      if (child) {
        const member = child as MemberNode;
        if (member.key) {
          keys.push(member.key.value as string);
        } else {
          keys.push(index.toString());
        }
      }
    });
    return keys;
  }

  isValid(): boolean {
    // An object is valid if none of its members contain ErrorNodes
    return this.children.every(child => {
      if (!child) return true; // undefined members are considered valid

      const member = child as MemberNode;

      // Check if the member value is an ErrorNode
      if (member.value instanceof ErrorNode) {
        return false;
      }

      // Check if the member key is an ErrorNode (though this is less common)
      if (member.key instanceof ErrorNode) {
        return false;
      }

      return true;
    });
  }
}

export default ObjectNode;