import IODefinitions from '../src/core/definitions';
import TokenType from '../src/parser/tokenizer/token-types';
import ValidationError from '../src/errors/io-validation-error';
import ErrorCodes from '../src/errors/io-error-codes';
import Schema from '../src/schema/schema';

// Minimal token-shaped helper to avoid depending on actual TokenNode constructor
const strToken = (value: string) => ({ type: TokenType.STRING, value });

describe('Definitions variable resolution (@ vs $)', () => {
  test('missing $schema throws schemaNotDefined with position when token provided', () => {
    const defs = new IODefinitions();
    const token = strToken('$schema');
    expect(() => defs.getV(token as any)).toThrow(ValidationError);
    try {
      defs.getV(token as any);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.code).toBe(ErrorCodes.schemaNotDefined);
      // When a token-like object is provided, it should be attached as position
      expect(e.position).toBeDefined();
    }
  });

  test('missing @var throws variableNotDefined with position when token provided', () => {
    const defs = new IODefinitions();
    const token = strToken('@r');
    expect(() => defs.getV(token as any)).toThrow(ValidationError);
    try {
      defs.getV(token as any);
    } catch (e: any) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e.code).toBe(ErrorCodes.variableNotDefined);
      expect(e.position).toBeDefined();
    }
  });

  test('present @var resolves to its value', () => {
    const defs = new IODefinitions();
    defs.set('@r', 'red');
    expect(defs.getV('@r')).toBe('red');
  });

  test('present $schema resolves to Schema instance', () => {
    const defs = new IODefinitions();
    const schema = new Schema('Employee');
    defs.set('$schema', schema);
    const resolved = defs.getV('$schema');
    expect(resolved).toBeInstanceOf(Schema);
    expect(resolved.name).toBe('Employee');
  });
});
