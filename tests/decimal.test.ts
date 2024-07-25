import { Decimal } from '../src/core/decimal';


describe('Decimal', () => {
  test('constructor initializes with valid values', () => {
    const decimal = new Decimal(12345, 2, 10, 2);
    expect(decimal.toString()).toBe('1234500');
  });

  test('constructor throws error for invalid precision and scale', () => {
    expect(() => new Decimal(12345, 2, 66, 2)).toThrow('Precision (M) must be between 1 and 65.');
    expect(() => new Decimal(12345, 2, 10, 31)).toThrow('Scale (D) must be between 0 and 30 and no larger than the precision.');
    expect(() => new Decimal(12345, 2, 10, 11)).toThrow('Scale (D) must be between 0 and 30 and no larger than the precision.');
  });

  test('normalize correctly normalizes the coefficient', () => {
    const decimal = new Decimal('1000', -2, 10, 2);
    expect(decimal.toString()).toBe('10');
  });

  test('addition of two decimals', () => {
    const decimal1 = new Decimal('1234', -2, 10, 2);
    const decimal2 = new Decimal('5678', -2, 10, 2);
    const result = decimal1.add(decimal2);
    expect(result.toString()).toBe('69.12');
  });

  test('subtraction of two decimals', () => {
    const decimal1 = new Decimal('5678', -2, 10, 2);
    const decimal2 = new Decimal('1234', -2, 10, 2);
    const result = decimal1.subtract(decimal2);
    expect(result.toString()).toBe('44.44');
  });

  test('multiplication of two decimals', () => {
    const decimal1 = new Decimal('12', -1, 10, 2);
    const decimal2 = new Decimal('34', -1, 10, 2);
    const result = decimal1.multiply(decimal2);
    expect(result.toString()).toBe('4.08');
  });

  test('division of two decimals', () => {
    const decimal1 = new Decimal('100', 0, 10, 2);
    const decimal2 = new Decimal('4', 0, 10, 2);
    const result = decimal1.divide(decimal2);
    expect(result.toString()).toBe('25');
  });

  test('division by zero throws error', () => {
    const decimal1 = new Decimal('100', 0, 10, 2);
    const decimal2 = new Decimal('0', 0, 10, 2);
    expect(() => decimal1.divide(decimal2)).toThrow('Division by zero is not allowed.');
  });

  test('parsing valid decimal string', () => {
    const decimal = Decimal.parse('1234.5678', 10, 4);
    expect(decimal.toString()).toBe('1234.5678');
  });

  test('parsing invalid decimal string throws error', () => {
    expect(() => Decimal.parse('invalid', 10, 2)).toThrow('Invalid decimal string format.');
  });

  test('JSON serialization and deserialization', () => {
    const decimal = new Decimal('12345678', -4, 10, 4);
    const json = decimal.toJSON();
    const deserializedDecimal = Decimal.fromJSON(json);
    expect(deserializedDecimal.toString()).toBe('1234.5678');
  });
});