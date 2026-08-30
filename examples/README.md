# Internet Object — Examples

A guided path from "I know JSON" to "I can use every part of this."

```bash
npm run examples        # then open http://localhost:5177
```

Every example is one folder with two files: a `README.md` that explains the idea, and an
`index.ts` you can actually run. The explorer shows both side by side and **runs the code in your
browser**, so the output you read is output that just happened — not output someone pasted in.

You can also run any example directly:

```bash
npx tsx examples/01-hello-internet-object/index.ts
```

Same file, same result. There is no separate "browser version" to fall out of date.

## The path

Take them in order the first time. Each one assumes only what came before it.

| # | Example | What you learn |
| - | ------- | -------------- |
| 01 | Hello, Internet Object | Parse your first document. It is JSON's data model with lighter syntax. |
| 02 | Collections | Name the fields once, list the values — and watch the payload shrink. |
| 03 | Schemas and validation | The first line *is* the schema, so bad data is caught as it is read. |
| 04 | The type system | `int`, `decimal`, `date`, `email` — the types JSON never had. |
| 05 | Validating JavaScript data | You already have objects. Check them against a schema. |
| 06 | Writing IO text | Turn values back into text, and choose how much of it to write. |
| 07 | Errors | Every error has a code and a position. Collect them or throw them. |
| 08 | Documents and sections | Headers, metadata, and more than one kind of record in one file. |
| 09 | Reusable schemas | Define a shape once, reference it by name, nest it, reuse it. |
| 10 | Core classes | `IOObject` and `IOCollection`: read by key, by position, or as plain JS. |
| 11 | Precise numbers | `decimal` and `bigint` — money and large ids that survive the round trip. |
| 12 | JSON interop | Move between the two formats in both directions, losing nothing. |
| 13 | Template literals | Write Internet Object inline in your code, with editor support. |
| 14 | Streaming | Read records as they arrive, without holding the whole document. |
| 15 | **The kitchen sink** | Everything above in one file — including header edits and the projection rule. |
| 16 | `parse` or `parseDocument`? | Two entry points, one parser. Which to take, and the reads that cannot be shadowed. |
| 17 | Validated writes | A document that cannot hold invalid data — at write, at insert, at attach. |

In a hurry? **Example 15 is the kitchen sink** — every concept in one runnable file.

## The shape you get back

Worth knowing before anything else, because it is also what the
[playground](https://play.internetobject.org/) prints — paste a document there, read the JSON panel,
and write code against exactly that:

| Document | You get |
| -------- | ------- |
| One section holding a collection | an array |
| One section holding a single object | an object |
| Several sections | keyed by section name |

## One thing worth knowing up front

There are two entry points, and the difference is the first thing to get straight — **example 16**
is about exactly this.

`parse()` gives you **plain JavaScript**: no wrapper, nothing to unwrap, and it survives
`structuredClone`, a worker boundary, or a React Server Component. Take it unless you need something
it does not carry.

`parseDocument()` gives you the **document** — sections, the header, writes that are validated
against the schema, and a round trip back to Internet Object text. It reads by name and by index
(`doc.data[0].name`, `doc.sections.employees[1].age`).

`toObject()` and `toJSON()` are conversions for a boundary — `toJSON()` for the wire, where a `Date`
has to become a string. They are not a toll you pay to use the language: a document works with
`for..of`, spread, `console.log` and `JSON.stringify` as it is.

## How to read an example

Each one is short and self-contained, with the concept in comments right where it happens. If a
line surprises you, change it and press **Run again** — the fastest way to learn a format is to
break it and read the error.

Prefer a blank page? The [playground](https://play.internetobject.org/) is the place to
experiment freely.

## Adding an example

1. Create `examples/NN-your-topic/`.
2. Write `index.ts`. Print with `console.log` — that is what the explorer captures.
3. Write `README.md` starting with `# Title`; the first ordinary line becomes the summary.

That is all. The explorer discovers it, and `tests/examples/examples.test.ts` starts running it —
so an example that stops working fails the build rather than quietly misleading someone.
