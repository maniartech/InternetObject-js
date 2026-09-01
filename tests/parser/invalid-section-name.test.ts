import { describe, it, expect } from 'vitest';
import { safeParseDocument, sections } from '../../src/index';

/**
 * A section name outside the bare-name set is rejected, and the production is ANCHORED.
 *
 * `io-specs the-structure/introduction/data.md` states both obligations:
 *
 *   sectionName = ( letter | mark | digit | "-" | "_" )+
 *   "A reader MUST reject a name outside that set and report `invalid-section-name`. It must not
 *    accept a prefix and discard the rest."
 *
 * Neither held. The header regex matched a legal PREFIX and let the remainder fall where it may,
 * so `--- user$x: $s` did not fail — it produced a section named **`data`**, losing the written
 * name entirely and silently. Two such sections in one document collide on `data`, and nothing
 * reports it. The spec's own *Implementation status* note predicted truncation; the truth was
 * worse, because most names were not truncated but discarded.
 */
const doc = (name: string) => '~ $s: {a: string}\n--- ' + name + ': $s\n~ A';

const names = (r: any) => Object.keys(sections(r.doc) ?? {});
const codes = (r: any) => r.errors.map((e: any) => e.errorCode);

describe('invalid-section-name', () => {
  describe('the bare-name set is Unicode, not ASCII', () => {
    it.each(['users', 'user-list', 'user_list', 'usér', 'ü', '123', 'ユーザー'])(
      'accepts %s', (name) => {
        const r: any = safeParseDocument(doc(name));
        expect(r.ok).toBe(true);
        expect(names(r)).toEqual([name]);
      });
  });

  describe('a name holding anything else is rejected', () => {
    it.each(['user$x', 'user*x', 'user%x', 'user!x', 'user~x', "user'x", 'user|x', 'user+x'])(
      'rejects %s', (name) => {
        const r: any = safeParseDocument(doc(name));
        expect(r.ok).toBe(false);
        expect(codes(r)).toContain('invalid-section-name');
      });

    it('names the whole offending run, not just the legal prefix', () => {
      const r: any = safeParseDocument(doc('user$x'));
      const e = r.errors.find((x: any) => x.errorCode === 'invalid-section-name');
      expect(e.message).toContain('user$x');
    });

    it('does NOT silently fall back to the default section name', () => {
      // The bug: this used to return ok with a section called `data`.
      const r: any = safeParseDocument(doc('user$x'));
      expect(r.ok).toBe(false);
    });
  });

  describe('what must not change', () => {
    it('an unnamed section is still `data`', () => {
      const r: any = safeParseDocument('name: string\n---\n~ A');
      expect(r.ok).toBe(true);
    });

    it('a duplicate name is still duplicate-section-name, not this', () => {
      const r: any = safeParseDocument('~ $s: {a: string}\n--- u: $s\n~ A\n--- u: $s\n~ B');
      expect(codes(r)).toContain('duplicate-section-name');
      expect(codes(r)).not.toContain('invalid-section-name');
    });

    it('a schema-only header (`--- $s`) is unaffected', () => {
      const r: any = safeParseDocument('~ $s: {a: string}\n--- $s\n~ A');
      expect(r.ok).toBe(true);
    });

    it('an ERROR token elsewhere still reports its own code, not invalid-key', () => {
      // The parser used to relabel any ERROR token in key position as `invalid-key`, discarding
      // the tokenizer's diagnosis. It now rethrows what the tokenizer found.
      const r: any = safeParseDocument('v: "unterminated');
      expect(codes(r)).toContain('unterminated-string');
    });
  });
});
