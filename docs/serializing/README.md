# Serializing

This section covers the serialization features of Internet Object - converting between JavaScript/JSON data and IO text format.

## Contents

- [Load API](./load.md) - Loading JavaScript/JSON data into IO structures
- [Stringify API](./stringify/) - Converting IO structures back to text
- [Definitions Inference](./defs-inferrance.md) - Automatic schema generation from data
- [Type Inference](./type-inferrance.md) - How types are determined for values

## Quick Start

### JSON to IO (with Schema Inference)

```typescript
import { loadDoc, stringify } from 'internet-object';

// Your JSON data
const jsonData = {
  name: 'Alice',
  age: 28,
  address: { city: 'NYC', zip: '10001' }
};

// Load as document with inferred schema
const doc = loadDoc(jsonData, undefined, { inferDefs: true });

// Stringify to IO format (with header)
const ioText = stringify(doc, undefined, undefined, { includeHeader: true });

console.log(ioText);
// Output:
// ~ $address: {city: string, zip: string}
// ~ $schema: {name: string, age: number, address: $address}
// ---
// Alice, 28, {NYC, "10001"}
```

### IO to JSON

```typescript
import IO from 'internet-object';

const ioText = `
~ $address: {city: string, zip: string}
~ $schema: {name: string, age: int, address: $address}
---
Alice, 28, {NYC, "10001"}
`;

const doc = IO.parse(ioText);
const json = doc.toJSON();

console.log(JSON.stringify(json, null, 2));
// {
//   "name": "Alice",
//   "age": 28,
//   "address": { "city": "NYC", "zip": "10001" }
// }
```

## Key Features

### 1. Schema Inference

Automatically generate IO schema definitions from JavaScript data:

```typescript
const data = { user: { name: 'Alice', roles: ['admin', 'user'] } };
const doc = loadDoc(data, undefined, { inferDefs: true });
// Generates $user schema with nested structure
```

### 2. Round-Trip Safety

Stringified output can be parsed back to identical values:

```typescript
const doc = loadDoc(jsonData, undefined, { inferDefs: true });
const text = stringify(doc, undefined, undefined, { includeHeader: true });
const reparsed = IO.parse(text);
// reparsed.toJSON() equals original jsonData
```

### 3. Smart String Formatting

The `auto` format mode intelligently quotes strings when necessary:

- `"1984"` - Quoted (looks like number)
- `"true"` - Quoted (looks like boolean)
- `hello` - Unquoted (safe)
- `"a, b"` - Quoted (contains comma)

### 4. Named Schema References

Nested objects generate reusable named schemas:

```
~ $address: {city: string, zip: string}
~ $user: {name: string, address: $address}
~ $schema: {users: [$user]}
```

## API Summary

| Function | Purpose |
|----------|---------|
| `load(data, schema, options)` | Load data into InternetObject/Collection |
| `loadDoc(data, schema, options)` | Load data into Document (with header) |
| `stringify(value, schema, defs, options)` | Convert to IO text |
| `inferDefs(data)` | Generate schema definitions from data |

## Options Reference

### LoadOptions

```typescript
interface LoadOptions {
  inferDefs?: boolean;  // Infer schema from data structure
}
```

### StringifyOptions

```typescript
interface StringifyOptions {
  indent?: number | string;  // Pretty printing
  skipErrors?: boolean;      // Skip error objects in collections
  includeTypes?: boolean;    // Include type annotations
  includeHeader?: boolean;   // Include header with definitions
}
```

## See Also

- [Internet Object Specification](https://internetobject.org)
- [Quick Reference](../../QUICK-REFERENCE.md)
