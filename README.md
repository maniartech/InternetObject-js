# <img src="https://unpkg.com/internet-object@latest/logo/internet-object-logo.png" height="24px" alt="Internet Object" title="Internet Object"> Internet Object

[![npm version](https://img.shields.io/npm/v/internet-object?style=flat-square)](https://www.npmjs.com/package/internet-object)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue?style=flat-square)](https://github.com/maniartech/InternetObject-js/blob/master/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/internet-object?style=flat-square)](https://www.npmjs.com/package/internet-object)
[![Build Status](https://img.shields.io/github/actions/workflow/status/maniartech/internetobject-js/ci.yml?branch=master&style=flat-square)](https://github.com/maniartech/InternetObject-js/actions)

**A data format for the wire and for humans — JSON's data model, a schema on the first line, and
about half the bytes for a collection.** Validated as it is parsed, with errors that say what and
where.

```ruby
id: int, name: string, email: email, age: int, active: bool
---
~ 1, Alice Johnson, alice@example.com, 30, T
~ 2, Bob Smith,     bob@example.com,   25, F
~ 3, Carol White,   carol@example.com, 28, T
```

The first line is the **schema**. `---` ends the header. Each `~` line is one **record** — values
only, in schema order, because the names were already said once. Three records above is 190 bytes
against 243 as JSON; at a hundred records it is **48% smaller**, and the gap only widens, because
JSON repeats every key on every row and Internet Object never does.

**Try it live at [play.internetobject.org](https://play.internetobject.org/)** — paste the block
above, break something, and watch the error land on the exact token.

## Why Internet Object?

- **Smaller on the wire.** Keys are written once, in the schema, not once per record. The saving
  grows with the data.
- **Validated as it parses.** A wrong type, a missing value, a bad email — reported with a code,
  a message, and a line and column. Not a separate validation step you forget to run.
- **Typed, with the types you actually need.** `int`, `number`, `decimal`, `bigint`, `bool`,
  `string`, `email`, `url`, `date`, `time`, `datetime`, `base64`, arrays, objects, nullable and
  optional members, choices, ranges, patterns — in the schema, not in your code.
- **Readable by a person.** Open strings need no quotes, records read like a table, and a
  document with a header is self-describing.
- **A format, not a library.** An [open specification](https://docs.internetobject.org) with a
  language-independent conformance corpus of 1,500+ cases, so an implementation in another language
  reads your data the same way this one does.

```
JSON                                            Internet Object
[                                               name: string, age: int
  {"name": "Alice", "age": 30},                 ---
  {"name": "Bob",   "age": 25}                  ~ Alice, 30
]                                               ~ Bob, 25
```

## At a glance

| | |
| - | - |
| **Install** | `npm install internet-object` |
| **Dependencies** | none |
| **Runtime** | Node ≥ 18 and modern browsers |
| **Modules** | ESM and CommonJS, TypeScript types included |
| **Size** | ~43 KB min+gzip for the full library, parser + schema + streaming |
| **License** | Apache 2.0 |
| **Spec** | [docs.internetobject.org](https://docs.internetobject.org) · **Playground** [play.internetobject.org](https://play.internetobject.org/) |

## Install

```bash
npm install internet-object           # stable (latest)
npm install internet-object@next      # preview (next)
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
console.log(doc.toObject());
// { name: 'Alice', age: 30 }
```

**What happened?**
- `parse()` reads the text and validates it against the embedded schema
- `doc.toObject()` gives you a plain JavaScript object

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
console.log(doc.toObject());
// [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }, { name: 'Carol', age: 28 }]
```

The `~` is what makes a collection, not the row count: a lone `~ Alice, 30` is an array of one,
and a bare `Alice, 30` with no `~` is a single object. Each `~` row is one record.

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

console.log(doc.toObject());
```

This is handy for tests, fixtures, and quick prototyping.

### 4. Create IO objects from JavaScript

Wrap plain JavaScript objects into IO structures (`IODocument` or `IOObject`). This is useful for building data programmatically before serialization or validation.

```ts
import { load, loadObject, IODocument, IOObject } from 'internet-object';

// 1. Create a full document
const doc = load({ title: 'User List', count: 10 });
console.log(doc instanceof IODocument); // true

// 2. Create a single IOObject
const user = loadObject({ name: 'Alice', active: true });
console.log(user instanceof IOObject); // true
// console.log(user.get('name')); // 'Alice'
```

### 5. Access values by key or index

IO objects support both key-based and positional access:

```ts
import { loadObject, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const user = loadObject({ name: 'Alice', age: 30 }, defs);

// By key
console.log(user.get('name')); // 'Alice'

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
console.log(users.getAt(1).get('name')); // 'Bob'
```

### 6. Validate JavaScript Data

Check your existing JavaScript objects against an IO schema.

**Method A: `load()` (Strict)**
Throws an error if validation fails. Use this when you need an `IODocument` instance or expect valid data.

```ts
import { load, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('name: string, age: {int, min: 30}');

try {
  // changing age to less than 30 will throw an error
  const doc = load({ name: 'Alice', age: 30 }, defs);
  console.log(doc.toObject());
} catch (e) {
  console.error('Validation failed:', e.message);
}
```

**Method B: `validateObject()` (Safe)**
Returns `{ valid, errors }` and never throws. Great for form inputs.

```ts
import { validateObject, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const result = validateObject({ name: 'Alice', age: 'thirty' }, defs);

if (!result.valid) {
  for (const e of result.errors) console.error(e.errorCode, e.message);
  // expected-integer  Expecting a value of type 'int' for 'age'
}
```

### 7. Convert JS data → IO text

Once you have validated data, you can serialize it back to IO format:

```ts
import { load, parseDefinitions, stringify } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const doc = load({ name: 'Alice', age: 30 }, defs);

console.log(stringify(doc));
// Alice, 30
```

This is the reverse of `parse()`. Round-trip: `parse()` → `toObject()` → `load()` → `stringify()`.

### 8. Named schemas (reusable types)

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

console.log(doc.toObject());
```

Schemas starting with `$` are named. `$schema` is the default schema used for validation.

### 9. Streaming API (Chunked I/O)

For large datasets or network streams, use `createStreamReader`:

```ts
import { createStreamReader } from 'internet-object';

const input = getSomeReadStream(); // Fetch Response, ReadableStream, Generator...
const reader = createStreamReader(input);

for await (const item of reader) {
  if (item.data) {
    console.log('Received:', item.data.toObject());
  }
}
```

Works with Node.js streams, WHATWG streams, `AsyncIterable`, or simple strings.

## Quick Reference

| I want to… | Use this |
|------------|----------|
| Parse IO text to JS | `parse(text).toObject()` |
| Validate JS data | `load(data, defs)` or `validateObject(data, defs)` |
| Convert JS to IO text | `stringify(load(data, defs))` |
| Embed IO in code | ``io.doc`...` `` |
| Create a schema | `parseDefinitions('~ $schema: {...}')` or ``io.schema`{...}` `` |
| Read stream | `createStreamReader(source)` |

<details>
<summary><strong>More Features</strong></summary>

### Parse with external definitions

Keep the schema out of the document — say, shared between a server and its clients — and pass it
in. Only `$schema` is applied to the data; other `$names` are there to be referenced.

```ts
import { parse, parseDefinitions } from 'internet-object';

const defs = parseDefinitions('~ $schema: { name: string, age: int }');
const doc = parse('Alice, 30', defs);
console.log(doc.toObject());
// { name: 'Alice', age: 30 }
```

### Collect errors instead of throwing

Pass an array and `parse()` keeps going, reporting every problem it can rather than stopping at
the first. Each error carries a stable `errorCode`, a message, and the row and column of the token.

```ts
const errors: Error[] = [];
const doc = parse(text, defs, errors);

for (const e of errors) console.error(e.errorCode, e.message);
// invalid-email     Invalid email address: not-an-email     at 3:13
// expected-integer  Expecting a value of type 'int' for 'age'  at 4:28
```

### Infer schema from data (experimental)

```ts
import { loadInferred } from 'internet-object';

const doc = loadInferred({ name: 'Alice', age: 30 });
// Schema is auto-generated: { name: string, age: number }
```

> **Experimental.** Inference is a convenience of this library, **not part of the Internet Object
> format** — it guesses a schema, where everything else is determined by its input. It carries no
> compatibility promise and may change in any release, and implementations in other languages need
> not provide it. For data you intend to keep or exchange, write the schema and use `load()`.

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
- Type system: ✅ (string, int, number, decimal, bigint, bool, email, url, date, time, datetime, base64, arrays, objects, nullable/optional, choices, ranges, patterns)
- Load/validate API: ✅
- Stringify API: ✅
- Error handling: ✅ (codes, messages, positions; accumulate or throw)
- Streaming: ✅
- Schema inference: 🧪 experimental — a convenience of this library, not part of the format

Per-feature **stability tiers** and the versioning policy live in the Internet Object **specification**
([docs.internetobject.org](https://docs.internetobject.org)). The current published implementation version is
shown by the npm badge at the top.

</details>

## Development

```bash
yarn install   # Install dependencies
yarn test      # Run tests
yarn build     # Build for production
```

### The conformance corpus

Internet Object is a format, not a library, so correctness is defined outside this repo. The
language-independent test corpus lives in the sibling repository
[`io-test-cases`](https://github.com/maniartech/io-test-cases), and `yarn test` runs it as part of
the suite — a reference implementation that does not run the contract on every commit is only a
second opinion that happens to be nearby.

Check it out alongside this one to get that coverage:

```
your-workspace/
  io-js2/          # this repo
  io-test-cases/   # the corpus
```

If the sibling is absent the corpus suites **skip** rather than fail, so building from a tarball
still works — but you are then running the library's own tests only. Cases are generated from the
tables in `tools/corpus/suites-*.ts`; edit those, never the `.io` files.

### Publishing

Maintainers: `bash scripts/publish-latest.sh` for a stable release, `bash scripts/publish-next.sh`
for a preview on the `next` tag.


## Contributing & Community

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started, report issues, or propose new features.

- **Issues**: [Report a bug](https://github.com/maniartech/InternetObject-js/issues)
- **Discussions**: [Join the conversation](https://github.com/maniartech/InternetObject-js/discussions)
- **X**: [@internetobject](https://x.com/internetobject)

## License

For the full specification, visit [docs.internetobject.org](https://docs.internetobject.org).

**[Apache License 2.0](./LICENSE)** · © 2018-2026 ManiarTech®

Permissive and corporate-friendly: use it in commercial or closed-source products, with
an explicit patent grant. Just retain the copyright and license notice.

*Internet Object* is a trade name and unregistered trademark of Maniar Technologies.
Per Section 6 of the license, the grant covers the code, not the name or the logos.
