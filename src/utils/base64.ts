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

/**
 * Base64-decode to a byte array, the mirror of {@link toBase64}, without assuming a Node Buffer.
 *
 * Node returns a Buffer here rather than a bare Uint8Array. That is deliberate: Buffer IS a
 * Uint8Array subclass, so nothing downstream breaks, and keeping it preserves the exact value
 * Node callers have always received.
 *
 * Callers validate the base64 first (the tokenizer checks it against a regex before decoding), so
 * `atob` is never handed malformed input and the two branches cannot disagree about errors.
 */
export function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64');
  // eslint-disable-next-line no-undef
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
