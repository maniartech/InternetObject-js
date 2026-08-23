# 0005. Stream at record granularity; defer sub-record incremental parsing
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§1](../../../../io-specs/streaming/README.md "was PROTOCOL.md §1"), [§9](../../../../io-specs/streaming/readers-and-writers.md "was PROTOCOL.md §9"), [§13](../../../../io-specs/streaming/readers-and-writers.md "was PROTOCOL.md §13")

## Context
A true incremental (resumable) tokenizer/parser is a large, risky rewrite of the most correctness-critical code, and there are no consumers for it yet. Record-granularity streaming — buffer one complete record, then parse it with the existing batch engine — already covers the realistic majority of workloads, which are streams of many small or medium records. Only a single record too large to fit in memory would actually need sub-record incremental parsing.

## Decision
Stream at record granularity, using the existing batch parse engine per record. Defer sub-record (intra-record) incremental parsing until a concrete consumer needs to stream a single very large record.

## Consequences
- Reader memory is bounded by the largest single record.
- The core engine is untouched.
- The niche huge-single-record case is handled in the meantime by raising the buffer cap.
- Grammar invariants are kept so incremental parsing stays possible later, without a format change.
