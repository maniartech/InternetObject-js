# 0011. Error positions are stream-absolute

- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§5](../../../../io-specs/streaming/stream-items.md "was PROTOCOL.md §5"), [§7](../../../../io-specs/streaming/error-model.md "was PROTOCOL.md §7"), [§11](../../../../io-specs/streaming/wire-format.md "was PROTOCOL.md §11")

## Context

Core errors carry a position (row, column, byte/char offset). In streaming, a record's text is parsed
out of a buffer that holds only the current frame, and the stream arrives in arbitrary chunks. So an
implementation has a choice for the position reported on a `record-error`:

- **record-relative** — coordinates measured from the start of the current record's text, or
- **stream-absolute** — coordinates measured from the start of the whole stream.

A naïve per-frame implementation would naturally produce record-relative positions, because the
tokenizer only ever sees the current frame's buffer. Leaving this unspecified would make positions
differ between implementations and between streamed vs. non-streamed parsing of the same document.

## Decision

Error positions reported by the streaming reader are **stream-absolute**: row, column, and offset are
measured from the beginning of the stream, exactly as the non-streaming parser would report them for the
equivalent whole document. The reader maintains a running base (lines, columns, byte/char offset)
across chunk and frame boundaries and rebases each frame's local positions onto it before emitting.

## Consequences

- Streamed and non-streamed parsing report identical positions for the same input — consistent with the
  equivalence rule ([§2](../../../../io-specs/streaming/README.md "was PROTOCOL.md §2")).
- The chunk-feedable tokenizer must carry and rebase position state across boundaries; it cannot reset
  per chunk (tracked as an implementation task).
- Newline normalization (`\r\n`/`\r` → `\n`, [§11](../../../../io-specs/streaming/wire-format.md "was PROTOCOL.md §11")) happens before position
  counting, so positions are consistent regardless of the producer's newline convention.
- A future binding that needs within-record offsets can derive them by subtracting the record's start
  position; the wire contract stays single and unambiguous.
