# <img src="https://unpkg.com/internet-object@latest/logo/internet-object-logo.png" height="24px" alt="Internet Object" title="Internet Object"> Internet Object

[![npm version](https://img.shields.io/npm/v/internet-object?style=flat-square)](https://www.npmjs.com/package/internet-object)
[![License](https://img.shields.io/npm/l/internet-object?style=flat-square)](https://github.com/maniartech/InternetObject-js/blob/master/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/internet-object?style=flat-square)](https://www.npmjs.com/package/internet-object)
[![Build Status](https://img.shields.io/github/actions/workflow/status/maniartech/internetobject-js/ci.yml?branch=main&style=flat-square)](https://github.com/maniartech/InternetObject-js/actions)

A compact, human-readable data format with built-in schema validation — like JSON, but smaller and type-safe.

```ruby
name: string, age: int
---
~ Alice, 30
~ Bob, 25
```

This is Internet Object. The `~` lines define a schema; `---` separates data sections. Values are comma-separated and validated automatically.

## Why Internet Object?

- **Schema-First**: Validation is built-in, not an afterthought. define structure types once, ensure data integrity everywhere.
- **Type-Safe**: Supports rich types like `int`, `bool`, `date`, `datetime`, and `email` out of the box.
- **Compact**: Removes repetitive keys using a CSV-like structure for collections, reducing payload size significantly.
- **Human-Friendly**: Cleaner syntax than JSON, more structured than YAML.

## Install

```bash
npm install internet-object
```

## Learn by Example

Each section builds on the previous one. Start at the top and work your way down.

### 1. Parse IO text → get JavaScript data

The simplest use case: you have IO text, you want a JS object.

```ts
import { parse } from 'internet-object';

const text = `
name: string, age: int
---
Alice, 30
`;

const doc = parse(text);
console.log(doc.toJSON());
// { name: 'Alice', age: 30 }
```

**What happened?**
- `parse()` reads the text and validates it against the embedded schema
- `doc.toJSON()` gives you a plain JavaScript object

### 2. Multiple records (a collection)

Add more rows after `---` to create a collection:

```ts
const text = `
name: string, age: int
---
~ Alice, 30
~ Bob, 25
~ Carol, 28
`;

const doc = parse(text);
console.log(doc.toJSON());
// [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }, { name: 'Carol', age: 28 }]
```

One row = object. Multiple rows = array of objects.

### 3. Embed IO in your code (template literals)

Instead of a string variable, embed IO directly in your TypeScript/JavaScript:

```ts
import io from 'internet-object';

const doc = io.doc`
  name: string, age: int
  ---
  ~ Alice, 30
  ~ Bob, 25
`;

console.log(doc.toJSON());
```

This is handy for tests, fixtures, and quick prototyping.

### 4. Validate your JavaScript data

You already have JS objects and want to validate them against a schema:

```ts
import { load, parseDefinitions } from 'internet-object';

// 1. Define a schema
const defs = parseDefinitions('~ $schema: { name: string, age: int }');

// 2. Validate your data
const doc = load({ name: 'Alice', age: 30 }, defs);

console.log(doc.toJSON());
// { name: 'Alice', age: 30 }
```

If validation fails, `load()` throws an error. Use `validate()` if you prefer a result object instead:

```ts
import { validateObject, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const result = validateObject({ name: 'Alice', age: 'thirty' }, defs);

if (result.valid) {
  console.log(result.data);
} else {
  console.error(result.errors);
  // Error: expected int, got string
}
```

### 5. Convert JS data → IO text

Once you have validated data, you can serialize it back to IO format:

```ts
import { load, parseDefinitions, stringify } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const doc = load({ name: 'Alice', age: 30 }, defs);

console.log(stringify(doc));
// Alice, 30
```

This is the reverse of `parse()`. Round-trip: `parse()` → `toJSON()` → `load()` → `stringify()`.

### 6. Access values by key or index

IO objects support both key-based and positional access:

```ts
import { loadObject, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const user = loadObject({ name: 'Alice', age: 30 }, defs);

// By key
console.log(user.get('name')); // 'Alice'
console.log(user.name);        // 'Alice' (dot notation works too)

// By position (insertion order)
console.log(user.getAt(0));    // 'Alice'
console.log(user.getAt(1));    // 30
```

For collections:

```ts
import { loadCollection, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const users = loadCollection([
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
], defs);

console.log(users.getAt(0).get('name')); // 'Alice'
console.log(users.getAt(1).name);        // 'Bob'
```

### 7. Named schemas (reusable types)

Define multiple schemas and reference them by name:

```ts
import { load, parseDefinitions } from 'internet-object';

const defs = parseDefinitions(`
  ~ $address: { street: string, city: string }
  ~ $user: { name: string, age: int, address: $address }
  ~ $schema: $user
`);

const doc = load({
  name: 'Alice',
  age: 30,
  address: { street: '123 Main St', city: 'NYC' }
}, defs);

console.log(doc.toJSON());
```

Schemas starting with `$` are named. `$schema` is the default schema used for validation.

### 8. Streaming API (Chunked I/O)

For large datasets or network streams, use `createStreamReader`:

```ts
import { createStreamReader } from 'internet-object';

const input = getSomeReadStream(); // Fetch Response, ReadableStream, Generator...
const reader = createStreamReader(input);

for await (const item of reader) {
  if (item.data) {
    console.log('Received:', item.data.toJSON());
  }
}
```

Works with Node.js streams, WHATWG streams, `AsyncIterable`, or simple strings.

## Quick Reference

| I want to… | Use this |
|------------|----------|
| Parse IO text to JS | `parse(text).toJSON()` |
| Validate JS data | `load(data, defs)` or `validateObject(data, defs)` |
| Convert JS to IO text | `stringify(load(data, defs))` |
| Embed IO in code | ``io.doc`...` `` |
| Create a schema | `parseDefinitions('~ $schema: {...}')` or ``io.schema`{...}` `` |
| Read stream | `createStreamReader(source)` |

<details>
<summary><strong>More Features</strong></summary>

### Parse with external definitions

```ts
import { parse, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $User: { name: string, age: int }');
const doc = parse('Alice, 30', defs);
```

### Collect errors instead of throwing

```ts
const errors: Error[] = [];
const doc = parse(text, defs, errors);

if (errors.length > 0) {
  console.error('Validation failed:', errors);
}
```

### Infer schema from data

```ts
import { loadInferred } from 'internet-object';

const doc = loadInferred({ name: 'Alice', age: 30 });
// Schema is auto-generated: { name: string, age: number }
```

### Advanced stringify options

```ts
import { parse, stringifyDocument } from 'internet-object';

const doc = parse(text);

// Include header and section names in output
const output = stringifyDocument(doc, {
  includeHeader: true,
  includeSectionNames: true
});
```

</details>

<details>
<summary><strong>Core Classes</strong></summary>

```ts
import {
  IODocument,         // Full document (header + sections)
  IOObject,           // Single record
  IOCollection,       // Array of records
  IODefinitions,      // Schema definitions
  IOSchema,           // Compiled schema
  IOError,            // Base error
  IOValidationError,  // Validation error
  IOSyntaxError       // Parse error
} from 'internet-object';
```

</details>

<details>
<summary><strong>Feature Status</strong></summary>

- Parsing: ✅
- Schema validation: ✅
- Type system: ✅ (string, int, number, bool, datetime, arrays, objects, base64)
- Load/validate API: ✅
- Stringify API: ✅
- Error handling: ✅
- Schema inference: ✅
- Streaming: ✅ (Beta 0.2.0)
- Documentation: ongoing

</details>

## Development

```bash
yarn install   # Install dependencies
yarn test      # Run tests
yarn build     # Build for production
```

## Releases

```bash
npm install internet-object          # stable (latest)
npm install internet-object@next     # preview (next)
```
## Contributing & Community

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started, report issues, or propose new features.

- **Issues**: [Report a bug](https://github.com/maniartech/InternetObject-js/issues)
- **Discussions**: [Join the conversation](https://github.com/maniartech/InternetObject-js/discussions)
- **Twitter**: [@maniartech](https://twitter.com/maniartech)

## License


Maintainers: publish via `bash scripts/publish-latest.sh` or `bash scripts/publish-next.sh`.

---

For the full specification, visit [docs.internetobject.org](https://docs.internetobject.org).

**ISC License** · © 2018-2026 ManiarTech®
