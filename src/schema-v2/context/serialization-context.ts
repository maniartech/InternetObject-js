/**
 * SerializationContext - Manages serialization state
 *
 * This is a TEMPORARY placeholder. Full implementation coming in Phase 2 Day 5.
 */

export interface SerializationContext {
  readonly indent: string;
  readonly prettyPrint: boolean;
  write(text: string): void;
  writeLine(text: string): void;
  increaseIndent(): void;
  decreaseIndent(): void;
}

// TODO: Full implementation in Phase 2 Day 5
