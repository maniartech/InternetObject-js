import Schema from '../schema';
import MemberDef from '../types/memberdef';
import Definitions from '../../core/definitions';
import Decimal from '../../core/decimal/decimal';

/**
 * Result of inferring definitions from data
 */
export interface InferredDefs {
  definitions: Definitions;
  rootSchema: Schema;
}

/**
 * Represents a schema instance with its full path for conflict detection
 */
interface SchemaInstanceInfo {
  baseName: string;      // The simple name (e.g., 'address')
  fullPath: string[];    // Full path (e.g., ['employee', 'manager', 'address'])
  instance: Record<string, any>;
  resolvedName?: string; // Final resolved name after conflict resolution
}

/**
 * Context for tracking schema instances during deep multi-pass inference
 */
interface InferenceContext {
  definitions: Definitions;
  schemaRegistry: Map<string, Schema>;
  // Collect ALL instances of each schema type globally with path info
  schemaInstances: Map<string, SchemaInstanceInfo[]>;
  // Track resolved names after conflict resolution
  resolvedNames: Map<string, string>; // fullPath.join('.') -> resolved schema name
  // Track which schemas need re-merging after collection
  pendingMerge: Set<string>;
  // Track which property paths have been identified as dynamic collections
  // This allows us to treat single-item instances consistently
  dynamicPaths: Set<string>;
  // Paths where some instance CONTRADICTS map-shapedness — a record whose values are not all
  // records, so no `{*: $item}` could describe it. Subtracted from dynamicPaths after the scan.
  dynamicContradictions: Set<string>;
  // Every inferred schema name handed out so far, mapped to the key that holds it. Keeps
  // `safeName` injective across a run: two keys that sanitize alike get distinct names rather
  // than silently sharing one schema. See safeName.
  claimedNames: Map<string, string>;
  // Wildcard container schemas (e.g. `$questions: {*: $question}`) created while inferring
  // members for dynamic-key objects. Registered into definitions AFTER all item schemas merge so
  // the header lists dependencies first ($question before $questions). Keyed by container name to
  // dedupe when the same dynamic path is inferred from several parent instances.
  pendingContainers: Map<string, Schema>;
}

/**
 * Makes a data key safe for use inside a generated schema name (`$<name>`). Definition names and
 * `$ref` tokens must be identifier-like — a key such as `en:plastic` would otherwise emit
 * `$en:plastic`, which cannot be re-parsed (issue #61). Applied at EVERY name-generation site so
 * collection-time and memberdef-time lookups stay consistent; collisions introduced by the
 * sanitization flow through the existing conflict-resolution machinery.
 */
/**
 * The member a root value is bound to when it is NOT a collection of records.
 *
 * Unlike JSON, IO accepts a non-object root value — and PROMOTES it to a record under its
 * positional key. `---` followed by `[1, 2, 3]` reads as `{ "0": [1, 2, 3] }`, and a bare `42`
 * reads as `{ "0": 42 }`. So inference must use that same name: writing the array under an
 * invented member (`value`) produced a document that read back as `{ value: [...] }`, disagreeing
 * with what the parser does with the very same data written by hand.
 *
 * Exported so the loader binds the data the way the schema was built; when the two disagree the
 * document is written with an error object per element.
 */
export const ROOT_VALUE_MEMBER = '0';

/**
 * True when a root array is a COLLECTION of records — the shape inference builds a per-item schema
 * for. An array of scalars, or of arrays, is not: it is wrapped in {@link ROOT_VALUE_MEMBER}.
 */
export function isRecordCollection(data: any): boolean {
  return Array.isArray(data) && data.some(isPlainRecord);
}

/**
 * A legal identifier for `key`, unique to that key.
 *
 * Sanitizing alone is NOT injective: every character outside `[A-Za-z0-9_]` becomes `_`, so `"*"`,
 * `" "` and `","` all produce `_`, and `"x-y"` and `"x.y"` both produce `x_y`. Two unrelated parts
 * of a document then resolve to ONE inferred schema name, and the schema built from one of them is
 * bound to the other's data — which fails against a shape it was never built from. The symptom
 * varies with the input (`expected-boolean`, `missing-value`, `unknown-member`); the cause is
 * always that two things were filed under one label. See io-test-cases ISSUES.md, ISSUE-25.
 *
 * `claimed` maps each name already handed out to the key that holds it, so a name is reused only
 * by the key that earned it. A different key that would collide counts past the names already
 * taken — `_`, then `_2`, then `_3` — which is the rule this format already uses for
 * duplicate SECTION names (see the specification, Error Accumulation).
 *
 * Two properties matter and both are load-bearing:
 *
 *   STABLE     the same key always yields the same name, however often it is asked. Callers ask
 *              repeatedly for the same key and must agree, or a schema is registered under one
 *              name and referenced by another.
 *   INJECTIVE  different keys never share a name.
 *
 * The map lives on the inference context, so it is per-run: names never leak between documents.
 */
function safeName(key: string, claimed?: Map<string, string>): string {
  const base = key.replace(/[^A-Za-z0-9_]/g, '_');
  if (!claimed) return base;

  const owner = claimed.get(base);
  if (owner === undefined) {
    claimed.set(base, key);
    return base;
  }
  if (owner === key) return base; // stability: this key already holds this name

  for (let n = 2; ; n++) {
    const candidate = `${base}_${n}`;
    const holder = claimed.get(candidate);
    if (holder === undefined) {
      claimed.set(candidate, key);
      return candidate;
    }
    if (holder === key) return candidate;
  }
}

/**
 * A RECORD for inference purposes: a plain key/value object. Dates, byte arrays and Decimals are
 * `typeof 'object'` but are VALUES — collecting one as a record instance would fabricate an empty
 * schema from its (non-enumerable) keys and lose its type.
 */
export function isPlainRecord(v: any): v is Record<string, any> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) &&
    !(v instanceof Date) && !(v instanceof Uint8Array) && !(v instanceof Decimal);
}

/** The IO type name for a primitive array element, or null when the value is not a primitive. */
function primitiveTypeOf(v: any): string | null {
  switch (typeof v) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'bool';
    case 'bigint': return 'bigint';
    default: return null;
  }
}

/**
 * Array members whose element evidence RULES OUT a typed form (mixed kinds, nulls, nested
 * arrays). Tracked outside the MemberDef because any extra property on a MemberDef is
 * serialized as a constraint; membership means "stay untyped no matter what later rows show".
 */
const lockedArrays = new WeakSet<MemberDef>();

/**
 * Builds (or reuses) the wildcard container schema for a dynamic-key member and returns the
 * MemberDef that links the parent to it: `questions` → `{type:'object', schemaRef:'$questions'}`
 * with `$questions: {*: $question}` queued for registration.
 *
 * The item schema name is the singularized member key, run through the same conflict-resolution
 * map the item instances were collected under. If the container name is already taken by a
 * DIFFERENT schema (a static object elsewhere also named e.g. `questions`), fall back to the old
 * unlinked `{type:'object'}` so we never clobber or shadow an existing definition.
 */
