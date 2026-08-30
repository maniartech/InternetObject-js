# `parse` or `parseDocument`?

Two entry points, one parser. They tokenize the same text, run the same schema rules, and produce
the same errors at the same positions. They differ only in what they hand back.

**Take `parse` unless you need the document as a document.**

```ts
import { parse, parseDocument } from 'internet-object';

parse('name: string, age: int\n---\n~ Alice, 30');
// [{ name: 'Alice', age: 30 }]        plain objects and arrays

const doc = parseDocument('name: string, age: int\n---\n~ Alice, 30');
doc.data[0].name;      // 'Alice'
doc.data[0].age = 31;  // validated against the schema
String(doc);           // back to Internet Object text
```

| | `parse` | `parseDocument` |
| --- | --- | --- |
| Returns | plain objects and arrays | the document |
| Native values (`Date`, `Decimal`, `BigInt`) | kept | kept |
| Crosses `structuredClone` / `postMessage` / RSC | ✅ | use `toObject()` |
| Header, sections, round trip to IO text | — | ✅ |
| Validated writes | — | ✅ |

`parse(text)` is exactly `parseDocument(text).toObject()`, and a test pins that equality on every
shape a document can take. One pipeline, two shapes — never two parsers that could drift.

## The shape is a contract

What `parse()` returns is what the playground's JSON panel shows: a lone section unwraps to its
data, several sections key by name. Paste a document at
[play.internetobject.org](https://play.internetobject.org/), read the panel, write your code against
it. That agreement is deliberate, and it is why the projection rules live in exactly one place.

## When the data is named like the API

Property access on a document is shadowable, by construction. A section really called `length`, or a
member really called `get`, resolves to the **data** — exactly as an own property shadows a
prototype method on any JavaScript object. That is the language's rule, not a convention this
library invented, and it is why enumeration (`Object.keys`, spread, `for..in`, `JSON.stringify`)
never shows you a method.

For code that must not break when the data happens to be named like the API, the functional forms
cannot be shadowed:

| | |
| --- | --- |
| `io.sections(doc)` | every section's data, **always keyed** — never unwrapped |
| `io.section(doc, name \| index)` | the section *object*: its name, schema name and errors |
| `io.header(doc)` | the header, which the projection deliberately does not carry |
| `io.isError(value)` | true for a failed record, in either shape it takes |
| `io.node(value)` | the core object behind the proxy — every method reachable by name |

`io.sections()` is also the escape from the unwrapping hazard: `toObject()` unwraps a lone section,
which is what application code wants, but means code written against a one-section document changes
shape the day a second section appears. Library and tooling code takes `io.sections()`.

## Errors

Whether you pass a sink is the whole of the fail-fast question — which is why there is no `strict`
option. With no sink the first error throws. With one, parsing continues and every error is
reported.

```ts
parse(text);                                  // throws on the first error
parse(text, defs, errors);                    // an array to fill
parse(text, defs, (e) => report(e));          // or a function to call
parse(text, defs, errors, { skipErrors: true });  // omit the failed records from the RESULT
```

`skipErrors` is a different axis from the sink: the sink decides where errors are *reported*,
`skipErrors` decides whether the failed records appear in the *result*. The document itself never
changes.

Run it: `npx tsx examples/16-parse-or-document/index.ts`
