# ADR 0003 — Review findings: four new codes, the schema-axis rename, and class discipline

- **Status:** Accepted — execution in progress
- **Date:** 2026-08-21
- **Supersedes nothing.** Extends [ADR 0002](0002-error-code-grammar-and-taxonomy.md) §4 (the registry)
  and §5 (symmetry additions gated on real emission).
- **Decided with Aamir**, 2026-08-21, from a five-reviewer read of the specification.

---

## 1. Why this exists

A five-reviewer pass over `io-specs` (codes-vs-implementation, prose coherence, structure, normative
language, and example correctness) produced ~60 findings. Most were mechanical. Seven required a
decision that changes what gets built, and this ADR records those seven so a future session — or a
porting team — can see what was chosen and why, without re-litigating it.

The trigger finding is worth stating plainly, because it invalidated the number we had been trusting:

> `tools/check-examples.ts` walked `doc.toObject()` and never read `doc.errors`, which is where every
> syntax error outside a collection lands. "171 examples passing" therefore included three malformed
> documents reported green, and excluded two failures where the specification had been right all along.

Every claim below was verified by running the reference implementation, not by reading it.

---

## 2. D1 — Two rules decide what is a number

**Superseded once, deliberately.** This section originally argued that every malformed numeric must
be rejected, and grew a rule per case: a base prefix announces a base; a multi-dot run is a failed
number; a dangling exponent is a failed number; three forms stay lenient because they are
shape-identical to text. Aamir's response was the right one — *"this seems too complicated, we
need one or two solid thumb rules"* — and the simpler formulation turns out to be **stronger**,
not weaker. The original reasoning is kept at the end, because knowing why it was wrong is worth
more than not having said it.

### The rules

> **Rule 1 — all or nothing.** A run is a number only if the *entire* run is a valid number
> literal. If anything is left over, the whole run is an open string.

> **Rule 2 — a marker is a claim.** The base prefixes `0x`, `0o`, `0b` and the type suffixes
> `m`, `n` can only mean *number*. A run carrying one that is not a valid literal of that type is
> an error.

| | Read as | Rule |
| --- | ------- | ---- |
| `0xFF`, `1.2`, `12e5`, `123.45m` | a number | 1 — the whole run is valid |
| `013ABSD`, `12mm`, `3pm`, `1.2.3`, `10.0.0.1` | open string | 1 — no marker, nothing claimed |
| `1e`, `1.23ee4`, `5em` | open string | 1 — incomplete, so not a number |
| `0x123FG`, `0b`, `0oz` | `invalid-number` | 2 |
| `.45m`, `123.m` | `invalid-decimal` | 2 |
| `12.3n` | `invalid-bigint` | 2 |

### Why the simpler rules are stronger

The original argument was that a malformed numeric read as a string is a **different value**, so two
ports would disagree about the document's contents. Under Rule 1 that argument **dissolves**: every
port reads `0xGH` as the string `"0xGH"`. There is nothing left to disagree about.

What the argument was really protecting against was one case: `parseFloat("1e")` returns `1`, so a
partial parse **invented a value the author never wrote**, with no text left to inspect. Rule 1
forbids that directly — `1e` is not a complete number, so it stays text — and needs no error to
do it. The defect is fixed and the machinery is gone.

The elaborate version also had a cost that only showed up when it was tested against real values:
it rejected **version strings, IP addresses and dotted dates** (`1.2.3`, `10.0.0.1`, `2024.01.15`),
while accepting `1.2.3-beta`. No rule that has to explain *that* distinction is the right rule.

### What Rule 2 costs, accepted

Any word beginning with a base prefix is now an error: `0xygen`, `0oz`, `0box`. Confirmed by Aamir
— *"they should be an error, no confusion. `\"0xygen\"` is a string."* Quoting is the escape hatch
and is always available, and a writer is required to quote any string that would otherwise read back
as a broken literal, so a value that arrives as text leaves as text.

### Superseded reasoning, for the record

