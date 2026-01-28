import MemberDef from './memberdef';
import { STANDARD_MEMBERDEF_PROPS, IO_MARKERS } from '../../serializer/serialization-constants';
import TokenNode from '../../parser/nodes/tokens';

/**
 * Stringifies a MemberDef into its schema definition format.
 *
 * @param memberDef The MemberDef to stringify
 * @param includeTypes Whether to include type annotations
 * @returns The stringified schema definition for this member
 *
 * @example
 * ```typescript
 * // Simple type
 * stringifyMemberDef({ type: 'string', path: 'name' }, true)
 * // → "string"
 *
 * // With constraints
 * stringifyMemberDef({ type: 'number', min: 0, max: 100 }, true)
 * // → "{number, min:0, max:100}"
 *
 * // Nested object (includes type annotations for reconstruction)
 * stringifyMemberDef({
 *   type: 'object',
 *   schema: { names: ['street', 'city'], defs: {...} }
 * }, true)
 * // → "{street: string, city: string}"
 *
 * // Schema variable reference
 * stringifyMemberDef({
 *   type: 'object',
 *   schema: new TokenNode('$address', {...})
 * }, true)
 * // → "$address"
 *
 * // Schema reference via schemaRef
 * stringifyMemberDef({
 *   type: 'object',
 *   schemaRef: '$address'
 * }, true)
 * // → "$address"
 * ```
 */
export function stringifyMemberDef(memberDef: MemberDef, includeTypes: boolean): string {
  // Handle array with schema reference - output as [$schemaRef]
  if (memberDef.type === 'array' && memberDef.schemaRef) {
    return `[${memberDef.schemaRef}]`;
  }

  // Handle object schema reference (schemaRef property)
  if (memberDef.schemaRef) {
    return memberDef.schemaRef;
  }

  // Handle nested objects with embedded schema
  if (memberDef.type === 'object' && memberDef.schema) {
    return formatNestedSchema(memberDef.schema);
  }

  // Skip type annotation if not requested or if type is 'any'
  if (!includeTypes || !memberDef.type || memberDef.type === 'any') {
    return '';
  }

  // Special handling for array type with 'of' property
  if (memberDef.type === 'array' && memberDef.of) {
    return stringifyArrayMemberDef(memberDef);
  }

  // Detect constraint properties
  const constraintProps = detectConstraintProperties(memberDef);

  // Format with or without constraints
  if (constraintProps.length > 0) {
    return formatTypeWithConstraints(memberDef.type, memberDef, constraintProps);
  } else {
    return memberDef.type;
  }
}

/**
 * Formats a nested object schema into {field1, field2, ...} notation.
 * Applies SRP by isolating nested schema formatting logic.
 *
 * Handles both:
 * - Schema instances: formats as {field1, field2, ...}
 * - Schema variable references (TokenNode with $name): outputs as $name
 *
 * @param schema The nested schema to format (Schema instance or TokenNode reference)
 * @returns Formatted nested object string or schema variable reference
 */
function formatNestedSchema(schema: any): string {
  // Handle schema variable reference (e.g., $employee, $address)
  if (schema instanceof TokenNode) {
    if (typeof schema.value === 'string' && schema.value.startsWith('$')) {
      return schema.value; // Return the reference as-is: $employee
    }
  }

  // Handle string reference directly
  if (typeof schema === 'string' && schema.startsWith('$')) {
    return schema;
  }

  const nestedFields: string[] = [];

  if (schema.names) {
    for (const nestedName of schema.names) {
      const nestedMember = schema.defs[nestedName];
      let nestedField = nestedName;

      if (nestedMember?.optional) {
        nestedField += IO_MARKERS.OPTIONAL;
      }
      if (nestedMember?.null) {
        nestedField += IO_MARKERS.NULLABLE;
      }

      // Add type annotation for nested member if it has constraints or is object/array
      const typeAnnotation = stringifyMemberDef(nestedMember, true);
      if (typeAnnotation) {
        nestedField += `: ${typeAnnotation}`;
      }

      nestedFields.push(nestedField);
    }
  }

  return `{${nestedFields.join(', ')}}`;
}

