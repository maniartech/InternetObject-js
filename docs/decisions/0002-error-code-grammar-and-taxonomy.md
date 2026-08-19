# ADR 0002 — Error-code grammar (`<subject>-<predicate>`) and a symmetric taxonomy

- **Status:** Proposed — awaiting review. No code changed yet.
- **Date:** 2026-08-13
- **Owner:** core/errors (affects every layer + streaming)
- **Related:** `src/errors/FINALIZATION.md` (punch list #1–#7) · streaming `PROTOCOL.md` §7 · streaming conformance corpus · ADR [0001](0001-defer-strict-validation-mode.md)

---

## TL;DR

Every public error code becomes **`<subject>-<predicate>`** (subject first), kebab-case. The predicate is
drawn from a small, fixed verb vocabulary reused across subjects so the set is **symmetric** (the same
failure mode is named the same way for every type). This renames ~35 codes, merges 1 duplicate
(`expected-array` + `not-an-array`), splits 2 overloaded codes (`invalid-type`, `invalid-object`), retires
2 dead codes (`not-a-number`, `not-an-integer`), and — the substance of the balancing work (§5) — switches
the numeric/datetime/object validators off the generic `invalid-type` / `out-of-range` onto precise
per-type codes. It is a **breaking change** to the public
`errorCode` strings — done now because the package is pre-1.0 (0.2.1) and the streaming spec is still
Beta/unreleased, so the streaming "frozen-by-reference" subset can still be renamed cheaply (in lockstep
with the conformance corpus). After this lands, the codes re-freeze under the new names.

---

## 1. The two problems

1. **Grammar is inconsistent.** ~8 codes are already subject-first (`schema-not-found`,
   `string-not-closed`, `value-required`, …) but ~35 are predicate-first (`not-a-string`,
   `invalid-email`, `expecting-bracket`, `unexpected-token`, `out-of-range`, …). There is no single rule.
2. **The set is not symmetric.** The same concept is named different ways, and some types are missing
   codes their siblings have:
   - **Type mismatch named 3 ways:** `not-a-string` (validation), `expected-object` (general), generic
     `invalid-type` (general).
   - **A true duplicate:** `expected-array` (general) and `not-an-array` (validation) are the same error.
   - **Length/size bounds only exist for strings** (`invalid-length` / `invalid-min-length` /
     `invalid-max-length`); arrays have none; numbers use a different word (`out-of-range`).

---

## 2. The grammar rule

> **`<subject>-<predicate>`**, lowercase, hyphen-separated. Subject first, predicate last.

- **subject** — what the error is *about*: a data type (`string`, `number`, `integer`, `boolean`,
  `array`, `object`, `decimal`, `bigint`, `datetime`, `base64`), or a construct (`schema`, `member`,
  `memberdef`, `definition`, `variable`, `key`, `value`, `type`, `token`, `pattern`, `range`, `scale`,
  `precision`, `annotation`, `escape-sequence`, `null`, `choice`).
- **predicate** — a verb/verb-phrase for the condition, taken from the fixed vocabulary in §3.

Multi-word subjects and predicates are allowed (`schema-name-invalid`, `array-expecting-closing-bracket`),
but the **first token is always the subject**.

---

## 3. Canonical predicate vocabulary (reused for symmetry)

| Predicate | Meaning | Layer |
|---|---|---|
| `-expected` | the required **type** or token is absent / a different type was found | type |
| `-invalid` | present but **malformed** / does not conform | any |
| `-not-found` | a named lookup target does not exist | resolution |
| `-not-defined` | a referenced definition/variable is not defined | resolution |
| `-required` | a mandatory **value** is missing (presence, not type) | validation |
| `-not-allowed` | present but forbidden | validation |
| `-not-closed` | an opened construct is never terminated | tokenization |
| `-too-short` / `-too-long` | a size/length bound is violated | validation |
| `-out-of-range` | a numeric value bound is violated | validation |
| `-mismatch` | failed to match a declared spec (e.g. pattern) | validation |
| `-unknown` | not a member of an allowed set | validation |
| `-duplicate` | appears more than once | validation |
| `-unexpected` | appears where it is not allowed | parsing |
| `-unsupported` | not supported by this implementation | any |
| `-empty` | empty where content is required | parsing |
| `-expecting-closing-bracket` | a specific syntactic close token is expected | parsing |

**`-expected` vs `-required`:** `-expected` is a **type** problem (wrong/absent type — `string-expected`);
`-required` is a **presence** problem (a mandatory value is missing — `value-required`). Keeping them
distinct removes the current overlap between `invalid-type`, `not-a-string`, and `value-required`.

---

## 4. Full old → new registry (all 49 codes)

Legend: **keep** = already compliant · **rename** = grammar flip · **merge** = folded into another code ·
**NEW** = added for symmetry (only if a real path emits it — see §5).

### General
| Old | New | Action |
|---|---|---|
| `invalid-type` | **split** → `<type>-expected` (value mismatch) / `type-unknown` (unregistered type in a def) | retired — see §5.4 |
| `invalid-value` | `value-invalid` | rename (generic "matched no constraint" / NaN) |
| `value-required` | `value-required` | keep |
| `null-not-allowed` | `null-not-allowed` | keep |
| `definitions-required` | `definitions-required` | keep |
| `expected-object` | `object-expected` | rename |
| `expected-array` | `array-expected` | **merge** (unifies with `not-an-array`) |

### Tokenization
| Old | New | Action |
|---|---|---|
| `string-not-closed` | `string-not-closed` | keep |
| `invalid-escape-sequence` | `escape-sequence-invalid` | rename |
| `unsupported-annotation` | `annotation-unsupported` | rename |
| `invalid-base64` | `base64-invalid` | rename |
| `invalid-datetime` | `datetime-invalid` | rename |
| `invalid-bigint` | `bigint-invalid` | rename |
| `invalid-decimal` | `decimal-invalid` | rename |

### Parsing
| Old | New | Action |
|---|---|---|
| `unexpected-token` | `token-unexpected` | rename |
| `expecting-bracket` | `array-expecting-closing-bracket` | rename **(FROZEN — lockstep)** |
| `unexpected-positional-member` | `positional-member-unexpected` | rename |
| `invalid-key` | `key-invalid` | rename |
| `invalid-schema` | `schema-invalid` | rename |
| `schema-not-found` | `schema-not-found` | keep |
| `schema-missing` | `schema-missing` | keep (see §6 dedup question) |
| `empty-memberdef` | `memberdef-empty` | rename |
| `invalid-definition` | `definition-invalid` | rename |
| `invalid-memberdef` | `memberdef-invalid` | rename |
| `invalid-schema-name` | `schema-name-invalid` | rename |
| `variable-not-defined` | `variable-not-defined` | keep |

### Validation
| Old | New | Action |
|---|---|---|
| `invalid-object` | **split** → `object-expected` (wrong type) / `object-invalid` (structural) | see §5.1 |
| `unknown-member` | `member-unknown` | rename |
| `duplicate-member` | `member-duplicate` | rename |
| `additional-values-not-allowed` | `additional-values-not-allowed` | keep |
| `invalid-array` | `array-invalid` | rename |
| `not-an-array` | `array-expected` | **merge** (with `expected-array`) |
| `not-a-string` | `string-expected` | rename **(FROZEN — lockstep)** |
| `not-a-number` | `number-expected` | **switch** — today via `invalid-type`; old code is dead (§5.3) |
| `not-an-integer` | `integer-expected` | **switch** — today via `invalid-type`; old code is dead (§5.3) |
| `not-a-bool` | `boolean-expected` | rename |
| `invalid-email` | `email-invalid` | rename |
| `invalid-url` | `url-invalid` | rename |
| `invalid-length` | `string-length-invalid` | rename (array's reuse → `array-length-invalid`, §5.2) |
| `invalid-min-length` | `string-too-short` | rename |
| `invalid-max-length` | `string-too-long` | rename |
| `invalid-pattern` | `pattern-mismatch` | rename |
| `unsupported-number-type` | `number-type-unsupported` | rename |
| `out-of-range` | `datetime-out-of-range` + array size (`array-too-short` / `-too-long`) | **switch** — per-type; container size split from magnitude (§5.2) |
| `invalid-range` | `<type>-out-of-range` (number / integer / decimal / bigint) | rename — this is a **value** bound, not a spec error (§5.1) |
| `invalid-scale` | `scale-invalid` | rename |
| `invalid-precision` | `precision-invalid` | rename |
| `invalid-choice` | `choice-invalid` | rename |
| `schema-not-defined` | `schema-not-defined` | keep **(FROZEN — already compliant)** |

---

## 5. Symmetry / balance — the type × failure-mode matrix

The grammar fixes *how* a code is spelled; symmetry fixes *which codes exist and whether the same failure
is named the same way for every type*. Reading the actual `throw` sites in `src/schema/types/*` exposes
four systematic asymmetries — this, not the spelling, is the substance of the balancing work.

### 5.1 What the code throws today (the asymmetry)

| Failure mode (row) → type (col) | string | number / integer | decimal | bigint | datetime | boolean | array | object |
|---|---|---|---|---|---|---|---|---|
| **wrong type** (value isn't this type) | `not-a-string` | `invalid-type` | `invalid-type` | `invalid-type` | `invalid-datetime` | `not-a-bool` | `not-an-array` | `invalid-object` |
| **value out of range** (min/max value) | — | `invalid-range` | `invalid-range` | `invalid-range` | `out-of-range` | — | — | — |
| **too few** (min length / items) | `invalid-min-length` | — | — | — | — | — | `out-of-range` | — |
| **too many** (max length / items) | `invalid-max-length` | — | — | — | — | — | `out-of-range` | — |
| **exact size wrong** | `invalid-length` | — | — | — | — | — | `invalid-length` | — |

Every populated row uses **two-to-four names for one concept**:

- **Wrong type — 4 conventions.** `not-a-X` (string `string.ts:77`, bool `boolean.ts:33`, array
  `array.ts:42`); generic `invalid-type` (number `number.ts:123`, decimal `decimal.ts:48`, bigint
  `bigint.ts:73`); the *literal* code reused (datetime `datetime.ts:40`); and `invalid-object` (object
  `object.ts:383`). So `string` has a dedicated code and `number` does not — exactly the gap you named.
- **Value-out-of-range — 2 conventions.** `invalid-range` (number `number.ts:157`, bigint `bigint.ts:92`,
  decimal `decimal.ts:146`) vs `out-of-range` (datetime `datetime.ts:117`).
- **Array size borrows other types' codes.** min/max items → `out-of-range` (`array.ts:233,241`); exact
  length → the *string* code `invalid-length` (`array.ts:225`). Arrays own no size code.
- **Dead codes.** `not-a-number` and `not-an-integer` are declared in the enum but **never thrown** (number
  mismatch goes through `invalid-type`). They are dead today.

### 5.2 The unified, symmetric set

| Failure mode | Rule | Codes |
|---|---|---|
| wrong type | `<type>-expected` | `string-expected`, `number-expected`, `integer-expected`, `decimal-expected`, `bigint-expected`, `datetime-expected`, `boolean-expected`, `array-expected`, `object-expected` |
| value out of range (scalar magnitude / ordinal) | `<type>-out-of-range` | `number-out-of-range`, `integer-out-of-range`, `decimal-out-of-range`, `bigint-out-of-range`, `datetime-out-of-range` |
| container size (length / item count) | `<container>-too-short` / `-too-long` / `-length-invalid` | `string-too-short` / `-too-long` / `-length-invalid`; `array-too-short` / `-too-long` / `-length-invalid` |

This also draws a line the current codes blur: **magnitude bounds** (`-out-of-range`, for scalar values)
vs **size bounds** (`-too-short` / `-too-long`, for containers). Today both hide under `out-of-range`.

### 5.3 Several of these are emission *switches*, not just renames

For string / bool / array the wrong-type change is a spelling rename. For **number, integer, decimal,
bigint, datetime, object** the validator currently throws the generic `invalid-type`; under the unified set
it must throw the specific `<type>-expected`. That is a behavior improvement (more precise codes) and it
retires the dead `not-a-number` / `not-an-integer` in favor of codes that are actually emitted. Likewise
`invalid-range` and datetime/array `out-of-range` become the per-type `-out-of-range` / size codes.

### 5.4 `invalid-type` is overloaded — split it

`invalid-type` is used for two unrelated things: (a) a **value** is the wrong type (→ now `<type>-expected`),
and (b) a **schema definition** names a type that is not registered/valid (`any.ts:55`, `object.ts:122`).
Case (b) is a schema-def error, not a value error → name it **`type-unknown`**. After the split,
`invalid-type` is retired. (`unsupported-number-type` → `number-type-unsupported` stays its own thing:
a *recognized but unsupported* number subtype.)

### 5.5 Legitimately per-type (correctly asymmetric — left alone)

Not every code should be uniform. These describe capabilities only some types have, so asymmetry is
correct: `pattern-mismatch`, `email-invalid`, `url-invalid` (string sub-formats); `scale-invalid`,
`precision-invalid` (decimal / financial number); and the malformed-*literal* tokenization codes
`decimal-invalid`, `bigint-invalid`, `datetime-invalid`, `base64-invalid`, `escape-sequence-invalid`.
Note datetime ends up with **both** `datetime-expected` (wrong type) and `datetime-invalid` (malformed
literal) — that is the correct, fully-balanced outcome, replacing today's single overloaded
`invalid-datetime`.

### 5.6 Net effect on the code set

- **Merged away:** `expected-array` + `not-an-array` → `array-expected`.
- **Retired:** `invalid-type` (split into `<type>-expected` + `type-unknown`); dead `not-a-number` /
  `not-an-integer` (folded into the emitted `number-expected` / `integer-expected`).
- **Added (all emitted today under a borrowed name, so not dead):** `array-too-short`, `array-too-long`,
  `array-length-invalid`; per-type `<type>-expected` and `<type>-out-of-range` for the numeric/datetime
  types that currently use the generic forms.

---

## 6. Open dedup questions (need a decision during execution)

1. **`schema-not-found` vs `schema-missing` vs `schema-not-defined`** — three "schema absent" codes.
   Confirm each has a *distinct* trigger, or collapse. Proposal: `schema-not-defined` = referenced but not
   in defs (frozen); `schema-not-found` = named selector unresolved; `schema-missing` = no schema supplied
   where one is required. If any two coincide in practice, merge.
2. **`invalid-type` overload** — *resolved* in §5.4: split into `<type>-expected` (value) + `type-unknown`
   (unregistered type in a def), and retired. Listed here only so the resolution is traceable.
3. **`value-invalid`** — keep as the generic "value matched no constraint / NaN-style" code
   (`any.ts:68`, number NaN). Confirm no site emits it where a specific `<type>-*` code already applies.

---

## 7. Streaming lockstep (because 2 codes are frozen-by-reference)

`FINALIZATION.md` freezes `expecting-bracket`, `not-a-string`, `schema-not-defined` because streaming
conformance cases reference them. This rename touches the first two. The rename is only safe **because
streaming is unreleased**; it must be applied in one lockstep change:

- Update conformance fixtures `conformance/cases/recoverable-parse-error.json`
  (`expecting-bracket` → `array-expecting-closing-bracket`) and `multi-validation-error-one-item.json`
  (`not-a-string` → `string-expected`).
- Update `PROTOCOL.md` §7 examples/prose that name those codes.
- Update the `FINALIZATION.md` frozen-by-reference table to the new names, and re-affirm the freeze.
- `schema-not-defined` is unchanged (already compliant).

---

## 8. Execution plan (after this ADR is approved)

1. Rewrite the four enum files (`general` / `tokenization` / `parsing` / `validation` error codes) —
   **rename both the enum key and the string value** (e.g. `notAString = 'string-expected'`) so call sites
   are self-documenting too.
2. Update every throw/emit site (grep each old key) to the new `ErrorCodes.*` member.
3. Update all tests that assert on code strings.
4. Apply the streaming lockstep (§7).
5. Apply the §5 symmetry work: switch the number / integer / decimal / bigint / datetime / object
   validators off the generic `invalid-type` / `out-of-range` onto the precise `<type>-expected` /
   `<type>-out-of-range` codes; give arrays their own size codes (`array-too-short` / `-too-long` /
   `-length-invalid`); split `invalid-object`; remove the dead `not-a-number` / `not-an-integer`. Add
   tests for each. Do NOT add any code that no path emits.
6. Resolve the dedup questions (§6).
7. Update `FINALIZATION.md`: mark punch #1 context, and advance toward the punch #7 registry — this ADR is
   the human rationale; the machine-checked registry (`ERROR-CODES.md`) is generated/curated separately.
8. `CHANGELOG.md`: document the breaking `errorCode` rename (pre-1.0).
9. Full suite green + streaming conformance 27/27 under the new names, then re-freeze.

---

## 9. Decision

Adopt the `<subject>-<predicate>` grammar and the §4 registry, with type mismatch as `<type>-expected`.
Apply as a single pre-1.0 breaking change across all layers and the streaming lockstep. Symmetry additions
are gated on real emission (§5). Dedup questions (§6) are resolved during execution, not deferred.

**Not yet implemented — this ADR must be reviewed/approved first.**
