# Example: Unknown Schema Switch Is Fatal

## Why This Example Exists

This example shows a control-state failure. The stream attempts to switch to an undefined schema, which is not a recoverable record error.

## What This Example Covers

- invalid control-state change
- fatal iterator rejection
- no `record-error` item for the control frame itself

## Server-Side Intent

The sender should never emit unresolved schema switches. This example documents the failure mode when that rule is broken.

## Client-Side Intent

The reader rejects the iterator instead of pretending the error is just another bad record.

## Wire Shape

```io
--- $Missing
~ Alice
```

## Server Sketch

```ts
// conceptual invalid stream state
```

## Client Sketch

```ts
try {
  for await (const item of createStreamReader(source)) {
    console.log(item)
  }
} catch (error) {
  console.error(error)
}
```

## Expected Outcome

- the iterator rejects before `Alice` is emitted
- the failure preserves core undefined-schema identity
- no `record-error` item is emitted for the invalid control frame

## What This Does Not Mean

- It does not mean all failures are recoverable record errors.
- It does not mean the reader may silently fall back to default schema context for `--- $Missing`.

## Related Contract

- the streaming specification: [`io-specs/streaming/`](../../../io-specs/streaming/)
- the reasoning behind it: [streaming ADRs](../decisions/streaming/)
- the JavaScript API: [README](../../README.md#9-streaming-api-chunked-io)
