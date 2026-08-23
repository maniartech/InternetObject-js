# Internet Object Streaming — Specification Set

This directory is the specification for **Internet Object streaming**: an incremental,
record-oriented transport over the Internet Object data model. It is written to be
implemented in **any language**, not just this JavaScript reference implementation.

Streaming is an inherent part of Internet Object — the same data model consumed
incrementally — not a separate add-on. It adds framing, transport coordination, and an
emission envelope; it does **not** define any new type, validation, or serialization
semantics. Those come from the Internet Object core, unchanged.

## Document map

| Document | Role | Normative? | Audience |
|---|---|---|---|
| [`PROTOCOL.md`](./PROTOCOL.md) | The language-neutral protocol contract: wire format, framing, record/error/state model. | **Normative** | Every implementor, any language |
| [`conformance/`](./conformance/) | Shared, language-neutral test corpus. The executable form of `PROTOCOL.md`. | **Normative** | Every implementor |
| [`bindings/`](./bindings/) | Language-specific API surface (e.g. [`bindings/javascript.md`](./bindings/javascript.md)). | Non-normative | Users of one implementation |
| [`decisions/`](./decisions/) | Architecture Decision Records — *why* each decision was made, and its history. | Non-normative | Maintainers, future contributors |
| [`examples/`](./examples/) | Scenario walkthroughs. | Non-normative | Learners |
| [`../IMPLEMENTATION-GAPS.md`](../IMPLEMENTATION-GAPS.md) | JavaScript runtime status and work tracker. | Non-normative | This repo's maintainers |

## Normative precedence

When two statements appear to conflict, resolve them in this order. A lower-precedence
document is never allowed to contradict a higher one; if it does, the lower one is the bug.

1. **`PROTOCOL.md` and the `conformance/` corpus together** are the contract. The corpus is
   the executable form of the prose. If the prose and a conformance case disagree, that is a
   **defect to reconcile**, not a silent winner — open an issue and fix one of them.
2. **`bindings/*`** describe how one language exposes the protocol. A binding may add
   ergonomics but must never change protocol semantics.
3. **`examples/*`** illustrate; they never define.
4. **`decisions/*`** explain rationale; they are history, never a source of current rules.

## Anti-contradiction rules

These rules keep the set internally consistent as it grows and as new language bindings are added.

- **Single source of truth.** Every normative fact lives in `PROTOCOL.md` exactly once.
  Other documents **reference** it; they do not restate it. Paraphrase is how drift begins.
- **Reference, don't copy.** Bindings and examples link to the relevant `PROTOCOL.md` section
  rather than reproducing its rules.
- **Core is upstream.** `PROTOCOL.md` references the Internet Object core specification for all
  type, schema, validation, and serialization semantics. Streaming never re-specifies them.
- **Decisions are immutable.** An ADR is not edited once accepted. To change a decision, add a
  new ADR that supersedes the old one and update the old one's `Status` to `Superseded by NNNN`.

## Requirement keywords

`PROTOCOL.md` uses the keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY**
as defined in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) / [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174).
A conforming implementation satisfies every MUST and MUST NOT.

## Versioning

The protocol is versioned independently of any implementation. This specification set defines
**Streaming Protocol v1**. Breaking changes require a new major version and a changelog entry.
Bindings declare which protocol version they implement.

## Implementing in a new language

1. Read [`PROTOCOL.md`](./PROTOCOL.md) end to end.
2. Implement against the Internet Object **core** spec for all data semantics (referenced from `PROTOCOL.md`).
3. Run the [`conformance/`](./conformance/) corpus; passing it is the definition of "conformant."
4. Skim [`decisions/`](./decisions/) to understand *why* the protocol is shaped the way it is.
5. Optionally model your public API on an existing [`binding`](./bindings/), adapting it to your language's idioms.
