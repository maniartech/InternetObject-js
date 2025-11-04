import Decimal              from '../../core/decimal'
import Definitions          from '../../core/definitions'
import InternetObjectError  from '../../errors/io-error'
import ErrorCodes           from '../../errors/io-error-codes'
import ValidationError      from '../../errors/io-validation-error'
import Node                 from '../../parser/nodes/nodes'
import Schema               from '../../schema/schema'
import TypeDef              from '../../schema/typedef'
import doCommonTypeCheck    from './common-type'
import MemberDef            from './memberdef'


const NUMBER_TYPES = [
  'bigint', 'decimal',
  'int', 'uint', 'float', 'number',       // General number types
  'int8', 'int16', 'int32',               // Size specific number types
  'uint8', 'uint16', 'uint32', 'uint64',  // Unsigned number types
  'float32', 'float64'                    // Floating point number types
]

const NUMBER_MAP = NUMBER_TYPES.reduce((acc, type) => {
  acc[type] = true
  return acc
}, {} as { [key: string]: boolean })

const numberSchema = new Schema(
  "number",
  { type:     { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:  { type: "number", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "number" } } },
  { min:      { type: "number", optional: true,  null: false, min: 0 } },
  { max:      { type: "number", optional: true,  null: false, min: 0 } },
  { format:   { type: "string", optional: true, null: false, choices: ["decimal", "hex", "octal", "binary", "scientific"] } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)

const bigintSchema = new Schema(
  "bigint",
  { type:     { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:  { type: "bigint", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "bigint" } } },
  { min:      { type: "bigint", optional: true,  null: false, min: 0 } },
  { max:      { type: "bigint", optional: true,  null: false, min: 0 } },
  { format:   { type: "string", optional: true,  null: false, choices: ["decimal", "hex", "octal", "binary"], default:"decimal" } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)

const decimalSchema = new Schema(
  "bigint",
  { type:       { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:    { type: "decimal", optional: true,  null: false  } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "decimal" } } },
  { precision:  { type: "number", optional: true, null: false } },
  { scale:      { type: "number", optional: true, null: false } },
  { min:        { type: "decimal", optional: true,  null: false, min: 0 } },
  { max:        { type: "decimal", optional: true,  null: false, min: 0 } },
  { optional:   { type: "bool",   optional: true } },
  { null:       { type: "bool",   optional: true } },
)

/**
 * Represents the various number related data types in Internet Object.
 *
 * @internal
 */
class NumberDef implements TypeDef {
  private _type: string;
  private _validator: any;

  get type(): string { return this._type; }
  get schema(): Schema {
    if (this._type === 'bigint') {
      return bigintSchema;
    } else if (this._type === 'decimal') {
      return decimalSchema;
    }

    return numberSchema;
  }

  constructor(type: string = 'number') {
    this._type = type;
    this._validator = _getValidator(type);
  }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): number {
    const valueNode = defs?.getV(node) || node;
    let { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs);
    if (changed) return value;

    value = this._validator(memberDef, value, node);

    return value;
  }

  stringify(value: any, memberDef: MemberDef): string {
    if (memberDef.format === 'decimal') { return value.toString(); }
    if (memberDef.format === 'scientific') { return value.toExponential(); }
    if (memberDef.format === 'hex') { return value.toString(16); }
    if (memberDef.format === 'octal') { return value.toString(8); }
    if (memberDef.format === 'binary') { return value.toString(2); }

    return value.toString();
  }

  static get types() {
    return NUMBER_TYPES;
  }
}

// Helper function for throwing validation errors
function throwError(code: string, memberPath: string, value: any, node?: Node) {
  throw new ValidationError(
    code,
    `The '${memberPath}' must be within the specified range, Currently it is ${value}.`,
    node
  );
}

function _intValidator(min: number | null, max: number | null, memberDef: MemberDef, value: any, node?: Node): (number | bigint | Decimal) {
  const valueType = typeof value === "bigint" ? "bigint" : NUMBER_MAP[typeof value] ? "number" : "";
  const memberdefType = memberDef.type === "bigint" ? "bigint" : "number";

  if (valueType === "") {
    throw new ValidationError(
      ErrorCodes.invalidType,
      `Expecting a value of type '${memberDef.type}' for '${memberDef.path}'`,
      node
    );
  }

  if (memberdefType !== valueType) {
    throw new ValidationError(
      `not-a-${memberDef.type}`,
      `Invalid value encountered for '${memberDef.path}'`,
      node
    )
  }

  // Use memberDef.min/max if available, otherwise use bound min/max
  const effectiveMin = memberDef.min !== undefined && memberDef.min !== null ? memberDef.min : min;
  const effectiveMax = memberDef.max !== undefined && memberDef.max !== null ? memberDef.max : max;

  if ((effectiveMin !== null && value < effectiveMin) || (effectiveMax !== null && value > effectiveMax)) {
    throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
  }

  return value;
}

