# JavaScript / TypeScript Binding

This document describes how the JavaScript reference implementation exposes the Internet Object
streaming protocol. It implements **Streaming Protocol v1** ([`../PROTOCOL.md`](../PROTOCOL.md)).

This binding is **non-normative**. All semantics — framing, the item model, schema/state, the error
model, lifecycle — are defined by [`../PROTOCOL.md`](../PROTOCOL.md). Where this document and the
protocol appear to differ, the protocol governs. This file only specifies the JavaScript-shaped API
and how core JS types map onto the protocol's abstract model.

## Public API surface

### Reader

```ts
function createStreamReader(
  source: IOStreamSource,
  definitions?: Definitions | null,
  options?: StreamReaderOptions
): IOStreamReader

type StreamChunk = string | Uint8Array | ArrayBuffer

type IOStreamSource =
  | string                          // full IO text as one in-memory stream
  | Iterable<StreamChunk>
  | AsyncIterable<StreamChunk>
  | ReadableStream<Uint8Array>

interface StreamReaderOptions {
  defaultSchema?: string            // fallback schema when the stream header has no $schema
  maxBufferedChars?: number         // hard cap on a single pending frame; default 2_000_000
  signal?: AbortSignal              // cancels iteration and releases the source
}

class IOStreamReader implements AsyncIterable<StreamItem> {
  collect(): Promise<StreamItem[]>  // buffers the whole stream; for tests, not production
}
```

### The `StreamItem` shape (protocol §5)

The protocol's two-kind item model is realized as a discriminated union:

```ts
type StreamItem =
  | { kind: 'record';       recordIndex: number; schemaName?: string; data: IOObject; error: undefined }
  | { kind: 'record-error'; recordIndex: number; schemaName?: string; data: null;     error: IOError  }
```

- `kind` is the protocol's event discriminant (record vs. record-error), not a payload-type name —
  see ADR [0002](../decisions/0002-streamitem-kind-naming.md).
