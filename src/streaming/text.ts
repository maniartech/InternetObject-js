import { StreamChunk } from './types';

export function decodeChunk(chunk: StreamChunk): string {
  if (typeof chunk === 'string') return chunk;
  if (chunk instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(chunk));
  }
  // Uint8Array
  return new TextDecoder().decode(chunk);
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
