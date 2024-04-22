export const datetimeExp = {
  // https://regex101.com/r/v1YLhA/2
  datetime: /^(?<dt>(?<year>\d{4})(?:\-(?<month>(?:1[0-2]|0[1-9]))(?:\-(?<date>[0-2][0-9]|3[0-1]))?)?(T(?<hour>[0-1][0-9]|2[0-3])(?:\:(?<minute>[0-5][0-9])(?:\:(?<sec>[0-5][0-9])(?:\.(?<milisecond>(?:\d{3})+))?)?)?)?(?<tz>(Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:\:[0-5][0-9])?)))?)$/,

  // https://regex101.com/r/yXu5MC/2
  date: /^(?<year>\d{4})(?:\-(?<month>(?:1[0-2]|0[1-9]))(?:\-(?<date>[0-2][0-9]|3[0-1]))?)?$/,

  // https://regex101.com/r/hbiNMv/4
  time: /^(?<hour>[0-1][0-9]|2[0-3])(?:\:(?<minute>[0-5][0-9])(?:\:(?<second>[0-5][0-9])(?:\.(?<milisecond>(?:\d{3})+))?)?)?$/
}

export const datetimePlainExp = {
  // https://regex101.com/r/0j7nlS/3
  // Note: Since this expression starts with ^ and does not end with $, it will
  // ignore any characters after the valid datetime format.
  // Unlike regular datetime expressions, this won't complain about the invalid
  // datetime format if the expression finds invalid characters after the
  // valid datetime format. For example, 20200101000000000Zabc will be
  // considered as a valid datetime format with 'abc' ignored.
  // This is required because, putting $ at the end of the expression will
  // cause it to pick up invalid groups from the datetime string.
  datetime: /^(?<year>\d{4})(?:(?<month>(?:1[0-2]|0[1-9]))(?:(?<date>[0-2][0-9]|3[0-1]))?)?(?:(?<hour>[0-1][0-9]|2[0-3])(?:(?<minute>[0-5][0-9])(?:(?<second>[0-5][0-9])(?:(?<milisecond>(?:\d{3})+))?)?)?)?(?<tz>(Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:[0-5][0-9])?)))?/,

  // https://regex101.com/r/VDkmzU/2
  date: /^(?<year>\d{4})(?:(?<month>(?:1[0-2]|0[1-9]))(?:(?<date>[0-2][0-9]|3[0-1]))?)?$/,

  // https://regex101.com/r/X5AA4A/3
  time: /^(?<hour>[0-1][0-9]|2[0-3])(?:(?<minute>[0-5][0-9])(?:(?<second>[0-5][0-9])(?:(?<milisecond>(?:\d{3})+))?)?)?$/
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted datetime. Returns null when the invalid datetime
 * is found.
 */
export const parseDateTime = (value: string): Date | null => {

  // If the first 6 characters contain '-', it is regular datetime format.
  // Otherwise, it is plain datetime format (no separator)
  const exp = /[\-\:]/.test(value.substring(0, 6)) ? datetimeExp.datetime : datetimePlainExp.datetime;

  const match = exp.exec(value);

  if (!match) {
    return null;
  }

  const {
    year, month, date,
    hour, minute, second, milisecond, tz
  } = match.groups || {};

  const utc = tz ? tz : 'Z';
  const dateStr = `${year}-${month || '01'}-${date || '01'}T${hour || '00'}:${minute || '00'}:${second || '00'}.${milisecond || '000'}${utc}`;

  return new Date(dateStr);
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted date. Returns null when the invalid date
 * is found.
 */
export const parseDate = (value: string): Date | null => {
  const exp = /\-/.test(value.substring(0, 5)) ? datetimeExp.date : datetimePlainExp.date;
  const match = exp.exec(value);

  if (!match) {
    return null;
  }

  const { year, month, date } = match.groups || {};
  const dateStr = `${year}-${month || '01'}-${date || '01'}T00:00:00.000Z`;

  return new Date(dateStr);
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted time. Returns null when the invalid time
 * is found.
 */
export const parseTime = (value: string): Date | null => {
  const exp = /\:/.test(value.substring(0,3)) ? datetimeExp.time : datetimePlainExp.time;
  const match = exp.exec(value);

  if (!match) {
    return null;
  }

  const { hour, minute, second, milisecond } = match.groups || {};

  const dateStr = `1900-01-01T${hour || '00'}:${minute || '00'}:${second || '00'}.${milisecond ? milisecond : '000'}Z`;
  return new Date(dateStr);
}

export const dateToDatetimeString = (date: Date | null, noSep = false, zuluTime = false) => {
  if (date === null) return null
  return date.toISOString()
}

export const dateToDateString = (date: Date | null, noSep = false) => {
  if (date === null) return null

  // Convert the date to iso string and return the date part
  return date.toISOString().split('T')[0]
}

export const dateToTimeString = (date: Date | null, noSep = false) => {
  if (date === null) return null

  // Convert the date to iso string and return the time part
  // without the timezone
  return date.toISOString().split('T')[1].split('.')[0]
}

const _ = (n: number, pad: number = 2) => {
  return n.toLocaleString('en-US', { minimumIntegerDigits: pad, useGrouping: false })
}

export const dateToSmartString = (date: Date | null, type: "datetime" | "date" | "time", noSep = false) => {
  if (date === null) return null

  switch (type) {
    case "datetime":
      return dateToDatetimeString(date, noSep)
    case "date":
      return dateToDateString(date, noSep)
    case "time":
      return dateToTimeString(date, noSep)
  }
}