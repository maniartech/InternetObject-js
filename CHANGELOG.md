# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

Everything below lands together and has not been published. Four `## Unreleased` sections had
stacked up above a `[0.3.0]` npm never received; they are one section now, newest first.

### The public API (ADR 0005) — BREAKING

The format did not change. The same text parses to the same values with the same errors at the same
positions, checked against the conformance corpus and against a snapshot of all 1,396 corpus parses
taken before the first commit and re-verified after every one since. What changed is the interface.

**See [MIGRATION.md](./MIGRATION.md) for the upgrade path.**

#### Breaking

- **`parse()` returns plain JavaScript.** `parseDocument()` returns the document. `parse` is exactly
  `parseDocument(...).toObject()`, and a test pins that equality.
- **`IOObject.set()` validates**, on every path — the proxy, the streaming writer, and code holding
  a node directly. A value a parse would reject is rejected here, with the code a parse would have
  used. `setRaw()` is the internal write for code that has already validated.
- **Inserting into a collection adopts the section's schema.** A plain object becomes a record; a
  record missing a required member is refused. Adoption can replace the value, so read the record
  back out of the collection rather than keeping the reference you pushed.
- **Attaching a schema validates what is already there.** Atomic without a sink — it throws and
  nothing is attached. With a sink it reports every mismatch and still changes nothing.
- **Serializing a document that holds a failed record throws** `forbidden-error-node`.
  `{ skipErrors: true }` writes the records that validated. `toObject()` and `toJSON()` still embed
  error nodes, unchanged.
- **`ParserOptions` is deleted** — all ten fields, all with zero read sites. **`strict` is deleted**
  from the facade options; passing a sink is the same question. `LoadDocumentOptions.strict` and the
  streaming reader's strict framing are different options and are untouched.
- **An interpolated `${…}` in a template tag is written as a value**, never spliced in as source.
  `${undefined}` used to contribute an empty string and vanish; it is now `N`.

#### Added

- **Signature symmetry (§2.5).** Every entry point now takes `(input, defs?, sink?, options?)`:
  `load`, `loadObject`, `loadCollection`, `validate`, `validateObject`, `validateCollection`. The
  old shapes still work — a sink is an array or a function, so an options object in slot three
  (`load`) and a `Definitions` in slot three (`validate`) are unambiguous — and
  `IOCommonOptions.errorCollector` is deprecated rather than removed, because `loadInferred` has no
  sink slot and inference is outside the contract (ADR 0004).
- `parseDefinitions(text, defs?, sink?)` takes a sink, so `io.defs.with(defs, sink)` has one to
  hand over. `io.doc.with` and `io.object.with` already did; **`io.schema.with` deliberately does
  not** — schema compilation fails fast, so a sink could not change the outcome.
- `parseDocument(text, defs?, sink?)` — the proxied document. Sections, collections and records are
  reachable by name and by index: `doc.sections.employees[0].name`, `doc.data[0].age = 31`.
- `doc.data` — the section a document gets when it names none.
- `io.section()`, `io.sections()`, `io.header()`, `io.isError()`, `io.node()` — the reads that
  cannot be shadowed by data named like the API.
- The rest of the array surface on `IOCollection`: `join`, `at`, `includes`, `indexOf`,
  `lastIndexOf`, `slice`, `concat`, `flatMap`, `sort`, `reverse`, `toSorted`, `toReversed`.
- `getAt(index)` on `IOSectionCollection` and `IODefinitions`, so every container spells positional
  access the same way. `getTokenNode()` is `getV()` under a readable name.
- The error sink accepts a **function** as well as an array, in the same third positional slot.
- `npm run check:idioms` — the completeness gate for this change.
- `npm run behaviour:capture` / `behaviour:verify` — replays every corpus input and fingerprints the
  value model, every error code and position, and their order.

#### Fixed

- **Template interpolation corrupted ordinary data.** `` io.object`qty: ${'1,000'}` `` gave
  `{qty: 1}`; `'Smith, John'` split into two members; `'12:30'` and a URL returned `null`. Six of
  seven ordinary values were corrupted, and only `'Alice'` survived — which is why every example
  anyone wrote passed.
- **The error sink and `doc.getErrors()` reported different sets**, in both directions. A syntax
  error reached `getErrors()` but not the sink, so `sink.length` could read `0` while the data held
  an error node.
- **`skipErrors` was ignored on the serialization path.** It looked for `{ __error: true }` while
  the parse route embeds an `ErrorNode`, so it matched nothing on the path people take.
- **`load(data, defs, errors)` reported nothing.** The array landed in the options slot, no
  `schemaName` was found on it, and the load carried on reporting into the void — the same
  positional trap that made `parse(text, errorArray)` collect nothing.
- **`io.object.with(defs)` returned a different type from `` io.object`…` ``** — a plain object
  against an `IOObject`. Same tag, two contracts, decided by whether definitions were involved.
- **Internals leaked through key walks.** `{ ...collection }` and `structuredClone(doc)` handed back
  `_items` / `_header` instead of the data.

### Repository cleanup

Housekeeping ahead of the merge to `master`. **No library behavior changes.**

### Fixed

- `npm run perf` and `npm run perf:decimal` pointed at `performance.ts` / `performance.decimal.ts`
  at the repo root; the files are under `tests/performance/`. Both scripts had been broken and are
  now correct.

### Changed

- `tests/qualtrics-test.test.ts` → `tests/schema/utils/infer-dynamic-keyed-objects.test.ts`, and
  the vendor name dropped throughout. The test is about inferring a schema for an object whose
  **keys are data**; the survey-export shape it uses is synthetic.
- `tests/header-format-demo.test.ts` → `tests/header-definitions-format.test.ts`. A real test that
  was wearing the word "demo".

### Removed

- Development notes that were records of how we got here rather than documentation:
  `REVIEW-GUIDE.md`, `DEV-ISSUES.md`, `SERIALIZATION-SPEC.md`. The serialization model is specified
  in `io-specs/serialization/`; the four ADRs under `docs/decisions/` stay.
- Scratch tests that asserted nothing (`doc-parser`, `debug-playground`, `debug-serialize`,
  `debug/stringify-debug`, and two of the three cases in `trial.test.ts` — the third was salvaged
  into `tests/schema/utils/defs-inferrer.test.ts`). Suite goes 5,034 → 5,028: five removed `it()`s
  that could not fail, two real ones added.
- Eleven scripts under `tests/errors/` named `test-*.ts` / `test-*.js`, which vitest's
  `tests/**/*.test.ts` pattern never matched, plus a `test-parser-crash.ts` probe at the repo root.
  This also drops five long-standing `tsc --noEmit` errors (22 → 17, none in `src/`).

### Added

- README now documents the conformance corpus: it lives in the sibling `io-test-cases` checkout,
  `yarn test` runs it, and the suites skip rather than fail when the sibling is absent.

---

### BREAKING: error-code rename (ADR 0002)

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

### Review findings (ADR 0003)

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

## Planned

- `load(data, defs?, sink?, options?)` and `validate(data, defs?, sink?, options?)` — the same four
  slots as `parse`, and `.with(defs, sink)` on all four template tags (ADR 0005 §2.5).
- Additional type constraints
- Custom type definitions
- Performance optimizations
