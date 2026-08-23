# Streaming Conformance Corpus

This is the **executable form** of [`../PROTOCOL.md`](../PROTOCOL.md). Every implementation, in every
language, MUST pass these cases to be called conformant. It is normative: if a case and the prose
disagree, that is a defect to reconcile (see [`../README.md`](../README.md#normative-precedence)).

Each case is a language-neutral JSON fixture in [`cases/`](./cases/). A test harness in any language
loads a case, drives its own streaming reader, and checks the emitted items against `expected`.

## Fixture format

```jsonc
{
  "name": "multi-record-under-one-schema",
  "description": "Two records share one explicit schema; one item per record.",
  "protocol": ["§4", "§5", "§6"],          // sections this case exercises (informational)

  "definitions": null,                       // optional preloaded definitions, as IO text, or null
  "options": { "defaultSchema": null },      // reader construction options (null fields = unset)

  "input": "~ $User: { name: string, age: int }\n--- $User\n~ Alice, 30\n~ Bob, 25\n",
  // OR, for encoding cases, raw bytes instead of `input`:
  // "inputBytesBase64": "77u/fSAuLi4=",

  "chunkings": ["whole", "per-line", "per-byte"],
  // Each named strategy splits `input` differently. ALL strategies MUST yield identical `expected`.
  // Explicit offsets are also allowed: { "offsets": [5, 12, 30] }

  "expected": {
    "items": [
      { "kind": "record",       "recordIndex": 0, "schemaName": "$User", "value": { "name": "Alice", "age": 30 } },
      { "kind": "record",       "recordIndex": 1, "schemaName": "$User", "value": { "name": "Bob",   "age": 25 } }
    ],
    "fatal": null
    // For fatal cases: "items": [ ...any items emitted before failure... ],
    //                  "fatal": { "category": "syntax"|"validation"|"general"|"stream", "code": "<errorCode>" }
  }
}
```

### Field rules

- **`value`** is the record value expressed as JSON, compared against the implementation's
  JSON projection of its record value (protocol §2 equivalence). Cases avoid types with no faithful
  JSON form; where needed, a `valueIO` field gives the canonical IO serialization instead.
- **`schemaName`** is present only when an explicit selector applied (protocol §6); omit it otherwise.
  When present it includes the `$` sigil.
- **`error` / `fatal.category`** is one of `"syntax"` / `"validation"` / `"general"` / `"stream"` — the
  error **category** as defined in [protocol §7.1](../PROTOCOL.md#7-error-model), derived from the error
  class, never a language class name. **`code`** is the stable code string: a core `errorCode` for the
  first three categories, or a streaming code (§7.3) for `"stream"`.
- **`chunkings`** is the heart of the corpus: the same input split every way MUST produce identical
  output. Harnesses SHOULD additionally fuzz random chunk boundaries (including mid-multibyte and
  mid-`---`) per protocol §11/§14.

## Harness contract

A conformant harness, for each case:

1. Builds preloaded definitions from `definitions` (if any) and constructs the reader with `options`.
2. For **each** chunking strategy, feeds `input`/`inputBytesBase64` split accordingly.
3. Collects emitted items; on a fatal error, records its `category` + `code`.
4. Asserts the items equal `expected.items` (in order, with `recordIndex`, `schemaName`, `value`) and
   that fatal outcome matches `expected.fatal`.
5. Fails the case if **any** chunking strategy diverges from another.

## Case index

Seed cases live in [`cases/`](./cases/). Categories to cover (expand over time):

- framing: single object, multi-record collection, empty/header-only/degenerate, mandatory `---`
- schema/state: explicit switch, implicit default schema (`schemaName` absent), preloaded defs,
  in-stream `$schema` precedence, header forward-reference
- errors: recoverable parse error + continue, multi-validation-error → one item, unknown-schema fatal,
  partial-frame-at-EOF
- encoding: split multibyte UTF-8, BOM stripping, `\r\n`/`\r` normalization
