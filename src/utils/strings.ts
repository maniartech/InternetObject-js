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

// More precise check for values that would parse as numbers
function looksLikeNumber(str: string): boolean {
  // Empty string is not a number
  if (str.length === 0) return false;

  // Check if it starts like a number (digit, or -/+ followed by digit, or . followed by digit)
  const first = str[0];
  if (first === '-' || first === '+') {
    if (str.length === 1) return false;
    const second = str[1];
    return second >= '0' && second <= '9' || second === '.';
  }
  if (first === '.') {
    if (str.length === 1) return false;
    const second = str[1];
    return second >= '0' && second <= '9';
  }
  // If it starts with a digit, it looks like a number
  return first >= '0' && first <= '9';
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
  // Any string that looks like a number must be quoted
  if (looksLikeNumber(str)) return true;
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