function inferDynamicContainerMemberDef(
  path: string,
  fullPath: string[],
  ctx: InferenceContext
): MemberDef {
  const itemBase = `$${safeName(singularize(path), ctx.claimedNames)}`;
  const resolvedItem = ctx.resolvedNames.get(pathKey(fullPath, itemBase)) || itemBase;
  const containerName = `$${safeName(path, ctx.claimedNames)}`;

  // The item schema itself is unusable -- nothing to point at, so the member stays untyped.
  if (resolvedItem.endsWith('::CONFLICTED')) {
    return { type: 'object', path };
  }

  // The container CANNOT take its natural name: either the key does not pluralize (`nutriscore`
  // singularizes to itself, so container and item want the same name) or a different schema
  // already holds it. Emit the wildcard INLINE on the member instead of giving up.
  //
  // Returning an untyped `object` here used to discard the typing for the whole subtree while
  // still registering the item schema, leaving a definition in the header that nothing referenced.
  const containerTaken =
    ctx.schemaRegistry.has(containerName) || ctx.schemaInstances.has(containerName);
  if (containerName === resolvedItem || containerTaken) {
    const inline = new Schema('');
    inline.open = { type: 'object', path: '*', schemaRef: resolvedItem };
    return { type: 'object', path, schema: inline };
  }

  if (!ctx.pendingContainers.has(containerName)) {
    const container = new Schema(containerName);
    // Serialized as `{*: $item}` (names stays empty); on validation every undeclared key must
    // match $item. The wildcard lives on `open` alone -- see Schema.wildcard.
    container.open = { type: 'object', path: '*', schemaRef: resolvedItem };
    ctx.pendingContainers.set(containerName, container);
  }

  return { type: 'object', path, schemaRef: containerName };
}

/**
 * Structural signature of a schema — two schemas with the same signature describe the same shape
 * and are interchangeable, so only one of them needs to exist.
 *
 * References are compared by NAME, so the signature is only stable once the names it mentions have
 * themselves settled; `dedupeIdenticalSchemas` therefore iterates to a fixed point.
 */
function schemaSignature(schema: Schema): string {
  const memberSig = (md: any): string => {
    if (!md) return '~';
    const parts = [md.type ?? '', md.optional ? '?' : '', md.null ? '*' : ''];
    if (md.schemaRef) parts.push(`ref:${md.schemaRef}`);
    if (md.schema) parts.push(`inline:${typeof md.schema === 'string' ? md.schema : schemaSignature(md.schema)}`);
    if (md.of) parts.push(`of:${typeof md.of === 'string' ? md.of : memberSig(md.of)}`);
    for (const k of Object.keys(md).sort()) {
      if (['type', 'optional', 'null', 'schemaRef', 'schema', 'of', 'path'].includes(k)) continue;
      parts.push(`${k}=${JSON.stringify(md[k])}`);
    }
    return parts.join('|');
  };

  // Member names are JSON-quoted so a name containing the separators (`:` `,` `|`) cannot
  // forge another schema's signature -- a single member literally named `a:string||,b` used to
  // collide with {a: string, b: string}, silently merging two unrelated schemas and making the
  // emitted document fail its own validation.
  const members = (schema.names ?? []).map(n => `${JSON.stringify(n)}:${memberSig(schema.defs[n])}`);
  const wildcard = schema.wildcard ? `*:${memberSig(schema.wildcard)}` : (schema.open === true ? '*' : '');
  return `${members.join(',')}${wildcard ? ';' + wildcard : ''}`;
}

/**
 * Rewrite every schema reference inside a MemberDef tree according to `alias`.
 * An alias target of `null` means the referenced schema was REMOVED (it was empty): the
 * reference is deleted and the member stays an untyped `object`/`array`.
 */
function rewriteRefs(md: any, alias: Map<string, string | null>): void {
  if (!md || typeof md !== 'object') return;
  if (md.schemaRef && alias.has(md.schemaRef)) {
    const to = alias.get(md.schemaRef);
    if (to === null) delete md.schemaRef;
    else md.schemaRef = to;
  }
  if (md.schema && typeof md.schema !== 'string' && md.schema.defs) rewriteSchemaRefs(md.schema, alias);
  if (md.of) rewriteRefs(md.of, alias);
}

function rewriteSchemaRefs(schema: Schema, alias: Map<string, string | null>): void {
  for (const key of Object.keys(schema.defs ?? {})) rewriteRefs(schema.defs[key], alias);
  if (schema.open && typeof schema.open === 'object') rewriteRefs(schema.open, alias);
}

/**
 * Drop every `schemaRef` that names no definition.
 *
 * A member takes its item-schema reference while walking the data, before the schema itself is
 * built -- and an item schema that turns out EMPTY is never registered at all, leaving `[$zz]` in
 * the header with no `$zz` and a `schema-not-defined` on re-parse. The reference is what is wrong,
 * not the member: dropping it degrades `[$zz]` to `array` and `{object, schema: $zz}` to `object`,
 * which is what an empty schema constrained anyway (Rule 1).
 *
 * Runs after the fixed point, so it sees the final definition set. References are checked by name
 * and never followed, so a recursive schema (`$node: { children: [$node] }`) cannot loop.
 */
function pruneDanglingRefs(ctx: InferenceContext, rootSchema: Schema | null): void {
  const defined = new Set(ctx.definitions.keys);

  function dropRef(md: any): void {
    if (!md || typeof md !== 'object') return;
    if (md.schemaRef && !defined.has(md.schemaRef)) delete md.schemaRef;
    if (md.schema && typeof md.schema !== 'string' && md.schema.defs) walkSchema(md.schema);
    if (md.of) dropRef(md.of);
  }

  function walkSchema(schema: Schema | undefined | null): void {
    if (!schema) return;
    for (const key of Object.keys(schema.defs ?? {})) dropRef(schema.defs[key]);
    if (schema.open && typeof schema.open === 'object') dropRef(schema.open);
  }

  for (const name of ctx.definitions.keys) walkSchema(ctx.schemaRegistry.get(name));
  walkSchema(rootSchema);
}

/** Every definition NAME this schema references directly (not transitively). */
function directRefs(schema: Schema | undefined | null): Set<string> {
  const out = new Set<string>();
  if (!schema) return out;

  function fromMember(md: any): void {
    if (!md || typeof md !== 'object') return;
    if (md.schemaRef) out.add(md.schemaRef);
    if (md.schema && typeof md.schema !== 'string' && md.schema.defs) fromSchema(md.schema);
    if (md.of) fromMember(md.of);
  }
  function fromSchema(s: any): void {
    for (const key of Object.keys(s.defs ?? {})) fromMember(s.defs[key]);
    if (s.open && typeof s.open === 'object') fromMember(s.open);
  }

  fromSchema(schema);
  return out;
}

/**
 * Order the definitions so each one follows everything it references.
 *
 * A definition that references another is COMPILED where it stands, so a forward reference
 * (`$10` naming `$a_b` two lines before `$a_b` exists) fails -- and fails with a misleading
 * `unexpected-positional-member` pointing at the target's own line. Inference discovers schemas in
 * data order, which is not dependency order, and canonicalization preserves whatever order it was
 * handed.
 *
 * Stable depth-first post-order: definitions keep their relative order except where a dependency
 * forces one earlier. A cycle (`$node: { children: [$node] }`, which is legal and works) is left
 * in its existing order rather than broken arbitrarily.
 */
