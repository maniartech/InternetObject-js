# Type System Implementation Guide (Simplified collectionIndex model)

Document Version: 2.2
Date: November 18, 2025
Status: Implementation Ready (collectionIndex fully removed from all TypeDef signatures)

## Overview

This guide explains how to implement the enhanced type system with unified validation shared by `parse()`, `load()`, and `stringify()` while keeping method signatures minimal. The previously proposed `collectionIndex` parameter has been removed: positional context for collection items is now applied only at the collection/object processing boundary when constructing error envelopes.

## Prerequisites

1. Review `./ARCHITECTURE-TYPE-SYSTEM.md` (updated version 1.1)
2. Inspect current types in `src/schema/types/`
3. Run baseline tests: `yarn test`

## Simplified Interfaces

```typescript
export default interface TypeDef {
  get type(): string
  get schema(): Schema
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): any
  load(value: any, memberDef: MemberDef, defs?: Definitions): any
  stringify(value: any, memberDef: MemberDef, defs?: Definitions): string
}
```

`doCommonTypeCheck` retains its role (null/undefined/default/choices/variable resolution) without positional parameters:

```typescript
type CommonTypeCheckResult = { value: any; handled: boolean }

function doCommonTypeCheck(
  memberDef: MemberDef,
  value: any,
  node?: Node,
  defs?: Definitions,
  equalityComparator?: EqualityComparator
): CommonTypeCheckResult
```

## Unified Usage Pattern

```typescript
// parse()
const { value, handled } = doCommonTypeCheck(memberDef, node, node, defs)
if (handled) return value
// token-type check then validateValue()

// load()
const { value, handled } = doCommonTypeCheck(memberDef, rawValue, undefined, defs)
if (handled) return value
// JS type check then validateValue()

// stringify()
const { value, handled } = doCommonTypeCheck(memberDef, rawValue, undefined, defs)
if (handled) {
  if (value === null) return 'N'
  if (value === undefined) return ''
  if (typeof value === 'string') return formatToIOText(value, memberDef)
}
const validated = validateValue(rawValue, memberDef)
return formatToIOText(validated, memberDef)
```

## Example: StringDef (Simplified)

```typescript
class StringDef implements TypeDef {
  get type() { return 'string' }
  get schema(): Schema { return { /* ... */ } }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): string {
    const valueNode = defs?.getV(node) || node
    const { value, handled } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (handled) return value
    if (!(valueNode instanceof TokenNode) || valueNode.type !== TokenType.STRING) {
      throw new ValidationError(ErrorCodes.notAString, 'Expecting a string token', valueNode)
    }
    return this.validateValue(valueNode.value, memberDef, valueNode)
  }

  load(value: any, memberDef: MemberDef, defs?: Definitions): string {
    const { value: checked, handled } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (handled) return checked
    if (typeof value !== 'string') {
      throw new ValidationError(ErrorCodes.notAString, `Expecting string got ${typeof value}`)
    }
    return this.validateValue(value, memberDef)
  }

  stringify(value: any, memberDef: MemberDef, defs?: Definitions): string {
    const { value: checked, handled } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (handled) {
      if (checked === null) return 'N'
      if (checked === undefined) return ''
      if (typeof checked === 'string') return this.formatToIOText(checked, memberDef)
    }
    const validated = this.validateValue(value, memberDef)
    return this.formatToIOText(validated, memberDef)
  }

  private validateValue(value: string, memberDef: MemberDef, node?: Node): string {
    // pattern
    // length constraints
    // choices already handled by common check
    return value
  }

  private formatToIOText(value: string, memberDef: MemberDef): string {
    switch (memberDef.format || 'auto') {
      case 'open': return strings.toOpenString(value, memberDef.escapeLines)
      case 'regular': return strings.toRegularString(value, memberDef.escapeLines, memberDef.encloser)
      case 'raw': return strings.toRawString(value, memberDef.encloser)
      default: return strings.toAutoString(value, memberDef.escapeLines, memberDef.encloser)
    }
  }
}
```

## Implementation Phases (Recap)

1. Common check refactor (handled flag) – DONE
2. Extract `validateValue()` per TypeDef – DONE
3. Add `load()` across types – DONE (strict mode)
4. Enhance `stringify()` with validation – DONE
5. Integrate with object/array processors and public facade – IN PROGRESS

## Removing collectionIndex: Rationale

| Aspect | Old Approach (propagate) | New Approach (boundary only) |
|--------|--------------------------|------------------------------|
| Method signatures | Verbose (extra param) | Minimal & cleaner |
| Error context | Built incrementally | Applied once when wrapping errors |
| Risk of omission | High (forgot to forward) | None inside types |
| Future streaming | Needs param threading | Boundary context object scales |

Boundary layer (array/object processor) maintains `ItemContext { index?: number; rootPath: string }` while iterating collection items. When a ValidationError surfaces, it is wrapped into the public error envelope; if an index exists it is injected then. Nested arrays compose path segments (`users[3].email`) without relying on a separate index parameter inside type defs.

## Error Envelope Integration

TypeDefs throw `ValidationError(code, message, node?)`. A higher layer:

```typescript
function wrapError(err: ValidationError, ctx: ItemContext, memberDef: MemberDef) {
  return {
    __error: true,
    code: err.code,
    category: 'validation',
    message: err.message,
    path: ctx.index !== undefined ? `${memberDef.path}[${ctx.index}]` : memberDef.path,
    collectionIndex: ctx.index,
    position: err.positionStart,
    endPosition: err.positionEnd
  }
}
```

## Updating Existing Code

1. Remove `collectionIndex` parameters from all TypeDef methods.
2. Update calls to `doCommonTypeCheck` (drop index argument).
3. Adjust array/object processors to build item path strings including indices, but keep TypeDef calls simple.
4. Modify error wrapping utility to attach `collectionIndex` from iteration context.
5. Update tests: remove parameter expectations; assert error envelopes still carry correct index.

## Testing Checklist

- Parse/load/stringify work for primitive & composite types.
- Error messages include indexed path for collection items.
- Mixed success collection parsing preserves order; errors have `collectionIndex` only in envelope.
- No TypeDef signature includes index.
- Round-trip: load → stringify → parse preserves data and paths.

