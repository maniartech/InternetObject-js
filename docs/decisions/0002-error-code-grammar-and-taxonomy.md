# ADR 0002 — Error-code grammar (`<predicate>-<subject>`) and a symmetric taxonomy

- **Status:** **Accepted** (grammar + vocabulary agreed 2026-08-21) — execution pending. One change (§6.4) already implemented.
- **Date:** 2026-08-13
- **Owner:** core/errors (affects every layer + streaming)
- **Related:** `src/errors/FINALIZATION.md` (punch list #1–#7) · streaming `PROTOCOL.md` §7 · streaming conformance corpus · ADR [0001](0001-defer-strict-validation-mode.md)

---

## TL;DR

Every public error code becomes **`<predicate>-<subject>`** (predicate first), kebab-case. The predicate
is drawn from a **closed vocabulary of 13** (§3), reused across subjects so the set is **symmetric** — the
same failure mode is named the same way for every type, and a missing code is visible as a hole in a
predicate's list rather than something you have to go looking for. **27 of the 49 codes keep their current
spelling exactly**, because 41 of them are already predicate-first.

This renames 22 codes, merges 3 duplicates (`expected-array` + `not-an-array`;
`additional-values-not-allowed` + `unknown-member`, already landed; `unsupported-number-type` +
the reserved-type family), splits 2 overloaded codes (`invalid-type`, `invalid-object`), retires
2 dead codes (`not-a-number`, `not-an-integer`), removes `unsupported-` from the vocabulary
altogether (§3 — it describes a library, not the format), adds 7 codes the symmetry matrix exposes as
missing, and — the substance of the balancing work (§5) — switches the numeric/datetime/object validators
off the generic `invalid-type` / `out-of-range` onto precise per-type codes. It is a **breaking change**
to the public
`errorCode` strings — done now because the package is pre-1.0 (0.2.1) and the streaming spec is still
Beta/unreleased, so the streaming "frozen-by-reference" subset can still be renamed cheaply (in lockstep
with the conformance corpus). After this lands, the codes re-freeze under the new names.

---

## 1. The two problems

1. **Grammar is inconsistent.** **41 of the 49 codes are predicate-first** (`invalid-email`,
   `not-a-string`, `expecting-bracket`, `unexpected-token`, `unknown-member`, …) while **8 are
   subject-first** (`schema-not-found`, `string-not-closed`, `value-required`,
   `variable-not-defined`, …). There is no single rule, and the majority convention was never
   written down. Worse, the predicate itself has synonyms: type mismatch alone is spelled
   `not-a-*`, `expected-*`, `expecting-*` and `invalid-type`, which is four ways to say one thing.
2. **The set is not symmetric.** The same concept is named different ways, and some types are missing
   codes their siblings have:
   - **Type mismatch named 3 ways:** `not-a-string` (validation), `expected-object` (general), generic
     `invalid-type` (general).
   - **A true duplicate:** `expected-array` (general) and `not-an-array` (validation) are the same error.
   - **Length/size bounds only exist for strings** (`invalid-length` / `invalid-min-length` /
     `invalid-max-length`); arrays have none; numbers use a different word (`out-of-range`).

---

## 2. The grammar rule

> **`<predicate>-<subject>`**, lowercase, hyphen-separated. Predicate first, subject last.

- **predicate** — the condition, drawn from the **closed vocabulary in §3**. Nothing outside that list.
- **subject** — what the error is *about*: a data type (`string`, `number`, `integer`, `bigint`,
  `decimal`, `boolean`, `array`, `object`, `datetime`, `base64`, `null`), or a construct (`schema`,
  `member`, `memberdef`, `definition`, `variable`, `key`, `value`, `type`, `token`, `annotation`,
  `pattern`, `scale`, `precision`, `choice`, `section-name`, `escape-sequence`).

Multi-word predicates and subjects are both allowed (`out-of-range-number`, `duplicate-section-name`);
the rule is only that the **predicate comes first**.

### Why predicate-first

Three independent reasons, all measured rather than assumed:

1. **It makes missing codes visible — the point of §5.** The predicate vocabulary is small and fixed
   (13); the subject set is large (~27). Grouping by predicate gives 13 checklists you can scan against
   one subject list:

   ```
   invalid-array     invalid-base64    invalid-bigint    invalid-datetime
   invalid-decimal   invalid-email     invalid-url       ...
                                       ^ where is invalid-number?
   ```

   Reading the other way round — 30 subject groups, each needing 13 predicates recalled from memory —
   hides the same hole. Two real gaps were found this way within minutes of adopting the rule:
   `invalid-number` (a malformed numeric literal such as `0o89` silently decodes as an open string, no
   error at all) and `expected-decimal` (the decimal typedef had to fall back to the generic
   `invalid-type`). Both had already been hit in practice without being recognised as *missing codes*.

2. **It matches the industry.** Every mainstream error-code namespace leads with the predicate.
   Node.js is the closest analogue — a namespaced code that also carries a subject — and it is
   predicate-first throughout: `ERR_INVALID_ARG_TYPE`, `ERR_MISSING_ARGS`, `ERR_UNKNOWN_ENCODING`,
   `ERR_OUT_OF_RANGE`. gRPC (`NOT_FOUND`, `INVALID_ARGUMENT`, `OUT_OF_RANGE`), Rust `io::ErrorKind`
   (`NotFound`, `InvalidData`, `UnexpectedEof`), Go (`ErrNotExist`) and ESLint (`no-unused-vars`) all
   do the same. Nothing mainstream is consistently subject-first.

3. **It is far less churn.** Of the 49 live codes, **41 are already predicate-first** and only 8 are
   subject-first. Subject-first would rewrite 41 codes to preserve 8. That matters directly: 98 corpus
   cases carry error codes today and ~430 will at the 2,400-case target, so every avoided rename is
   avoided rework — the "no repeat loop" constraint.

> **Superseded.** An earlier draft of this ADR specified `<subject>-<predicate>`, chosen for sort-order
> and grouping. Reviewed against the real 49-code set and the industry survey above, that was the
> weaker call: both orders group, but only predicate-first groups along the axis where the gaps are.

---

## 3. The approved predicate vocabulary (closed set)

**A code may use only these 13 predicates.** Adding a predicate is an ADR amendment, not an
implementation decision — that is what stops the vocabulary drifting back into synonyms.

| Predicate | Means | Absorbs |
|---|---|---|
| `expected-` | the required **type or token** is absent, or a different one was found | `not-a-*`, `expecting-*`, `expected-*`, and the type half of `invalid-type` |
| `invalid-` | present and of the right kind, but **malformed** | `invalid-email`, `invalid-datetime`, `invalid-base64`, `invalid-escape-sequence` |
| `missing-` | a mandatory thing is **absent** (presence, not type) | `value-required`, `schema-missing`, `definitions-required` |
| `undefined-` | a referenced **name** has no definition | `schema-not-defined`, `variable-not-defined`, `schema-not-found` |
| `unknown-` | not a member of an **allowed set** | `unknown-member`, `unsupported-annotation` |
| `reserved-` | a name the spec **reserves** for a future version | the `int64` / `uint64` / `float32` / `float64` family |
| `duplicate-` | appears more than once | `duplicate-member`, `duplicate-section-name` |
| `unexpected-` | appears where the grammar disallows it | `unexpected-token`, `unexpected-positional-member` |
| `unterminated-` | an opened construct is never closed | `string-not-closed` |
| `forbidden-` | present but explicitly disallowed | `null-not-allowed` |
| `oversized-` / `undersized-` | a **length or size** bound is violated | `invalid-max-length`, `invalid-min-length`, `invalid-length` |
| `out-of-range-` | a **numeric value** bound is violated | `out-of-range`, `invalid-range` |
| `mismatched-` | failed to match a declared spec | `invalid-pattern` |
| `empty-` | empty where content is required | `empty-memberdef` |

### The three distinctions that do the work

- **`expected-` vs `missing-`** — `expected-` is a **type** problem (wrong or absent type:
  `expected-string`); `missing-` is a **presence** problem (a mandatory value simply is not there:
  `missing-value`). Today's overlap between `invalid-type`, `not-a-string` and `value-required`
  dissolves once these are kept apart.
- **`expected-` vs `invalid-`** — `expected-decimal` means *this is not a decimal at all*;
  `invalid-decimal` means *it is a decimal literal and it is malformed*.
- **`undefined-` vs `unknown-` vs `reserved-`** — `undefined-schema`: a name was referenced and never
  defined. `unknown-member`: a name is present that the allowed set does not contain. `reserved-type`:
  the name exists in the spec but is not usable in this version. Three different fixes for the reader,
  so three codes.

### Why `unsupported-` is NOT in the vocabulary

`unsupported-` describes **a library**, not the format — and a code that means "this implementation
has not built it yet" cannot be normative, because the corpus asserts codes only. A port that *does*
implement the feature would behave correctly and **fail the suite**. The suite would punish the better
implementation.

Both existing `unsupported-*` codes turned out to be misclassified, neither of them an implementation
limit:

| Today | Becomes | Why |
|---|---|---|
| `unsupported-annotation` | `unknown-annotation` | the annotation set (`r`, `b`, `dt`, `d`, `t`) is **closed by the spec** — no implementation may add a sixth |
| `unsupported-number-type` | `reserved-type` | the spec says *"Reserved (not yet supported)"* — reserving a name is a **format rule**, and every conformant implementation of this version must reject it |

There is a live symptom of the confusion: `uint64`, `float32` and `float64` report
`unsupported-number-type`, while `int64` — reserved right beside them — reports `invalid-type`, the
same code as a plain typo like `nosuchtype`. **The implementation's type registry is deciding the
error code**, and `validation/numbers.io` documents that split as though it were intended. Fixed by
this ADR: the whole reserved family is `reserved-type`, and a genuine typo is `unknown-type`.

Should a library ever hit a true implementation limit — a spec feature it has not built — that is a
library-specific diagnostic **outside this registry**, and the corpus marks such a case skipped rather
than expecting an error.

---

## 4. Full old → new registry (all 49 codes)

Legend: **keep** = already compliant · **rename** = grammar flip · **merge** = folded into another code ·
**switch** = the emitting path changes, not just the name · **NEW** = added for symmetry (only if a real
path emits it — see §5).

### General
| Old | New | Action |
|---|---|---|
| `invalid-type` | **split** → `expected-<type>` (value mismatch) / `unknown-type` (unregistered type in a def) | retired — see §5.4 |
| `invalid-value` | `invalid-value` | keep (generic "matched no constraint" / NaN) |
| `value-required` | `missing-value` | rename |
| `null-not-allowed` | `forbidden-null` | rename |
| `definitions-required` | `missing-definitions` | rename |
| `expected-object` | `expected-object` | keep |
| `expected-array` | `expected-array` | keep — **merge** target for `not-an-array` |

### Tokenization
| Old | New | Action |
|---|---|---|
| `string-not-closed` | `unterminated-string` | rename |
| `invalid-escape-sequence` | `invalid-escape-sequence` | keep |
| `unsupported-annotation` | `unknown-annotation` | rename — see §3, closed set |
| `invalid-base64` | `invalid-base64` | keep |
| `invalid-datetime` | `invalid-datetime` | keep |
| `invalid-bigint` | `invalid-bigint` | keep |
| `invalid-decimal` | `invalid-decimal` | keep |
| — | **`invalid-number`** | **NEW** — a malformed numeric literal (`0o89`, `0xGH`, `1.2.3`) currently decodes as an open string with **no error at all**; the spec already flags this as a known gap |

### Parsing
| Old | New | Action |
|---|---|---|
| `unexpected-token` | `unexpected-token` | keep |
| `expecting-bracket` | `expected-closing-bracket` | rename **(FROZEN — lockstep, §7)** |
| `unexpected-positional-member` | `unexpected-positional-member` | keep |
| `invalid-key` | `invalid-key` | keep |
| `invalid-schema` | `invalid-schema` | keep |
| `schema-not-found` | `undefined-schema` | **merge** — see §6.1 |
| `schema-missing` | `missing-schema` | rename (see §6.1 dedup question) |
| `empty-memberdef` | `empty-memberdef` | keep |
| `invalid-definition` | `invalid-definition` | keep |
| `invalid-memberdef` | `invalid-memberdef` | keep |
| `invalid-schema-name` | `invalid-schema-name` | keep |
| `variable-not-defined` | `undefined-variable` | rename |
| — | **`invalid-section-name`** | **NEW** — a section name outside the bare-name set; see io-test-cases ISSUE-20 |

### Validation
| Old | New | Action |
|---|---|---|
| `invalid-object` | **split** → `expected-object` (wrong type) / `invalid-object` (structural) | see §5.1 |
| `unknown-member` | `unknown-member` | keep — the **merge** target, see §6.4 |
| `duplicate-member` | `duplicate-member` | keep |
| `additional-values-not-allowed` | `unknown-member` | **merge — ALREADY DONE**, see §6.4 |
| `invalid-array` | `invalid-array` | keep |
| `not-an-array` | `expected-array` | **merge** (with `expected-array`) |
| `not-a-string` | `expected-string` | rename **(FROZEN — lockstep, §7)** |
| `not-a-number` | `expected-number` | **switch** — today via `invalid-type`; old code is dead (§5.3) |
| `not-an-integer` | `expected-integer` | **switch** — today via `invalid-type`; old code is dead (§5.3) |
| `not-a-bool` | `expected-boolean` | rename |
| — | **`expected-decimal`** | **NEW** — today falls back to generic `invalid-type` |
| — | **`expected-bigint`** | **NEW** — today falls back to generic `invalid-type` |
| — | **`expected-datetime`** | **NEW** — today conflated with `invalid-datetime` |
| — | **`unknown-type`** | **NEW** — a type name that does not exist (a typo), distinct from `reserved-type` |
| — | **`reserved-type`** | **NEW** — a name the spec reserves (`int64`, `uint64`, `float32`, `float64`) |
| `invalid-email` | `invalid-email` | keep |
| `invalid-url` | `invalid-url` | keep |
| `invalid-length` | `invalid-string-length` | rename (array's reuse → `invalid-array-length`, §5.2) |
| `invalid-min-length` | `undersized-string` | rename |
| `invalid-max-length` | `oversized-string` | rename |
| `invalid-pattern` | `mismatched-pattern` | rename |
| `unsupported-number-type` | `reserved-type` | **merge** — see §3 |
| `out-of-range` | `out-of-range-datetime` + array size (`undersized-array` / `oversized-array`) | **switch** — per-type; container size split from magnitude (§5.2) |
| `invalid-range` | `out-of-range-<type>` (number / integer / decimal / bigint) | rename — this is a **value** bound, not a spec error (§5.1) |
| `invalid-scale` | `invalid-scale` | keep |
| `invalid-precision` | `invalid-precision` | keep |
| `invalid-choice` | `invalid-choice` | keep |
| `schema-not-defined` | `undefined-schema` | rename **(FROZEN — lockstep, §7)** |

**Net effect of predicate-first:** 27 of 49 codes keep their current spelling exactly. Under the
superseded subject-first draft, only 8 did.

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
| wrong type | `expected-<type>` | `expected-string`, `expected-number`, `expected-integer`, `expected-decimal`, `expected-bigint`, `expected-datetime`, `expected-boolean`, `expected-array`, `expected-object` |
| value out of range (scalar magnitude / ordinal) | `out-of-range-<type>` | `out-of-range-number`, `out-of-range-integer`, `out-of-range-decimal`, `out-of-range-bigint`, `out-of-range-datetime` |
| container size (length / item count) | `undersized-<container>` / `oversized-<container>` / `invalid-<container>-length` | `undersized-string` / `oversized-string` / `invalid-string-length`; `undersized-array` / `oversized-array` / `invalid-array-length` |

This also draws a line the current codes blur: **magnitude bounds** (`out-of-range-*`, for scalar values)
vs **size bounds** (`undersized-*` / `oversized-*`, for containers). Today both hide under `out-of-range`.

### 5.3 Several of these are emission *switches*, not just renames

For string / bool / array the wrong-type change is a spelling rename. For **number, integer, decimal,
bigint, datetime, object** the validator currently throws the generic `invalid-type`; under the unified set
it must throw the specific `expected-<type>`. That is a behavior improvement (more precise codes) and it
retires the dead `not-a-number` / `not-an-integer` in favor of codes that are actually emitted. Likewise
`invalid-range` and datetime/array `out-of-range` become the per-type `out-of-range-*` / size codes.

### 5.4 `invalid-type` is overloaded — split it

`invalid-type` is used for two unrelated things: (a) a **value** is the wrong type (→ now `expected-<type>`),
and (b) a **schema definition** names a type that is not registered/valid (`any.ts:55`, `object.ts:122`).
Case (b) is a schema-def error, not a value error → name it **`unknown-type`**. After the split,
`invalid-type` is retired. (`unsupported-number-type` does NOT survive: the reserved `int64` / `uint64` / `float32` / `float64`
family becomes **`reserved-type`** -- see §3 on why `unsupported-` is not a permitted predicate.)

### 5.5 Legitimately per-type (correctly asymmetric — left alone)

Not every code should be uniform. These describe capabilities only some types have, so asymmetry is
correct: `mismatched-pattern`, `invalid-email`, `invalid-url` (string sub-formats); `invalid-scale`,
`invalid-precision` (decimal / financial number); and the malformed-*literal* tokenization codes
`invalid-decimal`, `invalid-bigint`, `invalid-datetime`, `invalid-base64`, `invalid-escape-sequence`.
Note datetime ends up with **both** `expected-datetime` (wrong type) and `invalid-datetime` (malformed
literal) — that is the correct, fully-balanced outcome, replacing today's single overloaded
`invalid-datetime`.

### 5.6 Net effect on the code set

- **Merged away:** `expected-array` + `not-an-array` -> `expected-array`.
- **Retired:** `invalid-type` (split into `expected-<type>` + `unknown-type`); dead `not-a-number` /
  `not-an-integer` (folded into the emitted `expected-number` / `expected-integer`).
- **Added (all emitted today under a borrowed name, so not dead):** `undersized-array`, `oversized-array`,
  `invalid-array-length`; per-type `expected-<type>` and `out-of-range-<type>` for the numeric/datetime
  types that currently use the generic forms.

---

## 6. Open dedup questions (need a decision during execution)

1. **`schema-not-found` vs `schema-missing` vs `schema-not-defined`** — three "schema absent" codes.
   Confirm each has a *distinct* trigger, or collapse. Proposal: `schema-not-defined` = referenced but not
   in defs (frozen); `schema-not-found` = named selector unresolved; `schema-missing` = no schema supplied
   where one is required. If any two coincide in practice, merge.
2. **`invalid-type` overload** — *resolved* in §5.4: split into `expected-<type>` (value) + `unknown-type`
   (unregistered type in a def), and retired. Listed here only so the resolution is traceable.
3. **`value-invalid`** — keep as the generic "value matched no constraint / NaN-style" code
   (`any.ts:68`, number NaN). Confirm no site emits it where a specific `<type>-*` code already applies.
4. **`additional-values-not-allowed` vs `unknown-member`** — *resolved 2026-08-21: **merge** into
   `member-unknown`.* Both mean one thing: **a closed schema was given a member it does not declare.**
   They differed only by NOTATION — `additional-values-not-allowed` fires on positional surplus
   (`Alice, 30, extra`), `unknown-member` on named surplus (`a: x, b: y`) — and a native caller can
   never produce the positional form at all, so the same fault reported two different codes depending
   on how the data arrived. That is precisely what
   [validation-model.md §Entry points](../../../io-specs/conformance/validation-model.md) forbids.

   A memberdef option the typedef does not declare (`{string, bogusOption: 5}`) is the SAME rule, not
   a third case: a memberdef is validated against the typedef's own member schema, so it is a closed
   schema receiving an undeclared member one level up. It keeps `member-unknown` too — no
   `unknown-option` code, because the format has no such distinction to encode.

   The messages stay distinct ("3 values given, the schema declares 2" / "the string typedef declares
   no option `bogusOption`"); only the code is shared. Codes are stable, messages may vary (§2).

   **Net: one code retired, none added.** Found by X1 (`npm run corpus:both`), which had to carve
   positional surplus out as "no native counterpart" to reach 64/64; it is now a genuinely compared
   case and X1 stands at **65/65**.

   **Landed 2026-08-21, ahead of this ADR's execution pass**, because it was blocking X1 from being
   a real guarantee. What landed: `additionalValuesNotAllowed` removed from the registry; the
   positional site raises `unknown-member`; and both membership sites in `object-processor.ts` now
   raise a **`ValidationError`**, not a `SyntaxError` — the same code was surfacing under two
   *categories* as well as two codes, which also closes io-test-cases FINDINGS #23. The text is
   well-formed in these cases; it is the data that is at fault.

   Updated with it: corpus `validation/objects.io`, `regression/decisions-d1-d4.io`,
   `streaming/errors.io` (case renamed `extra_value_validation`), `validation/README.md`,
   CONFORMANCE.md, FINDINGS.md; io-specs `error-model.md` (which had documented `unknown-member`
   ONLY as the memberdef-option fault and never as the data fault), `key-emission.md`,
   `dynamic-schema.md`. One test moved from asserting a message regex to asserting the code.

   **Still outstanding for the execution pass:** the `unknown-member` → `member-unknown` rename.

---

## 7. Streaming lockstep (because 2 codes are frozen-by-reference)

`FINALIZATION.md` freezes `expecting-bracket`, `not-a-string`, `schema-not-defined` because streaming
conformance cases reference them. This rename touches the first two. The rename is only safe **because
streaming is unreleased**; it must be applied in one lockstep change:

- Update conformance fixtures `conformance/cases/recoverable-parse-error.json`
  (`expecting-bracket` -> `expected-closing-bracket`) and `multi-validation-error-one-item.json`
  (`not-a-string` -> `expected-string`).
- Update `PROTOCOL.md` §7 examples/prose that name those codes.
- Update the `FINALIZATION.md` frozen-by-reference table to the new names, and re-affirm the freeze.
- `schema-not-defined` -> **`undefined-schema`**: under predicate-first this one DOES change, so all
  three frozen codes are in the lockstep, not two.

---

## 8. Execution plan (after this ADR is approved)

1. Rewrite the four enum files (`general` / `tokenization` / `parsing` / `validation` error codes) —
   **rename both the enum key and the string value** (e.g. `notAString = 'string-expected'`) so call sites
   are self-documenting too.
2. Update every throw/emit site (grep each old key) to the new `ErrorCodes.*` member.
3. Update all tests that assert on code strings.
4. Apply the streaming lockstep (§7).
5. Apply the §5 symmetry work: switch the number / integer / decimal / bigint / datetime / object
   validators off the generic `invalid-type` / `out-of-range` onto the precise `expected-<type>` /
   `out-of-range-<type>` codes; give arrays their own size codes (`undersized-array` / `oversized-array` /
   `-length-invalid`); split `invalid-object`; remove the dead `not-a-number` / `not-an-integer`. Add
   tests for each. Do NOT add any code that no path emits.
6. Resolve the dedup questions (§6).
7. Update `FINALIZATION.md`: mark punch #1 context, and advance toward the punch #7 registry — this ADR is
   the human rationale; the machine-checked registry (`ERROR-CODES.md`) is generated/curated separately.
8. `CHANGELOG.md`: document the breaking `errorCode` rename (pre-1.0).
9. Full suite green + streaming conformance 27/27 under the new names, then re-freeze.

---

## 9. Decision

Adopt the **`<predicate>-<subject>`** grammar, the closed 13-predicate vocabulary in §3, and the §4
registry — with type mismatch as `expected-<type>`. Multi-word predicates and subjects are permitted;
the only rule is that the predicate comes first. `unsupported-` is **not** a permitted predicate: a code
that means "this library has not built it yet" cannot be normative when the corpus asserts codes only.

Apply as a single pre-1.0 breaking change across all layers and the streaming lockstep. Symmetry additions
are gated on real emission (§5). Dedup questions (§6) are resolved during execution, not deferred.

**Agreed with Aamir 2026-08-21** — grammar direction, the closed vocabulary, multi-word predicates, and
the `unsupported-` removal. §6.4 (the `additional-values-not-allowed` merge) is already implemented; the
rest awaits the execution pass.

**Sequencing:** this must land **before** the corpus grows from 546 to ~2,400 cases. 98 corpus cases
carry error codes today and roughly 430 will at the target, so executing afterwards would multiply the
rework more than fourfold — the "no repeat loop" constraint.
