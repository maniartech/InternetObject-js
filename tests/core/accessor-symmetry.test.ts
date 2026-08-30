import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';
import parseDefinitions from '../../src/parser/parse-defs';

/**
 * A7 — one convention for access, on every container.
 *
 *   get(key)      getAt(index)
 *   set(key, v)   setAt(index, v)
 *   delete(key)   deleteAt(index)
 *
 * `IOObject` and `IOCollection` already followed it. Two classes did not: `IOSectionCollection` had
 * no `getAt` at all (`get` was overloaded for name *and* index), and `IODefinitions` spelled it
 * `at`. `sections.getAt(0)` throwing "not a function" is what a user hits first, because every other
 * container answers it.
 */
describe('accessor symmetry (A7)', () => {
  const doc: any = parse('~ $p: {a: string}\n~ @env: prod\n--- users: $p\n~ x\n--- posts: $p\n~ y');

  describe('IOSectionCollection', () => {
    it('answers getAt(index)', () => {
      expect(doc.sections.getAt(0).name).toBe('users');
      expect(doc.sections.getAt(1).name).toBe('posts');
    });

    it('agrees with get(index) for every position', () => {
      for (let i = 0; i < doc.sections.length; i++) {
        expect(doc.sections.getAt(i)).toBe(doc.sections.get(i));
      }
    });

    it('returns undefined out of range rather than throwing', () => {
      expect(doc.sections.getAt(99)).toBeUndefined();
      expect(doc.sections.getAt(-1)).toBeUndefined();
    });

    it('leaves get(name) working', () => {
      expect(doc.sections.get('posts')?.name).toBe('posts');
    });
  });

  describe('IODefinitions', () => {
    const defs: any = parseDefinitions('~ $p: {a: string}\n~ @env: prod');

    it('answers getAt(index) with the VALUE, in definition order', () => {
      expect(defs.getAt(0)).toBe(defs.get(defs.keys[0]));
      expect(defs.getAt(1)).toBe(defs.get(defs.keys[1]));
    });

    it('at(index) stays the PAIR accessor — not a misnamed getAt', () => {
      const pair = defs.at(0);
      expect(Object.keys(pair).sort()).toEqual(['key', 'value']);
      expect(pair.key).toBe(defs.keys[0]);
    });

    it('returns undefined out of range', () => {
      expect(defs.getAt(99)).toBeUndefined();
    });

    it('getTokenNode is getV under a readable name', () => {
      expect(defs.getTokenNode('@env')).toBe(defs.getV('@env'));
      expect(defs.getTokenNode('$p')).toBe(defs.getV('$p'));
    });

    /**
     * Pins how the three key-based getters differ, because it is not guessable and because a later
     * change to `get`'s semantics must be a deliberate one. Measured 2026-08-24:
     *
     *   get       lenient, raw    -> TokenNode | undefined
     *   getV      strict,  raw    -> TokenNode | throws
     *   getValue  strict,  decoded-> value     | throws
     */
    it('get is lenient; getV and getValue throw on a missing key', () => {
      expect(defs.get('@nope')).toBeUndefined();
      expect(() => defs.getV('@nope')).toThrow();
      expect(() => defs.getValue('@nope')).toThrow();
      expect(() => defs.getV('$nope')).toThrow();
    });

    it('getValue decodes what get and getV leave wrapped', () => {
      expect(defs.getValue('@env')).toBe('prod');
      expect(typeof defs.get('@env')).toBe('object');   // a TokenNode
    });
  });

  describe('every container answers getAt', () => {
    it('without throwing', () => {
      const rows: any = doc.sections.get(0).data;
      expect(() => rows.getAt(0)).not.toThrow();
      expect(() => rows.getAt(0).getAt(0)).not.toThrow();
      expect(() => doc.sections.getAt(0)).not.toThrow();
      expect(() => doc.header.definitions.getAt(0)).not.toThrow();
    });
  });
});
