# Schema package: incremental reorg roadmap

Goal: Improve modularity, testability, and clarity (KISS), keep performance high, and avoid over-engineering. This is a rearrangement and hygiene pass to pave the way for a future full revamp.

## Guiding principles
- Single-responsibility modules with clear boundaries (compile vs. process vs. types vs. registry vs. utils).
- Stable, minimal public surface via `src/schema/index.ts`.
- Prefer composition over duplication; remove local helpers duplicated across modules.
- Keep behavior identical; add tests when public behavior changes (not planned in this phase).
- Performance-neutral or better; avoid extra allocations in hot paths.

## Proposed module layout (target shape)
- src/schema/
  - compile-*.ts (compiler-only concerns)
  - processing/
    - object-processor.ts
    - collection-processor.ts
    - member-processor.ts
    - index.ts (barrel, optional)
  - types/
    - memberdef.ts
    - typedef.ts
  - utils/
    - member-utils.ts (shared helpers like normalizeKeyToken)
    - additional-props-canonicalizer.ts
  - typedef-registry.ts
  - schema.ts, schema-utils.ts, schema-types.ts
  - index.ts (public API barrel)

Note: We will not rename existing files in this phase unless low risk; we can move helpers into utils and re-export safely.

## Phase 1: Low-risk hygiene (this PR)
- [x] Centralize exports in `index.ts` for shared internals used by tests/tools:
  - `canonicalizeAdditionalProps`
  - `processMember` (from member-processor)
- [x] Add this roadmap and conventions.

## Phase 2: DRY and utilities
- [x] Replace duplicate `processMember` implementation inside `object-processor.ts` with the shared `member-processor.processMember`.
- [x] Move shared key/token helpers (`normalizeKeyToken`) into `utils/member-utils.ts` and import where used.
- [x] Add `processing/index.ts` barrel (internal ergonomics).
- [ ] Keep file-local wrappers if needed for perf, but avoid logic duplication.

## Phase 3: Compile/Process boundaries
- Ensure compiler paths only construct schemas, never parse values.
- Ensure processor paths only parse/validate values against Schema/MemberDef.
- Confirm wildcard "*" handling remains compile-time concern mirrored on `schema.open`.

## Phase 4: Public surface and docs
- Document public exports in `index.ts` and discourage reaching into deep internals from outside the package.
- Add lightweight architectural doc (data flow, error modes, edge cases) with examples.

## Non-goals (for later revamp)
- Rewriting core algorithms or changing public behavior.
- Changing performance profile significantly.
- Introducing heavy frameworks or dependency churn.

## Acceptance criteria
- All tests pass unchanged.
- No console noise by default; warnings are opt-in and test-gated.
- No duplicate implementations of core helpers (tracked and removed per phase).
- Public API remains stable; minor additions are documented.

## Risks and mitigations
- Import cycle risk: avoid cross-imports between compile and process layers; use `utils/` for shared helpers.
- Hidden behavior changes: restrict changes to wiring/exports and add incremental tests if wiring shifts.
