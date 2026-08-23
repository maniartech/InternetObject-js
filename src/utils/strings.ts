const reStructuralChars = /(?<structural>[\{\}\[\]\:\#\"\'\\\\~])/;
const reRequiresQuoting = /[\,]/;  // Characters that require quoting, not escaping
const escapeChars = /(?<escape>[\n\r\t])/;
const reNewLine = /(?<newlines>(\r\n?)|\n)/g;

export const toOpenString = (str: string, escapeLines: boolean) => {
  str = str.replace(new RegExp(reStructuralChars, 'g'), '\\$1');

  if (escapeLines) {
    str = str.replace(reNewLine, '\\n');
  }

  return str;
}

export const toRegularString = (str: string, escapeLines: boolean, encloser: string='"') => {
  // The BACKSLASH is escaped first, before any escape sequence is introduced below -- otherwise a
  // literal \ in the data is written raw and the reader consumes it as the start of an escape:
  // "9\U" was read back as "9U". Open strings already escaped it (it is in reStructuralChars);
  // only the quoted form did not, so the loss showed up exactly when a string needed quoting for
  // some OTHER reason -- looking like a number, holding a comma.
  str = str.replace(/\\/g, '\\\\');
  str = str.replace(new RegExp(escapeChars, 'g'), '\\$1');

  if (escapeLines) {
    str = str.replace(reNewLine, '\\n');
  }

  return `${encloser}${str.replace(new RegExp(encloser, 'g'), `\\${encloser}`)}${encloser}`;
}

export const toRawString = (str: string, encloser: string='"') => {
  return `r${encloser}${str.replace(new RegExp(encloser, 'g'), encloser + encloser)}${encloser}`;
}

// Regex to detect ANY string that looks like a number when parsed
// This includes:
// - Pure digits: "123", "0001", "5001"
// - Negative numbers: "-123"
// - Decimals: "3.14", ".5", "123."
// - Scientific notation: "1e10", "1E-5"
// - Special numeric values that IO parser recognizes
// All of these MUST be quoted to preserve string type
const reNumericLooking = /^-?\.?\d/;  // Starts with optional minus, optional dot, then digit

/**
 * Would this text, written WITHOUT quotes, read back as something other than this string?
 *
 * This is the serializer's half of the reader's two rules (io-specs, Number → "A number, or a
 * word that begins with a digit?"). Quoting exists to protect the VALUE, so it is needed in exactly
 * two cases:
 *
 *   RULE 1  the whole run is a valid number  → it would read back as a NUMBER
 *   RULE 2  the run carries a marker         → it would read back as an ERROR
 *
 * Anything else beginning with a digit reads back as itself. This used to quote EVERY string
 * starting with a digit — safe, but wrong for a format whose selling point is lean output:
 * `013ABSD`, `12mm`, `3pm`, `1.2.3` and `10.0.0.1` are ordinary text and now travel as such.
 *
 * Exported because it is the ONLY copy. There were two, and the serializer used the other one:
 * `string-formatter.needsQuoting` had its own duplicate of this logic, was never imported by any
 * source file, and had a test suite of its own — so those tests asserted quoting behaviour that
 * nothing in the serializer actually ran.
 */
export function readsBackAsANumber(str: string): boolean {
  if (str.length === 0) return false;

  // RULE 2, the base prefixes. `0x`/`0o`/`0b` can only mean "a number in this base", so the bare
  // text is either a number (`0xFF`) or an error (`0x123FG`) — never this string.
  if (/^[+-]?0[xXoObB]/.test(str)) return true;

  // RULE 2, the type suffixes. `m`/`n` on an otherwise numeric run claims decimal or bigint. The
  // guard is that everything before it is digits and dots, so `12mm` and `5em` carry other letters,
  // claim nothing, and stay bare.
  if (/^[+-]?[0-9.]+[mn]$/.test(str)) return true;

  // RULE 1. A COMPLETE number literal would read back as a number rather than as text. Anchored on
  // purpose: `1.2.3` and `1e` are not complete numbers, so they are not quoted.
  return /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(str);
}

// Regex for Date/Time/DateTime
const reDate = /^\d{4}-\d{2}-\d{2}$/;
const reTime = /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
const reDateTime = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

const ambiguousValues = new Set([
  'null', 'N',
  'true', 'T',
  'false', 'F',
  'Inf', '+Inf', '-Inf', 'NaN',
  'undefined'
]);

function isAmbiguous(str: string): boolean {
  if (str === null || str === undefined) return true;
  if (str.length === 0) return true;
  if (ambiguousValues.has(str)) return true;
  // Leading/trailing whitespace is trimmed when an open string is re-parsed — quote to keep it.
  if (str.trim() !== str) return true;
  // `---` is the section separator: the tokenizer splits on it even mid-value, so an open
  // string containing it would tear the document in half on re-parse.
  if (str.includes('---')) return true;
  // Would it read back as a number, or as an error? Either way, quote it.
  if (readsBackAsANumber(str)) return true;
  if (reDate.test(str)) return true;
  if (reTime.test(str)) return true;
  if (reDateTime.test(str)) return true;
  return false;
}

export const toAutoString = (str: string, escapeLines: boolean, encloser: string='"') => {
  // Handle null/undefined
  if (str === null || str === undefined) {
    return '""';  // Empty string representation
  }

  // If it looks like a number, bool, null, or date, quote it to preserve type
  if (isAmbiguous(str)) {
    return toRegularString(str, escapeLines, encloser);
  }

  // If the string contains comma, it MUST be quoted (not escaped) to avoid parsing issues
  if (reRequiresQuoting.test(str)) {
    return toRegularString(str, escapeLines, encloser);
  }

  // If the string contains any of the structural characters, then return as open string
  if (reStructuralChars.test(str)) {
    return toOpenString(str, escapeLines);
  }

  // If the string contains any of the escape characters, then retrun as raw string
  if (escapeChars.test(str)) {
    return toRawString(str, encloser);
  }

  // Otherwise, return as open string (it was regular string before)
  return toOpenString(str, escapeLines);
}
