# Type Spec: Object Type

## Type: `object`

### Overview
Validates object/struct values. The foundational type for structured data in Internet Object. Supports schema validation, nested objects, optional/required fields, and both open and closed schemas. Objects are the primary way to represent complex data structures.

### Type Names
- `object` - Structured key-value collection

### TypeSchema Definition (ObjectTypeSchema)

This schema validates user-provided MemberDef configurations for object types.

**Object TypeSchema (IO Syntax):**

```io
# Always first three fields
type     : { object, default: object, choices: [object] },
default  : { object, optional: true, "null": false },

# Other type specific fields - Following fields are specific to object type
schema   : { object, optional: true, "null": false, __schema: true },

# Finally optional/null settings for all types
optional : { bool,   optional: true, "null": false },
"null"   : { bool,   optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{object, default: object, choices: [object]}`
- **⚠️ CRITICAL - Meta-type marker `__schema: true` on `schema` field**:
  - Indicates `schema` contains a **schema definition**, not data
  - Triggers **compilation** of the value as a Schema during schema parsing
  - Without this marker, system would try to validate `schema` value as object data (wrong!)
  - Example: `schema: {name: string, age: number}` is compiled into Schema, not validated as data
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **Positional vs Named**: Supports both `{object, schema: UserSchema}` and `{type: object, schema: UserSchema}`

**Code (V1):**

```typescript
const schema = new Schema(
  "object",
  { type:     { type: "string", optional: false, null: false, choices: ["object"] } },
  { default:  { type: "object", optional: true,  null: false } },
  { schema:   { type: "object", optional: true,  null: false, __schema: true } },
  { optional: { type: "bool",   optional: true, null: false } },
  { null:     { type: "bool",   optional: true, null: false } },
)
```

### TypeScript Interface (V2)

```typescript
interface ObjectConfig {
  type: 'object'
  default?: Record<string, any>
  schema?: Schema               // Schema defining object structure
  optional?: boolean
  null?: boolean
}
```

### The `schema` Field

The `schema` field defines the structure of the object:

**Inline Schema:**
```io
profile: {object, schema: {name: string, age: number}}
```

**Reference Schema:**
```io
~ $profile: { name: string, age: number }
~ $user: { profile: {object, schema: profile} }
```

**Open Schema (no validation):**
```io
metadata: object  ← Any object structure allowed
```

### Schema Types

#### Closed Schema (Default)
Only defined fields allowed:

```io
~ $user: { name: string, age: number }
---
~ : user
name: John, age: 25  ← Valid
name: John, age: 25, extra: field  ← Error: Unknown field 'extra'
```

#### Open Schema
Additional fields allowed using `*` (asterisk):

**Syntax 1: Wildcard `*` alone (any additional fields):**
```io
~ $user: { name: string, age: number, * }
---
~ : user
name: John, age: 25, extra: field, another: value  ← Valid (any extra fields allowed)
```

**Syntax 2: Typed wildcard `*: type` (constrained additional fields):**
```io
~ $config: { host: string, port: number, *: string }
---
~ : config
host: localhost, port: 8080, env: prod, region: us-east  ← Valid (extra fields must be strings)
host: localhost, port: 8080, timeout: 30  ← Error: timeout must be string, not number
```

**Syntax 3: Complex typed wildcard (with constraints):**
```io
version: string, *: {string, minLen: 3}

category: string, *: [string]  ← Additional fields must be arrays of strings
```

**Important Rules:**
- `*` or `*: type` must be the **last field** in the schema
- Without `*`, schema is closed (rejects unknown fields)
- `*` alone: `schema.open = true` (any type allowed)
- `*: type`: `schema.open = MemberDef` (additional fields validated against type)
- Additional fields stored in `schema.defs['*']` and mirrored to `schema.open`

### Validation Rules

**Common Validations** (from `doCommonTypeCheck`):
1. **Undefined Check** - Returns default, undefined (if optional), or throws error
2. **Null Check** - Returns null (if allowed) or throws error
3. **Choices Validation** - Not commonly used for objects

**Type-Specific Validations**:

1. **Type Validation**
   - Must be an ObjectNode
   - Throws `INVALID_OBJECT` if not an object

