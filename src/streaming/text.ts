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

/**
 * Strip a single leading UTF-8 byte-order mark (U+FEFF) from the very start of the
 * stream. A BOM-like character anywhere else is ordinary content and is preserved
 * (PROTOCOL §11). For byte sources the streaming TextDecoder already removes a leading
 * BOM; this covers string/text sources that carry one.
 */
export function stripLeadingBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

