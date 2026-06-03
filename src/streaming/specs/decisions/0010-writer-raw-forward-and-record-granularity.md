# 0010. Writer raw-forward semantics and the whole-record development constraint
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§8](../PROTOCOL.md#8-writer-obligations), [§10](../PROTOCOL.md#10-adapters-and-transports)

## Context
The writer offers a raw-forward capability: send pre-framed IO text verbatim, and pipe a source's chunks. Separately, until the parser supports sub-record incremental parsing (ADR 0005), it is simplest to constrain writers to emit whole records per write. That is a DEVELOPMENT constraint, not a wire/protocol constraint: byte transports (TCP, HTTP) fragment writes regardless, so the reader must tolerate arbitrary chunk splits no matter what the writer does.

## Decision
(a) A raw forward bypasses the writer's schema-switch tracking, so the next structured write must carry an explicit schema selector if the active schema may have changed; writer calls are sequential; a writer is poisoned after a transport rejection. (b) As a temporary development constraint, structured writers emit whole records per write; the raw pipe capability is exempt. The reader never relies on this constraint and must tolerate arbitrary byte splitting.

## Consequences
- A clear raw-forward contract.
- Simpler writer development now.
- The whole-record constraint is removable once sub-record incremental parsing lands.
- Reader robustness is unaffected, because it is independent of writer framing granularity.
