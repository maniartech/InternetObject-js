# Validating JavaScript data

You do not need Internet Object *text* to use an Internet Object *schema*. If the data is already in your program — from an API, a form, a database — you can check it directly.

```ts
const schema = parseDefinitions(`~ $schema: {
  name:  {string, minLen: 2},
  age:   {int, min: 0, max: 130},
  email: email
}`);

validate({ name: 'Alice', age: 30, email: 'alice@example.com' }, schema);
// { valid: true }
```

## Which function do I want?

| Function | Gives you | On bad data |
| -------- | --------- | ----------- |
| `validate(data, schema)` | `{ valid, errors }` | never throws |
| `load(data, schema)` | an `IODocument` | throws |
| `loadObject(data, schema)` | an `IOObject` | throws |
| `loadCollection(data, schema)` | an `IOCollection` | throws |

**Use `validate` for anything a user typed.** Invalid form input is an expected outcome, not an exceptional one, and you usually want to show every problem at once rather than the first.

**Use `load` when valid data is the only acceptable outcome** — a config file, an internal message. Failing loudly is the correct behaviour there, and the thrown error carries the same code and position as always.

## Why bother, if you have TypeScript?

Types vanish at runtime. TypeScript tells you your *code* is consistent; it cannot tell you the JSON that just arrived over the network matches what you promised. A schema checks the data that actually showed up.

## Two directions, one schema

The same schema validates JavaScript here and validates text in example 03. Write the rule once and it holds at both doors.

Next: **06 — Writing IO text**.
