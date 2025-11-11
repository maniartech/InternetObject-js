# Open Schema Pattern

**Status:** Architecture Document
**Version:** 1.0
**Last Updated:** 2025-01-21

---

## 🎯 What is an Open Schema?

An **open schema** is a schema that allows additional properties (fields) beyond those explicitly defined. This provides flexibility while maintaining validation for known fields.

### The Problem

In strict (closed) schemas, only defined fields are allowed:

```io
~ User
name: string, age: number

~ UserData : User
name: John, age: 25, extra: field  ← ❌ Error: UNKNOWN_FIELD 'extra'
```

But sometimes you need flexibility:
- **Extensible APIs** - Accept future fields without breaking
- **Metadata/Config objects** - User-defined properties
- **Dynamic data** - Schema-less portions of structured data
- **Migration scenarios** - Gradual schema evolution

---

## 🎨 Two Ways to Mark Schemas as Open

Internet Object provides **two complementary approaches** to mark schemas as open:

### Approach 1: `*` Wildcard in Schema Definition
Use `*` directly inside the schema body (top-level or inline):

```io
~ $User: { name: string, age: number, * }  # Wildcard in top-level schema

~ $Building: {
  address: {object, schema: {street: string, city: string, *}}  # Wildcard in inline schema
}
```

### Approach 2: `openSchema` Property in MemberDef
Use `openSchema` property when configuring an object field:

```io
~ $UserProfile: {
  profile: {object, schema: {name: string}, openSchema: true},
  metadata: {object, schema: {version: string}, openSchema: {string, minLen: 3}}
}
```

**Key Difference:**
- **`*` wildcard** = Syntax marker inside schema definition
- **`openSchema` property** = Configuration property in object MemberDef

**Precedence Rule (like `optional` and `null`):**
- `*` wildcard provides **default value** for `openSchema`
- Explicit `openSchema` property **overrides** the wildcard

```io
~ $Schema1: {
  # Wildcard sets default
  profile: {object, schema: {name: string, *}}
  # Result: openSchema = true (from wildcard)
}

~ $Schema2: {
  # Explicit property overrides
  profile: {object, schema: {name: string, *}, openSchema: false}
  # Result: openSchema = false (explicit wins)
}
```

This follows the same precedence pattern as `optional`/`null`:
```io
~ $Schema3: {
  field?: {string, optional: false},  # Result: optional = false (explicit wins over ?)
  field*: {string, "null": false}     # Result: null = false (explicit wins over *)
}
```

**Internal Mechanism (V1 Pattern):**
```typescript
// parseName() extracts suffix info
fieldInfo = parseName(key)  // {name: "profile", ...}

// processSchema() parses inline schema with * wildcard
const openFromWildcard = schema.has('*')  // true if * present

// Merge: explicit properties override defaults
const memberDef = {
  ...fieldInfo,
  openSchema: openFromWildcard,  // default from wildcard
  ...parsedObjectDef              // explicit openSchema overrides
}
```

---

## 📋 ObjectTypeSchema Definition

The `openSchema` property is defined in the ObjectTypeSchema:

```io
~ ObjectTypeSchema
type       : { object, default: object, choices: [object] },
default    : { object, optional: true, "null": false },
schema     : { object, optional: true, "null": false, __schema: true },
openSchema : { any, optional: true, "null": false, default: false, anyOf: [
  {type: bool},
  {type: any, __memberdef: true}
]},
optional   : { bool, optional: true, "null": false },
"null"     : { bool, optional: true, "null": false }
```

**Field Explanation:**
- **`openSchema: bool`** → Closed (false) or Open untyped (true)
- **`openSchema: MemberDef`** → Open typed (additional fields must match MemberDef)
- **`default: false`** → Closed schema by default (unless `*` wildcard present)
- **`anyOf`** → Either boolean or MemberDef (validated with `__memberdef: true`)

**Examples:**
```io
~ $Example1: {
  # Explicitly closed (even with wildcard)
  profile: {object, schema: {name: string, *}, openSchema: false}
}

~ $Example2: {
  # Explicitly open untyped (even without wildcard)
  config: {object, schema: {version: string}, openSchema: true}
}

~ $Example3: {
  # Open typed (additional fields must be strings with minLen constraint)
  metadata: {object, schema: {id: number}, openSchema: {string, minLen: 3}}
}
```

