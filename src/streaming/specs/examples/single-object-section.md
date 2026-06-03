# Example: Single Object Section

## Why This Example Exists

This example shows the simplest successful streaming case: one plain object section producing one complete `IOObject` and nothing more.

## What This Example Covers

- one logical record
- one success item
- no tuple fragments or accidental collection behavior

## Server-Side Intent

The sender emits one ordinary object record using the standard framing rules.

## Client-Side Intent

The reader emits one success item carrying one complete `IOObject`.

## Wire Shape

```io
---
~ { id: 1, name: "Alice" }
```

The leading `---` is the header terminator emitted by `sendHeader()` — here it represents an empty header. It opens the data section explicitly, which is what lets the reader stream the record immediately instead of buffering to end of stream.

## Server Sketch

```ts
await writer.sendHeader()
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

- exactly one success item is emitted
- `item.data` is a complete `IOObject`
- `item.data.toJSON()` is `{ id: 1, name: 'Alice' }`

## What This Does Not Mean

- It does not mean the reader may emit internal `[key, value]` tuples.
- It does not mean one object section should be treated as a collection just because `IOObject` is iterable.
- It does not mean the leading `---` is optional in a stream. A conforming writer always emits it; omitting it produces the batch-legal form that parses but cannot be emitted incrementally.

## Related Contract

- [../PROTOCOL.md](../PROTOCOL.md)
- [../bindings/javascript.md](../bindings/javascript.md)
- [../../IMPLEMENTATION-GAPS.md](../../IMPLEMENTATION-GAPS.md)
