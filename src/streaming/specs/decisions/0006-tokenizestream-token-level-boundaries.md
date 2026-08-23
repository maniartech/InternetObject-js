# 0006. Detect record boundaries at the token level via the real tokenizer
- **Status:** Accepted
- **Date:** 2026-06-03
- **Related:** [§4](../PROTOCOL.md#4-wire-format-and-framing), [§5](../PROTOCOL.md#5-the-stream-item-model)

## Context
Deciding whether a `~` or `---` is a real boundary or content inside a string, annotated string, escape, or comment IS lexing. A hand-rolled character-level boundary splitter is therefore a SECOND lexer — a partial duplicate of the tokenizer that will drift, the same anti-duplication principle as ADR 0001. The reference reader's earlier line/string-state scanner was exactly such a duplicate.

## Decision
Detect boundaries from the tokenizer's own `~` / `---` tokens. Make the tokenizer chunk-feedable at token granularity (a `tokenizeStream` capability): it releases tokens as they become safely complete — a token is safe once followed by a terminator, while the final token ending at the buffer edge is provisional and retained. A frame collector groups tokens until a boundary token and hands each group to the still-batch parser per record.

## Consequences
- All string/comment/escape correctness is inherited from the real tokenizer, not re-derived.
- Only the tokenizer gains streaming; the parser stays batch.
- Prerequisite work is bounding the tokenizer's unbounded section-separator lookahead.
- The reader's ad-hoc string-state scanner is removed.
