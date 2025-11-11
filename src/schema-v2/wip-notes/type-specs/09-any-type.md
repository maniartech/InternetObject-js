# Type Spec: Any Type

## Type: `any`

### Overview
The most flexible type that accepts any value without validation. Primarily used for:
1. **Unvalidated fields** - Accept any value with no constraints
2. **Union types** - Via `anyOf` field to validate against multiple type alternatives
3. **Dynamic schemas** - Via `isSchema` flag for runtime schema compilation
4. **Schema definitions** - Via `__memberdef` marker for MemberDef compilation

The `any` type is unique in that it serves multiple purposes: unvalidated data acceptance, type unions, and schema compilation.

### Type Names

- `any` - Accepts any value

### TypeSchema Definition (AnyTypeSchema)

This schema validates user-provided MemberDef configurations for any types.

**Any TypeSchema (IO Syntax):**

```io
# Always first three fields
type     : { any, default: any, choices: [any] },
default  : { any, optional: true, "null": false },
choices  : { array, optional: true, "null": false },

# Other type specific fields - Following fields are specific to any type
anyOf    : { array, optional: true, "null": false, of: { any, __memberdef: true } },
isSchema : { bool, optional: true, "null": false, default: false },

# Finally optional/null settings for all types
optional : { bool,   optional: true, "null": false },
"null"   : { bool,   optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{any, default: any, choices: [any]}`
- **⚠️ CRITICAL - Meta-type marker `__memberdef: true` on `anyOf.of` field**:
  - Indicates elements of `anyOf` array contain **type definitions**, not data
  - Triggers **compilation** of each array element as a MemberDef during schema parsing
  - Without this marker, system would try to validate `anyOf` elements as data (wrong!)
  - Example: `anyOf: [{type: string}, {type: number}]` compiles each element into MemberDef
- **Special field `anyOf`**: Defines union type - value must match at least one type
- **Special field `isSchema`**: When true, indicates the any field will contain a schema definition
- **Special behavior `__memberdef: true`**: When set on the MemberDef itself, triggers compilation as MemberDef (see META-TYPE-MARKERS.md)
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **Positional vs Named**: Supports both `{any, anyOf: [...]}` and `{type: any, anyOf: [...]}`

**Code (V1):**

```typescript
const of = { type: "any", __memberdef: true }

const schema = new Schema(
  "any",
  { type:     { type: "string", optional: false, null: false, choices: ["any"] } },
  { default:  { type: "any",    optional: true,  null: false } },
  { choices:  { type: "array",  optional: true,  null: false } },
  { anyOf:    { type: "array",  optional: true,  null: false, of } },
  { isSchema: { type: "bool",   optional: true,  null: false, default: false } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)
```

### TypeScript Interface (V2)

```typescript
interface AnyConfig {
  type: 'any'
  default?: any
  choices?: any[]              // Enum constraint on any type
  anyOf?: MemberDef[]          // Union type - compiled from type definitions
  isSchema?: boolean           // Indicates field contains schema definition
  optional?: boolean
  null?: boolean
}
```

---

## Core Validation

### Accepts All Values
Without constraints, `any` accepts any value:

```io
data: any
```

**Valid data:**
```io
~ $example: { data: any }
---
~ : example
data: hello          ← string
data: 123            ← number
data: true           ← boolean
data: [1, 2, 3]      ← array
data: {x: 1, y: 2}   ← object
data: null           ← null (if null: true)
```

### Choices Constraint
Like other types, `any` can have choices:

```io
mode: {any, choices: [auto, manual, 42, true, null]}
```

**Valid:** `auto`, `manual`, `42`, `true`, `null`
**Invalid:** `"test"`, `123`, `false` (not in choices)

---

## Union Types (`anyOf`)

The `anyOf` field enables **union types** - value must match at least one type definition.

### Basic Union

**Schema:**
```io
~ $product: { price: {any, anyOf: [{type: number, min: 0}, {type: string, pattern: ^\\$\\d+}]} }
```

**Valid data:**
```io
~ $product: { price: {any, anyOf: [{type: number, min: 0}, {type: string, pattern: ^\\$\\d+}]} }
---
~ : product
price: 29.99           ← Matches number constraint
price: $50             ← Matches string pattern
```

**Invalid data:**
```io
~ $product: { price: {any, anyOf: [{type: number, min: 0}, {type: string, pattern: ^\\$\\d+}]} }
---
~ : product
price: -10             ← Error: NOT_A_VALID_NUMBER (min: 0)
price: invalid         ← Error: NONE_OF_CONSTRAINTS_MATCHED
```

### Complex Union

**Schema:**
```io
~ $response: {
  value: {any, anyOf: [
    {type: string},
    {type: number},
    {type: array, of: {type: string}},
    {type: object, schema: {code: int, message: string}}
  ]}
}
```

**Valid data:**
```io
~ $response: {
  value: {any, anyOf: [
    {type: string},
    {type: number},
    {type: array, of: {type: string}},
    {type: object, schema: {code: int, message: string}}
  ]}
}
---
~ : response
value: success                        ← string
value: 200                            ← number
value: [error, warning]               ← array of strings
value: {code: 404, message: Not Found} ← object with schema
```

