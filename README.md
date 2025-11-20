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

Use `io.load()` to validate JavaScript objects against a schema.

```ts
import io from 'internet-object';

// 1. Define a schema (inline or separate)
const schema = '{ name: string, age: number, email?: string }';

// 2. Load and validate data
const data = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
};

const user = io.load(data, schema);
console.log(user.get('name')); // 'Alice'
```

### Parsing IO Strings

Use `io.parse()` to parse Internet Object formatted strings.

```ts
const ioString = `
  name, age
  ---
  Alice, 30
  Bob, 25
`;

const doc = io.parse(ioString);
console.log(doc.toJSON());
```

### Stringifying Data

Use `io.stringify()` to convert data back to Internet Object format.

```ts
const data = { name: 'Alice', age: 30 };
const ioString = io.stringify(data);
// Output:
// name, age
// ---
// Alice, 30
```

## 📚 API Reference

### `io.load(data, defs?, errorCollector?, options?)`

Loads and validates JavaScript data (objects or arrays) against a schema.

- **data**: The JavaScript object or array to load.
- **defs**: The schema definition. Can be:
  - A `Schema` object.
  - A `Definitions` object.
  - A `string` (IO text schema or schema name).
- **errorCollector**: An optional array to collect validation errors (useful for collections).
- **options**: Load options.

### `io.stringify(value, defs?, errorCollector?, options?)`

Serializes JavaScript data to Internet Object format.

### `io.parse(source, defs?, errorCollector?, options?)`

Parses an Internet Object string into a Document.

## 🏗️ Core Structural Classes

The `load` and `parse` methods return instances of core structural classes. You can import these classes for type checking or advanced manipulation.

```ts
import {
  IODocument,
  IOObject,
  IOCollection,
  IODefinitions,
  IOSection,
  IOHeader
} from 'internet-object';

// Or access them via the default export
// import io from 'internet-object';
// const doc = new io.IODocument(...);
```

### `IODocument`
Represents a full Internet Object document, including header, definitions, and data sections.
- Returned by `io.parse()`.

### `IOObject`
Represents a single Internet Object record.
- Returned by `io.load()` (when loading a single object).

### `IOCollection`
Represents a collection of Internet Object records.
- Returned by `io.load()` (when loading an array).

### `IODefinitions`
Manages schema definitions and variables.
- Returned by `io.defs`.

## 📝 Template Literals API

Internet Object also provides a set of template literal tags for a more declarative approach.

### Parsing strings into documents

```ts
import io from 'internet-object';

// Parse a document with schema
const doc = io.doc`
  name, age, email
  ---
  ~ Alice, 30, alice@example.com
  ~ Bob, 25, bob@example.com
`;

console.log(doc.toJSON());
// Output: [
//   { name: 'Alice', age: 30, email: 'alice@example.com' },
//   { name: 'Bob', age: 25, email: 'bob@example.com' }
// ]
```

### Working with Definitions and Errors

You can provide external definitions and an error collector using the `.with()` modifier.

```ts
// Create definitions
const defs = io.defs`
  ~ $address: { street: string, city: string, state: string, zip: string }
  ~ $employee: { name: string, age: number, address: $address }
`;

// Create an error collector
const errors = [];

// Use definitions and error collector in document parsing
const doc = io.doc.with(defs, errors)`
  ~ $schema: { name, age, color: { string, choices: $colors } }
  ---
  ~ Alice, 30, red
  ~ Bob, 25, purple  // Invalid color
`;

if (errors.length > 0) {
  console.error("Validation errors:", errors);
}

console.log(doc.toJSON());
```

### Core Parsing Interfaces

For advanced use cases, you can access the underlying parsing components:

```ts
import { Tokenizer, ASTParser, IODocument, IODefinitions } from 'internet-object';

// Tokenize source code
const tokenizer = new Tokenizer(source);
const tokens = tokenizer.tokenize();

// Parse tokens into AST
const parser = new ASTParser(tokens);
const ast = parser.parse();

// Convert to IODocument or work with the AST directly
const doc = ast.toDocument();
```

### Work in Progress Status

- [x] Tokenizer
- [x] AST Parser
- [x] Schema
  - [x] Parsing
  - [x] Validation
- [x] Data Types
  - [x] Numbers
    - [x] Decimal Numbers
    - [x] Binary Number
    - [x] Hex Numbers
    - [x] Octal Numbers
  - [x] Strings
    - [x] Open Strings
    - [x] Regular Strings
    - [x] Raw Strings
  - [x] Boolean and Nulls
  - [x] DateTime
    - [x] DateTime
    - [x] Date
    - [x] Time
  - [x] Base64 Binary Data
- [x] IOCollections
- [x] IODefinitions
- [ ] Serialization (WIP)
- [ ] API Interface Finalization (WIP)
- [ ] Errors Standardization (WIP)
- [ ] Optimization (WIP)
- [ ] Testing (WIP)

### Development Process

🚧 **Pull requests are currently not accepted.** Development is ongoing, and the API is still under finalization. Once the API is stable, we will welcome contributions. Please note that the following instructions are for reference only.

1. Fork repository from <https://github.com/maniartech/InternetObject-js>
1. Install dependencies `yarn install`
1. Make changes in `./src`
1. Update tests in `./tests/`
1. Run tests, `yarn test`
1. Send pull request(s)

For a comprehensive understanding of Internet Object, refer to the official specification available at [docs.InternetObject.org](https://docs.internetobject.org).

**ISC License:**

© 2018-2025 ManiarTech® - All rights reserved.

## 📚 Documentation

- **[LOAD-STRINGIFY-IMPLEMENTATION.md](./LOAD-STRINGIFY-IMPLEMENTATION.md)** - Complete guide for `load()` and `stringify()` APIs
- **[DOCUMENT-API.md](./DOCUMENT-API.md)** - Comprehensive documentation for `loadDocument()` and `stringifyDocument()` APIs
- **[docs/decimal.md](./docs/decimal.md)** - Decimal design, semantics, and usage
