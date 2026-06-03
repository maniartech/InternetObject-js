# Streaming Implementation Gaps

This document is the mutable execution tracker for the streaming module.
It records the current runtime gaps against the frozen contract in [specs/PROTOCOL.md](./specs/PROTOCOL.md) and the JavaScript binding in [specs/bindings/javascript.md](./specs/bindings/javascript.md).

Use this file for implementation status, file-level touchpoints, and test closure.
Do not use this file to redefine the public contract.

## How To Use This Document

- Keep [specs/PROTOCOL.md](./specs/PROTOCOL.md) normative and stable.
- Update this file as runtime work progresses.
- Close a gap only when the implementation change is complete and the associated focused tests exist.
- If the public contract itself must change, update the frozen spec first and then update this tracker.

## Current Status

- The public streaming contract is frozen.
- The runtime implementation is not yet aligned with that contract.
- The highest-risk touchpoints are [reader.ts](./reader.ts), [types.ts](./types.ts), [writer.ts](./writer.ts), and [adapters.ts](./adapters.ts).

## Gap Tracker

### Gap 1: Reader Can Misclassify An `IOObject` As A Collection

Status: Open

Contract impact:

- Violates the record-oriented contract in [specs/PROTOCOL.md](./specs/PROTOCOL.md).
- Can emit tuple fragments instead of one complete `IOObject`.

Current touchpoints:

- [reader.ts](./reader.ts)

Observed cause:

- The reader currently uses generic iterability plus `toJSON` checks to decide whether section data is a collection.
- `IOObject` is also iterable, so that heuristic is too broad.

Required implementation:

- Branch on actual Internet Object runtime types rather than generic iterability.
- Ensure a single object section emits exactly one `StreamItem` with one complete `IOObject`.

Associated tests:

- one plain object section emits exactly one success item
- object records do not emit internal `[key, value]` tuples
- multi-record collections still emit one item per record

### Gap 2: `BufferTransport` Is Not UTF-8 Safe Across Split Byte Chunks

Status: Open

Contract impact:

- Violates the adapter and UTF-8 correctness guarantees.
- Can silently corrupt multibyte text.

Current touchpoints:

- [adapters.ts](./adapters.ts)

Observed cause:

- `BufferTransport` currently decodes each `Uint8Array` independently instead of preserving multibyte decoder state across chunk boundaries.

Required implementation:

- Preserve byte state across calls or use a persistent decoder.

Associated tests:

- split UTF-8 multibyte sequences across two chunks in `BufferTransport`
- emoji and non-ASCII text survive round-trip intact
- buffered output matches non-buffered transport output byte-for-byte for the same logical content

### Gap 3: Node Writable Backpressure Is Not Honored

Status: Open

Contract impact:

- Violates the backpressure contract.
- Risks unbounded buffered writes under load.

Current touchpoints:

- [writer.ts](./writer.ts)

Observed cause:

- The Node writable adapter in `createStreamWriter()` ignores `write()` returning `false`.

Required implementation:

- Make `send()` await transport acceptance for flow-controlled Node writable transports.
- Keep the transport contract explicit about when a frame is accepted.

Associated tests:

- `send()` waits for drain when Node writable backpressure is triggered
- `sendBatch()` also respects backpressure
- writes remain ordered across backpressure pauses

### Gap 4: Header Lifecycle Is Still Too Manual

Status: Open

Contract impact:

- Makes the writer easy to misuse.
- Allows record output before canonical header emission.

Current touchpoints:

- [writer.ts](./writer.ts)

Observed cause:

- Callers must manually coordinate `sendHeader()`.

Required implementation:

- Make header lifecycle harder to misuse, either by API convention or by writer behavior.
- Preserve the frozen framing rules while reducing call-site footguns.

Associated tests:

- header emitted at most once per stream
- first data send cannot accidentally bypass required header behavior
- repeated sends do not duplicate header output

### Gap 5: Runtime Types And Behavior Are Not Yet Aligned With The Frozen `StreamItem` Contract

Status: Open

Contract impact:

- Public types and runtime emissions still use the old shape.
- Callers cannot rely on `kind`, `recordIndex`, `data: null`, and fatal-vs-record-error semantics.

Current touchpoints:

- [types.ts](./types.ts)
- [reader.ts](./reader.ts)
- [index.ts](./index.ts)

Observed cause:

- `types.ts` still exports `{ data, schemaName, index, error? }`.
- `reader.ts` still emits the old shape and mixes success signaling with error attachment behavior.