### Union Validation Logic

The validator tries each type in `anyOf` sequentially:

```typescript
// V2 Design (pseudocode)
for (const memberDef of config.anyOf) {
  try {
    return validateWithType(value, memberDef)
  } catch (error) {
    errors.push(error)
    continue
  }
}
// None matched
throw new ValidationError("NONE_OF_CONSTRAINTS_MATCHED")
```

**Important:** First matching type wins. Order matters if types overlap.

---

## Schema Compilation (`isSchema`)

The `isSchema` flag indicates the field will contain a schema definition.

**Usage:**
```io
schema: {any, isSchema: true}
```

**Purpose:** Tells the compiler that this field will hold a Schema object, not arbitrary data. Used internally for dynamic schema construction.

---

## Meta-Type Marker (`__memberdef`)

When the MemberDef itself has `__memberdef: true`, the `any` type triggers **MemberDef compilation**.

### V1 Implementation Pattern

```typescript
// From any.ts
if (memberDef.__memberdef) {
  const md = getMemberDef(new MemberNode(node), "", defs)
  return md
}
```

**Use case:** Dynamic field definitions where the field configuration is determined at runtime.

**Example (internal use):**
```typescript
// Parser encounters: {type: string, minLen: 3}
// When __memberdef: true, this is compiled into a MemberDef object
// Instead of being validated as data
```

See **META-TYPE-MARKERS.md** for comprehensive details on this pattern.

---

## Examples

### Example 1: Unvalidated Field

**Schema:**
```io
metadata: any
```

**Data:**
```io
~ $config: { metadata: any }
---
~ : config
metadata: {version: 1.0, tags: [beta, experimental], count: 42}
```

**No validation performed.** Any structure accepted.

### Example 2: Enum of Mixed Types

**Schema:**
```io
defaultValue: {any, choices: [auto, 0, false, null]}
```

**Valid data:**
```io
~ $settings: { defaultValue: {any, choices: [auto, 0, false, null]} }
---
~ : settings
defaultValue: auto
defaultValue: 0
defaultValue: false
defaultValue: null
```

### Example 3: String or Number

**Schema:**
```io
id: {any, anyOf: [{type: string}, {type: number}]}
```

**Valid data:**
```io
~ $item: { id: {any, anyOf: [{type: string}, {type: number}]} }
---
~ : item
id: ABC123
id: 42
```

**Invalid data:**
```io
~ $item: { id: {any, anyOf: [{type: string}, {type: number}]} }
---
~ : item
id: true       ← Error: NONE_OF_CONSTRAINTS_MATCHED
id: [1, 2, 3]  ← Error: NONE_OF_CONSTRAINTS_MATCHED
```

### Example 4: Flexible Response Type

**Schema:**
```io
~ $apiResponse: {
  result: {any, anyOf: [
    {type: object, schema: {success: bool, data: any}},
    {type: object, schema: {error: bool, message: string}}
  ]}
}
```

**Valid data:**
```io
~ $apiResponse: {
  result: {any, anyOf: [
    {type: object, schema: {success: bool, data: any}},
    {type: object, schema: {error: bool, message: string}}
  ]}
}
---
~ : apiResponse
result: {success: true, data: {user: john, age: 30}}

~ : apiResponse
result: {error: true, message: User not found}
```

### Example 5: Array of Mixed Types

**Schema:**
```io
values: {array, of: {any, anyOf: [{type: string}, {type: number}]}}
```

**Valid data:**
```io
~ $mixedData: { values: {array, of: {any, anyOf: [{type: string}, {type: number}]}} }
---
~ : mixedData
values: [hello, 42, world, 3.14]
```

Each element validated independently - must be string OR number.

---

## Error Codes

| Code | Condition | Message |
|------|-----------|---------|
| **INVALID_CHOICE** | Value not in choices | "Value '{value}' is not one of the allowed choices" |
| **NONE_OF_CONSTRAINTS_MATCHED** | No anyOf type matched | "None of the constraints defined for '{path}' matched" |
| **INVALID_VALUE** | Generic validation failure | "Invalid value for field '{path}'" |

---

## V1 Code Reference

**File:** `src/schema/types/any.ts`

### Key Patterns

```typescript
// Line 14: Meta-type marker on anyOf elements
const of = { type: "any", __memberdef: true }

// Line 18: anyOf field uses the marker
{ anyOf: { type: "array", optional: true, null: false, of } }

// Line 39: Check for __memberdef compilation
if (memberDef.__memberdef) {
  const md = getMemberDef(new MemberNode(node), "", defs)
  return md
}

// Line 45-60: anyOf validation loop
for (let i=0; i<anyOf.length; i++) {
  const def = anyOf[i]  // Each def is a compiled MemberDef
  const typeDef = TypedefRegistry.get(def.type)

  try {
    return typeDef.parse(node, def, defs, collectionIndex)
  } catch (e) {
    errors.push(e)
    continue
  }
}

// If no type matched
if (errors.length === anyOf.length) {
  throw new ValidationError(...)
}
```

