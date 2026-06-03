# Internet Object Streaming Protocol — v1

This is the **language-neutral, normative** contract for Internet Object streaming. It
governs every implementation in every language. It uses the requirement keywords **MUST**,
**MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY** per RFC 2119 / RFC 8174.

For document roles and precedence, see [`README.md`](./README.md). For *why* the protocol is
shaped this way, see [`decisions/`](./decisions/). For one language's concrete API, see
[`bindings/`](./bindings/). The executable form of this contract is [`conformance/`](./conformance/).

## 1. Scope and goal

Streaming is an **incremental, record-oriented transport** over the Internet Object data
model. A producer frames Internet Object records onto a byte/text stream; a consumer reads
them back one logical record at a time as the bytes arrive.

The goal: streaming MUST behave like a **record protocol**, not a raw chunk parser. It adds
framing, transport coordination, and an emission envelope. It MUST NOT define a second
semantic engine.

This protocol defines two roles:

- the **reader** — consumes a stream and emits one item per logical data record;
- the **writer** — frames records onto a stream.

It also defines obligations for **adapters** (transport bridges) and **transports**.

## 2. Relationship to core (governing principle)

Internet Object **core** is the single authority for data semantics. The streaming protocol
is subordinate to it and inclusive of it.

- **Subordinate on semantics.** Streaming MUST NOT redefine, reinterpret, or override any
  Internet Object semantics — what a type means, how values coerce, whether a value validates,
  how `default`/`optional`/`null`/`choices` and open-vs-closed schemas resolve, how values
  serialize, or what an error's identity is.
- **Inclusive, not bolt-on.** Streaming MUST reuse core. It MUST NOT fork, shadow, or partially
  re-implement core parsing, schema resolution, validation, or serialization.

### The equivalence rule (the test that enforces this)

> For the same record text and the same definitions state, a streamed record MUST produce the
> **same parsed record value, and the same error identity**, that the non-streaming
> core path (parse → schema-processing → validation) produces for an equivalent one-record
> document.

If a behavior cannot be derived from "run core over this record's text," it is out of scope for
this protocol. Streaming adds only framing, transport, and the envelope around that result.

> All type, schema, validation, and serialization rules are defined by the Internet Object core
> specification. This document references them; it does not restate them.

## 3. Terminology

- **Logical record** — one Internet Object collection record, introduced on the wire by `~`. The
  unit the reader emits.
- **Header** — the definitions block at the start of a stream, before the first `---`.
- **Section** — a run of records sharing a schema context, introduced by a `---` control frame.
- **Control frame** — a header definition block or a section marker (`~`-less structural input
  such as `---` / `--- $Schema`). Control frames are never emitted as data items.
- **Stream item** — the envelope the reader emits per logical record. See §5.
- **Frame** — a contiguous span of stream text the reader buffers and resolves as a unit (one
  record, or the whole header).
- **Default schema context** — the active schema used to validate records that carry no explicit
  schema selector.

## 4. Wire format and framing

The streaming wire format **is** the existing Internet Object document grammar, consumed
incrementally. `~`, `---`, and the header-definition grammar are core constructs; streaming
reuses them as its framing layer and does not define them. This section specifies the *framing
obligations* of a streamed document, not the grammar. Refer to the core specification for what
the markers mean.

- Transport chunk boundaries are **not** semantic. Splitting or coalescing chunks MUST NOT change
  the records a reader emits.
- A writer MUST frame every logical data record with `~`.
- A stream MAY begin with header definitions, using the core header-definition grammar.
- A conforming writer **MUST emit an explicit `---` (or `--- $Schema`) before the first data
  record, even when the header is empty.** An empty header serializes to exactly `---`. This is
  the header terminator that opens the data section.
- This terminator makes the first token unambiguous to the reader: a stream beginning with `---`
  has no/empty header and its data MAY stream immediately; a stream beginning with `~` is a header
  (definitions) that the reader MUST buffer until the terminating `---`.
- Only the **first** `---` is load-bearing for header-vs-data separation. Within a data section,
  records use `~` alone; later `---` markers are ordinary schema switches.
- `--- $Schema` selects the schema context for subsequent records. A bare `---` resets the active
  section to the default schema context.
- `~` is the only normative data-record marker. Quoted multiline values remain part of the same
  logical record.
