import MemberDef from './memberdef'
import TypedefRegistry from '../typedef-registry'

/**
 * Stringifies a MemberDef into its schema definition format.
 * This function knows how to render a MemberDef with its type and constraints.
 *
 * @param memberDef The MemberDef to stringify
 * @param includeTypes Whether to include type annotations
 * @returns The stringified schema definition for this member
 */
export function stringifyMemberDef(memberDef: MemberDef, includeTypes: boolean): string {
  // Handle nested objects first (they have special syntax)
  if (memberDef.type === 'object' && memberDef.schema) {
    // Nested object: {field1, field2, ...}
    const nestedFields: string[] = []
    const nestedSchema = memberDef.schema
    if (nestedSchema.names) {
      for (const nestedName of nestedSchema.names) {
        const nestedMember = nestedSchema.defs[nestedName]
        let nestedField = nestedName
        if (nestedMember && nestedMember.optional) {
          nestedField += '?'
        }
        nestedFields.push(nestedField)
      }
    }
    return `{${nestedFields.join(', ')}}`
  }

  // Don't include type annotation if not requested or if type is 'any'
  if (!includeTypes || !memberDef.type || memberDef.type === 'any') {
    return ''
  }

  // Check if there are constraints (properties beyond the standard MemberDef ones)
  // Note: 'default' and 'choices' are constraints that should be included in output
  const standardProps = [
    'type', 'optional', 'null', 'path', 'name', 'schema',
    // Type-specific internal properties that shouldn't be serialized
    're', '__memberdef', 'of' // 'of' is handled specially for arrays
  ]

  const constraintProps: string[] = []

  for (const key in memberDef) {
    if (!standardProps.includes(key) && memberDef[key] !== undefined) {
      constraintProps.push(key)
    }
  }

  // Special handling for array type with 'of' property
  if (memberDef.type === 'array' && memberDef.of) {
    // Arrays are more complex - handle them specially
    return stringifyArrayMemberDef(memberDef)
  }

  // Add type annotation with or without constraints
  if (constraintProps.length > 0) {
    // Has constraints: output as {type, constraint1:value1, constraint2:value2, ...}
    const constraintParts = [memberDef.type]
    for (const prop of constraintProps) {
      const value = memberDef[prop]
      // Format the value appropriately
      const formattedValue = formatConstraintValue(value)
      constraintParts.push(`${prop}:${formattedValue}`)
    }
    return `{${constraintParts.join(', ')}}`
  } else {
    // No constraints: simple type annotation
    return memberDef.type
  }
}

/**
 * Special handling for array type MemberDefs
 */
function stringifyArrayMemberDef(memberDef: MemberDef): string {
  // TODO: Implement proper array stringification with 'of' type
  // For now, just return 'array'
  return memberDef.type
}

/**
 * Formats a constraint value for output in schema definition
 */
function formatConstraintValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'boolean') return value ? 'T' : 'F'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    // Format array constraints like choices: [val1, val2, ...]
    const formatted = value.map(v => formatConstraintValue(v))
    return `[${formatted.join(', ')}]`
  }
  if (typeof value === 'object') {
    // For complex objects, use JSON representation
    return JSON.stringify(value)
  }
  return String(value)
}
