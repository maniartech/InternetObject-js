# io-js2 Change Review Guide

> **Purpose:** review the uncommitted changes in `io-js2/` sensibly. The raw
> `git diff --stat` shows ~5,000 changed lines — that is **line-ending noise**
> (CRLF↔LF). The *real* change is **~290 insertions / ~62 deletions across 14 files**.

## Rule 0 — always review with whitespace ignored

```bash
cd /e/Projects/internet-object/io-js2
git diff -w --stat -- src/        # real change surface (~14 files)
git diff -w --stat -- tests/      # the tests that pin each behavior
```

Use `-w` (a.k.a. `--ignore-all-space`) for **every** diff command below. Without it,
you are reading thousands of phantom EOL changes.

## How the groups are ordered

Groups **1–6 are done and green** and are independent of each other — review/commit
them on their own. **Group 7 (serialization / #25) is WIP** and is *intentionally*
red (≈20 failing serialization tests at the reviewed step-2 checkpoint). Keep it on a
separate branch; don't let it hold up the finished fixes.

---

## Group 1 — Type-registry bootstrap  ✅ (possibly from another chat)

```bash
git diff -w -- src/schema/load-processor.ts src/schema/types/index.ts src/facade/stringify-document.ts
```

**What it does:** calls `registerTypes()` on import so the typedef registry is
populated even when a bundler tree-shakes the side-effect imports away (fixes the
"Type 'string' is not registered" failure).

**Check & see:**
- [ ] Each file only *adds* a `registerTypes()` call (or an import of it) — no logic rewrites.
- [ ] The call is idempotent (safe to call more than once — registering an already-registered type must be a no-op, not a throw).
- [ ] **Provenance:** I did **not** make these this session. Confirm which chat/commit added them before you attribute them.

---

## Group 2 — Tokenizer number literals  ✅

```bash
git diff -w -- src/parser/tokenizer/index.ts src/errors/tokenization-error-codes.ts
```

**Findings:** #1, #2, #6, #7.
**What it does:** `0x`/`0o`/`0b` no longer crash (recover with a designated code);
string-escape decoding fixed; new codes `invalid-bigint` / `invalid-decimal`;
scientific-notation bigint handled; capital `M`/`N` excluded as numeric suffixes.

**Check & see:**
- [ ] No path throws a raw `Error`/`TypeError` — every bad literal yields a **designated** kebab-case code.
- [ ] The two new codes are added to `tokenization-error-codes.ts` and referenced by the tokenizer.
- [ ] Tests green: `bigint-invalid`, `decimal-invalid`, `multidot-typed-suffix`.

---

## Group 3 — Reserved `errors` member  ✅

```bash
git diff -w -- src/core/internet-object.ts
```

**Findings:** #10, #18, #22.
**What it does:** adds `errors` to the reserved-name guard in `set()` so setting a key
named `errors` no longer collides with the internal field and throws a `TypeError`.

**Check & see:**
- [ ] The guard now reads `key !== 'items' && key !== 'keyMap' && key !== 'errors'` (all three reserved).
- [ ] Behavior is a **designated** error, not a raw throw.
- [ ] Test green: `ioobject-reserved-errors`.

---

## Group 4 — `int` rejects fractional values  ✅

```bash
git diff -w -- src/schema/types/number.ts
```

**Finding:** #20.
**What it does:** integer schema types (`int`, `uint`, sized ints) raise
`expected-integer` when given a fractional number instead of silently accepting/truncating.

**Check & see:**
- [ ] There is an explicit set of integer type names (`INTEGER_NUMBER_TYPES`) and the check only fires for those.
- [ ] A plain `number`/`decimal` schema type is **unaffected** (still accepts fractions).
- [ ] Test green: `int-fractional`.

---

## Group 5 — Parser: keys / binary / error-recovery  ✅

```bash
git diff -w -- src/parser/ast-parser.ts
```

Three findings in one file — read them as three separate hunks:

**#14 — keys must be strings.** `VALID_KEY_TYPES` is now `[STRING]` only (BOOLEAN, NULL,
NUMBER removed). Bare `null`/`true`/`false`/`N`/`T`/`F` and bare numbers `0`/`42`/`3.14`
→ `invalid-key`. Quoting (`"0"`, `"null"`) makes them valid string keys.
- [ ] Message explains the rule (numbers & keywords must be quoted to be keys).
- [ ] Test green: `literal-keys` (covers keyword *and* numeric bare keys, plus quoted-valid cases).

**#4 — binary usable as a value.** `parseValue` now has a `case TokenType.BINARY:` in
the scalar group, so a binary literal can appear as a value.
- [ ] Binary is in the same scalar branch as string/number/etc.
- [ ] Test green: `binary-value`.