## Performance Notes

Removing the parameter slightly reduces call-site overhead and clarifies responsibility boundaries. Further optimizations: cache regex patterns; avoid path string rebuilds unless an error occurs (lazy path composition for success cases).

## Migration (From older docs/code)

See `MIGRATION-COLLECTION-INDEX.md` for before/after signature reference and automated refactor suggestions.

## Next Steps

1. Refactor source TypeDefs (if not yet done).
2. Implement boundary error wrapping utility.
3. Update object/array processors for indexed path composition.
4. Refresh tests & add collection mixed success test.
5. Benchmark parse vs load vs stringify to ensure targets (<10%, <20% overhead).

---
**Document Version**: 2.1
**Status**: Updated for simplified collection index handling
**File**: `src/schema/types/number.ts`

Already has `validateInteger()` method - good! Rename to `validateValue()` for consistency:

```typescript
// OLD
validateInteger(memberDef: MemberDef, value: any, node?: Node): number

// NEW
private validateValue(value: number, memberDef: MemberDef, node?: Node): number
```

**Update**: Make it private and adjust signature to match pattern.

### 2.3 BooleanDef Example

**File**: `src/schema/types/boolean.ts`

BooleanDef is simple - validation is just type checking. No need for separate method.

### 2.4 Pattern for All Types

**Extraction Checklist**:

- [ ] Create private `validateValue()` method
- [ ] Move all constraint validation logic into it
- [ ] Keep type checking (TokenNode checks) in `parse()`
- [ ] Method signature: `private validateValue(value: T, memberDef: MemberDef, node?: Node): T`
- [ ] Return the validated value
- [ ] Add comprehensive JSDoc
- [ ] Write unit tests for `validateValue()` logic

## Phase 3: Implement Load Operation

### 3.1 Update TypeDef Interface

**File**: `src/schema/typedef.ts`

```typescript
export default interface TypeDef {
  get type(): string
  get schema(): Schema

  /**
   * Parses text format (Node/TokenNode) into validated JavaScript value
   */
  parse(node: Node, memberDef: MemberDef, definitions?: Definitions): any

  /**
   * Loads and validates a JavaScript value
   * Ensures the value conforms to memberDef constraints
   *
   * @param value - Raw JavaScript value to validate
   * @param memberDef - Member definition with constraints
   * @param definitions - Optional definitions for variable resolution
   * @returns Validated and potentially normalized value
   * @throws ValidationError if value doesn't meet constraints
   */
  load(value: any, memberDef: MemberDef, definitions?: Definitions): any

  /**
   * Converts a validated JavaScript value to IO text format
   *
   * @param value - JavaScript value to convert to IO format
   * @param memberDef - Member definition for formatting hints
   * @param definitions - Optional definitions for variable resolution
   * @returns IO text representation
   * @throws ValidationError if value is invalid
   */
  stringify(value: any, memberDef: MemberDef, definitions?: Definitions): string
}
```

### 3.2 Implement Load for StringDef

**File**: `src/schema/types/string.ts`

```typescript
/**
 * Loads and validates a JavaScript value as a string
 */
load(value: any, memberDef: MemberDef, defs?: Definitions): string {
  // Common validation (null, undefined, default, choices)
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined, // No node for load operation
    defs
  )
  if (handled) return checkedValue

  // Type check
  if (typeof value !== 'string') {
    const actualType = value === null ? 'null' : typeof value
    throw new ValidationError(
      ErrorCodes.notAString,
      `Expecting a string value for '${memberDef.path}' but found ${actualType}: ${JSON.stringify(value)}`,
      undefined
    )
  }

  // Shared validation logic
  return this.validateValue(value, memberDef)
}
```

### 3.3 Implement Load for NumberDef

**File**: `src/schema/types/number.ts`

```typescript
load(value: any, memberDef: MemberDef, defs?: Definitions): number | bigint | Decimal {
  // Delegate to specialized type if available
  if (this._delegateTypeDef && 'load' in this._delegateTypeDef) {
    return (this._delegateTypeDef as any).load(value, memberDef, defs)
  }

  // Common validation
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs
  )
  if (handled) return checkedValue

  // Type check with coercion for numeric strings (optional, can be strict)
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (isNaN(parsed)) {
      throw new ValidationError(
        ErrorCodes.invalidType,
        `Cannot convert string "${value}" to number for '${memberDef.path}'`,
        undefined
      )
    }
    value = parsed
  }

  if (typeof value !== 'number') {
    throw new ValidationError(
      ErrorCodes.invalidType,
      `Expecting a number value for '${memberDef.path}' but found ${typeof value}`,
      undefined
    )
  }

  // Shared validation
  return this.validateValue(value, memberDef)
}
```

### 3.4 Implement Load for BooleanDef

**File**: `src/schema/types/boolean.ts`

```typescript
load(value: any, memberDef: MemberDef, defs?: Definitions): boolean {
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs
  )
  if (handled) return checkedValue

  // Type check (strict - no coercion)
  if (typeof value !== 'boolean') {
    throw new ValidationError(
      ErrorCodes.notABool,
      `Expecting a boolean value for '${memberDef.path}' but found ${typeof value}`,
      undefined
    )
  }

  return value
}
```

### 3.5 Implement Load for ArrayDef

**File**: `src/schema/types/array.ts`

