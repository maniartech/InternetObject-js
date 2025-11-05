# Internet Object Header Syntax

This document explains the syntax and usage of Internet Object headers.

## Overview

Internet Object documents can have multiple sections separated by `---`, but the **header appears only in the first section**:

1. **Header Section** (above first `---`) - Defines schema, variables, and metadata
2. **Data Sections** (below `---`) - Contains the actual data rows

The header defined in the first section applies to all subsequent data sections in the document.

**Example with multiple data sections:**

```io
# Header
name, age, email
--- # Data Section 1 - Single object
John, 25, john@example.com
--- # Data Section 2 - Collection of objects (prefixed by ~)
~ Jane, 30, jane@example.com
~ Bob, 45, bob@example.com
--- # Data Section 3 - Single object again
Alice, 28, alice@example.com
```

**Key points:**
- `#` starts a comment
- Single items in a section = just the object/value
- Multiple items in a section = collection (each item prefixed with `~`)

Think of it like HTML: just as HTML headers contain metadata, styles, and scripts that apply to the body, Internet Object headers define the schema, variables, and metadata that apply to all the data sections that follow.

## Header Types

Headers can take two forms:

1. **Inline Schema** - Field definitions written directly (no `~` prefix)
2. **Definition Collection** - Key-value pairs using `~` prefix for schemas, variables, and metadata

Each definition in a collection must be a single-key object, making the syntax identical to a collection of objects with one key each.

## 1. Inline Schema (No `~` prefix)

The most straightforward approach - write field definitions directly in the header. This is ideal for simple schemas where you don't need variables or metadata.

**Basic Example:**

```io
name, age, city
---
John, 25, NYC
```

**With Type Constraints:**

```io
name, age: {number, min: 18}, email
---
John, 25, john@example.com
```

Use inline schemas when:
- You only need to define the data structure
- You don't need variables or metadata
- You want the most concise syntax

## 2. Schema in Definitions (Using `~ $schema:`)

When you need to combine a schema with other definitions (variables or metadata), place the schema in the definition collection using the `$schema:` key.

```io
~ $schema: { name, age: {number, min: 18}, email }
---
John, 25, john@example.com
```

The `$` prefix identifies this as a schema definition, distinguishing it from variables (`@` prefix) and metadata (no prefix).

## 3. Variables (Using `~ @key:`)

Variables are placeholders that can be referenced in your data rows. They're prefixed with `@` and get substituted during parsing.

**Defining Variables:**

```io
~ @apiVersion: 1.0
~ @defaultStatus: active
~ @recordCount: 102
---
```

**Using Variables in Data:**

```io
~ @minAge: 20
~ @maxAge: 65
~ $schema: { name, age, status }
---
John, @minAge, active
Jane, @maxAge, retired
```

Variables are useful for:
- Avoiding repetition of common values
- Making data more maintainable
- Parameterizing data sets

## 4. Metadata (Using `~ key:`)

Metadata provides information about the response or dataset itself. Unlike variables (which are substituted into data), metadata is preserved in the parsed output for informational purposes.

```io
~ success: T
~ recordCount: 102
~ apiVersion: 1.0
~ timestamp: 2024-11-04T10:30:00Z
---
```

Common use cases:
- API response status (`success`, `error`)
- Pagination info (`page`, `totalPages`, `recordCount`)
- Version info (`apiVersion`, `schemaVersion`)
- Timestamps and audit trails

## 5. Mixed Headers

You can combine schemas, variables, and metadata in a single header:

```io
~ @apiVersion: 1.0
~ $schema: { name, age, email }
~ success: T
~ recordCount: 102
~ @minAge: 20
---
John, @minAge, john@example.com
```

**How it works:**
- `@apiVersion`, `@minAge` - Variables (can be referenced in data with `@`)
- `$schema` - Schema definition
- `success`, `recordCount` - Metadata (preserved in output)
- `@minAge` in data row - Replaced with `20` during parsing

## Syntax Rules

Understanding the prefix meanings:

| Prefix | Type | Purpose | Example | Behavior |
|--------|------|---------|---------|----------|
| None | Inline Schema | Define field structure directly | `name, age, email` | Becomes the document schema |
| `~ $` | Schema Definition | Define schema in definitions | `~ $schema: { name, age }` | Stored as the document schema |
| `~ @` | Variable | Define substitutable values | `~ @minAge: 20` | Substituted when referenced as `@minAge` in data |
| `~ ` | Metadata | Store document metadata | `~ success: T` | Preserved in parsed output |

