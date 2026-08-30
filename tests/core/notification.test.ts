import { describe, it, expect } from 'vitest';
import { parseDocument } from '../../src/facade/parse';
import parseCore from '../../src/parser/index';
import { subscribe, version } from '../../src/facade/notify';
import { stringifyDocument } from '../../src/facade/stringify-document';
import IOObject from '../../src/core/internet-object';

/**
 * §8 — notification, and `String(doc)`.
 *
 * A document that can be written to needs a way to say *something changed*, or every UI holding one
 * has to poll it or re-read on a timer. Two functions do it:
 *
 *   io.subscribe(doc, fn) → () => void      fn receives the current value
 *   io.version(doc)       → number          monotonic
 *
 * `subscribe(fn)` calling `fn(value)` and returning an unsubscribe **is** the Svelte store
 * contract, and `version` is the immutable snapshot `useSyncExternalStore` needs. One pair covers
 * React, Svelte, Vue and Solid — which is why ADR 0005 cut the React package: there was nothing
 * left for it to do.
 *
 * The mechanism is a `Revision` shared by every container in one document, stamped on at subscribe
 * time. Nothing carries a parent pointer, and a document nobody has subscribed to has no revision
 * at all — so the cost to everyone who never subscribes is a null check per write.
 */
const DOC = 'name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25';
const tick = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()));

describe('notification (§8)', () => {
  describe('version', () => {
    it('is 0 until something subscribes — nothing is counting before then', () => {
      expect(version(parseDocument(DOC))).toBe(0);
    });

    it('moves on every write, even when the notification is coalesced', () => {
      const doc = parseDocument(DOC);
      subscribe(doc, () => {});
      const before = version(doc);
      doc.data[0].age = 31;
      doc.data[1].age = 26;
      expect(version(doc)).toBe(before + 2);
    });

    it('is monotonic — it never goes back', () => {
      const doc = parseDocument(DOC);
      subscribe(doc, () => {});
      const seen = [version(doc)];
      doc.data[0].age = 31;
      seen.push(version(doc));
      doc.data.push({ name: 'Dev', age: 41 });
      seen.push(version(doc));
      expect(seen).toEqual([...seen].sort((a, b) => a - b));
      expect(new Set(seen).size).toBe(seen.length);
    });

    it('reads the same through the proxy and through the bare document', () => {
      const bare: any = parseCore(DOC);
      const doc = parseDocument(DOC);   // memoised: the same node behind both
      subscribe(doc, () => {});
      doc.data[0].age = 31;
      expect(version(doc)).toBeGreaterThan(0);
      expect(version(bare)).toBe(0);    // a different document, untouched
    });
  });

  describe('subscribe', () => {
    it('calls the listener immediately with the value — the Svelte store contract', () => {
      const doc = parseDocument(DOC);
      const seen: any[] = [];
      subscribe(doc, (v) => seen.push(v));
      expect(seen.length).toBe(1);
      expect(seen[0]).toBe(doc);
    });

    it('calls it again after a write', async () => {
      const doc = parseDocument(DOC);
      let calls = 0;
      subscribe(doc, () => { calls++; });
      expect(calls).toBe(1);
      doc.data[0].age = 31;
      await tick();
      expect(calls).toBe(2);
    });

    it('coalesces: ten writes in one task produce one call', async () => {
      const doc = parseDocument(DOC);
      let calls = 0;
      subscribe(doc, () => { calls++; });
      calls = 0;
      for (let i = 0; i < 10; i++) doc.data[0].age = 30 + i;
      expect(calls).toBe(0);              // nothing has fired yet
      await tick();
      expect(calls).toBe(1);
      expect(version(doc)).toBe(10);      // but every write is counted
    });

    it('the unsubscribe stops it, and calling it twice is harmless', async () => {
      const doc = parseDocument(DOC);
      let calls = 0;
      const stop = subscribe(doc, () => { calls++; });
      stop();
      stop();
      calls = 0;
      doc.data[0].age = 31;
      await tick();
      expect(calls).toBe(0);
    });

    it('several listeners all hear it', async () => {
      const doc = parseDocument(DOC);
      const heard: string[] = [];
      subscribe(doc, () => heard.push('a'));
      subscribe(doc, () => heard.push('b'));
      heard.length = 0;
      doc.data[0].age = 31;
      await tick();
      expect(heard.sort()).toEqual(['a', 'b']);
    });

    it('a listener that unsubscribes itself does not disturb the others', async () => {
      const doc = parseDocument(DOC);
      const heard: string[] = [];
      // Declared first: `subscribe` calls the listener immediately, so `stop` must already exist.
      let stop: () => void = () => {};
      stop = subscribe(doc, () => { heard.push('a'); stop(); });
      subscribe(doc, () => heard.push('b'));
      heard.length = 0;
      doc.data[0].age = 31;
      await tick();
      expect(heard).toContain('a');
      expect(heard).toContain('b');
    });
  });

  describe('what counts as a change', () => {
    const watched = () => {
      const doc = parseDocument(DOC);
      subscribe(doc, () => {});
      return doc;
    };

    it('a member write', () => {
      const doc = watched();
      const before = version(doc);
      doc.data[0].age = 31;
      expect(version(doc)).toBe(before + 1);
    });

    it('a delete', () => {
      const doc = watched();
      const before = version(doc);
      delete doc.data[0].age;
      expect(version(doc)).toBe(before + 1);
    });

    it('an insert — and the inserted record then reports its OWN writes', () => {
      const doc = watched();
      doc.data.push({ name: 'Dev', age: 41 });
      const afterInsert = version(doc);
      // The point of stamping on insert: without it, the first record a user adds is the one thing
      // that silently never notifies.
      doc.data[2].age = 42;
      expect(version(doc)).toBe(afterInsert + 1);
    });

    it('a removal, a sort and a reverse', () => {
      const doc = watched();
      const before = version(doc);
      doc.data.sort((a: any, b: any) => a.age - b.age);
      doc.data.reverse();
      doc.data.deleteAt(0);
      expect(version(doc)).toBe(before + 3);
    });

    it('a header write', () => {
      const doc = watched();
      const before = version(doc);
      doc.header.definitions.set('@env', 'prod');
      expect(version(doc)).toBe(before + 1);
    });

    it('a read does not', () => {
      const doc = watched();
      const before = version(doc);
      doc.data[0].name;
      doc.toObject();
      doc.data.map((r: any) => r.name);
      expect(version(doc)).toBe(before);
    });

    it('a REFUSED write does not — nothing changed, so nothing is announced', () => {
      const doc = watched();
      const before = version(doc);
      expect(() => { doc.data[0].age = 'not-an-int'; }).toThrow();
      expect(version(doc)).toBe(before);
    });
  });

  describe('the cost to everyone who never subscribes', () => {
    it('parsing creates no revision at all', () => {
      const doc: any = parseCore(DOC);
      expect(doc._revision).toBeUndefined();
      expect(doc.sections.getAt(0).data._revision).toBeUndefined();
    });

    it('writing to an unsubscribed document is a null check and nothing else', () => {
      const doc: any = parseCore(DOC);
      expect(() => doc.sections.getAt(0).data.getAt(0).set('age', 31)).not.toThrow();
      expect(version(doc)).toBe(0);
    });

    it('the revision never leaks into a key walk', () => {
      const doc = parseDocument(DOC);
      subscribe(doc, () => {});
      expect(Object.keys(doc)).toEqual([]);
      expect(Object.keys(doc.data[0])).toEqual(['name', 'age']);
      expect(JSON.parse(JSON.stringify(doc.toObject()))).toEqual([
        { name: 'Alice', age: 30 }, { name: 'Bob', age: 25 },
      ]);
    });
  });
});

