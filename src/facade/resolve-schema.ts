import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import IOError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';
import ValidationError from '../errors/io-validation-error';

/**
 * Resolve the schema to use for a load/stringify operation — ONE primitive, ONE failure mode (R8).
 *
 * Previously `load*` used `definitions.get` + a `schemaNotFound` throw, while `stringify` used
 * `defs.getV` guarded by `instanceof Schema` and **silently** fell back to schema-less on a miss.
 * Same mistake, different behavior. This unifies them:
 *
 * - `schemaName` given and it resolves to a Schema → that Schema
 * - `schemaName` given but not found → throw `ErrorCodes.undefinedSchema` (never silent)
 * - `schemaName` absent → the default schema (`$schema`) via `defs.defaultSchema`, or `undefined`
 */
export function resolveSchema(defs: Definitions | undefined, schemaName?: string): Schema | undefined {
  if (!defs) return undefined;
  if (schemaName) {
    const resolved = defs.get(schemaName) as Schema | undefined;
    if (!resolved) {
      throw new ValidationError(ErrorCodes.undefinedSchema, `Schema '${schemaName}' not found in definitions.`);
    }
    return resolved;
  }
  return defs.defaultSchema || undefined;
}
