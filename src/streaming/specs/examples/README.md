# Streaming Examples

This directory contains scenario-based streaming examples.
These documents explain how the frozen streaming contract is intended to be used for real cases on both the server and client sides.

These files are explanatory, not normative.
If an example and [../PROTOCOL.md](../PROTOCOL.md) or [../bindings/javascript.md](../bindings/javascript.md) ever disagree, the normative protocol wins (see [../README.md](../README.md#normative-precedence)).

**These examples are executed in CI.** `tests/streaming/doc-examples.test.ts` harvests every `io` wire-shape
block here and streams it through the real reader across multiple chunkings (whole / per-line / per-byte),
asserting identical results; it also scans every `ts` snippet for removed/renamed API. So an example that
drifts from the implementation fails the test. Run them on demand with `npm run test:streaming`.

Use [../../IMPLEMENTATION-GAPS.md](../../IMPLEMENTATION-GAPS.md) for current runtime status and test-closure tracking.

## How To Use These Examples

- Start with [../PROTOCOL.md](../PROTOCOL.md) for the contract.
- Use these examples to understand how that contract applies to concrete scenarios.
- Use [../../IMPLEMENTATION-GAPS.md](../../IMPLEMENTATION-GAPS.md) to see what is not yet implemented.

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
