export const datetimeExp = {
  datetime: /^((\d{4})(?:\-((?:1[0-2]|0[1-9]))(?:\-([0-2][0-9]|3[0-1]))?)?(T([0-1][0-9]|2[0-3])(?:\:([0-5][0-9])(?:\:([0-5][0-9])(?:\.(\d{3}))?)?)?)?((Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:\:[0-5][0-9])?)))?)$/,
  date: /^((\d{4})(?:\-((?:1[0-2]|0[1-9]))(?:\-([0-2][0-9]|3[0-1]))?)?)$/,
  time: /^(([0-1][0-9]|2[0-3])(?:\:([0-5][0-9])(?:\:([0-5][0-9])(?:\.(\d{3}))?)?)?)$/
}

export const datetimePlainExp = {
  datetime: /^((\d{4})(?:((?:1[0-2]|0[1-9]))(?:([0-2][0-9]|3[0-1]))?)?(T([0-1][0-9]|2[0-3])(?:([0-5][0-9])(?:([0-5][0-9])(?:\.(\d{3}))?)?)?)?((Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:[0-5][0-9])?)))?)$/,
  date: /^((\d{4})(?:((?:1[0-2]|0[1-9]))(?:([0-2][0-9]|3[0-1]))?)?)$/,
  time: /^(([0-1][0-9]|2[0-3])(?:([0-5][0-9])(?:([0-5][0-9])(?:\.(\d{3}))?)?)?)$/
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted datetime. Returns null when the invalid datetime
 * is found.
 */
export const parseDateTime = (value: string): Date | null => {
  const exp = /[\-\:]/.test(value) ? datetimeExp.datetime : datetimePlainExp.datetime
  const d = exp.exec(value)
  if (d === null) {
    return null
  }

  // When time signature is not defined, makr the date as utc date
  // otherwise read the utc signature from the value.
  const utc = d[5] === undefined ? 'Z' : d[10] || ''

  const dateStr =
    `${d[2]}-${d[3] || '01'}-${d[4] || '01'}` +
    `T${d[6] || '00'}:${d[7] || '00'}:${d[8] || '00'}.${d[9] || '000'}${utc}`

  return new Date(dateStr)
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted date. Returns null when the invalid date
 * is found.
 */
export const parseDate = (value: string): Date | null => {
  const exp = /\-/.test(value) ? datetimeExp.date : datetimePlainExp.date
  const d = exp.exec(value)
  if (d === null) {
    return null
  }

  const dateStr = `${d[2]}-${d[3] || '01'}-${d[4] || '01'}`
  return new Date(dateStr)
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted time. Returns null when the invalid time
 * is found.
 */
export const parseTime = (value: string): Date | null => {
  const exp = /\:/.test(value) ? datetimeExp.time : datetimePlainExp.time
  const d = exp.exec(value)
  if (d === null) {
    return null
  }

  const dateStr = `1900-01-01T${d[2]}:${d[3] || '00'}:${d[4] || '00'}.${d[5] || '000'}`
  return new Date(dateStr)
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
