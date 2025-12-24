import { IOStreamSource, StreamChunk } from './types';

/** Convert common stream sources into an AsyncIterable of chunks. */
export async function* toAsyncIterable(source: IOStreamSource): AsyncIterable<StreamChunk> {
  // Web ReadableStream
  if (isWebReadableStream(source)) {
    const reader = source.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) return;
        if (value) yield value;
      }
    } finally {
      try { reader.releaseLock(); } catch { /* noop */ }
    }
  }

  // AsyncIterable (Node Readable streams are async iterable)
  if (isAsyncIterable(source)) {
    for await (const chunk of source as any) {
      yield chunk as any;
    }
    return;
  }

  throw new Error('Unsupported stream source type. Provide an AsyncIterable or a ReadableStream.');
}

function isAsyncIterable(x: any): x is AsyncIterable<any> {
  return x && typeof x[Symbol.asyncIterator] === 'function';
}

function isWebReadableStream(x: any): x is ReadableStream<Uint8Array> {
  return x && typeof x.getReader === 'function';
}
