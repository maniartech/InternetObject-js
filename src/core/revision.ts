/**
 * Notification (ADR 0005 §8).
 *
 * A document that can be written to needs a way to say *something changed*, or every UI holding one
 * has to re-read it on a timer or not at all. This is that, and it is deliberately the smallest
 * thing that works:
 *
 * ```ts
 * io.subscribe(doc, fn)   // fn is called with the current value; returns an unsubscribe
 * io.version(doc)         // a monotonic number
 * ```
 *
 * ## Why a shared object rather than a parent pointer
 *
 * A record does not know which document it belongs to — nothing in the core carries a parent link,
 * and adding one would mean every node holding a reference that has to be kept correct through
 * every insert, delete and move. Instead the containers of one document **share a `Revision`**,
 * stamped onto them when somebody first subscribes, and passed on to anything inserted afterwards.
 * A node that belongs to no subscribed document has none, and `touch()` is then a null check —
 * which is the whole cost of this feature to everyone who never uses it.
 *
 * ## Coalesced to a microtask
 *
 * Ten writes in one handler produce one notification. The version number moves on every write (it
 * has to: `useSyncExternalStore` compares snapshots, and a coalesced *number* would let a render
 * miss an intermediate state), but listeners are called once, after the current task.
 */

/** A listener. It receives the current value, which is what a Svelte store's contract requires. */
export type RevisionListener = (value: any) => void;

/**
 * The shared change counter for one document.
 *
 * Held non-enumerably by every container in that document, so a write anywhere reaches the same
 * counter and the same listeners without anyone walking a tree at write time.
 */
export default class Revision {
  /** Monotonic. Moves on every write, even when the notification is coalesced away. */
  public version = 0;

  private readonly listeners = new Set<RevisionListener>();
  private scheduled = false;

  /** What a listener is handed. Set by whoever created the Revision — normally the document. */
  constructor(private readonly valueOf: () => any) {}

  public add(listener: RevisionListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Records a change, and schedules one notification for the end of the current task. */
  public touch(): void {
    this.version++;
    if (this.listeners.size === 0 || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      const value = this.valueOf();
      // A copy: a listener that unsubscribes itself must not disturb the walk.
      for (const listener of [...this.listeners]) listener(value);
    });
  }
}

/**
 * Records a change on whatever holds a revision, and does nothing where none does.
 *
 * Every mutator in the core calls this. Keeping it a free function rather than a method means the
 * containers need one non-enumerable field and no shared base class.
 */
export function touch(holder: { _revision?: Revision } | undefined | null): void {
  holder?._revision?.touch();
}

/** Attaches `revision` to a container, if it is one, and returns whether it was. */
function stampOne(value: any, revision: Revision): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (!('_revision' in value)) return false;
  Object.defineProperty(value, '_revision', {
    value: revision, writable: true, enumerable: false, configurable: true,
  });
  return true;
}

/**
 * Stamps `value` and everything under it with `revision`.
 *
 * Called once when a document is first subscribed to, and again on each insertion — a record pushed
 * into a subscribed collection has to start reporting its own writes, or the first thing a user
 * adds is the one thing that silently does not notify.
 *
 * Cycles are possible (a schema may refer to itself), so visited nodes are remembered.
 */
export function stamp(value: any, revision: Revision, seen: Set<object> = new Set()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  stampOne(value, revision);

  // Walk by iteration rather than by type: every core container is iterable, and a plain array or
  // object may hold records too. Reading a `Map`/`Set` is not attempted — none of them holds data.
  if (Array.isArray(value)) {
    for (const item of value) stamp(item, revision, seen);
    return;
  }
  const anyValue = value as any;
  if (typeof anyValue.getAt === 'function' && typeof anyValue.length === 'number') {
    for (let i = 0; i < anyValue.length; i++) stamp(anyValue.getAt(i), revision, seen);
  }
  for (const key of ['header', 'sections', 'definitions', 'data'] as const) {
    if (key in anyValue) stamp(anyValue[key], revision, seen);
  }
  if (typeof anyValue.valuesArray === 'function') {
    for (const item of anyValue.valuesArray()) stamp(item, revision, seen);
  }
}
