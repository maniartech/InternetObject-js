# Serialization Specification (`stringify` / IO-text output)

Status: **IMPLEMENTED (2026-07-15)** — the model below (§0) is the finalized, shipped behavior.
Sections §1–§12 are the original design history; where they conflict with §0, **§0 wins.**

---

## §0. FINALIZED MODEL (2026-07-15) — supersedes §2/§4/§10.1/§12

Serialization has **two levels** and **two switches**. The full rationale + examples live in
`io-test-cases/SERIALIZATION-DECISIONS.md`; behavior is locked by `tests/facade/emit-keys.test.ts`.

**Levels.** An **IOObject** serializes to *values* (a data row). An **IODocument** = header + `---` +
data. Only a Document has a header; **no schema is ever inferred on serialize** (a schema-less
Document emits no header and lets `emitKeys` govern the data).

**Switch 1 — `includeHeader`** (Document only): emit the header (a *provided* schema/definitions) or
not. *(Note: the original §2 "or inferred" is withdrawn — no inference on serialize.)*

**Switch 2 — `emitKeys: 'all' | 'extras' | 'none'`** (default **`'extras'`**), governs both IOObject
and Document data rows. The single rule (`utils/string-formatter.ts:shouldEmitKey`):

| member | `'none'` | `'extras'` (default) | `'all'` |
|---|---|---|---|
| keyless / positional | bare | bare | bare |
| field declared in schema | bare | bare | `key: value` |
| extra (open schema) / **no schema** | bare | `key: value` | `key: value` |
| extra on a **closed** schema | error | error | error |

So `'extras'` = *emit a key only when the schema can't recover the name* (lossless default); `'all'`
= fully self-describing; `'none'` = leanest (lossy). Type suffixes (`42n`/`3.14m`) and key-quoting
(`"5":`, `"null":`) are unchanged (§6/§7).

The `includePositionalKeys` boolean is renamed to `emitKeys` (enum).

---

## 1. Core principle

Internet Object exists to move **data**, not **names**. A schema is a *shared contract that
lives at the endpoints/nodes* — it does not have to travel with every payload. Therefore the
normal, high-frequency wire form is **pure positional values**: the receiver already knows the
schema, so field names on the wire are redundant. That redundancy elimination is the whole
point of the format.

Names appear in the output **only** when they are not otherwise recoverable:

> A field is emitted **positionally** (bare value) when its name is recoverable from a schema
> in scope — a document header, a section schema, or a parent member-def. A name is emitted
> **inline** (`key: value`) only when it cannot be recovered any other way. A name is never both
> hoisted into a schema *and* repeated inline.

Serialization is **schema-driven**: the positional-vs-inline decision comes from schema
membership, not from guessing at a value's stored key.

---

## 2. Two orthogonal switches

### `includeHeader` (boolean)
Does the schema / metadata header travel with the payload?
- `false` — no header. Data only. The schema is assumed known at the endpoint.
- `true`  — emit the header (schema, provided or inferred) + `---` + data.

