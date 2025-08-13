# Schema Compilation Revamp

A concise, actionable plan to harden schema compilation while keeping behavior stable, code simple (KISS), and responsibilities minimal (SRP). Focus is on correctness, type-safety, and modest performance wins without over-engineering.

## Objectives

- Preserve current external behavior; avoid breaking changes unless clearly justified and typed.
- Make parsing/compilation robust to AST variations and authoring mistakes.
- Keep additional-properties (open schema) canonical and explicit.
- Reduce noisy side effects on import (idempotent registration).
- Improve type safety of construction paths (MemberDef, Schema.open).

## Guiding principles

- KISS: Small helpers over complex conditionals; avoid feature creep.
- SRP: Parsing, canonicalization, and registry concerns remain separate.
- Minimal surface change: Prefer internal refactors behind existing APIs.
- Test-first for edge cases; iterate with small, verifiable steps.

## Current components in scope

- `src/schema/compile-object.ts` (object/array/member parsing, `*` handling)
- `src/schema/additional-props-canonicalizer` (reused for dynamic fields)
- `src/schema/typedef-registry.ts` and `src/schema/types` (type registration)
- `src/schema/schema.ts` (ensure `open` type is correct and respected)

## Targeted fixes (low-risk, high-value)

1) Keyless member parsing is brittle
- Problem: When `memberNode.key` is missing, `parseName(memberNode.value)` expects a `Token` but may receive a `TokenNode` (STRING), causing false “key must be a string” errors.
- Action: Create a tiny helper to extract the raw string from `Token | TokenNode` (STRING) and call `parseName` with that shape; throw `invalidKey` otherwise.
- Benefit: Aligns with actual AST, prevents spurious failures.

2) Idempotent typedef registration
- Problem: `registerTypes()` at module load causes duplicate-registration warnings and work.
- Action: Guard registration via a module-level flag or add an idempotent `TypedefRegistry.registerOnce()`; centralize init if feasible.
- Benefit: Quieter logs and faster cold start; unchanged behavior.

3) Canonicalizer import and typing
- Problem: Dynamic `require` inside loop is untyped and repeated.
- Action: Hoist require/import to module scope. If a cycle requires `require`, keep it at top-level and annotate type for `canonicalizeAdditionalProps`.
- Benefit: Micro-perf improvement and clearer intent with TS support.

4) Optional vs. nullable array item semantics
- Problem: Empty array schema (`[]`) sets items as `{ type:'any', null:true, optional:true }`. Item-level `optional` is ambiguous.
- Action: Remove `optional:true` from item spec; reserve optionality for the property (via `?` on the key). Keep `null:true` if item nullability is intended.
- Benefit: Clearer semantics; aligns with common schema patterns.

5) `$schemaVar` support in inline object typedefs
- Problem: Arrays support `$Var` (e.g., `[ $Person ]`), but object typedefs don’t support `{ $Person, ... }`.
- Action: If first member is a `$`-prefixed STRING, return `{ type:'object', schema: token }`, mirroring array logic. Optionally support `type: $Var`.
- Benefit: Consistency across forms; more expressive authoring.

6) Duplicate member detection
- Problem: `addMemberDef` overwrites silently on same-scope duplicates.
- Action: Throw a `SyntaxError` when a name already exists in `schema.defs`.
- Benefit: Fail-fast; prevents subtle conflicts.

7) MemberDef construction hardening
- Problem: Multiple `as MemberDef` casts without validation.
- Action: Introduce a tiny `createMemberDef(...)` factory or validator that ensures required fields and valid unions; use at creation sites.
- Benefit: Type safety and uniformity with minimal code.

8) `Schema.open` union correctness [Done]
- Problem: Code assigns boolean or a canonicalized member-def to `schema.open`.
- Action: Ensure `Schema.open: boolean | MemberDef` (or a dedicated union type) and consumers handle both shapes.
- Benefit: Prevents type drift/assumptions downstream.
  Status: Done — `Schema.open` supports boolean | MemberDef and processors consume both.

9) Remove unused and dead code
- Action: Remove unused `fieldName` in `getMemberDef`. Replace `if (!o.children)` with clearer checks (empty array handling is already explicit).
- Benefit: Less noise; easier maintenance.

## Non-goals (avoid over-engineering)

