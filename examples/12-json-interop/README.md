# Working with JSON

Most systems have JSON on at least one side. Moving between the two is meant to be dull.

## JSON coming in

```ts
const defs = parseDefinitions('~ $schema: {id: int, name: string, email: email}');
const collection = loadCollection(dataFromApi, defs);
```

Two things happened that `JSON.parse` cannot do: the data was **checked** against a schema, and the result serialises smaller because the keys are not repeated per row.

## JSON going out

```ts
doc.toJSON()             // JSON-safe values
JSON.stringify(doc.toJSON())
```

A `Date` becomes an ISO string. Bytes become base64. These are the portable spellings — identical in Node, in a browser, in Deno, in a future Go implementation.

## The one rule

**`toObject()` when the value is staying in your program. `toJSON()` when it is leaving.**

`toObject()` keeps native types because that is what your code wants to work with. `toJSON()` converts them because that is what survives a network hop. Reaching for the wrong one is the only mistake available here, and it shows up immediately.

## What you give up

Nothing, in the JSON direction — every JSON value has an Internet Object equivalent.

Coming back the other way, JSON has no `decimal`, no `bigint`, no date. A `decimal` becomes a JSON string rather than a number, precisely so it does not become a float and lose the value it was chosen to protect.

Next: **13 — Template literals**.