### Key Points

1. **Inline schema** (no prefix) - Use when you only need a schema, nothing else
2. **Definition collection** (`~` prefix) - Use when you need schemas + variables + metadata
3. **Variables** (`@` prefix) - Get replaced in data rows; not part of the final output structure
4. **Metadata** (plain keys) - Preserved in output; describes the response/dataset
5. **Schema** (`$schema` key) - Required when using definition collection with a schema

### When to Use Each Type

**Use Inline Schema when:**
- You have a simple, standalone schema
- No variables or metadata needed
- You want minimal syntax

**Use Definition Collection when:**
- You need variables for repeated values
- You want to include response metadata
- You're building API responses with status/pagination info
- You need a combination of schema, variables, and metadata

## Examples

### ✅ CORRECT Examples

**Simple inline schema:**

```io
// Inline schema - most concise
num: { decimal, scale: 2 }
---
50.00m
```

**Schema in definitions:**

```io
// Schema with $schema key
~ $schema: { num: { decimal, scale: 2 } }
---
50.00m
```

**Variables only:**

```io
// Variables for reusable values
~ @success: T
~ @errorMessage: N
~ @recordCount: 102
---
```

**Metadata only:**

```io
// API response metadata
~ success: T
~ recordCount: 102
~ apiVersion: 1.0
---
```

**Complete API response:**

```io
// Schema + metadata + variables
~ $schema: { id, name, age, status }
~ success: T
~ recordCount: 3
~ apiVersion: 2.0
~ @defaultStatus: active
---
1, John, 25, @defaultStatus
2, Jane, 30, @defaultStatus
3, Bob, 45, retired
```

**Decimal validation with variables:**

```io
// Using variables for validation constraints
~ @minPrice: 0.01
~ @maxPrice: 9999.99
~ $schema: {
    product,
    price: { decimal, scale: 2, min: @minPrice, max: @maxPrice }
  }
---
Widget, 19.99m
Gadget, 149.95m
```

### ❌ INCORRECT Examples

**Using `~` with field definitions (missing `$schema:`):**

```io
// ❌ Wrong - field definitions need $schema: or no ~
~ num: { decimal, scale: 2 }
---
50.00m

// ✅ Correct - use $schema:
~ $schema: { num: { decimal, scale: 2 } }
---
50.00m

// ✅ Or use inline:
num: { decimal, scale: 2 }
---
50.00m
```

**Mixing inline schema with definitions:**

```io
// ❌ Wrong - can't mix inline with ~
name, age
~ @version: 1.0
---
John, 25

// ✅ Correct - use $schema in definitions
~ $schema: { name, age }
~ @version: 1.0
---
John, 25
```

## Common Use Cases

### API Success Response

```io
~ success: T
~ timestamp: 2024-11-04T10:30:00Z
~ recordCount: 2
~ $schema: { id, username, email }
---
1, john_doe, john@example.com
2, jane_smith, jane@example.com
```

### API Error Response

```io
~ success: F
~ error: Invalid authentication token
~ errorCode: AUTH_001
~ timestamp: 2024-11-04T10:30:00Z
---
```

### Paginated Data

```io
~ page: 1
~ pageSize: 10
~ totalRecords: 156
~ totalPages: 16
~ $schema: { id, name, category }
---
1, Product A, Electronics
2, Product B, Books
3, Product C, Clothing
```

### Configuration with Variables

```io
~ @environment: production
~ @dbHost: db.example.com
~ @dbPort: 5432
~ @cacheEnabled: T
~ $schema: { service, host, port, cache }
---
api, @dbHost, @dbPort, @cacheEnabled
worker, @dbHost, @dbPort, @cacheEnabled
```

### Data Export with Metadata

```io
~ exportDate: 2024-11-04
~ exportedBy: admin@example.com
~ source: production_db
~ recordCount: 1000
~ $schema: {
    userId,
    name,
    email,
    joinDate: date,
    status
  }
---
101, John Doe, john@example.com, 2024-01-15, active
102, Jane Smith, jane@example.com, 2024-02-20, active
```

## Summary

- **Inline schema** - No prefix, direct field definitions (simplest)
- **`~ $schema:`** - Schema in definition collection
- **`~ @variable:`** - Values that get substituted in data rows
- **`~ metadata:`** - Information about the response/dataset
- Choose inline for simple schemas, definitions for complex documents with metadata/variables
