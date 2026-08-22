# ADR 0004 — Schema inference is a library convenience, not part of the format

- **Status:** Accepted
- **Date:** 2026-08-22
- **Decided by Aamir**, 2026-08-22, closing FINALIZATION-TRACKER item **3.8**
  (*"Decide whether inference (`loadInferred`, JSON→IO) is a conformance suite — in or out, in writing"*).
- **Related:** io-test-cases `ISSUES.md` ISSUE-18, ISSUE-25 · `FINALIZATION-TRACKER.md` Phase 3

---

## TL;DR

**Inference is OUT of the 1.0 conformance contract.** `loadInferred` / `inferDefs` are a
**TypeScript-library convenience**, not a part of the Internet Object format. A Go, Rust or FFI port
is conforming without them. They stay marked **experimental**, they keep no compatibility promise,
and work on them continues on the library's own schedule rather than the format's.

---

## 1. The decision

| | |
| - | - |
| **In the format** | tokenizing, parsing, the schema language, validation, serialization, streaming |
| **Not in the format** | schema **inference** — reading native data and guessing a schema for it |

A conformance suite exists so that two independent implementations can be checked against each
other. Inference is not something a second implementation has to reproduce, so a suite for it would
be testing io-js2 against itself. It therefore does not become an eighth suite, and inference bugs
do not gate **porting-ready**.

## 2. Why

**It guesses; everything else is determined.** Every other part of Internet Object is a function of
its input — the same text yields the same value model in every implementation, and that is exactly
what a conformance corpus can pin. Inference looks at data and *chooses*: how much evidence makes a
key a map rather than a record, when a member widens to `any`, how a key becomes a schema name.
Those are heuristics. Written into the format, every heuristic becomes a compatibility surface, and
every improvement to it becomes a breaking change.

**Nothing in the format needs it.** A document either carries a schema or it does not. Inference is
a convenience for people arriving from JSON, sitting on top of the format — not underneath it.

**The bug record agrees.** Inference has produced more defects than any comparable area — ISSUE-18
(redundant and unreferenced definitions, resolved by a full redesign), ISSUE-25 (a schema that
rejects its own input, twice: the `safeName` collision, fixed; the wildcard-container path, open),
and the seven counted when item 3.8 was raised. That is not a slur on the code — it is what guessing
costs, and it is the strongest possible argument against writing those guesses down as law.

**Contract versus implementation.** The distinction that decided this is worth keeping:

| | changes after porting cost | so |
| - | - | - |
| error codes, syntax, validation | **rise** — a rename breaks every port | freeze before 1.0 |
| inference internals | **flat** — nothing outside io-js2 depends on them | fix whenever |

Error codes had to be settled before the ports existed (ADR 0002, ADR 0003). Inference does not,
because no port will ever depend on it.

**It is already presented as experimental.** The playground labels the JSON→IO converter
*Experimental*; this ADR makes the library say the same thing, so the code and the product agree.

## 3. What follows

1. **`loadInferred` and the inference utilities carry `@experimental`** in their documentation, with
   the scope stated: not part of the format, no port required, no compatibility promise.
2. **Tracker item 3.8 closes** — decided, out. No inference conformance suite; Phase 3's corpus
   target is unchanged.
3. **ISSUE-25 stays open, and stops blocking.** It is a real library defect — a document that loads
   but will not serialize — and it will be fixed. It is not on the critical path to porting-ready,
   and the round-trip fuzzer keeps it visible in the meantime.
4. **The round-trip fuzzer distinguishes the two paths.** A round-trip failure reached through
   `loadInferred` is a library finding; one reached through `parse` is a format finding and still
   blocks.
5. **The specification is unchanged** — it never described inference, and after this it never will.
   Silence there is now deliberate rather than accidental.

## 4. What would reopen this

Inference becomes a candidate for the contract only if it is first made **deterministic and
specifiable** — a written rule for every choice it makes, stable enough that a second implementation
could match it from the prose alone. That is a larger piece of work than 1.0 needs, and it can be
done later without breaking anything, because a convenience can be promoted to a contract but a
contract cannot be demoted.
