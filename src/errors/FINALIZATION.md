# Error Infrastructure Finalization Tracker

This is a **mutable work tracker**, not a contract. It records the state of finalizing the Internet
Object **core error codes** into a stable, cross-platform-publishable registry, and it protects the
subset of codes that the streaming specification has already frozen by reference.

It is the error-layer analog of `src/streaming/IMPLEMENTATION-GAPS.md`: a tracker that sits beside the
frozen contracts, never redefines them.

## Why this exists

The streaming protocol ([`../streaming/specs/PROTOCOL.md`](../streaming/specs/PROTOCOL.md)) and its
conformance corpus reference specific core error codes and classes. The moment that spec is published
cross-platform, those referenced codes become a **frozen contract** — even though the *full* core error
infrastructure has not yet been finalized. Without an explicit record, a later core error cleanup could
rename or recategorize one of those codes and silently break every cross-platform streaming
implementation. This document makes the frozen subset visible and protected.

## Status

- **Streaming-referenced subset:** finalized and frozen by reference (table below).
- **Full core error infrastructure:** not yet finalized. Deferred; scoped by the Definition of Done below.

## Frozen-by-reference subset

These codes/classes are now contractual because a streaming conformance case depends on them. They MUST
NOT be renamed, removed, or recategorized within streaming protocol v1 (see Invariant below).

| Code | Class | Category | Frozen by |
|---|---|---|---|
| `expecting-bracket` | `IOSyntaxError` | `syntax` | `conformance/cases/recoverable-parse-error.json` |
| `not-a-string` | `IOValidationError` | `validation` | `conformance/cases/multi-validation-error-one-item.json` |
| `schema-not-defined` | `IOValidationError` | `validation` | `conformance/cases/unknown-schema-switch-fatal.json` |

Streaming-owned `stream`-category codes (`stream-buffer-exceeded`, `stream-source-error`,
`stream-aborted`) are defined by the streaming layer (PROTOCOL §7.3), not core, and are tracked in the
streaming gap tracker — not here.

## Resolved findings (during streaming pinning)

- **Boolean validator misclassification — FIXED.** `src/schema/types/boolean.ts` imported the base
  `IOError` aliased as `ValidationError`, so boolean validation failures (`not-a-bool`) were raised as
  base `IOError` instead of `IOValidationError`. Corrected to import `io-validation-error`. This was the
  only validator with the bug; full suite passed with no regressions. Fixing it also resolved a
  multi-error collection anomaly (the base error had been short-circuiting collected validation errors).

## Punch list (open — for full finalization)

1. **Category derives from class, not bucket.** `schema-not-defined` lives in the *Parsing* code group
   yet is raised as `IOValidationError`. Confirm/realign every code's group with the class it is raised
   as, or document that group membership is organizational only and category is class-derived.
2. **`runtime` vs `general` naming.** Core's error-node `toJSON` projects base-`IOError` category as
   `"runtime"`; the protocol category is `general`. Reconcile to one term. Non-breaking (no streaming
   case exercises `general`).
3. **Completeness:** audit all error-construction sites (~119) and generic throws/`assertNever` (~52).
   Classify each as a public code or an internal invariant; ensure no user-reachable error is uncoded.
4. **No drift:** every emission site references `ErrorCodes`; eliminate any raw code-string literals.
5. **No dead codes:** every enum entry is emitted somewhere, or explicitly marked `reserved`.
6. **Per-code definitions:** give each code a one-line, language-neutral trigger definition.
7. **Registry:** publish a language-neutral `ERROR-CODES.md` (code, class/category, trigger, stability)
   that the TS enums realize; have `PROTOCOL.md` reference it for the `syntax`/`validation`/`general`
   codes it preserves.
8. **Freeze + versioning policy:** additive-only within a major version; new codes in minor versions;
   no rename/remove/recategorize of published codes.

## Definition of Done

Full core error finalization is complete when punch-list items 1–8 are satisfied, the registry is
published, and the freeze policy is adopted.

## Protecting invariant

> Until a streaming protocol major-version bump, finalization work MAY only **add** codes, **sharpen**
> definitions, and **fill gaps**. It MUST NOT rename, remove, or recategorize any code in the
> frozen-by-reference subset above, nor change the class/condition that produces it in a streaming
> conformance case.

## Dependency

```
streaming spec  →  frozen-by-reference subset  →  (slice of)  →  full core error code set (in flux)
```

Anyone changing core error codes MUST consult the frozen subset before touching it.

## Cross-references

- Streaming protocol error model: [`../streaming/specs/PROTOCOL.md` §7](../streaming/specs/PROTOCOL.md#7-error-model)
- Conformance corpus: [`../streaming/specs/conformance/`](../streaming/specs/conformance/)
- Streaming runtime tracker: [`../streaming/IMPLEMENTATION-GAPS.md`](../streaming/IMPLEMENTATION-GAPS.md)
- Code enums: `io-error-codes.ts`, `general-error-codes.ts`, `tokenization-error-codes.ts`, `parsing-error-codes.ts`, `validation-error-codes.ts`
- Error classes: `io-error.ts`, `io-syntax-error.ts`, `io-validation-error.ts`
