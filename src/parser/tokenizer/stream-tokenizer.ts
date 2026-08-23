import { Position } from '../../core/positions';
import Tokenizer from './index';
import Token, { TokenErrorValue } from './tokens';
import TokenType from './token-types';

/**
 * Chunk-feedable tokenizer (streaming ADRs 0006 / 0011; gap tracker Gap 19).
 *
 * Wraps the batch {@link Tokenizer} without modifying it. Callers `feed()` decoded
 * text chunks and receive tokens as they become *safely complete*; `end()` flushes
 * the remainder. The token stream is identical, token-for-token and position-for-
 * position, to `new Tokenizer(whole).tokenize()` regardless of how the input was
 * split — see tests/parser/tokenizer/features/stream-tokenizer.test.ts.
 *
 * Strategy: keep a small retained buffer, re-tokenize it via the real tokenizer,
 * and commit every token except the provisional tail. The last token may still
 * extend when more input arrives, so it is retained; a trailing section-header
 * group (`--- name: $Schema`) is retained as a unit because the tokenizer produces
 * it with internal lookahead. Positions are rebased to stream-absolute coordinates.
 *
 * `feed()` takes already-decoded text. Byte decoding (UTF-8 across chunk
 * boundaries) is the caller's responsibility, as it is for the batch tokenizer.
 */
export default class StreamTokenizer {
  private buffer = '';
  // Absolute stream position of buffer[0].
  private basePos = 0;
  private baseRow = 1;
  private baseCol = 1;
  private ended = false;

  /** Feed a chunk of decoded text; returns tokens that are now safely complete. */
  feed(text: string): Token[] {
    if (this.ended) throw new Error('StreamTokenizer: feed() after end()');
    if (text) this.buffer += text;
    return this.drain(false);
  }

  /** Signal end of stream; flushes and returns any remaining tokens. */
  end(): Token[] {
    if (this.ended) return [];
    this.ended = true;
    return this.drain(true);
  }

  /** Translate a buffer-relative position to absolute stream coordinates. */
  private translate(p: Position): Position {
    return {
      pos: this.basePos + p.pos,
      row: this.baseRow + (p.row - 1),
      // Column only carries the base offset on the buffer's first line; after a
      // newline, columns restart at 1 in both relative and absolute counting.
      col: p.row === 1 ? this.baseCol + (p.col - 1) : p.col,
    };
  }

  private isSectionGroupToken(t: Token): boolean {
    return (
      t.type === TokenType.SECTION_SEP ||
      t.subType === TokenType.SECTION_NAME ||
      t.subType === TokenType.SECTION_SCHEMA
    );
  }

  /** Clone a token with positions rebased to absolute coordinates. */
  private rebase(t: Token): Token {
    const r = t.clone();
    const s = this.translate({ pos: t.pos, row: t.row, col: t.col });
    r.pos = s.pos;
    r.row = s.row;
    r.col = s.col;

    // Error tokens carry an IOError whose positionRange is also buffer-relative;
    // shift it by the same translation so reported positions stay stream-absolute.
    if (t.type === TokenType.ERROR) {
      const ev = t.value as TokenErrorValue | undefined;
      const orig = ev?.originalError as any;
      const range = orig?.positionRange;
      if (range && typeof range.getStartPos === 'function') {
        try {
          const start = this.translate(range.getStartPos());
          const end = typeof range.getEndPos === 'function'
            ? this.translate(range.getEndPos())
            : start;
          orig.positionRange = { getStartPos: () => start, getEndPos: () => end };
        } catch {
          /* leave the original range if its shape is unexpected */
        }
      }
    }
    return r;
  }

  private drain(final: boolean): Token[] {
    if (this.buffer.length === 0) return [];

    let toks: readonly Token[];
    try {
      toks = new Tokenizer(this.buffer).tokenize();
    } catch (e) {
      // The batch tokenizer can throw on a truncated construct (e.g. a bare `0x`
      // with no hex digits yet). With more input it becomes valid, so before end
      // we retain the whole buffer and wait. On a complete buffer it is a genuine
      // error and matches batch behavior, so rethrow.
      if (final) throw e;
      return [];
    }

    if (toks.length === 0) {
      // Whitespace / comment-only buffer. On end there is nothing to emit; before
      // end we keep it so the next chunk re-lexes the exact byte sequence (a
      // trailing unterminated comment must not be split).
      if (final) {
        this.basePos += this.buffer.length;
        this.buffer = '';
      }
      return [];
    }

    let commitCount: number;
    if (final) {
      commitCount = toks.length;
    } else {
      // Provisional tail = the last token (it may still extend with more input).
      let prov = toks.length - 1;

      // The tokenizer parses a section header (`---` + name + schema) as one unit
      // with internal lookahead, so the header must never be committed in pieces.
      // Two cases both back the provisional region up to the rooting SECTION_SEP:
      //
      //   1. The provisional tail is a recognized header member (SEP/NAME/SCHEMA) —
      //      committing the `---` while retaining the schema would orphan the schema
      //      (it would re-lex as a plain string without the `---` context).
      //   2. The last `---` line is not yet newline-terminated — a header line lives
      //      on its `---`'s line (line-bounded lookahead, Gap 18), so it can still
      //      change (e.g. `--- $` -> `--- $User`). Some truncations don't even
      //      produce header-typed tokens (`--- $` yields `---` + a `$` open string),
      //      which is why the line check is needed in addition to case 1.
      if (this.isSectionGroupToken(toks[prov])) {
        while (prov > 0 && toks[prov].type !== TokenType.SECTION_SEP) prov--;
      }
      for (let i = toks.length - 1; i >= 0; i--) {
        if (toks[i].type === TokenType.SECTION_SEP) {
          if (this.buffer.indexOf('\n', toks[i].pos) === -1) prov = Math.min(prov, i);
          break;
        }
      }

      commitCount = prov;
      if (commitCount <= 0) return []; // nothing safely complete yet
    }

    const committed: Token[] = [];
    for (let i = 0; i < commitCount; i++) committed.push(this.rebase(toks[i]));

    if (final) {
      this.buffer = '';
    } else {
      // New base = absolute position of the first provisional token's start.
      const firstProv = toks[commitCount];
      const nb = this.translate({ pos: firstProv.pos, row: firstProv.row, col: firstProv.col });
      this.basePos = nb.pos;
      this.baseRow = nb.row;
      this.baseCol = nb.col;
      this.buffer = this.buffer.slice(firstProv.pos);
    }

    return committed;
  }
}

/**
 * Convenience: tokenize an iterable of text chunks to completion. Mainly for
 * tests and simple in-memory use; streaming consumers use the class directly.
 */
export function tokenizeChunks(chunks: Iterable<string>): Token[] {
  const st = new StreamTokenizer();
  const out: Token[] = [];
  for (const c of chunks) out.push(...st.feed(c));
  out.push(...st.end());
  return out;
}