---

## V2 Design Outline

### AnyValidator Class

```typescript
class AnyValidator implements TypeValidator {
  validate(value: any, config: AnyConfig, context: ValidationContext): any {
    // Step 1: Common checks (null, optional, default)
    const result = doCommonValidation(value, config, context)
    if (result.handled) return result.value

    // Step 2: Choices constraint
    if (config.choices && !config.choices.includes(value)) {
      throw new ValidationError("INVALID_CHOICE", ...)
    }

    // Step 3: anyOf union validation
    if (config.anyOf) {
      return validateUnion(value, config.anyOf, context)
    }

    // Step 4: No validation (accept any)
    return value
  }

  private validateUnion(value: any, anyOf: MemberDef[], context: ValidationContext): any {
    const errors: ValidationError[] = []

    for (const memberDef of anyOf) {
      try {
        const validator = getValidator(memberDef.type)
        return validator.validate(value, memberDef, context)
      } catch (error) {
        errors.push(error)
        continue
      }
    }

    // None matched
    throw new ValidationError(
      "NONE_OF_CONSTRAINTS_MATCHED",
      `None of the constraints defined for '${context.path}' matched`,
      context
    )
  }
}
```

### Compilation Support

```typescript
class SchemaCompiler {
  compileMemberDef(node: Node): MemberDef {
    // ...existing compilation logic...

    // Check for anyOf with __memberdef marker
    if (config.anyOf && hasMetaTypeMarker(schema, 'anyOf.of', '__memberdef')) {
      config.anyOf = config.anyOf.map(def => this.compileMemberDef(def))
    }

    return memberDef
  }
}
```

---

## Notes

### Design Philosophy

1. **Flexibility First**: `any` is the escape hatch when strict typing isn't needed
2. **Progressive Enhancement**: Start with `any`, add `anyOf` for union types, refine to specific types later
3. **Union Type Foundation**: `anyOf` enables TypeScript-like union types in IO

### Union Type Strategy

**Order matters:**
```io
~ Example
value: {any, anyOf: [{type: number}, {type: string}]}
```

If value is `"123"`, it matches string (not parsed as number). First match wins.

**Best practice:** Order from most specific to least specific:
```io
value: {any, anyOf: [
  {type: decimal},      # Most specific
  {type: number},       # Less specific
  {type: string}        # Least specific
]}
```

### Meta-Type Markers

The `any` type has **two** meta-type marker use cases:

1. **`anyOf.of` with `__memberdef: true`**: Each element in `anyOf` array is compiled as MemberDef
   ```typescript
   anyOf: { type: "array", of: { type: "any", __memberdef: true } }
   ```

2. **MemberDef itself with `__memberdef: true`**: The field value is compiled as MemberDef
   ```typescript
   if (memberDef.__memberdef) {
     return getMemberDef(node)
   }
   ```

See **META-TYPE-MARKERS.md** for detailed explanation and implementation strategy.

### Common Patterns

**Pattern 1: Flexible ID field**
```io
id: {any, anyOf: [{type: string}, {type: number}]}
```

**Pattern 2: Nullable string or number**
```io
value: {any, anyOf: [{type: string}, {type: number}], "null": true}
```

**Pattern 3: Status code (string or number)**
```io
status: {any, anyOf: [{type: string}, {type: int, min: 100, max: 599}]}
```

**Pattern 4: Array or single item**
```io
tags: {any, anyOf: [{type: string}, {type: array, of: {type: string}}]}
```

### Performance Considerations

- **`any` without constraints**: Near-zero overhead (no validation)
- **`any` with `anyOf`**: Linear cost - tries each type until match (O(n))
- **Optimization**: Order `anyOf` by expected frequency (most common first)

### Testing Checklist

- [ ] Accept all primitive types (string, number, boolean, null)
- [ ] Accept complex types (array, object)
- [ ] Validate choices constraint
- [ ] anyOf with 2 types (string | number)
- [ ] anyOf with 3+ types
- [ ] anyOf with complex types (object with schema)
- [ ] anyOf error when none match
- [ ] anyOf preserves order (first match wins)
- [ ] Meta-type marker compilation for anyOf elements
- [ ] Meta-type marker compilation for field itself
- [ ] isSchema flag behavior

---

## Related Documentation

- **META-TYPE-MARKERS.md** - Comprehensive guide to `__memberdef` and `__schema` markers
- **TYPESCHEMA-CONCEPT.md** - Two-phase validation architecture
- **07-array-type.md** - Array type with `of` field using `__memberdef: true`
- **08-object-type.md** - Object type with `schema` field using `__schema: true`

---

## Summary

The `any` type is the **most flexible** type in Internet Object:

1. **No validation mode**: Accepts any value when used alone
2. **Union types**: `anyOf` field enables TypeScript-like union types
3. **Schema compilation**: Special markers and flags for meta-type handling
4. **Progressive typing**: Start loose, add constraints incrementally

**Key insight:** `any` is not just "no validation" - it's the foundation for union types and dynamic schemas, making it one of the most powerful and versatile types in IO.