// Helper function to get the number of integer digits in a decimal
function getIntegerDigits(decimal: Decimal): number {
  const valueStr = decimal.toString();
  return valueStr.split('.')[0].replace('-', '').length;
}

function _decimalValidator(memberDef: MemberDef, value: any, node?: Node): (number | bigint | Decimal) {

  const { min, max, precision: requiredPrecision, scale: requiredScale } = memberDef;

  const valD: Decimal = Decimal.ensureDecimal(value);

  // Mode check: Determine validation mode based on precision and scale
  const hasRequiredPrecision = requiredPrecision !== null && requiredPrecision !== undefined;
  const hasRequiredScale = requiredScale !== null && requiredScale !== undefined;

  // Validate scale if specified (modes 2 and 4)
  if (hasRequiredScale) {
    const actualScale = valD.getScale();
    if (actualScale !== requiredScale) {
      throwError(
        ErrorCodes.invalidScale,
        memberDef.path!,
        `Value has scale ${actualScale}, expected ${requiredScale}`,
        node
      );
    }
  }

  // Validate precision if specified (modes 3 and 4)
  if (hasRequiredPrecision) {
    const actualPrecision = valD.getPrecision();

    if (hasRequiredScale) {
      // Mode 4: Strict validation (both precision and scale)
      // Check if value fits within DECIMAL(precision, scale)
      const intDigits = getIntegerDigits(valD);
      const maxIntDigits = requiredPrecision - requiredScale;

      if (intDigits > maxIntDigits) {
        throwError(
          ErrorCodes.invalidPrecision,
          memberDef.path!,
          `Integer part has ${intDigits} digits, DECIMAL(${requiredPrecision},${requiredScale}) allows ${maxIntDigits}`,
          node
        );
      }
    } else {
      // Mode 3: Precision-only validation
      if (actualPrecision > requiredPrecision) {
        throwError(
          ErrorCodes.invalidPrecision,
          memberDef.path!,
          `Value has precision ${actualPrecision}, max allowed is ${requiredPrecision}`,
          node
        );
      }
    }
  }

  // Validate min constraint - normalize to same scale for comparison
  if (min !== null && min !== undefined) {
    const minD: Decimal = Decimal.ensureDecimal(min);

    // Use the larger scale for both
    const targetScale = Math.max(valD.getScale(), minD.getScale());

    // Calculate precision needed: max integer digits + target scale
    const valIntDigits = getIntegerDigits(valD);
    const minIntDigits = getIntegerDigits(minD);
    const targetPrecision = Math.max(valIntDigits, minIntDigits) + targetScale;

    const normalizedVal = valD.convert(targetPrecision, targetScale);
    const normalizedMin = minD.convert(targetPrecision, targetScale);

    if (normalizedVal.compareTo(normalizedMin) < 0) {
      throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
    }
  }

  // Validate max constraint - normalize to same scale for comparison
  if (max !== null && max !== undefined) {
    const maxD: Decimal = Decimal.ensureDecimal(max);

    // Use the larger scale for both
    const targetScale = Math.max(valD.getScale(), maxD.getScale());

    // Calculate precision needed: max integer digits + target scale
    const valIntDigits = getIntegerDigits(valD);
    const maxIntDigits = getIntegerDigits(maxD);
    const targetPrecision = Math.max(valIntDigits, maxIntDigits) + targetScale;

    const normalizedVal = valD.convert(targetPrecision, targetScale);
    const normalizedMax = maxD.convert(targetPrecision, targetScale);

    if (normalizedVal.compareTo(normalizedMax) > 0) {
      throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
    }
  }

  // Return the value as-is (don't convert unless necessary)
  // If precision/scale were specified for validation, the value already passed those checks
  return valD;
}