function orderDefinitionsByDependency(ctx: InferenceContext): void {
  const names = ctx.definitions.keys.filter(k => k !== '$schema');
  const known = new Set(names);
  const placed = new Set<string>();
  const order: string[] = [];

  function visit(name: string, onPath: Set<string>): void {
    if (placed.has(name) || onPath.has(name)) return;   // done, or a cycle -- leave it be
    onPath.add(name);
    for (const ref of directRefs(ctx.schemaRegistry.get(name))) {
      if (known.has(ref)) visit(ref, onPath);
    }
    onPath.delete(name);
    placed.add(name);
    order.push(name);
  }

  for (const name of names) visit(name, new Set());

  const rebuilt = new Definitions();
  for (const name of order) {
    const schema = ctx.schemaRegistry.get(name);
    if (schema) rebuilt.push(name, schema, true, false);
  }
  ctx.definitions = rebuilt;
}

/**
 * Canonicalize the inferred definitions. Structure is the identity; names are labels.
 *
 * Two rules, run to a fixed point (collapsing two schemas can make their referrers identical
 * in turn, and emptying a schema can empty its container):
 *
 * 1. **An empty schema is no schema.** `{}` constrains nothing -- it was inferred from a value
 *    that happened to be empty, and asserting perpetual emptiness from one sighting is
 *    overfitting. The definition is dropped and its referrers become plain `object`.
 * 2. **One shape, one definition.** Inference names schemas after the key that introduced them
 *    and never asks whether the shape already exists, so eleven identically-shaped images
 *    produced `$1` ... `$11`. Structurally identical schemas collapse to one; the survivor is
 *    the first-defined readable name (a non-numeric name wins over `$1`), and every reference --
 *    member, wildcard, inline, array element -- is rewritten.
 *
 * `protectedNames` (multi-section item schemas, which sections reference BY NAME in their
 * binding) are never dropped; they may still be renamed via dedup, which the returned alias map
 * lets the caller follow.
 */
function canonicalizeDefinitions(
  ctx: InferenceContext,
  rootSchema: Schema | null,
  protectedNames: Set<string> = new Set()
): Map<string, string> {
  const totalAlias = new Map<string, string>();

  for (let pass = 0; pass < 20; pass++) {
    const alias = new Map<string, string | null>();

    // Rule 1: drop empty schemas.
    for (const name of ctx.definitions.keys) {
      if (name === '$schema' || protectedNames.has(name)) continue;
      const schema = ctx.schemaRegistry.get(name);
      if (!schema) continue;
      const hasMembers = (schema.names?.length ?? 0) > 0;
      const hasWildcard = !!schema.wildcard || schema.open === true;
      if (!hasMembers && !hasWildcard) alias.set(name, null);
    }

    // Rule 2: collapse structurally identical schemas.
    const bySignature = new Map<string, string[]>();
    for (const name of ctx.definitions.keys) {
      if (name === '$schema' || alias.has(name)) continue;
      const schema = ctx.schemaRegistry.get(name);
      if (!schema) continue;
      const sig = schemaSignature(schema);
      if (!bySignature.has(sig)) bySignature.set(sig, []);
      bySignature.get(sig)!.push(name);
    }
    for (const names of bySignature.values()) {
      if (names.length < 2) continue;
      const keep = names.find(n => !/^\$\d+(_\d+)?$/.test(n)) ?? names[0];
      for (const n of names) if (n !== keep) alias.set(n, keep);
    }

    // Rule 3: drop unreachable definitions. Instance collection is eager -- it gathers array
    // items before the array's element strategy is decided -- so a member that ends up untyped
    // can leave behind a definition nothing references.
    // Rule 2b: a numeric name is not a name. Keys like "1" ... "11" produce cohorts called
    // `$1`, and when every name in a dedup group is numeric the survivor is too. The concept
    // the schema describes is named by the PARENT key (`images` -> `$image`) -- the schema must
    // read as a description of the data, not as an accident of which key introduced it.
    for (const name of ctx.definitions.keys) {
      if (name === '$schema' || alias.has(name) || !/^\$\d+(_\d+)?$/.test(name)) continue;
      let parent: string | undefined;
      for (const instances of ctx.schemaInstances.values()) {
        const info = instances.find(i => (i.resolvedName ?? i.baseName) === name && i.fullPath.length >= 2);
        if (info) { parent = info.fullPath[info.fullPath.length - 2]; break; }
      }
      if (!parent) continue; // root-level numeric key: nothing better to derive from
      const base = `$${safeName(singularize(parent), ctx.claimedNames)}`;
      let candidate = base;
      let n = 2;
      while (ctx.schemaRegistry.has(candidate) || ctx.definitions.get(candidate) ||
             [...alias.values()].includes(candidate)) {
        candidate = `${base}_${n++}`;
      }
      alias.set(name, candidate);
      ctx.schemaRegistry.set(candidate, ctx.schemaRegistry.get(name)!);
    }

    // Resolve chains before rewriting: a merge and a rename can land in one pass
    // ($2 -> $1 from dedup, $1 -> $image from the numeric rule), and a ref rewritten to a
    // mid-chain name would dangle.
    for (const from of [...alias.keys()]) {
      let to = alias.get(from)!;
      while (to !== null && alias.has(to)) to = alias.get(to)!;
      alias.set(from, to);
    }

    if (alias.size === 0) {
      const reachable = new Set<string>(protectedNames);
      const visit = (schema: Schema | undefined | null) => {
        if (!schema) return;
        const walk = (md: any) => {
          if (!md || typeof md !== 'object') return;
          if (md.schemaRef && !reachable.has(md.schemaRef)) {
            reachable.add(md.schemaRef);
            visit(ctx.schemaRegistry.get(md.schemaRef));
          }
          if (md.schema && typeof md.schema !== 'string' && md.schema.defs) visit(md.schema);
          if (md.of) walk(md.of);
        };
        for (const key of Object.keys(schema.defs ?? {})) walk(schema.defs[key]);
        if (schema.open && typeof schema.open === 'object') walk(schema.open);
      };
      if (rootSchema) visit(rootSchema);
      for (const name of protectedNames) visit(ctx.schemaRegistry.get(name));

      const orphans = ctx.definitions.keys.filter(k => k !== '$schema' && !reachable.has(k));
      if (orphans.length === 0) break;
      const rebuilt = new Definitions();
      for (const key of ctx.definitions.keys) {
        if (orphans.includes(key)) { ctx.schemaRegistry.delete(key); continue; }
        const schema = ctx.schemaRegistry.get(key);
        if (schema) rebuilt.push(key, schema, true, false);
      }
      ctx.definitions = rebuilt;
      break;
    }

    for (const name of ctx.definitions.keys) {
      if (alias.has(name)) continue; // being removed
      const schema = ctx.schemaRegistry.get(name);
      if (schema) rewriteSchemaRefs(schema, alias);
    }
    if (rootSchema) rewriteSchemaRefs(rootSchema, alias);

    // Rebuild in the existing order minus the collapsed entries, so dependencies still
    // precede the schemas that reference them.
    const rebuilt = new Definitions();
    for (const key of ctx.definitions.keys) {
      if (alias.has(key)) {
        // A rename (numeric -> derived) keeps the schema under its new name, IN PLACE, so the
        // definition order still lists dependencies first; a merge or drop removes it.
        const to = alias.get(key) ?? null;
        const renamed = to !== null && !ctx.definitions.get(to) &&
          ctx.schemaRegistry.get(to) === ctx.schemaRegistry.get(key);
        if (renamed) rebuilt.push(to, ctx.schemaRegistry.get(to)!, true, false);
        ctx.schemaRegistry.delete(key);
        continue;
      }
      const schema = ctx.schemaRegistry.get(key);
      if (schema) rebuilt.push(key, schema, true, false);
    }
    ctx.definitions = rebuilt;

    for (const [from, to] of alias) {
      if (to === null) continue;
      totalAlias.set(from, to);
      for (const [f, t] of totalAlias) if (t === from) totalAlias.set(f, to);
    }
  }

  pruneDanglingRefs(ctx, rootSchema);
  orderDefinitionsByDependency(ctx);

  return totalAlias;
}

