# ADR 0002 — Error-code grammar (`<predicate>-<subject>`) and a symmetric taxonomy

- **Status:** **Accepted and EXECUTED** 2026-08-21. Grammar, vocabulary and registry applied across source, tests, corpus, specs and the streaming lockstep. Codes re-freeze under the new names.
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

### Subject: the type, or the constraint?

The subject is not always the same *kind* of thing, and the rule for which is deliberate:

> **A TYPE problem names the type. A CONSTRAINT problem names the constraint.**

```
expected-integer        the value is not an integer          -> the TYPE is the fault
out-of-range-integer    200 does not fit `int8`              -> the TYPE is the fault
mismatched-max          200 violates a declared `max: 120`   -> the CONSTRAINT is the fault
mismatched-min-len      violates a declared `minLen`         -> the CONSTRAINT is the fault
```

This is what every schema-validation system does: **JSON Schema** reports the failed keyword
(`minimum`, `maxLength`, `minItems`), **XSD** reports the failed facet (`cvc-maxLength-valid`), and
**Bean Validation** reports the annotation (`@Min`, `@Size`). The RPC/transport world (gRPC
`OUT_OF_RANGE`, HTTP 416) uses one undirected code, but those are status codes, not validators.

Naming the constraint is also the more *useful* half of the pair: the type is always recoverable
from the error's `path` plus the schema, whereas the failed constraint is not recoverable from the
value at all. It tells the reader which line of their schema rejected the data.

> **Superseded.** Earlier drafts named bound failures after the value — `undersized-string`,
> `out-of-range-integer` for a declared `max`. Three problems, each fatal on its own: `undersized-`
> reads as a term of art rather than English once applied to primitives (an "undersized integer");
> a single `out-of-range-<type>` **lost the direction**, reporting the same code whether the value
> was below `min` or above `max`, while strings and arrays distinguished the two; and none of them
> said which constraint had failed. Natural English also differs per type — too short, too few, too
> small, too early — so no single value-describing word could ever have been uniform.

`out-of-range-integer` survives for exactly one thing: a value that does not fit the **type's own**
range (`int8` given 200, where no bound was declared). That is a type problem, and the fix — widen
the type — is different from the fix for a violated `max`.

