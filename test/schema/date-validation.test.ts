import 'jest'
import InternetObject from '../../src'
import ErrorCodes from '../../src/errors/io-error-codes'

import { parseDate } from '../../src/utils/datetime'

const dt11 = '2020-04-12'
const dt12 = '2020-04'
const dt13 = '2020'

const dt21 = '20200412'
const dt22 = '202004'
const dt23 = '2020'

describe('DateTime Parser', () => {
  it('parsers valid dates', () => {
    const objStr = String.raw`
    v1:date, v2?:date, v3?:date, v4?:date
    ---
    ~ "${dt11}", "${dt12}", "${dt13}"
    ~ ${dt21}, ${dt22}, ${dt23}`

    const [d1, d2] = new InternetObject(objStr).data

    // Validate d1
    expect(d1.v1 instanceof Date).toBeTruthy()
    expect(d1.v2 instanceof Date).toBeTruthy()
    expect(d1.v3 instanceof Date).toBeTruthy()
    expect(d1.v4).toBeUndefined()

    expect(d1.v1.toJSON()).toBe('2020-04-12T00:00:00.000Z')
    expect(d1.v2.toJSON()).toBe('2020-04-01T00:00:00.000Z')
    expect(d1.v3.toJSON()).toBe('2020-01-01T00:00:00.000Z')

    // Validate d2
    expect(d2.v1 instanceof Date).toBeTruthy()
    expect(d2.v2 instanceof Date).toBeTruthy()
    expect(d2.v3 instanceof Date).toBeTruthy()

    expect(d2.v1.toJSON()).toBe('2020-04-12T00:00:00.000Z')
    expect(d2.v2.toJSON()).toBe('2020-04-01T00:00:00.000Z')
    expect(d2.v3.toJSON()).toBe('2020-01-01T00:00:00.000Z')
  })

  it('checks validations and default value', () => {
    const objStr = String.raw`
    v1?:date, v2?*:{date}, v3?:date
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
  it('valid date', () => {
    const schema = String.raw`
    v1:date, v2:date, v3?:date, v4*:date, v5?:date
    `
    const obj = new InternetObject(
      {
        v1: parseDate(dt11),
        v2: parseDate(dt12),
        v3: parseDate(dt13),
        v4: null
      },
      schema
    )

    expect(obj.data.v1.toJSON()).toBe('2020-04-12T00:00:00.000Z')
    expect(obj.data.v2.toJSON()).toBe('2020-04-01T00:00:00.000Z')
    expect(obj.data.v3.toJSON()).toBe('2020-01-01T00:00:00.000Z')
    expect(obj.data.v4).toBeNull()
    expect(obj.data.v5).toBeUndefined()
  })

  it('throws an errors when invalid statements are found', () => {
    const schema = String.raw`
    v1:date, v2:date, v3*:{date, default:N}, v4:date`

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
  it('valid dates', () => {
    const schema = String.raw`
    v1:date, v2:date, v3*:{date, default:N}, v4?:date`

    const obj = new InternetObject(
      {
        v1: parseDate(dt21),
        v2: parseDate(dt22),
        v3: null
      },
      schema
    )

    expect(obj.data.v1.toJSON()).toBe('2020-04-12T00:00:00.000Z')
    expect(obj.data.v2.toJSON()).toBe('2020-04-01T00:00:00.000Z')
    expect(obj.data.v3).toBeNull()
    expect(obj.data.v4).toBeUndefined()
  })

  it('throws an errors when invalid statements are found', () => {
    const schema = String.raw`
    v1:date, v2:date, v3*:{date, default:N}, v4:date`

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
