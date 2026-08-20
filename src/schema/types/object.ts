import Definitions          from '../../core/definitions';
import InternetObject       from '../../core/internet-object';
import ValidationError      from '../../errors/io-validation-error';
import IOError              from '../../errors/io-error';
import ErrorCodes           from '../../errors/io-error-codes';
import ObjectNode           from '../../parser/nodes/objects'
import Node                 from '../../parser/nodes/nodes';
import TokenNode            from '../../parser/nodes/tokens';
import compileObject        from '../../schema/compile-object';
import processObject        from '../../schema/object-processor';
import Schema               from '../../schema/schema';
import TypeDef              from '../../schema/typedef';
import TypedefRegistry      from '../../schema/typedef-registry';
import doCommonTypeCheck    from './common-type';
import MemberDef            from './memberdef';
import { formatObjectKey, shouldEmitKey }  from '../../utils/string-formatter';
import { undeclaredMemberDef } from '../utils/member-utils';

const schema = new Schema(
  "object",
  { type:     { type: "string", optional: false, null: false, choices: ["object"] } },
  { default:  { type: "object", optional: true,  null: false } },
  { schema:   { type: "object", optional: true,  null: false, __schema: true } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)

/**
 * Represents the ObjectTypeDef which is reponsible for parsing,
 * validating, loading and serializing Objects.
 */
class ObjectDef implements TypeDef {
  private _names: any = null

  /**
   * Returns the type this instance is going to handle.
   * Always returns object
   */
  get type() { return 'object' }

  static get types() { return ['object'] }

  get schema() { return schema }

  /**
   * Parses the object in IO format into JavaScript object.
   */
  parse = (node: Node, memberDef: MemberDef, defs?: Definitions): any => {
    return this._process(node, memberDef, defs)
  }

  /**
   * Load: Validates a JavaScript object against the schema
   */
  load = (value: any, memberDef: MemberDef, defs?: Definitions): any => {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) return checkedValue

    // Type check
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(
        ErrorCodes.invalidObject,
        `Expecting an object value for '${memberDef.path}' but found ${Array.isArray(value) ? 'array' : typeof value}`
      )
    }

    const schema = memberDef.schema
    if (!schema) {
      // No schema - return value as-is for open objects
      return value
    }

    // Process object with schema using internal helper
    return this._loadObject(value, schema, memberDef.path || '', defs)
  }

  /**
   * Stringify: Converts a JavaScript object to IO text format
   * Returns undefined if value is undefined (signals to skip this field)
   */
  stringify = (value: any, memberDef: MemberDef, defs?: Definitions): string | undefined => {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) {
      if (checkedValue === null) return 'N'
      if (checkedValue === undefined) return undefined  // Skip this field entirely
      value = checkedValue
    }

    // Type check
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(
        ErrorCodes.invalidObject,
        `Expecting an object value for '${memberDef.path}' but found ${Array.isArray(value) ? 'array' : typeof value}`
      )
    }

    // Resolve schema - it might be a Schema instance, a variable reference (TokenNode), or schemaRef string
    let schema = this._resolveSchema(memberDef.schema, defs)

    // If no schema from memberDef.schema, check schemaRef
    if (!schema && memberDef.schemaRef && defs) {
      schema = this._resolveSchema(memberDef.schemaRef, defs)
    }

    return this._stringifyObject(value, schema, memberDef.path || '', defs)
  }

  /**
   * Internal helper to load and validate a plain JS object according to schema
   */
  private _loadObject(data: any, schema: Schema, basePath: string, defs?: Definitions): any {
    const result: any = {}
    const processedNames = new Set<string>()

    // Process schema-defined members
    for (const name of schema.names) {
      const memberDef = this._resolveMemberDefVariables(schema.defs[name], defs)
      memberDef.path = basePath ? `${basePath}.${name}` : name
      const value = data[name]

      const typeDef = TypedefRegistry.get(memberDef.type)
      if (!typeDef) {
        throw new IOError(ErrorCodes.invalidType, `Type '${memberDef.type}' is not registered.`)
      }

      // Use load() method if available
      if ('load' in typeDef && typeof typeDef.load === 'function') {
        const loadedValue = typeDef.load(value, memberDef, defs)
        if (loadedValue !== undefined) {
          result[name] = loadedValue
        }
      } else {
        // Fallback for types without load()
        if (value !== undefined) {
          result[name] = value
        } else if (memberDef.default !== undefined) {
          result[name] = memberDef.default
        } else if (!memberDef.optional) {
          throw new ValidationError(
            ErrorCodes.valueRequired,
            `Value required for field '${memberDef.path}'`
          )
        }
      }

      processedNames.add(name)
    }

    // Handle additional properties
    if (schema.open) {
      for (const key in data) {
        if (!processedNames.has(key)) {
          const extraMemberDef: MemberDef =
            undeclaredMemberDef(basePath ? `${basePath}.${key}` : key, schema.open)

          const typeDef = TypedefRegistry.get(extraMemberDef.type)
          if (typeDef && 'load' in typeDef && typeof typeDef.load === 'function') {
            const loadedValue = typeDef.load(data[key], extraMemberDef, defs)
            if (loadedValue !== undefined) {
              result[key] = loadedValue
            }
          } else {
            result[key] = data[key]
          }
        }
      }
    } else {
      // Check for unexpected properties in closed schemas
      for (const key in data) {
        if (!processedNames.has(key)) {
          throw new ValidationError(
            ErrorCodes.unknownMember,
            `The ${schema.name ? `${schema.name} ` : ''}schema does not define a member named '${key}'.`
          )
        }
      }
    }

    return result
  }

  /**
   * Internal helper to stringify an object according to schema
   */
  private _stringifyObject(data: any, schema: Schema | undefined, basePath: string, defs?: Definitions): string {
    const parts: string[] = []

    if (schema) {
      // Stringify in schema order
      for (const name of schema.names) {
        const memberDef = this._resolveMemberDefVariables(schema.defs[name], defs)
        memberDef.path = basePath ? `${basePath}.${name}` : name
        const value = data[name]

        const typeDef = TypedefRegistry.get(memberDef.type)
        if (typeDef && 'stringify' in typeDef && typeof typeDef.stringify === 'function') {
          // Use auto format (default) - it safely handles all cases
          // stringify returns undefined to signal "skip this field" (missing optional)
          const strValue = typeDef.stringify(value, memberDef, defs)
          parts.push(strValue ?? '')  // Empty placeholder for positional format
        } else {
          // Fallback
          if (value === null) {
            parts.push('N')
          } else if (value === undefined) {
            parts.push('')  // Empty placeholder for positional format
          } else {
            parts.push(JSON.stringify(value))
          }
        }
      }

      // Trim trailing empty values (missing optional fields at the end)
      while (parts.length > 0 && parts[parts.length - 1] === '') {
        parts.pop()
      }

      // Handle additional properties for open schemas
      if (schema.open) {
        const schemaNames = new Set(schema.names)
        for (const key in data) {
          if (!schemaNames.has(key)) {
            const value = data[key]
            const extraPath = basePath ? `${basePath}.${key}` : key

            // Skip undefined values for extra properties
            if (value === undefined) continue

            let strValue: string
            if (value === null) {
              strValue = 'N'
            } else if (typeof value === 'string') {
              const stringDef = TypedefRegistry.get('string')
              if (stringDef && 'stringify' in stringDef && typeof stringDef.stringify === 'function') {
                strValue = stringDef.stringify(value, { type: 'string', path: extraPath, format: 'auto' } as MemberDef, defs) ?? value
              } else {
                strValue = JSON.stringify(value)
              }
            } else {
              strValue = JSON.stringify(value)
            }
            parts.push(`${formatObjectKey(key)}: ${strValue}`)
          }
        }
      }
    } else {
      // No schema - render in INDEX order. IO objects ALWAYS carry a positional index; a key is
      // optional. A member with NO key, or whose key equals its positional index, is positional and is
      // emitted WITHOUT a label; any other key is a real label emitted as `key: value` (numeric/keyword
      // keys are quoted so they round-trip as string keys).
      //
      // Iterate POSITIONALLY via forEach so keyless (push) members are not lost: `for..in` only sees
      // keyed members that were synced as instance properties, silently dropping positional ones (which
      // is how a keyless nested object used to serialize as `{}`). Nested object/array values recurse
      // through IO serialization (the `any` typedef), never JSON.stringify.
      const anyDef = TypedefRegistry.get('any')
      const renderValue = (value: any, key: string | undefined, index: number): void => {
        if (value === undefined) return

        let strValue: string
        if (value === null) {
          strValue = 'N'
        } else if (typeof value === 'boolean') {
          strValue = value ? 'T' : 'F'
        } else if (typeof value === 'string') {
          // Through the string typedef in `auto` form, NOT verbatim. Written bare, a string that
          // looks like another type stops being a string on the way back: "0" returned as the
          // number 0, "true" as a boolean, "  p" with its spaces trimmed. `auto` quotes exactly
          // when leaving it bare would change the value. The open-schema branch above already
          // did this; this branch — the no-schema one, which is where an untyped member's nested
          // object lands — did not.
          const stringDef = TypedefRegistry.get('string')
          strValue = (stringDef && 'stringify' in stringDef && typeof stringDef.stringify === 'function'
            ? stringDef.stringify(value, { type: 'string', path: basePath, format: 'auto' } as MemberDef, defs)
            : undefined) ?? value
        } else if (anyDef && 'stringify' in anyDef && typeof anyDef.stringify === 'function') {
          // number / bigint / Decimal / Date / array / nested object → IO serialization (not JSON)
          strValue = anyDef.stringify(value, { type: 'any', path: basePath } as MemberDef, defs) ?? JSON.stringify(value)
        } else {
          strValue = JSON.stringify(value)
        }

        const positional = !shouldEmitKey(key)
        parts.push(positional ? strValue : `${formatObjectKey(key!)}: ${strValue}`)
      }

      if (data && typeof data.forEach === 'function') {
        // IOObject: forEach yields (value, key, index) with the real positional index.
        data.forEach((value: any, key: string | undefined, index: number) => renderValue(value, key, index))
      } else {
        // Plain JS object fallback.
        let index = 0
        for (const key in data) { renderValue(data[key], key, index); index++ }
      }
    }

    return `{${parts.join(', ')}}`
  }

  /**
   * Resolves a schema reference - handles both Schema instances and variable references
   */
  private _resolveSchema(schema: Schema | TokenNode | string | undefined, defs?: Definitions): Schema | undefined {
    if (!schema) return undefined

    // Already a Schema instance
    if (schema instanceof Schema) return schema

    // TokenNode with variable reference (e.g., $employee)
    if (schema instanceof TokenNode) {
      if (typeof schema.value === 'string' && schema.value.startsWith('$') && defs) {
        const resolved = defs.getV(schema.value)
        if (resolved instanceof Schema) return resolved
        // Recursively resolve if it's another reference
        return this._resolveSchema(resolved, defs)
      }
      return undefined
    }

    // String variable reference
    if (typeof schema === 'string' && schema.startsWith('$') && defs) {
      const resolved = defs.getV(schema)
      if (resolved instanceof Schema) return resolved
      return this._resolveSchema(resolved, defs)
    }

    return undefined
  }

  /**
   * Resolves variable references in memberDef fields
   */
  private _resolveMemberDefVariables(memberDef: MemberDef, defs?: Definitions): MemberDef {
    if (!memberDef || !defs) return { ...memberDef }

    const resolved = { ...memberDef }

    // Resolve default value if it's a variable reference
    if (typeof resolved.default === 'string' && resolved.default.startsWith('@')) {
      resolved.default = defs.getV(resolved.default)
      if (resolved.default instanceof TokenNode) {
        resolved.default = resolved.default.value
      }
    }

    // Resolve choices if they contain variable references
    if (Array.isArray(resolved.choices)) {
      resolved.choices = resolved.choices.map(choice => {
        if (typeof choice === 'string' && choice.startsWith('@')) {
          let resolved = defs.getV(choice)
          return resolved instanceof TokenNode ? resolved.value : resolved
        }
        return choice
      })
    }

    // Resolve min/max if they're variable references
    if (typeof resolved.min === 'string' && resolved.min.startsWith('@')) {
      resolved.min = defs.getV(resolved.min)
      if (resolved.min instanceof TokenNode) {
        resolved.min = resolved.min.value
      }
    }
    if (typeof resolved.max === 'string' && resolved.max.startsWith('@')) {
      resolved.max = defs.getV(resolved.max)
      if (resolved.max instanceof TokenNode) {
        resolved.max = resolved.max.value
      }
    }

    return resolved
  }

  // Process the parse and load requests
  private _process = (
    node: Node, memberDef: MemberDef, defs?: Definitions
  ) => {
    // A `schema:` member may REFERENCE a definition (`{object, schema: $address}`) rather than
    // spell the shape inline. Keep the REFERENCE unresolved; do not substitute the schema it names.
    //
    // Resolving here was EAGER, and eager resolution cannot see a definition that is not finished
    // being built. Two silent consequences, neither of which raised an error:
    //   - a FORWARD reference bound the nested record positionally — `{x: 1}` decoded as `{"0": 1}`
    //   - a RECURSIVE schema is always forward to ITSELF, so it did so every single time
    // The short form (`home: $address`) has always stored the TokenNode and resolved on demand,
    // which is why recursion works there. Both spellings now behave identically.
    // See io-test-cases/ARCHITECTURE-RETROSPECTIVE.md (N3b).
    if (memberDef.__schema && node instanceof TokenNode &&
        typeof node.value === 'string' && node.value.startsWith('$')) {
      return node
    }

    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)

    if (changed) {
      return value
    }

    // Resolve schema - it might be a TokenNode reference (e.g., $schemaName)
    let schema = this._resolveSchema(memberDef.schema, defs)

    // A `schema:` member may REFERENCE an already-compiled definition (`{object, schema: $address}`)
    // rather than spell the shape inline. Such a reference resolves to a Schema, not an ObjectNode,
    // so it has to be accepted before the object-shape check below -- otherwise the long memberdef
    // form is rejected as `invalid-object`, and that form is the only way to mark a QUOTED member
    // name optional or nullable (`"a,b"?:` is not valid syntax).
    if (memberDef.__schema && valueNode instanceof Schema) {
      return valueNode
    }

    if (valueNode instanceof ObjectNode === false) {
      throw new ValidationError(ErrorCodes.invalidObject, `Expecting an object value for '${memberDef.path}'`, node)
    }

    if (valueNode === node) {
      if (memberDef.__schema) {
        return compileObject(memberDef.path || "", valueNode as ObjectNode, defs)
      }

      if (!schema) {
        schema = new Schema(memberDef.path || "")
        schema.open = true
      }
      return processObject(valueNode as ObjectNode, schema, defs)
    }

    // valueNode fetched from defs. Hence, in case of an error, replace the
    // error position with the original node.
    if (!schema) {
      schema = new Schema(memberDef.path || "")
      schema.open = true
    }

    try {
      return processObject(valueNode as ObjectNode, schema, defs)
    } catch (err) {
      if (err instanceof ValidationError) {
        err.positionRange = node
      }
      throw err
    }
  }
}

export default ObjectDef
