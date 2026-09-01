# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-08-31

The first release since 0.2.1, and a large one. It is breaking in three separate ways — the public
API, the `errorCode` strings, and several serializer outputs — so read the paragraph that opens each
section below before upgrading. **[MIGRATION.md](./MIGRATION.md) has the upgrade path.**

This supersedes `0.3.0-next.0`, which has sat on the `next` dist-tag since January and is several
months behind everything described here.

One thing did not change, and it is the thing most likely to worry you: **the format**. The same
text parses to the same values, with the same errors, at the same positions. That is not a claim of
intent — it is checked against the conformance corpus in the sibling `io-test-cases` repository, and
against a fingerprint of all 1,396 corpus parses taken before the first commit of this work and
re-verified after every commit since.

### The public API is plain JavaScript by default

`parse()` now returns a plain object. `parseDocument()` returns the document, and `parse` is
literally `parseDocument(...).toObject()` — a test pins that equality. The great majority of users
want data, and previously had to learn the node model to get it; now the node model is what you ask
for by name, when you need positions, errors, or writes that validate.

The document `parseDocument` returns is proxied, so sections, collections and records are reachable
by name and by index at once: `doc.sections.employees[0].name` and `doc.data[0].age = 31` both work,
and `doc.data` is the section a document gets when it names none. Because data can be named anything
— including `header` or `errors` — the reads that must never be shadowed have standalone spellings:
`io.section()`, `io.sections()`, `io.header()`, `io.isError()`, `io.node()`. `String(doc)` now
returns the document as Internet Object text rather than `"[object Object]"`.

Every entry point takes the same four slots, `(input, defs?, sink?, options?)` — `load`,
`loadObject`, `loadCollection`, `validate`, `validateObject`, `validateCollection`, and the template
tags. The old call shapes still work, because a sink is an array or a function and so cannot be
confused with an options object or a `Definitions`. `IOCommonOptions.errorCollector` is deprecated
rather than removed, since `loadInferred` has no sink slot and inference sits outside the contract. `ParserOptions` is **deleted** — all ten fields, none of which had a single read site —
and `strict` is gone from the facade options, because passing a sink asks the same question.

`IOCollection` gained the rest of the array surface (`join`, `at`, `includes`, `indexOf`,
`lastIndexOf`, `slice`, `concat`, `flatMap`, `sort`, `reverse`, `toSorted`, `toReversed`), and
`getAt(index)` now exists on `IOSectionCollection` and `IODefinitions` so every container spells
positional access identically. `getTokenNode()` is `getV()` under a readable name.

### Writes are validated, everywhere

`IOObject.set()` now validates on every path — through the proxy, through the streaming writer, and
in code holding a node directly. A value a parse would reject is rejected here, reported with the
code a parse would have used. `setRaw()` is the internal escape for code that has already validated.
Inserting into a collection **adopts** the section's schema, so a plain object becomes a record and
a record missing a required member is refused; because adoption can replace the value, read the
record back out of the collection rather than keeping the reference you pushed. Attaching a schema
validates what is already there — atomically and by throwing when there is no sink, or by reporting
every mismatch and changing nothing when there is one.

Serializing a document that holds a failed record now throws `forbidden-error-node`;
`{ skipErrors: true }` writes the records that validated instead. `toObject()` and `toJSON()` still
embed error nodes, unchanged, because those are projections rather than documents.

### No sink means fail fast — now for a bad record, not just a bad document

This file's own description of the error sink — *whether you pass one is the whole of the fail-fast
question* — was only half true in the code. A fatal problem raised on its own, so a bad value in a
single record, a duplicate member or an unterminated string all threw. But a bad record inside a
**collection** is recovered from, and the error reached the collector only when there was one. With
no sink it was dropped: `parse` returned an array holding an error node, raised nothing, and
reported nothing.

That is the worst case for whoever wrote the document, since it looks like data until something
downstream trips over it. A parse with no sink now raises the first error it finds, wherever it
found it — and the complete list rides along as `err.errors`, so one run shows every problem
rather than one per run. Recovery is unchanged and still one argument away — pass an array or a
function and every error is reported while the good records survive. An empty array counts;
passing one is the whole opt-in. `parse`, `parseDocument` and the tags all share the slot, so they
all behave the same way.

