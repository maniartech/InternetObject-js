# Example: Custom Transport

## Why This Example Exists

This example shows how a custom server-side transport can participate in the streaming contract as long as it preserves chunk ordering and reports transport acceptance correctly.

## What This Example Covers

- custom `send(chunk)` transport shape
- transport ordering expectations
- separation between framing logic and transport implementation

## Server-Side Intent

The sender uses a nonstandard transport, such as MQTT, a message bus, or another custom output channel, while still relying on the normal writer framing rules.

## Client-Side Intent

The receiver should still observe the same logical record behavior because the transport layer does not redefine parsing, schema, or record boundaries.

## Wire Shape

```io
---
~ { id: 1, name: "Alice" }
```

## Server Sketch

```ts
const transport = {
  async send(chunk) {
    await mqttClient.publishAsync('topic', chunk)
  },
}

const writer = createStreamWriter(transport)
await writer.send({ id: 1, name: 'Alice' })
```

## Client Sketch

```ts
for await (const item of createStreamReader(source)) {
  if (item.kind === 'record') {
    console.log(item.data.toJSON())
  }
}
```

## Expected Outcome

- the writer owns framing
- the custom transport preserves chunk order
- `send()` resolves when the transport has accepted the frame according to its contract

## What This Does Not Mean

- It does not mean the custom transport may reorder frames.
- It does not mean the transport should resolve `send()` early before acceptance if it claims backpressure-aware behavior.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](../../../io-specs/streaming/)
- the reasoning behind it: [streaming ADRs](../decisions/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
