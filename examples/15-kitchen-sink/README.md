# The kitchen sink

Every concept in one file. If you read one example, read this one — then go back to the numbered
ones when you want depth on a single idea.

Twelve sections, in the order they build on each other:

| § | What it shows |
| - | ------------- |
| 1 | The shape a document projects to — **and why that shape matters** |
| 2 | The type system, and `?` optional vs `*` nullable |
| 3 | Schemas validating as the document is read |
| 4 | The three places an error can reach you |
| 5 | Definitions: `$schema` and `@variable` |
| 6 | Reading a document without converting it |
| 7 | Mutating data, and writing it back out as text |
| 8 | Mutating the **header** |
| 9 | `toObject()` vs `toJSON()` |
| 10 | Validating plain JavaScript you already have |
| 11 | Streaming |
| 12 | The whole round trip |

## The one rule to memorise

**The JSON projection is the shape your code sees.**

| Document | You get |
| -------- | ------- |
| One section holding a collection | an array — `[{…}, {…}]` |
| One section holding a single object | an object — `{name, age}` |
| Several sections | keyed by section name — `{users: […], posts: […]}` |

This is the same projection the [playground](https://play.internetobject.org/) prints. Paste a
document there, read the JSON panel, and write code against exactly what you read. That parity is
deliberate — a playground that showed a different shape from the one your editor sees would be worse
than no playground.

One consequence catches people out: **a single section unwraps.** A bare `---` names its section
`data`, but with only one section there is nothing to key against, so you never see `data` in the
output. Add a second section and the shape becomes keyed — so code that reaches into `result[0]`
needs to become `result.users[0]`.

## The header is not in the projection

`$schema` and `@variable` definitions describe the document; they are not members of it. So
`doc.toObject()` has no header key, and you reach the header directly:

```ts
doc.header.definitions.keys                  // ['$person', '@company']
doc.header.definitions.getValue('@company')  // 'Acme'
doc.header.definitions.set('@env', 'prod')   // and it serializes back out
```

§8 adds a variable to a parsed document and re-serializes it, so you can see the header round-trip.

## Two honest notes

**Optional and nullable are different.** `note?: string` means the member may be *absent*.
`note*: string` means it may be *null*. Writing `N` into a `?` member is an error — ask for both with
`?*`.

**`set()` does not validate today.** §7 shows a record that *has* its schema attached accepting
`'not-an-int'` into an `int` member, then serializing back out as invalid Internet Object text.
Validating writes is the job of the reactive Draft surface being designed in
`.private/docs/REACTIVE-CORE-SPEC.md`; until it lands, treat `set()` as a raw write and validate
separately with `validate()` (§10) if the value came from outside your program.

## Run it

```bash
npx tsx examples/15-kitchen-sink/index.ts
```

Or open it in the explorer — `npm run examples` — where the output you read is output that just ran.
