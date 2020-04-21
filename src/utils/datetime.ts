const datetime = {
  date: String.raw`((\d{4})(?:\-((?:1[0-2]|0[1-9]))(?:\-([0-2][0-9]|3[0-1]))?)?)`,
  time: String.raw`(([0-1][0-9]|2[0-3])(?:\:([0-5][0-9])(?:\:([0-5][0-9])(?:\.(\d{3}))?)?)?)`,
  tz: String.raw`((Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:\:[0-5][0-9])?)))`
}

const datetimePlain = {
  date: String.raw`((\d{4})(?:((?:1[0-2]|0[1-9]))(?:([0-2][0-9]|3[0-1]))?)?)`,
  time: String.raw`([0-1][0-9]|2[0-3])(?:([0-5][0-9])(?:([0-5][0-9])(?:\.(\d{3}))?)?)`,
  tz: String.raw`((Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:[0-5][0-9])?)))`
}

const datetimeExp = new RegExp(`^(${datetime.date}T${datetime.time}${datetime.tz})$`)
const dateExp = new RegExp(`^${datetime.date}$`)
const timeExp = new RegExp(`^${datetime.time}$`)

const datetimePlainExp = new RegExp(
  `^(${datetimePlain.date}T${datetimePlain.time}${datetimePlain.tz})$`
)
const datePlainExp = new RegExp(`^${datetimePlain.date}$`)
const timePlainExp = new RegExp(`^${datetimePlain.time}$`)

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted datetime. Returns null when the invalid datetime
 * is found.
 */
export const parseDateTime = (value: string): Date | null => {
  let parsed = datetimeExp.exec(value)
  if (parsed !== null) {
    return new Date(parsed[0])
  }

  const d = datetimePlainExp.exec(value)
  if (d !== null) {
    const dateStr = `${d[3]}-${d[4]}-${d[5]}` + `T${d[6]}:${d[7]}:${d[8]}.${d[9]}Z`

    return new Date(dateStr)
  }

  return null
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted date. Returns null when the invalid date
 * is found.
 */
export const parseDate = (value: string): Date | null => {
  let parsed = dateExp.exec(value)
  if (parsed !== null) {
    return new Date(parsed[0])
  }

  const d = datePlainExp.exec(value)
  // console.warn(d, datePlainExp)
  if (d !== null) {
    const dateStr = `${d[2]}-${d[3] || 1}-${d[4] || 1}`
    return new Date(dateStr)
  }

  return null
}

/**
 * Parses the value string and returns the datetime if the string represents
 * the ISO 8601 formatted time. Returns null when the invalid time
 * is found.
 */
export const parseTime = (value: string): Date | null => {
  let parsed = timeExp.exec(value)
  if (parsed !== null) {
    const dateStr = `1900-01-01T${parsed[2]}:${parsed[3] || '00'}:${parsed[4] ||
      '00'}.${parsed[5] || '000'}`
    return new Date(dateStr)
  }

  const d = timePlainExp.exec(value)
  if (d !== null) {
    const dateStr = `1900-01-01T${d[1]}:${d[2] || '00'}:${d[3] || '00'}.${d[4] || '000'}`
    return new Date(dateStr)
  }

  return null
}

export const datetimeRegExes = {
  datetimeExp,
  datetimePlainExp,
  dateExp,
  datePlainExp,
  timeExp,
  timePlainExp
}