```typescript
load(value: any, memberDef: MemberDef, defs?: Definitions): any[] {
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs
  )
  if (handled) return checkedValue

  // Type check
  if (!Array.isArray(value)) {
    throw new ValidationError(
      ErrorCodes.notAnArray,
      `Expecting an array value for '${memberDef.path}' but found ${typeof value}`,
      undefined
    )
  }

  // Find the right typeDef for array items
  let typeDef: TypeDef | undefined
  let arrayMemberDef: MemberDef = { type: 'any' }

  if (memberDef.of instanceof Schema) {
    typeDef = TypedefRegistry.get('object')
    arrayMemberDef.schema = memberDef.of
    arrayMemberDef.path = memberDef.path
  } else if (memberDef.of?.type) {
    typeDef = TypedefRegistry.get(memberDef.of.type)
    if (!typeDef) {
      throw new ValidationError(
        ErrorCodes.invalidType,
        `Invalid type definition '${memberDef.of.type}'`,
        undefined
      )
    }
    arrayMemberDef = memberDef.of
    arrayMemberDef.path = memberDef.path
  } else {
    typeDef = TypedefRegistry.get('any')
  }

  // Load each item
  const array: any[] = []
  for (let i = 0; i < value.length; i++) {
    const item = value[i]
    // Use load instead of parse
    if (typeDef && 'load' in typeDef) {
      array.push((typeDef as any).load(item, arrayMemberDef, defs))
    } else {
      // Fallback for types that don't have load yet
      array.push(item)
    }
  }

  // Validate length constraints
  this.validateLength(array, memberDef)

  return array
}

private validateLength(array: any[], memberDef: MemberDef): void {
  const arrayLength = array.length

  if (memberDef.len !== undefined && arrayLength !== memberDef.len) {
    throw new ValidationError(
      ErrorCodes.invalidLength,
      `The "${memberDef.path || 'array'}" must have exactly ${memberDef.len} items, but has ${arrayLength}.`,
      undefined
    )
  }

  if (memberDef.minLen !== undefined && arrayLength < memberDef.minLen) {
    throw new ValidationError(
      ErrorCodes.outOfRange,
      `The "${memberDef.path || 'array'}" must have at least ${memberDef.minLen} items, but has ${arrayLength}.`,
      undefined
    )
  }

  if (memberDef.maxLen !== undefined && arrayLength > memberDef.maxLen) {
    throw new ValidationError(
      ErrorCodes.outOfRange,
      `The "${memberDef.path || 'array'}" must have at most ${memberDef.maxLen} items, but has ${arrayLength}.`,
      undefined
    )
  }
}
```

### 3.6 Implement Load for ObjectDef

**File**: `src/schema/types/object.ts`

```typescript
load(value: any, memberDef: MemberDef, defs?: Definitions): any {
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs
  )
  if (handled) return checkedValue

  // Type check
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(
      ErrorCodes.invalidObject,
      `Expecting an object value for '${memberDef.path}'`,
      undefined
    )
  }

  const schema = memberDef.schema
  if (!schema) {
    // No schema - return as-is for open objects
    return value
  }

  // Process object with schema
  return this.loadObject(value, schema, defs)
}

/**
 * Loads a plain JavaScript object according to schema
 */
private loadObject(data: any, schema: Schema, defs?: Definitions): any {
  const result: any = {}
  const processedNames = new Set<string>()

  // Process schema-defined members
  for (const name of schema.names) {
    const memberDef = schema.defs[name]
    const value = data[name]

    const typeDef = TypedefRegistry.get(memberDef.type)
    if (!typeDef) {
      throw new Error(`Type ${memberDef.type} is not registered.`)
    }

    // Load the value (with validation)
    if ('load' in typeDef) {
      const loadedValue = (typeDef as any).load(value, memberDef, defs)
      if (loadedValue !== undefined) {
        result[name] = loadedValue
      }
    } else {
      // Fallback for types without load
      if (value !== undefined) {
        result[name] = value
      }
    }

    processedNames.add(name)
  }

  // Handle additional properties if schema is open
  if (schema.open) {
    for (const key in data) {
      if (!processedNames.has(key)) {
        result[key] = data[key]
      }
    }
  } else {
    // Check for unexpected properties in closed schemas
    for (const key in data) {
      if (!processedNames.has(key)) {
        throw new ValidationError(
          ErrorCodes.unknownMember,
          `The ${schema.name ? `${schema.name} ` : ''}schema does not define a member named '${key}'.`,
          undefined
        )
      }
    }
  }

  return result
}
```

## Phase 4: Implement Stringify Operation

### 4.1 Implement Stringify for StringDef

**File**: `src/schema/types/string.ts`

```typescript
/**
 * Converts a string value to IO text format with validation
 */
stringify(value: any, memberDef: MemberDef, defs?: Definitions): string {
  // Handle null/undefined special cases
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs
  )

  if (handled) {
    if (checkedValue === null) return 'N'
    if (checkedValue === undefined) return '' // or throw?
    if (typeof checkedValue === 'string') {
      // Was a default value or from choices
      return this.formatToIOText(checkedValue, memberDef)
    }
  }

  // Validate before serialization
  const validatedValue = this.validateValue(value, memberDef)

  // Format to IO text
  return this.formatToIOText(validatedValue, memberDef)
}

/**
 * Formats a validated string value to IO text format
 */
private formatToIOText(value: string, memberDef: MemberDef): string {
  const format = memberDef.format || 'auto'
  switch (format) {
    case 'auto':
      return strings.toAutoString(value, memberDef.escapeLines, memberDef.encloser)
    case 'open':
      return strings.toOpenString(value, memberDef.escapeLines)
    case 'regular':
      return strings.toRegularString(value, memberDef.escapeLines, memberDef.encloser)
    default:
      return strings.toRawString(value, memberDef.encloser)
  }
}
```

### 4.2 Enhance Stringify for NumberDef

**File**: `src/schema/types/number.ts`

Current `stringify()` method needs validation enhancement:

```typescript
// Enhanced with validation
stringify(value: any, memberDef: MemberDef, defs?: Definitions): string {
  // Delegate to specialized type if available
  if (this._delegateTypeDef && 'stringify' in this._delegateTypeDef) {
    return (this._delegateTypeDef as any).stringify(value, memberDef, defs)
  }

  // Common validation
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs
  )

  if (handled) {
    if (checkedValue === null) return 'N'
    if (checkedValue === undefined) return ''
    value = checkedValue
  }

  // Validate before serialization
  const validatedValue = this.validateValue(value, memberDef)

  // Format based on memberDef.format
  return this.formatToIOText(validatedValue, memberDef)
}

private formatToIOText(value: number, memberDef: MemberDef): string {
  if (memberDef.format === 'scientific') return value.toExponential()
  if (memberDef.format === 'hex') return '0x' + value.toString(16)
  if (memberDef.format === 'octal') return '0o' + value.toString(8)
  if (memberDef.format === 'binary') return '0b' + value.toString(2)

  return value.toString()
}
```

