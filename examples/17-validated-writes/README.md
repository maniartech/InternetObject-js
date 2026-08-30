# A document that cannot hold invalid data

Every library that tracks mutation can tell you *that* something changed. None of them can refuse a
change, because none of them has a schema. This one does, and that is the reason to hold a document
rather than plain data.

> **A schema-bearing document always holds valid data** — at parse, at load, at write, at insert, at
> attach. There is no fifth way in.

```ts
const doc = parseDocument('name: string, age: int\n---\n~ Alice, 30');

doc.data[0].age = 31;                 // fine
doc.data[0].age = 'thirty-one';       // throws expected-integer — nothing is written
doc.data[0].nickname = 'Al';          // throws unknown-member — the schema is closed

doc.data.push({ name: 'Dev', age: 41 });   // fine, and adopted by the section's schema
doc.data.push({ name: 'Dev' });            // throws missing-value — `age` is required
```

## No new rules

The check on a write is the same `TypeDef.load()` the loader runs, with the same member definition
and the same variable resolution. **A value a parse would reject is rejected here, with the code a
parse would have used.** Nothing was invented for the write path; an existing rule reached a call
site it never used to reach.

## Four doors, and the fifth

| | |
| --- | --- |
| **parse** | always validated |
| **load** | always validated |
| **write** — `rec.age = x`, `rec.set(k, v)` | validated against the record's schema |
| **insert** — `push`, `setAt`, `insert` | validated against the collection's schema, then adopted |
| **attach** — `attachSchema(schema)` | validates everything already held |

Fixing only the write would have left every row the user *added* unchecked — which is exactly the
rows a user is most likely to get wrong. Writes and inserts are one guarantee and shipped together.

### Inserting can replace the value

Adoption **re-loads** the record rather than checking it member by member, because a hand-built
record is wrong by what it omits at least as often as by what it holds. So the record the collection
stores is not always the object you passed:

```ts
rows.push({ name: 'Dev', age: 41 });
const added = rows[rows.length - 1];    // the adopted, validated record
```

A push that rejects one of several stores none of them.

### Attaching is atomic

Without a sink it throws and nothing is attached. With a sink it reports *every* mismatch and still
changes nothing — which makes it the answer to *"does this data satisfy that schema?"*, a capability
rather than a side effect. Either way, a schema-bearing container never comes to hold data its own
schema forbids.

### No schema, no checking

An object with no schema validates nothing. That is vacuous rather than an exception: there is no
shape to check against. It is what keeps the invariant above uncaveated.

## Why it matters at the file boundary

Collecting errors instead of throwing is only safe because a broken document cannot silently become
a broken file. **A projection may describe errors; a file must not contain them.**

```ts
doc.toObject();                                 // error nodes embedded — the playground shows these
stringifyDocument(doc);                         // throws forbidden-error-node
stringifyDocument(doc, { skipErrors: true });   // writes the records that validated
```

Run it: `npx tsx examples/17-validated-writes/index.ts`