- No new DSL features beyond `$Var` parity in object typedefs.
- No global refactor of schema processing pipeline.
- No runtime performance micro-optimizations without profiling evidence.

## Implementation phases

Phase 1: Safety and typing (small, isolated)
- Idempotent registration (2)
- Canonicalizer import/typing (3)
- `Schema.open` union verification (8)
- Remove unused/dead code (9)

Phase 2: Correctness (edge-case behavior)
- Keyless member parsing helper (1)
- Array item optionality cleanup (4)
- Duplicate member detection (6)

Phase 3: Feature parity
- `$schemaVar` support in object typedefs (5)
- Optional small `MemberDef` factory (7)

## Acceptance criteria (Done = true)

- Build + type-check pass with no new warnings. (Done)
- All existing tests pass; no behavioral regressions. (Done)
- New tests cover: keyless members, `*` positioning, `[]` semantics, `$Var` in object typedefs, duplicate-member error.
- Importing modules does not emit duplicate type registration warnings.
- `Schema.open` is correctly typed and consumed. (Done)

## Test plan (additions)

- Keyless member names: plain, `?`, `*`, `?*` → `{ type:'any' }` with correct flags.
- Additional props: `*` must be last; earlier `*` throws; canonicalized def mirrors to `schema.defs['*']` and `schema.open`.
- Arrays: `[]`, `[string]`, `[ {object} ]`, nested arrays → item optionality not set; nullability as intended.
- `$Var` in object typedefs: `{ $Person, min:2 }` and `{ type: $Person, min:2 }` behave like array counterparts.
- Duplicate members: defining same field twice throws a clear `SyntaxError`.

## Risk and rollback

- Risk: Tightening duplicate detection and keyless parsing could surface previously hidden issues.
- Mitigation: Gate with tests; keep changes minimal and local; easy rollback by reverting specific helpers.

## Performance notes

- Hoist canonicalizer import; avoid per-iteration `require`.
- Keep lookups O(1) and string ops minimal. No further perf work unless profiling shows hotspots.

## Ownership and follow-up

- Owner: Schema compilation module maintainers.
- Follow-up: Consider a tiny typed `MemberDef` factory if we add more construction sites.

---

# Processing Pipeline Revamp (processSchema, processObject, related)

A focused plan to improve input validation, schema-variable resolution, error modes, and tiny perf wins—without changing behavior.

## Goals

- Strong input contracts and type-narrowing after validation.
- Clear, actionable errors (no ambiguous `assertNever` fallthroughs).
- Consistent `$Var` resolution and helpful messages when missing.
- Keep positional vs. keyed processing logic intact; clarify edge cases.

## Contracts and flow (proposed, non-breaking)

- `processSchema(data, schema, defs)`
  - Input types: `data ∈ {ObjectNode, CollectionNode, null}`, `schema ∈ {Schema, TokenNode}`.
  - Early return for `null` data (already present).
  - Validate via `ValidationUtils.validateProcessingInputs` → returns `{ data, schema }` with narrowed types.
  - Route by instance: ObjectNode → `processObject`, CollectionNode → `processCollection`.
  - Remove redundant `return null` after `assertNever` (the assert should be `never`).

- `processObject(data, schemaOrToken, defs, index?)`
  - If `schemaOrToken` is `TokenNode`, resolve with `defs?.getV(schemaName)`.
  - If resolution fails, let `getV` throw `ValidationError` with appropriate code and position; do not mask with a different error type.
  - Ensure result is `Schema`; else assert with message “Invalid schema type after resolution”.
  - Delegate to internal `_processObject` with `Schema`.

## Error modes (make explicit)

- Missing `$Var` in `defs`: `defs.getV` throws `ValidationError(ErrorCodes.schemaNotDefined)` (with token position if available); propagate as-is.
- Missing `@var` in `defs`: `defs.getV` throws `ValidationError(ErrorCodes.variableNotDefined)`; propagate as-is.
- Type mismatch after validation: `assertNever` with actionable message (unexpected node type after validation).
- Additional values when schema is closed: keep current `additionalValuesNotAllowed` error, ensure message references `schema.name`.

## processObject internals (behavioral clarifications, no changes)

- Positional phase
  - Iterate `schema.names` index-aligned with `data.children` while members are keyless.
  - If a keyed member is encountered, switch to keyed mode.
  - For required fields without data, throw `valueRequired` with `memberDef.path`.