### 4.3 Pattern for All Types

**Stringify Implementation Checklist**:

- [ ] Handle null/undefined via doCommonTypeCheck
- [ ] Validate value before stringifying using `validateValue()`
- [ ] Format to IO text representation
- [ ] Handle format options (if applicable)
- [ ] Return string representation

## Phase 5: Integration & Testing

### 5.1 Update Object Processor

**File**: `src/schema/object-processor.ts`

Add `loadObject()` and `loadCollection()` functions similar to `processObject()`:

```typescript
/**
 * Loads and validates a plain JavaScript object according to schema
 */
export function loadObject(
  data: any,
  schema: Schema | string,
  defs?: Definitions
): InternetObject {
  // Resolve schema if it's a string reference
  if (typeof schema === 'string') {
    const resolvedSchema = defs?.getV(schema)
    if (!(resolvedSchema instanceof Schema)) {
      throw new Error(`Schema '${schema}' not found or invalid`)
    }
    schema = resolvedSchema
  }

  // Use ObjectDef.load() method
  const objectTypeDef = TypedefRegistry.get('object')
  if (!objectTypeDef || !('load' in objectTypeDef)) {
    throw new Error('ObjectDef not available or does not support load')
  }

  const memberDef: MemberDef = {
    type: 'object',
    schema: schema,
    path: schema.name || 'root'
  }

  return (objectTypeDef as any).load(data, memberDef, defs)
}

/**
 * Loads and validates an array of JavaScript objects as a collection
 */
export function loadCollection(
  dataArray: any[],
  schema: Schema | string,
  defs?: Definitions,
  validationErrors?: Error[]
): any[] {
  // Resolve schema
  if (typeof schema === 'string') {
    const resolvedSchema = defs?.getV(schema)
    if (!(resolvedSchema instanceof Schema)) {
      throw new Error(`Schema '${schema}' not found or invalid`)
    }
    schema = resolvedSchema
  }

  const results: any[] = []

  for (let i = 0; i < dataArray.length; i++) {
    try {
      const loaded = loadObject(dataArray[i], schema, defs)
      results.push(loaded)
    } catch (error) {
      if (validationErrors) {
        // Error accumulation mode: store error and continue
        validationErrors.push(error as Error)
        results.push(error) // Placeholder for error in collection
      } else {
        // Fail-fast mode: throw immediately
        throw error
      }
    }
  }

  return results
}
```

**Important**: Error context for collection items:

- **Boundary wrapping**: Collection processors track item position and inject `collectionIndex` into error envelopes only when wrapping ValidationErrors
- **TypeDef simplicity**: TypeDef methods remain clean without positional parameters
- **Path composition**: Indexed paths like "users[3].email" are built at the boundary layer, not inside TypeDefs

### 5.2 Update High-Level API

#### 5.2.1 Document-Level Load and Stringify

**File**: `src/facade.ts`

Add functions for loading JavaScript data into IODocuments and serializing back:

```typescript
import parse from './parser'
import Definitions from './core/definitions'
import IODocument from './core/document'
import Schema from './schema/schema'

/**
 * Loads JavaScript data (objects/arrays) and validates against schema.
 * Creates an IODocument from plain JavaScript values.
 *
 * @param data - JavaScript data to load (single object, array, or multiple sections)
 * @param schema - Schema or schema name to validate against
 * @param defs - Optional definitions for variable resolution and schema lookup
 * @returns IODocument with validated data
 * @throws ValidationError if data doesn't conform to schema
 *
 * @example
 * ```typescript
 * const defs = io.defs`
 *   $person: { name: string, age: number }
 * `
 *
 * const doc = io.loadDocument(
 *   { name: 'John', age: 30 },
 *   '$person',
 *   defs
 * )
 * ```
 */
export function ioLoadDocument(
  data: any,
  schema: Schema | string,
  defs?: Definitions
): IODocument {
  // Resolve schema if it's a string reference
  let resolvedSchema: Schema
  if (typeof schema === 'string') {
    const schemaValue = defs?.getV(schema)
    if (!(schemaValue instanceof Schema)) {
      throw new Error(`Schema '${schema}' not found or invalid`)
    }
    resolvedSchema = schemaValue
  } else {
    resolvedSchema = schema
  }

  // Load the data using ObjectDef.load() or ArrayDef.load()
  const loadedData = loadObject(data, resolvedSchema, defs)

  // Wrap in IODocument structure
  const header = new IOHeader(defs || new Definitions())
  const section = new IOSection(resolvedSchema.name, loadedData, resolvedSchema)
  const sections = new IOSectionCollection([section])

  return new IODocument(header, sections)
}

/**
 * Stringifies an IODocument to IO text format.
 * Validates data during serialization.
 *
 * @param document - IODocument to stringify
 * @param options - Serialization options
 * @returns IO text representation
 *
 * @example
 * ```typescript
 * const doc = io.doc`
 *   ~ name: string, age: number
 *   ---
 *   John, 30
 * `
 *
 * const text = io.stringifyDocument(doc)
 * // Output: "~ name: string, age: number\n---\nJohn, 30"
 * ```
 */
export function ioStringifieDocument(
  document: IODocument,
  options?: { includeHeader?: boolean; format?: 'compact' | 'pretty' }
): string {
  const lines: string[] = []

  // Stringify header (definitions and schema)
  if (options?.includeHeader !== false && document.header) {
    const headerText = stringifyHeader(document.header)
    if (headerText) {
      lines.push(headerText)
    }
  }

  // Stringify sections
  if (document.sections) {
    for (let i = 0; i < document.sections.length; i++) {
      const section = document.sections.get(i)
      if (section) {
        if (lines.length > 0) lines.push('---')
        lines.push(stringifySection(section, options))
      }
    }
  }

  return lines.join('\n')
}

/**
 * Helper: Stringifies a section's data
 */
function stringifySection(
  section: IOSection,
  options?: { format?: 'compact' | 'pretty' }
): string {
  const data = section.data
  const schema = section.schema

  if (!schema) {
    throw new Error('Cannot stringify section without schema')
  }

  // Stringify collection or single object
  if (data instanceof IOCollection) {
    return stringifyCollection(data, schema, options)
  } else if (data instanceof IOObject) {
    return stringifyObject(data, schema, options)
  } else {
    throw new Error('Unsupported section data type')
  }
}

/**
 * Helper: Converts an IOObject to IO text using TypeDef.stringify()
 */
function stringifyObject(
  obj: IOObject,
  schema: Schema,
  options?: { format?: 'compact' | 'pretty' }
): string {
  const objectTypeDef = TypedefRegistry.get('object')
  if (!objectTypeDef || !('stringify' in objectTypeDef)) {
    throw new Error('ObjectDef does not support stringify')
  }

  const memberDef: MemberDef = {
    type: 'object',
    schema: schema,
    path: schema.name || 'root'
  }

  return (objectTypeDef as any).stringify(obj.toJSON(), memberDef)
}

/**
 * Helper: Stringifies an IOCollection
 */
function stringifyCollection(
  collection: IOCollection,
  schema: Schema,
  options?: { format?: 'compact' | 'pretty' }
): string {
  const lines: string[] = []

  // Stringify schema header (if not already in document header)
  const schemaLine = stringifySchemaDefinition(schema)
  lines.push(schemaLine)

  // Stringify each item
  for (let i = 0; i < collection.length; i++) {
    const item = collection.get(i)
    if (item instanceof IOObject) {
      const itemText = stringifyObject(item, schema, options)
      lines.push(itemText)
    }
  }

  return lines.join('\n')
}
```

