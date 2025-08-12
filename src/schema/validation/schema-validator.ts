import MemberDef from '../types/memberdef';
import Schema from '../schema';
import TypedefRegistry from '../typedef-registry';

export class ValidationResult {
  constructor(
    public readonly isValid: boolean,
    public readonly errors: readonly string[]
  ) {}

  static success(): ValidationResult {
    return new ValidationResult(true, []);
  }

  static failure(errors: string[]): ValidationResult {
    return new ValidationResult(false, errors);
  }
}

export class SchemaValidator {
  static validateMemberDef(memberDef: MemberDef): ValidationResult {
    const errors: string[] = [];

    if (!memberDef.type) {
      errors.push('Member definition must have a type');
    } else if (!TypedefRegistry.isRegisteredType(memberDef.type)) {
      errors.push(`Unknown type: ${memberDef.type}`);
    }

    // Validate constraints based on type
    if (memberDef.type === 'string') {
  const hasMin = memberDef.minLength !== undefined;
  const hasMax = memberDef.maxLength !== undefined;
  if (hasMin && hasMax && (memberDef.minLength as number) > (memberDef.maxLength as number)) {
        errors.push('minLength cannot be greater than maxLength');
      }
    }

    if (memberDef.type === 'number') {
  const hasMin = memberDef.min !== undefined;
  const hasMax = memberDef.max !== undefined;
  if (hasMin && hasMax && (memberDef.min as number) > (memberDef.max as number)) {
        errors.push('min cannot be greater than max');
      }
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  static validateSchema(schema: Schema): ValidationResult {
    const errors: string[] = [];

    for (const name of schema.names) {
      const memberDef = schema.get(name);
      if (memberDef) {
        const result = this.validateMemberDef(memberDef);
        if (!result.isValid) {
          errors.push(...result.errors.map(e => `${name}: ${e}`));
        }
      }
    }

    return new ValidationResult(errors.length === 0, errors);
  }

  static validateSchemaName(name: string): ValidationResult {
    const errors: string[] = [];

    if (typeof name !== 'string') {
      errors.push('Schema name must be a non-empty string');
    } else if (name.trim().length === 0) {
      errors.push('Schema name cannot be empty or whitespace only');
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      errors.push('Schema name must start with a letter and contain only letters, numbers, and underscores');
    }

    return new ValidationResult(errors.length === 0, errors);
  }
}
