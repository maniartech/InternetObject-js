# Intrernet Object Library Interface Design Ideas

This document is a collection of ideas for the Internetobject lib interface. It is not
meant to be a complete specification, but rather a collection of ideas that
may or may not be implemented. These ideas are written in TypeScript, but
they are also applicable to JavaScript.

## Parsing strings into documents

```ts
import io from 'internetobject';

const doc:io.Document = io.doc`
  name, age, gender, address: {street, city, state, zip}
  ---
  ~ John, 25, M, {123 Main St, Anytown, CA, 12345}
  ~ Jane, 30, F, {456 Main St, Anytown, CA, 12345}`;

console.log(doc);
```

## Parsing with separate definitions

```ts
import io from 'internetobject';

const defs = io.defs`
  ~ @red: 0xff0000
  ~ @blue: 0x0000ff
  ~ @green: 0x00ff00
  ~ $schema: {
    name, age, gender, color, address: {street, city, state, zip}
  }`;

const doc = io.parseWith(defs)`
  ~ John, 25, M, @green, {123 Main St, Anytown, CA, 12345}
  ~ Jane, 30, F, @blue, {456 Main St, Anytown, CA, 12345}`;
```

## Working with documents

```ts
const collection = new io.Collection();
collection.push(
  io.Object("John Doe", 25, "M", "@green", new io.Object("123 Main St", "Anytown", "CA", "12345")),
  io.Object("Jane Doe", 30, "F", "@blue", new io.Object("456 Main St", "Anytown", "CA", "12345")),
)

const doc = new io.Document();
doc.data.pushToFirst(collection);
```

## Building Objects

Objects are the core and the building blocks of the Internetobject library. Objects can
be created in many ways. The following are some examples.

```ts
// Using the Object constructor
const o1 = new io.Object("John Doe", 25, "M", "@green", new io.Object("123 Main St", "Anytown", "CA", "12345"));

// Using the Object constructor with an array
const arr = [ "John Doe", 25, "M", "@green", new io.Object("123 Main St", "Anytown", "CA", "12345") ]
const o2 = new io.Object(...arr);

// Using string interpolation
const o3 = io.object`John Doe, 25, M, @green, {123 Main St, Anytown, CA, 12345}`;

// Using the Object.import method
const o4 = io.Object.import({
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

## Validate Document with external schema

Many times before sending a document to a remote, it is necessary to validate
the document against a schema/defs. While validating, if an invalid value is
encountered, a ValidationError is thrown.

```ts
try {
  doc.validate(defs);
  console.log("Document is valid");
} catch (e) {
  console.log(e);
}
```

## Other Tokenization and Parsing Interfaces

While performing tokenization and parsing, if an error is encountered, an
exception is thrown. The exception contains the line and column number of
the error. The exception may contain the token that caused the error.

```ts
const tokens = io.parser.tokenize(code)
const ast = io.parser.parse(tokens)

// Convert AST to Document
const doc = io.parser.compile(ast)

// Convert AST to Definitions
const defs = io.parser.compileDefs(ast)
```