Required implementation:

- Align exported types with the frozen two-shape `StreamItem` union.
- Align runtime emissions with `kind`, `recordIndex`, `schemaName?`, `data`, and `error` semantics.

Associated tests:

- exact success item shape
- exact `record-error` item shape
- no success item carries both data and error
- fatal control-state failures reject instead of yielding `record-error`

### Gap 6: Core Validation Semantics Must Be Inherited, Including Current Warts

Status: Open

Contract impact:

- Streaming could drift from parser/schema/core semantics if it patches behavior locally.

Current touchpoints:

- [reader.ts](./reader.ts)
- [writer.ts](./writer.ts)

Observed cause:

- The streaming runtime currently performs local decisions that can drift from the core parser and schema-processing path.

Required implementation:

- Route streamed record validation through existing parser/schema/core logic.
- Preserve defaults, missing-member handling, parser-vs-validation classification, and current core behavior exactly.

Associated tests:

- streamed valid record matches non-streaming parse plus schema-processing output
- defaults are inherited from core schema processing
- open-vs-closed schema behavior matches non-streaming behavior
- parser-vs-validation distinction is preserved on failures

### Gap 7: Recoverable Core Error Shapes Are Not Yet Normalized At The Streaming Boundary

Status: Open

Contract impact:

- Internal recoverable error representations do not yet map cleanly to the frozen public iterator contract.

Current touchpoints:

- [reader.ts](./reader.ts)

Observed cause:

- Parse-time and validation-time recoverable failures arrive in different internal shapes.
- The streaming boundary must normalize them to one public `record-error` envelope.

Required implementation:

- Normalize parse-time bad records to one `record-error` item at the recovered record boundary.
- Normalize validation failures so one parsed record still emits only one `record-error` item.
- Use the first collected validation error as the public `record-error.error` value in v1.

Associated tests:

- one parse-time bad record becomes one `record-error` item
- one validation-failed record becomes one `record-error` item even when multiple validation errors were collected internally
- first collected validation error is the outward `record-error.error`
- later records continue after recoverable record errors

### Gap 8: Initial State And Header-Only Definition Rules Are Not Yet Enforced Rigorously

Status: Open

Contract impact:

- Risks drifting from parser-compatible initial state handling and header boundaries.

Current touchpoints:

- [reader.ts](./reader.ts)
- [writer.ts](./writer.ts)

Observed cause:

- Runtime handling of initial definitions, fallback default schema context, and header boundaries is still looser than the frozen contract.

Required implementation:

- Preserve parser-compatible precedence between preloaded definitions and in-stream header definitions.
- Preserve the finalized default-schema rule: implicit default-schema validation must not synthesize `schemaName`.
- Resolve the entire header as one atomic frame before any data record, since definition references are position-independent (forward references). The header must never be released or resolved piecemeal.
- The writer must emit a `---` header terminator before the first data record even when the header is empty (an empty header serializes to exactly `---`).
- The reader must stream a headerless stream that begins with `---` immediately; the no-`---` batch form parses but is buffered to end of stream (non-incremental) and writers must not emit it.
- Keep definitions header-only in v1.

Associated tests:

- preloaded definitions are honored before stream bytes arrive
- in-stream definitions override matching preloaded keys
- in-stream `$schema` overrides fallback default schema context
- implicit default-schema validation keeps `schemaName === undefined`
- header definitions require explicit `---` termination
- the header resolves as one unit including a forward reference from an earlier definition to a later one
- writer emits `---` before the first data record even with an empty header
- a headerless stream beginning with `---` emits its first record without buffering to end of stream
- no midstream definition mutation syntax is accepted as normative streaming behavior

### Gap 9: Performance Guarantees Are Not Yet Proved By Implementation And Tests

Status: Open

Contract impact:

- Performance claims remain unproven.
- Regressions could slip in even if correctness tests pass.

Current touchpoints:

- [reader.ts](./reader.ts)
- [writer.ts](./writer.ts)
- [adapters.ts](./adapters.ts)

Required implementation:

- Prove incremental buffering and bounded memory behavior.
- Reuse definitions and schema objects across unchanged schema contexts.
- Prove transport backpressure behavior with focused tests.

Associated tests:

- large same-schema stream does not recompile unchanged schema context per record
- reader memory remains bounded by pending frame state rather than total stream history
- long streams continue to emit incrementally instead of buffering full history
- backpressure-aware transports delay `send()` resolution until acceptance

### Gap 10: Partial Frame At EOF Is Not Yet Normalized

