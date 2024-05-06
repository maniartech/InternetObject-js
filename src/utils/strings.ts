const reStructuralChars = /(?<structural>[\{\}\[\]\:\,\#\"\'\\\\~])/gm;
const escapeChars = /(?<escape>[\n\r\t])/gm;
const reNewLine = /(?<newlines>(\r\n?)|\n)/gm;

export const toOpenString = (str: string, escapeLines: boolean) => {
  str = str.replace(reStructuralChars, '\\$1');

  if (escapeLines) {
    str = str.replace(reNewLine, '\\n');
  }

  return str;
}

export const toRegularString = (str: string, escapeLines: boolean, encloser: string='"') => {
  str = str.replace(escapeChars, '\\$1');

  if (escapeLines) {
    str = str.replace(reNewLine, '\\n');
  }

  return `${encloser}${str.replace(encloser, `\\${encloser}`)}${encloser}`;
}

export const toRawString = (str: string, encloser: string='"') => {
  return `r${encloser}${str.replace(encloser, encloser + encloser)}${encloser}`;
}

export const toAutoString = (str: string, escapeLines: boolean, encloser: string='"') => {
  // If the string contains any of the structural characters, then return as open string
  if (reStructuralChars.test(str)) {
    return toOpenString(str, escapeLines);
  }

  // If the string contains any of the escape characters, then retrun as raw string
  if (escapeChars.test(str)) {
    return toRawString(str, encloser);
  }

  // Otherwise, return as regular string
  return toRegularString(str, escapeLines, encloser);
}
