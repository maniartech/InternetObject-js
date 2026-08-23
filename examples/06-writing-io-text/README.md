# Writing Internet Object text

Parsing turns text into values. `stringify` goes the other way.

```ts
const doc = load({ name: 'Alice', age: 30, city: 'NYC' }, defs);

stringify(doc);
// 'Alice, 30, NYC'
```

Only the values. The receiver already has the schema, so the names are not repeated on the wire — that is the compactness from example 02, arriving at the other end of the trip.

## When the receiver has no schema

Include the header and the document explains itself:

```ts
stringifyDocument(doc, { includeHeader: true });
// name: string, age: int, city?: string
// ---
// Alice, 30, NYC
```

## How much to spell out

`emitKeys` decides when a key is written beside its value:

| Mode | Writes | Use when |
| ---- | ------ | -------- |
| `none` | values only | smallest, and lossy if a name cannot be recovered |
| `extras` *(default)* | a key only when the schema cannot supply the name | almost always |
| `all` | every key | debugging, or a human will read it |

The default is the interesting one: it writes a key **only where one is needed** to read the value back. Lossless, and no larger than it has to be.

## It round-trips

Text → values → text gives back what you started with. That is not a hope; it is checked by a fuzzer over 24,000 generated documents on every release.

Next: **07 — Errors**.