Status: Open

Contract impact:

- If a `~` record frame begins but the source closes before the record is parseable, the contract requires one `record-error` item using the truncated-input parse error.
- The current reader may silently discard the partial frame or produce ambiguous behavior.

Current touchpoints:

- [reader.ts](./reader.ts)

Required implementation:

- On clean source close, flush any partial pending frame.
- If the flush produces a parse error for the incomplete record, emit one `record-error` item rather than silently discarding.

Associated tests:

- source closes with a partial `~` record in flight — one `record-error` is emitted
- source closes with no pending frame — no extra item is emitted
- partial frame error preserves core parse identity

### Gap 11: Reader Lifecycle, Single-Consumption, And Cancellation Are Not Enforced

Status: Open

Contract impact:

- Violates the Lifecycle And Consumption Contract.
- Early `break` may leak a `ReadableStream` reader lock; there is no `AbortSignal` support; re-iteration behavior is undefined.

Current touchpoints:

- [reader.ts](./reader.ts)
- [source.ts](./source.ts)
- [types.ts](./types.ts)

Required implementation:

- Add `signal?: AbortSignal` to `StreamReaderOptions` and reject the iterator at the next pull boundary when aborted.
- Ensure the async generator's `return()` path releases the source (release `ReadableStream` lock, stop pulling).
- Make single-consumption explicit (guard against a second iteration or document it as undefined).

Associated tests:

- early `break` releases the source and does not leak a stream lock
- `AbortSignal` aborts fatally and releases the source without emitting a `record-error`
- re-iteration or iterate-after-`collect()` is guarded or clearly undefined

### Gap 12: Degenerate And Empty Inputs Are Not Specified In Runtime

Status: Open

Contract impact:

- Violates the Empty And Degenerate Inputs contract.
- Empty, whitespace-only, header-only streams, and bare `~` must have defined behavior.

Current touchpoints:

- [reader.ts](./reader.ts)

Required implementation:

- Empty / whitespace-only / header-only streams emit zero items and complete normally.
- Bare `~` with no payload emits one `record-error`, not an empty success record.

Associated tests:

- empty source emits zero items
- header-only stream emits zero items
- bare `~` emits one `record-error`

### Gap 13: Encoding Rules (BOM, Newlines) Are Not Fully Enforced

Status: Open

Contract impact:

- Violates the Encoding And Newline Contract.

Current touchpoints:

- [text.ts](./text.ts)
- [reader.ts](./reader.ts)

Required implementation:

- Strip a leading UTF-8 BOM; preserve interior BOM-like bytes inside values.
- Normalize `\r\n` and lone `\r` to `\n` for framing only.
- Preserve multibyte decoder state across chunk boundaries (overlaps with Gap 2).

Associated tests:

- leading BOM stripped, interior BOM-like bytes preserved
- `\r\n` and lone `\r` frame identically to `\n`
- split multibyte code point decodes correctly

### Gap 14: `maxBufferedChars` Overflow Semantics Are Not Aligned

Status: Open

Contract impact:

- The contract makes overflow a fatal rejection, not a `record-error`. The runtime must match and the cap must bound a single pending frame.

Current touchpoints:

- [reader.ts](./reader.ts)

Required implementation:

- Confirm overflow rejects the iterator fatally with a clear error.
- Confirm the cap bounds a single pending frame rather than cumulative stream history.

Associated tests:

- exceeding `maxBufferedChars` rejects fatally rather than emitting a `record-error`
- a long stream of small records never approaches the cap

### Gap 15: Writer Concurrency, Poisoning, And Raw Schema-Tracking Are Not Guarded

Status: Open

Contract impact:

- Violates the Writer Contract additions: sequential-await requirement, poison-after-transport-rejection, and `sendRaw()`/`pipeRaw()` schema-tracking bypass.

Current touchpoints:

- [writer.ts](./writer.ts)

Observed cause:

- The writer has no internal serialization of concurrent calls.
- `sendRaw()` does not reset or mark `currentSchemaName` as unknown, so a following `send()` can drop a required schema switch.
- There is no poisoned state after a transport rejection.

Required implementation:

- Document/guard sequential-await usage.
- After `sendRaw()`/`pipeRaw()`, mark the active schema as unknown so the next `send()` emits an explicit switch.
- Mark the writer poisoned after a transport rejection.

Associated tests:

- `sendRaw()` then `send()` without explicit schema does not drop a schema switch
- writer rejects further use after a transport rejection
- ordered output is preserved across sequential awaited sends

