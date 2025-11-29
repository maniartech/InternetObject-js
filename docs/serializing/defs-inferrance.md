# Definitions Inference

The definitions inference system automatically generates Internet Object schema definitions from plain JavaScript/JSON data. This enables seamless conversion of JSON to IO format without manually writing schemas.

## Overview

When you have JSON data and want to convert it to IO format, you can use the `inferDefs` option with `load()` or `loadDoc()` functions. The system analyzes the data structure and creates appropriate schema definitions.

## API

### `load()` with `inferDefs`

```typescript
import { load } from 'internet-object';

const jsonData = {
  name: 'Alice',
  age: 28,
  address: { city: 'NYC', zip: '10001' }
};

// Load with inferred definitions
const obj = load(jsonData, undefined, { inferDefs: true });
```

### `loadDoc()` with `inferDefs`

Use `loadDoc()` when you need the complete document structure with header definitions for stringification:

```typescript
import { loadDoc, stringify } from 'internet-object';

const jsonData = {
  name: 'Alice',
  age: 28,
  address: { city: 'NYC', zip: '10001' }
};

// Load as document with inferred definitions
const doc = loadDoc(jsonData, undefined, { inferDefs: true });

// Stringify with header (includes definitions)
const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
```

Output:
```
~ $address: {city: string, zip: string}
~ $schema: {name: string, age: number, address: $address}
---
Alice, 28, {NYC, "10001"}
```

## How Inference Works

### Type Mapping

JavaScript types are mapped to IO types:

| JavaScript Type | IO Type |
|----------------|---------|
| `string` | `string` |
| `number` | `number` |
| `boolean` | `bool` |
| `null` | `any` (nullable) |
| `Date` | `date` |
| `Array` | `array` or `[$itemSchema]` |
| `Object` | Named schema reference |

### Named Schema Generation

Nested objects automatically generate named schema definitions:

```typescript
const data = {
  user: { name: 'Alice', email: 'alice@test.com' },
  settings: { theme: 'dark', lang: 'en' }
};

// Generates:
// ~ $user: {name: string, email: string}
// ~ $settings: {theme: string, lang: string}
// ~ $schema: {user: $user, settings: $settings}
```

### Array Item Schemas

Arrays of objects generate item schemas with singularized names:

```typescript
const data = {
  books: [
    { title: 'Book 1', author: 'Author 1' },
    { title: 'Book 2', author: 'Author 2' }
  ]
};

// Generates:
// ~ $book: {title: string, author: string}
// ~ $schema: {books: [$book]}
```

## Root-Level Arrays (Collections)

When the input is a root-level array, it is treated as an **IO Collection**:

```typescript
const users = [
  { name: 'Alice', age: 28 },
  { name: 'Bob', age: 35 }
];

const doc = loadDoc(users, undefined, { inferDefs: true });

// Generates:
// ~ $schema: {name: string, age: number}
// ---
// ~ Alice, 28
// ~ Bob, 35
```

The root schema `$schema` represents the item type, and each array element becomes a collection row.

## Multi-Pass Schema Inference

When arrays contain objects with **varying structures**, the inference system performs multi-pass analysis to build a comprehensive schema that accommodates all variations.

### The Algorithm

1. **First Iteration - Establish Baseline**
   - Capture all keys and their types from the first object
   - This forms the initial schema structure

2. **Subsequent Iterations - Merge & Adapt**
   - Compare each object against the accumulated schema
   - Apply rules for new keys, missing keys, null values, and type changes

### Inference Rules

#### Rule 1: Null Value on First Encounter
When a key's value is `null` in its first occurrence, set type to `any` with `null: true`.

```typescript
const data = [
  { name: 'Alice', age: null }  // age is null on first encounter
];

// Generates:
// ~ $schema: {name: string, age*: any}
//                           ^^^^^^^^ nullable any
```

#### Rule 2: New Key in Later Iterations → Optional
When a key appears in a later object but wasn't in previous ones, mark it as `optional`.

