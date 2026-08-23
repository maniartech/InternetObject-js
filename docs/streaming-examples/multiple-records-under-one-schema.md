# Example: Multiple Records Under One Schema

## Why This Example Exists

This example shows the common case where one schema context remains active across several records, so the stream carries multiple logical records without repeated schema churn.

## What This Example Covers

- one explicit schema context
- multiple records under that context
- one emitted item per logical record

## Server-Side Intent

The sender activates one schema and emits several records under it.

## Client-Side Intent

The reader keeps the active schema context stable and emits one success item per record.

## Wire Shape

```io
~ $User: { name: string, age: int }
--- $User
~ Alice, 30
~ Bob, 25
```

## Server Sketch

```ts
await writer.sendHeader()
await writer.send({ name: 'Alice', age: 30 }, '$User')
await writer.send({ name: 'Bob', age: 25 }, '$User')
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

- two success items are emitted
- both items are complete `IOObject` instances
- both items report `schemaName === '$User'`

## What This Does Not Mean

- It does not mean one section should be emitted as one collection-shaped item.
- It does not mean the sender should repeat `--- $User` before every record when the effective schema has not changed.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](../../../io-specs/streaming/)
- the reasoning behind it: [streaming ADRs](../decisions/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