---

## 🔑 The Three Modes

Internet Object supports three schema modes:

### Mode 1: Closed Schema (Default)
**Syntax:** No `*` marker
**Behavior:** Only defined fields allowed

```io
~ $User: { name: string, age: number }
```

**V1 Implementation:**
```typescript
schema.open = false  // Default
```

**Validation:**
- ✅ Defined fields: Validated against schema
- ❌ Unknown fields: Rejected with `UNKNOWN_FIELD` error

**Use case:** Strict APIs, type-safe data structures

---

### Mode 2: Open Schema (Untyped)
**Behavior:** Additional fields allowed (any type)

**Approach 1: Using `*` wildcard in schema**
```io
~ $User: { name: string, age: number, * }
```

**Approach 2: Using `openSchema` property**
```io
~ $UserProfile: {
  profile: {object, schema: {name: string, age: number}, openSchema: true}
}
```

**V1 Implementation:**
```typescript
schema.open = true
schema.defs['*'] = undefined  // No constraint
```

**Validation:**
- ✅ Defined fields: Validated against schema
- ✅ Unknown fields: Accepted as-is (validated as `type: any`)

**Use case:** Flexible data, user-defined metadata

**Example with wildcard:**
```io
~ $Config: { version: string, * }
---
~ : Config
version: 1.0, author: John, timestamp: 123456, custom: {x: 1, y: 2}
```
> Additional fields (author, timestamp, custom) accepted with any type

**Example with property:**
```io
~ $AppConfig: {
  settings: {object, schema: {theme: string}, openSchema: true}
}
---
~ : AppConfig
settings: { theme: dark, fontSize: 14, locale: en-US }
```
> Additional fields in settings (fontSize, locale) accepted with any type

---

### Mode 3: Open Schema (Typed)
**Behavior:** Additional fields must match type constraint

**Approach 1: Using `*: type` in schema**
```io
~ $Config: { host: string, port: number, *: string }
```

**Approach 2: Using `openSchema: MemberDef` property**
```io
~ $ServerConfig: {
  server: {object, schema: {host: string, port: number}, openSchema: string}
}
```

**V1 Implementation:**
```typescript
schema.open = MemberDef  // The type constraint
schema.defs['*'] = MemberDef  // Mirrored
```

**Validation:**
- ✅ Defined fields: Validated against schema
- ✅ Unknown fields: Validated against `*` type constraint or `openSchema` MemberDef

**Use case:** Typed dictionaries, string maps, validated extensions

**Example with wildcard:**
```io
~ $Config: { host: string, port: number, *: string }
---
~ : Config
host: localhost, port: 8080, env: production, region: us-east

~ : Config
host: localhost, port: 8080, timeout: 30  # ❌ Error: NOT_A_STRING (30 is number)
```

**Example with property:**
```io
~ $AppSettings: {
  config: {object, schema: {host: string, port: number}, openSchema: {string, minLen: 3}}
}
---
~ : AppSettings
config: { host: localhost, port: 8080, env: production, db: postgres }

~ : AppSettings
config: { host: localhost, port: 8080, env: us }  # ❌ Error: STRING_TOO_SHORT (minLen: 3)
```

---

## 📐 Syntax Rules

### Rule 1: `*` Must Be Last
The wildcard must appear as the **last field** in the schema:

```io
~ $Valid: { name: string, age: number, * }

~ $Invalid1: { *, name: string, age: number }  # ❌ SyntaxError: * must be last
~ $Invalid2: { name: string, *, age: number }  # ❌ SyntaxError: * must be last
```

**Rationale:** Ensures clear schema structure and predictable parsing.

### Rule 2: Three Syntax Forms

**Form 1: Positional wildcard**
```io
~ $Schema: { name: string, * }
```

**Form 2: Named wildcard (untyped)**
```io
~ $Schema: { name: string, *: any }
```

**Form 3: Named wildcard (typed)**
```io
~ $Schema: { name: string, *: string }
~ $Schema2: { id: number, *: {string, minLen: 3} }
~ $Schema3: { base: string, *: [number] }
```

### Rule 3: Complex Type Constraints

The `*` type can be any valid MemberDef:

**String with constraints:**
```io
*: {string, minLen: 3, maxLen: 50}
```

