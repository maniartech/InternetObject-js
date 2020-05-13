import 'jest'
import InternetObject from '../../src'
import ASTParser from '../../src/parser/ast-parser'
import ErrorCodes from '../../src/errors/io-error-codes'

import { print } from '../../src/utils/index'
import { parseDateTime, dateToDatetimeString } from '../../src/utils/datetime'

const dt11 = '2020-04-12T08:43:46.619Z'
const dt12 = '2020-04-12T08:43:46'
const dt13 = '2020-04-12T08:43'

const dt21 = '20200412T084346.619Z'
const dt22 = '20200412T084346'
const dt23 = '20200412T0843'

describe('DateTime Parser', () => {
  it('parsers valid datetimes', () => {
    const objStr = String.raw`
    v1:datetime, v2?:datetime, v3?:datetime, v4?:datetime
    ---
    ~ "${dt11}", "${dt12}", "${dt13}"
    ~ ${dt21}, ${dt22}, ${dt23}`

    const [d1, d2] = new InternetObject(objStr).data

    // Validate d1
    expect(d1.v1 instanceof Date).toBeTruthy()
    expect(d1.v2 instanceof Date).toBeTruthy()
    expect(d1.v3 instanceof Date).toBeTruthy()
    expect(d1.v4).toBeUndefined()

    expect(d1.v1.toJSON()).toBe('2020-04-12T08:43:46.619Z')
    expect(d1.v2.getYear()).toBe(2020 - 1900)
    expect(d1.v2.getMonth()).toBe(3)
    expect(d1.v2.getDate()).toBe(12)
    expect(d1.v2.getHours()).toBe(8)
    expect(d1.v2.getMinutes()).toBe(43)
    expect(d1.v2.getSeconds()).toBe(46)

    expect(d1.v3.getYear()).toBe(2020 - 1900)
    expect(d1.v3.getMonth()).toBe(3)
    expect(d1.v3.getDate()).toBe(12)
    expect(d1.v3.getHours()).toBe(8)
    expect(d1.v3.getMinutes()).toBe(43)
    expect(d1.v3.getSeconds()).toBe(0)

    // Validate d2
    expect(d2.v1 instanceof Date).toBeTruthy()
    expect(d2.v2 instanceof Date).toBeTruthy()
    expect(d2.v3 instanceof Date).toBeTruthy()

    expect(d2.v1.toJSON()).toBe('2020-04-12T08:43:46.619Z')
    expect(d2.v2.getYear()).toBe(2020 - 1900)
    expect(d2.v2.getMonth()).toBe(3)
    expect(d2.v2.getDate()).toBe(12)
    expect(d2.v2.getHours()).toBe(8)
    expect(d2.v2.getMinutes()).toBe(43)
    expect(d2.v2.getSeconds()).toBe(46)

    expect(d2.v3.getYear()).toBe(2020 - 1900)
    expect(d2.v3.getMonth()).toBe(3)
    expect(d2.v3.getDate()).toBe(12)
    expect(d2.v3.getHours()).toBe(8)
    expect(d2.v3.getMinutes()).toBe(43)
    expect(d2.v3.getSeconds()).toBe(0)
  })

  it('checks validations and default value', () => {
    const objStr = String.raw`
    v1?:datetime, v2?*:{datetime}, v3?:datetime
    ---
    ~ , "${dt12}"
    ~ ,,
    ~ ,N,
    `

    const { data } = new InternetObject(objStr)

    expect(data[0].v1).toBeUndefined()
    expect(data[0].v2 instanceof Date).toBeTruthy()
    expect(data[0].v3).toBeUndefined()

    expect(data[1].v1).toBeUndefined()
    expect(data[1].v2).toBeUndefined()
    expect(data[1].v3).toBeUndefined()

    expect(data[2].v1).toBeUndefined()
    expect(data[2].v2).toBeNull()
    expect(data[2].v3).toBeUndefined()
  })

  it('throws errors when invalid values are found', () => {
    //
  })
})

describe('DateTime Load', () => {
  it('valid datetime', () => {
    const schema = String.raw`
    v1:datetime, v2:datetime, v3?:datetime, v4*:datetime, v5?:datetime
    `
    const obj = new InternetObject(
      {
        v1: parseDateTime(dt11),
        v2: parseDateTime(dt12),
        v3: parseDateTime(dt13),
        v4: null
      },
      schema
    )

    expect(obj.data.v1.toJSON()).toBe(dt11)
    expect(dateToDatetimeString(obj.data.v2)).toBe('2020-04-12T08:43:46.000')
    expect(dateToDatetimeString(obj.data.v3)).toBe('2020-04-12T08:43:00.000')
    expect(obj.data.v4).toBeNull()
    expect(obj.data.v5).toBeUndefined()
  })

  it('throws an errors when invalid statements are found', () => {
    const schema = String.raw`
    v1:datetime, v2:datetime, v3*:{datetime, default:N}, v4:datetime`

    expect(() => {
      return new InternetObject(',,', schema)
    }).toThrow(ErrorCodes.valueRequired)

    expect(() => {
      return new InternetObject('invalid-date', schema)
    }).toThrow(ErrorCodes.invalidDateTime)

    expect(() => {
      return new InternetObject('2020-12-01, invalid-date', schema)
    }).toThrow(ErrorCodes.invalidDateTime)

    expect(() => {
      return new InternetObject('2020-12-01, 2020-12-01, N', schema)
    }).toThrow(ErrorCodes.valueRequired)
  })
})

describe('DateTime Load', () => {
  it('valid datetimes', () => {
    const schema = String.raw`
    v1:datetime, v2:datetime, v3*:{datetime, default:N}, v4?:datetime`

    const obj = new InternetObject(
      {
        v1: parseDateTime(dt21),
        v2: parseDateTime(dt22),
        v3: null
      },
      schema
    )

    expect(obj.data.v1.toJSON()).toBe(dt11)
    expect(dateToDatetimeString(obj.data.v2)).toBe(dt12 + '.000')
    expect(obj.data.v3).toBeNull()
    expect(obj.data.v4).toBeUndefined()
  })

  it('throws an errors when invalid statements are found', () => {
    const schema = String.raw`
    v1:datetime, v2:datetime, v3*:{datetime, default:N}, v4:datetime`

    expect(() => {
      return new InternetObject({}, schema)
    }).toThrow(ErrorCodes.valueRequired)

    expect(() => {
      return new InternetObject(
        {
          v1: 'invalid-date'
        },
        schema
      )
    }).toThrow(ErrorCodes.invalidDateTime)

    expect(() => {
      return new InternetObject(
        {
          v1: new Date(),
          v2: 'invalid-date'
        },
        schema
      )
    }).toThrow(ErrorCodes.invalidDateTime)

    expect(() => {
      return new InternetObject(
        {
          v1: new Date(),
          v2: new Date(),
          v3: null
        },
        schema
      )
    }).toThrow(ErrorCodes.valueRequired)
  })
})
