import Definitions            from '../../core/definitions';
import ErrorCodes             from '../../errors/io-error-codes';
import InternetObjectError    from '../../errors/io-error';
import ValidationError        from '../../errors/io-validation-error';
import MemberNode             from '../../parser/nodes/members';
import Node                   from '../../parser/nodes/nodes';
import { getMemberDef       } from '../../schema/compile-object';
import Schema                 from '../../schema/schema';
import TypeDef                from '../../schema/typedef';
import TypedefRegistry        from '../../schema/typedef-registry';
import doCommonTypeCheck      from './common-type';
import MemberDef              from './memberdef';

const of = { type: "any", __memberdef: true }

const schema = new Schema(
  "any",
  { type:     { type: "string", optional: false, null: false, choices: ["any"] } },
  { default:  { type: "any",    optional: true,  null: true } },
  { choices:  { type: "array",  optional: true,  null: false } },
  { anyOf:    { type: "array",  optional: true,  null: false, of } },
  { isSchema: { type: "bool",   optional: true,  null: false, default: false } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)

export default class AnyDef implements TypeDef {

  public  get type(): string  { return 'any' }
  public get schema()         { return schema }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): any {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    const anyOf = memberDef.anyOf;
    if (!anyOf) {
      if (memberDef.__memberdef) { // Convert to memberDef
        const md = getMemberDef(new MemberNode(node), "", defs)
        return md
      }

      return value
    }

    const errors = []

    for (let i=0; i<anyOf.length; i++) {
      const def = anyOf[i]
      def.path = memberDef.path

      const typeDef = TypedefRegistry.get(def.type)
      if (!typeDef) {
        throw new InternetObjectError(ErrorCodes.invalidType, `Invalid type definition '${def.type}'`)
      }

      try {
        return typeDef.parse(node, def, defs)
      } catch (e) {
        errors.push(e)
        continue
      }
    }

    // None of the types matched
    if (errors.length === anyOf.length) {
      throw new ValidationError(ErrorCodes.invalidValue, `None of the constraints defined for '${memberDef.path}' matched.`, node)
    }

    return valueNode;
  }

  /**
   * Load: Validates a JavaScript value against anyOf constraints (if specified)
   */
  load(value: any, memberDef: MemberDef, defs?: Definitions): any {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) return checkedValue

    const anyOf = memberDef.anyOf
    if (!anyOf) {
      // No constraints - accept any value
      return value
    }

    // Try each type in anyOf until one succeeds
    const errors: Error[] = []
    for (const def of anyOf) {
      const defWithPath = { ...def, path: memberDef.path }
      const typeDef = TypedefRegistry.get(def.type)

      if (!typeDef) {
        throw new InternetObjectError(ErrorCodes.invalidType, `Invalid type definition '${def.type}'`)
      }

      try {
        if ('load' in typeDef && typeof typeDef.load === 'function') {
          return typeDef.load(value, defWithPath, defs)
        } else {
          // Type doesn't have load method - skip to next
          errors.push(new Error(`Type '${def.type}' does not support load()`))
          continue
        }
      } catch (e) {
        errors.push(e as Error)
        continue
      }
    }

    // None of the types matched
    if (errors.length === anyOf.length) {
      throw new ValidationError(
        ErrorCodes.invalidValue,
        `None of the constraints defined for '${memberDef.path}' matched.`
      )
    }

    return value
  }

  /**
   * Stringify: Converts a JavaScript value to IO text format
   * Infers the type from the value and uses appropriate TypeDef.stringify()
   */
  stringify(value: any, memberDef: MemberDef, defs?: Definitions): string {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) {
      if (checkedValue === null) return 'N'
      if (checkedValue === undefined) return ''
      value = checkedValue
    }

    // Handle null
    if (value === null) return 'N'
    if (value === undefined) return ''

    // If anyOf is specified, try to find a matching type
    const anyOf = memberDef.anyOf
    if (anyOf) {
      for (const def of anyOf) {
        const defWithPath = { ...def, path: memberDef.path }
        const typeDef = TypedefRegistry.get(def.type)

        if (!typeDef) continue

        try {
          // Try to load first to validate, then stringify
          if ('load' in typeDef && typeof typeDef.load === 'function') {
            typeDef.load(value, defWithPath, defs)
          }
          if ('stringify' in typeDef && typeof typeDef.stringify === 'function') {
            return typeDef.stringify(value, defWithPath, defs)
          }
        } catch {
          continue
        }
      }
    }

    // Infer type from value and stringify accordingly
    return this._stringifyByInference(value, memberDef.path || '', defs)
  }

  /**
   * Stringify by inferring the type from the value
   */
  private _stringifyByInference(value: any, path: string, defs?: Definitions): string {
    // Boolean
    if (typeof value === 'boolean') {
      const boolDef = TypedefRegistry.get('bool')
      if (boolDef && 'stringify' in boolDef && typeof boolDef.stringify === 'function') {
        return boolDef.stringify(value, { type: 'bool', path } as MemberDef, defs)
      }
      return value ? 'T' : 'F'
    }

    // Number
    if (typeof value === 'number') {
      const numberDef = TypedefRegistry.get('number')
      if (numberDef && 'stringify' in numberDef && typeof numberDef.stringify === 'function') {
        return numberDef.stringify(value, { type: 'number', path } as MemberDef, defs)
      }
      return String(value)
    }

    // BigInt
    if (typeof value === 'bigint') {
      const bigintDef = TypedefRegistry.get('bigint')
      if (bigintDef && 'stringify' in bigintDef && typeof bigintDef.stringify === 'function') {
        return bigintDef.stringify(value, { type: 'bigint', path } as MemberDef, defs)
      }
      return value.toString()
    }

    // String
    if (typeof value === 'string') {
      const stringDef = TypedefRegistry.get('string')
      if (stringDef && 'stringify' in stringDef && typeof stringDef.stringify === 'function') {
        return stringDef.stringify(value, { type: 'string', path, format: 'open' } as MemberDef, defs)
      }
      return value
    }

    // Date - infer date/time/datetime based on components
    if (value instanceof Date) {
      const inferredType = this._inferDateTimeType(value)
      const datetimeDef = TypedefRegistry.get(inferredType)
      if (datetimeDef && 'stringify' in datetimeDef && typeof datetimeDef.stringify === 'function') {
        return datetimeDef.stringify(value, { type: inferredType, path } as MemberDef, defs)
      }
      return value.toISOString()
    }

    // Array
    if (Array.isArray(value)) {
      const arrayDef = TypedefRegistry.get('array')
      if (arrayDef && 'stringify' in arrayDef && typeof arrayDef.stringify === 'function') {
        return arrayDef.stringify(value, { type: 'array', path } as MemberDef, defs)
      }
      const items = value.map((item, i) => this._stringifyByInference(item, `${path}[${i}]`, defs))
      return `[${items.join(', ')}]`
    }

    // Object
    if (typeof value === 'object' && value !== null) {
      const objectDef = TypedefRegistry.get('object')
      if (objectDef && 'stringify' in objectDef && typeof objectDef.stringify === 'function') {
        return objectDef.stringify(value, { type: 'object', path } as MemberDef, defs)
      }
      // Fallback: stringify as key-value pairs
      const parts: string[] = []
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          const strValue = this._stringifyByInference(value[key], `${path}.${key}`, defs)
          parts.push(`${key}: ${strValue}`)
        }
      }
      return `{${parts.join(', ')}}`
    }

    // Fallback
    return JSON.stringify(value)
  }

  /**
   * Infer the datetime type (date, time, or datetime) based on the Date value.
   * - If time is 00:00:00.000Z → 'date'
   * - If date is 1900-01-01 → 'time'
   * - Otherwise → 'datetime'
   */
  private _inferDateTimeType(date: Date): 'date' | 'time' | 'datetime' {
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    const seconds = date.getUTCSeconds()
    const ms = date.getUTCMilliseconds()

    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() // 0-indexed
    const day = date.getUTCDate()

    // Time-only: date component is 1900-01-01 (the sentinel value used in parseTime)
    if (year === 1900 && month === 0 && day === 1) {
      return 'time'
    }

    // Date-only: time component is all zeros
    if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) {
      return 'date'
    }

    // Full datetime
    return 'datetime'
  }

  public static get types() { return ['any'] }
}
