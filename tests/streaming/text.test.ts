import { describe, it, expect } from 'vitest';
import { ChunkDecoder, updateStringState } from '../../src/streaming/text';

describe('ChunkDecoder', () => {
  it('should decode simple strings passed as strings', () => {
    const decoder = new ChunkDecoder();
    expect(decoder.decode('hello')).toBe('hello');
    expect(decoder.decode(' world')).toBe(' world');
  });

  it('should decode simple byte arrays', () => {
    const decoder = new ChunkDecoder();
    const encoder = new TextEncoder();
    expect(decoder.decode(encoder.encode('hello'))).toBe('hello');
    expect(decoder.decode(encoder.encode(' world'))).toBe(' world');
  });

  it('should handle multi-byte characters split across chunks', () => {
    const decoder = new ChunkDecoder();
    const emoji = '🚀'; // 4 bytes: F0 9F 86 80
    const bytes = new TextEncoder().encode(emoji);

    // Split into two chunks: [F0, 9F] and [86, 80]
    const chunk1 = bytes.slice(0, 2);
    const chunk2 = bytes.slice(2);

    // First chunk should return empty string as it's incomplete
    expect(decoder.decode(chunk1)).toBe('');

    // Second chunk should complete the character
    expect(decoder.decode(chunk2)).toBe(emoji);
  });

  it('should handle complex split scenarios', () => {
    const decoder = new ChunkDecoder();
    const text = 'Hello 🌍 World 🚀';
    const bytes = new TextEncoder().encode(text);

    // Split arbitrarily
    const chunk1 = bytes.slice(0, 8); // "Hello 🌍" is bytes 0-10 (Hello + space + 4 bytes). 8 bytes cuts the earth.
    // 'Hello ' is 6 bytes. '🌍' is F0 9F 8C 8D.
    // chunk1 (0-8): 'Hello ' (6) + F0 9F (2). Incomplete earth.

    const chunk2 = bytes.slice(8); // Rest of earth + " World 🚀"

    const decoded1 = decoder.decode(chunk1);
    expect(decoded1).toBe('Hello ');

    const decoded2 = decoder.decode(chunk2);
    expect(decoded2).toBe('🌍 World 🚀');
  });
});

describe('updateStringState', () => {
  it('toggles state on quotes', () => {
    expect(updateStringState('"', null)).toBe('"');
    expect(updateStringState('"', '"')).toBe(null);
    expect(updateStringState('abc', null)).toBe(null);
    expect(updateStringState('abc', '"')).toBe('"');
  });

  it('handles escaped quotes', () => {
    // When outside a string, \" opens a string (escape only matters inside strings)
    expect(updateStringState('\\"', null)).toBe('"');
    // When inside a string, escaped quote doesn't close it
    expect(updateStringState('a\\"b', '"')).toBe('"');
  });

  it('handles complex strings', () => {
    let state: string | null = null;
    state = updateStringState('Start "', state);
    expect(state).toBe('"');
    state = updateStringState('Middle', state);
    expect(state).toBe('"');
    state = updateStringState('" End', state);
    expect(state).toBe(null);
  });
});
