import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import { loadCollection, loadObject } from '../schema/load-processor';

export interface ValidationResult<T = any> {
  valid: boolean;
  errors: Error[];
  data?: T;
}

function resolveSchemaAndDefs(
  schemaOrDefs: Schema | Definitions,
  defs?: Definitions
): { schema: Schema; defs?: Definitions } {
  if (schemaOrDefs instanceof Definitions) {
    const resolved = schemaOrDefs.defaultSchema;
    if (!resolved) {
      throw new Error("Definitions does not contain a default schema ('$schema')");
    }
    return { schema: resolved, defs: schemaOrDefs };
  }

  return { schema: schemaOrDefs, defs };
}

export function validateObject(data: object, schemaOrDefs: Schema | Definitions, defs?: Definitions): ValidationResult<object> {
  const errors: Error[] = [];

  try {
    const { schema, defs: resolvedDefs } = resolveSchemaAndDefs(schemaOrDefs, defs);
    const obj = loadObject(data, schema, resolvedDefs);
    return { valid: true, errors, data: obj.toJSON() };
  } catch (err) {
    errors.push(err instanceof Error ? err : new Error(String(err)));
    return { valid: false, errors };
  }
}

export function validateCollection(data: any[], schemaOrDefs: Schema | Definitions, defs?: Definitions): ValidationResult<any[]> {
  const errors: Error[] = [];

  try {
    const { schema, defs: resolvedDefs } = resolveSchemaAndDefs(schemaOrDefs, defs);
    const col = loadCollection(data, schema, resolvedDefs, errors);

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, errors, data: col.toJSON() };
  } catch (err) {
    errors.push(err instanceof Error ? err : new Error(String(err)));
    return { valid: false, errors };
  }
}

export function validate(data: any, schemaOrDefs: Schema | Definitions, defs?: Definitions): ValidationResult {
  if (Array.isArray(data)) {
    return validateCollection(data, schemaOrDefs, defs);
  }

  return validateObject(data, schemaOrDefs, defs);
}