- `data` on a success item is the protocol's "record value": a complete `IOObject`.
- All field semantics (`recordIndex`, `schemaName` presence/sigil, ordering, single-error-per-record)
  are defined in [protocol §5](../PROTOCOL.md#5-the-stream-item-model) and [§6](../PROTOCOL.md#6-schema-and-state).

### Writer

```ts
function createStreamWriter(
  transport: IOStreamTransport,
  definitions?: Definitions | null,
  options?: StreamWriterOptions
): IOStreamWriter

interface IOStreamTransport {
  send(chunk: string | Uint8Array): void | Promise<void>
}

interface StreamWriterOptions {
  includeSchemas?: boolean   // emit schema definitions in the header; default true
}

class IOStreamWriter {
  getHeader(): string
  sendHeader(): Promise<void>
  write(data: object, schemaName?: string): string       // formats one record; no transport call
  writeBatch(items: object[], schemaName?: string): string
  send(data: object, schemaName?: string): Promise<void>
  sendBatch(items: object[], schemaName?: string): Promise<void>
  sendRaw(ioText: string): Promise<void>                 // forwards pre-framed IO text verbatim
  pipeRaw(source: IOStreamSource): Promise<void>         // forwards all chunks from a source
}
```

### Push source

```ts
function createPushSource(): {
  source: AsyncIterable<StreamChunk>
  push: (chunk: StreamChunk) => void
  close: (error?: Error) => void
}
```

## Core type mapping

The protocol speaks of an abstract "record value" and "error identity." In this binding:

- **Record value** ↔ `IOObject` (`src/core/internet-object`), produced by the core `parse` →
  schema-processing path. The streaming layer only consumes it; it never constructs one. Its
  interface (accessors, `toJSON`, iteration) is core's; this binding does not restate it.
- **Error identity** ↔ the error classes. The protocol's four categories ([§7.1](../PROTOCOL.md#7-error-model))
  map to classes, **not** to any field:

  | Category | Class |
  |---|---|
  | `syntax` | `IOSyntaxError` |
  | `validation` | `IOValidationError` |
  | `general` | base `IOError` |
  | `stream` | `IOStreamError` (streaming-owned; `IOStreamError extends IOError`) |

  The **error code** is `error.errorCode`: a core `ErrorCodes` value (`src/errors/io-error-codes`) for
  the first three categories, or a streaming code for `stream` — `stream-buffer-exceeded`,
  `stream-source-error`, `stream-aborted` (protocol §7.3). The **position** (`error.positionRange`) is
  stream-absolute, matching non-streaming parsing (protocol §7, ADR 0011).

  > Note: core's error-node `toValue`/`toJSON` projects the base-`IOError` category as `general`, matching
  > this table and the protocol vocabulary. (Earlier builds emitted `"runtime"`; that label was reconciled
  > to `general` — see [`../../../errors/FINALIZATION.md`](../../../errors/FINALIZATION.md).)
- **Fatal vs. recoverable** (protocol §7.2): a recoverable failure is a `record-error` item; a fatal
  stream error rejects the async iterator (a thrown/rejected error — an `IOStreamError` for the
  `stream` category, or the original core error for a fatal core failure such as an unknown schema switch).

## Lifecycle in JS terms (protocol §9)

- The reader is an `AsyncIterable` consumed once.
- `for await … of` provides lazy, pull-based read backpressure.
- `break`/`return`/`throw` in the loop runs the iterator's `return()`, which releases the source.
- `options.signal` (an `AbortSignal`) cancels: the iterator rejects at the next pull and releases the
  source; it does not emit a `record-error`.
- `collect()` consumes to completion, includes `record-error` items, and rejects on a fatal error.

## Adapters (transport bridges)

Adapters bridge transport constraints into the protocol; they never change record semantics
(protocol §10). See the protocol for the binding obligations; the helpers below are the JS-specific
bridges.

### Reading from any source

`createStreamReader` accepts a `string`, `Iterable`, `AsyncIterable` (Node streams), or a Web
`ReadableStream<Uint8Array>`. For callback/event-driven sources, use `createPushSource()` to bridge
into an `AsyncIterable`.

```ts
import { createStreamReader } from 'internet-object';

const reader = createStreamReader(source, defs, { defaultSchema: '$User' });
for await (const item of reader) {
  if (item.kind === 'record-error') { console.error(item.error); continue; }
  console.log(item.data.toJSON());
}
```

`defs` is preloaded definitions; `defaultSchema` is the fallback used only when the stream declares no
`$schema` (protocol §6).

### `XMLHttpRequest` (progress events)

```ts
import { createPushSource, createStreamReader } from 'internet-object';

const { source, push, close } = createPushSource();
const stream = createStreamReader(source);

(async () => {
  for await (const item of stream) {
    if (item.kind === 'record-error') { console.error(item.error); continue; }
    console.log(item.data.toJSON());
  }
})();

const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/stream');
let seen = 0;
xhr.onprogress = () => { const next = xhr.responseText.substring(seen); seen = xhr.responseText.length; if (next) push(next); };
xhr.onload = () => close();
xhr.onerror = () => close(new Error('Network error'));
xhr.send();
```

> Note: `createPushSource()` has an unbounded internal queue and does not propagate read-side
> backpressure to the producer (protocol §13). Apply your own flow control before `push()`.

### Buffered upload (`BufferTransport`)

Use `BufferTransport` when the environment needs the full payload before sending. It changes the
buffering strategy only; it MUST NOT change the wire format (protocol §8).

```ts
import { BufferTransport, createStreamWriter } from 'internet-object';

const transport = new BufferTransport();
const writer = createStreamWriter(transport);
await writer.sendHeader();
await writer.send({ name: 'Alice' });
await writer.send({ name: 'Bob' });
const payload = transport.getOutput();
await fetch('/api/upload', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/internet-object' } });
```

### Custom transports

A custom transport needs only `send(chunk)`. If it is asynchronous/backpressure-aware, `send()` should
resolve when the frame has been accepted (protocol §10).

```ts
const myTransport = { async send(chunk) { await mqttClient.publishAsync('topic', chunk); } };
const writer = createStreamWriter(myTransport);
await writer.send({ id: 1, name: 'Alice' });
```

### Raw forwarding (`sendRaw` / `pipeRaw`)

`sendRaw(ioText)` forwards pre-framed IO text verbatim; `pipeRaw(source)` forwards a source's chunks.
Per protocol §8, the caller owns framing, and a raw write makes the writer's schema tracking
unreliable — pass an explicit `schemaName` to the next structured `send()`. Two patterns:

```ts
// (1) text already includes a header — do not call sendHeader()
await writer.sendRaw(`~ $User: { name: string, age: int }\n--- $User\n~ Alice, 30\n~ Bob, 25\n`);

// (2) records only — establish header first
await writer.sendHeader();
await writer.sendRaw('~ Alice, 30\n~ Bob, 25\n~ Carol, 28\n');
```

## Practical guidance

- Prefer `createStreamReader(source)` over consuming parser internals.
- Prefer `send()` / `sendBatch()` for JS objects; use `sendRaw()` / `pipeRaw()` for pre-framed text.
- Use `createPushSource()` for callback-driven sources; `BufferTransport` only when the environment
  cannot stream uploads progressively.
- Treat record errors and fatal errors differently: record errors are `record-error` items; invalid
  stream state rejects the iterator (protocol §7).
- Keep sender and receiver aligned on record boundaries, not raw chunks.

## Runtime status

Gaps between this binding's current runtime and the protocol are tracked in
[`../../IMPLEMENTATION-GAPS.md`](../../IMPLEMENTATION-GAPS.md).