**Array type:**
```io
*: [string]  ← Additional fields must be arrays of strings
*: {array, of: {type: number, min: 0}}
```

**Object type:**
```io
*: {name: string, value: number}  ← Additional fields must match inline schema
```

**Union type (anyOf):**
```io
*: {any, anyOf: [{type: string}, {type: number}]}
```

---

## ⚖️ Precedence and Conflict Resolution

### The Precedence Rule

When both `*` wildcard and explicit `openSchema` property are specified, the **explicit property always wins**.

This follows the same pattern as V1's handling of `optional` and `null` suffixes:

```typescript
// V1 Pattern (compile-object.ts)
const fieldInfo = parseName(key)  // Extracts {name, optional, null} from suffixes
const objectDef = processSchema(value)  // Parses object definition

// Merge: explicit properties override suffix defaults
const memberDef = {
  ...fieldInfo,      // Default values from suffixes (?, *)
  ...objectDef       // Explicit properties override defaults
}
```

### Conflict Scenarios

#### Scenario 1: Wildcard Open, Property Closed
```io
~ $User: {
  profile: {object, schema: {name: string, *}, openSchema: false}
}
```

**Result:** `openSchema = false` (explicit property wins)
**Behavior:** Schema is CLOSED despite `*` wildcard

#### Scenario 2: Wildcard Absent, Property Open
```io
~ $User: {
  config: {object, schema: {version: string}, openSchema: true}
}
```

**Result:** `openSchema = true` (explicit property)
**Behavior:** Schema is OPEN despite no `*` wildcard

#### Scenario 3: Wildcard Typed, Property Untyped
```io
~ $User: {
  metadata: {object, schema: {id: number, *: string}, openSchema: true}
}
```

**Result:** `openSchema = true` (explicit property wins)
**Behavior:** Additional fields can be ANY type (untyped open), NOT just strings

#### Scenario 4: Wildcard Untyped, Property Typed
```io
~ $User: {
  settings: {object, schema: {theme: string, *}, openSchema: {string, minLen: 3}}
}
```

**Result:** `openSchema = {string, minLen: 3}` (explicit property wins)
**Behavior:** Additional fields must be strings with minLen: 3

#### Scenario 5: Both Typed (Different Constraints)
```io
~ $Config: {
  server: {object, schema: {host: string, *: string}, openSchema: {string, maxLen: 20}}
}
```

**Result:** `openSchema = {string, maxLen: 20}` (explicit property wins)
**Behavior:** Additional fields must be strings with maxLen: 20 (NOT just string)

### Parallel Examples with `optional` and `null`

```io
~ $Examples: {
  # optional suffix vs explicit property
  field1?: {string},                         # optional = true (from suffix)
  field2?: {string, optional: false},        # optional = false (explicit wins)
  field3: {string, optional: true},          # optional = true (explicit, no suffix)

  # null suffix vs explicit property
  field4*: {string},                         # null = true (from suffix)
  field5*: {string, "null": false},          # null = false (explicit wins)
  field6: {string, "null": true},            # null = true (explicit, no suffix)

  # openSchema wildcard vs explicit property
  field7: {object, schema: {name: string, *}},                    # openSchema = true (from wildcard)
  field8: {object, schema: {name: string, *}, openSchema: false}, # openSchema = false (explicit wins)
  field9: {object, schema: {name: string}, openSchema: true}      # openSchema = true (explicit, no wildcard)
}
```

### Implementation Pattern

```typescript
// Compilation phase
function compileObjectMemberDef(memberNode: Node): MemberDef {
  // Step 1: Check for * wildcard in inline schema
  const schema = compileSchema(memberNode.value.schema)
  const openFromWildcard = schema.has('*') ? schema.get('*') : false

  // Step 2: Parse explicit openSchema property (if present)
  const explicitOpen = memberNode.value.openSchema

  // Step 3: Merge with precedence (explicit wins)
  const openSchema = explicitOpen !== undefined
    ? explicitOpen
    : openFromWildcard

  return {
    type: 'object',
    schema: schema,
    openSchema: openSchema,  // Final resolved value
    ...otherProperties
  }
}
```

### Validation Logic