- Control frames MUST NOT be emitted as data items.
- A reader MAY accept the legacy form that begins directly with `~` data and contains no `---` (so
  a non-streaming document stays equivalent), but that form cannot be emitted incrementally — the
  reader must buffer it to end of stream to determine it was data and not an unterminated header. A
  writer MUST NOT emit this form.

## 5. The stream item model

The reader emits a sequence of **stream items**, in wire order. Each item is exactly one of two
kinds. The concrete representation (object shape, field names, sum type, etc.) is defined by each
language [binding](./bindings/); this section defines the abstract model the binding MUST preserve.

A **record item** carries:

- `kind` = record (success)
- `recordIndex` — see below
- `schemaName` — present only when an explicit selector applied (see §6), otherwise absent
- `value` — the complete parsed record value, identical to what the non-streaming core path
  produces for that record (§2)
- no error

A **record-error item** carries:

- `kind` = record-error (recoverable failure)
- `recordIndex`
- `schemaName` — same rule as above
- no value
- `error` — preserving the core error identity (§7)

Required semantics:

- `recordIndex` is zero-based and counts logical data records — not chunks, lines, or sections.
- `recordIndex` MUST increment for **both** kinds. A failed record consumes an index exactly as a
  successful one does; indices are dense and gap-free.
- `recordIndex` is stream-global. It MUST NOT reset on a schema switch or bare `---`.
- Items MUST be emitted in wire order: the item with index *n* before the item with index *n+1*.
- A record item MUST carry a complete record value; a record-error item MUST carry no value.
- An item MUST NOT carry both a value and a recoverable error.
- The discriminant names the **protocol event** (record vs. record-error), not the payload's type.
  See ADR [0002](./decisions/0002-streamitem-kind-naming.md).
- Implementations MUST NOT introduce additional item kinds in v1. New metadata MAY be added only as
  optional, additive fields that do not change the meaning of the fields above.

## 6. Schema and state

- `schemaName` on an item reflects the **explicit** schema selector declared for that record's
  section (e.g. `$User`, or an explicit `$schema` selector), and when present MUST include the
  leading `$` sigil.
- If a record is validated only through the active default schema context and no explicit selector
  was declared, `schemaName` MUST be absent. Implementations MUST NOT synthesize a `schemaName`
  (e.g. `$schema`) merely because a default schema was active.
- Header-defined definitions become shared stream state and apply to later records.
- A schema switch changes parsing/serialization context; it does not by itself produce an item.
- All definition lookup, schema resolution, default handling, and member validation MUST be
  delegated to core. A reader MUST NOT embed its own copy of rules for `default`, `optional`,
  `null`, `choices`, or open-schema handling.
- A reader MAY be constructed with preloaded definitions and an optional fallback default schema
  context before any stream bytes are read. If none are supplied, the initial definitions state is
  empty.
- Precedence MUST match core's external-definitions behavior: in-stream header definitions override
  matching preloaded keys; an in-stream `$schema` overrides the fallback default schema context; if
  the stream defines no `$schema`, the fallback remains active.
- **The header MUST be buffered and resolved as a single atomic frame before any data record is
  processed.** Definition references are position-independent — a definition at any position may
  reference another regardless of order — so the header MUST NOT be resolved piecemeal. See ADR
  [0004](./decisions/0004-header-atomic-forward-references.md).
- Definitions are header-only in v1. After the first logical data record begins, the header phase is
  over; there is no normative midstream definition-mutation syntax.
- `--- $Name` MUST reference an already-defined schema. A switch to an unknown or invalid schema is a
  **fatal** stream error (§7). If no default schema exists, a bare `---` selects the schemaless
  default context rather than inventing a stream-only schema.

## 7. Error model

### 7.1 Error categories

Every error carries a **category** and a stable string **code**. The category is one of four values
and MUST be derived from the originating error **class**, not from any code-grouping (a code may sit in
one core grouping yet be raised as a different class — the class is authoritative):

| Category | Raised by | Class (JS binding) |
|---|---|---|
| `syntax` | tokenization or parsing failure | `IOSyntaxError` |
| `validation` | schema validation failure | `IOValidationError` |
| `general` | any other core error | base `IOError` |
| `stream` | transport/lifecycle failure raised by the streaming layer | `IOStreamError` |