#### 5.2.2 Export New Functions

**File**: `src/facade.ts`

Update exports:

```typescript
export {
  ioDefinitions,
  ioDocument,
  ioObject,
  ioLoadDocument,      // NEW
  ioStringifieDocument  // NEW
}

export default {
  // Template functions
  doc: ioDocument,
  object: ioObject,
  defs: ioDefinitions,
  document: ioDocument,
  definitions: ioDefinitions,

  // Load/Stringify functions
  load: ioLoadDocument,           // NEW
  loadDocument: ioLoadDocument,   // NEW
  stringify: ioStringifieDocument, // NEW
  stringifyDocument: ioStringifieDocument, // NEW

  // Core types...
}
```

#### 5.2.3 Usage Examples

**Loading JavaScript Data**:

```typescript
import io from 'internet-object'

// Define schema
const defs = io.defs`
  $person: { name: string, age: number, email?: email }
`

// Load and validate JavaScript data
const userData = {
  name: 'Alice',
  age: 28,
  email: 'alice@example.com'
}

const doc = io.loadDocument(userData, '$person', defs)

// Access validated data
console.log(doc.toJSON())
// { name: 'Alice', age: 28, email: 'alice@example.com' }
```

**Serializing IODocument**:

```typescript
import io from 'internet-object'

// Parse IO text
const doc = io.doc`
  ~ name: string, age: number
  ---
  Alice, 28
  Bob, 35
`

// Stringify back to IO text
const text = io.stringifyDocument(doc)
console.log(text)
// Output:
// ~ name: string, age: number
// ---
// Alice, 28
// Bob, 35
```

**Round-Trip Validation**:

```typescript
// Load JS data → IODocument
const doc1 = io.loadDocument(jsData, schema, defs)

// Stringify → IO text
const ioText = io.stringifyDocument(doc1)

// Parse → IODocument
const doc2 = io.parse(ioText, defs)

// Should be equivalent
assert.deepEqual(doc1.toJSON(), doc2.toJSON())
```

### 5.3 Testing Strategy

#### Unit Tests Template

```typescript
// tests/schema/types/string-load-stringify.test.ts
import StringDef from '../../../src/schema/types/string'
import MemberDef from '../../../src/schema/types/memberdef'

describe('StringDef - Load Operation', () => {
  const stringDef = new StringDef()

  describe('load', () => {
    it('should load valid string', () => {
      const memberDef: MemberDef = { type: 'string', path: 'test' }
      const result = stringDef.load('hello', memberDef)
      expect(result).toBe('hello')
    })

    it('should throw on non-string', () => {
      const memberDef: MemberDef = { type: 'string', path: 'test' }
      expect(() => stringDef.load(123, memberDef)).toThrow()
    })

    it('should validate length constraints', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        minLen: 5,
        maxLen: 10
      }

      expect(() => stringDef.load('abc', memberDef)).toThrow() // too short
      expect(stringDef.load('hello', memberDef)).toBe('hello')
      expect(() => stringDef.load('verylongstring', memberDef)).toThrow() // too long
    })

    it('should handle null when allowed', () => {
      const memberDef: MemberDef = { type: 'string', path: 'test', null: true }
      const result = stringDef.load(null, memberDef)
      expect(result).toBeNull()
    })

    it('should use default when undefined', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        default: 'default-value'
      }
      const result = stringDef.load(undefined, memberDef)
      expect(result).toBe('default-value')
    })

    it('should validate choices', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        choices: ['red', 'green', 'blue']
      }

      expect(stringDef.load('red', memberDef)).toBe('red')
      expect(() => stringDef.load('yellow', memberDef)).toThrow()
    })

    it('should validate pattern', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        pattern: '^[A-Z][a-z]+$'
      }

      expect(stringDef.load('Hello', memberDef)).toBe('Hello')
      expect(() => stringDef.load('hello', memberDef)).toThrow()
      expect(() => stringDef.load('HELLO', memberDef)).toThrow()
    })
  })

  describe('stringify', () => {
    it('should convert valid string to IO format', () => {
      const memberDef: MemberDef = { type: 'string', path: 'test' }
      const result = stringDef.stringify('hello', memberDef)
      expect(result).toBe('"hello"') // or based on format
    })

    it('should validate before stringifying', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        minLen: 5
      }

      expect(() => stringDef.stringify('abc', memberDef)).toThrow()
    })

    it('should handle null', () => {
      const memberDef: MemberDef = { type: 'string', path: 'test', null: true }
      const result = stringDef.stringify(null, memberDef)
      expect(result).toBe('N')
    })

    it('should respect format option', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        format: 'raw'
      }
      const result = stringDef.stringify('hello', memberDef)
      // Assert based on raw format
    })
  })
})
```

