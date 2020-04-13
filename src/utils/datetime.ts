const datetime = {
  date: String.raw`((\d{4})(?:\-((?:1[0-2]|0[1-9]))(?:\-([0-2][0-9]|3[0-1]))?)?)`,
  time: String.raw`(([0-1][0-9]|2[0-3])(?:\:([0-5][0-9])(?:\:([0-5][0-9])(?:\.(\d{3}))?)?)?)`,
  tz: String.raw`((Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:\:[0-5][0-9])?)))`
}

const datetimePlain = {
  date: String.raw`((\d{4})(?:((?:1[0-2]|0[1-9]))(?:([0-2][0-9]|3[0-1]))?)?)`,
  time: String.raw`([0-1][0-9]|2[0-3])(?:([0-5][0-9])(?:([0-5][0-9]()(?:\.(\d{3}))?)?)?)`,
  tz: String.raw`((Z)|((?:\+|-)(?:(?:[0-1][0-9]|2[0-3])(?:[0-5][0-9])?)))`
}

const datetimeExp = new RegExp(`^(${datetime.date}T${datetime.time}${datetime.tz})$`)
const dateExp = new RegExp(`^${datetime.date}$`)
const timeExp = new RegExp(`^${datetime.time}$`)

const datetimePlainExp = new RegExp(
  `^(${datetimePlain.date}T${datetimePlain.time}${datetimePlain.tz})$`
)
const datePlainExp = new RegExp(`^${datetime.date}$`)
const timePlainExp = new RegExp(`^${datetime.time}$`)

export const datetimeRegExes = {
  datetimeExp,
  datetimePlainExp,
  dateExp,
  datePlainExp,
  timeExp,
  timePlainExp
}
