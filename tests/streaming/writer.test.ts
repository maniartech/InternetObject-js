import { describe, it, expect, vi } from 'vitest';
import { createStreamWriter } from '../../src/streaming/writer';
import { IOStreamTransport } from '../../src/streaming/types';
import io from '../../src/facade';
import Decimal from '../../src/core/decimal/decimal';

class MockTransport implements IOStreamTransport {
  public chunks: string[] = [];
  send(chunk: string | Uint8Array): void {
    this.chunks.push(chunk.toString());
  }
}

describe('IOStreamWriter', () => {
  it('writes header and data', async () => {
    const transport = new MockTransport();
    const writer = createStreamWriter(transport);

    writer.setHeader(io.defs`
      ~ streamId: "test-1"
    `);

    await writer.sendHeader();
    transport.send(writer.write({ id: 1, name: 'Alice' }));

    expect(transport.chunks[0]).toContain('streamId: test-1');
    expect(transport.chunks[1]).toContain('~ 1, Alice');
  });

  it('handles validation errors with onError: "throw" (default)', () => {
    const transport = new MockTransport();
    const schemaDefs = io.defs`~ $user: { name: {string, minLen: 5} }`;
    const writer = createStreamWriter(transport, schemaDefs); // default onError: 'throw'

    expect(() => {
      writer.write({ name: 'Bob' }, '$user'); // Too short
    }).toThrow('Invalid minLength');
  });

  it('handles validation errors with onError: "ignore"', () => {
    const transport = new MockTransport();
    const schemaDefs = io.defs`~ $user: { name: {string, minLen: 5} }`;
    const writer = createStreamWriter(transport, schemaDefs, { onError: 'ignore' });

    const output = writer.write({ name: 'Bob' }, '$user');
    expect(output).toBe('');
  });

  it('handles validation errors with onError: "emit"', () => {
    const transport = new MockTransport();
    const schemaDefs = io.defs`~ $user: { name: {string, minLen: 5} }`;
    const writer = createStreamWriter(transport, schemaDefs, { onError: 'emit' });

    const output = writer.write({ name: 'Bob' }, '$user');

    expect(output).toContain('--- $error');
    expect(output).toContain('invalid-min-length');

    // Should switch back to schema for next valid item
    const validOutput = writer.write({ name: 'Alice' }, '$user');
    expect(validOutput).toContain('--- $user');
    expect(validOutput).toContain('Alice');
  });
});