/**
 * True when the data is the multi-section shape: a plain object with 2+ keys whose EVERY value is
 * a non-empty array of plain objects (records). `{accounting: [...], sales: [...]}` infers better
 * as named sections (`--- accounting: $accounting`) than as one nested single-section document.
 */
/**
 * A section name is written RAW after `---` (`--- accounting: $accounting`) and the grammar has no
 * quoted form for it, so only letters, marks, digits, `-` and `_` survive a round trip. Anything
 * else -- a colon, a comma, a space -- is silently truncated or breaks the parse, so such data must
 * take the single-section route, where its keys are ordinary (quotable) member names.
 *
 * The character class is the tokenizer's own (`REGEX_CACHE.sectionSchemaName`); keep them in sync.
 */
function isLegalSectionName(key: string): boolean {
  return /^[\p{L}\p{M}\p{N}\-_]+$/u.test(key);
}

export function isMultiSectionShape(data: any): boolean {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return false;
  const entries = Object.entries(data);
  if (entries.length < 2) return false;
  return entries.every(([k, v]) =>
    isLegalSectionName(k) &&
    Array.isArray(v) && v.length > 0 && v.every(isPlainRecord)
  );
}

/**
 * Infers definitions for the multi-section shape (see {@link isMultiSectionShape}): one ITEM
 * schema per top-level key (named `$<singularized key>`, conflict-resolved), with NO root
 * `$schema` — each section carries its own schema binding instead.
 *
 * @returns definitions plus a map of top-level key → resolved item schema name.
 */
export function inferMultiSectionDefs(data: Record<string, any[]>): {
  definitions: Definitions;
  sectionSchemas: Map<string, string>;
} {
  const ctx: InferenceContext = {
    definitions: new Definitions(),
    schemaRegistry: new Map(),
    schemaInstances: new Map(),
    resolvedNames: new Map(),
    pendingMerge: new Set(),
    dynamicPaths: new Set(),
    dynamicContradictions: new Set(),
    pendingContainers: new Map(),
    claimedNames: new Map()
  };

  preScanDynamicPaths(data, [], ctx);
  // A path contradicted by any instance is not a map, however many siblings look like one.
  for (const path of ctx.dynamicContradictions) ctx.dynamicPaths.delete(path);

  // Collect every array item as an instance of its section's item schema (path = [key], matching
  // how nested-array items are collected elsewhere so conflict resolution behaves identically).
  for (const [key, arr] of Object.entries(data)) {
    const itemBaseName = `$${safeName(singularize(key), ctx.claimedNames)}`;
    for (const item of arr) {
      addSchemaInstance(itemBaseName, [key], item, ctx);
      collectNestedInstances(item, [key], ctx);
    }
  }

  resolveSchemaNameConflicts(ctx);
  mergeAllSchemaInstances(ctx);

  // Sections reference their item schemas BY NAME in the `--- key: $item` binding, so those
  // names must survive canonicalization; dedup may still rename them, which the alias follows.
  const initialNames = new Map<string, string>();
  for (const key of Object.keys(data)) {
    const itemBaseName = `$${safeName(singularize(key), ctx.claimedNames)}`;
    initialNames.set(key, ctx.resolvedNames.get(pathKey([key], itemBaseName)) || itemBaseName);
  }
  const alias = canonicalizeDefinitions(ctx, null, new Set(initialNames.values()));

  const sectionSchemas = new Map<string, string>();
  for (const [key, name] of initialNames) sectionSchemas.set(key, alias.get(name) ?? name);

  return { definitions: ctx.definitions, sectionSchemas };
}

/**
 * Detects if an object has dynamic keys (acts like a collection/map).
 *
 * Pattern: An object has dynamic keys if:
 * 1. All values are non-null objects (not arrays, not primitives)
 * 2. All objects share at least one common key
 *
 * Examples of dynamic keys:
 * - { "1": {recode:"0"}, "2": {recode:"1"} }  - numeric keys, share "recode"
 * - { "QID1": {name:"Q1"}, "QID2": {name:"Q2"} }  - ID keys, share "name"
 *
 * Examples of static keys (NOT dynamic):
 * - { name: "John", age: 30 }  - values are primitives
 * - { user: {name}, settings: {theme} }  - no common keys
 */
function isDynamicKeyObject(obj: Record<string, any>): boolean {
  const keys = Object.keys(obj);
  if (keys.length < 2) return false;

  const values = keys.map(k => obj[k]);

  // Check 1: All values must be non-null objects (not arrays)
  const allObjects = values.every(isPlainRecord);

  if (!allObjects) return false;

  // Check 2: Find common keys across ALL objects
  const allValueKeys = values.map(v => new Set(Object.keys(v)));
  const firstKeys = allValueKeys[0];

  // Find keys that exist in ALL objects
  const commonKeys = [...firstKeys].filter(key =>
    allValueKeys.every(keySet => keySet.has(key))
  );

  if (commonKeys.length < 1) return false;

  // Check 3: The common keys must cover a MAJORITY of every value's keys. True maps
  // ({QID1: {...}, QID2: {...}}) have near-identical key sets; two UNRELATED static members that
  // merely share one incidental key (e.g. `origins_of_ingredients` and `packaging` both having
  // `value`) must NOT be misread as a map — that frankenstein-merges different shapes into one
  // item schema (issue #61).
  return allValueKeys.every(keySet => commonKeys.length / keySet.size >= 0.5);
}