### `includePositionalKeys` (boolean)
> Read literally: *include **positional** keys*. It governs **only structural (positional)
> names** — the names a schema position already implies. It does **not** affect non-positional
> keys, which are always emitted (see [§4](#4-structural-vs-non-positional-keys)).

- `false` *(default)* — positional fields emit as bare values (`10`). Structural names suppressed.
- `true` — positional fields also spell out their name inline (`a: 10`). Fully self-describing.

### Defaults
- `includePositionalKeys`: **`false`** (firm — the lean wire form is the default).
- `includeHeader`: **`true`** (settled). This is already the library default
  (`stringify-document.ts:84`, `options.includeHeader ?? true`) and is the safe, least-surprise
  choice: `stringify(parse(doc))` reproduces the schema rather than silently dropping it. The
  lean/wire form (no header, names known at endpoint) is the deliberate **opt-in** `false`.

---

## 3. Precedence

**`includePositionalKeys` has effect only when `includeHeader` is `false`.**

When a header is present it already carries every structural name, so the data stays positional
regardless of `includePositionalKeys`. The `includeHeader: true` + `includePositionalKeys: true`
combination is **allowed but redundant**: `includeHeader` wins, `includePositionalKeys` is a
no-op. We do **not** throw on this combination (brittle, no safety gain); precedence is
predictable and the output stays unambiguous. A dev-time warning is optional, not required.

Matrix for `{ a: 10, b: 20 }` under schema `a, b`:

| includeHeader | includePositionalKeys | output |
|---|---|---|
| `false` | `false` *(default)* | `10, 20` |
| `false` | `true` | `a: 10, b: 20` |
| `true` | `false` | `a, b` ⏎ `---` ⏎ `10, 20` |
| `true` | `true` | `a, b` ⏎ `---` ⏎ `10, 20` (positional-keys ignored) |

---

## 4. Positional vs non-positional keys (the dividing line)

Every member's key is one of two kinds. This is the single decision the serializer makes.

- **Positional key** — a name that a header/schema can carry, or that position already implies.
  **Governed by `includePositionalKeys` / the header.** In lean mode (header off, positional-keys
  off) it is **dropped**; with a header it is **hoisted into the header**; with positional-keys on
  (no header) it is **inlined**. This covers: keyless members, **named/non-numeric keys**
  (`firstName`, `age`, `a` — these are schema field names), and a numeric key equal to its ordinal
  index (`"0"` at slot 0).
- **Non-positional key** — a key that position/schema cannot recover, so it is **always emitted**,
  in every mode, as `key: value` (quoted per §7). This covers: a numeric key that ≠ its ordinal
  index (`"5"` sitting in slot 1 — a displaced/sparse slot), and a named key that is **not** in an
  in-scope schema (an extra / wildcard field).

The decision function the three serializers share:

```js
// true  → print "key: value"  (non-positional; always shown)
// false → positional          (header/dropped/inlined per the two flags)
function isNonPositionalKey(key, index, schema) {
  if (key === undefined)          return false; // keyless        → positional
  if (key === String(index))      return false; // "0" at slot 0  → positional (redundant)
  if (isNumeric(key))             return true;  // "5" at slot 1  → non-positional (displaced)
  if (schema && !schema.has(key)) return true;  // named extra not in schema → non-positional
  return false;                                 // named key      → positional  (Option A, §12)
}
```

Worked example — a named-key object across the three modes (settled with Aamir, 2026-07-08):

```
OBJECT:  { firstName: "John", lastName: "Doe" }

header ON (default):              header OFF, posKeys OFF (lean):   header OFF, posKeys ON:
  firstName, lastName               John, Doe                        firstName: John, lastName: Doe
  ---
  John, Doe

Non-positional key rides along in every mode:
  { Alice, "5": 100 }  →  Alice, "5": 100        (Alice positional/bare, "5" always shown)
```

Consequences (these were the two edge cases raised during design; both resolve here):
1. `{ Alice, "5": 100 }` in default positional mode → `Alice, "5": 100`. The positional `Alice`
   is bare; the explicit `"5"` rides along as data.
2. Extra fields beyond the endpoint schema, header off, keys off → the extras still emit inline;
   they are never silently dropped.

---

## 5. Scenario table (the "should")

`S` = schema in scope (document header, section schema, or parent member-def; possibly none).

| # | Scenario | Emits |
|---|---|---|
| 1 | Scalar | Type-preserving literal: `10`, `"hi"`, `42n` (bigint), `3.14m` (decimal), `T`/`F`, `N`, `dt'…'`, `b'…'`. Must round-trip to the same **type**, not just value. |
| 2 | **Default (header off, positional-keys off)** | Positional values only — `10, 20`, `~ John, 25`. Schema assumed at endpoint. |
| 3 | Header on | Schema (provided or inferred) as header, `---`, then positional data. |
| 4 | Positional-keys on (header off) | Inline `a: 10, b: 20` — self-describing, no header. |
| 5 | Keyless / index-only member | Bare value — **emit it** (never skip; skipping was the real FINDINGS #25 bug). |
| 6 | Field named in `S` | Positional, in `S` order. |
| 7 | Field **not** in `S` (extra / `{*}` wildcard) | Inline `key: value` after the positional run. |
| 8 | Nested object, parent member-def names it | Positional `{ 10, 20 }`. |
| 9 | Nested object, no governing schema, positional-keys off | Positional `{ 10, 20 }` (endpoint resolves names). Positional-keys on → `{ a: 10, b: 20 }`. |
| 10 | Mixed positional + explicit keys | Positional run bare, explicit keys inline → `Alice, "5": 100`. |
| 11 | Array | `[ … ]`, elements recursive; array of objects at a schema slot → each positional. |
| 12 | Numeric / keyword key (only when a key is emitted) | Quote it → `"5": 100`, `"null": x`. |

---

## 6. Type-preserving scalars

Round-tripping must preserve the **value type**, not only the printed value:
- `bigint` → trailing `n` (`42n`) so it re-parses as bigint, not number. Explicit display
  formats (hex/octal/binary/decimal) emit the plain numeric string per their format.
- `decimal` → trailing `m` (`3.14m`) so it re-parses as decimal, not number.
- `boolean` → `T`/`F` (or `true`/`false`); `null` → `N`/`null`; datetime → `dt'…'`;
  binary → `b'…'`.

---

## 7. Key quoting

When a key **is** emitted (non-positional key, or positional-keys mode), a key that would
otherwise mis-parse must be quoted so it round-trips as a string key:
- numeric-looking keys — `"5": 100`, `"3.14": x`
- keyword keys — `"null"`, `"true"`, `"false"`, and short forms `"N"` / `"T"` / `"F"`

Bare open-string identifiers (`name`, `a b`) do not need quoting.

---

## 8. Current state / gap

The data model discards the bit that this spec needs. Verified storage of a parsed `IOObject`:

| Source | Stored `(key → value)` |
|---|---|
| positional under schema `name, age` / `~ John, 25` | `"name" → John`, `"age" → 25` |
| explicitly keyed `{ a: 10, b: 20 }` | `"a" → 10`, `"b" → 20` |
| keyless positional `{ Alice, … }` | `"0" → Alice` (key = stringified index) |
| explicit numeric key `{ …, "5": 100 }` | `"5" → 100` |

Rows 1 and 2 are **byte-identical** in storage: a schema-derived name is indistinguishable from
an author-written key. So a serializer that guesses positional-vs-inline from the stored key
alone cannot be correct.

- **Old serializer** guessed "no schema → everything positional," emitted all values bare, and
  thereby **dropped explicit keys** like `"5"` (→ `100`, re-parses in the wrong slot). Real bug.
- **FINDINGS #25 serializer** guessed `key === String(index) ? bare : "key: value"`. It keeps
  explicit `"5"` and keyless `Alice`, but **wrongly inlines** schema-named fields (`name: John`)
  and plain keyed objects (`a: 10`) — because their stored key ≠ index. This made **inline keys
  the default**, which contradicts [§2](#2-two-orthogonal-switches). It broke 14 pre-existing
  tests (`tests/facade/io-formatter.test.ts`, `tests/streaming/writer.test.ts`) that correctly
  assert the default positional form (`John, 25`, `~ 1, Alice`).

**The 14 failing tests are correct.** They exercise the default positional form with a name
carrier at the document/stream level. #25 regressed them.

### Fix direction (schema-driven, not stored-key-guessing)
1. **Positional is the default.** In the header-off / positional-keys-off path, emit each
   member's **value** (bare); do not skip keyless members (fixes the genuine #25 drop bug).
2. **Confine structural-name emission to `includePositionalKeys: true`.** The
   `key === index ? … : "key: value"` machinery belongs *only* in that branch.
3. **Decide positional-vs-inline from schema membership**, not from comparing the stored key to
   the index. With a schema in scope, fields in the schema are positional (in order); fields not
   in the schema are non-positional keys and emit inline ([§4](#4-structural-vs-non-positional-keys)).
4. Distinguish structural from explicit by **layering (a) over (b)** (settled — see §10.1):
   (a) when a schema is in scope, decide by schema membership; (b) when no schema is in scope,
   fall back to a `keyed` provenance bit on `IOObject` members, propagated from `MemberNode.key`
   (the AST already records keyed-vs-positional — `members.ts:6`). Both are needed: (a) alone
   leaves the pure-no-schema mixed case (`{ Alice, "5": 100 }`) ambiguous.

Three serializers share the same no-schema branch and must move together:
`src/facade/io-formatter.ts`, `src/facade/stringify.ts`, `src/schema/types/object.ts`.

---

## 9. Round-trip contract (unchanged intent)
- `includeHeader: true` — full document; `parse → stringify → parse` preserves the value model
  and `stringify → parse → stringify` is a fixed point.
- `includeHeader: false` — **data-only** projection **by design**. Names are intentionally
  absent (they live at the endpoint); the weaker contract is "emits valid, re-parseable IO."
  This is not data loss — it is the format's purpose.

---

## 10. Resolved decisions (2026-07-07)

Settled after review. These are binding for implementation.

### 10.1 The decision is computable from `(key, index, schema)` — no provenance bit needed
**Superseded by the §12 Option-A ruling (2026-07-08).** `isNonPositionalKey(key, index, schema)`
(§4) decides everything: keyless / named / index-matching-numeric → **positional**;
displaced-numeric / named-not-in-schema → **non-positional**. Verified by a pure-logic test: it
yields identical, correct decisions whether positional members are stored index-collapsed (`"0"`)
or keyless (`undefined`) — the keyless-vs-index distinction never changes the output. Consequences:

- **The step-2 `push`/provenance change (`objects.ts:69`) is unnecessary** for serialization and
  should be **reverted** — it removes the parse-path change and its `keyMap` / `get("0")` risk
  surface. Keep the original `o.set(i.toString(), …)`.
- **§8's "byte-identical name" ambiguity is moot under Option A.** A schema-derived name and an
  author-written name are both *named → positional → bare*; they are treated identically, so they
  never needed distinguishing. The old "layer (a) over provenance bit (b)" plan is withdrawn.
- **Schema is needed only for the extras clause** (`schema && !schema.has(key)`), i.e. open /
  wildcard schemas where the data carries more fields than the schema. Closed-schema and no-schema
  cases decide from `(key, index)` alone — so the heavy "thread the schema everywhere" rework is
  not required; thread it only where extras can occur.

### 10.2 `includeHeader` default = `true` (no change)
Already the library default (`stringify-document.ts:84`). Safe/least-surprise: `stringify(parse
(doc))` reproduces the schema instead of silently dropping it. Lean-wire is the deliberate
opt-in `false`. Keeps `roundtrip.test.ts` valid.

### 10.3 `includePositionalKeys` ⊥ `includeTypes`
Orthogonal, compose with no interaction. `includeTypes` decorates the **schema/header** and is
already unconditionally suppressed in **data rows** (`stringify-document.ts:161-162`).
`includePositionalKeys` controls structural **names** in data rows. Invariant kept: no type
annotations in data rows, so `includePositionalKeys: true` yields clean `a: 10`, never
`a: 10 (type)`.

### 10.4 io-formatter unit tests (superseded by §12 ruling)
~~The 8 `io-formatter.test.ts` cases are schema-backed; restore via schema-wiring to
`formatRecord`.~~ **No longer needed.** Under the §12 Option-A rule, `{ name:John, age:25 }` →
`John, 25` because named keys are *positional → bare* directly from storage — no schema, no test
edits, no `formatRecord` wiring. Kept here only to record why the earlier plan was dropped.

### Implementation checklist (derived — simplified per §10.1 / §12 ruling)
1. Add `includePositionalKeys?: boolean` (default `false`) to `StringifyOptions`.
2. **Revert the step-2 `push` change at `objects.ts:69`** — provenance is not needed (§10.1).
   Keep the original `o.set(i.toString(), …)`. This drops the parse-path change and its
   `keyMap`/`get("0")` risk surface entirely.
3. Implement `isNonPositionalKey(key, index, schema)` (§4) and apply it uniformly in the three
   serializers (`io-formatter.ts`, `stringify.ts`, `object.ts`): non-positional ⇒ `key: value`
   (quoted per §7); positional ⇒ bare in lean, hoisted to header when `includeHeader`, inlined
   when `includePositionalKeys`. **No heavy schema-threading** — pass the in-scope schema only so
   the `!schema.has(key)` extras clause can fire (open/wildcard); closed/no-schema need `(key,
   index)` only.
4. Revert the FINDINGS #25 inline-default change (branch-3); **restore** the 14 tests (they pass
   on the storage rule — named keys are positional → bare — so no test edits and no `formatRecord`
   schema-wiring are required; §10.4 is subsumed).
5. Keep: don't-skip-keyless (§5.5), bigint/decimal suffix (§6), key quoting (§7).
6. Re-verify `roundtrip.test.ts`, the §3 matrix, §5 scenarios, and the full suite.

---

## 11. Reviewer sign-off (2026-07-08)

**Green light — the plan is right.** All six checklist steps match §10 and the sequencing is
correct. The only substantive correction is that **checklist #2 is a parse-path change at
`objects.ts:69`, not a view-layer tweak** (see §10 checklist #2). With that adjustment the plan is
sound and implementable. Recommended execution order:

1. Add `includePositionalKeys` (default `false`) — isolated, safe.
2. **Provenance as its own commit-gate step:** flip `objects.ts:69` to `push`, run the **full
   suite**, and fix whatever `get("0")` / `keyMap` / positional-validation consumers break
   **before** moving on. This is the one step that can ripple — do **not** bundle it with the
   serializer rework.
3. Rework the three serializers to **(a)-over-(b)**.
4. Revert #25 branch-3, **restore** the 14 tests.
5. Keep the good #25 parts (don't-skip-keyless, bigint/decimal suffix, key quoting).
6. Re-verify round-trip + full suite + §3 matrix + §5 scenarios.

**Roles:** implementation runs in a separate chat; this spec's owner is the **reviewer** and will
verify the implementer's diff against §10 (default-positional, provenance step gated, 14 tests
restored, good #25 parts kept, §3 matrix + §5 scenarios hold, round-trip green). Nothing committed
until the user reviews.

---

## 12. RESOLVED — lean-mode keys: named = positional, displaced-numeric = non-positional

Surfaced 2026-07-08 during step-3; **ruled by Aamir same day.**

**Ruling (Option A):** a **named / non-numeric key is a positional key** — governed by the header
and `includePositionalKeys`, never emitted for its own sake in lean mode. A **numeric key that
does not equal its ordinal index** (and a named key that is not in an in-scope schema) is
**non-positional** and is always emitted. See §4 for the decision function and the three-mode
worked example. Concretely, `{ firstName, lastName }`:

- header ON  → `firstName, lastName` / `---` / `John, Doe` (names hoisted into the header)
- header OFF, posKeys OFF → `John, Doe` (lean; names live at the endpoint)
- header OFF, posKeys ON  → `firstName: John, lastName: Doe`

And `{ a: 10, b: 20 }` (lean) → `10, 20`; `{ Alice, "5": 100 }` (any mode) → `Alice, "5": 100`.

**Retraction:** the earlier interim "(b) = `keyed ⇒ inline`" (which would wrongly inline
`a: 10, b: 20`) is **withdrawn**. The correct no-schema rule is `isNonPositionalKey` (§4):
keyless / named / index-matching-numeric ⇒ positional; displaced-numeric / non-schema-named ⇒
non-positional. This makes §3-matrix / §4 / §5 self-consistent.