/**
 * Detects which MemberDef properties are constraints (non-standard properties).
 * Applies SRP by isolating constraint detection logic.
 *
 * @param memberDef The MemberDef to analyze
 * @returns Array of constraint property names
 */
function detectConstraintProperties(memberDef: MemberDef): string[] {
  const constraintProps: string[] = [];

  for (const key in memberDef) {
    if (!STANDARD_MEMBERDEF_PROPS.has(key) && memberDef[key] !== undefined) {
      constraintProps.push(key);
    }
  }

  return constraintProps;
}

/**
 * Formats a type with its constraints in bracket notation.
 *
 * @param type The base type name
 * @param memberDef The full MemberDef containing constraint values
 * @param constraintProps Array of constraint property names
 * @returns Formatted string: {type, key1:value1, key2:value2, ...}
 */
function formatTypeWithConstraints(
  type: string,
  memberDef: MemberDef,
  constraintProps: string[]
): string {
  const parts = [type];

  for (const prop of constraintProps) {
    const value = memberDef[prop];
    const formattedValue = formatConstraintValue(value);
    parts.push(`${prop}:${formattedValue}`);
  }

  return `{${parts.join(', ')}}`;
}

/**
 * Special handling for array type MemberDefs.
 *
 * @param memberDef The array MemberDef with 'of' property
 * @returns Formatted array type string
 *
 * @example
 * ```typescript
 * // Simple element type
 * stringifyArrayMemberDef({ type: 'array', of: 'string' })
 * // → "[string]"
 *
 * // Complex element type with constraints
 * stringifyArrayMemberDef({
 *   type: 'array',
 *   of: { type: 'number', min: 0, max: 100 }
 * })
 * // → "[{number, min:0, max:100}]"
 *
 * // Nested object element type
 * stringifyArrayMemberDef({
 *   type: 'array',
 *   of: { type: 'object', schema: { names: ['name', 'age'], defs: {...} } }
 * })
 * // → "[{name: string, age: number}]"
 * ```
 */
function stringifyArrayMemberDef(memberDef: MemberDef): string {
  const ofType = memberDef.of;

  // No element type specified
  if (!ofType) {
    return memberDef.type; // Just 'array'
  }

  // Simple string element type
  if (typeof ofType === 'string') {
    return `[${ofType}]`;
  }

  // Complex element type (MemberDef object)
  if (typeof ofType === 'object' && ofType.type) {
    const elementMemberDef = ofType as MemberDef;

    // Nested object with schema
    if (elementMemberDef.type === 'object' && elementMemberDef.schema) {
      const nestedFormat = formatNestedSchema(elementMemberDef.schema);
      return `[${nestedFormat}]`;
    }

    // Nested array (array of arrays)
    if (elementMemberDef.type === 'array' && elementMemberDef.of) {
      const nestedArrayFormat = stringifyArrayMemberDef(elementMemberDef);
      return `[${nestedArrayFormat}]`;
    }

    // Element type with constraints
    const constraintProps = detectConstraintProperties(elementMemberDef);
    if (constraintProps.length > 0) {
      const formatted = formatTypeWithConstraints(
        elementMemberDef.type,
        elementMemberDef,
        constraintProps
      );
      return `[${formatted}]`;
    }

    // Simple element type without constraints
    return `[${elementMemberDef.type}]`;
  }

  // Fallback: generic array
  return memberDef.type;
}

/**
 * Formats a constraint value for output in schema definition.
 * Handles primitives, arrays, and nested objects recursively.
 *
 * @param value The constraint value to format
 * @returns Formatted string representation
 */
export function formatConstraintValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'string') {
    // Escape quotes in string values
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === 'boolean') {
    return value ? IO_MARKERS.TRUE : IO_MARKERS.FALSE;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const formatted = value.map(v => formatConstraintValue(v));
    return `[${formatted.join(', ')}]`;
  }

  if (typeof value === 'object') {
    // For complex objects, use JSON representation
    // Future enhancement: recursive MemberDef formatting
    return JSON.stringify(value);
  }

  return String(value);
}
