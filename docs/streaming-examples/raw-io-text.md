# Example: Raw IO Text — With And Without Header

## Why This Example Exists

This example shows how to send pre-formatted IO text through the streaming API without going through JS object serialization. It covers both the case where the IO text already contains a header section and the case where it contains only data records.

## What This Example Covers

- `sendRaw()` for pre-formatted IO text
- `pipeRaw()` for proxying an IO source
- `createStreamReader()` with a string source
- header-included vs. records-only raw text patterns

## Server-Side Intent

The sender has IO-formatted text already and wants to forward it to a transport without round-tripping through JS object serialization.

## Client-Side Intent

The reader receives and parses the stream exactly as it would for any other IO stream — raw text forwarding is invisible at the record level.

## Wire Shape: With Header

```io
~ $User: { name: string, age: int }
--- $User
~ Alice, 30
~ Bob, 25
~ Carol, 28
```

## Wire Shape: Records Only (header sent separately)

```io
---
~ Alice, 30
~ Bob, 25
~ Carol, 28
```

## Server Sketch: Text With Header

When the IO text already contains schema definitions, forward it as-is. No `sendHeader()` call.

```ts
const ioText = `~ $User: { name: string, age: int }
--- $User
~ Alice, 30
~ Bob, 25
~ Carol, 28
`

const writer = createStreamWriter(transport)
await writer.sendRaw(ioText)
```

## Server Sketch: Records Only

When the IO text contains only data records, emit the header first.

```ts
// defs contains $User: { name: string, age: int }
const writer = createStreamWriter(transport, defs)
await writer.sendHeader()
await writer.sendRaw('~ Alice, 30\n~ Bob, 25\n~ Carol, 28\n')
```

## Server Sketch: Proxy Forwarding

When acting as a proxy between an upstream IO stream and a downstream transport:

```ts
const writer = createStreamWriter(downstreamTransport)
await writer.pipeRaw(upstreamReadableStream)
```

## Client Sketch

```ts
for await (const item of createStreamReader(source)) {
  if (item.kind === 'record-error') {
    console.error(item.error)
    continue
  }

  console.log(item.schemaName, item.data.toJSON())
}
```

Reading from a string directly also works:

```ts
const ioText = `~ $User: { name: string, age: int }
--- $User
~ Alice, 30
~ Bob, 25
`

for await (const item of createStreamReader(ioText)) {
  console.log(item.data.toJSON())
}
```

## Expected Outcome

- three success items are emitted
- each item serializes to `{ name: '...', age: ... }` with schema validated values
- both "with header" and "records-only" patterns produce the same emitted items
- `schemaName === '$User'` on all items from the `--- $User` section

## What This Does Not Mean

- It does not mean `sendRaw()` validates or reserializes the text. The caller is responsible for correct framing.
- It does not mean calling both `sendHeader()` and `sendRaw()` with a header-containing document is valid; that produces a double header.
- It does not mean `pipeRaw()` inspects or validates the forwarded chunks.
- It does not mean the reader behaves differently for raw-forwarded streams versus streams built with `send()`.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](../../../io-specs/streaming/)
- the reasoning behind it: [streaming ADRs](../decisions/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