- Remaining positional values
  - If still positional and data has more items:
    - If `schema.open` is falsy, throw `additionalValuesNotAllowed`.
    - If values are keyless, push them as-is with `toValue(defs)`.

- Keyed phase
  - Track `processedNames` to avoid reprocessing.
  - Lookup `schema.defs[name]`; if found, `processMember` and set if not `undefined`.
  - If not found:
    - If `schema.open === true`, accept and set raw value.
    - If `schema.open` is a MemberDef, validate/conform the value against it before set.
    - Else throw `additionalMembersNotAllowed`.

- Null vs undefined
  - `undefined` from `processMember` → omit field.
  - `null` is a valid value only if `memberDef.null` (or open-def null) allows it.

## Micro performance (keep simple)

- Avoid repeated `schema.defs[name]` lookups in the same loop; cache lookup in a local.
- Keep `processedNames` as a `Set<string>` (already present).
- Do not add abstraction layers; small local variables suffice.

## Tests to add

- `processSchema` routes correctly for `ObjectNode`, `CollectionNode`, and returns `null` for `null`.
- `$Var` resolution: success and failure (expect `schemaNotDefined`).
- `@var` resolution: success and failure (expect `variableNotDefined`).
- Closed schema rejects extra positional and extra keyed values with correct messages.
- Open schema with `open: true` accepts unknown keyed members.
- Open schema with `open: MemberDef` validates unknown keyed members against the def.
- `undefined` return from member processing omits the field; `null` honored if allowed.

## Acceptance criteria

- No behavior changes vs. current tests (all green).
- New tests covering routing, `$Var`/`@var` resolution errors, and open/closed behaviors pass.
- No new warnings; minimal code churn to implement.

## Rollout plan

- Document (this file) → add tests → implement minimal internal changes:
  - Ensure `$Var`/`@var` resolution errors are propagated from `getV` (no masking).
  - Remove unreachable `return null` after `assertNever` in `processSchema`.
  - Add small caches/locals for repeated lookups (non-invasive).
- Re-run full test suite; back out any change that risks behavior.

---

# Definitions and Variable Resolution (@ vs $)

Conventions and behaviors for definitions (`src/core/definitions.ts`) used across compilation and processing.

## Conventions

- `@name` → value variable (regular variable)
- `$Name` → schema variable (resolves to a `Schema`)

## Resolution rules (desired and current)

- `$Name` (schema variable)
  - Desired/Current: Must resolve to a `Schema`; if not found, throw `ValidationError(ErrorCodes.schemaNotDefined)` with token position when available.
  - Processors (e.g., `processObject`) should use `defs.getV(token)` for resolution and let the error surface.

- `@name` (regular variable)
  - Desired/Current: Must resolve to a value; if not found, throw `ValidationError(ErrorCodes.variableNotDefined)` with token position when available.
  - Consumers should not swallow this error; it indicates an authoring/config issue.

## Usage guidance

- Schema resolution should only involve `$` tokens. `processObject` should never treat an `@` token as a schema.
- Value substitution sites (member processing, expressions, defaults) should expect both variables to be defined; missing ones are errors.

## Tests to add

- Missing `$Schema` in defs → throws `schemaNotDefined` (with position).
- Missing `@var` in defs → throws `variableNotDefined` (with position).
- Sample data scenarios in `io-playground/src/sample-data` continue to parse/validate as before.

## Acceptance

- Clear, documented behavior for both categories of variables.
- Tests enforce that both `$` and `@` unresolved variables throw.
- No changes required to `getV` behavior; processors should propagate these errors unchanged.

---

# Revamp Test Suite: Scope, instrumentation, and status

A lightweight, staged test plan to validate the revamp without breaking existing behavior. Tests will log produced structures (compiled schemas, processed objects/collections) so we can assert on real outputs rather than assumptions.

## Suite scope (grouped cases)

1) Definitions and variable resolution (@ vs $)
- Happy path: `$schema` present; `@r/@g/@b` present; document uses `@r`.
- Error path: missing `$schema` → expect `schemaNotDefined` (with token position if available).
- Error path: missing `@var` (e.g., `@r` in choices or document) → expect `variableNotDefined` (with position when available).

2) Processing router and contracts
- `processSchema(null, schema)` → returns `null`.
- ObjectNode routes to `processObject`; CollectionNode routes to `processCollection`.
- Defensive `assertNever` path is unreachable after validation.

