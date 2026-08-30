import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import { loadCollection, loadObject } from '../schema/load-processor';
import { ErrorSink, isErrorSink, report } from './error-sink';
import { IOCommonOptions } from './options';
import { resolveSchema } from './resolve-schema';
import ValidationError from '../errors/io-validation-error';
import ErrorCodes from '../errors/io-error-codes';

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

/** What may sit in slot two: definitions, a bare schema, or nothing. */
export type ValidateDefs = Definitions | Schema | null;

/**
 * Reads `(data, defs?, sink?, options?)`, the shape every entry point takes since §2.5.
 *
 * The old shape was `(data, schemaOrDefs, defs?)` — a third slot unlike any sibling's, which meant
 * `validate` was the one function where a reader had to stop and remember. It is still accepted,
 * unambiguously: a `Definitions` in slot three can only be the old form, because a sink is an array
 * or a function and never a class instance.
 */
function readArgs(
  a?: ValidateDefs,
  b?: ErrorSink | Definitions,
  c?: IOCommonOptions
): { schema?: Schema; defs?: Definitions; sink?: ErrorSink; options?: IOCommonOptions } {
  const legacyDefs = b instanceof Definitions ? b : undefined;
  const sink = isErrorSink(b) ? (b as ErrorSink) : undefined;
  const options = c;

  if (a instanceof Definitions) {
    const schema = resolveSchema(a, options?.schemaName);
    // Handing over definitions and getting a silent pass would be the worst of both: the caller
    // ASKED for validation, and there is nothing to validate against. `resolveSchema` throws for a
    // named schema that is missing; this is the unnamed case it returns empty for.
    if (!schema) {
      throw new ValidationError(
        ErrorCodes.undefinedSchema,
        "Definitions does not contain a default schema ('$schema')."
      );
    }
    return { schema, defs: a, sink, options };
  }
  if (a instanceof Schema) {
    return { schema: a, defs: legacyDefs, sink, options };
  }
  return { schema: undefined, defs: legacyDefs, sink, options };
}

/** Reports to the sink and returns the failed result, so every path spells failure the same way. */
function failed(errors: Error[], sink?: ErrorSink): ValidationResult<any> {
  for (const error of errors) report(sink, error);
  return { valid: false, errors };
}

/**
 * Validates a plain JavaScript object against a schema.
 *
 * ```ts
 * validateObject(data, defs);                         // uses defs' $schema
 * validateObject(data, defs, sink);                   // errors also go to the sink
 * validateObject(data, defs, sink, { schemaName: '$User' });
 * validateObject(data, io.schema`{name: string}`);    // a bare schema, no definitions
 * ```
 *
 * **"`validate` to check, `load` to keep."** This one never throws and never keeps: it reports.
 * The sink is redundant with the returned `errors` and exists so that the four entry points take
 * the same four slots — a caller writing against `parse` does not have to learn a second shape.
 *
 * @param data The object to validate.
 * @param defs Definitions (its `$schema`, or `options.schemaName`), or a bare `Schema`.
 * @param sink An array to fill or a function to call. Optional; `errors` carries the same set.
 * @param options `schemaName` picks a schema out of `defs`.
 */
export function validateObject(
  data: object,
  defs?: ValidateDefs,
  sink?: ErrorSink | Definitions,
  options?: IOCommonOptions
): ValidationResult<object> {
  const errors: Error[] = [];
  let resolved;
  try {
    resolved = readArgs(defs, sink, options);
  } catch (err) {
    return failed([err instanceof Error ? err : new Error(String(err))], isErrorSink(sink) ? sink : undefined);
  }

  // No definitions at all is not a failure — it is a question nobody asked, and the data comes
  // back as it is, exactly as `load` does in the same situation. Definitions that carry no usable
  // schema are a different matter and were reported above.
  if (!resolved.schema) return { valid: true, errors, data };

  try {
    const obj = loadObject(data, resolved.schema, resolved.defs);
    return { valid: true, errors, data: obj.toJSON() };
  } catch (err) {
    return failed([err instanceof Error ? err : new Error(String(err))], resolved.sink);
  }
}

/**
 * Validates an array of objects against a schema.
 *
 * Unlike the object form, this reports **every** bad record rather than stopping at the first —
 * the collection loader accumulates.
 *
 * @param data The array to validate.
 * @param defs Definitions, or a bare `Schema`.
 * @param sink An array to fill or a function to call.
 * @param options `schemaName` picks a schema out of `defs`.
 */
export function validateCollection(
  data: any[],
  defs?: ValidateDefs,
  sink?: ErrorSink | Definitions,
  options?: IOCommonOptions
): ValidationResult<any[]> {
  const errors: Error[] = [];
  let resolved;
  try {
    resolved = readArgs(defs, sink, options);
  } catch (err) {
    return failed([err instanceof Error ? err : new Error(String(err))], isErrorSink(sink) ? sink : undefined);
  }

  if (!resolved.schema) return { valid: true, errors, data };

  try {
    const col = loadCollection(data, resolved.schema, resolved.defs, errors);
    if (errors.length > 0) return failed(errors, resolved.sink);
    return { valid: true, errors, data: col.toJSON() };
  } catch (err) {
    return failed([err instanceof Error ? err : new Error(String(err))], resolved.sink);
  }
}

/**
 * Validates data against a schema, delegating to {@link validateObject} or
 * {@link validateCollection} by the shape of the input.
 *
 * ```ts
 * const { valid, errors, data } = io.validate(input, defs);
 * ```
 *
 * @param data The object or array to validate.
 * @param defs Definitions, or a bare `Schema`.
 * @param sink An array to fill or a function to call.
 * @param options `schemaName` picks a schema out of `defs`.
 */
export function validate(
  data: any,
  defs?: ValidateDefs,
  sink?: ErrorSink | Definitions,
  options?: IOCommonOptions
): ValidationResult {
  return Array.isArray(data)
    ? validateCollection(data, defs, sink, options)
    : validateObject(data, defs, sink, options);
}
