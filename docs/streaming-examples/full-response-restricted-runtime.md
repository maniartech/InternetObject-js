# Example: Full Response In A Restricted Runtime

## Why This Example Exists

This example shows the fallback client case where the runtime cannot expose incremental streaming reads and only returns the full response body at once.

## What This Example Covers

- one-shot response body handling
- reader reuse over a full text payload
- identical record semantics despite non-streaming transport access

## Server-Side Intent

The server still emits the same streaming-compatible text format.

## Client-Side Intent

The client feeds the full body text into the reader as one chunk and still gets record-based semantics.

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
const responseText = await fetchTextSomehow()

for await (const item of createStreamReader(responseText)) {
  if (item.kind === 'record') {
    console.log(item.data.toJSON())
  }
}
```

## Expected Outcome

- the same logical records are emitted as if the body had arrived progressively
- record semantics remain parser-controlled, not transport-controlled
- this remains useful for restricted runtimes even though it is not incrementally streaming on the client side

## What This Does Not Mean

- It does not mean the runtime suddenly gains progressive streaming behavior.
- It does not mean the reader should switch to different parsing or validation semantics just because the body arrived all at once.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](../../../io-specs/streaming/)
- the reasoning behind it: [streaming ADRs](../decisions/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
