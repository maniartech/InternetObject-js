# Example: Preloaded Definitions And Fallback Default Schema Context

## Why This Example Exists

This example shows how applications can begin streaming with definitions they already know, while still allowing the stream header to override them using parser-compatible precedence rules.

## What This Example Covers

- preloaded definitions
- fallback default schema context
- in-stream override behavior

## Server-Side Intent

The sender emits records that assume a shared schema vocabulary already exists, and may also provide header definitions that override specific keys.

## Client-Side Intent

The reader begins with preloaded definitions and optional fallback default schema context, then merges the in-stream header using the same precedence rules as the normal parser path.

## Wire Shape

```io
~ $User: { name: string, active: bool }
---
~ Alice, T
```

## Server Sketch

```ts
const writer = createStreamWriter(transport, defs, { includeSchemas: true })

await writer.sendHeader()
await writer.send({ name: 'Alice', active: true })
```

## Client Sketch

```ts
const reader = createStreamReader(source, defs, { defaultSchema: '$User' })

for await (const item of reader) {
  if (item.kind === 'record') {
    console.log(item.data.toJSON())
  }
}
```

## Expected Outcome

- the reader may begin with preloaded `$User`
- if the header redefines `$User`, the in-stream definition wins for this stream
- if the stream does not redefine `$schema`, the fallback default schema context remains active

## What This Does Not Mean

- It does not mean preloaded definitions are ignored.
- It does not mean fallback default schema context overrides an in-stream `$schema`.

## Related Contract

- [../PROTOCOL.md](../PROTOCOL.md)
- [../bindings/javascript.md](../bindings/javascript.md)
- [../../IMPLEMENTATION-GAPS.md](../../IMPLEMENTATION-GAPS.md)
