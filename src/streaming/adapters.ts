import { IOStreamSource, IOStreamTransport, StreamChunk } from './types';

/**
 * A helper to bridge event-based or callback-based data sources to the AsyncIterable
 * consumed by `createStreamReader`.
 *
 * @returns An object containing:
 * - `source`: The AsyncIterable to pass to `createStreamReader`.
 * - `push`: A function to push a new chunk of data.
 * - `close`: A function to signal the end of the stream (or an error).
 *
 * @example
 * ```ts
 * const { source, push, close } = createPushSource();
 * const reader = createStreamReader(source);
 *
 * xhr.onprogress = () => push(xhr.responseText.substring(seen));
 * xhr.onload = () => close();
 * xhr.onerror = () => close(new Error('Network error'));
 * ```
 */
export function createPushSource(): {
  source: AsyncIterable<StreamChunk>;
  push: (chunk: StreamChunk) => void;
  close: (error?: Error) => void;
} {
  const queue: StreamChunk[] = [];
  let resolvers: ((value: IteratorResult<StreamChunk> | PromiseLike<IteratorResult<StreamChunk>>) => void)[] = [];
  let done = false;
  let error: Error | undefined;

  const push = (chunk: StreamChunk) => {
    if (done) return;
    if (resolvers.length > 0) {
      const resolve = resolvers.shift()!;
      resolve({ value: chunk, done: false });
    } else {
      queue.push(chunk);
    }
  };

  const close = (err?: Error) => {
    if (done) return;
    done = true;
    error = err;
    while (resolvers.length > 0) {
      const resolve = resolvers.shift()!;
      if (err) {
        // We can't easily reject the iterator promise in a way that plays nice with for-await
        // without handling it carefully. Standard async iterators usually throw on next().
        // Here we resolve with a rejected promise logic if we could, but for simplicity
        // we will let the next call handle the error state.
        // Actually, resolving with a rejected promise is valid.
        Promise.reject(err).catch(() => {}); // Prevent unhandled rejection
        // But we need to pass the error to the consumer.
        // The cleanest way in a manual iterator is to throw when next() is called.
        // Since we are resolving a pending next() call:
        // We can't "reject" the resolve callback directly.
        // We need to store the error and let the promise reject.
        resolve(Promise.reject(err));
      } else {
        resolve({ value: undefined, done: true });
      }
    }
  };

  const source: AsyncIterable<StreamChunk> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<StreamChunk>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          if (done) {
            if (error) return Promise.reject(error);
            return Promise.resolve({ value: undefined, done: true });
          }
          return new Promise<IteratorResult<StreamChunk>>((resolve, reject) => {
            // We wrap resolve to handle the error rejection logic from close()
            resolvers.push((res: any) => {
               // If res is a promise (from close with error), it will bubble up
               resolve(res);
            });
          });
        }
      };
    }
  };

  return { source, push, close };
}

/**
 * A transport that accumulates all written data into a single string buffer.
 * Useful for environments where streaming upload is not possible, and you need
 * to generate the full payload before sending.
 */
export class BufferTransport implements IOStreamTransport {
  private chunks: string[] = [];
  // A single streaming decoder preserves multibyte UTF-8 state across send() calls,
  // so a code point split across two byte chunks decodes correctly (gap tracker Gap 2).
  private decoder = new TextDecoder('utf-8');

  send(chunk: string | Uint8Array): void {
    if (typeof chunk === 'string') {
      this.chunks.push(chunk);
    } else {
      this.chunks.push(this.decoder.decode(chunk, { stream: true }));
    }
  }

  getOutput(): string {
    // Flush any bytes the decoder is still holding for an incomplete code point.
    const tail = this.decoder.decode();
    if (tail) this.chunks.push(tail);
    return this.chunks.join('');
  }
}
