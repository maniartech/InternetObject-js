/**
 * The error sink — one shape, one slot, on every entry point (ADR 0005 §2.3, §2.5).
 *
 * ```
 * io.parse(text,  defs?, sink?, options?)
 * io.load(data,   defs?, sink?, options?)
 * io.validate(data, defs?, sink?, options?)
 * ```
 *
 * **Whether you pass one is the whole of the fail-fast question**, which is why there is no
 * `strict` option: with no sink the first error throws, and with one, everything that can be
 * reported is. Slot three means the same thing everywhere, so nothing has to be remembered per
 * function — and an array landing in the wrong slot cannot be silently swallowed, which is exactly
 * what used to happen when slot three was an options object.
 */

/**
 * Where errors are reported: an array to fill, or a function called once per error.
 *
 * The array is the spelling that cannot outlive the call; the function is for a caller that wants
 * to route them somewhere. They see the same errors in the same order.
 */
export type ErrorSink = Error[] | ((error: Error) => void);

/** True for the two things a sink can be, and for nothing else — an options object included. */
export function isErrorSink(value: unknown): value is ErrorSink {
  return Array.isArray(value) || typeof value === 'function';
}

/**
 * Runs `body` with an error array, then reports whatever landed in it.
 *
 * A function sink is called after the operation rather than during it — these are synchronous and
 * nobody can observe the difference — and it is called even when the operation throws, so a caller
 * that both catches and collects sees everything found on the way to the throw.
 */
export function withSink<T>(sink: ErrorSink | undefined, body: (bag: Error[] | undefined) => T): T {
  // No sink means fail fast — the promise this file has always made, and until now only half kept.
  //
  // A fatal error threw on its own, so a bad value in a single record did raise. But a bad record
  // inside a COLLECTION is recovered from: the record is replaced by an error node and the error is
  // pushed to the collector *if there is one*. With no collector it was dropped, so a document
  // whose second `~` row failed came back as an array holding an error node, and said nothing.
  //
  // That is the worst of both worlds for someone writing the document: no exception, and a value
  // that looks like data until you inspect it. Recovery is still one argument away — pass a sink
  // and every error is reported while the good records survive.
  if (sink === undefined) {
    const bag: Error[] = [];
    let result: T;
    try {
      result = body(bag);
    } catch (fatal) {
      // The fatal path can pass recoverable errors on the way down. Attach them, or they are lost
      // on exactly the path this branch exists to fix.
      if (bag.length > 0 && fatal instanceof Error) attachAll(fatal, bag);
      throw fatal;
    }
    if (bag.length > 0) {
      // The FIRST error is thrown — its code and position are what callers branch on — and the
      // complete bag rides along as `.errors`, so an author fixes a fixture in one run, not one
      // error per run.
      throw attachAll(bag[0], bag);
    }
    return result;
  }
  if (Array.isArray(sink)) return body(sink);
  const bag: Error[] = [];
  try {
    return body(bag);
  } finally {
    for (const error of bag) sink(error);
  }
}

/** Hangs the complete error list off the error being thrown, without touching its own fields. */
function attachAll(error: Error, bag: Error[]): Error {
  (error as Error & { errors?: Error[] }).errors = [...bag];
  return error;
}

/** Appends to a sink of either shape. */
export function report(sink: ErrorSink | undefined, error: Error): void {
  if (sink === undefined) return;
  if (Array.isArray(sink)) sink.push(error);
  else sink(error);
}
