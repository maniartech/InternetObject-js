import { Position } from './positions';

/**
 * A failed record, as it appears **inside projected data**.
 *
 * When a record in a collection fails, the projection keeps the row and puts one of these in its
 * place, so positions survive and the good rows around it are untouched. On the wire it looks the
 * same as it always has — `toJSON()` and the enumerable fields below emit the
 * `{ __error: true, … }` shape the playground's JSON panel renders.
 *
 * Why a class rather than the plain object it used to be: **data could forge the plain shape.** A
 * document whose schema legitimately declares an `__error: bool` member produced records that
 * `isError()` reported as failures — and that `{ skipErrors: true }` silently dropped, which is
 * data loss on well-formed input. A prototype cannot be written in a document, so
 * `instanceof IOErrorItem` is the check data cannot fake, and `io.isError()` uses it.
 *
 * One consequence, shared with `Decimal` in the same projection: `structuredClone` strips
 * prototypes, so a clone of this item no longer answers `instanceof`. Test for errors on the side
 * of the boundary that parsed, not after cloning.
 */
export default class IOErrorItem {
  // Enumerable on purpose: spread, Object.keys and JSON.stringify must see the same shape the
  // plain object had, or the wire format changes out from under every consumer.
  readonly __error: true = true;
  readonly category: string;
  readonly message: string;
  // The remaining fields are assigned ONLY when provided, never as `undefined` — each producer
  // keeps emitting exactly the keys it emitted as a plain object, so the projected shape is
  // byte-identical (the behaviour snapshot holds it to that).
  readonly name?: string;
  readonly position?: Position;
  readonly endPosition?: Position;
  readonly errorCode?: string;
  readonly collectionIndex?: number;

  constructor(fields: {
    category: string;
    message: string;
    name?: string;
    position?: Position;
    endPosition?: Position;
    errorCode?: string;
    collectionIndex?: number;
  }) {
    this.category = fields.category;
    this.message = fields.message;
    if (fields.name !== undefined) this.name = fields.name;
    if (fields.position !== undefined) this.position = fields.position;
    if (fields.endPosition !== undefined) this.endPosition = fields.endPosition;
    if (fields.errorCode !== undefined) this.errorCode = fields.errorCode;
    if (fields.collectionIndex !== undefined) this.collectionIndex = fields.collectionIndex;
  }
}
