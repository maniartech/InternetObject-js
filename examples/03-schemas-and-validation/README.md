# Schemas and validation

You have already written schemas. `name: string, age: int` **is** a schema — naming the fields and typing them are the same act, so there is no second file and no separate step to remember.

Because the schema is right there, bad data is caught **as the document is read**:

```ts
const errors: Error[] = [];
parse('name: string, age: int\n---\n~ Alice, thirty', null, errors);
// errors[0].errorCode === 'expected-integer'
```

## Two ways to receive a problem

Pass an **errors array** and parsing continues, collecting what it finds — good for showing a user everything wrong at once. Leave it out and the first problem **throws** — good when you only want to proceed with valid data.

## Saying more than the type

A member can carry rules. Wrap it in braces and name them:

```ruby
name:  {string, minLen: 2, maxLen: 40},
age:   {int, min: 0, max: 130},
role:  {string, choices: [admin, editor, viewer]}
```

Each is checked for you, and each has its own error code — `mismatched-min-len`, `mismatched-max`, `mismatched-choice`. You branch on the code, never on the message.

## Absent and null are different questions

- `nickname?: string` — the member **may be missing**.
- `manager*: string` — the member's value **may be null**.

They are genuinely different, so they have different marks. A member can be both: `middleName?*: string`.

A `default` fills an optional member that was not supplied:

```ruby
active?: {bool, default: T}
```

Next: **04 — The type system**, and the types JSON never had.
