/**
 * The two schema operations the core containers need, injected rather than imported.
 *
 * `IOObject.set()` has to validate (B1) and `IOCollection.push()` has to adopt (B2), and both live
 * in `src/core`. The code that can actually do those things lives in `src/schema` — and imports
 * `IOObject` and `IOCollection` to build them. A direct import would close that circle.
 *
 * So the core declares what it needs and the schema layer fills it in, from
 * `src/schema/write-hooks.ts`, on the same import that registers the built-in types. That
 * registration is unavoidable on any path that can produce a `Schema` at all: compiling one calls
 * `registerTypes()`. A container with no schema attached validates nothing and needs no hook, so
 * there is no window in which a hook is missing and a check is skipped.
 */
import type Schema from '../schema/schema';
import type Definitions from './definitions';

/** Validates and coerces one member on the way in. Throws on invalid, exactly as parsing does. */
export type MemberWriteHook = (schema: Schema, key: string, value: any, defs?: Definitions) => any;

/** Validates an inserted record against the collection's element schema and returns the adopted one. */
export type AdoptHook = (schema: Schema, value: any, defs?: Definitions) => any;

let memberWrite: MemberWriteHook | null = null;
let adopt: AdoptHook | null = null;

/** Called once by the schema layer. @internal */
export function installSchemaHooks(hooks: { memberWrite: MemberWriteHook; adopt: AdoptHook }): void {
  memberWrite = hooks.memberWrite;
  adopt = hooks.adopt;
}

/**
 * The value to store for `key`, checked against `schema`.
 *
 * Returns the value untouched when no schema governs the write — a schema-less object validates
 * nothing *vacuously*, which is what keeps the invariant uncaveated rather than caveated.
 */
export function validateMemberWrite(schema: Schema | null, key: string, value: any, defs?: Definitions): any {
  if (!schema || !memberWrite) return value;
  return memberWrite(schema, key, value, defs);
}

/** The record to store, checked against the collection's element schema. */
export function adoptRecord(schema: Schema | null, value: any, defs?: Definitions): any {
  if (!schema || !adopt) return value;
  return adopt(schema, value, defs);
}
