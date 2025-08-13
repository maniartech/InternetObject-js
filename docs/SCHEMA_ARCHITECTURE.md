# Schema architecture and data flow (compile vs. process)

This document explains the boundaries and data flow between the compile phase (schema construction) and the process phase (data parsing/validation) in the schema package. It’s short by design; see SCHEMA_REORG_ROADMAP.md for reorg phases.

## TL;DR
- Compile builds an immutable Schema from AST. No values are parsed here.
- Process parses/validates data against a Schema and returns structured results.
- Wildcard “*” (additional properties) is compiled into `schema.open` and excluded from required checks.

## Compile phase (AST -> Schema)
Inputs
- AST nodes (ObjectNode/ArrayNode/TokenNode) from the parser
- Optional type/typedef registry (TypedefRegistry)
- Optional schema vars (TokenNode starting with `$`)

Main steps
1) Entry: `compileObject(name, node, defs)` in `src/schema/compile-object.ts`
   - Returns a `Schema` or a `$Var` TokenNode (deferred resolution).
2) Object member handling
   - Keyed members: `getMemberDef()` parses the key (via `normalizeKeyToken` + `parseName`) and value (Token/Object/Array) into a `MemberDef`.
   - Keyless members: infer basic `MemberDef` (type:any) using `parseName(normalizeKeyToken(value))` when appropriate.
   - Duplicate member detection at compile-time throws.
3) Additional properties (wildcard)
   - If key is `*`, canonicalize via `canonicalizeAdditionalProps(...)`.
   - Store result in `schema.defs['*']` and mirror on `schema.open`.
   - “*” is not pushed to `schema.names` (not a real member), and is excluded from required checks.
4) Type shortcuts and variables
   - `{ string, ... }` or `{ type: string }` compile to a member def using the registry.
   - `$Var` returns a TokenNode placeholder; resolution happens during processing.
5) Arrays and objects
   - Arrays compiled with consistent semantics (empty array => `of:any` with `null: true`; no item-level optionality from emptiness).
   - Nested arrays/objects compile recursively.

Outputs
- Immutable-style `Schema` with:
  - `names: string[]` ordered positional member names
  - `defs: Record<string, MemberDef>` member definitions (no `*` in names)
  - `open: boolean | MemberDef` (false | true | typed-open constraints)

Errors (compile)
- Invalid schema structure; invalid/unknown types; duplicate member; invalid keys

## Process phase (DataNode -> InternetObject/Collection)
Inputs
- Data AST nodes (ObjectNode | CollectionNode | null)
- Schema or `$Var` TokenNode (deferred)
- Optional definitions map for `$Var` resolution

Main steps
1) Entry: `processSchema(data, schema, defs)` in `src/schema/processor.ts`
   - Validates inputs (via ValidationUtils) and routes:
     - ObjectNode -> `processObject`
     - CollectionNode -> `processCollection`
     - null -> returns null
2) Object processing (`src/schema/object-processor.ts`)
   - Resolve `$Var` TokenNode schema via `defs.getV()` when needed.
   - Positional phase: iterate `schema.names` in order. Stop when a keyed member appears in data.
   - Keyed phase: process remaining keyed members; enforce no duplicates.
   - Unknown keys:
     - If `schema.open === false`: error (additional values not allowed)
     - If `schema.open === true`: accept as `type:any`
     - If `schema.open` is MemberDef: validate using those constraints (typed-open)
   - Required checks: only real members in `schema.defs`; skip `'*'`.
   - Missing required members with defaults: compute via `processMember` and set if available, else error.
   - Fallback: if schema is open and result is empty, process all members using `any` or `schema.open` constraints.
3) Member processing (`src/schema/member-processor.ts`)
   - Lookup typedef: `TypedefRegistry.get(memberDef.type)`
   - Delegate parse/validate: `typeDef.parse(valueNode, memberDef, defs)`

Outputs
- `InternetObject` or `Collection<InternetObject>` or null

Errors (process)
- Unknown member when `open === false`
- Validation errors from specific typedefs
- Type not registered (guarded by registry)

## Boundaries and contracts
- Compiler never parses data values; it only constructs `Schema` and `MemberDef`s.
- Processor never mutates schema structure; it resolves `$Var`, enforces constraints, and parses values.
- Wildcard `*` is a compile-time construct mirrored to `schema.open` and is never treated as a real member in required checks.

## Performance notes
- Critical paths avoid unnecessary allocations; helper functions (`normalizeKeyToken`, canonicalization) are lightweight.
- Benchmark harness in `performance.ts` stabilizes regex micro-bench (1M iterations + warm-up).

## Edge cases to remember
- `$Var` schemas: compile returns TokenNode; processing resolves.
- Empty object schema: open object (`schema.open = true`).
- Empty array schema: `array of any` with `null: true`; no item-level optionality implied.
- Duplicate members: compile-time error.
- Warning policy: typedef duplicate registration warnings are quiet by default; opt-in in tests via a toggle.