```typescript
// Runtime validation
function validateObject(data: object, memberDef: ObjectMemberDef): ValidationResult {
  const definedFields = Object.keys(memberDef.schema.defs)
  const dataFields = Object.keys(data)

  for (const field of dataFields) {
    if (definedFields.includes(field)) {
      // Validate against schema definition
      validate(data[field], memberDef.schema.defs[field])
    } else {
      // Unknown field - check openSchema
      if (memberDef.openSchema === false) {
        throw new Error(`UNKNOWN_FIELD: ${field}`)
      } else if (memberDef.openSchema === true) {
        // Accept any type (no validation)
        continue
      } else {
        // Validate against openSchema MemberDef
        validate(data[field], memberDef.openSchema)
      }
    }
  }
}
```

---

## 🔄 V1 Implementation Patterns

### Schema Class

```typescript
export default class Schema {
  public name: string
  public readonly names: string[] = []
  public readonly defs: MemberMap = {}

  /**
   * Controls additional properties (dynamic fields) in the object.
   * - false: No additional properties allowed (closed schema)
   * - true: Any additional property allowed (no constraints)
   * - MemberDef: Additional properties must match the given type/constraints
   */
  public open: boolean | MemberDef = false
}
```

### Compilation (compile-object.ts)

**Lines 250-260: Handle `*` marker**
```typescript
// Handle additional properties (dynamic fields)
if (memberNode.key && memberNode.key.value === '*') {
  // Use canonicalizer for additional property MemberDef
  if (memberNode.value) {
    const additionalDef = canonicalizeAdditionalProps(memberNode.value, '*')
    schema.defs['*'] = additionalDef
    schema.open = additionalDef  // Mirror to schema.open
  } else {
    schema.open = true  // No constraint (any type)
  }

  if (index !== o.children.length - 1) {
    throw new SyntaxError(ErrorCodes.invalidSchema,
      "The * is only allowed at the last position.", memberNode.value)
  }
  continue
}
```

**Lines 274-280: Handle positional `*`**
```typescript
// If the last index and the value is *, then this is an open schema
const open = memberNode.value instanceof TokenNode
          && memberNode.value.type === TokenType.STRING
          && memberNode.value.value === '*'

if (open) {
  if (index !== o.children.length - 1) {
    throw new SyntaxError(ErrorCodes.invalidSchema,
      "The * is only allowed at the last position.", memberNode.value)
  }
  schema.open = true
  continue
}
```

**Lines 299-302: Empty schema defaults to open**
```typescript
if (schema.names.length === 0) {
  schema.open = true
}
```

### Validation (object-processor.ts)

**Lines 60-66: Positional overflow check**
```typescript
// Process remaining positional members
if (positional) {
  for (; i<data.children.length; i++) {
    const member = data.children[i] as MemberNode

    if (!schema.open) {
      throw new SyntaxError(ErrorCodes.additionalValuesNotAllowed,
        `Additional values are not allowed in the ${schema.name}. ` +
        `The ${schema.name} schema is not open.`, member.value)
    }

    if (member.key) {
      positional = false
      break
    }

    const val = member.value.toValue(defs)
    o.push(val)
  }
}
```

**Lines 88-103: Named field handling**
```typescript
let memberDef = schema.defs[name]

// When the member is not found check if the schema is open to allow
// additional properties. If not throw an error.
if (!memberDef && !schema.open) {
  throw new SyntaxError(
    ErrorCodes.unknownMember,
    `The ${schema.name ? `${schema.name} ` : ''}schema does not ` +
    `define a member named '${name}'.`, member.key)
}

// In an open schema, the memberDef is not found.
// Use schema.open constraints if available, else type 'any'.
if (!memberDef && schema.open) {
  if (typeof schema.open === 'object' && schema.open.type) {
    memberDef = { ...schema.open, path: name }  // Use typed constraint
  } else {
    memberDef = { type: 'any', path: name }  // Untyped (any)
  }
}
```

**Lines 115-120: Skip wildcard in required field check**
```typescript
// Check for missing required members and if the missing member has a
// default value, then set the default value. Otherwise, throw an error.
for (const name in schema.defs) {
  // Skip the wildcard additional property definition ('*').
  // It's not an actual member and must not participate in required checks.
  if (name === '*') continue

  const memberDef = schema.defs[name]
  // ... validation logic
}
```

### Object Type Handler (types/object.ts)