describe('String(doc) is the document as Internet Object text', () => {
  it('instead of "[object Object]"', () => {
    const doc = parseDocument(DOC);
    expect(String(doc)).toBe(DOC);
    expect(`${doc}`).toBe(DOC);
  });

  it('and it round-trips', () => {
    const doc = parseDocument(DOC);
    expect(parseDocument(String(doc)).toObject()).toEqual(doc.toObject());
  });

  it('it reflects a write, because it is the document that is being written', () => {
    const doc = parseDocument(DOC);
    doc.data[0].age = 31;
    expect(String(doc)).toContain('Alice, 31');
  });

  it('it is the same text stringifyDocument gives', () => {
    const doc = parseCore(DOC);
    expect(String(doc)).toBe(stringifyDocument(doc));
  });

  it('a document holding a failed record refuses, exactly as stringifyDocument does (B3)', () => {
    const bag: Error[] = [];
    const doc = parseCore('age: int\n---\n~ 30\n~ abc', null, bag);
    expect(() => String(doc)).toThrow(
      expect.objectContaining({ errorCode: 'forbidden-error-node' })
    );
    // and the escape is the documented one
    expect(stringifyDocument(doc, { skipErrors: true } as any)).toContain('~ 30');
  });

  it('console.log is unaffected — it uses the inspector, not toString', () => {
    const doc: any = parseCore(DOC);
    const inspected = doc[Symbol.for('nodejs.util.inspect.custom')]();
    expect(inspected).toHaveProperty('sections');
  });

  it('a record is untouched by this — String(rec) is not a serialization request', () => {
    const rec = new IOObject({ a: 1 });
    expect(String(rec)).toBe('[object IOObject]');
  });
});
