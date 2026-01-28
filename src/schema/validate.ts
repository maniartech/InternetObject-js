import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import { loadCollection, loadObject } from '../schema/load-processor';

/**
 * Result of a validation operation.
 */
export interface ValidationResult<T = any> {
  /** True if validation succeeded, false otherwise. */
  valid: boolean;
  /** List of errors found during validation. Empty if valid is true. */
  errors: Error[];
  /** The validated data, converted to a plain JavaScript object/array. Undefined if valid is false. */
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

/**
 * Validates a plain JavaScript object against a schema.
 *
 * @param data - The object to validate.
 * @param schemaOrDefs - The Schema to validate against, or Definitions containing a `$schema`.
 * @param defs - Optional Definitions context (if schema is passed as first arg).
 * @returns ValidationResult containing `valid` status, `errors`, and processed `data`.
 *
 * @example
 * ```typescript
 * const schema = io.schema`{ name: string, age: int }`;
 * const result = validateObject({ name: 'Alice', age: 30 }, schema);
 * if (result.valid) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */
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

/**
 * Validates an array of objects against a schema.
 *
 * @param data - The array to validate.
 * @param schemaOrDefs - The Schema to validate against, or Definitions containing a `$schema`.
 * @param defs - Optional Definitions context.
 * @returns ValidationResult containing `valid` status, `errors`, and processed `data` array.
 */
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

/**
 * Validates data (object or array) against a schema.
 * Automatically delegates to `validateObject` or `validateCollection` based on input type.
 *
 * @param data - The object or array to validate.
 * @param schemaOrDefs - The Schema to validate against, or Definitions containing a `$schema`.
 * @param defs - Optional Definitions context.
 * @returns ValidationResult.
 */
export function validate(data: any, schemaOrDefs: Schema | Definitions, defs?: Definitions): ValidationResult {
  if (Array.isArray(data)) {
    return validateCollection(data, schemaOrDefs, defs);
  }

  return validateObject(data, schemaOrDefs, defs);
}
