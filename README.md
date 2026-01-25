# <img src="https://unpkg.com/internet-object@latest/logo/internet-object-logo.png" height="24px" alt="Internet Object" title="Internet Object"> Internet Object

Welcome to the official JavaScript repository for Internet Object, a lean, robust, and schema-first data interchange format designed for the Internet. As a well-structured alternative to JSON, Internet Object offers a user-friendly API for JavaScript and TypeScript, making it effortless to work with Internet Object documents.

For specification and more information, visit [InternetObject.org Docs](https://docs.internetobject.org).

## 📦 Installation

```bash
npm install internet-object
# or
yarn add internet-object
```

## 🏷️ Releases: `latest` vs `next`

- Default installs use `latest`: `npm i internet-object`
- Early adopters can opt into `next`: `npm i internet-object@next`

Publishing (from Git Bash):

```bash
bash scripts/publish-latest.sh
bash scripts/publish-next.sh
```

## 🚀 Quick Start

Start here (template literals), then move to parsing strings and loading JS data.

### Coming from JSON?

This library intentionally feels familiar:

| If you use… | Use… |
| --- | --- |
| `JSON.parse(text)` | `parse(ioText).toJSON()` |
| `JSON.stringify(value)` | `stringify(load(value, defs))` |
| “Validate without throwing” | `validate*()` (returns `ValidationResult`) |

Example (IO → JS data):

```ts
import { parse } from 'internet-object';

const doc = parse(ioText);
const data = doc.toJSON();
```

Access values by key or index (useful when exploring/transforming data):

```ts
import { loadObject, loadCollection, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');

// IOObject: access by key
const user = loadObject({ name: 'Alice', age: 30 }, defs);
console.log(user.get('name')); // 'Alice'
console.log(user.name);        // 'Alice' (dot-notation)

// IOObject: access by index (in insertion order)
console.log(user.getAt(0));    // 'Alice'

// IOCollection: access items by index
const users = loadCollection([
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
], defs);

console.log(users.getAt(1).get('name')); // 'Bob'
```

### 1) Parse IO using template literals

The fastest way to get started in JS/TS is to embed Internet Object directly in code. This is great for examples, fixtures, tests, and “copy/paste a sample document and tweak it”.

```ts
import io from 'internet-object';

const doc = io.doc`
  ~ $schema: { name: string, age: int }
  ---
  Alice, 30
  Bob, 25
`;

console.log(doc.toJSON());
```

Use this when you want the document inline (and you don’t want to manage escaping/indentation yourself).

### 2) Parse an IO string → JSON

Use this when you already have Internet Object text (from a file, API, clipboard, etc). You get a `Document`, and you can convert it to plain JS with `doc.toJSON()`.

```ts
import { parse } from 'internet-object';

const ioText = `
~ $schema: { name: string, age: int }
---
Alice, 30
Bob, 25
`;

const doc = parse(ioText);
console.log(doc.toJSON());
```

Use this for “read IO text and consume it in JS”.

### 3) Load JS data (validate) → stringify

Use this when your source-of-truth is already JavaScript data (objects/arrays) and you want to validate it against a schema, then emit Internet Object text.

```ts
import { load, parseDefinitions, stringify } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const doc = load({ name: 'Alice', age: 30 }, defs);

console.log(doc.toJSON());
console.log(stringify(doc));
```

Use this for “produce IO output safely” (validate first, then serialize).

### API cheat sheet (what to reach for)

| Goal | Use |
| ------ | ----- |
| Parse IO quickly (template literals) | `io.doc\`...\`` / `io.defs\`...\`` |
| Parse full IO text | `parse(ioText, defsOrSchema?, errors?, options?)` |
| Parse only header definitions | `parseDefinitions(headerText, externalDefs?, options?)` |
| Create a schema quickly | `parseSchema(schemaText, parentDefs?)` / `io.schema\`...\`` |
| Load JS data (throws on invalid) | `load` / `loadObject` / `loadCollection` / `loadInferred` |
| Validate without throwing | `validate` / `validateObject` / `validateCollection` |
| Convert IO values to JSON | `toJSON(value)` / `io.toJSON(value)` |
| Convert values to IO text | `stringify(value, defsOrOptions?, options?)` |
| Advanced document output | `stringifyDocument(doc, options)` |

<details>
<summary><strong>Common recipes</strong> (expand)</summary>

### Validate without throwing

```ts
import { validateObject, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const result = validateObject({ name: 'Alice', age: 30 }, defs);

if (result.valid) {
  console.log(result.data);
} else {
  console.error(result.errors);
}
```

### Named schemas

```ts
import { load, parseDefinitions } from 'internet-object';

const defs = parseDefinitions(`
  ~ $User: { name: string, age: int }
  ~ $Product: { title: string, price: number }
  ~ $schema: $User
`);

const doc = load({ name: 'Alice', age: 30 }, defs, { schemaName: '$User' });
```

### Create schemas quickly

```ts
import io, { parseSchema } from 'internet-object';

const s1 = parseSchema('{ name: string, age: int }');
const s2 = io.schema`{ name: string, age: int }`;
```

### Convert any IO value to JSON

```ts
import io, { toJSON } from 'internet-object';

const doc = io.doc`~ $schema: { name: string } --- Alice`;
console.log(toJSON(doc));
console.log(io.toJSON(doc));
```

### Advanced document stringify

```ts
import { parse, stringifyDocument } from 'internet-object';

const doc = parse(ioText);

// Stable, explicit document output
const full = stringifyDocument(doc, { includeHeader: true, includeSectionNames: true });

// Filter to specific named sections
const usersOnly = stringifyDocument(doc, { sectionsFilter: ['users'] });
```

### Round-trip normalization

If you need stable output across parse/stringify cycles, stringify with explicit document options:

```ts
import { parse, stringify } from 'internet-object';

const normalized = stringify(parse(ioText), { includeHeader: true, includeSectionNames: true });
const normalized2 = stringify(parse(normalized), { includeHeader: true, includeSectionNames: true });
console.log(normalized2 === normalized);
```

</details>

## 📚 API Reference

<details>
<summary><strong>Full reference</strong> (expand)</summary>

### Core Functions

#### `load(data, defs?, options?): Document`

Loads JavaScript data into a Document with optional schema validation.

```ts
load(data)                        // Schema-less
load(data, defs)                  // Uses defs.defaultSchema ($schema)
load(data, options)               // Schema-less with options
load(data, defs, options)         // Full control
```

#### `loadObject(data, defs?, options?): InternetObject`

Loads a single JavaScript object (not arrays).

```ts
loadObject(data)                  // Schema-less
loadObject(data, defs)            // With validation
loadObject(data, { schemaName: '$User' })  // With options
```

#### `loadCollection(data[], defs?, options?): Collection`

Loads an array of JavaScript objects.

```ts
loadCollection(data)              // Schema-less
loadCollection(data, defs)        // With validation
loadCollection(data, defs, { errorCollector: errors })
```

#### `loadInferred(data, options?): Document`

Loads data with automatically inferred schema.

#### `parse(ioString, defsOrSchema?, errorCollector?, options?): Document`

Parses an Internet Object string into a `Document`.

```ts
import { parse, parseDefinitions, parseSchema } from 'internet-object';

parse(text); // simplest

// Provide definitions (for variables and named schemas)
const defs = parseDefinitions('~ $schema: { name: string, age: int }');
parse(text, defs);

// Provide an explicit schema (compiled) without embedding a header
const schema = parseSchema('{ name: string, age: int }');
parse(text, schema);

// Collect parse/validation errors instead of throwing
const errors: Error[] = [];
parse(text, defs, errors);
```

#### `stringify(value, defsOrOptions?, options?): string`

Serializes an `IOObject`, `IOCollection`, or `Document` to Internet Object format.

#### `parseDefinitions(source, externalDefs?, options?): IODefinitions`

Parses IO header text into a Definitions object.

</details>

### Options

```ts
interface LoadOptions {
  schemaName?: string;      // Pick specific schema (e.g., '$User')
  strict?: boolean;         // Throw on first error (default: false)
  errorCollector?: Error[]; // Collect validation errors
}
```

## 🏗️ Core Structural Classes

```ts
import {
  IODocument,    // Full document with header and sections
  IOObject,      // Single Internet Object record
  IOCollection,  // Collection of records
  IODefinitions, // Schema definitions and variables
  IOSection,     // Document section
  IOHeader,      // Document header
  IOSchema,      // Schema definition
  IOError,       // Base error class
  IOValidationError,  // Validation errors
  IOSyntaxError       // Parsing errors
} from 'internet-object';
```

## 📝 Template Literals API

```ts
import io from 'internet-object';

// Parse a document
const doc = io.doc`
  ~ $schema: { name, age }
  ---
  Alice, 30
  Bob, 25
`;

// Create definitions
const defs = io.defs`
  ~ $address: { street: string, city: string }
  ~ $person: { name: string, address: $address }
`;

// Use definitions with document parsing
const doc2 = io.doc.with(defs)`
  ~ $schema: $person
  ---
  Alice, { "123 Main St", NYC }
`;
```

## ✅ Feature Status

<details>
<summary><strong>Feature status</strong> (expand)</summary>

- Tokenizer: ✅
- AST parser: ✅
- Schema parsing/compilation: ✅
- Validation: ✅
- Schema inference (`loadInferred`): ✅
- Types: ✅ (numbers, strings, booleans/nulls, datetime, arrays/objects, base64)
- Load API: ✅ (`load`, `loadObject`, `loadCollection`, `loadInferred`)
- Parse API: ✅
- Stringify API: ✅
- Errors: ✅ (IOError, IOValidationError, IOSyntaxError)
- Optimization: ongoing
- Documentation: ongoing

</details>

## 🛠️ Development

🚧 **Pull requests are currently not accepted.** Development is ongoing, and the API is still under finalization.

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Run performance benchmarks
yarn perf
yarn perf:decimal
```

Notes:

- Decimal design, semantics, and usage: `docs/decimal.md`.
- Performance harness: `yarn perf` (parser) and `yarn perf:decimal` (Decimal operations).

For a comprehensive understanding of Internet Object, refer to the official specification at [docs.InternetObject.org](https://docs.internetobject.org).

**ISC License:** © 2018-2026 ManiarTech® - All rights reserved.