2. **Schema Validation**
   - If `schema` defined: validates each field against schema
   - If no `schema`: open object (any fields allowed)
   - For closed schemas: unknown fields throw error
   - For open schemas: unknown fields passed through

3. **Field Validation**
   - Each field validated against its MemberDef
   - Required fields must be present
   - Optional fields can be omitted
   - Field errors include full path (e.g., `user.profile.name`)

4. **Nested Object Support**
   - Objects can contain objects (unlimited nesting)
   - Each level independently validated
   - Path tracking maintains full context

### V1 Implementation Reference

**File:** `src/schema/types/object.ts`

```typescript
class ObjectDef implements TypeDef {
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): any {
    // 1. Resolve variable if needed
    const valueNode = defs?.getV(node) || node

    // 2. Common type checks (undefined, null, choices)
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    // 3. Type check: must be ObjectNode
    if (!(valueNode instanceof ObjectNode)) {
      throw new ValidationError(ErrorCodes.invalidObject, ...)
    }

    // 4. Handle special cases
    if (memberDef.__schema) {
      // Compiling a schema definition
      return compileObject(memberDef.path, valueNode, defs)
    }

    // 5. Get or create schema
    let schema = memberDef.schema
    if (!schema) {
      schema = new Schema(memberDef.path || "")
      schema.open = true  // No schema = open object
    }

    // 6. Process object
    return processObject(valueNode, schema, defs)
  }
}
```

**File:** `src/schema/compile-object.ts` (Lines 250-302)

```typescript
// Handle wildcard marker for open schemas
if (memberNode.key && memberNode.key.value === '*') {
  // Typed wildcard: *: type
  if (memberNode.value) {
    const additionalDef = canonicalizeAdditionalProps(memberNode.value, '*')
    schema.defs['*'] = additionalDef
    schema.open = additionalDef  // Mirror to schema.open
  } else {
    // Untyped wildcard: just *
    schema.open = true
  }

  // Enforce: * must be last
  if (index !== o.children.length - 1) {
    throw new SyntaxError(ErrorCodes.invalidSchema,
      "The * is only allowed at the last position.", memberNode.value)
  }
  continue
}

// Handle positional wildcard
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

// Empty schema defaults to open
if (schema.names.length === 0) {
  schema.open = true
}
```

**File:** `src/schema/object-processor.ts` (Lines 88-103)

```typescript
// Handle unknown fields based on schema.open
let memberDef = schema.defs[name]

// Closed schema: reject unknown fields
if (!memberDef && !schema.open) {
  throw new SyntaxError(
    ErrorCodes.unknownMember,
    `The ${schema.name ? `${schema.name} ` : ''}schema does not ` +
    `define a member named '${name}'.`, member.key)
}

// Open schema: create dynamic MemberDef
if (!memberDef && schema.open) {
  if (typeof schema.open === 'object' && schema.open.type) {
    // Typed: use constraint
    memberDef = { ...schema.open, path: name }
  } else {
    // Untyped: any type
    memberDef = { type: 'any', path: name }
  }
}

processedNames.add(name)
const val = processMember(member, memberDef, defs)
o.set(name, val)
```

**File:** `src/schema/object-processor.ts` (Lines 115-120)

```typescript
// Skip wildcard in required field checks
for (const name in schema.defs) {
  // Skip the wildcard additional property definition ('*').
  // It's not an actual member and must not participate in required checks.
  if (name === '*') continue

  const memberDef = schema.defs[name]
  // ... validation logic
}
```

**File:** `src/schema/schema.ts`

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

### V2 Design

