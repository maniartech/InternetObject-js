# 0003. Require an explicit `---` header terminator before the first data record
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§4](../PROTOCOL.md#4-wire-format-and-framing)

## Context
In the grammar, the first section is the header iff a `---` follows it. A leading run of `~` items is therefore ambiguous — header vs. headerless data — until the first `---` or the end of stream is seen. For streaming this defeats incremental emission: a pure-data stream with no `---` must buffer to EOF, and it risks reinterpreting "header" as "data" at the end.

## Decision
A conforming writer must emit an explicit `---` (or `--- $Schema`) before the first data record, even when the header is empty — an empty header serializes to exactly `---`. The reader still tolerates the no-`---` batch form for equivalence, but that form cannot stream incrementally, and writers must not emit it.

## Consequences
- The first token is unambiguous: `---` means stream data now; `~` means buffer the header until a `---` arrives.
- Streams are incremental from the first record.
- The reference writer already emits this via its header step.
- Batch documents that omit `---` still parse.
