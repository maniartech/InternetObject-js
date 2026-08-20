import MemberDef from './memberdef';
import { STANDARD_MEMBERDEF_PROPS, IO_MARKERS, WILDCARD_KEY } from '../../facade/serialization-constants';
import TokenNode from '../../parser/nodes/tokens';
import { formatObjectKey } from '../../utils/string-formatter';

/**
 * Schema object → the definition name it was declared under (`$address`).
 *
 * Compiling `{object, schema: $address}` REPLACES the reference with the resolved Schema, so by the
 * time the writer sees it there is no `$` anywhere in the MemberDef — and it used to inline the
 * whole shape, losing the name and leaving the definition in the header unreferenced. The resolved
 * object is IDENTICAL (`===`) to the one held in definitions, so this map recovers the name exactly.
 *
 * Identity, not `schema.name.startsWith('$')`: a member may legitimately be CALLED `$foo`
 * (`{$foo: string}` parses), and an inline schema is named after its member — so a prefix test
 * would report an inline shape under a member named `$foo` as a reference to a definition `$foo`.
 */
export type SchemaNames = ReadonlyMap<object, string>;
import TypedefRegistry from '../typedef-registry';

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
export function stringifyMemberDef(memberDef: MemberDef, includeTypes: boolean, named?: SchemaNames): string {
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
    return formatNestedSchema(memberDef.schema, named);
  }

  // Skip type annotation if not requested or if type is 'any'
  if (!includeTypes || !memberDef.type || memberDef.type === 'any') {
    return '';
  }

  // Special handling for array type with 'of' property
  if (memberDef.type === 'array' && memberDef.of) {
    return stringifyArrayMemberDef(memberDef, named);
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
function formatNestedSchema(schema: any, named?: SchemaNames): string {
  // A RESOLVED schema that is one of the document's definitions prints as its NAME. Without this
  // the shape was inlined on every re-write: the header grew a copy per use, the definition it came
  // from was left unreferenced, and two writes of one document produced different text.
  const definitionName = schema && typeof schema === 'object' ? named?.get(schema) : undefined;
  if (definitionName) return definitionName;

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
      nestedFields.push(stringifyMemberDeclaration(nestedName, nestedMember, true, named));
    }
  }

  // A nested schema may be OPEN (`{*: string}`, `{*: $item}`) just as a top-level one may.
  // Without this the wildcard was dropped and the schema serialized as `{}` -- a different
  // contract entirely, and one the data no longer validates against.
  // A TYPED wildcard lives in defs; a BARE one ({*}) is recorded only as `open === true`.
  const wildcard = schema.wildcard;
  if (wildcard) {
    const typeAnnotation = stringifyMemberDef(wildcard, true, named);
    nestedFields.push(typeAnnotation ? `${WILDCARD_KEY}: ${typeAnnotation}` : WILDCARD_KEY);
  } else if (schema.open === true) {
    nestedFields.push(WILDCARD_KEY);
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
  // `get` throws for an unregistered type; this is a formatter, so an unknown type simply means
  // no declared defaults are available and every property is emitted.
  const declared = TypedefRegistry.isRegisteredType(memberDef.type)
    ? (TypedefRegistry.get(memberDef.type).schema as any)
    : undefined;

  for (const key in memberDef) {
    if (STANDARD_MEMBERDEF_PROPS.has(key) || memberDef[key] === undefined) continue;
    // A constraint left at the type's own DEFAULT carries no information: the parser re-applies it
    // on the way back in. Emitting it makes serialization non-idempotent -- parse assigns the
    // default (`isSchema: F` on `any`, `format: "auto"` on `string`), the next write prints it, and
    // the text keeps growing on each round-trip.
    const def = declared?.defs?.[key]?.default;
    if (def !== undefined && Object.is(def, memberDef[key])) continue;
    constraintProps.push(key);
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
function stringifyArrayMemberDef(memberDef: MemberDef, named?: SchemaNames): string {
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
      const nestedFormat = formatNestedSchema(elementMemberDef.schema, named);
      return `[${nestedFormat}]`;
    }

    // Nested array (array of arrays)
    if (elementMemberDef.type === 'array' && elementMemberDef.of) {
      const nestedArrayFormat = stringifyArrayMemberDef(elementMemberDef, named);
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

/**
 * Emits one member DECLARATION -- its name, its optional/nullable markers and its type.
 *
 * The short markers (`name?`, `name*`) are part of the unquoted-name token, so they cannot follow a
 * QUOTED name: `"a,b"?: number` is a syntax error. A member whose name needs quoting (a comma, a
 * colon, a leading digit -- routine in JSON-sourced data) therefore declares those flags through the
 * long memberdef form instead:
 *
 * ```
 * "a,b": {number, optional: T, "null": T}
 * ```
 *
 * `null` is itself quoted there because a bare `null` key is read as the null keyword (`invalid-key`).
 *
 * Without this the serializer emitted `"a,b"?: number`, which its own parser then rejected -- the
 * document could be written but never read back.
 *
 * @param name The member name, unquoted
 * @param memberDef The member definition (may be undefined for a bare name)
 * @param includeTypes Whether to emit type annotations
 * @returns The declaration text, e.g. `name?: string` or `"a,b": {string, optional: T}`
 */
export function stringifyMemberDeclaration(
  name: string,
  memberDef: MemberDef | undefined,
  includeTypes: boolean,
  named?: SchemaNames
): string {
  const key = formatObjectKey(name);
  const optional = memberDef?.optional === true;
  const nullable = memberDef?.null === true;
  const typeAnnotation = memberDef ? stringifyMemberDef(memberDef, includeTypes, named) : '';

  // Short form: either the name is bare (markers are legal) or there are no markers to place.
  if (key === name || (!optional && !nullable)) {
    const markers = (optional ? IO_MARKERS.OPTIONAL : '') + (nullable ? IO_MARKERS.NULLABLE : '');
    return typeAnnotation ? `${key}${markers}: ${typeAnnotation}` : `${key}${markers}`;
  }

  const flags = [optional ? 'optional: T' : '', nullable ? '"null": T' : ''].filter(Boolean);
  return `${key}: {${[longFormBody(memberDef!, includeTypes, named), ...flags].join(', ')}}`;
}

/**
 * The body of a long memberdef form -- everything before the optional/nullable flags.
 *
 * Mirrors {@link stringifyMemberDef}, but produces the INSIDE of the braces (`number, min:0`)
 * rather than a self-contained annotation (`{number, min:0}`), so flags can be appended.
 */
function longFormBody(memberDef: MemberDef, includeTypes: boolean, named?: SchemaNames): string {
  if (memberDef.schemaRef) {
    return memberDef.type === 'array'
      ? `array, of: ${memberDef.schemaRef}`
      : `object, schema: ${memberDef.schemaRef}`;
  }

  if (memberDef.type === 'object' && memberDef.schema) {
    return `object, schema: ${formatNestedSchema(memberDef.schema, named)}`;
  }

  if (memberDef.type === 'array' && memberDef.of) {
    // stringifyArrayMemberDef yields `[elem]`; `of:` takes the element type on its own.
    const bracketed = stringifyArrayMemberDef(memberDef, named);
    return `array, of: ${bracketed.slice(1, -1)}`;
  }

  const type = includeTypes && memberDef.type ? memberDef.type : 'any';
  const parts = [type];
  for (const prop of detectConstraintProperties(memberDef)) {
    parts.push(`${prop}:${formatConstraintValue(memberDef[prop])}`);
  }
  return parts.join(', ');
}
