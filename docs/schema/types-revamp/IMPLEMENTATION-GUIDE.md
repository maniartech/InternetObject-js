# Type System Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the enhanced type system architecture that adds `load()` and `serialize()` operations with abstracted validation.

## Prerequisites

Before starting implementation:

1. Review `./ARCHITECTURE-TYPE-SYSTEM.md`
2. Understand current type system in `../../../src/schema/types/`
3. Run existing tests: `yarn test`

## Phase 1: Refactor Common Type Check

### 1.1 Update Return Type

**File**: `src/schema/types/common-type.ts`

**Change**:

```typescript
// OLD
type CommonTypeCheckResult = {
  value:    any,

---

  changed:  boolean
}

// NEW
type CommonTypeCheckResult = {
  value:    any,
  handled:  boolean  // Renamed from 'changed' for clarity
}
```

**Rationale**: "handled" better describes that common check fully processed the value (null/undefined/default) vs just changed it.

### 1.2 Make Function Input Flexible

**Current Signature**:

```typescript
function doCommonTypeCheck(
  memberDef: MemberDef,
  value: any,
  node?: Node,
  defs?: Definitions,
  collectionIndex?: number,
  equalityComparator?: EqualityComparator
): CommonTypeCheckResult
```

**Analysis**: Current implementation already accepts `value: any` and works for all three operations:

- **parse()**: Passes Node (TokenNode) - extracts value internally via `node.toValue()`
- **load()**: Passes raw JavaScript value - processes directly
- **serialize()**: Passes JavaScript value - validates before formatting

The function handles:

- Null/undefined checking (works with Node or raw value)
- Default value resolution (works with or without defs)
- Choices validation (uses optional equalityComparator for type-specific comparison)
- Variable dereferencing (@variables)

**No changes needed** to `doCommonTypeCheck` signature or logic - it's already flexible.

**Action**: Update all callsites to use `handled` instead of `changed`:

```typescript
// OLD
const { value, changed } = doCommonTypeCheck(...)
if (changed) return value

// NEW
const { value, handled } = doCommonTypeCheck(...)
if (handled) return value
```

**Usage Pattern Across Operations**:

```typescript
// In parse() - passes Node
const { value, handled } = doCommonTypeCheck(memberDef, node, node, defs, collectionIndex)
if (handled) return value
// Continue with type checking on node.value...

// In load() - passes raw value, no node
const { value, handled } = doCommonTypeCheck(memberDef, value, undefined, defs, collectionIndex)
if (handled) return value
// Continue with type checking on value...

// In serialize() - passes raw value, no node
const { value, handled } = doCommonTypeCheck(memberDef, value, undefined, defs)
if (handled) {
  // Return formatted representation (N for null, etc.)
  if (value === null) return 'N'
  if (value === undefined) return ''
  // Or continue with serialization of the value
}
```

### 1.3 Update All TypeDefs

Update these files:

- `src/schema/types/string.ts`
- `src/schema/types/number.ts`
- `src/schema/types/boolean.ts`
- `src/schema/types/array.ts`
- `src/schema/types/object.ts`
- `src/schema/types/datetime.ts`
- `src/schema/types/decimal.ts`
- `src/schema/types/bigint.ts`
- `src/schema/types/any.ts`

**Testing**: Run `yarn test` after each file update to ensure no regressions.

## Phase 2: Extract Validation Logic

For each TypeDef, extract validation into a private method.

### 2.1 StringDef Example

**File**: `src/schema/types/string.ts`

**Before**:

```typescript
parse(node: Node, memberDef: MemberDef, defs?: Definitions): string {
  const valueNode = defs?.getV(node) || node
  const { value, handled } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (handled) return value

  if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.STRING) {
    throw new ValidationError(...)
  }

  _validatePattern(memberDef, value, node)

  // Len check

  // ... more validation

  return value
}
```

**After**:

