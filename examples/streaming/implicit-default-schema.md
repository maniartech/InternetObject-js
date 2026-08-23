# Example: Implicit Default Schema

## Why This Example Exists

This example shows that a record can be fully schema-validated through the active default schema context even when the wire text does not declare an explicit schema switch for that record.

## What This Example Covers

- default-schema validation
- `schemaName === undefined` for implicitly inherited schema context
- no synthetic `--- $schema` visibility in emitted items

## Server-Side Intent

The sender relies on the default schema context instead of emitting a visible schema switch for every record.

## Client-Side Intent

The reader validates the record using the active default schema context and emits a normal success item without inventing a `schemaName` value.

## Wire Shape

```io
~ $schema: { name: string, active: { bool, default: T } }
---
~ Alice
```

## Server Sketch

```ts
const writer = createStreamWriter(transport, defs)

await writer.sendHeader()
await writer.send({ name: 'Alice' })
```

## Client Sketch

```ts
const reader = createStreamReader(source)

for await (const item of reader) {
  if (item.kind === 'record') {
    console.log(item.schemaName)
    console.log(item.data.toJSON())
  }
}
```

## Expected Outcome

- the record is validated against the default schema
- `active` is filled by the inherited schema default
- the success item may keep `schemaName === undefined`
- the item is still a fully qualified `IOObject`

## What This Does Not Mean

- It does not mean validation is skipped when no explicit schema name is visible.
- It does not mean the reader should synthesize `schemaName: '$schema'` just to expose default-schema validation.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](https://docs.internetobject.org/streaming/)
- the reasoning behind it: [streaming ADRs](https://docs.internetobject.org/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