---

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
| `out-of-range-` | a value does not fit the **type's own** range | `int8` given 200 |
| `mismatched-` | violated a constraint the **schema author declared** — named after the keyword they wrote | `min`, `max`, `minLen`, `maxLen`, `len`, `pattern`, `choices`, `multipleOf`, `precision`, `scale` |
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
| `invalid-array` | **removed** | never emitted by any site, at any point in this repo's history; it hid from the registry guard behind `mismatched-array-length` as a substring |
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
| `invalid-length` | `mismatched-string-length` | rename (array's reuse → `mismatched-array-length`, §5.2) |
| `invalid-min-length` | `undersized-string` | rename |
| `invalid-max-length` | `oversized-string` | rename |
| `invalid-pattern` | `mismatched-pattern` | rename |
| `unsupported-number-type` | `reserved-type` | **merge** — see §3 |
| `out-of-range` | `out-of-range-datetime` + array size (`undersized-array` / `oversized-array`) | **switch** — per-type; container size split from magnitude (§5.2) |
| `invalid-range` | `out-of-range-<type>` (number / integer / decimal / bigint) | rename — this is a **value** bound, not a spec error (§5.1) |
| `invalid-scale` | `mismatched-scale` | rename — a well-formed decimal violating a declared constraint, not a malformed one |
| `invalid-precision` | `mismatched-precision` | rename — as `invalid-scale` |
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
| container size (length / item count) | `undersized-<container>` / `oversized-<container>` / `mismatched-<container>-length` | `undersized-string` / `oversized-string` / `mismatched-string-length`; `undersized-array` / `oversized-array` / `mismatched-array-length` |

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
  `mismatched-array-length`; per-type `expected-<type>` and `out-of-range-<type>` for the numeric/datetime
  types that currently use the generic forms.

---

## 6. Dedup questions — all resolved

1. **`schema-not-found` vs `schema-missing` vs `schema-not-defined`** — *resolved 2026-08-21: three
   codes become **two**.* Read from the actual raise sites:

   | Code | Trigger | Verdict |
   |---|---|---|
   | `schema-not-defined` | `definitions.getV('$Foo')` — the **document** references `$Foo`, the header never defines it (`core/definitions.ts:177`, `streaming/reader.ts:109`) | → **`undefined-schema`** |
   | `schema-not-found` | `resolveSchema(defs, 'Person')` — the **API caller** names a schema that is not in defs (`facade/resolve-schema.ts:22`, `schema/load-processor.ts:94,235`, `schema/utils/schema-resolver.ts:15`) | → **merge into `undefined-schema`** |
   | `schema-missing` | the tokenizer sees `---` with **no schema name after it** (`parser/tokenizer/index.ts:1188`) | → **`missing-schema`**, kept distinct |

   The first two are **one condition** — *a schema was named and nothing is defined under that name*.
   They differ only in **who did the naming**: a `$ref` inside the document, or an argument passed by
   the host program. That is an *entry point*, not a fault, and §6.4 and X1 both establish that the same
   condition must not report different codes depending on how it was reached. Merged.

   `schema-missing` stays separate because it is genuinely a different fault and a different fix:
   **nothing was named at all**, versus *a name that resolves to nothing*. One is "you forgot to write
   the schema name"; the other is "the name you wrote does not exist."

   Corpus impact: `schema-not-found` and `schema-missing` have **0** corpus references;
   `schema-not-defined` has 5.

2. **`invalid-type` overload** — *resolved* in §5.4: split into `expected-<type>` (value) + `unknown-type`
   (unregistered type in a def), and retired. Listed here only so the resolution is traceable.

3. **`invalid-value`** — *resolved 2026-08-21: **split**, it is overloaded across two unrelated things.*
   Read from the raise sites:

   | Site | Condition | Becomes |
   |---|---|---|
   | `types/any.ts:70`, `any.ts:116` | an `anyOf` union where **no branch matched** | **`mismatched-value`** |
   | `types/number.ts:178`, `bigint.ts:119`, `decimal.ts:202` | the **`multipleOf`** constraint was violated | **`mismatched-multiple-of`** (NEW) |

   `multipleOf` is a *specific declared constraint*, exactly parallel to `pattern` and `choices`, and
   every other specific constraint already has its own code. Reporting it through a generic bucket left
   `invalid-value` meaning "a union failed" **and** "one named constraint failed", so a caller could not
   distinguish them. The ADR's claim that `invalid-value` also covered a NaN case is **not supported by
   the code** — there is no such site; all five are the two conditions above.

   `invalid-value` itself is retired. Corpus impact: **0** references.

   **Consequence for `invalid-choice` → `mismatched-choice`.** Under the §3 vocabulary `invalid-` means
   *malformed* and `mismatched-` means *failed to match a declared spec*. A value absent from `choices`
   is not malformed — it is a well-formed value that failed a declared spec, exactly like `pattern` and
   `multipleOf`. Leaving it as `invalid-choice` would be the same "one site missing a case" pattern this
   whole effort exists to remove, so it is renamed for consistency. This is the one rename in the batch
   driven purely by vocabulary consistency rather than by a defect; it costs 3 corpus references and is
   the easiest item in this ADR to revert if you disagree.

   **The constraint-failure family, after this:** `mismatched-pattern`, `mismatched-choice`,
   `mismatched-multiple-of`, `mismatched-value` — plus the bound predicates that have their own words
   (`out-of-range-*`, `oversized-*`, `undersized-*`).

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

## 8. Execution plan — EXECUTED 2026-08-21

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

### Execution record (2026-08-21)

All nine steps applied. Gates after the pass, all green:

| Gate | Result |
|---|---|
| io-js2 suite | 3,072 passed, 22 skipped |
| Round-trip fuzzer | 0 failures / 24,000 documents, 8 seeds |
| `.io` conformance corpus | 182 passed, 0 failed |
| Bootstrap CSV (regenerated) | 140 passed, 0 failed |
| X1 both-entry-points | 65 agree, 0 diverge |
| `tsc --noEmit` (src) | 0 errors |
| Spec examples | 167 pass (3 pre-existing failures, unrelated) |
| Build | exit 0 |

Notes on how it went:

- **The compiler drove the per-site work.** Rewriting the enums first turned every call site that
  needed a *decision* (rather than a rename) into a type error, which is how the 22 `invalid-type`
  sites were separated into "this TYPE NAME is not valid" (→ `unknown-type`) and "this VALUE is the
  wrong type" (→ `expected-<type>`) without guesswork.
- **Corpus expectations were regenerated from actual output, not edited by hand** — the corpus's own
  rule. A guard restricted the auto-update to the known old→new transitions, so genuine drift would
  still have failed rather than being silently rewritten. 17 cases updated.
- **Three sites now share one helper** (`unusableTypeCode`) rather than each deciding
  reserved-vs-unknown for itself. The `int64` symptom in §3 existed precisely because that decision
  was distributed; `RESERVED_TYPES` is now the single list.
- **`number-old.ts` deleted** — unreferenced dead code carrying stale error codes, and the source of
  the build's `duplicate-case` warning.
- **`invalid-number` and `invalid-section-name` were NOT added to the enums.** Both are in the §4
  registry, but no path emits either yet (the malformed-numeric gap and ISSUE-20's reader fix are
  separate behaviour changes). Declaring a code nothing throws is exactly what `not-a-number` and
  `not-an-integer` had become, so they land with their emitting sites.

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
