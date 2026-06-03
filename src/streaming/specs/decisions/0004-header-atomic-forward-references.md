# 0004. Resolve the header as a single atomic frame (forward references)
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§6](../PROTOCOL.md#6-schema-and-state)

## Context
Header definitions are position-independent: a definition at any position may reference another regardless of order. Core collects all definitions first and then compiles them, so a reference at position 2 can resolve to a definition at position 5. Resolution therefore requires every definition to be present.

## Decision
The reader buffers and resolves the entire header as one atomic frame before processing any data record. The header is never released or resolved piecemeal, and it counts against the single-frame buffer limit like any other pending frame.

## Consequences
- The header cannot be streamed incrementally — which is correct, given forward references.
- An oversized header hits the same fatal buffer cap as any other frame.
- Only data records stream.
