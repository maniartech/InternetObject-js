import { parse } from '../../../src'

describe('DateTimeDef - DateTime, Date, and Time Types', () => {
  describe('DateTime type', () => {
    test('should accept ISO 8601 datetime with separators', () => {
      expect(() => parse('dt: datetime\n---\ndt"2024-01-15T10:30:45"', null)).not.toThrow()
      expect(() => parse('dt: datetime\n---\ndt"2024-12-31T23:59:59.999"', null)).not.toThrow()
    })

    test('should accept datetime without separators', () => {
      expect(() => parse('dt: datetime\n---\ndt"20240115T103045"', null)).not.toThrow()
      expect(() => parse('dt: datetime\n---\ndt"20241231T235959.999"', null)).not.toThrow()
    })

    test('should accept datetime with timezone', () => {
      expect(() => parse('dt: datetime\n---\ndt"2024-01-15T10:30:45Z"', null)).not.toThrow()
      expect(() => parse('dt: datetime\n---\ndt"2024-01-15T10:30:45+05:30"', null)).not.toThrow()
      expect(() => parse('dt: datetime\n---\ndt"2024-01-15T10:30:45-08:00"', null)).not.toThrow()
    })

    test('should accept partial datetime (date only)', () => {
      expect(() => parse('dt: datetime\n---\ndt"2024-01-15"', null)).not.toThrow()
      expect(() => parse('dt: datetime\n---\ndt"2024-01"', null)).not.toThrow()
      expect(() => parse('dt: datetime\n---\ndt"2024"', null)).not.toThrow()
    })

    test('should reject invalid datetime format', () => {
      expect(() => parse('dt: datetime\n---\n"2024-13-01T10:30:45"', null)).toThrow() // invalid month
      expect(() => parse('dt: datetime\n---\n"not-a-date"', null)).toThrow()
    })
  })

  describe('Date type', () => {
    test('should accept ISO 8601 date with separators', () => {
      expect(() => parse('d: date\n---\nd"2024-01-15"', null)).not.toThrow()
      expect(() => parse('d: date\n---\nd"2024-12-31"', null)).not.toThrow()
    })

    test('should accept date without separators', () => {
      expect(() => parse('d: date\n---\nd"20240115"', null)).not.toThrow()
      expect(() => parse('d: date\n---\nd"20241231"', null)).not.toThrow()
    })

    test('should accept partial dates', () => {
      expect(() => parse('d: date\n---\nd"2024-01"', null)).not.toThrow()
      expect(() => parse('d: date\n---\nd"2024"', null)).not.toThrow()
    })

    test('should accept year-only dates', () => {
      expect(() => parse('d: date\n---\nd"2024"', null)).not.toThrow()
      expect(() => parse('d: date\n---\nd"1990"', null)).not.toThrow()
    })
  })

  describe('Time type', () => {
    test('should accept time with separators', () => {
      expect(() => parse('t: time\n---\nt"10:30:45"', null)).not.toThrow()
      expect(() => parse('t: time\n---\nt"23:59:59"', null)).not.toThrow()
    })

    test('should accept time without separators', () => {
      expect(() => parse('t: time\n---\nt"103045"', null)).not.toThrow()
      expect(() => parse('t: time\n---\nt"235959"', null)).not.toThrow()
    })

    test('should accept time with milliseconds', () => {
      expect(() => parse('t: time\n---\nt"10:30:45.123"', null)).not.toThrow()
      expect(() => parse('t: time\n---\nt"103045999"', null)).not.toThrow()
    })

    test('should accept partial time', () => {
      expect(() => parse('t: time\n---\nt"10:30"', null)).not.toThrow()
      expect(() => parse('t: time\n---\nt"10"', null)).not.toThrow()
    })
  })

  describe('Min/Max constraints', () => {
    test('should respect min constraint for datetime', () => {
      const schema = 'dt: { datetime, min: dt"2024-01-01T00:00:00" }'

      expect(() => parse(`${schema}\n---\ndt"2024-01-01T00:00:00"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\ndt"2024-06-15T12:00:00"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\ndt"2023-12-31T23:59:59"`, null)).toThrow(/range/i)
    })

    test('should respect max constraint for datetime', () => {
      const schema = 'dt: { datetime, max: dt"2024-12-31T23:59:59" }'

      expect(() => parse(`${schema}\n---\ndt"2024-12-31T23:59:59"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\ndt"2024-06-15T12:00:00"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\ndt"2025-01-01T00:00:00"`, null)).toThrow(/range/i)
    })

    test('should respect both min and max constraints', () => {
      const schema = 'dt: { datetime, min: dt"2024-01-01", max: dt"2024-12-31" }'

      expect(() => parse(`${schema}\n---\ndt"2024-06-15"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\ndt"2023-12-31"`, null)).toThrow(/range/i)
      expect(() => parse(`${schema}\n---\ndt"2025-01-01"`, null)).toThrow(/range/i)
    })

    test('should respect min constraint for date', () => {
      const schema = 'd: { date, min: d"2024-01-01" }'

      expect(() => parse(`${schema}\n---\nd"2024-01-01"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nd"2024-06-15"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nd"2023-12-31"`, null)).toThrow(/range/i)
    })

    test('should respect max constraint for date', () => {
      const schema = 'd: { date, max: d"2024-12-31" }'

      expect(() => parse(`${schema}\n---\nd"2024-12-31"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nd"2024-06-15"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nd"2025-01-01"`, null)).toThrow(/range/i)
    })
  })

  describe('Optional and null', () => {
    test('should allow optional datetime', () => {
      const schema = 'dt?: datetime'
      expect(() => parse(`${schema}\n---\n~`, null)).not.toThrow()
    })

    test('should allow null when specified', () => {
      const schema = 'dt*: datetime'
      const result = parse(`${schema}\n---\nN`, null).toJSON()
      expect(result.dt).toBeNull()
    })

    test('should reject null when not allowed', () => {
      const schema = 'dt: datetime'
      expect(() => parse(`${schema}\n---\nN`, null)).toThrow(/null/i)
    })
  })

  describe('Multiple datetime fields', () => {
    test('should validate each field independently', () => {
      const schema = 'created: datetime, updated: datetime, birthdate: date'
      const data = `${schema}\n---\ndt"2024-01-01T10:00:00", dt"2024-06-15T15:30:00", d"1990-05-20"`

      expect(() => parse(data, null)).not.toThrow()
    })

    test('should report errors for the correct field', () => {
      const schema = 'a: datetime, b: date, c: time'

      expect(() => parse(`${schema}\n---\ndt"2024-01-01", "invalid", t"10:00:00"`, null)).toThrow() // b is invalid
    })
  })

  describe('Edge cases', () => {
    test('should handle datetime in objects', () => {
      const schema = 'event: { name: string, date: datetime }'
      const doc = parse(`${schema}\n---\n{{Meeting, dt"2024-06-15T10:00:00"}}`, null)
      const section = doc.sections?.get(0)
      const data = section?.data as any
      const event = data.event

      expect(event.name).toBe('Meeting')
      expect(event.date).toBeInstanceOf(Date)

      // Also verify serialization
      const jsonResult = doc.toJSON()
      expect(jsonResult.event.date).toBe('2024-06-15T10:00:00.000Z')
    })

    test('should handle datetime in arrays', () => {
      const schema = 'dates: [datetime]'
      const result = parse(`${schema}\n---\n[dt"2024-01-01", dt"2024-06-15", dt"2024-12-31"]`, null).toJSON()

      expect(result.dates).toHaveLength(3)
      expect(result.dates[0]).toBeInstanceOf(Date)
    })

    test('should handle boundary dates', () => {
      expect(() => parse('d: date\n---\nd"1583-01-01"', null)).not.toThrow()
      expect(() => parse('d: date\n---\nd"9999-12-31"', null)).not.toThrow()
    })
  })

  describe('Choices', () => {
    test('should accept value from choices', () => {
      const schema = 'dt: { datetime, choices: [dt"2024-01-01", dt"2024-06-15", dt"2024-12-31"] }'

      expect(() => parse(`${schema}\n---\ndt"2024-01-01"`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\ndt"2024-06-15"`, null)).not.toThrow()
    })

    test('should reject value not in choices', () => {
      const schema = 'dt: { datetime, choices: [dt"2024-01-01", dt"2024-06-15"] }'

      expect(() => parse(`${schema}\n---\ndt"2024-12-31"`, null)).toThrow(/must be one of/i)
    })
  })
})
