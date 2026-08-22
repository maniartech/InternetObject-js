import { describe, it, expect } from 'vitest';
import { createStreamReader } from '../../src/streaming/reader';

/**
 * ADR 0012 / PROTOCOL §7.2 — invalid header definitions are FATAL: iteration terminates with the
 * core error's identity (class/category/code); the error is never demoted to a record-error item
 * and never silently swallowed. Structural header errors throw from core parse (already fatal);
 * the reader additionally checks the collector channel so a collected header error can't vanish.
 */
describe('ADR 0012 — header errors are fatal', () => {
  it('a bad type in a header definition rejects iteration (no records emitted)', async () => {
    const input = '~ $User: {name: strnig}\n--- $User\n~ Alice\n';
    const reader = createStreamReader(input);
    await expect(reader.collect()).rejects.toMatchObject({ errorCode: 'unknown-type' });
  });

  it('an unclosed brace in a header definition rejects iteration', async () => {
    const input = '~ $User: {name: string\n---\n~ Alice\n';
    const reader = createStreamReader(input);
    await expect(reader.collect()).rejects.toMatchObject({ errorCode: 'invalid-definition' });
  });

  it('a garbage header line rejects iteration', async () => {
    const input = '~ @@@!!\n---\n~ 1\n';
    const reader = createStreamReader(input);
    await expect(reader.collect()).rejects.toMatchObject({ errorCode: 'invalid-definition' });
  });

  it('a valid header still streams records (fatal check does not overreach)', async () => {
    const input = '~ $User: {name: string}\n--- $User\n~ Alice\n~ Bob\n';
    const reader = createStreamReader(input);
    const items = await reader.collect();
    expect(items).toHaveLength(2);
    expect(items.every(i => i.kind === 'record')).toBe(true);
  });

  it('an empty header (bare ---) still streams records', async () => {
    const reader = createStreamReader('---\n~ 1\n~ 2\n');
    const items = await reader.collect();
    expect(items).toHaveLength(2);
  });
});
