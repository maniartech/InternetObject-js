# <img src="https://unpkg.com/internet-object@latest/logo/internet-object-logo.png" height="24px" alt="Internet Object" title="Internet Object"> Internet Object

Welcome to the official JavaScript repository for Internet Object, a lean, robust, and schema-first data interchange format designed for the Internet. As a well-structured alternative to JSON, Internet Object offers a user-friendly API for JavaScript and TypeScript, making it effortless to work with Internet Object documents.

For specification and more information, visit [InternetObject.org Docs](https://docs.internetobject.org).

## 🚧 Work In Progress - API MAY CHANGE

### Example Usage

The example below illustrates the usage of Internet Object for parsing a basic internet object document. Please be aware that the API is still in development and has not been officially released. This is purely for demonstration purposes.

#### Parsing strings into documents

```ts
import io from 'internet-object';

// Parse a document with schema
const doc = io.doc`
  name, age, email
  ---
  Alice, 30, alice@example.com
  Bob, 25, bob@example.com
`;

console.log(doc.toJSON());
// Output: [
//   { name: 'Alice', age: 30, email: 'alice@example.com' },
//   { name: 'Bob', age: 25, email: 'bob@example.com' }
// ]
```

#### Parsing with separate definitions

```ts
import io from 'internet-object';

// Define reusable schema
const userSchema = io.defs`
  name: string,
  age: number,
  email: string
`;


// Parse with external schema
const users = io.doc.with(userSchema)`
  Alice, 30, alice@example.com
  Bob, 25, bob@example.com
`;
```

#### Working with documents

```ts
import io from 'internet-object';

// Create a document using template literals
const doc = io.doc`
  name, age, gender, color, address: { street, city, state, zip }
  ---
  John Doe, 25, M, green, { 123 Main St, Anytown, CA, 12345 }
  Jane Doe, 30, F, blue, { 456 Main St, Anytown, CA, 12345 }
`;

console.log(doc.toJSON());
```

#### Building Objects

In Internet Object, there are multiple ways to create and work with data. Here are the modern approaches using the updated API:

```ts
import io, { ioObject, ioDocument, ioDefinitions } from 'internet-object';

// Using template literals for single objects
const person = ioObject`
  name, age, gender, color, address: { street, city, state, zip }
  ---
  John Doe, 25, M, green, { 123 Main St, Anytown, CA, 12345 }
`;

// Using the facade API (recommended)
const doc = io.doc`
  name, age, gender, color, address: { street, city, state, zip }
  ---
  John Doe, 25, M, green, { 123 Main St, Anytown, CA, 12345 }
  Jane Doe, 30, F, blue, { 456 Main St, Anytown, CA, 12345 }
`;

// Define reusable schema
const personSchema = io.defs`
  name: string,
  age: number,
  gender: { string, choices: [M, F] },
  color: string,
  address: {
    street: string,
    city: string,
    state: string,
    zip: string
  }
`;

// Use schema with data
const validatedDoc = io.doc.with(personSchema)`
  John Doe, 25, M, green, { 123 Main St, Anytown, CA, 12345 }
  Jane Doe, 30, F, blue, { 456 Main St, Anytown, CA, 12345 }
`;
```

#### Working with Definitions and Validation

Define schemas and variables for reuse and validation:

```ts
// Create definitions with variables and schema
const defs = io.defs`
  ~ colors: [red, green, blue, yellow]
  ~ $address: { street: string, city: string, state: string, zip: string }
  ~ $person: {
      name: string,
      age: number,
      gender: { string, choices: [M, F] },
      color: { string, choices: $colors },
      address: $address
    }
`;

// Use definitions in document parsing
if (defs) {
  const doc = io.doc.with(defs)`
    John Doe, 25, M, green, { 123 Main St, Anytown, CA, 12345 }
    Jane Doe, 30, F, blue, { 456 Main St, Anytown, CA, 12345 }
  `;

  console.log(doc.toJSON());
}
```

#### Core Parsing Interfaces

For advanced use cases, you can access the underlying parsing components:

```ts
import { Tokenizer, ASTParser, Document, Definitions } from 'internet-object';

// Tokenize source code
const tokenizer = new Tokenizer(source);
const tokens = tokenizer.tokenize();

// Parse tokens into AST
const parser = new ASTParser(tokens);
const ast = parser.parse();

// Convert to Document or work with the AST directly
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
  - [x] Binary Data
- [x] Collections
- [x] Definitions
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
