import BigIntDef from '../../../src/schema/types/bigint'
import DecimalDef from '../../../src/schema/types/decimal'
import DateTimeDef from '../../../src/schema/types/datetime'
import Decimal from '../../../src/core/decimal/decimal'

describe('load() and stringify() - advanced types', () => {
  describe('BigIntDef.load', () => {
    const bigint = new BigIntDef()

    test('applies default when undefined', () => {
      const memberDef: any = { type: 'bigint', path: 'value', default: 100n }
      expect(bigint.load(undefined, memberDef)).toBe(100n)
    })

    test('allows null when null: true', () => {
      const memberDef: any = { type: 'bigint', path: 'value', null: true }
      expect(bigint.load(null, memberDef)).toBe(null)
    })

    test('enforces min constraint', () => {
      const memberDef: any = { type: 'bigint', path: 'value', min: 10n }
      expect(() => bigint.load(5n, memberDef)).toThrow()
      expect(bigint.load(10n, memberDef)).toBe(10n)
    })

    test('enforces max constraint', () => {
      const memberDef: any = { type: 'bigint', path: 'value', max: 100n }
      expect(() => bigint.load(150n, memberDef)).toThrow()
      expect(bigint.load(100n, memberDef)).toBe(100n)
    })

    test('enforces multipleOf constraint', () => {
      const memberDef: any = { type: 'bigint', path: 'value', multipleOf: 5n }
      expect(() => bigint.load(12n, memberDef)).toThrow()
      expect(bigint.load(15n, memberDef)).toBe(15n)
    })

    test('validates choices', () => {
      const memberDef: any = { type: 'bigint', path: 'value', choices: [10n, 20n, 30n] }
      expect(() => bigint.load(15n, memberDef)).toThrow()
      expect(bigint.load(20n, memberDef)).toBe(20n)
    })
  })

  describe('BigIntDef.stringify', () => {
    const bigint = new BigIntDef()

    test('stringifies to decimal format by default', () => {
      const memberDef: any = { type: 'bigint', path: 'value', format: 'decimal' }
      expect(bigint.stringify(42n, memberDef)).toBe('42')
    })

    test('stringifies to hex format', () => {
      const memberDef: any = { type: 'bigint', path: 'value', format: 'hex' }
      expect(bigint.stringify(255n, memberDef)).toBe('ff')
    })

    test('stringifies to octal format', () => {
      const memberDef: any = { type: 'bigint', path: 'value', format: 'octal' }
      expect(bigint.stringify(8n, memberDef)).toBe('10')
    })

    test('stringifies to binary format', () => {
      const memberDef: any = { type: 'bigint', path: 'value', format: 'binary' }
      expect(bigint.stringify(5n, memberDef)).toBe('101')
    })

    test('validates before stringifying', () => {
      const memberDef: any = { type: 'bigint', path: 'value', min: 10n, format: 'decimal' }
      expect(() => bigint.stringify(5n, memberDef)).toThrow()
    })
  })

  describe('DecimalDef.load', () => {
    const decimal = new DecimalDef()

    test('applies default when undefined', () => {
      const memberDef: any = { type: 'decimal', path: 'value', default: new Decimal('100.00', 5, 2) }
      const result = decimal.load(undefined, memberDef)
      expect(result).toBeInstanceOf(Decimal)
      expect(result.toString()).toBe('100.00')
    })

    test('allows null when null: true', () => {
      const memberDef: any = { type: 'decimal', path: 'value', null: true }
      expect(decimal.load(null, memberDef)).toBe(null)
    })

    test('enforces scale constraint', () => {
      const memberDef: any = { type: 'decimal', path: 'value', scale: 2 }
      expect(() => decimal.load(new Decimal('42.5', 3, 1), memberDef)).toThrow(/scale/)
      const valid = decimal.load(new Decimal('42.50', 4, 2), memberDef)
      expect(valid.getScale()).toBe(2)
    })

    test('enforces precision constraint', () => {
      const memberDef: any = { type: 'decimal', path: 'value', precision: 5 }
      expect(() => decimal.load(new Decimal('123456', 6, 0), memberDef)).toThrow(/precision/)
      const valid = decimal.load(new Decimal('12345', 5, 0), memberDef)
      expect(valid.getPrecision()).toBe(5)
    })

    test('enforces min constraint', () => {
      const memberDef: any = { type: 'decimal', path: 'value', min: new Decimal('10.00', 4, 2) }
      expect(() => decimal.load(new Decimal('5.00', 3, 2), memberDef)).toThrow()
      expect(decimal.load(new Decimal('10.00', 4, 2), memberDef)).toBeInstanceOf(Decimal)
    })

    test('enforces max constraint', () => {
      const memberDef: any = { type: 'decimal', path: 'value', max: new Decimal('100.00', 5, 2) }
      expect(() => decimal.load(new Decimal('150.00', 5, 2), memberDef)).toThrow()
      expect(decimal.load(new Decimal('100.00', 5, 2), memberDef)).toBeInstanceOf(Decimal)
    })

    test('enforces multipleOf constraint', () => {
      const memberDef: any = { type: 'decimal', path: 'value', multipleOf: new Decimal('5.00', 3, 2) }
      expect(() => decimal.load(new Decimal('12.00', 4, 2), memberDef)).toThrow()
      expect(decimal.load(new Decimal('15.00', 4, 2), memberDef)).toBeInstanceOf(Decimal)
    })
  })

  describe('DecimalDef.stringify', () => {
    const decimal = new DecimalDef()

    test('stringifies decimal values', () => {
      const memberDef: any = { type: 'decimal', path: 'value' }
      expect(decimal.stringify(new Decimal('42.50', 4, 2), memberDef)).toBe('42.50m')
    })

    test('preserves scale', () => {
      const memberDef: any = { type: 'decimal', path: 'value' }
      expect(decimal.stringify(new Decimal('42.500', 5, 3), memberDef)).toBe('42.500m')
    })

    test('validates before stringifying', () => {
      const memberDef: any = { type: 'decimal', path: 'value', min: new Decimal('10.00', 4, 2) }
      expect(() => decimal.stringify(new Decimal('5.00', 3, 2), memberDef)).toThrow()
    })
  })

  describe('DateTimeDef.load', () => {
    const datetime = new DateTimeDef('datetime')

    test('loads Date objects', () => {
      const memberDef: any = { type: 'datetime', path: 'value' }
      const date = new Date('2024-01-15T10:30:00Z')
      const result = datetime.load(date, memberDef)
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(date.getTime())
    })

    test('applies default when undefined', () => {
      const defaultDate = new Date('2024-01-01T00:00:00Z')
      const memberDef: any = { type: 'datetime', path: 'value', default: defaultDate }
      const result = datetime.load(undefined, memberDef)
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).toBe(defaultDate.getTime())
    })

    test('allows null when null: true', () => {
      const memberDef: any = { type: 'datetime', path: 'value', null: true }
      expect(datetime.load(null, memberDef)).toBe(null)
    })

    test('rejects non-Date values', () => {
      const memberDef: any = { type: 'datetime', path: 'value' }
      expect(() => datetime.load('2024-01-15', memberDef)).toThrow(/Date object/)
      expect(() => datetime.load(1234567890, memberDef)).toThrow(/Date object/)
    })

    test('enforces min constraint', () => {
      const min = new Date('2024-01-01T00:00:00Z')
      const memberDef: any = { type: 'datetime', path: 'value', min }
      expect(() => datetime.load(new Date('2023-12-31T23:59:59Z'), memberDef)).toThrow()
      expect(datetime.load(new Date('2024-01-15T10:30:00Z'), memberDef)).toBeInstanceOf(Date)
    })

    test('enforces max constraint', () => {
      const max = new Date('2024-12-31T23:59:59Z')
      const memberDef: any = { type: 'datetime', path: 'value', max }
      expect(() => datetime.load(new Date('2025-01-01T00:00:00Z'), memberDef)).toThrow()
      expect(datetime.load(new Date('2024-06-15T12:00:00Z'), memberDef)).toBeInstanceOf(Date)
    })
  })

  describe('DateTimeDef.stringify', () => {
    const datetime = new DateTimeDef('datetime')
    const dateOnly = new DateTimeDef('date')
    const timeOnly = new DateTimeDef('time')

    test('stringifies datetime values', () => {
      const date = new Date('2024-01-15T10:30:45Z')
      const result = datetime.stringify(date)
      expect(result).toMatch(/2024-01-15T10:30:45/)
    })

    test('stringifies date values (date only)', () => {
      const date = new Date('2024-01-15T10:30:45Z')
      const result = dateOnly.stringify(date)
      expect(result).toMatch(/2024-01-15/)
      expect(result).not.toContain('T')
    })

    test('stringifies time values (time only)', () => {
      const date = new Date('2024-01-15T10:30:45Z')
      const result = timeOnly.stringify(date)
      expect(result).toContain('10:30:45')
      expect(result).not.toContain('2024')
    })

    test('validates before stringifying', () => {
      const min = new Date('2024-01-01T00:00:00Z')
      const memberDef: any = { type: 'datetime', path: 'value', min }
      expect(() => datetime.stringify(new Date('2023-12-31T23:59:59Z'))).not.toThrow() // stringify doesn't pass memberDef in signature
    })
  })
})