#### Integration Tests

```typescript
// tests/integration/load-stringify-roundtrip.test.ts
describe('Load-Stringify-Parse Round-trip', () => {
  it('should maintain data integrity through round-trip', () => {
    const schema = new Schema('person',
      { name:   { type: 'string' } },
      { age:    { type: 'number', min: 0, max: 150 } },
      { active: { type: 'bool' } }
    )

    // Original JS object
    const original = {
      name: 'John Doe',
      age: 30,
      active: true
    }

    // Load (validate)
    const loaded = InternetObject.load(original, schema)

    // Stringify to text
    const stringified = loaded.stringify(schema)

    // Parse back
    const parsed = InternetObject.parse(stringifyd, schema)

    // Should match original
    expect(parsed.toObject()).toEqual(original)
  })
})
```

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting Node Parameter

**Problem**: Calling `validateValue()` from `parse()` without passing node.

**Solution**:

```typescript
// WRONG
return this.validateValue(value, memberDef) // Loses error position

// RIGHT
return this.validateValue(value, memberDef, node)
```

### Pitfall 2: Not Handling Delegated Types

**Problem**: NumberDef delegates to BigIntDef/DecimalDef - must implement load/stringify there too.

**Solution**: Implement all three methods in delegated types.

### Pitfall 3: Validation Side Effects

**Problem**: Validation methods modifying values.

**Solution**: Keep validation pure - return validated value, don't mutate.

### Pitfall 4: Error Messages Without Context

**Problem**: Error messages not including memberDef.path.

**Solution**: Always include `${memberDef.path}` in error messages.

## Code Review Checklist

Before submitting PR:

- [ ] All TypeDefs implement `load()` and `stringify()`
- [ ] Validation extracted to `validateValue()` or equivalent
- [ ] No duplication between parse/load/stringify
- [ ] All error messages include context (path)
- [ ] Tests cover happy path and error cases
- [ ] Tests include round-trip scenarios
- [ ] JSDoc comments complete
- [ ] `yarn test` passes
- [ ] `yarn lint` passes (if applicable)
- [ ] Performance impact measured (if applicable)

## Rollout Strategy

### Stage 1: Core Types

Implement load/stringify for:

- StringDef
- NumberDef
- BooleanDef

Deploy and test thoroughly.

### Stage 2: Complex Types

Implement for:

- ArrayDef
- ObjectDef

Deploy and test.

### Stage 3: Specialized Types

Implement for:

- DateTimeDef
- DecimalDef
- BigIntDef
- AnyDef

Deploy and test.

### Stage 4: Integration

- Update object-processor
- Update high-level API (parse/load/stringify)
- Comprehensive integration tests
- Documentation
- Performance benchmarks

## Success Criteria

### Functional Requirements

✅ All TypeDefs implement load() and stringify()
✅ Validation is shared across operations
✅ Round-trip consistency (parse → stringify → parse)
✅ Error messages are clear and actionable

### Non-Functional Requirements

✅ Code coverage > 90%
✅ No performance regression in parse()
✅ Load operation < 10% slower than parse
✅ Stringify with validation < 20% slower than current stringify

### Code Quality

✅ Zero code duplication in validation
✅ Clear separation of concerns
✅ TypeScript strict mode compliance
✅ Comprehensive JSDoc comments

## Resources

- Architecture Document: `./ARCHITECTURE-TYPE-SYSTEM.md`
- Type Definitions: `../../../src/schema/types/`
- Error Codes: `src/errors/io-error-codes.ts`
- Tests: `tests/schema/types/`

## Phase 6: Advanced Features

### 6.1 Validation Strategy Across Operations

All three operations (`parse`, `load`, `stringify`) perform validation, but at different stages:

#### Validation Matrix

| Operation | Validation Stage | Validation Type | Error Context |
|-----------|-----------------|-----------------|---------------|
| **parse()** | 1. Syntax validation (tokenizer/parser)<br>2. Schema validation (type checking)<br>3. Constraint validation (min/max/pattern) | - Structure errors (missing commas)<br>- Type errors (not-a-number)<br>- Constraint errors (out-of-range) | Has Node → position info |
| **load()** | 1. Type validation (JS type check)<br>2. Constraint validation (min/max/pattern) | - Type errors (expects string, got number)<br>- Constraint errors (invalid-email) | No Node → no position |
| **stringify()** | 1. Value validation (ensure serializable)<br>2. Constraint validation (verify constraints)<br>3. Format validation (can represent in IO) | - Invalid values (NaN, undefined in strict mode)<br>- Constraint errors (value changed after load)<br>- Representation errors (value too complex) | No Node → no position |

#### Validation Flow Diagram

```typescript
// PARSE Operation
Text → Tokenize → Parse AST → Type Check → Constraint Validate → IODocument
        ↓           ↓            ↓              ↓
     Syntax     Structure   Schema Type    Business Rules
     Errors     Errors      Errors         Errors

// LOAD Operation
JS Value → Type Check → Constraint Validate → IODocument
           ↓              ↓
        Type Match    Business Rules
        Errors        Errors

// STRINGIFY Operation
IODocument → Value Check → Constraint Validate → Format → IO Text
             ↓              ↓                     ↓
          Invalid        Rule Verify         Format
          Values         Errors              Errors
```

#### Shared Validation Logic

**All three operations use the same validation functions:**

