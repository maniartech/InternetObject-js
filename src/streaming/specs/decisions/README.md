# Architecture Decision Records

This directory holds Architecture Decision Records (ADRs) for the Internet Object streaming protocol, written in the [Michael Nygard ADR format](https://github.com/joelparkerhenderson/architecture-decision-record). Each ADR records WHY a particular design decision was made.

ADRs are **non-normative**. They capture rationale, not rules. The normative contract is [../PROTOCOL.md](../PROTOCOL.md); governance and document roles are described in [../README.md](../README.md).

ADRs are **immutable once Accepted**. To change a decision, do not edit the accepted ADR — add a new ADR that supersedes it, and set the old one's **Status** to `Superseded by NNNN`.

## Index

| ADR | Title | Summary |
| --- | --- | --- |
| [0001](0001-delegate-semantics-to-core.md) | Delegate all data semantics to core (one semantic engine) | Streaming reuses core for all data semantics and never invents a second engine. |
| [0002](0002-streamitem-kind-naming.md) | Name the item discriminant by protocol event, not payload type | Items are tagged `record` / `record-error` by outcome, not by payload type. |
| [0003](0003-mandatory-header-terminator.md) | Require an explicit `---` header terminator before the first data record | Writers always emit `---` so the first token is unambiguous and streaming is incremental. |
| [0004](0004-header-atomic-forward-references.md) | Resolve the header as a single atomic frame (forward references) | The header is buffered and resolved as one frame because definitions are position-independent. |
| [0005](0005-frame-splitting-over-incremental-parser.md) | Stream at record granularity; defer sub-record incremental parsing | Buffer one whole record and parse it with the batch engine; defer a resumable parser. |
| [0006](0006-tokenizestream-token-level-boundaries.md) | Detect record boundaries at the token level via the real tokenizer | Boundaries come from the tokenizer's own `~`/`---` tokens, not a second hand-rolled lexer. |
| [0007](0007-first-validation-error-in-envelope.md) | Surface the first collected validation error in the record-error item | The v1 item carries the first collected validation error; one record-error per record. |
| [0008](0008-recoverable-vs-fatal-errors.md) | Recoverable record errors are items; fatal stream errors terminate iteration | Bad records become items and continue; structural failures terminate iteration. |
| [0009](0009-reader-lifecycle-and-cancellation.md) | Reader lifecycle — single-consumption, lazy, releasing, cancellable | The reader is consumed once, pulls lazily, releases its source, and is cancellable. |
| [0010](0010-writer-raw-forward-and-record-granularity.md) | Writer raw-forward semantics and the whole-record development constraint | Raw forwarding bypasses schema tracking; whole-record writes are a temporary dev constraint. |
| [0011](0011-stream-absolute-error-positions.md) | Error positions are stream-absolute | Positions are measured from the start of the stream and rebased across frames, matching non-streaming parsing. |

> **Reader strict/lenient framing** (accepting a no-`---` stream as headerless data; treating a midstream
> `~ $Foo:` as a data record) is a *strict-mode* concern, not a streaming-only one. It is parked with all
> other strict options in the repo-level ADR
> [`docs/decisions/0001-defer-strict-validation-mode.md`](../../../../docs/decisions/0001-defer-strict-validation-mode.md).
> For v1 the reader stays lenient (spec-permitted per PROTOCOL §4/§5/§8).
