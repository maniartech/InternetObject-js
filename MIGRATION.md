# Migrating to 0.3

Five changes need code edits. Two of them are one-line renames; the other three refuse things that
used to pass silently, which is the point of them.

Nothing about the **format** changed. The same text parses to the same values with the same errors
at the same positions — checked against the 1,547-case conformance corpus and a snapshot of every
one of those parses, before and after. What changed is the interface around it.

| | Change | Effort |
| - | ------ | ------ |
| 1 | `parse()` returns plain JavaScript | rename to `parseDocument` where you used the document |
| 2 | `set()` and `push()` validate | remove the ones that were writing invalid data |
| 3 | Serializing a document with a failed record throws | pass `{ skipErrors: true }`, or fix the data |
| 4 | `ParserOptions` and the facade `strict` option are gone | delete them; they did nothing |
| 5 | The error sink reports every error | usually nothing — you get more, not fewer |

---

## 1. `parse()` returns plain JavaScript

The default is now the shape most code wants and the only one that survives `structuredClone`,
`postMessage`, or a React Server Component boundary.

```ts
// before
const doc = parse(text);
const rows = doc.toObject();

// after
const rows = parse(text);
```

If you were using the **document** — sections, the header, writes, a round trip back to IO text —
ask for it by name:

```ts
// before
const doc = parse(text);
doc.sections.get(0).data.getAt(0).get('name');

// after
const doc = parseDocument(text);
doc.data[0].name;
```

`parse` is exactly `parseDocument(...).toObject()`; a test pins that equality so the two can never
drift apart.

**Finding your call sites.** Every `parse(...)` whose result you then called `.toObject()`,
`.sections`, `.header`, `.errors` or `stringifyDocument()` on is a `parseDocument`. Everything else
is already right, and usually gets shorter.

### While you are there

The document reads by name and by index now, and the collection carries the whole array surface:

```ts
doc.data[0].name                    // was doc.sections.get(0).data.getAt(0).get('name')
doc.sections.employees[0].age       // by section name
doc.data.map(r => r.name).join(', ') // was [...rows.map(r => r.get('name'))].join(', ')
```

Property access is shadowable by construction: a section really called `length`, or a member really
called `get`, resolves to the **data**, exactly as an own property shadows a prototype method on any
JavaScript object. For code that must not break when the data is named like the API, the functional
forms cannot be shadowed:

```ts
io.sections(doc)     // { name: data, … }, always keyed, never unwrapped
io.section(doc, 0)   // the section object: name, schemaName, errors
io.header(doc)
io.isError(row)      // true for a failed record, in either shape it takes
io.node(rec)         // the core object behind the proxy — every method by name
```

---

## 2. `set()` and `push()` validate

**This is the reason to hold a document rather than plain data**, and the claim no state library can
make: none of them has a schema, so none of them can refuse a write.

```ts
const doc = parseDocument('name: string, age: int\n---\n~ Alice, 30');

doc.data[0].age = 'not-an-int';       // throws expected-integer — nothing is written
doc.data.push({ name: 'Dev' });       // throws: `age` is required
doc.data.push({ name: 'Dev', age: 41 });   // fine, and adopted by the section's schema
```

Same rules, same error codes, same messages as parsing the equivalent text. A value a parse would
reject is rejected here.

**What to do about it.** If a write starts throwing, it was writing data the schema forbids and
serializing it back out as text that would not parse. Fix the value, or drop the schema from that
document if it was never meant to have one — an object with no schema validates nothing.

**Inserting can replace the value.** A plain object becomes a record, and a hand-built record is
re-loaded so a *missing* member is caught as well as a bad one. Read the record back out of the
collection rather than keeping the reference you pushed:

```ts
rows.push({ name: 'Dev', age: 41 });
const added = rows[rows.length - 1];      // the adopted, validated record
```

Attaching a schema now checks what is already there, too. Without a sink it throws and nothing is
attached; with one it reports every mismatch and still changes nothing, which makes it the answer to
*"does this data satisfy that schema?"*:

```ts
rows.attachSchema(person);              // throws on the first record that does not fit
rows.attachSchema(person, defs, sink);  // reports all of them; the collection is untouched
```

---

## 3. Serializing a failed record throws

A projection may *describe* errors; a file must not *contain* them.

```ts
const errors: Error[] = [];
const doc = parseDocument(textWithABadRow, null, errors);

stringifyDocument(doc);                        // throws forbidden-error-node
stringifyDocument(doc, { skipErrors: true });  // writes the records that validated
doc.toObject();                                // unchanged — errors still embedded
```

Before, this wrote a JSON blob — `__proto__` key and all — into the `.io` text, and `skipErrors` was
ignored on that path entirely. So a collected error became a corrupt file with nothing to signal it.

