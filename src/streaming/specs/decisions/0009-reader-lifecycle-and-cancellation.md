# 0009. Reader lifecycle — single-consumption, lazy, releasing, cancellable
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§9](../PROTOCOL.md#9-reader-obligations-and-lifecycle)

## Context
A streaming reader needs defined lifecycle and cancellation semantics. Leaving them undefined risks leaked sources and surprising re-iteration behavior.

## Decision
The reader is single-consumption. It is lazy — it advances the source only on demand, providing read-side backpressure. On early termination by the consumer it releases the underlying source and discards buffered bytes. It supports cooperative cancellation: cancelling terminates iteration fatally and releases the source, and does NOT emit a record-error. A buffering convenience that drains the whole stream includes record-error items and fails on a fatal error.

## Consequences
- Predictable resource handling and cancellable streams.
- Natural pull-based backpressure.
- Re-iteration is undefined.
