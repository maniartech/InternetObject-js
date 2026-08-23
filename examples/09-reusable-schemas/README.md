# Reusable schemas

Write a shape once, give it a name, use it everywhere.

A definition beginning with `$` is a **named schema**. It can then appear anywhere a type name could:

```ruby
~ $address: {street: string, city: string}
~ $schema:  {name: string, home: $address, work?: $address}
---
~ Alice, {Main St, NYC}, {Broadway, NYC}
```

Two members, one definition. Change the shape of an address once and both follow.

It works inside arrays too — `items: [$item]` is a list of that shape.

## Variables hold values, not shapes

`@name` defines a **value** you can reuse, which saves repeating a constant on every row:

```ruby
~ @currency: USD
~ $schema: {item: string, price: decimal, ccy: string}
---
~ Book, 12.99m, @currency
~ Pen,   1.50m, @currency
```

The distinction is worth keeping straight:

- `$name` — a named **schema**, a shape
- `@name` — a named **value**, a constant
- `$schema` — the default schema applied to the data

## Keeping the schema out of the document

Definitions do not have to live in the payload. Parse them once in your code and pass them in:

```ts
const defs = parseDefinitions('~ $schema: {name: string, age: int}');
parse('~ Alice, 30\n~ Bob, 25', defs);
```

Now the wire carries values only. This is the usual shape of an API: both ends hold the schema, and the network carries data. The same `defs` also validates plain JavaScript through `load` — one definition, both doors.

Next: **10 — Core classes**.