**#11 — accumulate & resume.** `processDocument` wraps `processSection` in try/catch:
on failure it pushes the error, calls `skipToNextSection()`, and inserts a placeholder
section; trailing junk now calls `skipToNextSection()` instead of `break`.
- [ ] No single malformed section aborts the whole parse — errors accumulate to `getErrors()`.
- [ ] Resume boundary is the section separator (`---`); `skipToNextSection()` advances to the next `SECTION_SEP`.
- [ ] Errors are **ordered** and each carries a designated code.
- [ ] Updated tests green: `array-parsing`, `core`, `error-handling`, `object-parsing`, `array-error-ranges`, `error-range-validation` (these moved from "throws" to the `getErrors()` contract — confirm the migration is intentional, not a weakening).

---

## Group 6 — bigint / decimal serialize with type suffix  ✅

```bash
git diff -w -- src/schema/types/bigint.ts
# plus the bigint/decimal hunks inside:
git diff -w -- src/facade/stringify.ts src/facade/io-formatter.ts
```

**What it does:** `42n` serializes back as `42n` and `3.14m` as `3.14m`, so a
`parse → stringify → parse` round-trip keeps the right value *type* (before this, the
suffix was dropped and bigint/Decimal round-tripped as the wrong type — or as `{}`
when `isPrimitive` didn't recognize them).

**Check & see:**
- [ ] bigint default → `value.toString() + 'n'`; explicit `format: decimal` → plain `value.toString()` (no `n`).
- [ ] `io-formatter.isPrimitive` now recognizes **bigint and Decimal** (otherwise they serialize as `{}`).
- [ ] `stringifyPrimitive` appends `n` (bigint) / `m` (Decimal).
- [ ] Test green: `roundtrip.test.ts` (45 cases) — this is the serialization *contract*.

---

## Group 7 — Serialization / #25  ⚠️ WIP (intentionally red)

```bash
git diff -w -- src/facade/io-formatter.ts src/facade/stringify.ts \
                src/schema/types/object.ts src/utils/string-formatter.ts \
                src/parser/nodes/objects.ts
```

**Status:** steps 1–2 of `SERIALIZATION-SPEC.md` are in; **step 3 (schema-threading)
is NOT done.** ~20 serialization tests fail *by design* at this checkpoint, pending
the reviewer's decision on how to thread the schema into the formatter. **Do not treat
these failures as regressions to fix piecemeal** — they need the step-3 design.

**What's landed (review against `SERIALIZATION-SPEC.md`):**
- `string-formatter.ts` → new `formatObjectKey(key)` quotes purely-numeric or keyword keys (`"0"`, `"true"`).
- `objects.ts` → `ObjectNode.toValue` positional branch uses `o.push(value)` instead of `o.set(i.toString(), value)`, preserving positional provenance (position comes from IOObject index, not a fabricated `"0"` key).
- `stringify.ts` → new `includePositionalKeys?: boolean` option; bigint case.
- `io-formatter.ts` → `isExplicitKey(key, index, schema)` helper; primitive handling for bigint/Decimal.
- `object.ts` → no-schema branch emits keys in index order and quotes numeric/keyword keys.

**Check & see (design review, not pass/fail):**
- [ ] Confirm the ~20 failures are **serialization-only** (formatter/writer/header-definitions/string-ambiguous) — the value model (parse → data access, keyMap) must be **intact**. The step-2 checkpoint was verified clean on that axis.
- [ ] `objects.ts` `push` change did not break any **data-access** consumer (only serialization output shape).
- [ ] Default wire form is **positional** (spec §8) — the earlier attempt that made inline/keyed the default was reverted; verify branch-3 is back to positional default.
- [ ] Open question for the reviewer: thread `schema` down to `formatRecord`/writer (so schema-mapped keys are recognized as structural and suppressed) **vs** update the ~14 positional unit tests. This is the step-3 fork.

---

## Suggested review order

1. `git diff -w -- tests/` first — the tests state the intended behavior in plain terms.
2. Groups 1–6 in `src/` — done, green, independent. Commit-ready individually.
3. Group 7 last — read it against `SERIALIZATION-SPEC.md`, knowing it's paused mid-step-3.

## Two decisions for you
- **EOL noise:** to get a clean eventual commit, normalize line endings (a
  `.gitattributes` with `* text=auto`, or re-save as LF). Not done here — your call.
- **Split the commit:** groups 1–6 can land now; keep group 7 on its own branch so the
  finished fixes aren't blocked by the in-flux serializer work.
