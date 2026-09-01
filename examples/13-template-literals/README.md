# Writing Internet Object inline

For tests, fixtures and small constants, putting the document directly in your code beats keeping a separate file in step with it.

```ts
import io from 'internet-object';

const people = io`
  name: string, age: int
  ---
  ~ Alice, 30
  ~ Bob, 25
`;
// [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
```

## Five tags, five scopes

| Tag | Gives you |
| --- | --------- |
| ``io`…` `` | **plain JavaScript** — the same as `parse(text)` |
| ``io.doc`…` `` | a whole document — header and data, the same as `parseDocument(text)` |
| ``io.object`…` `` | a single object |
| ``io.schema`…` `` | a schema |
| ``io.defs`…` `` | header definitions |

The first two are the pair from example 16, in tag form. The rule that decides between them is the same one: take the plain form unless you need the document *as* a document.

Pick the smallest tag that says what you mean. A fixture that only needs one record reads better as `io.object` than as a document with a header attached.

## Bringing your own definitions

Every tag has a `.with(defs, sink)` form, so the schema can live in your code while the tagged text carries data alone:

```ts
const person = io.schema`{name: string, age: int}`;
io.with(person)`Alice, 30`;      // { name: 'Alice', age: 30 }
```

The second slot is an error sink — an array to fill or a function to call — exactly as it is on `parse`, `load` and `validate`.

## Interpolation

Values interpolate, so a fixture can be built from real variables:

```ts
const city = 'NYC';
io`name: Alice, city: ${city}`;
```

An interpolated `${value}` is written as a **value**, never spliced in as source. That matters more than it sounds: real data is full of commas, colons and slashes, and every one of them is syntax here. `${'Smith, John'}` stays one string; `${'1,000'}` stays one thousand. You never have to quote or escape an interpolated value yourself, and you cannot forget to.

## A tag needs a literal

This is the whole difference between the tags and the functions. A tag is written against text you type; a function takes text you already hold in a variable — from a file, a response, an editor, or a parameter:

```ts
const src = 'name: string, age: int\n---\n~ Alice, 30';

parse(src);      // ✅ [{ name: 'Alice', age: 30 }]
io`${src}`;      // ❌ { "0": "name: string, age: int\n---\n~ Alice, 30" }
```

The second line is not an error — it is the interpolation rule working exactly as documented. `src` is a *value*, so the whole document arrives as one string, bound to position `0`. That is the same rule that keeps `${'Smith, John'}` in one piece, and it is why text you receive belongs in a function.

## When to use this, and when not

**Good for**: unit tests, fixtures, small defaults, examples like these.

**Less good for**: anything a non-programmer edits, or anything large. A schema shared across services belongs in its own file, where it can be reviewed and versioned without a rebuild.

Next: **14 — Streaming**.
