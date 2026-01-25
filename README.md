# <img src="https://unpkg.com/internet-object@latest/logo/internet-object-logo.png" height="24px" alt="Internet Object" title="Internet Object"> Internet Object

Welcome to the official JavaScript repository for Internet Object, a lean, robust, and schema-first data interchange format designed for the Internet. As a well-structured alternative to JSON, Internet Object offers a user-friendly API for JavaScript and TypeScript, making it effortless to work with Internet Object documents.

For specification and more information, visit [InternetObject.org Docs](https://docs.internetobject.org).

See also:

- Decimal design, semantics, and usage: `docs/decimal.md`.
- Performance harness: `yarn perf` (parser) and `yarn perf:decimal` (Decimal operations).

## 📦 Installation

```bash
npm install internet-object
# or
yarn add internet-object
```

## 🚀 Quick Start

Internet Object is a schema-first data format. You can load plain JavaScript objects and validate them against a schema, or parse Internet Object strings.

### Loading and Validating Data

Use `load()` to validate JavaScript objects against a schema and get a `Document`.

```ts
import { load, loadObject, loadCollection, parseDefinitions } from 'internet-object';

// 1. Create definitions with a schema
const defs = parseDefinitions('~ $schema: { name: string, age: int, email?: string }');

// 2. Load and validate a single object
const data = { name: 'Alice', age: 30, email: 'alice@example.com' };
const doc = load(data, defs);
console.log(doc.toJSON()); // { name: 'Alice', age: 30, email: 'alice@example.com' }

// 3. Or use loadObject for direct InternetObject access
const obj = loadObject(data, defs);
console.log(obj.get('name')); // 'Alice'

// 4. Load collections with loadCollection
const users = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 }
];
const collection = loadCollection(users, defs);
console.log(collection.length); // 2
```

### Schema-less Loading

Load data without validation when you don't need schema enforcement:

```ts
import { loadObject, loadCollection } from 'internet-object';

// Schema-less loading - no validation
const obj = loadObject({ name: 'Alice', anything: 'goes' });
const col = loadCollection([{ a: 1 }, { b: 2 }]);
```

### Using Named Schemas

```ts
import { load, parseDefinitions } from 'internet-object';

// Define multiple schemas
const defs = parseDefinitions(`
  ~ $User: { name: string, age: int }
  ~ $Product: { title: string, price: number }
  ~ $schema: $User
`);

// Use specific schema via options
const userData = { name: 'Alice', age: 30 };
const doc = load(userData, defs, { schemaName: '$User' });
```

### Parsing IO Strings

Use `parse()` to parse Internet Object formatted strings.

```ts
import { parse } from 'internet-object';

const ioString = `
  ~ $schema: { name, age }
  ---
  Alice, 30
  ---
  Bob, 25
`;

const doc = parse(ioString);
console.log(doc.toJSON());
// Output: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
```

### Stringifying Data

Use `stringify()` to convert data back to Internet Object format.

```ts
import { stringify, load, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const doc = load({ name: 'Alice', age: 30 }, defs);

const ioString = stringify(doc);
// Output: Alice, 30

// Round-trip (idempotent after first stringify):
// const normalized = stringify(parse(ioText), { includeHeader: true, includeSectionNames: true });
// const normalized2 = stringify(parse(normalized), { includeHeader: true, includeSectionNames: true });
// normalized2 === normalized
```

### Inferring Schema from Data

Use `loadInferred()` to automatically generate a schema from your data structure:

```ts
import { loadInferred } from 'internet-object';

const data = {
  name: 'Alice',
  age: 30,
  address: { city: 'NYC', zip: '10001' }
};

const doc = loadInferred(data);

// Access the inferred schema
console.log(doc.header.schema);
// Inferred: { name: string, age: number, address: $address }
// With $address: { city: string, zip: string }
```

## 📚 API Reference

### Choosing the Right Function

| Goal | Use | Notes |
|------|-----|------|
| Parse full IO text (header + sections) | `parse(ioText, defsOrSchema?, errorCollector?, options?)` | Accepts `IODefinitions`, `IOSchema`, a schema name string, or `null`.
| Parse only header definitions | `parseDefinitions(headerText, externalDefs?, options?)` | Use for reusable schemas/variables/metadata.
| Create a schema quickly | `parseSchema(schemaText, parentDefs?)` or `io.schema\`...\`` | One-step schema creation.
| Validate without loading IO classes | `validate*()` | Returns `ValidationResult` instead of throwing.
| Load JS data into IO classes | `load*()` | Throws on validation errors (unless configured otherwise).
| Convert IO classes to plain JSON | `toJSON(value)` / `io.toJSON(value)` | Works with any `Jsonable`.

### When to use `load()` vs `loadObject()` vs `loadCollection()`

- Use `load()` when you want a `Document` (header + sections) that’s ready to `stringify()` back to IO.
- Use `loadObject()` when you only need the validated `IOObject` (no document wrapper).
- Use `loadCollection()` when you only need the validated `IOCollection`.

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

### Advanced Document Stringify

Use `stringifyDocument()` when you need document-specific controls such as section filtering or section name output.

```ts
import { stringifyDocument, parse } from 'internet-object';

const doc = parse(ioText);

// 1) Include header and section names (stable, explicit document output)
const out = stringifyDocument(doc, {
  includeHeader: true,
  includeSectionNames: true,
});

// 2) Only include specific named sections
const usersOnly = stringifyDocument(doc, {
  sectionsFilter: ['users'],
});
```

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

- [x] Tokenizer
- [x] AST Parser
- [x] Schema
  - [x] Parsing & Compilation
  - [x] Validation
  - [x] Schema Inference (`loadInferred`)
- [x] Data Types
  - [x] Numbers (int, uint, int8-32, uint8-32, number, decimal, bigint)
  - [x] Strings (open, regular, raw)
  - [x] Boolean and Nulls
  - [x] DateTime (datetime, date, time)
  - [x] Arrays and Objects
  - [x] Base64 Binary Data
- [x] IOCollections with error handling
- [x] IODefinitions with variables
- [x] Load API (`load`, `loadObject`, `loadCollection`, `loadInferred`)
- [x] Stringify API
- [x] Parse API
- [x] Error Standardization (IOError, IOValidationError, IOSyntaxError)
- Optimization: ongoing
- Documentation: ongoing

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

For a comprehensive understanding of Internet Object, refer to the official specification at [docs.InternetObject.org](https://docs.internetobject.org).

**ISC License:** © 2018-2025 ManiarTech® - All rights reserved.