```typescript
const data = [
  { name: 'Alice' },
  { name: 'Bob', email: 'bob@test.com' }  // email is new
];

// Generates:
// ~ $schema: {name: string, email?: string}
//                           ^^^^^^ optional (not in first object)
```

#### Rule 3: New Key with Null Value → Optional & Nullable
When a new key appears with a `null` value, it's both optional and nullable.

```typescript
const data = [
  { name: 'Alice' },
  { name: 'Bob', middleName: null }  // new key with null
];

// Generates:
// ~ $schema: {name: string, middleName?*: any}
//                           ^^^^^^^^^^^ optional and nullable
```

#### Rule 4: Missing Key in Later Iterations → Optional
When a key was present in earlier objects but missing in a later one, mark it as `optional`.

```typescript
const data = [
  { name: 'Alice', age: 28 },
  { name: 'Bob' }  // age is missing
];

// Generates:
// ~ $schema: {name: string, age?: number}
//                           ^^^^ optional (missing in second object)
```

#### Rule 5: Type Mismatch → Any
When the same key has different types across objects, change to `any`.

```typescript
const data = [
  { name: 'Alice', id: 123 },      // id is number
  { name: 'Bob', id: 'B-456' }     // id is string
];

// Generates:
// ~ $schema: {name: string, id: any}
//                           ^^^^^^ any (type changed from number to string)
```

#### Rule 6: Null in Later Iteration → Add Nullable
When a previously non-null key becomes `null`, add the nullable flag.

```typescript
const data = [
  { name: 'Alice', age: 28 },
  { name: 'Bob', age: null }  // age was number, now null
];

// Generates:
// ~ $schema: {name: string, age*: number}
//                           ^^^^ nullable (was null in iteration 2)
```

### Recursive Application to Nested Objects

**All rules apply recursively** to nested objects within arrays:

```typescript
const data = [
  {
    name: 'Alice',
    address: { city: 'NYC', zip: '10001' }
  },
  {
    name: 'Bob',
    address: { city: 'LA', zip: null, country: 'USA' }  // zip=null, country is new
  },
  {
    name: 'Charlie',
    address: { city: 'London', zip: 12345 }  // zip type changed (string→number)
  }
];

// Generates:
// ~ $address: {
//     city: string,         // consistent across all
//     zip?*: any,           // optional (missing never), nullable (was null), any (type changed)
//     country?: string      // optional (only in iteration 2)
//   }
// ~ $schema: {name: string, address: $address}
```

### Nested Arrays of Objects

The same rules apply to arrays nested within objects:

```typescript
const data = [
  {
    user: 'Alice',
    orders: [
      { id: 1, total: 100 },
      { id: 2, total: 200 }
    ]
  },
  {
    user: 'Bob',
    orders: [
      { id: 3, total: null, discount: 10 }  // total=null, discount is new
    ]
  }
];

// Generates:
// ~ $order: {
//     id: number,
//     total*: number,       // nullable (was null in Bob's order)
//     discount?: number     // optional (only in Bob's order)
//   }
// ~ $schema: {user: string, orders: [$order]}
```

### Complex Example: Deep Nesting with Variations

```typescript
const apiResponse = [
  {
    id: 1,
    user: {
      name: 'Alice',
      profile: {
        bio: 'Developer',
        social: { twitter: '@alice' }
      }
    },
    tags: ['tech', 'coding']
  },
  {
    id: 2,
    user: {
      name: 'Bob',
      profile: {
        bio: null,  // was string, now null
        social: { twitter: '@bob', github: 'bob123' },  // github is new
        website: 'bob.com'  // website is new in profile
      }
    },
    tags: ['design']
  },
  {
    id: '3',  // id type changed from number to string
    user: {
      name: 'Charlie',
      profile: null  // entire profile is null
    }
    // tags is missing
  }
];

// Generates:
// ~ $social: {twitter: string, github?: string}
// ~ $profile: {bio*: string, social: $social, website?: string}
// ~ $user: {name: string, profile*: $profile}
// ~ $schema: {id: any, user: $user, tags?: array}
//
// Breakdown:
// - id: any (type changed: number → string)
// - profile*: nullable (was null in iteration 3)
// - bio*: nullable (was null in iteration 2)
// - github?: optional (not in iteration 1)
// - website?: optional (not in iteration 1)
// - tags?: optional (missing in iteration 3)
```

