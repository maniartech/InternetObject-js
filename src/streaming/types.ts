export type StreamChunk = string | Uint8Array | ArrayBuffer;

/** Server-side: where the writer sends text chunks. */
export interface IOStreamTransport {
  send(chunk: string | Uint8Array): void | Promise<void>;
}

/**
 * Client-side: a source of bytes/text chunks.
 *
 * Supported shapes:
 * - string
 * - Iterable<StreamChunk>
 * - AsyncIterable<StreamChunk>
 * - Web ReadableStream<Uint8Array>
 * - Node.js Readable (AsyncIterable<Uint8Array|string>)
 */
export type IOStreamSource =
  | string
  | Iterable<StreamChunk>
  | AsyncIterable<StreamChunk>
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array | string>;

/**
 * The frozen v1 stream item (PROTOCOL.md §5). The reader yields exactly these two
 * shapes; the discriminant names the protocol event, not the payload type.
 */
export type StreamItem<T = any> =
  | {
      kind: 'record';
      recordIndex: number;
      schemaName?: string;
      data: T;
      error?: undefined;
    }
  | {
      kind: 'record-error';
      recordIndex: number;
      schemaName?: string;
      data: null;
      error: Error;
    };

export interface StreamReaderOptions {
  /** Optional default schema name if header does not provide $schema. */
  defaultSchema?: string;

  /**
   * Hard cap on a single pending logical frame, in characters. Default 2_000_000.
   * Exceeding it is a fatal stream error that rejects the iterator (not a record-error).
   * It bounds one in-flight frame, not cumulative stream history.
   */
  maxBufferedChars?: number;

  /**
   * Optional AbortSignal. When it aborts, iteration rejects at the next pull
   * boundary with the abort reason and the underlying source is released.
   * Aborting is fatal to the stream and does not emit a record-error.
   */
  signal?: AbortSignal;
}

export interface StreamWriterOptions {
  /** Default: true. If false, schema definitions are not written into the header. */
  includeSchemas?: boolean;
}