The `syntax`, `validation`, and `general` categories and their codes are defined by Internet Object
**core**; streaming preserves them unchanged (§2). The `stream` category and its codes are defined here
(§7.3), because transport and lifecycle are streaming's own domain. Implementations MUST match on
**category + code**, never on human-readable message text — message text is non-contractual and MAY be
localized.

### 7.2 Disposition: recoverable vs. fatal

Disposition (what happens to iteration) is distinct from category (what the error is):

1. **Recoverable record errors** — localized to one logical record. The default and normative behavior
   is to emit one **record-error item** and continue to the next record. These carry a core category
   (`syntax`, `validation`, or `general`).
2. **Fatal stream errors** — invalid control state (invalid control frame, invalid header definitions,
   unknown schema switch), source/transport failure, cancellation, or buffer-limit overflow. These
   MUST terminate iteration (the binding signals this idiomatically — exception, rejected promise,
   error result) and MUST NOT be emitted as a record-error item. A fatal error MAY carry a **core**
   category (e.g. an unknown schema switch is fatal but preserves the core `validation` /
   `schema-not-defined` identity) or the **`stream`** category (§7.3).

Recoverable-error rules:

- Parse-time failures are boundary-based: when parsing fails for one record and recovery advances to
  the next `~`, `---`, or end of stream, that record produces **one** record-error item using the
  primary parse error for that boundary.
- Validation runs after a successful parse and MAY collect multiple errors for one record. The reader
  MUST still emit exactly **one** record-error item for that record; its public `error` is the
  **first** collected validation error in v1. See ADR [0007](./decisions/0007-first-validation-error-in-envelope.md).
- The emitted error MUST preserve core error identity: the same **category** (derived from the core
  error class per §7.1) and the same **code**. Streaming MUST NOT remap codes, collapse the category
  distinction, or invent a stream-local taxonomy for *core* errors.
- Error positions (row, column, offset) MUST be **stream-absolute** — measured from the start of the
  stream, identical to what the non-streaming parser reports for the equivalent whole document. The
  reader rebases each frame's local positions onto a running stream base across chunk and frame
  boundaries; it MUST NOT report record-relative positions. See ADR [0011](./decisions/0011-stream-absolute-error-positions.md).
- The reader MUST NOT emit partial record fragments before or instead of an error.
- If the source closes cleanly while a logical record is incomplete (a `~` frame began but end of
  stream arrived before the record could be fully parsed), the reader MUST emit one record-error item
  for the incomplete record, using the core parse error for truncated input (category `syntax`).
- Non-fatal core warnings MUST NOT be promoted to record-error items in v1.

### 7.3 Streaming fatal codes (`stream` category)

The streaming layer defines exactly these fatal codes in v1, all category `stream`:

| Code | Raised when |
|---|---|
| `stream-buffer-exceeded` | a single pending frame (one record, or the header) exceeds the implementation's buffer limit. The limit bounds one frame; crossing it means a correct record boundary can no longer be guaranteed. |
| `stream-source-error` | the underlying source or transport fails or errors. |
| `stream-aborted` | iteration is cancelled cooperatively (e.g. via an abort signal, §9). |

These are the only `stream`-category codes in v1. Every other fatal error preserves a **core** category
and code (unknown schema switch → `validation` / `schema-not-defined`; invalid header definitions →
`syntax`; partial frame at end of stream → `syntax`). This preserves the governing principle: streaming
defines codes only for its own transport/lifecycle domain; everything semantic stays core's.

See ADR [0008](./decisions/0008-recoverable-vs-fatal-errors.md).

## 8. Writer obligations

- The writer is responsible for canonical framing.
- A writer MUST serialize record values using core's serializer. It MUST NOT introduce stream-only
  formatting for strings, defaults, nulls, arrays, or objects.
- A writer MUST emit the header (if any) at most once, before the first data record, and MUST emit
  the `---` terminator per §4 (even for an empty header).
- A writer SHOULD emit a schema switch only when the effective schema changes.
- A writer MUST NOT emit midstream definition-mutation control frames in v1, nor unresolved/undefined
  schema switches.