The first version of this section held that leniency was itself the defect, and that the fix was a
diagnostic. That confused two things: **inventing a value** (`1e` → `1`) is a data-integrity
failure, while **declining to guess** (`0xGH` → `"0xGH"`) is not. Internet Object is
schema-first; a value's expected type is the schema's business, and `{ id: int }` given `"0xGH"`
reports `expected-integer` with the member name and position — a better error than any the
tokenizer could produce, because it knows what was expected.

## 3. D2 — Separator merging is intended; the `✗` marks are wrong

`[a b c]` yields `["a b c"]` and `{name: John Doe 25}` yields `{"name":"John Doe 25"}`. Both are
marked `✗ missing separators` in `array.md` and `object.md` — while `the-structure/syntax-errors.md`
and `the-collections/collection.md` both document the merging as deliberate. Three pages, two
positions, and the implementation agrees with the two that call it intended.

**Decision: merging is intended.** Drop the `✗` marks, and state the rule once, normatively, in a
place both pages link to rather than in four separate wordings.

**Why not the other way**: making it an error is defensible on silent-loss grounds, but the behaviour
is long-standing, the corpus and fuzzer encode it, and — unlike D1 — the original text remains visible
in the resulting string. The reader can see what was written.

## 4. D3 — Add the missing type codes

The Error Codes page argues that predicate-first naming makes a gap visible, and illustrates it with
"nine types, nine codes — a tenth type with no code would stand out here". Pointed at itself, the
device found a gap: there are **ten** base types, `expected-integer` is a shortcut rather than a base
type, and `binary`, `date` and `time` have no code at all. The page also claims the
`expected-`/`invalid-` split "applies to `decimal`, `bigint` and `base64`" — there is no
`expected-base64`, and `base64` is not a type; the type is `binary`.

**Decision: add the three codes** rather than weaken the claim.

**Delivered: two of the three.** `expected-date` and `expected-time` are in and emitting.
`expected-binary` is **not**, and could not be: `binary` is a base type in the specification but no
implementation registers it as a *schema* type — `{{ b: binary }}` reports `unknown-type` — so
no site could emit the code. ADR 0002 §5 forbids exactly that, and it is what `not-a-number` had
become. It lands with the type; the enum and `error-model.md` both say so in place, so the gap is
visible rather than silent.

**Why:** these are precisely the codes the rule predicts should exist. Adding them is the vocabulary
working as designed, not churn — and it is exactly the "symmetry addition gated on real emission" that
ADR 0002 §5 contemplated, since each has a genuine emitting site. Weakening the claim to "one code per
value kind" would leave the real gap open and make the page's central argument unfalsifiable.

## 5. D4 — Rename the **schema** axis to `strict` / `extensible`

"Open" and "closed" currently name two unrelated things:

| Axis | Meaning | Where |
| ---- | ------- | ----- |
| **object** | unbraced vs braced | `grammar.md` (`openObject`), `the-structure/values/object.md` |
| **schema** | accepts undeclared members or not | `dynamic-schema.md`, `unknown-member`, `key-emission.md` |

Both appear on the same page. "Closed schema" is used normatively and defined nowhere — the glossary
defines only "open schema".

**Decision: keep `open`/`closed` for objects; rename the schema axis to `strict` / `extensible`.**

A **strict** schema rejects undeclared members (`unknown-member`); an **extensible** schema (`*`)
accepts them. Recorded explicitly because this was chosen *against* the reviewing recommendation,
which had favoured renaming the object axis to braced/unbraced to preserve JSON Schema's
`additionalProperties`-adjacent "open/closed schema" vocabulary. Aamir's call: the object sense is
the older and more syntactic use, it is embedded in the grammar production name, and `strict` /
`extensible` says what the schema *does* without relying on the reader knowing JSON Schema.

Consequence to watch during the port: readers arriving from JSON Schema will look for "closed
schema". The glossary must carry both terms with a pointer, which is cheaper than the collision.

## 6. D5 — An error's class is a property of the **code**, not the call site

Catalogued class and raised class disagree across the implementation:

| Code | Catalogued | Actually raised as |
| ---- | ---------- | ------------------ |
| `undefined-schema` | validation | base error (`general`) at 4 non-streaming sites; validation at the streaming site |
| `expected-object` | validation | base error at its only site |
| `unknown-type` | validation | four different classes across seven sites |
| `duplicate-member` | validation | syntax and base, never validation |
| `undefined-variable` | **syntax** | validation at its only site |