```typescript
// In each TypeDef:

parse(node: Node, memberDef: MemberDef, defs?: Definitions) {
  // 1. Common checks (null/undefined/default/choices)
  const { value, handled } = doCommonTypeCheck(memberDef, node, node, defs)
  if (handled) return value

  // 2. Type-specific parsing (TokenNode → JS value)
  const parsedValue = this.parseFromNode(node)

  // 3. SHARED VALIDATION (same as load/stringify)
  return this.validateValue(parsedValue, memberDef, node)
}

load(value: any, memberDef: MemberDef, defs?: Definitions) {
  // 1. Common checks (null/undefined/default/choices)
  const { value: checkedValue, handled } = doCommonTypeCheck(memberDef, value, undefined, defs)
  if (handled) return checkedValue

  // 2. Type checking (ensure JS value is correct type)
  this.assertType(value, memberDef)

  // 3. SHARED VALIDATION (same as parse/stringify)
  return this.validateValue(value, memberDef)
}

stringify(value: any, memberDef: MemberDef, defs?: Definitions) {
  // 1. Common checks (null/undefined)
  const { value: checkedValue, handled } = doCommonTypeCheck(memberDef, value, undefined, defs)
  if (handled) {
    return this.formatValue(checkedValue, memberDef) // Format null/undefined/defaults
  }

  // 2. SHARED VALIDATION (same as parse/load)
  const validatedValue = this.validateValue(value, memberDef)

  // 3. Format to IO text
  return this.formatValue(validatedValue, memberDef)
}

/**
 * SHARED validation logic used by all three operations
 * This is the single source of truth for constraint validation
 */
private validateValue(value: T, memberDef: MemberDef, node?: Node): T {
  // Validate all constraints (min, max, len, pattern, etc.)
  // Throw ValidationError if any constraint fails
  return value
}
```

**Key Principle**: **Validation logic is centralized in `validateValue()`** - all three operations call the same function.

### 6.2 External Definitions & Reference Handling

#### Architecture Overview

```typescript
/**
 * Definitions can be:
 * 1. Embedded in document header (~ $schema: {...})
 * 2. Passed as external parameter (io.parse(text, externalDefs))
 * 3. Combination of both (merged with priority rules)
 */

// External definitions
const sharedDefs = io.defs`
  ~ @apiUrl: "https://api.example.com"
  ~ @version: "v1"
  ~ $address: { street: string, city: string, state: string, zip: number }
  ~ $person: {
      name: string,
      age: number,
      address: $address,
      apiEndpoint: {string, default: @apiUrl}
    }
`

// Use across operations
const doc1 = io.parse(docText, sharedDefs)
const doc2 = io.load(jsData, '$person', sharedDefs)
const text = io.stringify(doc2, sharedDefs)
```

#### Definition Merge Rules

**Priority Order** (highest to lowest):

1. **Document-embedded definitions** (in header)
2. **External definitions** (passed as parameter)
3. **TypeDef defaults** (built-in defaults)

```typescript
// Example merge behavior:
const externalDefs = io.defs`
  ~ @defaultCity: "New York"
  ~ $person: { name: string, age: number }
`

const docText = `
  ~ @defaultCity: "San Francisco"  # Overrides external
  ~ $employee: {
      name: string,
      dept: string,
      info: $person  # References external schema
    }
  ---
  Alice, Engineering
`

const doc = io.parse(docText, externalDefs)
// Result:
// - @defaultCity = "San Francisco" (document override)
// - $person available (from external)
// - $employee available (from document)
```

#### Implementation Pattern

```typescript
// In parse operation (already implemented):
export default function parse(source: string, externalDefs: Definitions | null): Document {
  // ... parse document ...

  if (externalDefs) {
    // Merge: document defs take priority
    doc.header.definitions.merge(externalDefs, false)
  }

  return doc
}

// In load operation (NEW):
export function ioLoad(
  value: any,
  schema: Schema | string,
  defs?: Definitions
): IODocument {
  // Resolve schema reference from definitions
  let resolvedSchema: Schema
  if (typeof schema === 'string') {
    if (!defs) {
      throw new Error(`Schema reference '${schema}' requires definitions`)
    }
    resolvedSchema = defs.getV(schema)
  } else {
    resolvedSchema = schema
  }

  // Load with definitions context
  const loaded = loadObject(value, resolvedSchema, defs)

  // Store definitions in document header
  const header = new IOHeader(defs || new Definitions())
  return new IODocument(header, ...)
}

// In stringify operation (NEW):
export function ioStringify(
  doc: IODocument,
  externalDefs?: Definitions,
  options?: IOStringifyOptions
): string {
  // Merge document defs with external defs
  const defs = doc.header.definitions
  if (externalDefs) {
    // Create merged view (don't mutate original)
    const mergedDefs = new Definitions()
    mergedDefs.merge(externalDefs, false) // External first
    mergedDefs.merge(defs, true)          // Document overrides
    // Use mergedDefs for serialization
  }

  // Stringify with definitions context
  return stringifyDocument(doc, defs, options)
}
```

#### Reference Resolution During Validation

```typescript
// In validateValue or type-specific validation:
private validateValue(value: any, memberDef: MemberDef, defs?: Definitions): any {
  // Resolve variable references in constraints
  if (memberDef.min && typeof memberDef.min === 'string' && memberDef.min.startsWith('@')) {
    const resolvedMin = defs?.getV(memberDef.min)
    memberDef.min = resolvedMin
  }

  // Resolve choice references
  if (memberDef.choices) {
    memberDef.choices = memberDef.choices.map(choice => {
      if (typeof choice === 'string' && choice.startsWith('@')) {
        return defs?.getV(choice)
      }
      return choice
    })
  }

  // ... rest of validation
}
```

### 6.3 Streaming Support (Future Enhancement)

#### Design Considerations

All three operations can benefit from streaming for large datasets:

```typescript
/**
 * Streaming Architecture:
 *
 * 1. Parse Stream: Text → Chunks → IODocument stream
 * 2. Load Stream: JS Objects → Validate → IODocument stream
 * 3. Stringify Stream: IODocument → Format → Text chunks
 */

// Future API design:
interface IOStreamOptions {
  highWaterMark?: number  // Buffer size
  chunkSize?: number      // Items per chunk
  parallel?: number       // Concurrent processing
}

// Parse streaming
io.parseStream(
  readableStream: ReadableStream<string>,
  defs?: Definitions,
  options?: IOStreamOptions
): ReadableStream<IODocument>

// Load streaming
io.loadStream(
  objects: AsyncIterable<any>,
  schema: Schema | string,
  defs?: Definitions,
  options?: IOStreamOptions
): ReadableStream<IODocument>

// Stringify streaming
io.stringifyStream(
  documents: AsyncIterable<IODocument>,
  defs?: Definitions,
  options?: IOStreamOptions
): ReadableStream<string>
```

