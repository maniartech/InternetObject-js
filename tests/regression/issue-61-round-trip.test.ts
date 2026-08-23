import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loadInferred } from '../../src/facade/load-inferred';
import { stringifyDocument, stringifyHeader } from '../../src/facade/stringify-document';
import parse from '../../src/parser/index';

/**
 * GitHub issue #61 — importing real-world JSON into the playground.
 *
 * The fixture is the 63KB OpenFoodFacts response attached to the issue. It is kept whole rather
 * than reduced to a minimal case on purpose: the original failure needed the *combination* of
 * nulls inside untyped arrays, keys containing colons (`ciqual_food_code:en`), numeric keys,
 * schema names needing sanitization, deeply nested optionals and single-member records. A
 * shrunken fixture would stop covering most of that.
 *
 * The reported symptom was an inference crash ("Null is not allowed for
 * product.ingredients_debug[2]"). Inference succeeding is necessary but not sufficient: the real
 * contract is that JSON survives the trip to IO and back with the SAME shape and the SAME data.
 * That is what these tests assert.
 */

const original = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/issue-61-openfoodfacts.json'), 'utf8')
);

/**
 * Collect every difference between two trees, with a path for each.
 *
 * Both sides are normalized through JSON first: a parsed document holds IOObject instances, where
 * `key in obj` is false even though the value is present (access is method-only), so comparing the
 * raw trees reports differences that do not exist.
 */
function differences(a: any, b: any): string[] {
  const out: string[] = [];
  const norm = (v: any) => JSON.parse(JSON.stringify(v));
  (function walk(x: any, y: any, path: string) {
    const tx = x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x;
    const ty = y === null ? 'null' : Array.isArray(y) ? 'array' : typeof y;
    if (tx !== ty) return void out.push(`${path}: type ${tx} -> ${ty}`);
    if (tx === 'array') {
      if (x.length !== y.length) out.push(`${path}: length ${x.length} -> ${y.length}`);
      for (let i = 0; i < Math.max(x.length, y.length); i++) walk(x[i], y[i], `${path}[${i}]`);
    } else if (tx === 'object') {
      for (const k of Object.keys(x)) if (!(k in y)) out.push(`${path}.${k}: MISSING`);
      for (const k of Object.keys(y)) if (!(k in x)) out.push(`${path}.${k}: ADDED`);
      for (const k of Object.keys(x)) if (k in y) walk(x[k], y[k], `${path}.${k}`);
    } else if (x !== y) {
      out.push(`${path}: ${JSON.stringify(x)?.slice(0, 40)} -> ${JSON.stringify(y)?.slice(0, 40)}`);
    }
  })(norm(a), norm(b), '$');
  return out;
}

const toIO = (opts: any) => stringifyDocument(loadInferred(original) as any, opts);

describe('issue #61 — real-world JSON round-trips through IO', () => {
  test('inference no longer rejects nulls inside an untyped array', () => {
    // The original crash: "Null is not allowed for product.ingredients_debug[2]".
    expect(() => loadInferred(original)).not.toThrow();
  });

  test('the emitted document re-parses without errors', () => {
    const doc: any = parse(toIO({ includeHeader: true, includeTypes: true }), null);
    expect(doc.getErrors()).toEqual([]);
  });

  test('shape and data survive the round-trip exactly', () => {
    const back: any = parse(toIO({ includeHeader: true, includeTypes: true }), null);
    expect(differences(original, back.toJSON())).toEqual([]);
  });

  test('the playground path round-trips too — header and data as separate panes', () => {
    // The playground shows the schema and the data in two editors and recombines them, so the
    // split has to be lossless as well as the combined form.
    const doc: any = loadInferred(original);
    const header = stringifyHeader(doc).trim();
    const data = stringifyDocument(doc, { includeHeader: false }).trim();
    const back: any = parse(`${header}\n---\n${data}`, null);
    expect(back.getErrors()).toEqual([]);
    expect(differences(original, back.toJSON())).toEqual([]);
  });

  test('the array from the bug report keeps its length, its nulls and their positions', () => {
    const back: any = parse(toIO({ includeHeader: true, includeTypes: true }), null);
    const before = original.product.ingredients_debug;
    const after = JSON.parse(JSON.stringify(back.toJSON())).product.ingredients_debug;
    expect(after).toEqual(before);
    expect(after.filter((v: any) => v === null)).toHaveLength(53);
  });

  test('the comparison is capable of failing', () => {
    // Guards the tests above: a deep-equality helper that silently returns [] would make every
    // assertion here vacuous.
    expect(differences({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toEqual(['$.a[1].b: 2 -> 3']);
    expect(differences({ a: 1 }, {})).toEqual(['$.a: MISSING']);
  });
});
