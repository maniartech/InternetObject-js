# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased — BREAKING: error-code rename (ADR 0002)

Every public `errorCode` string now follows `<predicate>-<subject>` — predicate first, drawn from a
closed 13-word vocabulary. **This is a breaking change to the `errorCode` strings**, taken pre-1.0
and in lockstep with the streaming conformance corpus, after which the codes re-freeze.

27 of the 49 codes keep their exact spelling (41 were already predicate-first). The rest:

| Old | New |
|---|---|
| `value-required` | `missing-value` |
| `null-not-allowed` | `forbidden-null` |
| `definitions-required` | `missing-definitions` |
| `string-not-closed` | `unterminated-string` |
| `unsupported-annotation` | `unknown-annotation` |
| `expecting-bracket` | `expected-closing-bracket` |
| `schema-missing` | `missing-schema` |
| `schema-not-defined`, `schema-not-found` | `undefined-schema` (merged) |
| `variable-not-defined` | `undefined-variable` |
| `not-a-string` | `expected-string` |
| `not-a-bool` | `expected-boolean` |
| `not-an-array`, `expected-array` | `expected-array` (merged) |
| `invalid-min-length` / `invalid-max-length` | `undersized-string` / `oversized-string` |
| `invalid-length` | `invalid-string-length` / `invalid-array-length` |
| `invalid-pattern` | `mismatched-pattern` |
| `invalid-choice` | `mismatched-choice` |
| `unsupported-number-type` | `reserved-type` |
| `additional-values-not-allowed` | `unknown-member` (merged) |
| `invalid-type` | split: `expected-<type>` (wrong value) / `unknown-type` (no such type) |
| `invalid-value` | split: `mismatched-value` (anyOf) / `mismatched-multiple-of` |
| `invalid-range` | `out-of-range-<type>` |
| `out-of-range` | `out-of-range-datetime` / `undersized-array` / `oversized-array` |
| `not-a-number`, `not-an-integer` | removed — declared but never thrown |

Behaviour changes that came with it:

- **Every numeric and temporal type now reports its own code** instead of the generic
  `invalid-type` / `invalid-range`. `expected-decimal`, `expected-bigint`, `expected-datetime`,
  `out-of-range-decimal` and friends did not previously exist.
- **`reserved-type` distinguishes a reserved name from a typo.** `int64` previously reported the
  same code as `nosuchtype`, purely because the typedef registry happens not to register it —
  an implementation detail was deciding the error code. `int64`, `uint64`, `float32` and `float64`
  now all report `reserved-type`; a name that simply does not exist reports `unknown-type`.
- **`multipleOf` violations have their own code.** They previously shared `invalid-value` with
  "an anyOf union matched nothing", so a caller could not tell the two apart.
- **`unsupported-` is gone from the vocabulary.** It described the library rather than the format,
  and a code meaning "not built yet" cannot be normative for a conformance corpus.
