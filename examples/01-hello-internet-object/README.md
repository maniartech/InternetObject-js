# Hello, Internet Object

Internet Object holds the same data JSON does — objects, arrays, strings, numbers, booleans, null — and writes it with less ceremony.

Here is the same record twice:

```json
{ "name": "Alice", "age": 30, "active": true }
```

```ruby
name: Alice, age: 30, active: T
```

Parse it and you get an ordinary JavaScript object. Nothing to unwrap, nothing exotic:

```ts
import { parse } from 'internet-object';

parse('name: Alice, age: 30, active: T').toObject();
// { name: 'Alice', age: 30, active: true }
```

## What changed, and what did not

**Quotes became optional.** A bare word is a string. You still quote anything containing a comma, a colon, or spaces you want kept — `"Hello, world"`.

**`T`, `F` and `N`** are true, false and null. The long spellings `true`, `false` and `null` work too; the short ones exist because they appear on every row of a large collection.

**Everything else is the JSON you know.** `[a, b, c]` is an array. `{x: 1}` is a nested object. Values keep their types.

## `toObject()` is a choice, not a step

Most examples here call `toObject()`, which makes it look compulsory. It is not.

`parse()` gives you a **document**, and a document is usable as it is:

```ts
const doc = parse('name: Alice, age: 30');
const record = doc.sections.get(0).data;

record.get('name');   // 'Alice'
record.getAt(0);      // 'Alice' - by position
```

`toObject()` is a **conversion** — reach for it when you want ordinary JavaScript objects to hand
to other code. Skip it when you are only reading, and you keep the record's order, its native
values, and access by position. Example 10 covers what that buys you.

## Try it

Change a value and press **Run again**. Then try breaking one — drop a closing brace, or put a comma inside an unquoted string — and read what comes back. Errors are covered properly in example 07, but it is worth seeing one early: they tell you what and where.

Next: **02 — Collections**, where the syntax starts paying for itself.