/**
 * Infers Internet Object definitions from plain JavaScript data.
 *
 * This utility analyzes the structure and types of the input data
 * and generates proper Definitions with:
 * - `$schema` for the root object (default schema)
 * - Named schemas like `$borrowedBy`, `$membershipType` for nested objects
 *
 * Implements Deep Multi-Pass Inference:
 * - Phase 1: Discovery - traverse data and identify all schema types
 * - Phase 2: Collection - gather ALL instances of each schema globally
 * - Phase 3: Conflict Resolution - resolve name conflicts for same key at different paths
 * - Phase 4: Merging - merge all instances to build comprehensive schemas
 * - Phase 5: Finalization - set up definitions with proper ordering
 *
 * @param data - The JavaScript data to infer definitions from
 * @returns InferredDefs containing Definitions and the root schema
 */
export function inferDefs(data: any): InferredDefs {
  const ctx: InferenceContext = {
    definitions: new Definitions(),
    schemaRegistry: new Map(),
    schemaInstances: new Map(),
    resolvedNames: new Map(),
    pendingMerge: new Set(),
    dynamicPaths: new Set(),
    dynamicContradictions: new Set(),
    pendingContainers: new Map(),
    claimedNames: new Map()
  };

  // Phase 0: Pre-scan to identify ALL dynamic paths across the entire data structure
  // This ensures that even single-item siblings are treated as dynamic if any sibling has multiple items
  preScanDynamicPaths(data, [], ctx);
  // A path contradicted by any instance is not a map, however many siblings look like one.
  for (const path of ctx.dynamicContradictions) ctx.dynamicPaths.delete(path);

  // Phase 1 & 2: Discovery and Collection
  // First pass to identify schema types and collect all instances with paths
  collectSchemaInstances(data, '$schema', [], ctx);

  // Phase 3: Resolve schema name conflicts
  resolveSchemaNameConflicts(ctx);

  // Phase 4: Merge all collected instances for each resolved schema
  mergeAllSchemaInstances(ctx);

  // Phase 5: Build the root schema with all nested schemas properly set up
  const rootSchema = buildFinalSchema(data, '$schema', [], ctx);

  // Register any wildcard containers created during Phase 5 fallbacks (the merge-phase flush in
  // mergeAllSchemaInstances has already run by now; this catches late additions).
  for (const [name, container] of ctx.pendingContainers) {
    if (!ctx.definitions.get(name)) {
      ctx.schemaRegistry.set(name, container);
      ctx.definitions.push(name, container, true, false);
    }
  }

  // Canonicalize: drop empty schemas, collapse identical shapes, rewrite references.
  canonicalizeDefinitions(ctx, rootSchema);

  // Set the root schema as $schema (default schema)
  ctx.definitions.push('$schema', rootSchema, true, false);

  return { definitions: ctx.definitions, rootSchema };
}

/**
 * Phase 0: Pre-scan to identify all dynamic paths before main collection.
 * This ensures that all sibling paths are treated consistently - if ANY instance
 * at a path has dynamic keys, ALL instances at that path will be treated as dynamic.
 */
function preScanDynamicPaths(
  data: any,
  currentPath: string[],
  ctx: InferenceContext
): void {
  if (data === null || data === undefined) return;

  if (Array.isArray(data)) {
    // Scan array items
    for (const item of data) {
      if (isPlainRecord(item)) {
        preScanDynamicPaths(item, currentPath, ctx);
      }
    }
    return;
  }

  if (isPlainRecord(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      const childPath = [...currentPath, key];
      const pathKey = childPath.join('.');

      if (Array.isArray(value)) {
        // Scan array items
        for (const item of value) {
          if (isPlainRecord(item)) {
            preScanDynamicPaths(item, childPath, ctx);
          }
        }
      } else if (isPlainRecord(value)) {
        // Check if this looks like a dynamic-key object
        if (isDynamicKeyObject(value)) {
          ctx.dynamicPaths.add(pathKey);
        }
        // ...and record the opposite. A map is `{*: $item}`, so EVERY value must be a record. One
        // instance holding a scalar (`b: {a: "x"}`) cannot be described that way, and marking the
        // path dynamic on the strength of a SIBLING emitted a wildcard the data then failed:
        // "Expecting an object value for '*' but found string". Evidence only ever weakens — the
        // same rule array element types already follow.
        const values = Object.values(value);
        if (values.length > 0 && !values.every(v => isPlainRecord(v))) {
          ctx.dynamicContradictions.add(pathKey);
        }

        // Recursively scan into the object's values
        // For dynamic objects, we scan into each value but NOT include the dynamic key in path
        // Pass childPath (the dynamic object's path) so nested properties have correct paths
        if (ctx.dynamicPaths.has(pathKey) || isDynamicKeyObject(value)) {
          for (const childValue of Object.values(value)) {
            if (isPlainRecord(childValue)) {
              preScanDynamicPaths(childValue, childPath, ctx);
            }
          }
        } else {
          // Regular object - scan with full path
          preScanDynamicPaths(value, childPath, ctx);
        }
      }
    }
  }
}

/**
 * Phase 1 & 2: Recursively traverse data to collect all schema instances with paths
 */
function collectSchemaInstances(
  data: any,
  baseName: string,
  currentPath: string[],
  ctx: InferenceContext
): void {
  if (data === null || data === undefined) {
    return;
  }

  if (Array.isArray(data)) {
    // For arrays of objects, collect all objects as instances of the item schema
    const objects = data.filter(item =>
      isPlainRecord(item)
    );

    if (objects.length > 0) {
      // All objects in this array are instances of the same schema
      for (const obj of objects) {
        addSchemaInstance(baseName, currentPath, obj, ctx);
        // Recursively collect nested instances
        collectNestedInstances(obj, currentPath, ctx);
      }
    }
    return;
  }

  // Only a plain RECORD is a schema instance. A Date, Decimal or byte array is `typeof 'object'`
  // but is a VALUE: collecting one here walked its enumerable own properties and turned them into
  // schema members, so a root `new Date(0)` inferred an empty schema and decoded as `{}`.
  if (isPlainRecord(data)) {
    // Single object - add as instance and collect nested
    addSchemaInstance(baseName, currentPath, data, ctx);
    collectNestedInstances(data, currentPath, ctx);
  }
}

/**
 * Recursively collect schema instances from nested properties
 */
function collectNestedInstances(
  obj: Record<string, any>,
  parentPath: string[],
  ctx: InferenceContext
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    const currentPath = [...parentPath, key];

    if (Array.isArray(value)) {
      // Array property - collect instances with singularized schema name
      const itemBaseName = `$${safeName(singularize(key), ctx.claimedNames)}`;
      const objects = value.filter(item =>
        isPlainRecord(item)
      );

      for (const item of objects) {
        addSchemaInstance(itemBaseName, currentPath, item, ctx);
        // Recursively collect from nested arrays
        collectNestedInstances(item, currentPath, ctx);
      }
    } else if (isPlainRecord(value)) {
      // Check if this path is marked as dynamic (from pre-scan phase)
      // OR if it currently looks like a dynamic-key object
      const pathKey = currentPath.join('.');
      // A contradiction at this path beats a per-instance look: one sibling holding a scalar
      // means no `{*: $item}` can describe the path, however map-shaped THIS instance is.
      const isDynamic = !ctx.dynamicContradictions.has(pathKey) &&
        (ctx.dynamicPaths.has(pathKey) || isDynamicKeyObject(value));

      if (isDynamic) {
        // Ensure this path is marked as dynamic
        ctx.dynamicPaths.add(pathKey);

        // Treat as collection - all values are instances of the same schema
        const itemBaseName = `$${safeName(singularize(key), ctx.claimedNames)}`;

        for (const [dynamicKey, dynamicValue] of Object.entries(value)) {
          if (isPlainRecord(dynamicValue)) {
            // Add each dynamic-keyed object as an instance of the singularized schema
            addSchemaInstance(itemBaseName, currentPath, dynamicValue, ctx);
            // Recursively collect from nested objects within dynamic values
            // IMPORTANT: Do NOT include dynamicKey in path - this ensures all nested
            // objects merge into the same schema regardless of which dynamic key they're under
            collectNestedInstances(dynamicValue, currentPath, ctx);
          }
        }
      } else {
        // Regular nested object - collect with key as schema name
        const nestedBaseName = `$${safeName(key, ctx.claimedNames)}`;
        addSchemaInstance(nestedBaseName, currentPath, value, ctx);
        // Recursively collect from nested objects
        collectNestedInstances(value, currentPath, ctx);
      }
    }
  }
}

