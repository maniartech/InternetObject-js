/**
 * Interface for objects that support conversion to plain JavaScript objects.
 */
export interface Jsonable {
  toJSON(options?: { skipErrors?: boolean }): any;
  toObject?(options?: { skipErrors?: boolean }): any;
}

/**
 * Converts a "Jsonable" value (one with `toObject` or `toJSON` methods)
 * into a plain JavaScript object/value.
 *
 * This function is the primary entry point for converting IO instances
 * back to standard JavaScript data structures.
 *
 * @param value - The value to convert. Must implement `toObject` or `toJSON`.
 * @param options - Conversion options.
 * @throws {TypeError} If the value is null/undefined or does not have conversion methods.
 * @returns The plain JavaScript representation.
 */
export function toObject(value: Jsonable, options?: { skipErrors?: boolean }): any {
  if (value === null || value === undefined) {
    throw new TypeError('io.toObject() expects a Jsonable value, received null/undefined');
  }

  const toObjectFn = (value as any).toObject;
  if(typeof toObjectFn === 'function') {
    return toObjectFn.call(value, options);
  }

  const toJSONFn = (value as any).toJSON;
  if (typeof toJSONFn === 'function') {
    return toJSONFn.call(value, options);
  }

  throw new TypeError('io.toObject() expects a Jsonable value (object with toObject() or toJSON())');
}

/**
 * Alias for `toObject`.
 */
export const toJSON = toObject;
