# Example: Callback-Driven Push Source

## Why This Example Exists

This example shows how restricted or browser-style runtimes can still participate in the record-based streaming contract even without direct `AsyncIterable` sources.

## What This Example Covers

- callback-driven source adaptation
- chunk boundaries as non-semantic transport details
- client-side progressive read behavior

## Server-Side Intent

The server emits ordinary streaming text over an evented transport such as progressive HTTP response delivery.

## Client-Side Intent

The client adapts callbacks into a push source and lets the reader own record boundaries, parsing, validation, and error semantics.

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

// callback layer pushes chunks as they arrive
push(chunk)

for await (const item of reader) {
  if (item.kind === 'record') {
    console.log(item.data.toJSON())
  }
}
```

## Expected Outcome

- records are emitted based on parser framing, not callback boundaries
- the same semantic results are produced whether a record arrives in one callback or several
- adapters do not reimplement parsing or validation

## What This Does Not Mean

- It does not mean the callback adapter may parse lines or members itself.
- It does not mean chunk boundaries create record boundaries.

## Related Contract

- [../PROTOCOL.md](../PROTOCOL.md)
- [../bindings/javascript.md](../bindings/javascript.md)
- [../../IMPLEMENTATION-GAPS.md](../../IMPLEMENTATION-GAPS.md)