/**
 * Add an object as an instance of a schema type with path tracking
 */
function addSchemaInstance(
  baseName: string,
  fullPath: string[],
  obj: Record<string, any>,
  ctx: InferenceContext
): void {
  if (!ctx.schemaInstances.has(baseName)) {
    ctx.schemaInstances.set(baseName, []);
  }

  const instanceInfo: SchemaInstanceInfo = {
    baseName,
    fullPath: [...fullPath],
    instance: obj
  };

  ctx.schemaInstances.get(baseName)!.push(instanceInfo);
  ctx.pendingMerge.add(baseName);
}

/**
 * Phase 3: Resolve schema name conflicts
 * When the same base name appears at different paths with different structures,
 * instead of creating qualified names, we fall back to plain 'object' type.
 *
 * Strategy:
 * - Same path, varying structures → merge into ONE schema (multi-pass handles optionality)
 * - Different paths, same structure → share schema name
 * - Different paths, different structures → mark as conflicted (use plain 'object')
 */
function resolveSchemaNameConflicts(ctx: InferenceContext): void {
  for (const [baseName, instances] of ctx.schemaInstances) {
    if (baseName === '$schema') {
      // Root schema doesn't need conflict resolution
      for (const info of instances) {
        info.resolvedName = '$schema';
        ctx.resolvedNames.set(pathKey(info.fullPath, baseName), '$schema');
      }
      continue;
    }

    // Group instances by their path signature
    const pathGroups = groupInstancesByPath(instances);

    if (pathGroups.size === 1) {
      // All instances at same path - no conflict, use base name
      // Multi-pass merging will handle structural variations (optional fields)
      for (const info of instances) {
        info.resolvedName = baseName;
        ctx.resolvedNames.set(pathKey(info.fullPath, baseName), baseName);
      }
    } else {
      // Multiple paths - check if structures are COMPATIBLE (have common keys)
      // If they share at least one key, they can merge with optional fields
      // If they share NO keys, they're truly incompatible → CONFLICT

      // Collect all key sets from all instances
      const allKeySets: Set<string>[] = [];
      for (const info of instances) {
        allKeySets.push(new Set(Object.keys(info.instance)));
      }

      // Find keys that exist in ALL instances
      const firstKeys = allKeySets[0];
      const commonKeys = [...firstKeys].filter(key =>
        allKeySets.every(keySet => keySet.has(key))
      );

      if (commonKeys.length > 0) {
        // Compatible structures - share at least one key
        // Multi-pass merging will handle variations (optional fields)
        for (const info of instances) {
          info.resolvedName = baseName;
          ctx.resolvedNames.set(pathKey(info.fullPath, baseName), baseName);
        }
      } else {
        // No common keys at all -> genuinely different shapes competing for one name. They cannot
        // merge, but discarding them all is worse than naming them apart: every member that would
        // have pointed at any of these schemas used to degrade to an untyped `object`, taking the
        // whole subtree's typing with it. (`{packaging: {packagings: [{material}], score}}` lost
        // everything, because `packagings` singularizes to `packaging`, the name its own container
        // already held.)
        //
        // Give each PATH its own schema instead: the first keeps the base name and the rest are
        // suffixed, the same recovery used for duplicate section names.
        let ordinal = 1;
        for (const group of pathGroups.values()) {
          let candidate = baseName;
          if (ordinal > 1) {
            candidate = `${baseName}_${ordinal}`;
            // Do not step on a name another base already claims.
            while (ctx.schemaInstances.has(candidate) || ctx.schemaRegistry.has(candidate)) {
              ordinal++;
              candidate = `${baseName}_${ordinal}`;
            }
          }
          for (const info of group) {
            info.resolvedName = candidate;
            ctx.resolvedNames.set(pathKey(info.fullPath, baseName), candidate);
          }
          ordinal++;
        }
      }
    }
  }
}

/**
 * Group instances by their path signature
 */
function groupInstancesByPath(
  instances: SchemaInstanceInfo[]
): Map<string, SchemaInstanceInfo[]> {
  const groups = new Map<string, SchemaInstanceInfo[]>();

  for (const info of instances) {
    // Create a normalized path signature (remove array indices conceptually)
    const pathSig = info.fullPath.join('.');

    if (!groups.has(pathSig)) {
      groups.set(pathSig, []);
    }
    groups.get(pathSig)!.push(info);
  }

  return groups;
}

/**
 * Create a unique key for path + baseName combination
 */
function pathKey(fullPath: string[], baseName: string): string {
  return `${fullPath.join('.')}::${baseName}`;
}

/**
 * Phase 4: Merge all collected instances for each resolved schema type
 */
function mergeAllSchemaInstances(ctx: InferenceContext): void {
  // Group instances by their resolved name
  const resolvedGroups = new Map<string, SchemaInstanceInfo[]>();

  for (const instances of ctx.schemaInstances.values()) {
    for (const info of instances) {
      const resolvedName = info.resolvedName || info.baseName;
      if (!resolvedGroups.has(resolvedName)) {
        resolvedGroups.set(resolvedName, []);
      }
      resolvedGroups.get(resolvedName)!.push(info);
    }
  }

  // Build merged schema for each resolved name
  for (const [resolvedName, instances] of resolvedGroups) {
    if (instances.length === 0) continue;

    // Skip conflicted schemas - they won't be referenced anyway
    if (resolvedName.endsWith('::CONFLICTED')) {
      continue;
    }

    // Build merged schema from all instances. Each instance carries its OWN path, because
    // instances collected under one schema name can sit at DIFFERENT paths, and their members
    // then resolve to different schema names.
    const mergedSchema = buildMergedSchema(instances, resolvedName, ctx);
    ctx.schemaRegistry.set(resolvedName, mergedSchema);

    // Don't add $schema to definitions yet (handled separately)
    if (resolvedName !== '$schema') {
      ctx.definitions.push(resolvedName, mergedSchema, true, false);
    }
  }

  // Register wildcard container schemas AFTER all item schemas so the header lists
  // dependencies first (`~ $question: {...}` before `~ $questions: {*: $question}`).
  for (const [name, container] of ctx.pendingContainers) {
    ctx.schemaRegistry.set(name, container);
    ctx.definitions.push(name, container, true, false);
  }

  ctx.pendingMerge.clear();
}

