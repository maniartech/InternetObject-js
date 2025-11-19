const reStructuralChars = /(?<structural>[\{\}\[\]\:\,\#\"\'\\\\~])/;
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

// Regex for IO numbers (JSON compatible + Inf/NaN)
const reNumber = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

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
  if (str.length === 0) return true;
  if (ambiguousValues.has(str)) return true;
  if (reNumber.test(str)) return true;
  if (reDate.test(str)) return true;
  if (reTime.test(str)) return true;
  if (reDateTime.test(str)) return true;
  return false;
}

export const toAutoString = (str: string, escapeLines: boolean, encloser: string='"') => {
  // If it looks like a number, bool, null, or date, quote it to preserve type
  if (isAmbiguous(str)) {
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