```typescript
class ObjectTypeSchema implements TypeSchema<ObjectConfig, Record<string, any>> {
  readonly typeName = 'object';

  validate(value: unknown, config: ObjectConfig, ctx: ValidationContext): ValidationResult<Record<string, any>> {
    // 1. Common checks (handled by base validator)
    const commonResult = doCommonTypeCheck(value, config, ctx);
    if (commonResult.handled) return commonResult;

    // 2. Type validation
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return ctx.error('INVALID_OBJECT', `Expected object for '${ctx.path}'`);
    }

    // 3. Schema validation
    if (!config.schema) {
      // Open object (no validation)
      return ctx.success(value);
    }

    // 4. Validate against schema
    return this.validateAgainstSchema(value, config.schema, ctx);
  }

  validateAgainstSchema(value: Record<string, any>, schema: Schema, ctx: ValidationContext): ValidationResult<Record<string, any>> {
    const validatedObject: Record<string, any> = {};
    const seenFields = new Set<string>();

    // Step 1: Validate schema-defined fields
    for (const fieldName of schema.names) {
      // Skip wildcard marker (not a real field)
      if (fieldName === '*') continue;

      const memberDef = schema.defs[fieldName];
      const fieldCtx = ctx.push(fieldName);

      // Check if field present (by name or position)
      const fieldValue = this.getFieldValue(value, fieldName, memberDef, seenFields);

      // Validate field
      const fieldResult = ctx.validator.validateField(fieldValue, memberDef, fieldCtx);

      if (!fieldResult.success) {
        return fieldResult;  // Propagate field error
      }

      validatedObject[fieldName] = fieldResult.value;
      seenFields.add(fieldName);
    }

    // Step 2: Handle additional (unknown) fields
    for (const key of Object.keys(value)) {
      if (seenFields.has(key)) continue;  // Already processed

      // Check if schema allows additional fields
      if (schema.open === false) {
        // Closed schema: reject unknown field
        return ctx.error(
          'UNKNOWN_FIELD',
          `Unknown field '${key}' in closed schema for '${ctx.path}'`
        );
      }

      // Open schema: validate additional field
      if (schema.open === true) {
        // Untyped open: accept as-is (type: any)
        validatedObject[key] = value[key];
      } else {
        // Typed open: validate against constraint (schema.open is MemberDef)
        const fieldCtx = ctx.push(key);
        const fieldResult = ctx.validator.validateField(
          value[key],
          schema.open,  // MemberDef constraint
          fieldCtx
        );

        if (!fieldResult.success) {
          return fieldResult;  // Propagate validation error
        }

        validatedObject[key] = fieldResult.value;
      }
    }

    return ctx.success(validatedObject);
  }

  getFieldValue(obj: Record<string, any>, fieldName: string, memberDef: MemberDef, seenFields: Set<string>): unknown {
    // Try name match first
    if (fieldName in obj) {
      return obj[fieldName];
    }

    // Try positional match (if object is array-like)
    const position = memberDef.position;
    if (position !== undefined && Array.isArray(obj)) {
      return obj[position];
    }

    // Field not found
    return undefined;
  }

  serialize(value: Record<string, any>, config: ObjectConfig, ctx: SerializationContext): string {
    if (!config.schema) {
      // No schema: serialize all fields
      const entries = Object.entries(value).map(([key, val]) => {
        const serializedValue = ctx.serializeAny(val);
        return `${key}: ${serializedValue}`;
      });
      return `{${entries.join(', ')}}`;
    }

    const schema = config.schema;
    const parts: string[] = [];
    const serializedFields = new Set<string>();

    // Step 1: Serialize defined fields (in schema order)
    for (const fieldName of schema.names) {
      if (fieldName === '*') continue;  // Skip wildcard

      if (fieldName in value) {
        const fieldValue = value[fieldName];
        const serialized = ctx.serializeAny(fieldValue);
        parts.push(`${fieldName}: ${serialized}`);
        serializedFields.add(fieldName);
      }
    }

    // Step 2: Serialize additional fields (if open schema)
    if (schema.open !== false) {
      for (const key of Object.keys(value)) {
        if (serializedFields.has(key)) continue;

        const fieldValue = value[key];
        const serialized = ctx.serializeAny(fieldValue);
        parts.push(`${key}: ${serialized}`);
      }
    }

    return `{${parts.join(', ')}}`;
  }
}
```

**Enhanced Schema Class (V2):**

