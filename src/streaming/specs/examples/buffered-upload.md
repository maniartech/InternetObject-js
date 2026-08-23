# Example: Buffered Upload Or Full-Body Transport

## Why This Example Exists

This example shows how environments without progressive upload support can still use the streaming writer contract by buffering the wire text first.

## What This Example Covers

- buffered transport fallback
- writer-side serialization without changing wire semantics
- separation between framing behavior and transport capabilities

## Server-Side Intent

The sender writes a normal streaming payload shape but uses a buffer-oriented transport because the runtime requires a full request body.

## Client-Side Intent

The receiver still parses the resulting payload using the same record contract as any other stream text.

## Wire Shape

```io
---
~ { name: "Alice" }
~ { name: "Bob" }
```

## Server Sketch

```ts
const transport = new BufferTransport()
const writer = createStreamWriter(transport)

await writer.sendHeader()
await writer.send({ name: 'Alice' })
await writer.send({ name: 'Bob' })

const payload = transport.getOutput()
```

## Client Sketch

```ts
for await (const item of createStreamReader(payload)) {
  if (item.kind === 'record') {
    console.log(item.data.toJSON())
  }
}
```

## Expected Outcome

- buffered transport changes buffering strategy only
- the wire text still follows the same framing rules
- later readers parse the payload exactly as they would parse progressively received text

## What This Does Not Mean

- It does not mean buffered upload gives you backpressure-aware sending.
- It does not mean buffered output may use a different wire format from a progressive transport.

## Related Contract

- [../PROTOCOL.md](../PROTOCOL.md)
- [../bindings/javascript.md](../bindings/javascript.md)
- [../../IMPLEMENTATION-GAPS.md](../../IMPLEMENTATION-GAPS.md)
