/**
 * B1 + B2 — a document that cannot hold invalid data.
 *
 * Parsing has always validated. Writing did not: a record knew its schema and `set('age', 'abc')`
 * wrote straight through, then serialized back out as invalid Internet Object text. Insertion had
 * the same hole from the other side — a record pushed into a schema-bearing collection carried no
 * schema, so nothing checked it, and nothing would check it later either.
 *
 * The two are one guarantee and ship together. Fixing only the write leaves every row the user
 * *added* unchecked, which is precisely the rows a user is most likely to get wrong.
 *
 * > **A schema-bearing document always holds valid data** — at parse, at load, at write, at insert,
 * > at attach. No fifth way in.
 *
 * ## No new rules, no new error codes
 *
 * Both hooks call the same `TypeDef.load()` the loader calls, with the same member definitions and
 * the same variable resolution. A value that a parse would reject is rejected here, with the code a
 * parse would have used. This is an existing rule reaching a call site it never reached — not a new
 * rule (thumb rule #1).
 *
 * ## What is deliberately NOT checked
 *
 * A schema-less object validates nothing. That is vacuous, not an exception: there is no shape to
 * check against, so the invariant above is about schema-bearing documents and stays uncaveated.
 */
import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import ValidationError from '../errors/io-validation-error';
import ErrorCodes from '../errors/io-error-codes';
import { installSchemaHooks } from '../core/schema-hooks';
import { loadObject } from './load-processor';
import resolveMemberDefVariables from './resolve-member-vars';
import Schema from './schema';
import TypedefRegistry from './typedef-registry';
import { undeclaredMemberDef } from './utils/member-utils';

/**
 * Validates and coerces one member on its way into a record.
 *
 * A member the schema declares is checked against its definition. A member it does not declare is
 * checked against the wildcard when the schema is open (`*`), and **rejected** when it is closed —
 * the same `unknown-member` a parse raises for the same text.
 */
function memberWrite(schema: Schema, key: string, value: any, defs?: Definitions): any {
  const declared = schema.defs[key];
  if (!declared && !schema.open) {
    throw new ValidationError(
      ErrorCodes.unknownMember,
      `The ${schema.name ? `${schema.name} ` : ''}schema does not define a member named '${key}'.`
    );
  }

  const memberDef = declared
    ? resolveMemberDefVariables(declared, defs)
    : undeclaredMemberDef(key, schema.open);

  const typeDef = TypedefRegistry.get(memberDef.type);
  // No `load` on the type means the loader stores the value as it is, and so does this.
  if (!typeDef || !('load' in typeDef) || !typeDef.load) return value;

  try {
    return typeDef.load(value, memberDef, defs);
  } catch (error) {
    if (error instanceof ValidationError && !error.message.includes(key)) {
      error.message = `Error in field '${key}': ${error.message}`;
    }
    throw error;
  }
}

/**
 * Validates an inserted record against the collection's element schema, and returns the record to
 * store — schema attached, indistinguishable from a parsed one.
 *
 * **Adopting can replace the value.** A plain object becomes a record; a record built by hand is
 * re-loaded so that a *missing* required member is caught, not only a bad one. Reading it back out
 * of the collection is therefore the way to hold the adopted node:
 *
 * ```ts
 * rows.push({ name: 'Dev', age: 41 });
 * rows.getAt(rows.length - 1);        // the adopted, validated record
 * ```
 *
 * A record that already carries this very schema was validated when it was made, and is left alone.
 */
function adopt(schema: Schema, value: any, defs?: Definitions): any {
  if (value instanceof InternetObject && value.getSchema() === schema) return value;
  const plain = value instanceof InternetObject ? value.toObject() : value;
  if (plain === null || typeof plain !== 'object' || Array.isArray(plain)) return value;
  return loadObject(plain, schema, defs);
}

/**
 * Installs the hooks. Called from `registerTypes()`, and idempotent.
 *
 * **This is a called function on purpose.** It used to be a bare `import '../write-hooks'` — a
 * side-effect import, which every bundler is free to drop unless the package's `sideEffects` array
 * happens to list the file by its built path. The CJS bundle dropped it, and nothing failed to
 * compile: the library simply stopped validating writes. `set()` accepted anything, `push()`
 * adopted nothing, and `attachSchema()` checked nothing, silently, for every `require()` consumer.
 *
 * A value that is imported and *called* cannot be tree-shaken, so this no longer depends on a
 * config file staying in step with a filename.
 */
export function installWriteHooks(): void {
  installSchemaHooks({ memberWrite, adopt });
}