**Lines 54-59: Default to open schema when no schema defined**
```typescript
let schema = memberDef.schema

if (valueNode === node) {
  if (memberDef.__schema) {
    return compileObject(memberDef.path || "", valueNode as ObjectNode, defs)
  }

  if (!schema) {
    schema = new Schema(memberDef.path || "")
    schema.open = true  // No schema = open by default
  }

  return processObject(valueNode as ObjectNode, schema, defs)
}
```

---

## 🚀 V2 Implementation Strategy

### Phase 1: Schema Class Enhancement

```typescript
export class Schema {
  public name: string
  public readonly names: string[] = []
  public readonly defs: MemberMap = {}

  /**
   * Controls additional properties behavior:
   * - false: Closed schema (default) - reject unknown fields
   * - true: Open schema (untyped) - accept any unknown fields
   * - MemberDef: Open schema (typed) - validate unknown fields against constraint
   */
  public open: boolean | MemberDef = false

  /**
   * Check if schema allows additional properties
   */
  get isOpen(): boolean {
    return this.open !== false
  }

  /**
   * Check if additional properties have type constraints
   */
  get hasTypedOpen(): boolean {
    return typeof this.open === 'object'
  }

  /**
   * Get the MemberDef constraint for additional properties
   * Returns undefined if open is true (untyped) or false (closed)
   */
  get openConstraint(): MemberDef | undefined {
    return typeof this.open === 'object' ? this.open : undefined
  }
}
```

### Phase 2: Compiler Enhancement

```typescript
class SchemaCompiler {
  compileSchema(node: ObjectNode, schemaName: string): Schema {
    const schema = new Schema(schemaName)

    for (let i = 0; i < node.children.length; i++) {
      const memberNode = node.children[i] as MemberNode

      // Check for wildcard marker
      if (this.isWildcard(memberNode)) {
        // Must be last field
        if (i !== node.children.length - 1) {
          throw new CompilationError(
            'WILDCARD_NOT_LAST',
            'The * wildcard must be the last field in schema',
            memberNode
          )
        }

        // Handle typed vs untyped wildcard
        if (memberNode.value) {
          const constraint = this.compileMemberDef(memberNode.value)
          schema.defs['*'] = constraint
          schema.open = constraint
        } else {
          schema.open = true
        }

        continue
      }

      // Regular field compilation
      const memberDef = this.compileMemberDef(memberNode)
      schema.names.push(memberDef.name)
      schema.defs[memberDef.name] = memberDef
    }

    // Empty schema defaults to open
    if (schema.names.length === 0) {
      schema.open = true
    }

    return schema
  }

  private isWildcard(memberNode: MemberNode): boolean {
    // Named wildcard: *: type
    if (memberNode.key?.value === '*') {
      return true
    }

    // Positional wildcard: just *
    if (!memberNode.key &&
        memberNode.value?.type === TokenType.STRING &&
        memberNode.value?.value === '*') {
      return true
    }

    return false
  }
}
```

### Phase 3: Validator Enhancement

```typescript
class ObjectValidator implements TypeValidator<ObjectConfig> {
  validate(
    value: unknown,
    config: ObjectConfig,
    context: ValidationContext
  ): ValidationResult<Record<string, any>> {
    // ... common checks ...

    if (!config.schema) {
      // No schema = open object (accept anything)
      return context.success(value as Record<string, any>)
    }

    const schema = config.schema
    const result: Record<string, any> = {}
    const processedFields = new Set<string>()

    // Step 1: Validate defined fields
    for (const fieldName of schema.names) {
      const memberDef = schema.defs[fieldName]
      const fieldValue = value[fieldName]

      const fieldResult = this.validateField(
        fieldValue,
        memberDef,
        context.push(fieldName)
      )

      if (!fieldResult.success) {
        return fieldResult
      }

      result[fieldName] = fieldResult.value
      processedFields.add(fieldName)
    }

    // Step 2: Handle additional fields
    for (const key of Object.keys(value)) {
      if (processedFields.has(key)) continue

      // Check if schema allows additional fields
      if (schema.open === false) {
        return context.error(
          'UNKNOWN_FIELD',
          `Unknown field '${key}' in closed schema for '${context.path}'`
        )
      }

      // Validate additional field
      if (schema.open === true) {
        // Untyped open: accept as-is
        result[key] = value[key]
      } else {
        // Typed open: validate against constraint
        const fieldResult = this.validateField(
          value[key],
          schema.open,  // MemberDef constraint
          context.push(key)
        )

        if (!fieldResult.success) {
          return fieldResult
        }

        result[key] = fieldResult.value
      }
    }

    return context.success(result)
  }
}
```

