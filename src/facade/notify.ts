/**
 * `io.subscribe` and `io.version` (ADR 0005 §8) — how a UI hears that a document changed.
 *
 * ```ts
 * const stop = io.subscribe(doc, (value) => render(value));
 * io.version(doc);   // monotonic
 * ```
 *
 * ## Why these two, and no framework package
 *
 * `subscribe(fn)` calling `fn(value)` and returning an unsubscribe **is** the Svelte store
 * contract, so a document is a Svelte store as it stands. React ignores the listener's argument and
 * wants a snapshot instead, which is what `io.version` is for:
 *
 * ```ts
 * const useIO = (doc) => useSyncExternalStore(cb => io.subscribe(doc, cb), () => io.version(doc));
 * ```
 *
 * One pair satisfies both, and Vue and Solid bind to the same pair. That is the whole reason ADR
 * 0005 cut the React package: there was nothing left for it to do.
 *
 * ## Functional, not `doc.version`
 *
 * Deliberately (§8). `version` is a very plausible section name, and property access on a document
 * resolves data before methods — so `doc.version` would mean the *section* the day someone had one.
 * These cannot be shadowed.
 */
import Revision from '../core/revision';
import { stamp } from '../core/revision';
import { unwrap } from '../proxy';

/** Anything that can carry a revision — every core container does. */
type Holder = { _revision?: Revision };

/**
 * Finds the document's revision, creating and stamping it on first use.
 *
 * The stamp is a one-time walk of the whole document. Doing it at subscribe time rather than at
 * parse time is what keeps the cost off everybody who never subscribes: an unstamped node's
 * `touch()` is a null check, and parsing ten thousand records creates no revisions at all.
 */
function revisionOf(target: any, create: boolean): Revision | undefined {
  const node = unwrap(target) as Holder | null;
  if (!node || typeof node !== 'object') return undefined;
  if (node._revision) return node._revision;
  if (!create) return undefined;

  const revision = new Revision(() => target);
  stamp(node, revision);
  // `stamp` walks containers; if `target` is something it does not recognise, hold the revision
  // here anyway so `version` and later writes through it still work.
  if (!node._revision) {
    Object.defineProperty(node, '_revision', {
      value: revision, writable: true, enumerable: false, configurable: true,
    });
  }
  return revision;
}

/**
 * Calls `listener` whenever the document changes, and returns a function that stops it.
 *
 * ```ts
 * const stop = io.subscribe(doc, (value) => console.log(io.version(value)));
 * doc.data[0].age = 31;
 * // ... one call, after the current task
 * stop();
 * ```
 *
 * **Coalesced to a microtask**: ten writes in one handler produce one call. The *version* moves on
 * every write — a coalesced number would let a render miss an intermediate state — but the listener
 * runs once, at the end of the task.
 *
 * **Called immediately with the current value**, which is what makes a document a valid Svelte
 * store. React's `useSyncExternalStore` ignores the argument and re-reads the snapshot, so the
 * immediate call costs it nothing.
 *
 * Works on a proxied document or a bare one; both reach the same node.
 *
 * @param doc The document (or any core container) to watch.
 * @param listener Called with the current value.
 * @returns An unsubscribe function. Calling it twice is harmless.
 */
export function subscribe(doc: any, listener: (value: any) => void): () => void {
  const revision = revisionOf(doc, true);
  if (!revision) return () => { /* nothing to watch, nothing to stop */ };
  const unsubscribe = revision.add(listener);
  listener(doc);
  return unsubscribe;
}

/**
 * A monotonic number that changes whenever the document does — the immutable snapshot
 * `useSyncExternalStore` needs.
 *
 * `0` until something subscribes: nothing is counting before then, and a caller comparing versions
 * without subscribing has nothing to compare against anyway.
 *
 * @param doc The document (or any core container).
 */
export function version(doc: any): number {
  return revisionOf(doc, false)?.version ?? 0;
}
