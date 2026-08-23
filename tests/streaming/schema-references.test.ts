import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';
import { createStreamReader } from '../../src/streaming';

/**
 * A streamed record must resolve `$Ref`s inside its schema, exactly as a parsed one does.
 *
 * A compiled schema does NOT hold its own references. A member declared `a: $Inner` keeps `$Inner`
 * as an unresolved token and looks it up in the DEFINITIONS at validation time. The reader used to
 * hand core the active schema ALONE, so there was nowhere for that lookup to go: every `$Ref` in a
 * streamed document failed with `undefined-schema` on the first record, while the identical
 * document parsed correctly through `parse()`.
 *
 * The specification is explicit that a reader delegates definition lookup and schema resolution to
 * core rather than reimplementing them (streaming/schema-and-state.md), so the two paths agreeing
 * is the contract, not an optimisation.
 *
 * ISSUE-29. Found by the corpus while covering schema-and-state.md.
 */

async function stream(src: string): Promise<string[]> {
  const reader: any = createStreamReader(src, null, {});
  const out: string[] = [];
  try {
    for await (const it of reader) {
      out.push(it.error ? `ERR:${it.error.errorCode}` : JSON.stringify(it.data?.toJSON?.() ?? it.data));
    }
  } catch (e: any) {
    out.push(`FATAL:${e?.errorCode}`);
  }
  return out;
}

const parsed = (src: string) => {
  const doc: any = parse(src, null);
  const codes = (doc.getErrors?.() ?? []).map((e: any) => e.errorCode);
  return codes.length ? codes.map((c: string) => `ERR:${c}`) : [JSON.stringify(doc.toObject()[0])];
};

describe('streaming resolves schema references', () => {
  const cases: [string, string][] = [
    ['reference defined first',
     '~ $Inner: {x: int}\n~ $schema: {a: $Inner}\n---\n~ a: {x: 1}\n'],
    ['reference defined later — the header resolves atomically',
     '~ $schema: {a: $Inner}\n~ $Inner: {x: int}\n---\n~ a: {x: 1}\n'],
    ['reference behind an explicit selector',
     '~ $Inner: {x: int}\n~ $P: {a: $Inner}\n--- $P\n~ a: {x: 1}\n'],
    ['one reference used by two members',
     '~ $I: {x: int}\n~ $P: {a: $I, b: $I}\n--- $P\n~ a: {x: 1}, b: {x: 2}\n'],
    ['a chain three deep',
     '~ $A: {b: $B}\n~ $B: {c: $C}\n~ $C: {n: int}\n~ $schema: {a: $A}\n---\n~ a: {b: {c: {n: 1}}}\n'],
  ];

  for (const [label, src] of cases) {
    it(label, async () => {
      // Compared against `parse()` rather than a written-down value: the point is that the two
      // paths AGREE, and a hand-written expectation could drift from both.
      expect(await stream(src)).toEqual(parsed(src));
    });
  }

  it('an inline nested schema still works — the control', async () => {
    const src = '~ $schema: {a: {x: int}}\n---\n~ a: {x: 1}\n';
    expect(await stream(src)).toEqual(['{"a":{"x":1}}']);
  });

  it('still validates, and still rejects', async () => {
    // Putting definitions in scope must not weaken the schema that is actually applied.
    expect(await stream('~ $P: {n: int}\n--- $P\n~ Alice\n')).toEqual(['ERR:expected-integer']);
    expect(await stream('~ $I: {x: int}\n~ $P: {a: $I}\n--- $P\n~ a: {x: notanint}\n'))
      .toEqual(['ERR:expected-integer']);
  });

  it('still selects the right schema when two are in scope', async () => {
    const src = '~ $P: {n:string}\n~ $Q: {m:int}\n--- $P\n~ A\n--- $Q\n~ 1\n';
    expect(await stream(src)).toEqual(['{"n":"A"}', '{"m":1}']);
  });
});
