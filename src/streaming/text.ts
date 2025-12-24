import { StreamChunk } from './types';

export class ChunkDecoder {
  private decoder = new TextDecoder('utf-8');

  decode(chunk: StreamChunk): string {
    if (typeof chunk === 'string') return chunk;
    const bytes = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk;
    return this.decoder.decode(bytes, { stream: true });
  }
}

export function normalizeNewlines(s: string): string {
  // Keep it simple: normalize CRLF to LF for parsing logic.
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function splitLinesKeepRemainder(buffer: string): { lines: string[]; remainder: string } {
  const idx = buffer.lastIndexOf('\n');
  if (idx === -1) return { lines: [], remainder: buffer };
  const head = buffer.slice(0, idx);
  const remainder = buffer.slice(idx + 1);
  return { lines: head.split('\n'), remainder };
}

export function updateStringState(line: string, inString: boolean): boolean {
  let state = inString;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      // Check if it's escaped
      let backslashes = 0;
      for (let j = i - 1; j >= 0; j--) {
        if (line[j] === '\\') backslashes++;
        else break;
      }
      if (backslashes % 2 === 0) {
        state = !state;
      }
    }
  }
  return state;
}