```typescript
parse(node: Node, memberDef: MemberDef, defs?: Definitions): string {
  const valueNode = defs?.getV(node) || node
  const { value, handled } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (handled) return value

  // Type check (parse-specific)
  if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.STRING) {
    throw new ValidationError(...)
  }

  // Shared validation
  return this.validateValue(valueNode.value, memberDef, node)
}

/**
 * Validates a string value against memberDef constraints.
 *
 * @param value - The string value to validate
 * @param memberDef - Member definition with constraints
 * @param node - Optional node for error reporting (parse only)
 * @returns The validated value
 * @throws ValidationError if validation fails
 */
private validateValue(value: string, memberDef: MemberDef, node?: Node): string {
  // Pattern validation
  _validatePattern(memberDef, value, node)

  // Length validation
  if (memberDef.len !== undefined && typeof memberDef.len === 'number') {
    if (value.length !== memberDef.len) {
      throw new ValidationError(
        ErrorCodes.invalidLength,
        `Invalid length for ${memberDef.path}. Expected ${memberDef.len}, got ${value.length}.`,
        node
      )
    }
  }

  if (memberDef.maxLen !== undefined && typeof memberDef.maxLen === 'number') {
    if (value.length > memberDef.maxLen) {
      throw new ValidationError(
        ErrorCodes.invalidMaxLength,
        `Invalid maxLength for ${memberDef.path}. Expected max ${memberDef.maxLen}, got ${value.length}.`,
        node
      )
    }
  }

  if (memberDef.minLen !== undefined && typeof memberDef.minLen === 'number') {
    if (value.length < memberDef.minLen) {
      throw new ValidationError(
        ErrorCodes.invalidMinLength,
        `Invalid minLength for ${memberDef.path}. Expected min ${memberDef.minLen}, got ${value.length}.`,
        node
      )
    }
  }

  return value
}
```

### 2.2 NumberDef Example

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
  parse(node: Node, memberDef: MemberDef, definitions?: Definitions, collectionIndex?: number): any

  /**
   * Loads and validates a JavaScript value
   * Ensures the value conforms to memberDef constraints
   *
   * @param value - Raw JavaScript value to validate
   * @param memberDef - Member definition with constraints
   * @param definitions - Optional definitions for variable resolution
   * @param collectionIndex - Optional index for array items
   * @returns Validated and potentially normalized value
   * @throws ValidationError if value doesn't meet constraints
   */
  load(value: any, memberDef: MemberDef, definitions?: Definitions, collectionIndex?: number): any

  /**
   * Serializes a validated JavaScript value to IO text format
   *
   * @param value - JavaScript value to serialize
   * @param memberDef - Member definition for formatting hints
   * @param definitions - Optional definitions for variable resolution
   * @returns IO text representation
   * @throws ValidationError if value is invalid
   */
  serialize(value: any, memberDef: MemberDef, definitions?: Definitions): string
}
```

### 3.2 Implement Load for StringDef

**File**: `src/schema/types/string.ts`

```typescript
/**
 * Loads and validates a JavaScript value as a string
 */