### Gap 16: Writer Options Drift From The Frozen Surface

Status: Open

Contract impact:

- The frozen `StreamWriterOptions` in [specs/bindings/javascript.md](./specs/bindings/javascript.md) lists only `includeSchemas`.
- The runtime still exposes `onError: 'throw' | 'ignore' | 'emit'` and `defsId`.
- `onError: 'emit'` emits a `--- $error` section, which is a stream-only schema the framing contract forbids.

Current touchpoints:

- [types.ts](./types.ts)
- [writer.ts](./writer.ts)

Required implementation:

- Remove `onError: 'emit'` (it violates the framing contract); error handling belongs at the application layer.
- Remove or formally specify `defsId` before v1.
- Reconcile the exported `StreamWriterOptions` with the frozen surface.

Associated tests:

- writer never emits a `--- $error` section
- exported writer options match the frozen surface

### Gap 17: Streaming Fatal Error Codes And `IOStreamError` Are Not Implemented

Status: Open

Contract impact:

- [specs/PROTOCOL.md §7.3](./specs/PROTOCOL.md#7-error-model) defines a `stream` error category with three
  codes; the runtime does not yet raise them.

Current touchpoints:

- [reader.ts](./reader.ts), [writer.ts](./writer.ts), [types.ts](./types.ts)
- new: an `IOStreamError extends IOError` class

Required implementation:

- Add `IOStreamError` (category `stream`) and a streaming code set: `stream-buffer-exceeded`,
  `stream-source-error`, `stream-aborted`.
- Raise `stream-buffer-exceeded` on single-frame buffer overflow (Gap 14), `stream-aborted` on abort
  (Gap 11), `stream-source-error` on source/transport failure.
- Preserve core identity for fatal *core* errors (unknown schema switch keeps `validation` /
  `schema-not-defined`); do not wrap them in `IOStreamError`.

Associated tests:

- buffer overflow rejects with `stream-buffer-exceeded`
- abort rejects with `stream-aborted`, not a record-error
- source failure rejects with `stream-source-error`
- unknown schema switch rejects preserving `schema-not-defined` (core identity), not a stream code

Note: the full core error-code finalization (registry, freeze policy, audit) is tracked separately in
[../errors/FINALIZATION.md](../errors/FINALIZATION.md), which also records the codes frozen by reference
from the conformance corpus.

### Gap 18: Tokenizer Section-Separator Lookahead Is Unbounded

Status: Open

Contract impact:

- Blocks a chunk-feedable tokenizer (Gap 19) and is a standalone perf/correctness wart.

Current touchpoints:

- [../parser/tokenizer/index.ts](../parser/tokenizer/index.ts) (`parseSectionSeparator`)

Observed cause:

- `parseSectionSeparator` runs `reSectionSchemaName.exec(this.input.substring(this.pos))` — an unbounded
  substring to end of input on every `---` — and emits the `---`/name/schema as a multi-token group via
  ad-hoc lookahead.

Required implementation:

- Bound the lookahead (e.g. to a max identifier length) and emit the section name/schema as ordinary
  tokens, so the section-separator path is uniform with the rest of the tokenizer.

Associated tests:

- a section schema/name split across a chunk boundary (`--- $Us` + `er`) tokenizes correctly
- no full-input substring is allocated per `---`

Implements ADR [0006](./specs/decisions/0006-tokenizestream-token-level-boundaries.md). Do this first.

### Gap 19: Tokenizer Is Not Chunk-Feedable (`tokenizeStream`)

Status: Open

Contract impact:

- Required for token-level frame splitting per ADR [0006](./specs/decisions/0006-tokenizestream-token-level-boundaries.md).

Current touchpoints:

- [../parser/tokenizer/index.ts](../parser/tokenizer/index.ts)

Required implementation:

- Add a chunk-feedable mode that consumes a growing buffer and releases tokens that are safely complete
  (a token followed by a terminator); the final token ending at the buffer edge is provisional and
  retained for the next chunk.
- Carry and **rebase position state (row/column/offset) across chunk boundaries** so emitted positions
  are stream-absolute, per ADR [0011](./specs/decisions/0011-stream-absolute-error-positions.md).

Associated tests:

- token stream across arbitrary chunk splits equals `tokenize()` of the whole input, token-for-token, including positions
- a token split across chunks (string, number, `Inf`, annotated-string quote) resolves correctly
- stream-absolute positions survive chunking and newline normalization

### Gap 20: No Per-Record Parse Seam On `ASTParser`

Status: Open

Contract impact:

- The reader must parse the header once (atomically) and then parse each record's token group, reusing
  parser logic rather than re-tokenizing text.

Current touchpoints:

- [../parser/ast-parser.ts](../parser/ast-parser.ts)
- [reader.ts](./reader.ts)

Required implementation:

- Expose a way to parse a single record's token group as a section given already-resolved defs/schema,
  reusing `parseSectionContent`/`processObject`/`processCollection`.
- Parse the full header token group once before any data record (atomic header, Gap 8).

Associated tests:

- header parsed once; later records reuse resolved defs/schema (no recompilation)
- a single record's tokens parse to the same value as the whole-document path (equivalence)

### Gap 21: Reader Uses An Ad-Hoc Scanner Instead Of Token-Level Framing

Status: Open

Contract impact:

- The reader's own line/string-state scanner is a second lexer that can drift from the tokenizer (ADR [0006](./specs/decisions/0006-tokenizestream-token-level-boundaries.md)).

Current touchpoints:

- [reader.ts](./reader.ts), [text.ts](./text.ts)

Required implementation:

- Build a frame collector driven by `tokenizeStream` (Gap 19): accumulate tokens until a `~`/`---`
  boundary token, hand each group to the per-record parse seam (Gap 20).
- Remove the reader's `updateStringState`/line-based boundary detection.

Associated tests:

- record boundaries inside strings/comments/annotated strings are never mis-split (delegated to tokenizer)
- the ad-hoc string-state scanner is gone

## Execution Priority

### Priority 0 — Architecture foundation (do first)

- bound the tokenizer section-separator lookahead (Gap 18)
- make the tokenizer chunk-feedable with stream-absolute position rebasing (Gap 19)
- add the per-record parse seam on `ASTParser` (Gap 20)
- build the token-level frame collector and remove the reader's ad-hoc scanner (Gap 21)

### Priority 0

- align [types.ts](./types.ts) and [reader.ts](./reader.ts) with the frozen `StreamItem` contract (Gap 5)
- fix `IOObject` versus collection classification in [reader.ts](./reader.ts) (Gap 1)
- normalize recoverable parse and validation failures at the streaming boundary (Gap 7)
- preserve preloaded definitions, default-schema fallback behavior, and explicit header rules in [reader.ts](./reader.ts) (Gap 8)
- make [adapters.ts](./adapters.ts) UTF-8 safe across split byte chunks (Gap 2)
- keep successful streamed records semantically equivalent to the non-streaming parse plus schema-processing path (Gap 6)
- enforce reader lifecycle: source release on early exit, `AbortSignal` cancellation, single-consumption (Gap 11)
- define empty / header-only / bare-`~` behavior (Gap 12)

### Priority 1

- make [writer.ts](./writer.ts) backpressure-aware for flow-controlled transports (Gap 3)
- reduce header lifecycle footguns in [writer.ts](./writer.ts) (Gap 4)
- enforce encoding rules: BOM stripping, newline normalization, cross-chunk decode (Gap 13)
- align `maxBufferedChars` overflow semantics with the fatal-rejection contract (Gap 14)
- guard writer concurrency, poisoning, and `sendRaw()` schema-tracking (Gap 15)
- remove `onError: 'emit'` and reconcile `StreamWriterOptions` with the frozen surface (Gap 16)
- prove incremental buffering, schema reuse, and transport behavior with focused tests (Gap 9)
- normalize partial-frame-at-EOF behavior (Gap 10)

## Suggested Test Grouping

### Reader Contract Tests

- single object section
- multi-record collection section
- explicit schema section
- implicit default-schema validation with `schemaName === undefined`
- preloaded definitions and fallback default schema context
- in-stream `$schema` precedence over fallback default schema context

### Error Contract Tests

- one parse-time bad record maps to one `record-error`
- one validation-failed record with multiple validation errors maps to one `record-error`
- first validation error becomes public `error`
- fatal control-state failures reject the iterator
- parser-vs-validation distinction is preserved

### Transport And Performance Tests

- split UTF-8 byte boundaries
- callback-driven push source
- Node writable backpressure
- incremental emit behavior on long streams
- schema reuse under repeated same-schema records

## Exit Criteria

- The runtime behavior matches [specs/PROTOCOL.md](./specs/PROTOCOL.md) and [specs/bindings/javascript.md](./specs/bindings/javascript.md).
- The focused tests above exist and pass.
- The frozen docs do not need to explain around runtime quirks because the implementation actually conforms.
