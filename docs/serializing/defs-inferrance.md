# Definitions Inference

The definitions inference system automatically generates Internet Object schema definitions from plain JavaScript/JSON data. This enables seamless conversion of JSON to IO format without manually writing schemas.

---

## ⚠️ Important: Development Tool Only

> **`inferDefs` is a DEVELOPMENT tool, not a production data loading tool.**

### Purpose

Use `inferDefs` to:
- **Generate initial schemas** from sample data during development
- **Prototype quickly** without writing schemas manually
- **Inspect data structures** and understand your data shape
- **Bootstrap schema files** that you then refine and commit

### Not Intended For

Do NOT use `inferDefs` in production code paths:
- ❌ Loading user-submitted data at runtime
- ❌ Processing API responses in production
- ❌ High-throughput data pipelines
- ❌ Real-time data processing

### Why?

**Performance overhead:** The multi-pass inference algorithm requires:
1. **Phase 1:** Full traversal to discover all schema types
2. **Phase 2:** Second traversal to collect ALL instances of each schema type
3. **Phase 3:** Conflict resolution to detect name collisions across paths
4. **Phase 4:** Schema merging across all collected instances
5. **Phase 5:** Final schema building with proper references

This is **O(n × m)** where n = data size and m = number of unique schema types. For large datasets, this adds significant overhead compared to using a pre-defined schema.

### Recommended Workflow

```typescript
// 1. DEVELOPMENT: Use inferDefs to generate schema
const doc = loadDoc(sampleData, undefined, { inferDefs: true });
const schemaText = stringify(doc, undefined, undefined, { includeHeader: true });
console.log(schemaText);  // Copy this schema to a file

// 2. PRODUCTION: Use the generated schema directly
const schema = `
~ $book: {title: string, author: string, isbn: number}
~ $schema: {name: string, books: [$book]}
`;
const doc = load(data, schema);  // Fast! No inference needed
```

---

## Current Limitations

### Circular References

**Not handled.** If your data contains circular references, the inference will:
- Enter an infinite loop, or
- Throw a stack overflow error

```typescript
// ❌ Will fail
const obj = { name: 'Alice' };
obj.self = obj;  // Circular reference!
inferDefs(obj);  // Infinite loop or stack overflow
```

**Workaround:** Remove circular references before inference, or write schemas manually for such structures.

### Very Deep Nesting

**May cause performance issues.** The multi-pass algorithm visits every node multiple times. Extremely deep nesting (100+ levels) can cause:
- Slow inference times
- High memory usage
- Potential stack overflow

```typescript
// ⚠️ May be slow
const deeplyNested = {
  level1: { level2: { level3: { /* ... 100 more levels ... */ } } }
};
```

**Recommendation:** For deeply nested structures, consider flattening or writing schemas manually.

### Mixed null/undefined in Arrays

Arrays with mixed `null` and `undefined` values are handled, but with caveats:

```typescript
const data = {
  values: [1, null, undefined, 2]  // Mixed types
};

// Inferred as: values: array
// (heterogeneous array - item type not inferred)
```

For arrays with `null` mixed with objects:

```typescript
const data = {
  items: [
    { name: 'A' },
    null,           // null in array
    { name: 'B' }
  ]
};

// Inferred as: items: [$item]
// $item schema built from non-null items only
// Stringify may have issues with null array elements
```

**Recommendation:** Ensure arrays contain consistent types. Use `null` values within objects (which are handled correctly) rather than `null` array elements.

### Date Objects

JavaScript `Date` objects are currently inferred as `object` type, not `datetime`:

```typescript
const data = { created: new Date() };

// Currently infers: created: object
// Should ideally be: created: datetime
```

**Workaround:** Manually adjust the generated schema, or convert dates to ISO strings before inference.

### Numeric Object Keys

Object keys that are numeric strings may cause issues:

```typescript
const data = {
  "123": "value"  // Numeric key
};

// May cause parsing issues in IO format
```

**Workaround:** Use non-numeric string keys.

### Strings Starting with Special Characters

Strings starting with `~`, `:`, `{`, `}`, `[`, `]`, or `,` need escaping or quoting:

```typescript
const data = {
  path: "~/home/user",      // ~ is escaped: \~/home/user
  time: "10:30",            // : is escaped: 10\:30
  json: "{key: value}",     // { and : are escaped
  list: "[1,2,3]",          // Quoted: "[1,2,3]"
  csv: "a,b,c"              // Quoted: "a,b,c"
};
```

**Convention Characters (`@` and `$`):**

`@` and `$` are **convention characters**, not syntax-reserved characters:
- `@name` is used for variable references in definitions
- `$name` is used for schema references

In the **data section**, these are treated as regular string characters and output unquoted:

```typescript
const data = {
  tag: "@mention",      // Outputs: @mention (unquoted)
  price: "$100"         // Outputs: $100 (unquoted)
};
```

**Important:** When parsing, if `@mention` is not found in definitions, it's treated as a literal string. However, if `$schemaName` is not found, an error is thrown (schema references must exist).

