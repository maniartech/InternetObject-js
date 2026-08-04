import { describe, test, expect } from 'vitest';
import IOObject from '../../src/core/internet-object';

/**
 * R6 + R7 — method-only data access and a uniform error contract.
 *
 * R7: data lives only in the internal store and is read via get()/getAt() — no dot-notation /
 * instance-property sync. So a data key can never collide with a method name or with `.errors` /
 * `.length`, which is why no reserved-name guard is needed anymore.
 * R6: every container exposes `getErrors()`.
 */
describe('R7 — method-only access, no member collisions', () => {
  test('data keys named errors / length / get do NOT collide with members or methods', () => {
    const obj = new IOObject();
    obj.set('errors', 5);
    obj.set('length', 9);
    obj.set('get', 'x');

    // data is reachable via get()
    expect(obj.get('errors')).toBe(5);
    expect(obj.get('length')).toBe(9);
    expect(obj.get('get')).toBe('x');

    // members/methods are intact (not shadowed by the data keys)
    expect(Array.isArray(obj.errors)).toBe(true);   // the diagnostics channel, not the data key
    expect(obj.errors.length).toBe(0);
    expect(obj.length).toBe(3);                      // member count, not the data value 9
    expect(typeof obj.get).toBe('function');
  });

  test('no dot-notation sync — data is method-only', () => {
    const obj = new IOObject({ name: 'John' });
    expect(obj.get('name')).toBe('John');
    expect((obj as any).name).toBeUndefined();
  });
});

describe('R6 — uniform getErrors()', () => {
  test('IOObject exposes getErrors()', () => {
    const obj = new IOObject();
    expect(typeof obj.getErrors).toBe('function');
    expect(obj.getErrors()).toEqual([]);
  });
});
