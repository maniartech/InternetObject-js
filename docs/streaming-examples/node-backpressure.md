# Example: Backpressure-Aware Server Transport

## Why This Example Exists

This example shows the intended server-side behavior when the underlying transport is flow-controlled and cannot accept unlimited writes immediately.

## What This Example Covers

- transport acceptance versus fire-and-forget writes
- ordered record sending under load
- backpressure as a correctness property, not just a performance detail

## Server-Side Intent

The server writes records to a flow-controlled transport and waits for transport acceptance before considering each send complete.

## Client-Side Intent

The client should observe correct ordering and complete records, even when the server experiences transport pressure.

## Wire Shape

```io
~ $Order: { id: int }
--- $Order
~ 1001
~ 1002
~ 1003
```

## Server Sketch

```ts
// defs contains $Order: { id: int }
const writer = createStreamWriter(transport, defs)
await writer.sendHeader()
await writer.send({ id: 1001 }, '$Order')
await writer.send({ id: 1002 }, '$Order')
await writer.send({ id: 1003 }, '$Order')
```

## Client Sketch

```ts
for await (const item of createStreamReader(source)) {
  if (item.kind === 'record') {
    console.log(item.recordIndex, item.data.toJSON())
  }
}
```

## Expected Outcome

- server sends remain ordered
- `send()` resolves only after transport acceptance under the transport contract
- client still observes complete records in order

## What This Does Not Mean

- It does not mean the server may ignore transport backpressure because writes eventually succeed.
- It does not mean backpressure should change record framing or item semantics.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](../../../io-specs/streaming/)
- the reasoning behind it: [streaming ADRs](../decisions/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
