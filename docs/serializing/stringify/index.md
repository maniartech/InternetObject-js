# Stringify API

The `stringify()` function converts Internet Object data structures back to IO text format. This document covers the API, options, and usage patterns.

## Overview

```typescript
import { stringify } from 'internet-object';

// Stringify a document
const text = stringify(doc);

// Stringify with options
const text = stringify(doc, undefined, undefined, { includeHeader: true });

// Stringify a single object
const text = stringify(obj, schema);

// Stringify a collection
const text = stringify(collection, schema);
```

## Function Signatures

```typescript
// Primary signature
function stringify(
  value: InternetObject | Collection | Document | any,
  schema?: string | Schema,
  defs?: Definitions,
  options?: StringifyOptions
): string;

// Legacy signature (backward compatible)
function stringify(
  value: any,
  defs?: Definitions | Schema | string,
  errorCollector?: Error[],
  options?: StringifyOptions
): string;
```

## StringifyOptions

```typescript
interface StringifyOptions {
  /**
   * Indentation for pretty printing (number of spaces or string)
   * If omitted, output is compact (single line)
   */
  indent?: number | string;

  /**
   * Skip error objects in collections
   * Default: false (includes errors in output)
   */
  skipErrors?: boolean;

  /**
   * Include type annotations in output
   * Default: false (values only)
   */
  includeTypes?: boolean;

  /**
   * Include header section with definitions (for Document only)
   * Default: false (data only)
   */
  includeHeader?: boolean;
}
```

## Usage Examples

### Basic Stringification

```typescript
import IO, { stringify } from 'internet-object';

// Parse and stringify
const doc = IO.parse('name: string, age: int\n---\nAlice, 28');
const text = stringify(doc);
// → "Alice, 28"
```

### With Header (Definitions)

```typescript
const doc = IO.parse(`
~ $address: {city: string, zip: string}
~ $schema: {name: string, address: $address}
---
Alice, {NYC, "10001"}
`);

// Data only (default)
stringify(doc);
// → "Alice, {NYC, \"10001\"}"

// Include header with definitions
stringify(doc, undefined, undefined, { includeHeader: true });
// → "~ $address: {city: string, zip: string}\n~ $schema: {name: string, address: $address}\n---\nAlice, {NYC, \"10001\"}"
```

### Pretty Printing

```typescript
const obj = new InternetObject();
obj.set('name', 'Alice');
obj.set('age', 28);

// Compact (default)
stringify(obj, schema);
// → "Alice, 28"

// Pretty printed
stringify(obj, schema, undefined, { indent: 2 });
// → "{\n  name: Alice,\n  age: 28\n}"
```

### Collection Stringification

```typescript
const collection = new Collection([obj1, obj2, obj3]);

stringify(collection, schema);
// → "~ Alice, 28\n~ Bob, 35\n~ Charlie, 42"
```

### Skip Errors

```typescript
// Collection may contain error objects from parsing
stringify(collectionWithErrors, schema, undefined, { skipErrors: true });
// Skips items that are error objects
```

## Document Stringification

When stringifying a `Document`, the function handles:

1. **Header** - Definitions, schemas, variables
2. **Sections** - Named data sections with separators
3. **Collections** - Items prefixed with `~`

### Section Handling

```typescript
const doc = IO.parse(`
~ $user: {name: string, age: int}
--- users: $user
~ Alice, 28
~ Bob, 35
`);

stringify(doc, undefined, undefined, { includeHeader: true });
// Outputs full document with header and section
```

### Data-Only Mode

By default, `stringify()` outputs data only without header:

```typescript
stringify(doc);
// → "--- users: $user\n~ Alice, 28\n~ Bob, 35"
// Note: Section separator included for named sections
```

## Schema Reference Resolution

When objects use schema references (`schemaRef`), stringify resolves them:

```typescript
// MemberDef with schemaRef
const memberDef = {
  type: 'object',
  path: 'address',
  schemaRef: '$address'  // Reference to $address definition
};

// Stringify uses the referenced schema for nested object formatting
```

## Type-Specific Formatting

### Strings

```typescript
// Auto format (default) - smart quoting
stringify({ name: 'Alice' })     // → "Alice"
stringify({ code: '1984' })      // → "\"1984\""  (quoted - looks like number)
stringify({ desc: 'a, b' })      // → "\"a, b\""  (quoted - contains comma)
```

### Dates

```typescript
stringify({ date: new Date('2024-01-15') })
// → "d\"2024-01-15\""
```

### Booleans

```typescript
stringify({ active: true })   // → "T"
stringify({ active: false })  // → "F"
```

### Null Values

```typescript
stringify({ value: null })    // → "N"
```

### Arrays

```typescript
stringify({ items: [1, 2, 3] })
// → "[1, 2, 3]"
```

### Nested Objects

```typescript
stringify({ address: { city: 'NYC', zip: '10001' } })
// → "{NYC, \"10001\"}"
```

## Trailing Empty Values

Optional fields at the end with `undefined` or missing values are automatically trimmed from the output:

```typescript
// Schema: { name: string, middle?: string, age?: int, suffix?: string }
// Data: { name: 'Alice', age: 30 }
stringify(data, schema);
// → "Alice, , 30"  (middle is empty placeholder, but suffix is trimmed)

// Data: { name: 'Alice' }
stringify(data, schema);
// → "Alice"  (all trailing empty values trimmed)
```

This ensures compact output while maintaining positional integrity for non-trailing optional fields.

### How Trailing Trim Works

1. Each schema field is stringified in order
2. If a field's value is `undefined` or missing, `stringify` returns `undefined` (not empty string)
3. The `undefined` is converted to empty string `''` for positional placeholders
4. After all fields are processed, trailing empty strings are removed
5. This preserves positions of middle optional fields while trimming end empties

```typescript
// Schema: { a: string, b?: string, c?: string, d?: string }
// Data: { a: 'X', c: 'Y' }
// Before trim: ['X', '', 'Y', '']
// After trim:  ['X', '', 'Y']
// Output: "X, , Y"
```

## Undefined vs Empty String in Stringify

Type handlers can return `undefined` to signal "skip this field entirely" vs returning `''` which means "this field has an empty value". This distinction is important for:

1. **Optional fields with no value**: Return `undefined` → becomes `''` placeholder, then trimmed if trailing
2. **Empty string values**: Return `''` or `""` (quoted) → preserved in output
3. **Null values**: Return `N` → explicitly shows null

```typescript
// Internal behavior:
stringify(undefined, memberDef)  // returns undefined → placeholder
stringify('', memberDef)         // returns '""' → empty string value
stringify(null, memberDef)       // returns 'N' → null value
```

## Advanced: StringifyDocumentOptions

For documents, additional options are available:

```typescript
interface StringifyDocumentOptions extends StringifyOptions {
  /**
   * Include header section with definitions
   * Default: true (includes if header has definitions)
   */
  includeHeader?: boolean;

  /**
   * Include section names after '---'
   * Default: true
   */
  includeSectionNames?: boolean;

  /**
   * Include only specific sections (by name)
   */
  sectionsFilter?: string[];

  /**
   * Format for definitions in header
   * Default: 'io'
   */
  definitionsFormat?: 'io';
}
```

## See Also

- [Definitions Inference](../defs-inferrance.md) - Automatic schema generation
- [Type Inference](../type-inferrance.md) - How types are determined
- [Load API](../../loading/) - Loading data into IO structures
