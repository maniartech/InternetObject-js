# The core classes

`toObject()` returns plain JavaScript and is all most code needs. Underneath are two small classes worth knowing, because they keep something a plain object cannot: **order**, and access by position.

```ts
person.get('name')   // by key
person.getAt(0)      // by position
person.keyAt(2)      // the name at a position
person.length
```

## Position follows the schema

This is the part that surprises people, and it is the useful part.

Build an object with its keys in the order `city, age, name`, against a schema declaring `name, age, city`, and you get **the schema's order**. `getAt(1)` is `age` — whether the record was parsed from text, loaded from a JavaScript object, or assembled one `set()` at a time.

That is what makes positional access meaningful at all. If order followed whatever the input happened to do, `getAt(1)` would mean something different depending on where the data came from, and code that reads by index would break on data that is perfectly valid.

Members the schema does not declare — the extras an open schema allows — follow the declared ones, in arrival order.

## Two projections

| Method | Gives you | Use when |
| ------ | --------- | -------- |
| `toObject()` | native values — `Date`, `Decimal`, byte arrays | the value stays in your program |
| `toJSON()` | JSON-safe values — ISO strings, base64 | the value is leaving |

Both are lossless in their own terms. `toJSON()` is the one to reach for at a boundary, because its output means the same thing in every runtime.

Next: **11 — Precise numbers**.