### Phase 4: Serialization Support

```typescript
class ObjectSerializer {
  serialize(
    value: Record<string, any>,
    config: ObjectConfig,
    context: SerializationContext
  ): string {
    if (!config.schema) {
      // No schema: serialize all fields
      return this.serializeAllFields(value, context)
    }

    const schema = config.schema
    const parts: string[] = []

    // Serialize defined fields (in order)
    for (const fieldName of schema.names) {
      if (fieldName === '*') continue  // Skip wildcard marker

      if (fieldName in value) {
        const fieldValue = value[fieldName]
        const serialized = context.serializeAny(fieldValue)
        parts.push(`${fieldName}: ${serialized}`)
      }
    }

    // Serialize additional fields (if open schema)
    if (schema.isOpen) {
      const definedFields = new Set(schema.names)

      for (const key of Object.keys(value)) {
        if (definedFields.has(key)) continue

        const fieldValue = value[key]
        const serialized = context.serializeAny(fieldValue)
        parts.push(`${key}: ${serialized}`)
      }
    }

    return `{${parts.join(', ')}}`
  }
}
```

---

## 📋 V2 Implementation Checklist

### Core Infrastructure
- [ ] Add `open: boolean | MemberDef` to Schema class
- [ ] Add `openSchema` field to ObjectTypeSchema definition
- [ ] Add `isOpen`, `hasTypedOpen`, `openConstraint` getters
- [ ] Update Schema builder pattern to support `setOpen()`
- [ ] Add wildcard support to SchemaCompiler

### Compilation Logic - Wildcard Approach
- [ ] Detect `*` marker (named and positional forms)
- [ ] Validate `*` is last field (throw error if not)
- [ ] Parse wildcard type constraint
- [ ] Compile constraint as MemberDef
- [ ] Store in both `schema.defs['*']` and `schema.open`
- [ ] Set default `openSchema = true` when `*` detected
- [ ] Handle empty schema → `open = true`

### Compilation Logic - Property Approach
- [ ] Parse `openSchema` property from object MemberDef
- [ ] Support `openSchema: true` (untyped open)
- [ ] Support `openSchema: false` (explicitly closed)
- [ ] Support `openSchema: MemberDef` (typed constraint)
- [ ] Validate `openSchema` value matches anyOf constraint

### Precedence Resolution
- [ ] Implement merge pattern: `{...wildcardDefault, ...explicitProperty}`
- [ ] When both `*` and `openSchema` present, explicit `openSchema` wins
- [ ] Test: `schema: {name: string, *}, openSchema: false` → closed
- [ ] Test: `schema: {name: string, *: string}, openSchema: true` → untyped open
- [ ] Test: `schema: {name: string}, openSchema: {string, minLen: 3}` → typed open
- [ ] Ensure same precedence pattern as `optional` and `null` suffixes

### Validation Logic
- [ ] Check `schema.open` when unknown field encountered
- [ ] If `open === false`: Throw `UNKNOWN_FIELD` error
- [ ] If `open === true`: Accept field as-is (type: any)
- [ ] If `open === MemberDef`: Validate field against constraint
- [ ] Skip `*` entry in required field checks
- [ ] Handle positional overflow in open schemas
- [ ] Validate using final resolved `openSchema` value (after precedence)

### Error Handling
- [ ] `WILDCARD_NOT_LAST` - `*` must be last field
- [ ] `UNKNOWN_FIELD` - Field in closed schema
- [ ] `INVALID_ADDITIONAL_FIELD` - Field doesn't match `*` constraint
- [ ] `ADDITIONAL_VALUES_NOT_ALLOWED` - Positional overflow in closed schema
- [ ] `INVALID_OPENSCHEMA_VALUE` - Invalid value for openSchema property

