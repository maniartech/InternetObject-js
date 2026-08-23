export const datetimeExp = {
  // https://regex101.com/r/v1YLhA/2
  datetime: /^(?<dt>(?<year>\d{4})(?:\-(?<month>(?:1[0-2]|0[1-9]))(?:\-(?<date>[0-2][0-9]|3[0-1]))?)?(T(?<hour>[0-1][0-9]|2[0-3])(?:\:(?<minute>[0-5][0-9])(?:\:(?<second>[0-5][0-9])(?:\.(?<milisecond>(?:\d{3})+))?)?)?)?(?<tz>(Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:\:[0-5][0-9])?)))?)$/,

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
 * Is this a real day in the calendar?
 *
 * The regexes above check the SHAPE of each field — month 01..12, day 00..31 — which is a
 * lexical range and not a calendar. Everything they let through was handed straight to
 * `new Date()`, which does not reject an impossible date: it ROLLS OVER. So `d"2024-04-31"`
 * loaded as 2024-05-01 and `d"2023-02-29"` as 2023-03-01, silently, with no diagnostic. The
 * document said one date and the value model held another.
 *
 * That is the worst failure mode this format has — data changed with nothing raised — and it is
 * a guaranteed divergence for a port, because Go's `time.Parse` and Python's `datetime` both
 * REJECT April 31 rather than moving it. The specification requires it too: "the content between
 * the quotes must be valid for its kind".
 *
 * The check is done on the date FIELDS rather than on the constructed Date, because a timezone
 * offset legitimately shifts the UTC day: `dt"2024-03-20T01:00:00+05:30"` is 2024-03-19 in UTC
 * and is perfectly valid. Comparing the built Date's UTC components against the written ones
 * would reject it.
 */
const isLeapYear = (year: number): boolean =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const isRealCalendarDate = (year?: string, month?: string, day?: string): boolean => {
  // An absent month or day defaults to 01, which is always valid.
  if (month === undefined || day === undefined) return true;

  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1) return false;                       // the regex admits day 00, which is no day at all

  const limit = m === 2 && isLeapYear(y) ? 29 : DAYS_IN_MONTH[m - 1];
  return d <= limit;
};

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

  if (!isRealCalendarDate(year, month, date)) {
    return null;
  }

  const utc = tz ? tz : 'Z';
  const dateStr = `${year}-${month || '01'}-${date || '01'}T${hour || '00'}:${minute || '00'}:${second || '00'}.${milisecond || '000'}${utc}`;

  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  if (!isRealCalendarDate(year, month, date)) {
    return null;
  }

  const dateStr = `${year}-${month || '01'}-${date || '01'}T00:00:00.000Z`;

  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  const parsed = new Date(dateStr);
  // No calendar part to check — the date is fixed — but an Invalid Date must never be returned
  // as a value: it serializes to nothing and compares equal to nothing, including itself.
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

/**
 * Infer which temporal literal best spells a bare `Date`.
 *
 * The value model keeps one `Date` for all three temporal types, so a value written WITHOUT a
 * schema has no declared kind to fall back on. Per io-specs `serialization/value-formatting.md`,
 * a writer then infers "only what the value evidences":
 *
 * - the **1900-01-01** date component is the sentinel `parseTime` assigns to a time-only value
 *   → `time`
 * - an all-zero time component carries no time of day → `date`
 * - anything else → `datetime`
 *
 * This is value-preserving in every case: each inferred literal re-parses to the very same
 * instant, so only the spelling — never the value — can differ from the input text. A schema
 * always wins over this; it is consulted only when there is none.
 */
export const inferDateTimeKind = (date: Date): "datetime" | "date" | "time" => {
  // Time-only sentinel first: 1900-01-01T00:00:00 is a `time`, not a midnight `date`.
  if (date.getUTCFullYear() === 1900 && date.getUTCMonth() === 0 && date.getUTCDate() === 1) {
    return "time"
  }

  if (
    date.getUTCHours() === 0 && date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
  ) {
    return "date"
  }

  return "datetime"
}

export const dateToIOString = (date: Date | null, type: "datetime" | "date" | "time", noSep = false) => {
  if (date === null) return "N"

  switch (type) {
    case "datetime":
      return `dt"${dateToDatetimeString(date, noSep)}"`
    case "date":
      return `d"${dateToDateString(date, noSep)}"`
    case "time":
      return `t"${dateToTimeString(date, noSep)}"`
  }
}