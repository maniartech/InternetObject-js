import { IOStreamSource, StreamChunk } from './types';

/** Convert common stream sources into an AsyncIterable of chunks. */
export async function* toAsyncIterable(source: IOStreamSource): AsyncIterable<StreamChunk> {
  // String (treat as single chunk)
  if (typeof source === 'string') {
    yield source;
    return;
  }

  // Iterable (Synchronous) - arrays, generators
  // Check this BEFORE AsyncIterable because some AsyncIterables might also implement Iterator (though rare/bad practice)
  // But actually, we prefer AsyncIterable interpretation if both exist.
  // However, simple Arrays are Iterable but not AsyncIterable.
  if (isIterable(source) && !isAsyncIterable(source)) {
    for (const chunk of source) {
      yield chunk;
    }
    return;
  }

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

function isIterable(x: any): x is Iterable<any> {
  return x && typeof x[Symbol.iterator] === 'function';
}

function isWebReadableStream(x: any): x is ReadableStream<Uint8Array> {
  return x && typeof x.getReader === 'function';
}
