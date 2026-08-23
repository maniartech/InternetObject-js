# 0012. Header parse/validation errors are fatal — never silently swallowed
- **Status:** Accepted
- **Date:** 2026-08-13
- **Related:** [§7.2](../../../../io-specs/streaming/README.md "was PROTOCOL.md §72"), [§7.3](../../../../io-specs/streaming/README.md "was PROTOCOL.md §73"), [0004](0004-header-atomic-forward-references.md), [0008](0008-recoverable-vs-fatal-errors.md)

## Context
PROTOCOL §7.2 already classifies "invalid header definitions" as a **fatal** stream error, and §7.3 says
it preserves the **core** identity (category `syntax`, or whatever core raises). The reference reader
parsed the header with an error collector and then never inspected it (`reader.ts` `processHeader`).

Probing core showed the hole is narrower than it looks, but real: **structural** header errors
(`invalid-definition`, `invalid-type`, …) are *thrown* by core parse even when a collector is supplied,
so they already propagated and terminated iteration correctly. But any header error core routes to the
**collector channel** — now or in a future core version — vanished silently: the stream would continue
with broken or partial definitions and later records would misvalidate with no diagnostic pointing at
the real cause. An unchecked error channel on the fatal-by-spec header path is a latent §7.2 violation.
(Audit finding S2 in the repo-level ADR
[`docs/decisions/0001-defer-strict-validation-mode.md` §7.1](../0001-defer-strict-validation-mode.md).)

Out of scope, noted for core: core itself is lenient about a **duplicate definition** (silently kept,
no error) and an **unknown `$ref` inside a definition** (unresolved at header-parse time; fails only
when data validates against it). Streaming inherits those core semantics per ADR 0001; if they should
error, that is a core change, not a streaming one.

## Decision
After the header frame is parsed (atomically, per ADR 0004), the reader MUST check the collected header
errors. If any error was collected — or the header parse itself threw — iteration terminates with a fatal
error that **preserves the first core error's identity** (class, category, code, position). Header errors
are never demoted to record-error items and never ignored. This applies to the header frame only; data
records keep their §7.2 recoverable behavior.

## Consequences
- A bad header fails fast at the `---` boundary, before any record is emitted — no misvalidation cascade.
- No new error code: the fatal error is the core error itself (typically `syntax`), per §7.3's rule that
  streaming defines codes only for its own transport/lifecycle domain.
- The legacy no-`---` batch form is unaffected (its text is data, not a header frame).
- Consumers that previously received records from a bad-header stream will now get a rejection instead;
  that prior behavior was a spec violation, not a contract.