### Testing - Wildcard Syntax
- [ ] Closed schema rejects unknown fields
- [ ] Open schema (untyped) accepts any fields
- [ ] Open schema (typed) validates fields against constraint
- [ ] `*` as last field works
- [ ] `*` not last throws error
- [ ] `*: string` validates as strings
- [ ] `*: {string, minLen: 3}` validates with constraints
- [ ] `*: [number]` validates as number arrays
- [ ] `*: {name: string}` validates as objects
- [ ] Empty schema is open by default
- [ ] Wildcard skipped in required field checks
- [ ] Serialization preserves additional fields in open schemas

### Testing - Property Syntax
- [ ] `openSchema: true` accepts any additional fields
- [ ] `openSchema: false` rejects additional fields
- [ ] `openSchema: string` validates as strings
- [ ] `openSchema: {string, minLen: 3}` validates with constraints
- [ ] `openSchema: [number]` validates as number arrays
- [ ] Property works without `*` wildcard in schema

### Testing - Precedence Resolution
- [ ] Wildcard open + property closed → closed
- [ ] Wildcard closed + property open → open
- [ ] Wildcard typed + property untyped → untyped
- [ ] Wildcard untyped + property typed → typed
- [ ] Wildcard string + property number → number
- [ ] Both absent → closed (default)

### Documentation
- [x] Create OPEN-SCHEMA-PATTERN.md (this document)
- [x] Document two complementary approaches (`*` wildcard + `openSchema` property)
- [x] Document precedence rules with examples
- [x] Add ObjectTypeSchema definition with `openSchema` field
- [x] Add comprehensive precedence and conflict resolution section
- [ ] Update 08-object-type.md with `openSchema` property
- [ ] Add examples to type specs
- [ ] Update TYPESCHEMA-CONCEPT.md
- [ ] Add migration notes from V1

---

## 🧪 Test Scenarios

### Test 1: Closed Schema (Default)
```typescript
const schema = compileSchema('User', 'name: string, age: number')
expect(schema.open).toBe(false)

const data = { name: 'John', age: 25, extra: 'field' }
expect(() => validate(data, schema)).toThrow('UNKNOWN_FIELD')
```

### Test 2: Open Schema (Untyped)
```typescript
const schema = compileSchema('User', 'name: string, age: number, *')
expect(schema.open).toBe(true)

const data = { name: 'John', age: 25, extra: 'field', another: 123 }
const result = validate(data, schema)
expect(result).toEqual(data)
```

### Test 3: Open Schema (Typed - String)
```typescript
const schema = compileSchema('Config', 'host: string, *: string')
expect(schema.open).toMatchObject({ type: 'string' })
expect(schema.defs['*']).toMatchObject({ type: 'string' })

const validData = { host: 'localhost', env: 'prod', region: 'us-east' }
expect(validate(validData, schema)).toEqual(validData)

const invalidData = { host: 'localhost', timeout: 30 }
expect(() => validate(invalidData, schema)).toThrow('NOT_A_STRING')
```

### Test 4: Open Schema (Typed - Complex)
```typescript
const schema = compileSchema('Product', 'name: string, *: {string, minLen: 3}')
expect(schema.open?.minLen).toBe(3)

const validData = { name: 'Widget', sku: 'ABC123', category: 'Tools' }
expect(validate(validData, schema)).toEqual(validData)

const invalidData = { name: 'Widget', id: 'AB' }  // minLen: 3 violated
expect(() => validate(invalidData, schema)).toThrow('STRING_TOO_SHORT')
```

### Test 5: Wildcard Position Validation
```typescript
// Valid: * at end
expect(() => compileSchema('S1', 'name: string, *')).not.toThrow()

// Invalid: * not at end
expect(() => compileSchema('S2', '*, name: string')).toThrow('WILDCARD_NOT_LAST')
expect(() => compileSchema('S3', 'name: string, *, age: number')).toThrow('WILDCARD_NOT_LAST')
```

### Test 6: Array Type Wildcard
```typescript
const schema = compileSchema('Tags', 'category: string, *: [string]')
expect(schema.open?.type).toBe('array')
expect(schema.open?.of?.type).toBe('string')

const validData = { category: 'Tech', tags: ['AI', 'ML'], keywords: ['data'] }
expect(validate(validData, schema)).toEqual(validData)

const invalidData = { category: 'Tech', scores: [1, 2, 3] }  // numbers not strings
expect(() => validate(invalidData, schema)).toThrow()
```

