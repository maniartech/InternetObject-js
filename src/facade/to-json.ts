export interface Jsonable {
  toJSON(options?: { skipErrors?: boolean }): any;
}

export function toJSON(value: Jsonable, options?: { skipErrors?: boolean }): any {
  if (value === null || value === undefined) {
    throw new TypeError('io.toJSON() expects a Jsonable value, received null/undefined');
  }

  const fn = (value as any).toJSON;
  if (typeof fn !== 'function') {
    throw new TypeError('io.toJSON() expects a Jsonable value (object with toJSON())');
  }

  return fn.call(value, options);
}
