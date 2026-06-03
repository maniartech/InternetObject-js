# Example: Multiple Validation Errors In One Parsed Record

## Why This Example Exists

This example shows that schema validation may collect multiple errors for one successfully parsed record, while the public iterator still emits one `record-error` item for that record.

## What This Example Covers

- post-parse validation failures
- one emitted `record-error` per parsed record
- first collected validation error as the public `error` value in v1

## Server-Side Intent

The sender emits one syntactically valid record that violates multiple schema rules.

## Client-Side Intent

The reader parses the record successfully, then reports one `record-error` item for that record after schema validation collects errors.

## Wire Shape

```io
~ $User: { name: string, age: int, active: bool }
--- $User
~ 123, "old", "yes"
```

## Server Sketch

```ts
await writer.sendHeader()
await writer.send({ name: 123, age: 'old', active: 'yes' } as any, '$User')
```

## Client Sketch

```ts
for await (const item of createStreamReader(source)) {
  if (item.kind === 'record-error') {
    console.error(item.error)
  }
}
```

## Expected Outcome

- parsing succeeds for one logical record
- validation may collect more than one core validation error internally
- the iterator emits exactly one `record-error` item for that record
- the public `error` field is the first collected validation error in v1

## What This Does Not Mean

- It does not mean the iterator emits one item per validation message.
- It does not mean parse-time and validation-time failures are collapsed into the same internal category.

## Related Contract

- [../PROTOCOL.md](../PROTOCOL.md)
- [../bindings/javascript.md](../bindings/javascript.md)
- [../../IMPLEMENTATION-GAPS.md](../../IMPLEMENTATION-GAPS.md)
