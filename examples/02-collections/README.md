# Collections

One record is a curiosity. Many records is the point.

In JSON, every record repeats every key. Three records, nine repetitions of three names:

```json
[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob",   "email": "bob@example.com" }
]
```

In Internet Object you name the fields **once**, then list values:

```ruby
id: int, name: string, email: email
---
~ 1, Alice, alice@example.com
~ 2, Bob,   bob@example.com
```

The first line names and types the fields. `---` ends the header. Each `~` line is one record.

## Why it shrinks

The saving is not compression — it is simply not repeating yourself. At three records the example above is about **32% smaller**; at a hundred records it is **41%**, and the gap keeps widening, because JSON pays for the keys on every single row and Internet Object pays once.

That matters most where payloads are largest: API responses, exports, logs, anything with rows.

## The `~` is what makes it a collection

Not the row count. This is the one rule people trip on:

```ruby
~ Alice     # an array of one
Alice       # a single object
```

## Reading it

`toObject()` gives you a plain array of plain objects, so everything you already do — `map`, `filter`, destructuring — works unchanged.

Next: **03 — Schemas and validation**, where that first line turns out to be doing more than naming things.
