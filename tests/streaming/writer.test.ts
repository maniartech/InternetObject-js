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

  describe('writeBatch and send usage', () => {
    it('accepts a duck-typed Writable (Node.js style)', async () => {
      const wrote: string[] = [];
      const mockWritable = {
        write: (chunk: string) => {
          wrote.push(chunk);
          return true;
        },
        end: () => {}
      };

      const writer = createStreamWriter(mockWritable as any);
      // Use send() to trigger use of wrapper
      await writer.send({ a: 1 });

      expect(wrote.length).toBeGreaterThan(0);
      expect(wrote.join('')).toContain('~ 1');
    });

    it('supports writeBatch and sendBatch', async () => {
        const output: string[] = [];
        const transport: IOStreamTransport = {
            send: (c) => { output.push(c.toString()) }
        };
        const writer = createStreamWriter(transport);

        // schemaName 'users'
        const batch1 = writer.writeBatch([
            { name: 'A' },
            { name: 'B' }
        ], 'users');

        expect(batch1).toContain('--- users');
        expect(batch1).toContain('~ A');
        expect(batch1).toContain('~ B');

        // Check sendBatch (updates state)
        await writer.sendBatch([{ name: 'C' }], 'users');
        const lastOutput = output[output.length - 1];

        expect(lastOutput).toContain('~ C');
        // 'users' matches 'users', so NO new header
        expect(lastOutput).not.toContain('--- users');
    });
  });
});