/**
 * Build a merged schema from multiple object instances using multi-pass rules
 */
function buildMergedSchema(
  instances: SchemaInstanceInfo[],
  schemaName: string,
  ctx: InferenceContext
): Schema {
  const memberDefs: Map<string, MemberDef> = new Map();
  const memberOrder: string[] = [];
  const seenInIteration: Map<string, number> = new Map();

  for (let i = 0; i < instances.length; i++) {
    const obj = instances[i].instance;
    const parentPath = instances[i].fullPath;

    // Process each key in current object
    for (const [key, value] of Object.entries(obj)) {
      if (!memberDefs.has(key)) {
        // First time seeing this key
        // Pass the full path (parentPath + key) for proper schema ref resolution
        const memberDef = inferMemberDefSimple(value, key, [...parentPath, key], ctx);

        // Rule 2 & 3: New key in later iteration → optional
        if (i > 0) {
          memberDef.optional = true;
        }

        // Rule 1 & 3: Null value → nullable
        if (value === null) {
          memberDef.null = true;
          memberDef.type = 'any';
        }

        memberDefs.set(key, memberDef);
        memberOrder.push(key);
        seenInIteration.set(key, i);
      } else {
        // Key already exists - merge/update
        const existingDef = memberDefs.get(key)!;
        mergeIntoMemberDef(existingDef, value, key, [...parentPath, key], ctx);
      }
    }

  }

  // Rule 4: a member is OPTIONAL if any instance lacks it.
  //
  // This used to run inside the loop above, marking a member optional only when it had been seen in
  // an EARLIER instance and was missing from this one — so it depended on the order the instances
  // happened to be collected in. An instance that came FIRST and lacked the key left that key
  // REQUIRED: `[{}, {value: 1}]` inferred `value` as required, and the empty record then failed
  // against its own inferred schema with `value-required`. Absence is absence, whenever it is seen.
  for (const [key, def] of memberDefs) {
    if (instances.some(i => !Object.prototype.hasOwnProperty.call(i.instance, key))) {
      def.optional = true;
    }
  }

  const builder = Schema.create(schemaName);
  for (const key of memberOrder) {
    builder.addMember(key, memberDefs.get(key)!);
  }
  // A `*` data key is undeclarable (above), so the schema must accept undeclared keys or the
  // document it describes fails to load with `unknown-member`.

  return builder.build();
}

/**
 * The schema an object MemberDef is bound to, as a comparable token: a `$name` reference, the
 * signature of an INLINE schema (the `{*: $item}` wildcard containers carry no name), or null
 * when the member is an untyped `object` and so bound to nothing.
 */
function objectLinkOf(md: MemberDef): string | null {
  if (md.schemaRef) return md.schemaRef;
  if (md.schema) return `inline:${schemaSignature(md.schema as Schema)}`;
  return null;
}

/**
 * Merge a new value into an existing MemberDef (Rules 5 & 6)
 */
function mergeIntoMemberDef(
  existingDef: MemberDef,
  value: any,
  key: string,
  fullPath: string[],
  ctx: InferenceContext
): void {
  // Rule 6: Null in later iteration → add nullable
  if (value === null) {
    existingDef.null = true;
    return;
  }

  if (value === undefined) {
    existingDef.optional = true;
    return;
  }

  const newDef = inferMemberDefSimple(value, key, fullPath, ctx);

  // Rule 5: Type mismatch → any
  if (existingDef.type !== newDef.type && existingDef.type !== 'any') {
    // Real type mismatch (not just null handling)
    existingDef.type = 'any';
    // Clear schemaRef when becoming 'any'
    delete existingDef.schemaRef;
  }

  // Objects: the schema a member is bound to may only ever WEAKEN across instances -- the same
  // rule arrays follow below. Two instances collected under one name can hold records of
  // different shapes under the same key, and those records resolve to DIFFERENT schema names.
  // Keeping the first binding made the writer emit one instance's record against the other
  // instance's schema: a document its own reader rejects with `value-required`. An untyped
  // `object` accepts both shapes.
  if (existingDef.type === 'object' && newDef.type === 'object') {
    const oldLink = objectLinkOf(existingDef);
    const newLink = objectLinkOf(newDef);
    if (newLink !== null && oldLink === null) {
      // Assign conditionally: an explicit `undefined` would be serialized as a constraint.
      if (newDef.schemaRef) existingDef.schemaRef = newDef.schemaRef;
      if (newDef.schema) existingDef.schema = newDef.schema;
    } else if (oldLink !== newLink) {
      delete existingDef.schemaRef;
      delete existingDef.schema;
    }
  }

  // Arrays: element typing may only ever WEAKEN across instances. Evidence that disagrees
  // (a typed row after a mixed row, `[string]` vs `[number]`, an item schema vs primitives)
  // strips the member to untyped `array` and locks it there — an element type that any
  // instance's data would fail must never survive.
  if (existingDef.type === 'array' && newDef.type === 'array') {
    const oldOf = (existingDef.of as any)?.type;
    const newOf = (newDef.of as any)?.type;
    const conflict =
      lockedArrays.has(newDef) ||
      (existingDef.schemaRef && newOf) || (oldOf && newDef.schemaRef) ||
      (oldOf && newOf && oldOf !== newOf);

    if (conflict) {
      delete existingDef.schemaRef;
      delete existingDef.of;
      lockedArrays.add(existingDef);
    } else if (!lockedArrays.has(existingDef)) {
      if (newDef.schemaRef && !existingDef.schemaRef && !oldOf) {
        existingDef.schemaRef = newDef.schemaRef;
      } else if (newOf && !oldOf && !existingDef.schemaRef) {
        existingDef.of = newDef.of;
      }
    }
  }
}

/**
 * Simple MemberDef inference for merge phase (uses resolved schema names based on path)
 * This is used during schema merging where we need basic type information
 * and the schema names are resolved based on the path context.
 */
