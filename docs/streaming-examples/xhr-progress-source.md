# Example: XMLHttpRequest Progress Source

## Why This Example Exists

This example shows a browser-oriented client case where data arrives through `XMLHttpRequest` progress events instead of a native `AsyncIterable` source.

## What This Example Covers

- browser progress events
- chunk forwarding through `createPushSource()`
- reader-owned record boundaries and error behavior

## Server-Side Intent

The server emits ordinary streaming text over an HTTP response.

## Client-Side Intent

The browser client adapts `XMLHttpRequest` progress callbacks into a push source and lets the reader handle framing, parsing, validation, and error semantics.

## Wire Shape

```io
---
~ { id: 1, name: "Alice" }
~ { id: 2, name: "Bob" }
```

## Server Sketch

```ts
await writer.sendHeader()
await writer.send({ id: 1, name: 'Alice' })
await writer.send({ id: 2, name: 'Bob' })
```

## Client Sketch

```ts
const { source, push, close } = createPushSource()
const reader = createStreamReader(source)

const xhr = new XMLHttpRequest()
let seenChars = 0

xhr.onprogress = () => {
  const nextChunk = xhr.responseText.substring(seenChars)
  seenChars = xhr.responseText.length
  if (nextChunk) push(nextChunk)
}

xhr.onload = () => close()
xhr.onerror = () => close(new Error('Network error'))
```

## Expected Outcome

- callback boundaries do not become record boundaries
- complete records are still emitted in order
- transport-level errors reject the iterator

## What This Does Not Mean

- It does not mean the adapter should parse lines or object members.
- It does not mean each progress callback should yield exactly one stream item.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](../../../io-specs/streaming/)
- the reasoning behind it: [streaming ADRs](../decisions/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
