/**
 * Base64 helpers, kept free of any Node-only dependency so they work in a browser build too.
 *
 * Lives in `utils` rather than beside the formatter because both the serializer and the value
 * model need it: IO writes a byte array as `b"<base64>"`, and per io-specs `json-compatibility.md`
 * a `binary` value projects to JSON as a base64 **string**.
 */

/** Base64-encode a byte array without assuming a Node Buffer is available. */
export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  // eslint-disable-next-line no-undef
  return btoa(bin);
}
