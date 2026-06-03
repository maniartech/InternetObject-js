# 0001. Delegate all data semantics to core (one semantic engine)
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§2](../PROTOCOL.md#2-relationship-to-core-governing-principle)

## Context
Internet Object core already defines every data semantic: types, coercion, validation, defaults, optional/null/choices, open vs closed schemas, serialization, and error identity. Streaming processes data incrementally, which tempts "local" decisions — applying a default here, classifying an error there. Any such local decision creates a SECOND semantic engine, and a second engine inevitably drifts from core.

## Decision
Streaming is strictly subordinate to core and reuses it. It never redefines, reinterprets, or overrides semantics. This is enforced by the equivalence rule (PROTOCOL §2): a streamed record must yield the same parsed value and the same error identity as the non-streaming core path, given the same text and definitions.

## Consequences
- Streamed output is guaranteed identical to non-streamed output.
- Streaming code stays a thin transport/envelope layer over core.
- The spec references core rather than restating it, because paraphrase is the drift vector.
- Convenience features that would invent semantics (e.g. a stream-only `$error` section) are forbidden.
