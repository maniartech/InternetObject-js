# 0008. Recoverable record errors are items; fatal stream errors terminate iteration
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§7](../../../../io-specs/streaming/error-model.md "was PROTOCOL.md §7")

## Context
Streaming has two error classes with different intent: a localized bad record, versus a structurally broken stream.

## Decision
A localized parse-time or validation failure produces one `record-error` item, and iteration continues. A fatal error — an invalid control frame, invalid header definitions, an unknown schema switch, a source/transport failure, or exceeding the single-frame buffer limit — terminates iteration and is NOT emitted as a record-error item. There is no implicit fail-fast for ordinary record-level validation failures.

## Consequences
- Bad records never kill the stream.
- Structural corruption does terminate it.
- The two classes never collapse into one taxonomy.
