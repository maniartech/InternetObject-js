import IOStreamError from '../errors/io-stream-error';

/**
 * Streaming-owned fatal error codes (PROTOCOL.md §7.3). These belong to the streaming
 * layer because they concern transport/lifecycle, not data semantics. Everything else
 * fatal preserves a core error identity (e.g. unknown schema switch → schema-not-defined).
 */
export enum StreamErrorCode {
  /** A single pending frame (one record, or the header) exceeded the buffer limit. */
  bufferExceeded = 'stream-buffer-exceeded',
  /** The underlying source or transport failed or errored. */
  sourceError = 'stream-source-error',
  /** Iteration was cancelled cooperatively (e.g. via an AbortSignal). */
  aborted = 'stream-aborted',
}

/** Construct an IOStreamError, optionally chaining the underlying cause. */
export function streamError(code: StreamErrorCode, message: string, cause?: unknown): IOStreamError {
  const err = new IOStreamError(code, message);
  if (cause !== undefined) (err as any).cause = cause;
  return err;
}

export { default as IOStreamError } from '../errors/io-stream-error';