load(value: any, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): string {
  // Common validation (null, undefined, default, choices)
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined, // No node for load operation
    defs,
    collectionIndex
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
load(value: any, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): number | bigint | Decimal {
  // Delegate to specialized type if available
  if (this._delegateTypeDef && 'load' in this._delegateTypeDef) {
    return (this._delegateTypeDef as any).load(value, memberDef, defs, collectionIndex)
  }

  // Common validation
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs,
    collectionIndex
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
load(value: any, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): boolean {
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs,
    collectionIndex
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
load(value: any, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): any[] {
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs,
    collectionIndex
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
      array.push((typeDef as any).load(item, arrayMemberDef, defs, i))
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
load(value: any, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): any {
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs,
    collectionIndex
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

## Phase 4: Implement Serialize Operation

### 4.1 Enhance Serialize for StringDef

**File**: `src/schema/types/string.ts`

```typescript
/**
 * Serializes a string value to IO text format with validation
 */
serialize(value: any, memberDef: MemberDef, defs?: Definitions): string {
  // Handle null/undefined special cases
  const { value: checkedValue, handled } = doCommonTypeCheck(
    memberDef,
    value,
    undefined,
    defs,
    undefined,
    undefined
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

### 4.2 Update Serialize for NumberDef

**File**: `src/schema/types/number.ts`

Current `stringify()` method needs renaming and validation:

```typescript
// Rename from stringify to serialize
serialize(value: any, memberDef: MemberDef, defs?: Definitions): string {
  // Delegate to specialized type if available
  if (this._delegateTypeDef && 'serialize' in this._delegateTypeDef) {
    return (this._delegateTypeDef as any).serialize(value, memberDef, defs)
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

**Serialize Implementation Checklist**:

- [ ] Handle null/undefined via doCommonTypeCheck
- [ ] Validate value before serialization using `validateValue()`
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
  defs?: Definitions,
  collectionIndex?: number
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

  return (objectTypeDef as any).load(data, memberDef, defs, collectionIndex)
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
      const loaded = loadObject(dataArray[i], schema, defs, i)
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

**Important**: Note the `collectionIndex` parameter:

- **parse/load operations**: Pass the item's position in the collection (0, 1, 2, ...)
- **serialize operations**: Not needed (no collectionIndex in serialize)
- **Propagation**: Must be passed through all nested TypeDef calls (object → member → nested objects/arrays)

### 5.2 Update High-Level API

#### 5.2.1 Document-Level Load and Serialize

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
 * Serializes an IODocument to IO text format.
 * Validates data during serialization.
 *
 * @param document - IODocument to serialize
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
 * const text = io.serializeDocument(doc)
 * // Output: "~ name: string, age: number\n---\nJohn, 30"
 * ```
 */
export function ioSerializeDocument(
  document: IODocument,
  options?: { includeHeader?: boolean; format?: 'compact' | 'pretty' }
): string {
  const lines: string[] = []

  // Serialize header (definitions and schema)
  if (options?.includeHeader !== false && document.header) {
    const headerText = serializeHeader(document.header)
    if (headerText) {
      lines.push(headerText)
    }
  }

  // Serialize sections
  if (document.sections) {
    for (let i = 0; i < document.sections.length; i++) {
      const section = document.sections.get(i)
      if (section) {
        if (lines.length > 0) lines.push('---')
        lines.push(serializeSection(section, options))
      }
    }
  }

  return lines.join('\n')
}

/**
 * Helper: Serializes a section's data
 */
function serializeSection(
  section: IOSection,
  options?: { format?: 'compact' | 'pretty' }
): string {
  const data = section.data
  const schema = section.schema

  if (!schema) {
    throw new Error('Cannot serialize section without schema')
  }

  // Serialize collection or single object
  if (data instanceof IOCollection) {
    return serializeCollection(data, schema, options)
  } else if (data instanceof IOObject) {
    return serializeObject(data, schema, options)
  } else {
    throw new Error('Unsupported section data type')
  }
}

/**
 * Helper: Serializes an IOObject using TypeDef.serialize()
 */
function serializeObject(
  obj: IOObject,
  schema: Schema,
  options?: { format?: 'compact' | 'pretty' }
): string {
  const objectTypeDef = TypedefRegistry.get('object')
  if (!objectTypeDef || !('serialize' in objectTypeDef)) {
    throw new Error('ObjectDef does not support serialize')
  }

  const memberDef: MemberDef = {
    type: 'object',
    schema: schema,
    path: schema.name || 'root'
  }

  return (objectTypeDef as any).serialize(obj.toJSON(), memberDef)
}

/**
 * Helper: Serializes an IOCollection
 */
function serializeCollection(
  collection: IOCollection,
  schema: Schema,
  options?: { format?: 'compact' | 'pretty' }
): string {
  const lines: string[] = []

  // Serialize schema header (if not already in document header)
  const schemaLine = serializeSchemaDefinition(schema)
  lines.push(schemaLine)

  // Serialize each item
  for (let i = 0; i < collection.length; i++) {
    const item = collection.get(i)
    if (item instanceof IOObject) {
      const itemText = serializeObject(item, schema, options)
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
  ioSerializeDocument  // NEW
}

export default {
  // Template functions
  doc: ioDocument,
  object: ioObject,
  defs: ioDefinitions,
  document: ioDocument,
  definitions: ioDefinitions,

  // Load/Serialize functions
  load: ioLoadDocument,           // NEW
  loadDocument: ioLoadDocument,   // NEW
  serialize: ioSerializeDocument, // NEW
  serializeDocument: ioSerializeDocument, // NEW

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

// Serialize back to IO text
const text = io.serializeDocument(doc)
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

// Serialize → IO text
const ioText = io.serializeDocument(doc1)

// Parse → IODocument
const doc2 = io.parse(ioText, defs)

// Should be equivalent
assert.deepEqual(doc1.toJSON(), doc2.toJSON())
```

### 5.3 Testing Strategy

#### Unit Tests Template

```typescript
// tests/schema/types/string-load-serialize.test.ts
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

  describe('serialize', () => {
    it('should serialize valid string', () => {
      const memberDef: MemberDef = { type: 'string', path: 'test' }
      const result = stringDef.serialize('hello', memberDef)
      expect(result).toBe('"hello"') // or based on format
    })

    it('should validate before serialization', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        minLen: 5
      }

      expect(() => stringDef.serialize('abc', memberDef)).toThrow()
    })

    it('should handle null', () => {
      const memberDef: MemberDef = { type: 'string', path: 'test', null: true }
      const result = stringDef.serialize(null, memberDef)
      expect(result).toBe('N')
    })

    it('should respect format option', () => {
      const memberDef: MemberDef = {
        type: 'string',
        path: 'test',
        format: 'raw'
      }
      const result = stringDef.serialize('hello', memberDef)
      // Assert based on raw format
    })
  })
})
```

#### Integration Tests

```typescript
// tests/integration/load-serialize-roundtrip.test.ts
describe('Load-Serialize-Parse Round-trip', () => {
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

    // Serialize to text
    const serialized = loaded.serialize(schema)

    // Parse back
    const parsed = InternetObject.parse(serialized, schema)

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

**Problem**: NumberDef delegates to BigIntDef/DecimalDef - must implement load/serialize there too.

**Solution**: Implement all three methods in delegated types.

### Pitfall 3: Validation Side Effects

**Problem**: Validation methods modifying values.

**Solution**: Keep validation pure - return validated value, don't mutate.

### Pitfall 4: Error Messages Without Context

**Problem**: Error messages not including memberDef.path.

**Solution**: Always include `${memberDef.path}` in error messages.

## Code Review Checklist

Before submitting PR:

- [ ] All TypeDefs implement `load()` and `serialize()`
- [ ] Validation extracted to `validateValue()` or equivalent
- [ ] No duplication between parse/load/serialize
- [ ] All error messages include context (path)
- [ ] Tests cover happy path and error cases
- [ ] Tests include round-trip scenarios
- [ ] JSDoc comments complete
- [ ] `yarn test` passes
- [ ] `yarn lint` passes (if applicable)
- [ ] Performance impact measured (if applicable)

## Rollout Strategy

### Stage 1: Core Types

Implement load/serialize for:

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
- Update high-level API
- Comprehensive integration tests
- Documentation
- Performance benchmarks

## Success Criteria

### Functional Requirements

✅ All TypeDefs implement load() and serialize()
✅ Validation is shared across operations
✅ Round-trip consistency (parse → serialize → parse)
✅ Error messages are clear and actionable

### Non-Functional Requirements

✅ Code coverage > 90%
✅ No performance regression in parse()
✅ Load operation < 10% slower than parse
✅ Serialize with validation < 20% slower than current stringify

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

## Support

For questions or issues during implementation:

1. Review architecture document
2. Check this implementation guide
3. Look at existing type implementations
4. Write tests first to clarify behavior
5. Reach out to team for design decisions

---

**Document Version**: 1.0
**Date**: November 18, 2025
**Status**: Implementation Ready