`toObject()` and `toJSON()` are unaffected: they still embed error nodes, which is what the
playground displays.

---

## 4. `ParserOptions` and the facade `strict` option are deleted

```ts
// before — type-checked, ran, and did nothing
parse(text, { trueTokens: ['yes'], continueOnError: true });
load(data, defs, { strict: true });

// after
parse(text);
load(data, defs);
```

All ten `ParserOptions` fields had **zero read sites**: the instance the parser built was never
consulted, and `normalizeNewline` was not even assigned despite documenting a default. `strict` had
been a documented no-op since ADR 0001, and under the single error rule there is nothing left for it
to decide — *did you pass a sink?* is the same question.

Deleting them changes no behaviour, because they had none. Anything genuinely needed comes back when
something needs it.

> `LoadDocumentOptions.strict` is a **different** option, it genuinely works, and it is untouched.
> So is the streaming reader's strict framing.

---

## 5. The error sink reports every error

The sink and `doc.getErrors()` used to disagree in both directions. A syntax error reached
`getErrors()` but not the sink, so `sink.length` could read `0` while the data held an error node —
a caller doing the obvious thing was told there were no problems.

They now report the same set. You may see errors you were not seeing before; they were always there.

The sink also takes a function, and it is always the **third positional argument** — never an option:

```ts
const errors: Error[] = [];
parse(text, defs, errors);
parse(text, defs, (e) => report(e));
parse(text);                            // no sink: the first error throws
```

---

## Not changed

- The format, the tokenizer, the parser, the schema rules, every error code and position.
- `toObject()` / `toJSON()` — still the documented conversions at a boundary.
- The JSON projection: one section unwraps, several key by name. What the playground shows is what
  your code sees, and that is a contract.
- `load`, `loadObject`, `loadCollection`, `validate`, `stringify`, the streaming API, the template
  tags.
- `src/parser`'s own `parse` — internal, still returns a plain `Document`.

## 6. Every entry point takes the same four slots

```
(input, defs?, sink?, options?)
```

`parse` always had the sink in slot three. `load` had an **options object** there, and `validate`
had a shape unlike any sibling's — `(data, schemaOrDefs, defs?)`.

```ts
// before
load(data, defs, { errorCollector: errors });
validate(data, schema, defs);

// after
load(data, defs, errors);
load(data, defs, errors, { schemaName: '$User' });
validate(data, defs, errors);
```

**Both old shapes still work**, unambiguously: a sink is an array or a function, and neither an
options object nor a `Definitions` is either. `IOCommonOptions.errorCollector` is deprecated but
still read, and the positional sink wins where both are given.

Worth doing even so, because the old shape had a trap: `load(data, defs, errors)` put the array
where the options were expected, found no `schemaName` on it, and reported **nothing**. Silently.
That is the same positional trap that made `parse(text, errorArray)` collect nothing.

Two more consequences:

- **`load` and `loadObject` with a sink no longer throw** on a single bad object. The error is
  reported to the sink and recorded on the document, and the failed data is *not* stored — a
  schema-bearing document may not hold what its schema forbids.
- **`io.object.with(defs)` now returns an `IOObject`**, like `` io.object`…` `` itself. It used to
  return a plain object: the same tag with two return types, decided by whether definitions happened
  to be involved.

`io.doc.with(defs, sink)`, `io.object.with(defs, sink)` and `io.defs.with(defs, sink)` all take a
sink. **`io.schema.with(defs)` does not**, deliberately: schema compilation fails fast, so there is
no partial schema to hand back and nothing a sink could change.

## 7. New: `String(doc)`, and telling a UI that something changed

Neither breaks anything — they replace a default that told you nothing.

```ts
String(doc);   // the document as Internet Object text; it used to be "[object Object]"
`${doc}`;      // the same
```

It throws when the document holds a failed record, exactly as `stringifyDocument` does (§3);
`console.log` is unaffected, because that uses the inspector rather than `toString`.

```ts
const stop = io.subscribe(doc, (value) => render(value));   // returns an unsubscribe
io.version(doc);                                            // a monotonic number
```

`subscribe(fn)` calling `fn(value)` and returning an unsubscribe **is** the Svelte store contract,
so a document is already a Svelte store. React wants a snapshot instead, which is what `version` is
for — and needs no package:

```ts
const useIO = (doc) => useSyncExternalStore(cb => io.subscribe(doc, cb), () => io.version(doc));
```

Ten writes in one handler produce **one** notification, coalesced to a microtask, while the version
moves on every write — a render must not be able to miss an intermediate state. A document nobody
has subscribed to has no counter at all, so the cost to code that never uses this is a null check
per write.

They are functions rather than `doc.version` and `doc.subscribe` deliberately: `version` is a very
plausible section name, and property access on a document resolves data before methods.