This is not cosmetic: `streaming/error-model.md` derives the wire **category** from the class, so one
code raised as two classes means two conformant implementations report different categories for the
same input. `undefined-schema` is the sharp case — the streaming site is correct, so the conformance
case passes while the ordinary path diverges.

**Decision: the catalogue is the authority.** A code has exactly one class. Raise sites change to
match, and `undefined-variable` moves to the Resolution group as a validation error, beside its
sibling `undefined-schema`.

## 7. D6 — `missing-value` is split

`missing-value` is catalogued under **both** classes with two different definitions: a syntax fault (a
key with nothing after it) and a validation fault (a required member absent). Under D5 that is
impossible. The syntax sense becomes **`expected-value`**; `missing-value` keeps the presence sense,
which is how every other `missing-` code reads.

## 8. D7 — The `stream-` namespace is scoped out of the closed vocabulary

`stream-buffer-exceeded`, `stream-source-error` and `stream-aborted` are subject-first and use a
predicate that is not among the thirteen — while the rule states, without qualification, that the set
is closed.

**Decision: scope the rule** to core syntax/validation codes and name `stream-` as a separate,
explicitly-listed namespace for conditions of the *transport* rather than the document. Recasting
them (`exceeded-stream-buffer`) obeys the letter of the rule and reads worse for no gain: these
describe the stream, not a value in it.

---

## 9. Implementation bugs found in passing (not decisions — defects)

Each was reproduced directly and is fixed as part of this pass:

| Defect | Evidence |
| ------ | -------- |
| `m` following a numeric literal is rewritten to `f` | `123.45mm` → `"123.45fm"`, `1mm` → `"1fm"`, `1.5mx` → `"1.5fx"` — a character the input never contained |
| A leading comma in an array is silently dropped | `[,a]` → `["a"]`, while `[a,,c]` and `[ , ]` correctly raise `unexpected-token` |
| Raw strings never report unterminated | `r'Unclosed` → `"Unclosed"`, while `"Unclosed` correctly raises `unterminated-string` |

The first is the most serious defect in this set: it is silent **corruption**, not leniency. The
others are inconsistencies with a sibling construct that already behaves correctly.

## 9b. Three corruptions the writer's over-quoting had been hiding

Narrowing the quoting rule (`§11.4`) turned the round-trip fuzzer from clean to failing on every
run. The failures were not caused by the change — they were **uncovered** by it. A value that is
always quoted never exercises the path a bare one takes, so a broad quoting rule and a correct
tokenizer are not the same thing, and the first was standing in for the second.

| Input | Decoded as | Cause |
| ----- | ---------- | ----- |
| `-.j` | `".j"` | a sign was consumed, then the parse bailed out **without rewinding**, so the caller resumed past it |
| `5T` | `"5true"` | a run forced to an open string took its value from what the text *parsed as*; `T` parses as the boolean `true` |
| `123N` | `"123"` | the same fault with `N`, the null keyword — and this one was **already recorded in the corpus** as a curiosity (`value ≠ token`, noted in FINDINGS) rather than recognised as a defect |

All three are silent: two characters in, five out; or one character lost. None is reachable through
a quoted value, which is why years of passing tests never touched them.

The third is the one worth remembering. The corpus had written the wrong value down, annotated it,
and moved on — the third time in this review that an "authoritative" row turned out to record a
bug. The corpus records what the implementation does, faithfully, and that is the right rule; it
simply cannot tell a decision from a defect.

## 10. Tooling

`tools/check-examples.ts` gains three things, because without them the specification cannot be held
to its own examples:

1. It reads `doc.errors` as well as the loaded object graph, and recovers the JSON-encoded error nodes
   a collection produces for syntax faults.
2. Assertions are **exact** — a block naming its codes must produce those and no others.
   Over-reporting was how three malformed documents read green.
3. A `<!-- io:test per-line -->` mode, for the common "list of good and bad values" example where each
   line is its own document. Sixteen such blocks were previously skipped for lacking a `---` line, and
   ten of them did not hold.

