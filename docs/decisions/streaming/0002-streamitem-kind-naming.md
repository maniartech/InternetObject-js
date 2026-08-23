# 0002. Name the item discriminant by protocol event, not payload type
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§5](../../../../io-specs/streaming/stream-items.md "was PROTOCOL.md §5")

## Context
The reader emits a two-variant item. The discriminant could be named by payload TYPE (e.g. `iobject` / `ioerror`) or by protocol OUTCOME (`record` / `record-error`).

## Decision
Name the discriminant by protocol event: `record` (success) and `record-error` (recoverable failure).

## Consequences
- The payload type is already conveyed by the field types and recovered by narrowing, so a type-named tag would be redundant.
- `record-error` scopes the error to record level and distinguishes it from a FATAL error — which is also an error value but rejects iteration. A name like `ioerror` could not draw that distinction.
- It stays consistent with the `recordIndex` vocabulary used elsewhere in the protocol.
- It remains stable even if core renames its underlying value/error types.