- `number-old.ts` (unreferenced dead code, and the source of the build's `duplicate-case` warning)
  was deleted.

See `docs/decisions/0002-error-code-grammar-and-taxonomy.md` for the full registry and rationale.

## Unreleased — review findings (ADR 0003)

Four codes added and one renamed, from a five-reviewer read of the specification. Each addition
lands **with an emitting site**, per ADR 0002 §5.

| Code | Why |
| ---- | --- |
| `invalid-number` | **Added.** A malformed numeric literal used to decode as an open string, which is a different *value*, not a missing diagnostic: `0xGH` became the string `"0xGH"`, and `1e` became the number `1`. Deferred by ADR 0002 §8 until a site emitted it; this is that site. |
| `expected-date`, `expected-time` | **Added.** One class serves all three temporal types and all three reported `expected-datetime`, so a `date` member given a string named a type the schema never mentioned. |
| `expected-value` | **Renamed from the syntax sense of `missing-value`.** One code cannot sit in two error classes: streaming derives the wire category from the class, so two conformant readers reported different categories for the same input. `missing-value` keeps the presence sense. |

`expected-binary` is **not** added. `binary` is a base type in the specification but is not
registered as a schema type here — `{ b: binary }` reports `unknown-type` — so no site could
emit it. It lands with the type.

### Fixed

- **A decimal's internal marker leaked into token text.** The tokenizer appended `f` to mark a
  decimal, but token text is not private: a decimal followed by more open-string characters merges
  with them, and the marker left as data. `123.45mm` decoded as `"123.45fm"` — an `f` the input
  never contained. The conformance corpus had recorded this as correct output.
- **A leading comma in an array was silently dropped.** `[,a]` loaded as `["a"]`, discarding a
  written position, while `[a,,c]` and `[ , ]` were correctly rejected: the look-ahead guarding
  those cannot see backwards.
- **An unterminated annotated string closed itself at end of input.** `r'Unclosed` yielded the
  string `"Unclosed"` with no error, while the regular string `"Unclosed` correctly reported
  `unterminated-string`. It affected every annotation (`r`, `b`, `dt`, `d`, `t`). The same bug
  truncated the *token text* of a well-formed literal that ended the input.
- **Eleven raise sites disagreed with the catalogue about their error class.** `undefined-schema`
  was catalogued as validation but raised as a base error at four non-streaming sites; the
  streaming site was correct, so the conformance case passed while the ordinary path diverged.
  `unknown-type` was raised as four different classes across seven sites. A code now has exactly
  one class, and the catalogue is the authority.

### Known gaps

Three malformed numeric forms are still read as open strings, because each is shape-identical to
ordinary text (`12mm` is a measurement): `0b 1010`, `1.23ee4`, `123.45mm`. Listed under
*Implementation status* in the specification rather than omitted.

### Numbers: two rules, and three codes made symmetric

The numeric rules were reduced to two, and the literal error codes were made symmetric with the
type-mismatch codes. Both are breaking for anyone branching on the old codes.

**Rule 1 — all or nothing.** A run is a number only if the *entire* run is a valid number
literal; otherwise the whole run is an open string. This is what stops a partial parse inventing a
value: `1e` is the string `"1e"`, never the number `1`.

**Rule 2 — a marker is a claim.** `0x`, `0o`, `0b`, and the `m`/`n` suffixes can only mean
*number*. A run carrying one that is not a valid literal of that type is an error.

Consequently these are **no longer errors** — they carry no marker, so they claim nothing:
`1.2.3`, `10.0.0.1`, `2024.01.15` (version strings, addresses, dotted dates), `1e`, `1.23ee4`.
An interim rule had rejected them, while accepting `1.2.3-beta`.

And these **are** errors, which they were not before: any word beginning with a base prefix, such as
`0xygen` or `0oz`. Quoting is the escape hatch, and a writer emits such strings quoted.

| Code | Change |
| ---- | ------ |
| `invalid-base64` | **renamed `invalid-binary`.** The subject is the type the marker claims; `base64` is an encoding, and this was the one literal code whose subject was not a type |
| `invalid-date` | **added.** `d'2024-13-45'` reported `invalid-datetime`, naming a type the author had not written |
| `invalid-time` | **added.** Likewise for `t'…'` |

That completes a grid the naming scheme exists to make readable — `expected-<type>` beside
`invalid-<type>`, one row per type, so a missing cell is visible on sight. **56 codes.**

See `docs/decisions/0003-review-findings-and-vocabulary-additions.md`.

## [0.3.0] - 2026-08-17

Behavioural release. Several fixes change output that previously did not round-trip, so this is a
MINOR bump under 0.x semantics rather than a patch.

### Breaking

- An unnamed data section is now named **`data`**, not `unnamed`, matching the specification. The
  section name is the key a section is projected under, so JSON output changes for any document
  with more than one section.
- A duplicate section name now reports **`duplicate-section-name`** instead of `unexpected-token`.
  Consumers filtering on the old code must be updated. The old code described a lexical fault; a
  repeated section name is structural.
- A numeric member with a radix `format` is now written with its base prefix and type suffix
  (`0xffn`, not `ff`). The previous output was rejected by the member's own schema.
- A bigint with the explicit `format: decimal` keeps its `n` suffix; it previously lost it and read
  back as a plain number.
- **`toObject()` and `toJSON()` are now two different projections** (OPEN-DECISIONS D3). They were
  the same method, and it converted a value only at the TOP level: `doc.toJSON().when` came back an
  ISO string while `doc.toJSON().events[0].when` came back a live `Date` — the same type, spelled
  according to how deep it sat. Binary reached `Buffer.toJSON()` and emitted
  `{ type: 'Buffer', data: [...] }`, Node's internal bookkeeping rather than anything another
  language could read, and `JSON.stringify(doc)` threw outright on a document holding a bigint.

  - `toObject()` — plain structure, **live** values: `Date`, `Decimal`, bytes and `bigint` survive.
  - `toJSON()` — the **JSON projection**, applied recursively per io-specs `json-compatibility.md`:
    datetimes as ISO-8601 strings, decimals and bigints as strings, binary as base64.

  Code reading typed values from `toJSON()` should now call `toObject()`. Both methods are
  available on every core type; `Decimal` gained `toObject()` and `SectionCollection` gained both.

### Fixed

- **Data loss:** a second unnamed section silently overwrote the first. The duplicate-name rename
  was applied only to sections carrying a written name, so unnamed sections collided and all but
  the last were dropped.
- **Round-trip:** binary values are written as `b"<base64>"` rather than an object of byte indices;
  `Inf` / `-Inf` / `NaN` use the IO spellings instead of the JavaScript ones; a string containing
  `---` is quoted so it can no longer tear the document in two.
- A signed radix literal such as `-0xffn` threw `Cannot convert 0x-ff to a BigInt` — the sign was
  assembled inside the digits instead of before the base prefix.
- `emitKeys: 'all'` now applies at every depth, including objects reached through an array; it
  previously named only record-level members, leaving header-less output non-self-describing.
- A temporal value written without a schema keeps its kind (`d"…"` / `t"…"` / `dt"…"`) instead of
  being flattened to `dt"…"`, which also leaked the internal 1900-01-01 time sentinel into output.
- Errors raised for a duplicate section name now carry a position, so consumers can locate them.
- **`datetime` silently dropped the seconds component** — `dt"…T14:30:45Z"` was read as
  `…14:30:00`. The parser's regex named the capture group `sec` while the code read `second`, so
  every timestamp with a non-zero seconds field lost it.
- A quoted member name is no longer written with a `?` / `*` suffix (`"a,b"?: number`), which is not
  valid syntax — the writer emitted a header its own reader rejected. Such members now use the long
  form, `"a,b": { number, optional: T, "null": T }`.
- The `array` type accepts the keyed `optional:` and `null:` options; it was the only type that did
  not declare them.
- `{ object, schema: $address }` — a schema *reference* in the long memberdef form — no longer
  fails with `invalid-object`.
- An inferred definition is emitted after everything it references. A forward reference failed with
  a misleading `unexpected-positional-member` pointing at the target's own line.
- An inferred `[$item]` whose item schema turned out empty left a dangling reference and a
  `schema-not-defined`; the reference is now dropped, leaving a plain `array`.
- A `Decimal` inside a formatted array printed as `{ coefficient: …n, exponent: … }` — its internals.
- A root array of non-records (`[1, 2, 3]`, `[[1, 2]]`) wrote **error objects into the document**.
  It is now bound to the positional member `"0"`, which is what IO's own promotion rule does with
  a non-object root value: `---` then `[1, 2, 3]` has always read as `{ "0": [1, 2, 3] }`
  (OPEN-DECISIONS D2).
- **Data loss:** a quoted string lost its backslashes. `toRegularString` escaped `\n`, `\r`, `\t`
  and the encloser but never the backslash itself, so a literal `\` was written raw and the reader
  consumed it as the start of an escape sequence — `"9\U"` read back as `"9U"`. It surfaced only
  when a string needed quoting for some OTHER reason (looking like a number, holding a comma),
  because the open-string path escaped it correctly all along.
- An empty record `{}` wrote as a bare `---` and read back as `null`.
- A bare key containing `---` split the document in two; such keys are now quoted.
- Serialization is idempotent: a constraint left at its type's declared default is no longer
  re-emitted, so the text stopped growing on each round-trip.

### Added

- `format: scientific` for `bigint` (`1200000n` → `12e5n`), consistent with `number`.
- `stringifyHeader()` — library-owned separation of header and data.
- Wildcard/map and multi-section schema inference.

### Documentation

- `format` is **write-only** and never constrains input; MemberDef options are either constraints
  or presentation. Specified in io-specs, along with a new Serialization part.

## [1.0.0-beta.1] - 2025-12-01

### Added

- Complete Internet Object parser and serializer
- Schema-first validation with comprehensive type system
- Support for all core types: `string`, `number`, `int`, `bool`, `decimal`, `bigint`, `datetime`
- Collection support with error recovery
- `load()` and `loadObject()` APIs for validating JavaScript objects against schemas
- `loadCollection()` for batch validation with error collection
- `stringify()` for serializing Internet Object documents
- `parseDefinitions()` for working with schemas and variables
- Nested object and array support
- Variable resolution (`@varName` syntax)
- Schema references (`$schemaName` syntax)
- Optional fields with `?` modifier
- Nullable fields with `*` modifier
- Comprehensive error messages with position information

### Technical

- ESM and CommonJS dual package support
- TypeScript definitions included
- Tree-shakeable exports
- Zero runtime dependencies
- Node.js 18+ support

## [Unreleased]

### Planned

- Additional type constraints
- Custom type definitions
- Performance optimizations