### Test 7: Empty Schema
```typescript
const schema = compileSchema('Any', '')
expect(schema.open).toBe(true)
expect(schema.names.length).toBe(0)

const data = { anything: 'goes', here: 123 }
expect(validate(data, schema)).toEqual(data)
```

### Test 8: Wildcard Skipped in Required Checks
```typescript
const schema = compileSchema('User', 'name: string, *: string')
expect(schema.defs['*']).toBeDefined()

// Should NOT require '*' field to be present
const data = { name: 'John' }
expect(validate(data, schema)).toEqual(data)
```

---

## 💡 Use Cases

### Use Case 1: Extensible API Response
```io
~ ApiResponse
success: bool, data: any, *

# Allows future fields without breaking:
# - timestamp
# - requestId
# - metadata
```

### Use Case 2: User Preferences (Typed Map)
```io
~ UserPrefs
userId: string, theme: string, *: string

# All additional preferences must be strings
# - language: en
# - timezone: UTC
# - format: 12h
```

### Use Case 3: Product Metadata
```io
~ Product
id: string, name: string, price: decimal, *: {string, minLen: 3}

# Additional attributes with validation
# - sku: ABC123
# - category: Electronics
# - brand: TechCorp
```

### Use Case 4: Configuration File
```io
~ Config
version: string, environment: string, *

# Accept any configuration keys
# - database: {...}
# - logging: {...}
# - features: {...}
```

### Use Case 5: Tag System
```io
~ Entity
id: string, name: string, *: [string]

# Additional fields are tag arrays
# - tags: [important, urgent]
# - categories: [work, project]
# - labels: [review, pending]
```

---

## 📚 Related Patterns

### Pattern 1: Gradual Schema Migration
```io
# Start: Closed schema
~ UserV1
name: string, email: email

# Transition: Open schema (collect new fields)
~ UserV2
name: string, email: email, *

# Stabilize: Typed open (validate extensions)
~ UserV3
name: string, email: email, phone?: string, *: string

# Finalize: Close schema again (all fields known)
~ UserV4
name: string, email: email, phone?: string, address?: string
```

### Pattern 2: Hybrid Schema
```io
# Core fields + flexible extensions
~ DataRecord
id: string,
timestamp: datetime,
type: string,
*: any  ← Flexible payload
```

### Pattern 3: Dictionary/Map Pattern
```io
# Schema as typed dictionary
~ StringMap
*: string

~ NumberMap
*: number

~ ComplexMap
*: {value: any, metadata: {created: datetime, author: string}}
```

---

## 🎯 Key Takeaways

1. **Three modes:** Closed (default), Open (untyped), Open (typed)
2. **Two complementary approaches:**
   - **`*` wildcard** - Syntax marker inside schema definition
   - **`openSchema` property** - Configuration property in object MemberDef
3. **No name conflicts:** `openSchema` is property name, users can have `open` data fields
4. **Precedence rule:** Explicit properties override wildcard defaults (same as `optional`/`null`)
5. **`*` syntax:** Simple and intuitive wildcard marker (must be last)
6. **Typed constraints:** Full MemberDef support for both approaches
7. **Mirrored storage:** `schema.defs['*']` and `schema.open`
8. **V1 compatibility:** Preserve exact behavior in V2
9. **Flexible validation:** Unknown fields handled gracefully
10. **Error context:** Clear messages for closed schema violations
11. **Consistent pattern:** Follows same merge order as V1 (`{...fieldInfo, ...explicitProps}`)

---

## 📖 References

- **V1 Implementation:**
  - `src/schema/schema.ts` - Schema class with `open` property
  - `src/schema/compile-object.ts` - Lines 250-260, 274-280, 299-302
  - `src/schema/object-processor.ts` - Lines 60-66, 88-103, 115-120
  - `src/schema/types/object.ts` - Lines 54-59

- **Tests:**
  - `tests/schema/core/compile-schema.additional-props.test.ts`
  - `tests/schema/revamp/revamp-suite.test.ts` - Lines 128-146

- **Related Docs:**
  - `08-object-type.md` - Object type specification
  - `TYPESCHEMA-CONCEPT.md` - TypeSchema architecture
  - `META-TYPE-MARKERS.md` - Meta-type compilation patterns

---

**Status:** Complete
**Ready for V2 Implementation:** ✅