## Schema Merging Summary

| Scenario | Result |
|----------|--------|
| Key missing in first, present later | `optional` |
| Key present in first, missing later | `optional` |
| Value is `null` on any occurrence | `nullable` |
| Type differs across objects | `any` |
| New key with `null` value | `optional` + `nullable` |
| Consistent key and type | No modifier |

## Member Order Preservation

Members maintain their **discovery order** - the order in which they were first encountered:

```typescript
const data = [
  { a: 1, b: 2 },
  { a: 1, c: 3, b: 2 }  // c discovered after a and b
];

// Schema order: a, b, c (discovery order)
// ~ $schema: {a: number, b: number, c?: number}
```

## InferredDefs Result

The `inferDefs()` function returns:

```typescript
interface InferredDefs {
  definitions: Definitions;  // All schema definitions
  rootSchema: Schema;        // The $schema (root/default schema)
}
```

## Singularization

Array item schema names are singularized:

| Plural | Singular |
|--------|----------|
| `books` | `$book` |
| `subscribers` | `$subscriber` |
| `categories` | `$category` |
| `boxes` | `$box` |
| `children` | `$child` |
| `people` | `$person` |

## Edge Cases

### Empty Arrays

```typescript
const data = { items: [] };

// Generates:
// ~ $schema: {items: array}
// (Cannot infer item type from empty array)
```

### Arrays with Mixed Types

```typescript
const data = { values: [1, 'hello', true, null] };

// Generates:
// ~ $schema: {values: array}
// (Heterogeneous array - item type not specified)
```

### Deeply Nested Optional Chains

```typescript
const data = [
  { a: { b: { c: 1 } } },
  { a: { b: null } },      // b becomes nullable
  { a: null }              // a becomes nullable
];

// Generates:
// ~ $b: {c: number}
// ~ $a: {b*: $b}
// ~ $schema: {a*: $a}
```

## Complete Example

```typescript
import { loadDoc, stringify } from 'internet-object';

const libraryData = {
  name: 'City Library',
  address: '123 Main St',
  books: [
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: 1234567890,
      available: true,
      categories: ['Fiction', 'Classic'],
      borrowedBy: { userId: 'user123', dueDate: '2024-02-20' }
    },
    {
      title: '1984',
      author: 'George Orwell',
      isbn: 2345678901,
      available: false,
      categories: ['Fiction', 'Dystopian']
      // borrowedBy is missing - will be marked optional
    }
  ]
};

const doc = loadDoc(libraryData, undefined, { inferDefs: true });
const ioText = stringify(doc, undefined, undefined, { includeHeader: true });

console.log(ioText);
```

Output:
```
~ $borrowedBy: {userId: string, dueDate: string}
~ $book: {title: string, author: string, isbn: number, available: bool, categories: array, borrowedBy?: $borrowedBy}
~ $schema: {name: string, address: string, books: [$book]}
---
City Library, 123 Main St, [{The Great Gatsby, F. Scott Fitzgerald, 1234567890, T, [Fiction, Classic], {user123, "2024-02-20"}}, {"1984", George Orwell, 2345678901, F, [Fiction, Dystopian]}]
```

## Round-Trip Safety

The inferred definitions ensure round-trip safety. The stringified output can be parsed back:

```typescript
const doc = loadDoc(jsonData, undefined, { inferDefs: true });
const ioText = stringify(doc, undefined, undefined, { includeHeader: true });

// Parse it back
const reparsed = IO.parse(ioText);
// reparsed.toJSON() equals original jsonData
```

## See Also

- [Type Inference](./type-inferrance.md) - How types are inferred for values
- [Stringify](./stringify/) - Stringify options and formatting