---

## Overview

When you have JSON data and want to convert it to IO format, you can use the `inferDefs` option with `load()` or `loadDoc()` functions. The system analyzes the data structure and creates appropriate schema definitions.

## Essential Requirement: Deep Multi-Pass Inference

**Round-trip safety is mandatory.** The inferred schema MUST be able to validate and stringify the original data without errors. This requires **deep multi-pass inference** - analyzing ALL instances of a schema type across the entire data structure, regardless of nesting depth.

### Why Deep Multi-Pass is Essential

Consider this real-world scenario:

```typescript
const orders = [
  {
    id: 1,
    items: [
      { sku: 'A', price: 100, discount: 10 },
      { sku: 'B', price: 200, discount: 20 }
    ]
  },
  {
    id: 2,
    items: [
      { sku: 'C', price: 150, discount: null }  // discount is null here!
    ]
  }
];
```

Without deep multi-pass:
- `$item` schema is built from first order's items only
- `discount` is inferred as `number` (not nullable)
- **Stringify fails** when it encounters `null` in order 2's items

With deep multi-pass:
- ALL `$item` instances across ALL orders are analyzed
- `discount` is correctly inferred as `number*` (nullable)
- **Round-trip succeeds**

### Implementation Requirement

The inference algorithm MUST:

1. **Collect all instances** of each named schema across the entire data tree
2. **Merge schemas globally** - not just within a single parent array
3. **Apply all inference rules** (optional, nullable, type changes) across ALL collected instances

This ensures that schemas like `$item`, `$comment`, `$author` etc. are comprehensive enough to handle every variation in the source data.

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
const obj = load(jsonData, { inferDefs: true });
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

### String Type Policy

**Important:** Type inference is based strictly on JavaScript's `typeof` operator. If a value is a JavaScript string, it **must** be inferred as `string` type - regardless of what the string content looks like.

```typescript
const data = {
  id: "0001",           // string (not number, even though it looks numeric)
  code: "123",          // string (not number)
  flag: "T",            // string (not bool, even though T could mean true)
  answer: "N",          // string (not bool, even though N could mean no)
  active: "true",       // string (not bool)
  price: "99.99",       // string (not number)
  zip: "02101"          // string (leading zero preserved)
};

// Generates:
// ~ $schema: {id: string, code: string, flag: string, answer: string, active: string, price: string, zip: string}
```

This policy ensures:
1. **Data integrity** - No loss of leading zeros (e.g., `"0001"` stays `"0001"`)
2. **Round-trip safety** - Original string values are preserved exactly
3. **Predictable behavior** - The inferred type matches the JavaScript runtime type

**Corollary:** If you want a field to be a number or boolean, the source data must already have that type:

```typescript
const data = {
  id: 1,        // number (not string)
  active: true  // bool (not string)
};
```

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

The inference must work in multiple phases to ensure complete schema coverage:

#### Phase 1: Discovery & Initial Schema Creation
- Traverse the data structure depth-first
- Create named schemas for nested objects (e.g., `$user`, `$address`)
- Create item schemas for arrays of objects (e.g., `$book` from `books[]`)
- Record the schema name for each object location

#### Phase 2: Global Instance Collection
- For each named schema (e.g., `$order`), collect ALL instances across the entire data tree
- This includes instances at any nesting depth
- Example: Collect all `$order` objects from `users[0].orders`, `users[1].orders`, etc.

#### Phase 3: Schema Merging
- For each named schema, merge ALL collected instances using the inference rules
- Apply optional/nullable/any type rules across ALL instances
- This ensures the final schema accommodates every variation

#### Phase 4: Schema Finalization
- Update all schema references with the merged results
- Ensure proper ordering of schema definitions (dependencies first)

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

The same rules apply to arrays nested within objects. **This is where deep multi-pass becomes critical:**

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

**Key insight:** The `$order` schema must be built by analyzing ALL orders from ALL users, not just the orders within a single user object. This requires:

1. First pass: Discover all schema types and their locations
2. Second pass: Collect ALL instances of each schema type globally
3. Third pass: Merge all instances to build comprehensive schemas

### Deep Nesting Example

Consider deeply nested arrays:

```typescript
const data = [
  {
    posts: [
      {
        comments: [
          { author: { name: 'Alice', badge: 'gold' } },
          { author: { name: 'Bob' } }  // badge missing
        ]
      }
    ]
  },
  {
    posts: [
      {
        comments: [
          { author: { name: 'Charlie', badge: null } }  // badge is null
        ]
      }
    ]
  }
];

// The $author schema must be:
// ~ $author: {name: string, badge?*: string}
//                          ^^^^^^^ optional (missing in some) AND nullable (null in some)
```

The inference must collect ALL `$author` instances across:
- Different comments in the same post
- Different posts in the same root object
- Different root objects in the array

Only then can it correctly determine that `badge` is both optional AND nullable.

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

## Schema Name Conflict Resolution

