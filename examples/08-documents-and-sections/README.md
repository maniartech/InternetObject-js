# Documents, headers and sections

A document has two halves, divided by `---`.

Above it, the **header**: schemas, definitions, and any metadata you want travelling with the data. Below it, the **data**.

```ruby
~ version: 2
~ $schema: {name: string, age: int}
---
~ Alice, 30
~ Bob, 25
```

`doc.toObject()` gives you the records. `doc.header.toObject()` gives you the metadata — separately, because a version number is *about* the payload, not part of it. In JSON you would have wrapped everything in `{ "meta": …, "data": … }` and then unwrapped it at the other end.

## More than one kind of record

A named section starts with `--- name: $schema`. One file, several shapes, each properly typed:

```ruby
~ $user:  {name: string, email: email}
~ $order: {id: int, total: decimal}
--- users: $user
~ Alice, alice@example.com
--- orders: $order
~ 1001, 49.99m
```

`toObject()` returns an object keyed by section name. You can also reach a section by name or index through `doc.sections`.

## Why this exists

Related records usually travel together — a user *and* their orders, a config *and* its defaults. Sections let one document carry them without inventing a wrapper object whose only job is to hold the other three, and without giving up the schema on any of them.

Next: **09 — Reusable schemas**.
