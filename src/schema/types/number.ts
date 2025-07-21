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

  if ((min !== null && value < min) || (max !== null && value > max)) {
    throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
  }

  return value;
}

function _decimalValidator(memberDef: MemberDef, value: any, node?: Node): (number | bigint | Decimal) {

  const { min, max } = memberDef;

  const minD: Decimal | null = min === null ? null : Decimal.ensureDecimal(min);
  const maxD: Decimal | null = max === null ? null : Decimal.ensureDecimal(max);

  const valD: Decimal = Decimal.ensureDecimal(value);

  if ((minD !== null && valD.compareTo(minD) < 0) || (maxD !== null && valD.compareTo(maxD) > 0)) {
    throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
  }

  const precision = memberDef.precision || valD.getPrecision();
  const scale = memberDef.scale || valD.getScale();

  return valD.convert(precision, scale);
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
        if (value instanceof Decimal) return value;
        const { min, max } = memberDef;
        const minD: Decimal | null = min === null ? null : Decimal.ensureDecimal(min);
        const maxD: Decimal | null = max === null ? null : Decimal.ensureDecimal(max);
        const valD: Decimal = Decimal.ensureDecimal(value);

        if ((minD !== null && valD.compareTo(minD) < 0) || (maxD !== null && valD.compareTo(maxD) > 0)) {
          throwError(ErrorCodes.invalidRange, memberDef.path!, value, node);
        }

        const precision = memberDef.precision || valD.getPrecision();
        const scale = memberDef.scale || valD.getScale();

        return valD.convert(precision, scale);
      }

    default:
      throw new InternetObjectError(ErrorCodes.invalidType, `The number type '${type}' is not a valid number type.`);
  }
}

export default NumberDef