## 11. Later clarifications, 2026-08-22

Two decisions arrived after the first execution pass and are recorded here rather than in a new ADR,
because each sharpens a rule already stated above rather than replacing it.

### 11.1 D1 restated, twice

Aamir supplied the distinction §2 was missing — *"`0x123FG` is wrong because it looks like a hex
value and then has an invalid character; `013ABSD` is a real code, not invalid, just an open
string"* — and then, when the rule built on it still needed four clauses and three exceptions,
asked for it to be reduced to one or two thumb rules. It reduced to two, and §2 above is the
result. He then extended Rule 2 to cover the base prefixes alongside the `m`/`n` suffixes, which is
what made the marker table symmetric.

### 11.2 Symmetry: one code per claimed type

Applying the naming guideline to every marker exposed two codes that broke it, both the same shape
of gap that `expected-date` / `expected-time` had already closed on the type-mismatch side:

| Marker | Claims | Was | Now |
| ------ | ------ | --- | --- |
| `d'…'` | date | `invalid-datetime` | **`invalid-date`** |
| `t'…'` | time | `invalid-datetime` | **`invalid-time`** |
| `b'…'` | binary | `invalid-base64` | **`invalid-binary`** |

`invalid-datetime` named a type the author had not written; `invalid-base64` named an **encoding**,
leaving it the one literal code whose subject was not a type at all. Aamir: *"we need to fix them,
symmetry is essential, this is still a good time."*

The result is a grid where a missing cell is visible on sight — which is the entire argument for
predicate-first naming, now applied to the subject as well. **56 codes.**

### 11.4 The writer quotes only what would read back differently

`needsQuoting` quoted every string beginning with a digit. Safe, and wrong for a format whose
output is meant to be lean: `013ABSD`, `12mm`, `3pm`, `1.2.3` and `10.0.0.1` all travelled quoted.

The rule now mirrors the reader's two rules exactly — quote when the bare text would read back as
a **number** (Rule 1) or as an **error** (Rule 2). Nothing else.

Finding the live code took a detour worth recording: there were **two** implementations. The one I
edited first, `string-formatter.needsQuoting`, was imported by no source file and yet had a test
suite of its own — so those tests had been asserting quoting behaviour the serializer never ran.
The live copy was a second `looksLikeNumber` in `utils/strings.ts`. That is the N-pattern this
project keeps meeting: one decision, two implementations, and the tests guarding the wrong one.
There is now a single exported `readsBackAsANumber`, and `needsQuoting` delegates to it.

### 11.3 ISSUE-25: the diagnosis was wrong, and the fix is a naming one

The issue described inference as committing to the first type it sees. **It does not** —
`mergeIntoMemberDef` has carried a "type mismatch → `any`" rule for a long time and it works, so
the decision Aamir took (*widen to `any`*) was already the implemented behaviour.

The real defect: `safeName()` was not injective. `"*"`, `" "` and `","` all sanitized to `_`;
`"x-y"` and `"x.y"` both to `x_y`. Two unrelated subtrees resolved to **one** schema name, and the
schema built from one was bound to the other's data. The widening rule never fired because the two
values were never collected together — they were filed apart under a shared label.

Aamir's fix: pass `safeName` the original key **and** a map of names already handed out, so it can
distinguish reuse from collision, disambiguating with `_2`, `_3` — the rule already normative for
duplicate section names. Stable and injective; non-colliding names unchanged.

The lesson worth keeping is about the ISSUE itself: it named a mechanism that sounded plausible and
was never verified. The correction came from reducing the failing input until a control separated
the variables. **A diagnosis in a tracker is a claim, not a finding, until something reproduces it.**

## 12. Decision

Adopt D1–D7. Add four codes to the registry (`invalid-number`, `expected-binary`, `expected-date`,
`expected-time`) and one rename (`missing-value` → `expected-value` for the syntax sense). Rename the
schema axis to `strict`/`extensible`. Make the catalogue authoritative for error class.

**Sequencing:** as with ADR 0002, this lands **before** the corpus grows toward its ~2,400-case target,
for the same reason — every case carrying an error code would otherwise be reworked twice.