function inferMemberDefSimple(
  value: any,
  path: string,
  fullPath: string[],
  ctx: InferenceContext
): MemberDef {
  if (value === null) {
    return { type: 'any', path, null: true, optional: true };
  }

  if (value === undefined) {
    return { type: 'any', path, optional: true };
  }

  const jsType = typeof value;

  switch (jsType) {
    case 'string':
      return { type: 'string', path };

    case 'number':
      return { type: 'number', path };

    case 'bigint':
      // A JS bigint is a distinct IO value type → infer the `bigint` schema type, NOT `number`
      // (number = IEEE-754 double and correctly rejects a bigint). See SERIALIZATION/spec bigint.md.
      return { type: 'bigint', path };

    case 'boolean':
      return { type: 'bool', path };

    case 'object':
      if (Array.isArray(value)) {
        return inferArrayMemberDefSimple(value, path, fullPath, ctx);
      }
      // Value objects first: these are typed VALUES, not records with members.
      if (value instanceof Date) return { type: 'datetime', path };
      if (value instanceof Decimal) return { type: 'decimal', path };
      if (value instanceof Uint8Array) return { type: 'any', path }; // no `binary` TypeDef yet
      // Check if this is a dynamic key object (collection-like)
      // Also check dynamicPaths for single-item objects that were identified as dynamic
      // because a sibling has multiple items
      const fullPathKey = fullPath.join('.');
      if (!ctx.dynamicContradictions.has(fullPathKey) &&
          (isDynamicKeyObject(value) || ctx.dynamicPaths.has(fullPathKey))) {
        // Dynamic-keyed object (map): link via a wildcard container schema — the member references
        // `$<key>` and `$<key>: {*: $<item>}` is queued, so the item schema is actually used.
        // (A direct schemaRef would wrongly describe the CONTAINER as an item.)
        return inferDynamicContainerMemberDef(path, fullPath, ctx);
      }
      // Regular nested object - look up the resolved name based on the full path
      const baseName = `$${safeName(path, ctx.claimedNames)}`;
      const resolvedName = ctx.resolvedNames.get(pathKey(fullPath, baseName)) || baseName;
      // If conflicted, fall back to plain object without schemaRef
      if (resolvedName.endsWith('::CONFLICTED')) {
        return { type: 'object', path };
      }
      return { type: 'object', path, schemaRef: resolvedName };

    default:
      return { type: 'any', path };
  }
}

/**
 * Simple array MemberDef inference for merge phase
 */
function inferArrayMemberDefSimple(
  arr: any[],
  path: string,
  fullPath: string[],
  ctx: InferenceContext
): MemberDef {
  if (arr.length === 0) {
    return { type: 'array', path };
  }

  // An untyped array accepts nullable-any elements (ArrayDef default = the compiler's `[]`
  // canonical form), so null-bearing arrays infer as plain `array` — a `schemaRef`'d element
  // would reject the nulls the data actually contains (issue #61).
  const hasNulls = arr.some(item => item === null);
  // EVERY element must be a plain object for the array to take an item schema. `some` was wrong:
  // one object among arrays or primitives typed the whole array as `[$item]`, and the elements
  // that were not objects then failed validation on re-parse -- `[['a','b'], {x:1}]` threw
  // invalid-object. A heterogeneous array stays untyped, which is what the comment below has
  // always said it should do.
  const allObjects = arr.length > 0 && arr.every(item =>
    isPlainRecord(item)
  );

  if (allObjects && !hasNulls) {
    const baseName = `$${safeName(singularize(path), ctx.claimedNames)}`;
    const resolvedName = ctx.resolvedNames.get(pathKey(fullPath, baseName)) || baseName;
    // If conflicted, fall back to plain array without schemaRef
    if (resolvedName.endsWith('::CONFLICTED')) {
      return { type: 'array', path };
    }
    return { type: 'array', path, schemaRef: resolvedName };
  }

  // Homogeneous primitive arrays get an element type (`[string]`): validation and
  // self-description for free. The guard is EVERY element, same kind — one stray value,
  // a null, or a nested array keeps the member untyped, so nothing the data contains can
  // be rejected on re-parse.
  if (!hasNulls) {
    const t0 = primitiveTypeOf(arr[0]);
    if (t0 !== null && arr.every(v => primitiveTypeOf(v) === t0)) {
      return { type: 'array', path, of: { type: t0 } } as MemberDef;
    }
  }

  // Mixed kinds, nulls, or nested arrays: untyped elements accept them all — and the member
  // must STAY untyped even if a later instance happens to look homogeneous.
  const untyped: MemberDef = { type: 'array', path };
  lockedArrays.add(untyped);
  return untyped;
}

/**
 * Phase 5: Build the final schema structure using pre-merged schemas
 */
function buildFinalSchema(
  data: any,
  schemaName: string,
  currentPath: string[],
  ctx: InferenceContext
): Schema {
  // Use the pre-merged schema if available
  if (ctx.schemaRegistry.has(schemaName)) {
    return ctx.schemaRegistry.get(schemaName)!;
  }

  // Fallback for edge cases
  if (data === null || data === undefined) {
    const builder = Schema.create(schemaName);
    builder.addMember(ROOT_VALUE_MEMBER, { type: 'any', path: ROOT_VALUE_MEMBER, optional: true });
    return builder.build();
  }

  if (Array.isArray(data)) {
    const objects = data.filter(item =>
      isPlainRecord(item)
    );
    if (objects.length > 0 && ctx.schemaRegistry.has(schemaName)) {
      return ctx.schemaRegistry.get(schemaName)!;
    }
  }

  if (isPlainRecord(data)) {
    if (ctx.schemaRegistry.has(schemaName)) {
      return ctx.schemaRegistry.get(schemaName)!;
    }
  }

  // Root VALUES -- primitives, and the scalar-shaped objects (Date, Decimal, byte array) that
  // isPlainRecord excludes -- are wrapped in the positional member, the same promotion a root
  // array of scalars gets.
  const builder = Schema.create(schemaName);
  builder.addMember(ROOT_VALUE_MEMBER, inferMemberDef(data, ROOT_VALUE_MEMBER, currentPath, ctx));
  return builder.build();
}

/**
 * Infers a MemberDef from a JavaScript value.
 *
 * A thin alias for {@link inferMemberDefSimple}: there used to be two near-identical copies of
 * this logic (and of the array variant), and they drifted -- one checked conflict markers, the
 * other did not; one used `some` where the other needed `every`. One function, one behaviour.
 */
function inferMemberDef(
  value: any,
  path: string,
  currentPath: string[],
  ctx: InferenceContext
): MemberDef {
  return inferMemberDefSimple(value, path, currentPath, ctx);
}

/**
 * Simple singularization for common cases
 * books -> book, subscribers -> subscriber, categories -> category
 */
function singularize(word: string): string {
  // Handle common irregular plurals
  const irregulars: Record<string, string> = {
    'children': 'child',
    'people': 'person',
    'men': 'man',
    'women': 'woman',
    'mice': 'mouse',
    'geese': 'goose',
    'teeth': 'tooth',
    'feet': 'foot',
    'data': 'datum',
    'criteria': 'criterion',
    'analyses': 'analysis',
    'indices': 'index'
  };

  const lower = word.toLowerCase();
  if (irregulars[lower]) {
    // Preserve original case of first letter
    const singular = irregulars[lower];
    return word[0] === word[0].toUpperCase()
      ? singular.charAt(0).toUpperCase() + singular.slice(1)
      : singular;
  }

  // Regular patterns
  if (word.endsWith('ies') && word.length > 3) {
    return word.slice(0, -3) + 'y';
  }
  if (word.endsWith('ves')) {
    return word.slice(0, -3) + 'f';
  }
  if (word.endsWith('es') && (
    word.endsWith('sses') ||
    word.endsWith('xes') ||
    word.endsWith('zzes') ||
    word.endsWith('ches') ||
    word.endsWith('shes')
  )) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 1) {
    return word.slice(0, -1);
  }

  return word;
}

export default inferDefs;
