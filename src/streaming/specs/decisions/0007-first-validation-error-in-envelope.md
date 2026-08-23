# 0007. Surface the first collected validation error in the record-error item
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§7](../PROTOCOL.md#7-error-model)

## Context
One successfully parsed record can fail multiple schema validations, but the public item carries only a single error.

## Decision
In v1, the record-error item's error is the FIRST collected validation error for that record, and exactly one record-error item is emitted per record regardless of how many validation errors core collected. Implementations may expose richer internal error sets through a separate channel.

## Consequences
- A stable single-error public contract.
- The parse-vs-validation distinction is still preserved.
- Full multi-error detail is out of the v1 envelope.
