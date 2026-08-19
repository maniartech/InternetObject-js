import { toBase64 } from './base64';

/**
 * The IO -> JSON value projection (io-specs `json-compatibility.md`).
 *
 * `toObject()` gives you the data with its values LIVE — a real `Date`, a real `Decimal`, real
 * bytes — which is what you want in code. `toJSON()` gives you the same data as JSON, and JSON has
 * none of those types, so each is spelled the way the conversion table says:
 *
 * | IO value | JSON |
 * | -------- | ---- |
 * | `datetime` / `date` / `time` | ISO-8601 string |
 * | `decimal` | string (a JSON number would drop precision and scale) |
 * | `bigint`  | string (a JSON number would drop precision, and `JSON.stringify` REFUSES a bigint) |
 * | `binary`  | base64 string |
 *
 * Applied RECURSIVELY. Previously `toJSON` was an alias for `toObject`, which converted a value
 * only when it sat at the top level: `doc.toJSON().when` came back a string while
 * `doc.toJSON().events[0].when` came back a live `Date` — the same type, decided by nesting depth.
 * Binary was worse: it reached `Buffer.toJSON()` and emitted `{ type: 'Buffer', data: [...] }`,
 * Node's internal bookkeeping rather than a value any other language would recognise.
 *
 * `NaN` / `Infinity` are left as numbers: JSON cannot hold them and `JSON.stringify` already
 * renders them `null`, which is the behaviour the spec describes.
 */
export function toJSONValue(value: any): any {
  // bigint is not an object, so it has to be caught before the typeof check below.
  if (typeof value === 'bigint') return value.toString();
  if (value === null || typeof value !== 'object') return value;

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return toBase64(value);
  if (Array.isArray(value)) return value.map(toJSONValue);

  // Decimal and friends answer with their own JSON spelling; recurse so whatever they hand back is
  // itself projected.
  if (typeof value.toJSON === 'function') return toJSONValue(value.toJSON());

  const out: Record<string, any> = {};
  for (const key of Object.keys(value)) out[key] = toJSONValue(value[key]);
  return out;
}
