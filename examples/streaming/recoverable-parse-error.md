# Example: Recoverable Parse-Time Bad Record

## Why This Example Exists

This example shows how the reader should recover when one logical record is malformed but later records are still readable.

## What This Example Covers

- parse-time bad record boundaries
- one `record-error` item for one bad parsed record boundary
- continued iteration after recovery

## Server-Side Intent

The sender emits a stream where one record becomes malformed in transit or due to producer error.

## Client-Side Intent

The reader reports the bad record as one `record-error` item and continues at the next collection boundary when recovery is possible.

## Wire Shape

```io
---
~ { id: 1 }
~ { BROKEN
~ { id: 2 }
```

## Server Sketch

```ts
// conceptual example of malformed stream content
```

## Client Sketch

```ts
for await (const item of createStreamReader(source)) {
  if (item.kind === 'record-error') {
    console.error(item.error)
    continue
  }

  console.log(item.data.toJSON())
}
```

## Expected Outcome

- `{ id: 1 }` is emitted as a success item
- the broken record is emitted as one `record-error` item
- `{ id: 2 }` is still emitted later as a success item
- the parse error preserves core parse identity

## What This Does Not Mean

- It does not mean every parser diagnostic becomes its own stream item.
- It does not mean the bad record may leak partial object fragments before the error item.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](https://docs.internetobject.org/streaming/)
- the reasoning behind it: [streaming ADRs](https://docs.internetobject.org/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