#### Streaming Implementation Strategy

##### Phase 1: Stateless Foundation (Current Implementation)

- Each TypeDef operation is stateless
- Validation is self-contained
- No global state dependencies
- **✅ Already supports streaming architecture**

##### Phase 2: Chunk Processing

```typescript
// Parse streaming implementation:
async function* parseStream(
  textStream: AsyncIterable<string>,
  defs?: Definitions
): AsyncGenerator<IODocument> {
  let buffer = ''

  for await (const chunk of textStream) {
    buffer += chunk

    // Find complete documents (separated by '===')
    const docs = buffer.split('===')
    buffer = docs.pop() || '' // Keep incomplete doc in buffer

    // Parse and yield complete documents
    for (const docText of docs) {
      if (docText.trim()) {
        yield io.parse(docText, defs)
      }
    }
  }

  // Process final buffered document
  if (buffer.trim()) {
    yield io.parse(buffer, defs)
  }
}

// Load streaming implementation:
async function* loadStream(
  objects: AsyncIterable<any>,
  schema: Schema | string,
  defs?: Definitions
): AsyncGenerator<IODocument> {
  for await (const obj of objects) {
    yield io.load(obj, schema, defs)
  }
}

// Stringify streaming implementation:
async function* stringifyStream(
  documents: AsyncIterable<IODocument>,
  defs?: Definitions,
  options?: IOStringifyOptions
): AsyncGenerator<string> {
  for await (const doc of documents) {
    yield io.stringify(doc, defs, options)
  }
}
```

### Phase 3: Collection Streaming

```typescript
/**
 * Stream individual items from collections for memory efficiency
 */
async function* parseCollectionStream(
  text: string,
  schema: Schema | string,
  defs?: Definitions
): AsyncGenerator<IOObject> {
  const doc = io.parse(text, defs)

  // Stream collection items
  if (doc.sections?.length > 0) {
    const section = doc.sections.get(0)
    if (section.data instanceof IOCollection) {
      for (let i = 0; i < section.data.length; i++) {
        yield section.data.get(i)
      }
    }
  }
}
```

#### Streaming Validation Strategy

**Challenge**: Maintain validation semantics in streaming mode

```typescript
// Option 1: Fail-fast (stop on first error)
const stream1 = io.parseStream(input, defs, {
  validation: 'fail-fast'
})

// Option 2: Error accumulation (collect errors, continue)
const stream2 = io.parseStream(input, defs, {
  validation: 'accumulate',
  onError: (error) => console.error(error)
})

// Option 3: Error objects in stream (mixed success/error)
const stream3 = io.parseStream(input, defs, {
  validation: 'passthrough'  // Errors as IOError objects
})

for await (const doc of stream3) {
  if (doc instanceof IOError) {
    // Handle error
  } else {
    // Process valid document
  }
}
```

#### Memory Efficiency Patterns

```typescript
/**
 * Large file processing with streaming:
 */
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'

async function processLargeFile(filePath: string) {
  const defs = io.defs`$record: { id: number, name: string }`

  await pipeline(
    createReadStream(filePath, 'utf-8'),
    io.parseStream(defs),
    async function* (documents) {
      for await (const doc of documents) {
        // Process each document
        const processed = await processDocument(doc)
        yield processed
      }
    },
    io.stringifyStream(defs),
    createWriteStream('output.io')
  )
}
```

#### Streaming Roadmap

##### Immediate (Phase 1): ✅ Complete

- Stateless operations
- No global state
- Self-contained validation

##### Near-term (Phase 2)

- Basic stream wrappers
- Document-level streaming
- Error handling strategies

##### Future (Phase 3)

- Collection item streaming
- Parallel processing
- Backpressure handling
- Transform streams

### 6.4 API Summary with All Features

```typescript
// Complete API Surface

// === CORE OPERATIONS ===

// Parse: IO text → IODocument (with validation)
io.parse(
  text: string,
  defs?: IODefinitions,
  options?: { strict?: boolean; skipValidation?: boolean }
): IODocument

// Load: JS value → IODocument (with validation)
io.load(
  value: any,
  schema: Schema | string,
  defs?: IODefinitions,
  options?: { strict?: boolean; coerce?: boolean; stripUnknown?: boolean }
): IODocument

// Stringify: IODocument → IO text (with validation)
io.stringify(
  doc: IODocument | IOObject,
  defs?: IODefinitions,
  options?: { format?: 'compact' | 'pretty'; includeHeader?: boolean; indent?: number }
): string

// Alias
io.stringify = io.stringify

// === STREAMING OPERATIONS (Future) ===

// Parse stream
io.parseStream(
  stream: ReadableStream<string>,
  defs?: IODefinitions,
  options?: IOStreamOptions
): ReadableStream<IODocument>

// Load stream
io.loadStream(
  objects: AsyncIterable<any>,
  schema: Schema | string,
  defs?: IODefinitions,
  options?: IOStreamOptions
): ReadableStream<IODocument>

// Stringify stream
io.stringifyStream(
  documents: AsyncIterable<IODocument>,
  defs?: IODefinitions,
  options?: IOStreamOptions
): ReadableStream<string>

// === DEFINITIONS ===

// Create definitions
io.defs`
  ~ $schema: { ... }
  ~ @variable: value
`: IODefinitions

// === UTILITIES ===

// Validate without parsing
io.validate(
  value: any,
  schema: Schema | string,
  defs?: IODefinitions
): { valid: boolean; errors: Error[] }

// Schema compilation
io.compileSchema(
  schemaText: string,
  defs?: IODefinitions
): Schema
```

## Support

For questions or issues during implementation:

1. Review architecture document
2. Check this implementation guide
3. Look at existing type implementations
4. Write tests first to clarify behavior
5. Reach out to team for design decisions

---

**Document Version**: 2.0
**Date**: November 18, 2025
**Status**: Implementation Ready
**Updates**: Added validation strategy, reference handling, and streaming support sections
