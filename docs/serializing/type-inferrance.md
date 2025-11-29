# Type Inference

When stringifying values, the Internet Object library must determine how to format each value based on its type. This document explains how types are inferred and how the `format` option controls string output.

## String Format Options

Strings support three format modes:

| Format | Description | Example |
|--------|-------------|---------|
| `auto` | Smart format - quotes when needed | `hello` or `"1984"` |
| `regular` | Always quoted | `"hello"` |
| `raw` | Raw string (no escape processing) | `r"hello"` |

### Auto Format (Default)

The `auto` format intelligently decides whether to quote a string based on its content:

```typescript
// Unquoted - safe values
stringify({ name: 'hello' })        // → hello
stringify({ name: 'John Doe' })     // → John Doe

// Quoted - ambiguous values (would parse as different types)
stringify({ code: '1984' })         // → "1984"  (looks like number)
stringify({ flag: 'true' })         // → "true"  (looks like boolean)
stringify({ date: '2024-01-15' })   // → "2024-01-15" (looks like date)

// Quoted - contains comma (structural)
stringify({ desc: 'red, blue' })    // → "red, blue"

// Escaped - contains structural characters
stringify({ path: 'a{b}c' })        // → a\{b\}c
```

## Ambiguous Values

The following string values are considered ambiguous and will be automatically quoted:

### Literals
- `null`, `N`
- `true`, `T`, `false`, `F`
- `undefined`
- `Inf`, `+Inf`, `-Inf`, `NaN`

### Patterns
- **Numbers**: `-123`, `45.67`, `1e10`, `3.14159`
- **Dates**: `2024-01-15`
- **Times**: `14:30:00`
- **DateTimes**: `2024-01-15T14:30:00Z`

## Type Inference Rules

When stringifying without explicit schema, types are inferred from JavaScript values:

| JavaScript Value | Inferred IO Type | String Format |
|-----------------|------------------|---------------|
| `'hello'` | `string` | auto |
| `123` | `number` | - |
| `true` / `false` | `bool` | - |
| `null` | `any` (null) | - |
| `new Date()` | `date` | - |
| `[1, 2, 3]` | `array` | - |
| `{ a: 1 }` | `object` | - |

## Schema-Based Formatting

When a schema is provided, the declared type determines formatting:

```typescript
const schema = '{ name: string, year: string }';
const data = { name: 'Alice', year: '1984' };

stringify(data, schema);
// → Alice, "1984"
//         ^^^^^^ quoted because schema says it's a string
```

## Round-Trip Safety

The auto format ensures **round-trip safety** - stringified data can be parsed back to the same values:

```typescript
// Without quoting "1984", it would parse as number 1984
const doc = loadDoc({ title: '1984' }, undefined, { inferDefs: true });
const text = stringify(doc, undefined, undefined, { includeHeader: true });
// → ~ $schema: {title: string}
//   ---
//   "1984"

const reparsed = IO.parse(text);
reparsed.data.get('title'); // → '1984' (string, not number)
```

## Format Override

You can override the default format in schema definitions:

```typescript
// Force regular (quoted) format
const schema = '{ code: {string, format: "regular"} }';

// Force raw format (no escape processing)
const schema = '{ content: {string, format: "raw"} }';
```

## Implementation Details

### `toAutoString()`

The core function that implements smart string formatting:

```typescript
function toAutoString(str: string, escapeLines: boolean, encloser: string = '"'): string {
  // 1. Quote if ambiguous (looks like number, bool, date, etc.)
  if (isAmbiguous(str)) {
    return toRegularString(str, escapeLines, encloser);
  }

  // 2. Quote if contains comma (would break parsing)
  if (/,/.test(str)) {
    return toRegularString(str, escapeLines, encloser);
  }

  // 3. Escape structural characters: { } [ ] : # " ' \ ~
  if (/[\{\}\[\]\:\#\"\'\\~]/.test(str)) {
    return toOpenString(str, escapeLines);  // Escape, don't quote
  }

  // 4. Use raw string for escape characters: \n \r \t
  if (/[\n\r\t]/.test(str)) {
    return toRawString(str, encloser);
  }

  // 5. Otherwise, return as-is (open string)
  return toOpenString(str, escapeLines);
}
```

### Ambiguity Detection

```typescript
function isAmbiguous(str: string): boolean {
  if (str.length === 0) return true;
  if (ambiguousValues.has(str)) return true;  // null, true, false, etc.
  if (reNumber.test(str)) return true;         // -123, 45.67, 1e10
  if (reDate.test(str)) return true;           // 2024-01-15
  if (reTime.test(str)) return true;           // 14:30:00
  if (reDateTime.test(str)) return true;       // 2024-01-15T14:30:00Z
  return false;
}
```

## Examples

### Basic Strings
```
hello           → hello
John Doe        → John Doe
hello world     → hello world
```

### Ambiguous Strings (Quoted)
```
1984            → "1984"
3.14            → "3.14"
true            → "true"
null            → "null"
2024-01-15      → "2024-01-15"
```

### Structural Characters (Escaped)
```
a{b}c           → a\{b\}c
key:value       → key\:value
[item]          → \[item\]
```

### Comma-Containing (Quoted)
```
red, blue       → "red, blue"
a, b, c         → "a, b, c"
```

### Special Characters (Raw)
```
line1\nline2    → r"line1\nline2"
with\ttab       → r"with\ttab"
```

## See Also

- [Definitions Inference](./defs-inferrance.md) - Schema inference from data
- [Stringify](./stringify/) - Stringify options and formatting