- A writer MAY forward pre-framed Internet Object text verbatim (a "raw forward" capability). When it
  does, the caller is responsible for correct framing, and the writer's automatic schema-switch
  tracking is no longer reliable for subsequent structured writes — the next structured write MUST
  carry an explicit schema selector if the active schema may have changed. See ADR
  [0010](./decisions/0010-writer-raw-forward-and-record-granularity.md).
- Writer calls MUST be issued sequentially; the protocol does not define concurrent-write framing in
  v1.

## 9. Reader obligations and lifecycle

- A reader MUST process records incrementally and MUST NOT re-parse or re-materialize already-emitted
  records.
- A reader's memory growth MUST be bounded by pending undecoded bytes, the current incomplete frame
  (one record, or the header), and minimal lookahead — not total stream history.
- A reader MUST reuse accepted definitions and resolved schema objects across records; an unchanged
  schema context MUST NOT trigger repeated schema compilation.
- A reader is single-consumption in v1. Consuming it more than once has undefined behavior.
- A reader MUST be lazy: it advances the source only as the consumer requests the next item. This is
  what provides read-side backpressure for pull-based sources.
- On early termination by the consumer, the reader MUST release the underlying source (e.g. release a
  stream lock) and discard buffered-but-unemitted bytes.
- A reader SHOULD support cooperative cancellation. When cancelled, iteration terminates fatally and
  the source is released; cancellation MUST NOT emit a record-error item.

See ADR [0009](./decisions/0009-reader-lifecycle-and-cancellation.md).

## 10. Adapters and transports

- Adapters are transport bridges only. They MUST NOT bypass, replace, or fork core parsing,
  validation, or serialization.
- Adapters MUST preserve record order and MUST NOT invent, merge, or discard logical records.
- Adapters that consume bytes MUST preserve correctness across chunk boundaries (see §11).
- Adapters MUST NOT downgrade a fatal control-state error into a record-error item.
- A flow-controlled transport's write operation SHOULD resolve only after the transport has accepted
  the frame per that transport's backpressure model. A writer MUST honor that backpressure.

## 11. Encoding

- Byte sources MUST be decoded as UTF-8, preserving multibyte decoder state across chunk boundaries
  so a code point split across chunks decodes correctly.
- A leading UTF-8 byte-order mark (`EF BB BF`) at the very start of the stream MUST be stripped. A
  BOM-like sequence elsewhere is ordinary content and MUST NOT be stripped.
- Newlines MUST be normalized for framing: `\r\n` and a lone `\r` are treated as `\n`. Record framing
  MUST NOT depend on the producer's newline convention.
- Text sources are already-decoded text and MUST NOT be re-decoded as bytes.
- Newline normalization is a framing concern only and MUST NOT alter how core interprets bytes inside
  a quoted value.

## 12. Empty and degenerate inputs

- An empty source (zero bytes) MUST emit zero items and complete normally.
- A whitespace-only or blank-line-only source MUST emit zero items and complete normally.
- A header-only stream (definitions, then `---`, then end of stream with no records) MUST emit zero
  items and complete normally.
- A bare `~` with no payload (or `~` followed only by whitespace) MUST produce one record-error item
  using core's identity for a missing record value. It MUST NOT emit an empty success record.
- A trailing bare `---` with no following records MUST NOT emit an item and MUST NOT error.

## 13. Performance and backpressure

- A large same-schema stream MUST keep parsing incrementally without recompiling the schema per
  record and without retaining emitted records.
- Read-side backpressure is provided naturally by pull-based sources (§9). Push-based sources MAY lack
  producer backpressure; an implementation that offers a push source MUST document this and producers
  MUST apply their own flow control.

## 14. Conformance

An implementation is **conformant** if it satisfies every MUST/MUST NOT in this document and passes
the [`conformance/`](./conformance/) corpus. Implementations SHOULD also verify the **equivalence rule**
(§2) directly against their own core: streamed output must equal non-streamed core output for the same
input and definitions, including across arbitrary chunk boundaries.

## 15. Versioning

This is **Streaming Protocol v1**. The two-kind item model, the framing rules, and the error model are
frozen for v1. Additive, optional metadata is permitted (§5). Breaking changes require a new major
version. See [`README.md`](./README.md#versioning).

## 16. Decision history

Every significant decision in this document has an Architecture Decision Record in
[`decisions/`](./decisions/). Start there to understand the reasoning and history behind these rules.
