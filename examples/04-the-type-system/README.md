# The type system

JSON has one number type — a float — and no date, no money, no email. Internet Object has the types you were working around.

## Numbers that keep their meaning

| Type | For | Why not JSON's number |
| ---- | --- | --------------------- |
| `int` | counts, ids | says whole number, and means it |
| `number` | measurements | same as JSON |
| `decimal` | **money** | exact: `0.1 + 0.2` is exactly `0.3` |
| `bigint` | large ids | every digit survives past 2^53 |

`decimal` and `bigint` are the two that matter most in practice, because they are the two JSON silently corrupts. An order total or a snowflake id goes in and a slightly different number comes out.

## Dates are values, not strings

```ruby
day:  d"2026-08-24"
at:   dt"2026-08-24T14:30:00.000Z"
```

You get a real `Date`, not a string you have to remember to parse. And an impossible date is **rejected** rather than rolled forward — `d"2026-02-30"` gives `invalid-date`, where most systems quietly hand you 2 March.

## Strings with a shape

`email` and `url` are checked for you. No regex to copy from somewhere.

## One thing to watch

A value containing `:` must be quoted, because a bare `:` separates a key from a value:

```ruby
site: "https://example.com"     # quoted
```

## The whole list

`string` `number` `int` `decimal` `bigint` `bool` `date` `time` `datetime` `email` `url` `array` `object` `any`

Short on purpose. Bytes are written as a literal — `b"SGVsbG8="` — rather than declared as a type.

Next: **05 — Validating JavaScript data**, for when the data is already in your program.