When the same property name appears at different paths in the data structure, schema name conflicts can occur. The inference system resolves these by generating qualified names using parent path components.

### The Problem

Consider this data structure:

```typescript
const data = {
  address: { city: 'NYC', zip: '10001' },
  employee: {
    name: 'Alice',
    address: { street: '123 Main St', city: 'NYC' }  // Different structure!
  }
};
```

Without conflict resolution:
- Both `address` and `employee.address` would generate `$address`
- The schemas have different structures (zip vs street)
- This causes schema collision and incorrect serialization

### Resolution Strategy

When a conflict is detected, the inference system generates qualified schema names by prepending parent path components:

```typescript
// Generates:
// ~ $address: {city: string, zip: string}           // Root level
// ~ $employeeAddress: {street: string, city: string}  // Qualified name
// ~ $employee: {name: string, address: $employeeAddress}
// ~ $schema: {address: $address, employee: $employee}
```

### Conflict Detection Rules

A name conflict occurs when:
1. Two or more objects at different paths would generate the same schema name
2. The objects have **different structures** (different keys or types)

If objects at different paths have **identical structures**, they can share the same schema name (no conflict).

### Naming Convention

When conflicts are detected, qualified names are generated using camelCase:

| Path | Generated Name |
|------|----------------|
| `address` | `$address` |
| `employee.address` | `$employeeAddress` |
| `employee.manager.address` | `$employeeManagerAddress` |
| `orders[].shippingAddress` | `$orderShippingAddress` |
| `users[].profile.settings` | `$userProfileSettings` |

### Complex Example

```typescript
const company = {
  address: { city: 'SF', zip: '94102' },
  employees: [
    {
      name: 'Alice',
      address: { street: '123 Main', apt: '4B' },
      manager: {
        name: 'Bob',
        address: { building: 'HQ', floor: 5 }
      }
    }
  ]
};

// Generates (with conflict resolution):
// ~ $address: {city: string, zip: string}
// ~ $employeeAddress: {street: string, apt: string}
// ~ $employeeManagerAddress: {building: string, floor: number}
// ~ $manager: {name: string, address: $employeeManagerAddress}
// ~ $employee: {name: string, address: $employeeAddress, manager: $manager}
// ~ $schema: {address: $address, employees: [$employee]}
```

### Shared Schemas (No Conflict)

When objects at different paths have identical structures, they share a schema:

```typescript
const data = {
  homeAddress: { city: 'NYC', zip: '10001' },
  workAddress: { city: 'LA', zip: '90001' }  // Same structure
};

// These get separate names based on property name, not path:
// ~ $homeAddress: {city: string, zip: string}
// ~ $workAddress: {city: string, zip: string}
//
// Note: Currently these are separate schemas. Future optimization
// could detect identical structures and share a common $address schema.
```

### Array Item Schema Conflicts

Array items can also have name conflicts:

```typescript
const data = {
  items: [{ sku: 'A', price: 100 }],
  orders: [
    {
      items: [{ name: 'Widget', qty: 5 }]  // Different "items" structure
    }
  ]
};

// Generates:
// ~ $item: {sku: string, price: number}
// ~ $orderItem: {name: string, qty: number}  // Qualified to avoid conflict
// ~ $order: {items: [$orderItem]}
// ~ $schema: {items: [$item], orders: [$order]}
```

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

### Schema Name Conflicts at Multiple Depths

```typescript
const data = {
  address: { city: 'NYC' },
  employee: {
    address: { street: '123 Main' },
    manager: {
      address: { building: 'HQ' }
    }
  }
};

// All three "address" objects have different structures
// Generates qualified names:
// ~ $address: {city: string}
// ~ $employeeAddress: {street: string}
// ~ $employeeManagerAddress: {building: string}
```

### Conflicting Array Item Schemas

```typescript
const data = {
  logs: [{ message: 'info', level: 1 }],
  events: [
    {
      logs: [{ timestamp: '2024-01-01', type: 'click' }]
    }
  ]
};

// Both "logs" arrays have different item structures
// Generates:
// ~ $log: {message: string, level: number}
// ~ $eventLog: {timestamp: string, type: string}
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

**This is the primary goal of definition inference.** The inferred definitions MUST ensure round-trip safety - the stringified output can be parsed back to produce identical data:

```typescript
const doc = loadDoc(jsonData, undefined, { inferDefs: true });
const ioText = stringify(doc, undefined, undefined, { includeHeader: true });

// Parse it back
const reparsed = IO.parse(ioText);
// reparsed.toJSON() MUST equal original jsonData
```

If round-trip fails, the inference is broken. Common causes of failure:
- Missing `nullable` flag → stringify throws "null not allowed"
- Missing `optional` flag → stringify throws "value required"
- Wrong type → stringify throws type mismatch error

**Deep multi-pass inference prevents these failures** by ensuring every schema accounts for all variations in the source data.

## See Also

- [Type Inference](./type-inferrance.md) - How types are inferred for values
- [Stringify](./stringify/) - Stringify options and formatting
