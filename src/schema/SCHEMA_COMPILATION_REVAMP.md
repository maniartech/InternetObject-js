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

8) `Schema.open` union correctness
- Problem: Code assigns boolean or a canonicalized member-def to `schema.open`.
- Action: Ensure `Schema.open: boolean | MemberDef` (or a dedicated union type) and consumers handle both shapes.
- Benefit: Prevents type drift/assumptions downstream.

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

- Build + type-check pass with no new warnings.
- All existing tests pass; no behavioral regressions.
- New tests cover: keyless members, `*` positioning, `[]` semantics, `$Var` in object typedefs, duplicate-member error.
- Importing modules does not emit duplicate type registration warnings.
- `Schema.open` is correctly typed and consumed.

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