function _getValidator(type: string) {
  switch (type) {
    case 'float':
    case 'float64':
    case 'number':
    case 'bigint':
    case 'int':
      return _intValidator.bind(null, null, null);

    case 'uint':
      return _intValidator.bind(null, 0, null);

    case 'int8':
      return _intValidator.bind(null, -(2 ** 7), 2 ** 7 - 1);

    case 'uint8':
      return _intValidator.bind(null, 0, 2 ** 8 - 1);

    case 'int16':
      return _intValidator.bind(null, -(2 ** 15), 2 ** 15 - 1);

    case 'uint16':
      return _intValidator.bind(null, 0, 2 ** 16 - 1);

    case 'int32':
      return _intValidator.bind(null, -(2 ** 31), 2 ** 31 - 1);

    case 'uint32':
      return _intValidator.bind(null, 0, 2 ** 32 - 1);

    case 'uint64':
    case 'int64':
    case 'float32':
    case 'float64':
      return (memberDef: MemberDef, value: any, node?: Node) => {
        throw new InternetObjectError(ErrorCodes.unsupportedNumberType, `The number type '${type}' is not supported.`);
      }

    case 'decimal':
      return (memberDef: MemberDef, value: any, node?: Node) => {
        const { min, max, precision: requiredPrecision, scale: requiredScale } = memberDef;
        const valD: Decimal = Decimal.ensureDecimal(value);

        // Mode check: Determine validation mode based on precision and scale
        const hasRequiredPrecision = requiredPrecision !== null && requiredPrecision !== undefined;
        const hasRequiredScale = requiredScale !== null && requiredScale !== undefined;

        // Validate scale if specified (modes 2 and 4)
        if (hasRequiredScale) {
          const actualScale = valD.getScale();
          if (actualScale !== requiredScale) {
            throwError(
              ErrorCodes.invalidScale,
              memberDef.path!,
              `Value has scale ${actualScale}, expected ${requiredScale}`,
              node
            );
          }
        }

        // Validate precision if specified (modes 3 and 4)
        if (hasRequiredPrecision) {
          const actualPrecision = valD.getPrecision();

          if (hasRequiredScale) {
            // Mode 4: Strict validation (both precision and scale)
            // Check if value fits within DECIMAL(precision, scale)
            const intDigits = getIntegerDigits(valD);
            const maxIntDigits = requiredPrecision - requiredScale;

            if (intDigits > maxIntDigits) {
              throwError(
                ErrorCodes.invalidPrecision,
                memberDef.path!,
                `Integer part has ${intDigits} digits, DECIMAL(${requiredPrecision},${requiredScale}) allows ${maxIntDigits}`,
                node
              );
            }
          } else {
            // Mode 3: Precision-only validation
            if (actualPrecision > requiredPrecision) {
              throwError(
                ErrorCodes.invalidPrecision,
                memberDef.path!,
                `Value has precision ${actualPrecision}, max allowed is ${requiredPrecision}`,
                node
              );
            }
          }
        }

        // Validate min constraint - normalize to same scale for comparison
        if (min !== null && min !== undefined) {
          const minD: Decimal = Decimal.ensureDecimal(min);

          // Use the larger scale for both
          const targetScale = Math.max(valD.getScale(), minD.getScale());

          // Calculate precision needed: max integer digits + target scale
          const valIntDigits = getIntegerDigits(valD);
          const minIntDigits = getIntegerDigits(minD);
          const targetPrecision = Math.max(valIntDigits, minIntDigits) + targetScale;

          const normalizedVal = valD.convert(targetPrecision, targetScale);
          const normalizedMin = minD.convert(targetPrecision, targetScale);

          if (normalizedVal.compareTo(normalizedMin) < 0) {
            throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
          }
        }

        // Validate max constraint - normalize to same scale for comparison
        if (max !== null && max !== undefined) {
          const maxD: Decimal = Decimal.ensureDecimal(max);

          // Use the larger scale for both
          const targetScale = Math.max(valD.getScale(), maxD.getScale());

          // Calculate precision needed: max integer digits + target scale
          const valIntDigits = getIntegerDigits(valD);
          const maxIntDigits = getIntegerDigits(maxD);
          const targetPrecision = Math.max(valIntDigits, maxIntDigits) + targetScale;

          const normalizedVal = valD.convert(targetPrecision, targetScale);
          const normalizedMax = maxD.convert(targetPrecision, targetScale);

          if (normalizedVal.compareTo(normalizedMax) > 0) {
            throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
          }
        }

        // Return the value as-is (don't convert unless necessary)
        return valD;
      }

    default:
      throw new InternetObjectError(ErrorCodes.invalidType, `The number type '${type}' is not a valid number type.`);
  }
}

export default NumberDef
