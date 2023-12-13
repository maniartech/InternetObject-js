
export const datetimeExp = {
  // https://regex101.com/r/v1YLhA/1
  datetime: /^(?<dt>(?<year>\d{4})(?:\-(?<month>(?:1[0-2]|0[1-9]))(?:\-(?<date>[0-2][0-9]|3[0-1]))?)?(T(?<hour>[0-1][0-9]|2[0-3])(?:\:(?<minute>[0-5][0-9])(?:\:(?<sec>[0-5][0-9])(?:\.(?<milisecond>(?:\d{3})+))?)?)?)?(?<tz>(Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:\:[0-5][0-9])?)))?)/,

  // https://regex101.com/r/fDYSLf/1
  time: /T(?<hour>[0-1][0-9]|2[0-3])(?:\:(?<minute>[0-5][0-9])(?:\:(?<second>[0-5][0-9])(?:\.(?<milisecond>(?:\d{3})+))?)?)?/
}

export const datetimePlainExp = {
  // https://regex101.com/r/0j7nlS/3
  datetime: /^(?<year>\d{4})(?:(?<month>(?:1[0-2]|0[1-9]))(?:(?<date>[0-2][0-9]|3[0-1]))?)?(?:(?<hour>[0-1][0-9]|2[0-3])(?:(?<minute>[0-5][0-9])(?:(?<second>[0-5][0-9])(?:(?<milisecond>(?:\d{3})+))?)?)?)?(?<tz>(Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:[0-5][0-9])?)))?/,

  // https://regex101.com/r/X5AA4A/2
  time: /^T(?<hour>[0-1][0-9]|2[0-3])(?:(?<minute>[0-5][0-9])(?:(?<second>[0-5][0-9])(?:(?<milisecond>(?:\d{3})+))?)?)?/
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted datetime. Returns null when the invalid datetime
 * is found.
 */
export const parseDateTime = (value: string): Date | null => {
  // https://regex101.com/r/P7DNUL/2
  const match = /^(?<dt>(?<year>\d{4})(?:\-(?<month>(?:1[0-2]|0[1-9]))(?:\-(?<date>[0-2][0-9]|3[0-1]))?)?(T(?<hour>[0-1][0-9]|2[0-3])(?:\:(?<minute>[0-5][0-9])(?:\:(?<second>[0-5][0-9])(?:\.(?<milisecond>(\d{3})+))?)?)?)?(?<tz>(Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:\:[0-5][0-9])?)))?)|(?<tm>T(?<hour2>[0-1][0-9]|2[0-3])(?:\:(?<minute2>[0-5][0-9])(?:\:(?<second2>[0-5][0-9])(?:\.(?<milisecond2>(\d{3})+))?)?)?)$/gm.exec(value);

  if (!match) {
    console.error('Invalid date/time format:', value);
    return null;
  }

  const { year, month, date, hour, minute, second, milisecond, tz, hour2, minute2, second2, milisecond2 } = match.groups || {};

  if (year) {
    const utc = tz === 'Z' ? 'Z' : tz || '';
    const dateStr = `${year}-${month || '01'}-${date || '01'}T${hour || '00'}:${minute || '00'}:${second || '00'}.${milisecond || '000'}${utc}`;

    return new Date(dateStr);
  }

  if (hour2) {
    const dateStr = `1900-01-01T${hour2 || '00'}:${minute2 || '00'}:${second2 || '00'}.${milisecond2 || '000'}`;

    return new Date(dateStr);
  }

  console.error('Invalid date/time format - missing year:', value);
  return null;
}
// export const parseDateTime = (value: string): Date | null => {
//   const exp = /[\-\:]/.test(value) ? datetimeExp.datetime : datetimePlainExp.datetime;
//   const match = exp.exec(value);

//   if (!match) {
//     console.error('Invalid datetime format:', value);
//     return null;
//   }

//   const { year, month, date, hour, minute, second, milisecond, tz } = match.groups || {};

//   if (!year) {
//     console.error('Year is required in datetime format:', value);
//     return null;
//   }

//   const utc = tz === 'Z' ? 'Z' : tz || '';
//   const dateStr = `${year}-${month || '01'}-${date || '01'}T${hour || '00'}:${minute || '00'}:${second || '00'}.${milisecond || '000'}${utc}`;

//   return new Date(dateStr);
// }

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted date. Returns null when the invalid date
 * is found.
 */
export const parseDate = (value: string): Date | null => {
  const exp = /\-/.test(value) ? datetimeExp.date : datetimePlainExp.date;
  const match = exp.exec(value);

  if (!match) {
    console.error('Invalid date format:', value);
    return null;
  }

  const { year, month, date } = match.groups || {};

  if (!year) {
    console.error('Year is required in date format:', value);
    return null;
  }

  const dateStr = `${year}-${month || '01'}-${date || '01'}`;
  return new Date(dateStr);
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted time. Returns null when the invalid time
 * is found.
 */
export const parseTime = (value: string): Date | null => {
  const exp = /\:/.test(value) ? datetimeExp.time : datetimePlainExp.time;
  const match = exp.exec(value);

  if (!match) {
    console.error('Invalid time format:', value);
    return null;
  }

  const { hour, minute, second, milisecond } = match.groups || {};

  const dateStr = `1900-01-01T${hour || '00'}:${minute || '00'}:${second || '00'}.${milisecond || '000'}`;
  return new Date(dateStr);
}

export const dateToDatetimeString = (date: Date | null, noSep = false, zuluTime = false) => {
  if (date === null) return null

  if (zuluTime) {
    if (noSep) return date.toJSON().replace(/[\:\-]/g, '')
    return date.toJSON()
  }

  const Y = date.getFullYear()
  const M = _(date.getMonth() + 1)
  const D = _(date.getDate())
  const h = _(date.getHours())
  const m = _(date.getMinutes())
  const s = _(date.getSeconds())
  const ms = _(date.getMilliseconds(), 3)

  if (noSep) return `${Y}${M}${D}T${h}${m}${s}.${ms}`

  return `${Y}-${M}-${D}T${h}:${m}:${s}.${ms}`
}

export const dateToDateString = (date: Date | null, noSep = false) => {
  if (date === null) return null

  const Y = date.getFullYear()
  const M = _(date.getMonth() + 1)
  const D = _(date.getDate())

  if (noSep) return `${Y}${M}${D}`
  return `${Y}-${M}-${D}`
}

export const dateToTimeString = (date: Date | null, noSep = false) => {
  if (date === null) return null

  const h = _(date.getHours())
  const m = _(date.getMinutes())
  const s = _(date.getSeconds())
  const ms = _(date.getMilliseconds(), 3)

  if (noSep) return `${h}${m}${s}.${ms}`
  return `${h}:${m}:${s}.${ms}`
}

const _ = (n: number, pad: number = 2) => {
  return n.toLocaleString('en-US', { minimumIntegerDigits: pad, useGrouping: false })
}
