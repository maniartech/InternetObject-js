# Streaming Examples

This directory contains scenario-based streaming examples.
These documents explain how the frozen streaming contract is intended to be used for real cases on both the server and client sides.

These files are explanatory, not normative. The contract is the streaming chapter of the
specification, [`io-specs/streaming/`](../../../io-specs/streaming/); if an example and the
specification ever disagree, the specification wins and the example is the bug.

**These examples are executed in CI.** `tests/streaming/doc-examples.test.ts` harvests every `io` wire-shape
block here and streams it through the real reader across multiple chunkings (whole / per-line / per-byte),
asserting identical results; it also scans every `ts` snippet for removed/renamed API. So an example that
drifts from the implementation fails the test. Run them on demand with `npm run test:streaming`.

> **Why this directory is under `docs/` and not `src/`.** It used to sit at
> `src/streaming/specs/examples/`, beside an in-repo copy of the protocol. That copy was superseded
> by io-specs and retired on 2026-08-23; the examples stayed, because they are executable and gated.
> The *why* behind the protocol's rules is in [`../decisions/streaming/`](../decisions/streaming/).

## How To Use These Examples

- Start with [`io-specs/streaming/`](../../../io-specs/streaming/) for the contract.
- Use these examples to understand how that contract applies to concrete scenarios.
- For the reasoning behind each rule, see the [streaming ADRs](../decisions/streaming/).

## Example Conventions

Each example should answer these questions:

- what problem the scenario solves
- what the wire text or framing looks like
- what the server is expected to send or coordinate
- what the client is expected to read or emit
- how schemas, defaults, and errors behave in that scenario
- what the example does not mean

## Current Example Set

- [single-object-section.md](./single-object-section.md): one complete `IOObject` from one plain object section
- [multiple-records-under-one-schema.md](./multiple-records-under-one-schema.md): multiple records under one explicit schema context
- [implicit-default-schema.md](./implicit-default-schema.md): records validated through default schema context without synthesizing `schemaName`
- [preloaded-definitions.md](./preloaded-definitions.md): preloaded definitions plus fallback default schema context
- [schema-switching.md](./schema-switching.md): switching between explicit schemas across records
- [recoverable-parse-error.md](./recoverable-parse-error.md): one parse-time bad record and continued iteration
- [multi-error-validation.md](./multi-error-validation.md): multiple validation errors on one parsed record mapping to one `record-error`
- [unknown-schema-switch-is-fatal.md](./unknown-schema-switch-is-fatal.md): invalid control-state change causing fatal iterator rejection
- [callback-push-source.md](./callback-push-source.md): callback-driven or browser event sources
- [xhr-progress-source.md](./xhr-progress-source.md): `XMLHttpRequest` progress-event streaming on the client
- [full-response-restricted-runtime.md](./full-response-restricted-runtime.md): restricted runtimes that only expose the full body at once
- [buffered-upload.md](./buffered-upload.md): environments without streaming uploads
- [custom-transport.md](./custom-transport.md): custom `send(chunk)` transports and ordering expectations
- [node-backpressure.md](./node-backpressure.md): flow-controlled server transports
- [raw-io-text.md](./raw-io-text.md): forwarding pre-formatted IO text with `sendRaw()` and `pipeRaw()`, with and without a header section

## Template

Use [TEMPLATE.md](./TEMPLATE.md) when adding a new scenario example.