3) Additional properties (open schema) handling
- `*` as last member sets `schema.open` to `true` or canonicalized def.
- `*` not last → `invalidSchema`.
- Unknown keyed fields: allowed when `open: true`; validated when `open` has a MemberDef; rejected when closed.

4) Keyless members and infer-any
- Bare field names compile with `{ type: 'any' }`, respecting `?`, `*`, `?*` suffixes.
- Positional values honored until first keyed member; then keyed mode.

5) Arrays and item semantics
- `[]` → array of any (items nullable as currently implemented); ensure no item-level `optional` flag is set.
- `[string]`, nested arrays, arrays of objects `{ ... }`.

6) `$Var` parity in object typedefs (if/when adopted)
- `{ $Person, min: 2 }` and `{ type: $Person, min: 2 }` behave like array counterparts.
- Marked as optional; skip tests if not yet implemented.

7) Duplicate member detection (optional)
- Duplicate field names in same scope throw a clear `SyntaxError`.
- Marked as optional; skip until implemented.

## Instrumentation (what to log)

- Compiled schema: `console.log('schema.json', schema.toJSON())`, `console.log('schema.open', typeof schema.open, schema.open)`.

---

## Revamp tests: current status and fix plan

The first draft of `tests/schema/revamp/revamp-suite.test.ts` exposes a few setup gaps. Before adding more cases, address these so the suite is stable and readable.

### Observed issues

- Missing imports and wrong symbol names:
  - `Definitions` should be `IODefinitions`.
  - `compileObject` and `parseFirstChildObject` used in tests aren’t imported/defined.
- AST creation utilities:
  - Tests need a tiny helper to parse object snippets (e.g., `'{ name, * }'`) into an `ObjectNode` for `compileObject`.
- Consistency with current behavior:
  - Array item semantics (`[]` items) must align with existing implementation (nullable items; no item-level `optional`).
  - Additional properties: `*` must be last; open schema mirrored to `schema.defs['*']` and `schema.open`.

### Minimal fixes (no production changes)

- Update imports in `revamp-suite.test.ts`:
  - `import IODefinitions from '../../../src/core/definitions'`
  - `import compileObject from '../../../src/schema/compile-object'`
  - Import parser/tokenizer or define a small local helper (see below).
- Replace all `new Definitions()` with `new IODefinitions()`.

---

## Revamp suite: first run results and adjustments

After wiring up the initial revamp suite and running only `tests/schema/revamp/revamp-suite.test.ts`, results show most structural scenarios passing, with errors isolated to ValidationError assertions on code property.

### Pass highlights
- compileObject:
  - `*` at last → open schema set (boolean) ✅
  - `*` not last → throws ✅
  - `* : string` canonicalizes and mirrors to `schema.open` ✅
  - keyless fields infer `type: 'any'` and flags ✅
- processSchema routing: ObjectNode/CollectionNode routed; null returns null ✅
- End-to-end parse with header defs and variables (happy path) ✅

### Failures observed (all assertion-layer)
- ValidationError shape: current implementation exposes `errorCode` (not `code`).
  - Missing `$Schema` → we asserted `e.code === schemaNotDefined`; actual is `e.errorCode`.
  - Missing `@var` → we asserted `e.code === variableNotDefined`; actual is `e.errorCode`.
  - End-to-end parse missing `@` → same mismatch.

### Proposed test adjustments (no production changes)
- Replace assertions from `e.code` to `e.errorCode` across revamp tests.
- Keep message/position checks optional and non-brittle (we can log for debugging but assert only on `errorCode`).
- Retain the small parser helpers in the test for consistent AST generation:
  - `parseFirstChildObject`, `parseFirstChildCollection`, and `makeStringTokenNode`.

### Next steps
- Update the failing assertions to use `e.errorCode` and re-run the targeted suite.
- If all green, expand with the remaining planned cases (arrays semantics, registry idempotency, duplicate member detection as `todo`/`skip`).

### Note
- The console message `Did not find path entry /c/ProgramData/miniconda3/bin` is environmental and unrelated to assertions; test execution proceeds normally.

---

## Typed-open schema semantics (decision) 🎯

Make behavior explicit for typed additional-properties rules (e.g., `*: number`).


Processor implications (processObject):

Tests:

