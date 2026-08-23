# Errors

An error here tells you three things: a **code**, a **fact**, and a **position**.

```
expected-integer
Expecting a value of type 'int' for 'age'
row 3, col 3
```

## Branch on the code, never the message

Codes are part of the contract and are stable. Messages are written for people and may be reworded at any time. `ErrorCodes` gives you them as constants:

```ts
if (err.errorCode === ErrorCodes.expectedInteger) { ... }
```

Every code reads `<predicate>-<subject>` — `expected-integer`, `missing-value`, `mismatched-max`, `duplicate-member` — drawn from a closed vocabulary, so a code you have never seen is still parseable at a glance.

## Where an error appears

This is the one thing worth knowing before you write a handler, because it decides where you look:

1. **Thrown** — structural problems, when you did not pass a collector.
2. **In the collector** — pass an array to `parse` and most validation failures land there, and parsing continues.
3. **On the value** — a malformed literal replaces the record it appeared in, and that record carries the code.

The example's `codeOf` helper checks all three. A helper that checks only one will cheerfully report "accepted" for a document that was plainly rejected — which is exactly the bug it was written to avoid.

## Collect or throw?

Pass an errors array when you want to report everything at once — a file of imported rows, a form. Omit it when the first problem should stop the work.

Next: **08 — Documents and sections**.
