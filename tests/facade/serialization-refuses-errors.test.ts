import { describe, it, expect } from 'vitest';
import parseCore from '../../src/parser/index';
import { parseDocument } from '../../src/facade/parse';
import { stringifyDocument } from '../../src/facade/stringify-document';
import { stringify } from '../../src/facade/stringify';
import IOErrorItem from '../../src/core/error-item';
import IOCollection from '../../src/core/collection';
import IOObject from '../../src/core/internet-object';

/**
 * B3 — serialization refuses to emit errors, and `skipErrors` finally works here.
 *
 * ## What it did before, measured
 *
 * ```
 * stringifyDocument(doc)                        →  ~ {"error":{"__proto__":{}, …}}
 * stringifyDocument(doc, {skipErrors: true})    →  ~ {"error":{"__proto__":{}, …}}   identical
 * ```
 *
 * A collected error became a corrupt file with nothing to signal it, and the documented escape had
 * no implementation — the skip test looked for `{ __error: true }` while the parse route embeds an
 * `ErrorNode`, so it matched nothing.
 *
 * **A projection may describe errors; a file must not contain them.** `toObject()` and `toJSON()`
 * still embed them — the playground depends on that — and it is the write to text that refuses.
 *
 * This and "collect by default" hold each other up: collecting is only safe because a broken
 * document cannot silently become a broken file.
 */
const BAD = 'age: int\n---\n~ 30\n~ abc\n~ 40';

const badDoc = () => {
  const bag: Error[] = [];
  return { doc: parseCore(BAD, null, bag) as any, bag };
};

describe('serialization refuses error nodes (B3)', () => {
  it('a document holding a failed record refuses to serialize', () => {
    const { doc, bag } = badDoc();
    expect(bag.length).toBeGreaterThan(0);
    expect(() => stringifyDocument(doc)).toThrow(
      expect.objectContaining({ errorCode: 'forbidden-error-node' })
    );
  });

  it('and the message says how to get past it', () => {
    const { doc } = badDoc();
    expect(() => stringifyDocument(doc)).toThrow(/skipErrors/);
  });

  it('skipErrors writes the records that validated — and nothing else', () => {
    const { doc } = badDoc();
    const text = stringifyDocument(doc, { skipErrors: true } as any);
    expect(text).toContain('~ 30');
    expect(text).toContain('~ 40');
    expect(text).not.toContain('__proto__');
    expect(text).not.toContain('error');
  });

  it('what it writes parses back — the round trip the blob broke', () => {
    const { doc } = badDoc();
    const text = stringifyDocument(doc, { skipErrors: true } as any);
    const back: any = parseDocument(text);
    expect(back.toObject()).toEqual([{ age: 30 }, { age: 40 }]);
  });

  it('a clean document is untouched by any of this', () => {
    const doc: any = parseCore('age: int\n---\n~ 30\n~ 40');
    expect(stringifyDocument(doc)).toContain('~ 30');
    expect(stringifyDocument(doc, { skipErrors: true } as any)).toBe(stringifyDocument(doc));
  });

  it('the same rule on stringify(), for both shapes an error takes', () => {
    // The parse route embeds an ErrorNode; the load route embeds `{ __error: true }`. Checking for
    // only one of them is how `skipErrors` came to be a no-op on this path.
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    const loaded = new IOCollection<any>([rec, new IOErrorItem({ category: 'validation', message: 'x' })]);
    expect(() => stringify(loaded)).toThrow(
      expect.objectContaining({ errorCode: 'forbidden-error-node' })
    );
    expect(stringify(loaded, { skipErrors: true } as any)).toContain('Alice');

    const { doc } = badDoc();
    const parsed = doc.sections.get(0).data;
    expect(() => stringify(parsed)).toThrow(
      expect.objectContaining({ errorCode: 'forbidden-error-node' })
    );
  });

  it('the projection still embeds them — the two axes stay separate', () => {
    const { doc } = badDoc();
    expect(doc.toObject().length).toBe(3);
    expect(doc.toObject()[1].__error).toBe(true);
    expect(doc.toObject({ skipErrors: true }).length).toBe(2);
    expect(doc.getErrors().length).toBeGreaterThan(0);   // unchanged either way
  });
});
