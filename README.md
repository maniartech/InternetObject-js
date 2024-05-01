# <img src="https://unpkg.com/internet-object@latest/logo/internet-object-logo.png" height="24px" alt="Internet Object" title="Internet Object"> Internet Object

Welcome to the official JavaScript repository for Internet Object, a lean, robust, and schema-first data interchange format designed for the Internet. As a well-structured alternative to JSON, Internet Object offers a user-friendly API for JavaScript and TypeScript, making it effortless to work with Internet Object documents.

For specification and more information, visit [InternetObject.org Docs](https://docs.internetobject.org).

## 🚧 Work In Progress - API MAY CHANGE

### Example Usage

The example below illustrates the usage of Internet Object for parsing a basic internet object document. Please be aware that the API is still in development and has not been officially released. This is purely for demonstration purposes.

#### Parsing strings into documents

```ts
import { ioDocument } from 'internet-object';

const doc = ioDocument`
  name, age, gender, address: {street, city, state, zip}
  ---
  ~ John, 25, M, {123 Main St, Anytown, CA, 12345}
  ~ Jane, 30, F, {456 Main St, Anytown, CA, 12345}`;

console.log(doc);
```

#### Parsing with separate definitions

```ts
import { ioDefinitions, ioDocument } from 'internet-object';

const defs = ioDefinitions`
  ~ @red: 0xff0000
  ~ @blue: 0x0000ff
  ~ @green: 0x00ff00
  ~ $schema: {
    name, age, gender, color, address: {street, city, state, zip}
  }`;

// Parse document with external definitions
const doc = ioDocument.with(defs)`
  ~ John, 25, M, @green, {123 Main St, Anytown, CA, 12345}
  ~ Jane, 30, F, @blue, {456 Main St, Anytown, CA, 12345}`;
```

#### Working with documents

```ts
import { Collection, Document, InternetObject } from 'internet-object';

const collection = new Collection();
collection.push(
  new InternetObject("John Doe", 25, "M", "@green", new io.Object("123 Main St", "Anytown", "CA", "12345")),
  new InternetObject("Jane Doe", 30, "F", "@blue", new io.Object("456 Main St", "Anytown", "CA", "12345")),
)

const doc = new Document();
doc.data.pushToFirst(collection);
```

#### Building Objects

In Internet Object, objects serve as the fundamental building blocks. There are numerous ways to create these objects. Below are a few examples.

```ts
// Using the Object constructor
const o1 = new InternetObject("John Doe", 25, "M", "@green", new io.Object("123 Main St", "Anytown", "CA", "12345"));

// Using the Object constructor with an array
const arr = [ "John Doe", 25, "M", "@green", new io.Object("123 Main St", "Anytown", "CA", "12345") ]
const o2 = new io.Object(...arr);

// Using string interpolation
const o3 = io.object`John Doe, 25, M, @green, {123 Main St, Anytown, CA, 12345}`;

// Using the Object.import method
const o4 = InternetObject.import({
    name: "John Doe",
    age: 25,
    gender: "M",
    color: "@green",
    address: {
      street: "123 Main St",
      city: "Anytown",
      state: "CA",
      zip: "12345"
    }
  })
```

#### Validate Document with external schema

Often, before transmitting a document to a remote location, it's crucial to validate the document against a predefined schema or definition. If the validation process detects an invalid value, it will throw a `ValidationError`.

```ts
try {
  doc.validate(defs);
  console.log("Document is valid");
} catch (e) {
  console.log(e);
}
```

#### Core Tokenization and Parsing Interfaces

During the tokenization and parsing process, if an error is encountered, an exception is promptly thrown. This exception pinpoints the exact location of the error. Furthermore, the exception may also detail the specific token that instigated the error.

```ts
const tokens = io.parser.tokenize(code)
const ast = io.parser.parse(tokens)

// Convert AST to Document
const doc = io.parser.compile(ast)

// Convert AST to Definitions
const defs = io.parser.compileDefs(ast)
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

© 2018-2024 ManiarTech®️. All rights reserved.