**`safeParse` and `safeParseDocument`** are the ergonomic form of that opt-in: the throw traded
for a result object, `{ ok, data, errors }` and `{ ok, doc, errors }`, never throwing — a fatal
comes back as `ok: false` with everything found up to it. The shape is the point: the data and the
errors travel in one return value, so they cannot be discarded separately, where a sink array can
be thrown away while the data is kept. Failed records embed in `data` in place (test them with
`io.isError`), or leave it under `{ skipErrors: true }` — and are then still in `errors` with
their `collectionIndex`, so a skip is traceable rather than silent. Both are thin wrappers over
`parse`/`parseDocument` with an internal sink: one pipeline, and a test pins the equality.

**The embedded error is now a class.** `{ __error: true }` is a perfectly legal member name, so a
document whose schema declared one could forge the old plain shape — `io.isError` reported a false
positive, and `{ skipErrors: true }` silently **dropped a legitimate record**. The embedded item
is now an `IOErrorItem` instance with the same enumerable fields (the wire shape and the
playground's JSON panel are unchanged), and `io.isError` checks the class, which data cannot
write. Two smaller bugs fixed by the same move: a load-route failure used to project as a JSON
*string* rather than an object, and seven streaming-error corpus fingerprints carried the same
double-encoding. One trade-off, shared with `Decimal` in the same projection: `structuredClone`
strips prototypes, so test for errors on the side of the boundary that parsed.

### Notification, without a framework package

`io.subscribe(doc, fn)` and `io.version(doc)` report writes. Notification is coalesced to a
microtask, so ten writes in one handler produce one call while the version moves on every write.
`subscribe` calls its listener with the current value and returns an unsubscribe function, which
*is* the Svelte store contract; `version` is the snapshot `useSyncExternalStore` needs. That one
pair covers React, Svelte, Vue and Solid, which is precisely why there is no framework package. A
document nobody has subscribed to carries no counter at all, so the cost to everyone else is one
null check per write.

### Error codes: one grammar, one class each

Every public `errorCode` follows `<predicate>-<subject>` — predicate first, drawn from a closed
13-word vocabulary. **This breaks any consumer branching on the old strings.** It was taken pre-1.0
and in lockstep with the conformance corpus, after which the codes re-freeze. 27 of the 49 codes
keep their exact spelling; 41 were already predicate-first.

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
| `invalid-base64` | `invalid-binary` |
| `not-a-number`, `not-an-integer` | removed — declared but never thrown |

The rename exposed places where the code being reported was decided by an implementation detail
rather than by the format. Every numeric and temporal type now reports its own code —
`expected-decimal`, `out-of-range-decimal`, `expected-datetime` and friends did not previously
exist. `reserved-type` distinguishes a reserved name from a typo: `int64` used to report the same
code as `nosuchtype`, purely because the typedef registry happens not to register it. `multipleOf`
violations have their own code instead of sharing `invalid-value` with "an anyOf union matched
nothing". And `unsupported-` left the vocabulary entirely — it described the library rather than the
format, and a code meaning "not built yet" cannot be normative for a conformance corpus.

Five codes were added from a five-reviewer read of the specification, each landing with a site that
emits it. `invalid-number` covers malformed numeric literals, which used to decode as open strings —
a different *value*, not a missing diagnostic, since `0xGH` became the string `"0xGH"` and `1e`
became the number `1`. `expected-date` and `expected-time` exist because one class served all three
temporal types, so a `date` member given a string named a type its schema never mentioned;
`invalid-date` and `invalid-time` complete the same grid on the literal side. `expected-value` was
split out of the syntax sense of `missing-value`, because one code cannot sit in two error classes —
streaming derives the wire category from the class, so two conformant readers reported different
categories for the same input. `expected-binary` is deliberately **not** added: `binary` is a base
type in the specification but is not registered as a schema type here, so no site could emit it. It
lands with the type.

Underneath, eleven raise sites disagreed with the catalogue about their error class.
`undefined-schema` was catalogued as validation but raised as a base error at four non-streaming
sites — the streaming site was correct, so the conformance case passed while the ordinary path
diverged — and `unknown-type` was raised as four different classes across seven sites. A code now
has exactly one class, and the catalogue is the authority. **56 codes.**

### Numbers: two rules

The numeric rules were reduced to two. **All or nothing:** a run is a number only if the *entire*
run is a valid number literal, otherwise the whole run is an open string — which is what stops a
partial parse inventing a value, so `1e` is the string `"1e"` and never the number `1`. **A marker
is a claim:** `0x`, `0o`, `0b` and the `m`/`n` suffixes can only mean *number*, so a run carrying
one that is not a valid literal of that type is an error.

Consequently `1.2.3`, `10.0.0.1`, `2024.01.15`, `1e` and `1.23ee4` are **no longer errors** — they
carry no marker, so they claim nothing. An interim rule had rejected them while accepting
`1.2.3-beta`. Conversely, any word beginning with a base prefix — `0xygen`, `0oz` — now **is** an
error; quoting is the escape hatch, and a writer emits such strings quoted. Three malformed forms
are still read as open strings because each is shape-identical to ordinary text (`12mm` is a
measurement): `0b 1010`, `1.23ee4`, `123.45mm`. They are listed under *Implementation status* in the
specification rather than quietly omitted.

### Documents, sections, and the two projections

An unnamed data section is now named **`data`**, not `unnamed`, matching the specification. Since
the section name is the key a section is projected under, JSON output changes for any document with
more than one section. A duplicate section name reports `duplicate-section-name` rather than
`unexpected-token` — the old code described a lexical fault, and a repeated section name is
structural — and those errors now carry a position.

**`toObject()` and `toJSON()` are now two different projections.** They used to
be the same method, and it converted values only at the top level: `doc.toJSON().when` came back an
ISO string while `doc.toJSON().events[0].when` came back a live `Date` — the same type, spelled
according to how deep it sat. Binary reached `Buffer.toJSON()` and emitted
`{ type: 'Buffer', data: [...] }`, which is Node's internal bookkeeping rather than anything another
language could read, and `JSON.stringify(doc)` threw outright on a document holding a bigint. Now
`toObject()` gives plain structure with **live** values (`Date`, `Decimal`, bytes and `bigint`
survive), and `toJSON()` gives the **JSON projection**, applied recursively per io-specs
`json-compatibility.md` — datetimes as ISO-8601 strings, decimals and bigints as strings, binary as
base64. Code reading typed values out of `toJSON()` should now call `toObject()`. Both exist on
every core type; `Decimal` gained `toObject()` and `SectionCollection` gained both.

### Serialization: round-tripping, and two silent data losses

Two of these lost data outright. A **second unnamed section silently overwrote the first**, because
the duplicate-name rename was applied only to sections carrying a written name, so unnamed sections
collided and all but the last were dropped. And a **quoted string lost its backslashes**:
`toRegularString` escaped `\n`, `\r`, `\t` and the encloser but never the backslash itself, so a
literal `\` was written raw and the reader consumed it as the start of an escape sequence — `"9\U"`
read back as `"9U"`. It surfaced only when a string needed quoting for some *other* reason, such as
looking like a number or holding a comma, because the open-string path had escaped it correctly all
along.

The rest are round-trip failures — output the library's own reader rejected or misread. Binary
values are written as `b"<base64>"` rather than an object of byte indices; `Inf`, `-Inf` and `NaN`
use the IO spellings rather than the JavaScript ones; strings and bare keys containing `---` are
quoted so they can no longer tear a document in two; an empty record `{}` no longer writes as a bare
`---` that reads back as `null`. A numeric member with a radix `format` is written with its base
prefix and type suffix (`0xffn`, not `ff` — the previous output was rejected by the member's own
schema), a bigint with `format: decimal` keeps its `n` suffix instead of reading back as a plain
number, and a signed radix literal such as `-0xffn` no longer throws `Cannot convert 0x-ff to a
BigInt`. A temporal value written without a schema keeps its kind (`d"…"` / `t"…"` / `dt"…"`)
rather than being flattened to `dt"…"`, which had also leaked the internal 1900-01-01 sentinel into
output. A quoted member name is no longer written with a `?` / `*` suffix (`"a,b"?: number`), which
is not valid syntax — the writer was emitting a header its own reader rejected — and uses the long
form instead. `emitKeys: 'all'` applies at every depth, including through arrays. A `Decimal` inside
a formatted array no longer prints its internals. A root array of non-records wrote **error objects
into the document**, and is now bound to the positional member `"0"`, which is what IO's own
promotion rule does with a non-object root value. And serialization is
idempotent: a constraint left at its type's declared default is no longer re-emitted, so the text
stopped growing on each round-trip.

Elsewhere in the parser, **`datetime` silently dropped its seconds** — `dt"…T14:30:45Z"` read as
`…14:30:00`, because the regex named the capture group `sec` while the code read `second`, so every
timestamp with a non-zero seconds field lost it. A decimal's internal `f` marker leaked into token
text, so `123.45mm` decoded as `"123.45fm"` — an `f` the input never contained, which the
conformance corpus had recorded as correct output. A leading comma in an array was silently dropped
(`[,a]` loaded as `["a"]`) while `[a,,c]` and `[ , ]` were correctly rejected, because the
look-ahead guarding those cannot see backwards. An unterminated *annotated* string closed itself at
end of input — `r'Unclosed` yielded a string with no error, across every annotation — where the
regular string `"Unclosed` correctly reported `unterminated-string`.

### Template tags and the facade

**An interpolated `${…}` in a template tag is now written as a value**, never spliced in as source.
This was corrupting ordinary data, not exotic data: `` io.object`qty: ${'1,000'}` `` gave
`{qty: 1}`, `'Smith, John'` split into two members, and `'12:30'` and a URL both returned `null`.
Six of seven ordinary values were corrupted and only `'Alice'` survived — which is exactly why every
example anyone wrote had passed. `${undefined}` used to contribute an empty string and vanish; it is
now `N`.

Three facade bugs shared a root cause: positional arguments quietly landing in the wrong slot.
`load(data, defs, errors)` reported nothing at all, because the array landed in the options slot, no
`schemaName` was found on it, and the load carried on reporting into the void — the same trap that
made `parse(text, errorArray)` collect nothing. **The error sink and `doc.getErrors()` reported
different sets**, in both directions, so a syntax error could reach `getErrors()` but not the sink,
and `sink.length` could read `0` while the data held an error node. And `skipErrors` was ignored on
the serialization path entirely: it looked for `{ __error: true }` while the parse route embeds an
`ErrorNode`, so it matched nothing on the path people actually take.

`io.object.with(defs)` returned a different type from `` io.object`…` `` — a plain object against an
`IOObject`, so one tag had two contracts, decided by whether definitions were involved.
`parseDefinitions(text, defs?, sink?)` now takes a sink so `io.defs.with(defs, sink)` has one to
hand over; **`io.schema.with` deliberately does not**, because schema compilation fails fast and a
sink could not change the outcome.

Finally, internals stopped leaking through key walks: `{ ...collection }` and `structuredClone(doc)`
handed back `_items` / `_header` instead of the data. `IOSectionCollection` and `IODefinitions` were
missed on the first pass and leaked `_sections`, `_sectionNames`, `_definitions`, `_defaultSchema`
and `_resolvingValues` until the notification work put a sixth field there and made it obvious.

### Added, elsewhere

`format: scientific` for `bigint` (`1200000n` becomes `12e5n`), consistent with `number`.
`stringifyHeader()`, so separating header from data is library-owned rather than a caller's string
surgery. Wildcard/map and multi-section schema inference. Documentation-wise, `format` is specified
as **write-only** — it never constrains input, and MemberDef options are either constraints or
presentation — in io-specs, alongside a new Serialization part.

### Tooling and repository

Two new gates back this release. `npm run behaviour:capture` / `behaviour:verify` replays every
corpus input and fingerprints the value model, every error code and position, and their order; it is
what turns "the format did not change" from an assertion into a check. `npm run check:idioms` is the
completeness gate for the API change, failing on any retired idiom outside its allowlist. CI now
checks out the conformance corpus rather than skipping it when absent — a gate that can silently
not-run is not a gate — and runs `verify:package` against the packed tarball as its own job, which
is what caught the CJS bundle tree-shaking out the write hooks.

Housekeeping, with no library behaviour attached: `npm run perf` and `npm run perf:decimal` pointed
at files that had moved under `tests/performance/`, and had simply been broken. Two tests were
renamed to say what they test rather than where they came from. Working notes that recorded how we
got here, rather than documenting anything, were removed from the repository — the serialization
model is specified in `io-specs/serialization/`. Scratch tests that asserted
nothing were deleted, along with eleven scripts under `tests/errors/` named `test-*.ts` that
vitest's own pattern never matched, which also cleared five long-standing `tsc` errors.
`number-old.ts` — dead code, and the source of the build's `duplicate-case` warning — is gone.

## [0.2.1] - 2026-01-28

A streaming release, and the last one published before the API work in 0.3.0. **Breaking for anyone
using the streaming reader or `documentToObject`.**

`openStream` is gone, replaced by `createStreamReader`. The two had grown up alongside each other
and only one of them was finished: the reader and writer now have full parity — matching options,
matching lifecycle, matching error reporting — and `IOStreamReader` is exported as a type so a
consumer can hold one. `OpenStreamOptions` is `StreamReaderOptions`. This also fixed the exports
themselves, which had been advertising `openStream` from the package root after it stopped being the
recommended path. `documentToObject(doc)` was likewise removed in favour of `doc.toJSON()`, which
had been the documented spelling for some time and is the one the document itself owns.

Underneath that, an object with no schema reached the object processor as `undefined` rather than
being treated as unconstrained, and the strict-null path had the same gap. Types are now registered
from the facade module, so importing the facade alone is enough to have the schema types available —
previously the registration depended on which entry point you happened to reach first.

The rest is release plumbing that had been failing quietly: a pre-publish validation script and a
corrected `tsup` configuration, refreshed bundle baselines, npm authentication that works with a
token as well as an interactive login, and a publish script that runs on Windows. Security
advisories were cleared and the audit script updated.

## [0.2.0] - 2026-01-26

**This is where the version went backwards**, from `1.0.0-beta.1` to `0.2.0`. Nothing was removed to
make that happen; the number simply stopped overstating what the format guaranteed.

### Why 0.x comes *after* 1.0.0-beta.1

Read the version list from the bottom and it doubles back on itself. The package published `0.1.0`
through `0.1.9` in May 2020, jumped to `1.0.1-alpha.1` in 2024, reached `1.0.0-beta.1` in the tree
in December 2025 — and then came back down to `0.2.0` here, where it has stayed. The `1.0.x` line
was the excursion; this release resumed the numbering the package actually started on.

`1.0.0-beta.1` named a destination, not a state. Internet Object is a *format* before it is a
library, and the format itself was still moving — error codes, the public API surface and the
serializer's output have each changed since, and all three changed again in 0.3.0. A `1.0` prefix,
even suffixed with `alpha` or `beta`, promises a stability nothing here could back. `0.x` is the
honest number for software whose contract is still being settled, and under 0.x semantics a
breaking change lands in a MINOR bump — which is what every release since has been.

**There will be no 1.0.0 until the format has been strongly validated by the community**, and that
is a bar set outside this repository on purpose. Our own test suite passing is not evidence that the
format is right; it is only evidence that the implementation matches what we already believed. What
would count is other people finding the edges: independent implementations in other languages
passing the shared conformance corpus, real projects shipping on it and reporting back what hurt,
and the error-code vocabulary surviving a stretch of that use without needing to be reopened.

Until then, expect `0.x`. Breaking changes will keep arriving when they make the format more
correct, each written up here with a migration note describing the upgrade. Pin an exact version if you need stability today; 1.0.0 will be a
report of what the community has already validated, not an announcement of our confidence in it.

### The release itself

The substance of the release is serialization and streaming. The **IO Formatter** arrived, giving
`stringify` and `stringifyDocument` real formatting rules for records and collections rather than a
single flat line, in both compact and formatted modes, and specified in
`docs/serializing/stringify/formatting.md`. `Decimal` became serializable, having previously had no
representation on the way out.

Streaming gained the pieces needed to run somewhere other than Node: `createPushSource` and
`BufferTransport` for environments with no stream primitives of their own, a `ChunkDecoder` that
handles a multi-byte character split across two chunks, and multi-line string handling in the
tokenizer's streaming state. Worked examples ship for `fetch`, legacy `XHR`, and Node clients,
alongside documentation for restricted environments.

On the schema side, definitions resolve variables during compilation, `additionalProperties`
canonicalization was corrected, and nested schema references gained the test coverage that was
missing. Validation error reporting carries its processing context, so an error raised deep in a
nested schema says where it came from.

The exported API surface was tidied in the same pass — `validate`, `toJSON` and `parseSchema` gained
their facade entry points, and the template tag functions were exported by name — with a round-trip
test suite added for `parse` / `stringify`, and the new surface pinned by tests of its own. Much of
what that pass exposed is what 0.3.0 later went back and fixed properly.

## [1.0.0-beta.1] - 2025-12-01

The last release tagged under a 1.0 number, and never published to npm — the tree carried it while
`1.0.4-alpha.1` was the newest thing on the registry. Two months later the line was renumbered down
to 0.x; see *Why 0.x comes after 1.0.0-beta.1* under [0.2.0] above for the reasoning.

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

- Additional type constraints
- Custom type definitions
- Performance optimizations
