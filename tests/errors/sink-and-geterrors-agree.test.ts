import { describe, it, expect } from 'vitest';
import parseCore from '../../src/parser/index';
import { parse, parseDocument } from '../../src/facade/parse';

/**
 * C1a — the sink and `doc.getErrors()` report the same set.
 *
 * Measured 2026-08-24, the two channels disagreed in **both** directions:
 *
 *                            sink   getErrors
 *   collection row (~)         1        1      agree
 *   object section             1        0      the sink has it, the document does not
 *   unterminated string        0        1      the document has it, the sink does not
 *   brace never closed         0        1      the document has it, the sink does not
 *
 * The consequence was quiet and bad: `sink.length` read 0 while the data held a syntax error node,
 * so a caller doing the obvious thing — collect, then check whether anything was collected — was
 * told there were no problems.
 *
 * An earlier draft of the spec said "feed the sink from what `getErrors()` reads". That would have
 * made row 2 worse, removing the one error the sink does report there. Each channel was missing
 * things the other had, so the fix is a union.
 *
 * Nothing about parsing changes. The parser found these errors already; an API-layer channel
 * stopped under-reporting — which is why the corpus and the behaviour snapshot do not move.
 */
const codes = (errors: readonly Error[]) => errors.map((e: any) => e.errorCode);

/** Every shape from the table above, in one document. */
const cases: Array<{ what: string; text: string }> = [
  { what: 'a bad collection row', text: 'age: int\n---\n~ 30\n~ abc\n~ 40' },
  { what: 'a bad member in an object section', text: 'name: string, age: int\n---\nname: Alice, age: abc' },
  { what: 'an unterminated string', text: "name: string\n---\n~ 'never closed" },
  { what: 'a brace that never closes', text: 'a: {b: 1' },
  { what: 'several at once', text: 'age: int\n---\n~ abc\n~ nope\n~ 40' },
  { what: 'a clean document', text: 'name: string\n---\n~ Alice' },
];

describe('the sink and getErrors() report the same set (C1a)', () => {
  for (const { what, text } of cases) {
    it(what, () => {
      const sink: Error[] = [];
      const doc: any = parseCore(text, null, sink);
      expect(codes(sink)).toEqual(codes(doc.getErrors()));
      expect(sink.length).toBe(doc.errors.length);
    });
  }

  it('the union is by identity, so a document holding two alike errors reports both', () => {
    const sink: Error[] = [];
    const doc: any = parseCore('age: int\n---\n~ abc\n~ also-abc', null, sink);
    expect(sink.length).toBe(2);
    expect(new Set(sink).size).toBe(2);
    expect(codes(sink)).toEqual(codes(doc.getErrors()));
  });

  it('the sink keeps the order it had and gains the rest behind it', () => {
    // Not an incidental detail: a caller reading errors in order must not see them reshuffle
    // because a channel that was under-reporting caught up.
    const sink: Error[] = [];
    const doc: any = parseCore('age: int\n---\n~ 30\n~ abc\n~ 40', null, sink);
    expect(sink[0]).toBe(doc.getErrors()[0]);
  });

  it('a syntax error no longer reads as "no problems"', () => {
    // The concrete fault: the data held an error node and `sink.length` said 0.
    const sink: Error[] = [];
    parseCore('a: {b: 1', null, sink);
    expect(sink.length).toBeGreaterThan(0);
  });

  it('holds through both public entry points', () => {
    const text = 'age: int\n---\n~ 30\n~ abc';
    const a: Error[] = [];
    const doc: any = parseDocument(text, null, a);
    expect(codes(a)).toEqual(codes(doc.getErrors()));

    const b: Error[] = [];
    parse(text, null, b);
    expect(codes(b)).toEqual(codes(a));
  });

  it('and through a function sink, which sees exactly what an array sink would', () => {
    const text = 'age: int\n---\n~ 30\n~ abc';
    const seen: Error[] = [];
    const bag: Error[] = [];
    parse(text, null, (e) => seen.push(e));
    parse(text, null, bag);
    expect(codes(seen)).toEqual(codes(bag));
  });

  it('no sink still means the first error throws', () => {
    expect(() => parseCore('name: string, age: int\n---\nname: Alice, age: abc')).toThrow();
  });
});
