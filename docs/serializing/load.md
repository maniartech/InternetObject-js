# Load API

The `load()` and `loadDoc()` functions convert plain JavaScript/JSON data into validated Internet Object structures. This document covers the API, options, and usage patterns.

## Overview

```typescript
import { load, loadDoc } from 'internet-object';

// Load with explicit schema
const obj = load(data, '{ name: string, age: int }');

// Load with inferred schema
const obj = load(data, undefined, { inferDefs: true });

// Load as document (for stringify with header)
const doc = loadDoc(data, undefined, { inferDefs: true });
```

## Function Signatures

### `load()`

```typescript
// With explicit schema
function load(
  data: any,
  schema?: string | Schema,
  defs?: Definitions,
  errors?: Error[]
): InternetObject | Collection;

// With options
function load(
  data: any,
  schema?: string | Schema | Definitions,
  options?: LoadOptions
): InternetObject | Collection;

// With schema from definitions
function load(
  data: any,
  schemaName: string,
  definitions: Definitions,
  errors?: Error[]
): InternetObject | Collection;
```

### `loadDoc()`

```typescript
function loadDoc(
  data: any,
  schema?: string | Schema | Definitions,
  options?: LoadDocOptions
): Document;
```

## LoadOptions

```typescript
interface LoadOptions {
  /**
   * When true, infers definitions (schemas) from the input data structure.
   * This allows loading JSON data without explicitly providing a schema.
   *
   * The inferred definitions will include:
   * - `$schema` for the root object (default schema)
   * - Named schemas like `$borrowedBy`, `$address` for nested objects
   *
   * @default false
   */
  inferDefs?: boolean;
}
```

## Usage Examples

### Load with Explicit Schema

```typescript
import { load } from 'internet-object';

const data = { name: 'Alice', age: 28 };
const obj = load(data, '{ name: string, age: int }');

console.log(obj.get('name')); // 'Alice'
console.log(obj.get('age'));  // 28
```

### Load with Inferred Schema

```typescript
const data = { name: 'Alice', age: 28 };
const obj = load(data, undefined, { inferDefs: true });

// Schema is automatically inferred as:
// { name: string, age: number }
```

### Load Collection (Array)

```typescript
const users = [
  { name: 'Alice', age: 28 },
  { name: 'Bob', age: 35 }
];

const collection = load(users, '{ name: string, age: int }');

console.log(collection.length); // 2
console.log(collection.get(0).get('name')); // 'Alice'
```

### Load with Definitions

```typescript
import { Definitions, compileSchema, load } from 'internet-object';

const defs = new Definitions();
defs.push('$user', compileSchema('$user', '{ name: string, age: int }'), true, false);

const data = { name: 'Alice', age: 28 };
const obj = load(data, '$user', defs);
```

### Load Document (for Stringify with Header)

```typescript
import { loadDoc, stringify } from 'internet-object';

const data = {
  name: 'Alice',
  address: { city: 'NYC', zip: '10001' }
};

const doc = loadDoc(data, undefined, { inferDefs: true });

// Stringify with header (includes inferred definitions)
const text = stringify(doc, undefined, undefined, { includeHeader: true });
```

Output:
```
~ $address: {city: string, zip: string}
~ $schema: {name: string, address: $address}
---
Alice, {NYC, "10001"}
```

## Differences: `load()` vs `loadDoc()`

| Feature | `load()` | `loadDoc()` |
|---------|----------|-------------|
| Returns | `InternetObject` or `Collection` | `Document` |
| Has Header | No | Yes |
| Has Sections | No | Yes |
| Stringify with definitions | No | Yes (with `includeHeader: true`) |
| Use case | Data validation | Full IO document creation |

## Error Handling

### Missing Schema

```typescript
// Throws error if no schema provided and inferDefs is false
const obj = load(data);
// Error: "No schema provided or found in definitions. Use { inferDefs: true } to infer definitions from data."
```

### Validation Errors

```typescript
const data = { name: 'Alice', age: 'twenty-eight' };
const obj = load(data, '{ name: string, age: int }');
// Throws ValidationError: age must be an integer
```

## Schema Resolution

The `load()` function resolves schemas in this order:

1. **Explicit Schema** - String or Schema object passed directly
2. **Schema from Definitions** - If schema is a name like `'$user'`, looks up in definitions
3. **Default Schema** - If Definitions object has `defaultSchema`
4. **Inferred Schema** - If `inferDefs: true`, infers from data structure

## Type Coercion

When loading data, the library validates and coerces values according to the schema:

```typescript
// Schema: { name: string, age: int }
const data = { name: 'Alice', age: '28' };  // age is string
const obj = load(data, schema);
// obj.get('age') → 28 (coerced to int)
```

## Nested Objects and Arrays

### Nested Objects

```typescript
const data = {
  user: { name: 'Alice', email: 'alice@test.com' }
};

const schema = '{ user: { name: string, email: string } }';
const obj = load(data, schema);

obj.get('user').get('name'); // 'Alice'
```

### Arrays of Objects

```typescript
const data = {
  books: [
    { title: 'Book 1', year: 2020 },
    { title: 'Book 2', year: 2021 }
  ]
};

const schema = '{ books: [{ title: string, year: int }] }';
const obj = load(data, schema);

obj.get('books').get(0).get('title'); // 'Book 1'
```

## Complete Example

```typescript
import { loadDoc, stringify } from 'internet-object';

// Complex JSON data
const libraryData = {
  name: 'City Library',
  address: '123 Main St, Bookville',
  books: [
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: 1234567890,
      available: true
    },
    {
      title: '1984',
      author: 'George Orwell',
      isbn: 2345678901,
      available: false
    }
  ]
};

// Load as document with inferred schema
const doc = loadDoc(libraryData, undefined, { inferDefs: true });

// Stringify with header
const ioText = stringify(doc, undefined, undefined, { includeHeader: true });

console.log(ioText);
// Output:
// ~ $book: {title: string, author: string, isbn: number, available: bool}
// ~ $schema: {name: string, address: string, books: [$book]}
// ---
// City Library, "123 Main St, Bookville", [{The Great Gatsby, F. Scott Fitzgerald, 1234567890, T}, {"1984", George Orwell, 2345678901, F}]

// Round-trip: parse back the stringified output
const reparsed = IO.parse(ioText);
console.log(reparsed.data.get('name')); // 'City Library'
```

## See Also

- [Definitions Inference](./defs-inferrance.md) - How schemas are inferred
- [Type Inference](./type-inferrance.md) - How types are determined
- [Stringify API](./stringify/) - Converting back to IO text