```typescript
export class Schema {
  public name: string
  public readonly names: string[] = []
  public readonly defs: MemberMap = {}

  /**
   * Controls additional properties behavior:
   * - false: Closed schema (reject unknown fields) - DEFAULT
   * - true: Open schema (accept any unknown fields as type: any)
   * - MemberDef: Open schema (validate unknown fields against constraint)
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

**Schema Compiler Enhancement (V2):**

```typescript
class SchemaCompiler {
  compileSchema(node: ObjectNode, schemaName: string): Schema {
    const schema = new Schema(schemaName)

    for (let i = 0; i < node.children.length; i++) {
      const memberNode = node.children[i] as MemberNode

      // Check for wildcard marker
      if (this.isWildcard(memberNode)) {
        // Enforce: * must be last field
        if (i !== node.children.length - 1) {
          throw new CompilationError(
            'WILDCARD_NOT_LAST',
            'The * wildcard must be the last field in schema',
            memberNode
          )
        }

        // Handle typed vs untyped wildcard
        if (memberNode.value) {
          // Typed: *: type
          const constraint = this.compileMemberDef(memberNode.value)
          schema.defs['*'] = constraint
          schema.open = constraint
        } else {
          // Untyped: just *
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

### Examples

#### User Schema Examples

**Nested object (inline schema):**
```io
name: string,
profile: {object, schema: {
  bio: string,
  location: string,
  website?: url
}}
```

**Nested object (reference schema):**
```io
~ $profile: { bio: string, location: string, website?: url }
~ $user: { name: string, profile: {object, schema: profile} }
```

**Open object (no schema):**
```io
name: string,
metadata: object  ← Any object structure allowed
```

**Optional nested object:**
```io
name: string,
profile?: {object, schema: {bio: string}}  ← Entire profile can be omitted
```

#### Valid Data Examples

**Named fields:**
```io
~ $user: { name: string, profile: {object, schema: {bio: string, location: string}} }
---
~ : user
{
  name: John Doe,
  profile: {
    bio: "Software developer",
    location: "San Francisco"
  }
}
```

**Positional fields (CSV-style):**
```io
~ $user: { name: string, profile: {object, schema: {bio: string, location: string}} }
---
~ : user
John Doe, [Software developer, San Francisco]
```

**Mixed positional and named:**
```io
~ $user: { name: string, profile: {object, schema: {bio: string, location: string}} }
---
~ : user
John Doe, {location: San Francisco, bio: Software developer}
```

**Open schema with extra fields (using `*`):**
```io
~ $metadata: { version: string, * }
---
~ : metadata
{
  version: 1.0,
  author: John,      ← Extra field (allowed because schema has *)
  timestamp: 2025-01-21
}
```

**Open schema with typed additional fields:**
```io
~ $config: { host: string, port: number, *: string }
---
~ : config
{
  host: localhost,
  port: 8080,
  env: production,   ← Extra field, validated as string
  region: us-east    ← Extra field, validated as string
}
```

**Open schema with complex type constraint:**
```io
~ $product: { name: string, price: decimal, *: {string, minLen: 3} }
---
~ : product
{
  name: Widget,
  price: 19.99m,
  sku: ABC123,        ← Extra field, must be string with minLen: 3
  category: Tools     ← Extra field, must be string with minLen: 3
}
```

#### Invalid Data Examples

**Type mismatch:**
```io
~ $user: { profile: {object, schema: {bio: string}} }
---
~ : user
profile: "Not an object"  ← Error: INVALID_OBJECT
```

**Missing required field:**
```io
~ $user: { name: string, profile: {object, schema: {bio: string, location: string}} }
---
~ : user
{
  name: John Doe,
  profile: {
    bio: "Software developer"
    # Missing 'location'
  }
}
← Error: VALUE_REQUIRED for profile.location
```

**Unknown field in closed schema:**
```io
~ $user: { name: string, age: number }
---
~ : user
{
  name: John Doe,
  age: 25,
  extra: field  ← Error: UNKNOWN_FIELD 'extra'
}
```

**Wrong type in typed open schema:**
```io
~ $config: { host: string, *: string }
---
~ : config
{
  host: localhost,
  timeout: 30  ← Error: NOT_A_STRING (additional fields must be strings)
}
```

**Nested validation error:**
```io
~ $user: { profile: {object, schema: {age: {number, min: 18}}} }
---
~ : user
profile: {age: 15}  ← Error: OUT_OF_RANGE at profile.age
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| INVALID_OBJECT | Value is not an object | Expecting an object value for '{path}' |
| UNKNOWN_FIELD | Field not in closed schema | Unknown field '{fieldName}' in closed schema for '{path}' |
| VALUE_REQUIRED | Required field missing | Value required for '{path}.{fieldName}' |
| NULL_NOT_ALLOWED | Value is null but null: false | Null value not allowed for {path} |
| WILDCARD_NOT_LAST | `*` not at end of schema | The * wildcard must be the last field in schema |
| ADDITIONAL_VALUES_NOT_ALLOWED | Positional overflow in closed schema | Additional values are not allowed in the {schemaName}. The schema is not open |
| INVALID_ADDITIONAL_FIELD | Additional field violates type constraint | Additional field '{fieldName}' does not match required type |

### Notes

**Positional vs Named Fields:**
- **Named:** `{name: John, age: 30}` - Fields matched by key
- **Positional:** `[John, 30]` - Fields matched by schema order
- **Mixed:** `John, {age: 30}` - First positional, rest named
- Same flexibility as top-level objects

**Open vs Closed Schemas:**
- **Closed (default):** Only schema-defined fields allowed
  - Strict validation
  - Catches typos in field names
  - Example: `~ User` with `name: string, age: number`
  - Rejects unknown fields with `UNKNOWN_FIELD` error

- **Open with `*` alone:** Extra fields allowed (any type)
  - Flexible validation
  - Useful for extensible data
  - Example: `~ User` with `name: string, age: number, *`
  - Sets `schema.open = true`
  - Additional fields validated as `type: any`

- **Open with `*: type`:** Extra fields must match type
  - Typed flexibility
  - Useful for typed maps or dictionaries
  - Example: `~ Config` with `host: string, port: number, *: string`
  - Sets `schema.open = MemberDef` (the type constraint)
  - Additional fields validated against specified type
  - Stored in `schema.defs['*']` and `schema.open`

**Key Rules:**
- `*` must be the **last field** in schema definition
- Without `*`, schema is closed (strict mode)
- `*` creates `schema.open = true` (accept any)
- `*: type` creates `schema.open = MemberDef` (typed additional fields)

**Nested Object Depth:**
- Unlimited nesting supported
- Each level independently validated
- Full path tracking (e.g., `user.profile.address.city`)
- Performance: O(n) where n = total fields across all levels

**Schema Compilation:**
- `__schema: true` marker indicates schema definition
- Used when parsing schema definitions themselves
- Distinguishes from regular object data
- Example: When parsing `~ UserSchema` definition

**Default Values:**
- Object fields can have defaults
- Nested object can have default
- Default applied when field undefined
- Not applied when field null (unless `null: true`)

**Validation Order:**
1. Type check (is it an object?)
2. Schema lookup (inline vs reference)
3. Field presence check (required fields)
4. Field value validation (each field against MemberDef)
5. Unknown field check (closed schema only)

**Error Context:**
- Errors include full path to problematic field
- Example: `user.profile.address.zipCode`
- Helps debugging deeply nested structures
- Preserves validation context across levels

**Performance Considerations:**
- Deep nesting adds overhead (each level validated)
- Large objects with many fields slower than primitives
- Open schemas faster (skip unknown field validation)
- Consider flattening deeply nested structures if performance critical

**V1 Utilities:**
- `compileObject()` - Compiles schema definitions
- `processObject()` - Validates and converts ObjectNode to JS object
- Handles positional/named field matching
- Tracks validation path

**Open Schema Use Cases:**
1. **Extensible APIs** - Accept future fields without breaking
2. **Metadata/Config objects** - User-defined properties
3. **Dynamic data** - Schema-less portions of structured data
4. **Typed dictionaries** - String maps with type constraints
5. **Migration scenarios** - Gradual schema evolution

---

## Related Documentation

- **OPEN-SCHEMA-PATTERN.md** - Comprehensive guide to open schema implementation
  - Three modes: Closed, Open (untyped), Open (typed)
  - V1 implementation patterns with code references
  - V2 implementation strategy and checklist
  - Test scenarios and use cases
  - Migration patterns

- **META-TYPE-MARKERS.md** - Meta-type compilation patterns (`__schema: true`)
- **TYPESCHEMA-CONCEPT.md** - Two-phase validation architecture
- **07-array-type.md** - Array type with `of` field

---

**Status:** Complete
**Last Updated:** 2025-01-21
