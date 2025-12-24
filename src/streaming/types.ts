export type StreamChunk = string | Uint8Array | ArrayBuffer;

/** Server-side: where the writer sends text chunks. */
export interface IOStreamTransport {
  send(chunk: string | Uint8Array): void | Promise<void>;
}

/**
 * Client-side: a source of bytes/text chunks.
 *
 * Supported shapes:
 * - AsyncIterable<StreamChunk>
 * - Web ReadableStream<Uint8Array>
 * - Node.js Readable (AsyncIterable<Uint8Array|string>)
 */
export type IOStreamSource =
  | AsyncIterable<StreamChunk>
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array | string>;

export interface StreamItem<T = any> {
  data: T;
  schemaName: string;
  index: number;
  error?: Error;
}

export interface OpenStreamOptions {
  /** Optional default schema name if header does not provide $schema. */
  defaultSchema?: string;

  /**
   * Soft guardrails for streaming buffers.
   * This is not a security boundary, but prevents accidental unbounded growth.
   */
  maxBufferedChars?: number;
}

export interface StreamWriterOptions {
  /** Default: true. If false, schemas are not written into the header. */
  includeSchemas?: boolean;

  /** If set, inserts a stable hash/id into header metadata (design hook). */
  defsId?: string;

  /**
   * How to handle validation/serialization errors during write().
   * - 'throw': Throw the error (default).
   * - 'ignore': Return empty string (skip the record).
   * - 'emit': Emit an error record (e.g. `!error { ... }`).
   */
  onError?: 'throw' | 'ignore' | 'emit';
}
