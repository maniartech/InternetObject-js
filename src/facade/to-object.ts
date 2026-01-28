export interface Jsonable {
  toJSON(options?: { skipErrors?: boolean }): any;
  toObject?(options?: { skipErrors?: boolean }): any;
}

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

export const toJSON = toObject;
