# Example: Explicit Schema Switching

## Why This Example Exists

This example shows how one stream can carry multiple record types while keeping schema changes explicit and deterministic.

## What This Example Covers

- explicit `--- $Name` schema changes
- one logical record per `~`
- writer-side schema switching and reader-side schema context tracking

## Server-Side Intent

The sender emits records from different schemas and only switches schema when the effective schema actually changes.

## Client-Side Intent

The reader tracks explicit schema switches, validates each record under the correct schema, and never emits control frames as data items.

## Wire Shape

```io
~ $User: { name: string }
~ $Order: { id: int }
--- $User
~ Alice
--- $Order
~ 1001
```

## Server Sketch

```ts
await writer.sendHeader()
await writer.send({ name: 'Alice' }, '$User')
await writer.send({ id: 1001 }, '$Order')
```

## Client Sketch

```ts
for await (const item of createStreamReader(source)) {
  if (item.kind === 'record') {
    console.log(item.schemaName, item.data.toJSON())
  }
}
```

## Expected Outcome

- the first success item reports `schemaName === '$User'`
- the second success item reports `schemaName === '$Order'`
- `--- $User` and `--- $Order` are never emitted as data items

## What This Does Not Mean

- It does not mean the writer should re-emit schema switches when the effective schema has not changed.
- It does not mean an unknown schema switch is recoverable; it is fatal.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](https://docs.internetobject.org/streaming/)
- the reasoning behind it: [streaming ADRs](https://docs.internetobject.org/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
