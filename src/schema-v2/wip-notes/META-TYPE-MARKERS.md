# Meta-Type Markers: `__memberdef` and `__schema`

**Status:** Architecture Document - Critical for V2 Implementation
**Version:** 1.0
**Last Updated:** 2025-01-21

---

## 🎯 Purpose

Meta-type markers (`__memberdef` and `__schema`) solve a fundamental ambiguity in Internet Object: distinguishing between **data validation** and **schema compilation** for types that contain type definitions.

---

## 🔑 The Core Problem

### Dual-Purpose Types

Types like `array`, `object`, and `any` serve two purposes:

1. **Data Validation** - Validating actual data values
2. **Schema Compilation** - Parsing schema definitions themselves

### The Ambiguity

```io
~ User
tags: {array, of: {type: string}}
```

**Question:** Is `{type: string}` data or a schema definition?

**Without markers:** System would interpret it as data → ❌ Validation error
**With `__memberdef: true`:** System compiles it as a MemberDef → ✅ Correct

---

## 📐 Marker Types

### 1. `__memberdef: true`

**Purpose:** Indicates the field contains a **MemberDef definition**, not data.

**Used by:**
- `array.of` - Defines element type
- `any.anyOf` - Defines union type alternatives

**What it does:**
- Triggers compilation of the value as a MemberDef
- Calls `getMemberDef()` to parse type definition
- Stores compiled MemberDef for validation

**Example:**
```typescript
const arraySchema = new Schema(
  "array",
  { of: { type: "any", optional: true, null: false, __memberdef: true } }
  //                                                 ↑
  //                                    Compile, don't validate!
)
```

### 2. `__schema: true`

**Purpose:** Indicates the field contains a **Schema definition**, not data.

**Used by:**
- `object.schema` - Defines object structure

**What it does:**
- Triggers compilation of the value as a Schema
- Calls `compileObject()` to parse object definition
- Stores compiled Schema for validation

**Example:**
```typescript
const objectSchema = new Schema(
  "object",
  { schema: { type: "object", optional: true, null: false, __schema: true } }
  //                                                       ↑
  //                                          Compile as Schema!
)
```

---

## 🔄 Compilation Flow

### Array with `__memberdef`

**User Schema:**
```io
~ Product
tags: {array, of: {type: string, minLen: 3}}
```

**Compilation Steps:**

1. **Parse field:** `tags: {array, of: ...}`
2. **Lookup TypeSchema:** ArrayTypeSchema
3. **Check field config:** `of` has `__memberdef: true`
4. **Trigger compilation:** `getMemberDef({type: string, minLen: 3})`
5. **Result:** `tags.of = MemberDef { type: 'string', minLen: 3 }`
6. **Store in schema:** Used for element validation

**Data Validation:**
```io
~ ProductData : Product
[electronics, laptop, gaming]
```

Each element validated against compiled `tags.of` MemberDef.

### Object with `__schema`

**User Schema:**
```io
~ User
profile: {object, schema: {name: string, age: number}}
```

**Compilation Steps:**

1. **Parse field:** `profile: {object, schema: ...}`
2. **Lookup TypeSchema:** ObjectTypeSchema
3. **Check field config:** `schema` has `__schema: true`
4. **Trigger compilation:** `compileObject({name: string, age: number})`
5. **Result:** `profile.schema = Schema { fields: [name, age] }`
6. **Store in schema:** Used for object validation

**Data Validation:**
```io
~ UserData : User
profile: {name: John, age: 30}
```

Profile object validated against compiled `profile.schema`.

---

## 💻 V1 Implementation Reference

### Array Type (V1)

**TypeSchema definition:**
```typescript
const schema = new Schema(
  "array",
  { type:     { type: "string", optional: false, null: false, choices: ["array"] } },
  { default:  { type: "array",  optional: true,  null: false } },
  { of:       { type: "any",    optional: true,  null: false, __memberdef: true } },
  //                                                           ↑
  //                                              Critical marker!
  { len:      { type: "number", optional: true,  null: false, min: 0 } },
  { minLen:   { type: "number", optional: true,  null: false, min: 0 } },
  { maxLen:   { type: "number", optional: true,  null: false, min: 0 } },
)
```

**Parsing logic:**
```typescript
// In array.ts
if (memberDef.of instanceof Schema) {
  typeDef = TypedefRegistry.get('object')
  arrayMemberDef.schema = memberDef.of
} else if (memberDef.of?.type) {
  // of is a MemberDef (compiled via __memberdef: true)
  typeDef = TypedefRegistry.get(memberDef.of.type)
  arrayMemberDef = memberDef.of
} else {
  typeDef = TypedefRegistry.get('any')
}
```

### Object Type (V1)

**TypeSchema definition:**
```typescript
const schema = new Schema(
  "object",
  { type:     { type: "string", optional: false, null: false, choices: ["object"] } },
  { default:  { type: "object", optional: true,  null: false } },
  { schema:   { type: "object", optional: true,  null: false, __schema: true } },
  //                                                           ↑
  //                                              Critical marker!
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)
```

**Parsing logic:**
```typescript
// In object.ts
if (memberDef.__schema) {
  // Compiling a schema definition (triggered by __schema: true)
  return compileObject(memberDef.path, valueNode, defs)
}

if (!schema) {
  // No schema = open object
  schema = new Schema(memberDef.path || "")
  schema.open = true
}
return processObject(valueNode, schema, defs)
```

### Any Type (V1)

**TypeSchema definition:**
```typescript
const of = { type: "any", __memberdef: true }

const schema = new Schema(
  "any",
  { type:     { type: "string", optional: false, null: false, choices: ["any"] } },
  { default:  { type: "any",    optional: true,  null: false } },
  { choices:  { type: "array",  optional: true,  null: false } },
  { anyOf:    { type: "array",  optional: true,  null: false, of } },
  //                                                           ↑
  //                                  Each element is a MemberDef
  { isSchema: { type: "bool",   optional: true,  null: false, default: false } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)
```

**Parsing logic:**
```typescript
// In any.ts
if (memberDef.__memberdef) {
  // Convert to memberDef (triggered during schema compilation)
  const md = getMemberDef(new MemberNode(node), "", defs)
  return md
}

// anyOf validation
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
```

---

## 🏗️ V2 Implementation Strategy

### 1. TypeSchema Interface Extension

```typescript
interface TypeSchemaField {
  type: string
  optional?: boolean
  null?: boolean
  __memberdef?: boolean    // ← Add marker support
  __schema?: boolean       // ← Add marker support
  // ... other properties
}

interface TypeSchema {
  name: string
  fields: Map<string, TypeSchemaField>

  // Method to check if field is a meta-type
  isMetaField(fieldName: string): boolean
  getMetaType(fieldName: string): 'memberdef' | 'schema' | null
}
```

### 2. Schema Compiler Enhancement

```typescript
class SchemaCompiler {
  compileMemberDef(node: Node, memberDef: MemberDef, defs: Definitions): MemberDef {
    const typeSchema = this.getTypeSchema(memberDef.type)

    // Check each field for meta-type markers
    for (const [fieldName, fieldValue] of Object.entries(memberDef)) {
      const fieldConfig = typeSchema.fields.get(fieldName)

      if (fieldConfig?.__memberdef) {
        // Compile as MemberDef
        memberDef[fieldName] = this.compileMemberDef(fieldValue, ...)
      } else if (fieldConfig?.__schema) {
        // Compile as Schema
        memberDef[fieldName] = this.compileSchema(fieldValue, ...)
      }
    }

    return memberDef
  }
}
```

### 3. Validator Updates

**Array Validator:**
```typescript
class ArrayValidator {
  validate(value: unknown[], config: ArrayConfig, ctx: ValidationContext): ValidationResult {
    // ... common checks

    // Validate elements
    for (let i = 0; i < value.length; i++) {
      const element = value[i]

      if (config.of instanceof Schema) {
        // of is a compiled Schema (for array of objects)
        result = this.validateObject(element, config.of, ctx.push(`[${i}]`))
      } else if (config.of instanceof MemberDef) {
        // of is a compiled MemberDef (from __memberdef: true)
        result = this.validateField(element, config.of, ctx.push(`[${i}]`))
      } else {
        // No validation (any type)
        result = { success: true, value: element }
      }

      if (!result.success) return result
      validatedArray.push(result.value)
    }

    return { success: true, value: validatedArray }
  }
}
```

**Object Validator:**
```typescript
class ObjectValidator {
  validate(value: unknown, config: ObjectConfig, ctx: ValidationContext): ValidationResult {
    // ... common checks

    if (config.__schema) {
      // This is a schema definition being compiled, not data!
      // Should not reach here during normal validation
      throw new Error('Unexpected __schema during validation - should be handled during compilation')
    }

    if (!config.schema) {
      // Open object (no schema validation)
      return { success: true, value }
    }

    // Validate against compiled schema
    return this.validateAgainstSchema(value, config.schema, ctx)
  }
}
```

### 4. Type Spec Updates

**Update Array TypeSchema:**
```io
# Always first three fields
type    : { array, default: array, choices: [array] },
default : { array, optional: true, "null": false },

# Other type specific fields - Following fields are specific to array type
of      : { any, optional: true, "null": false, __memberdef: true },
#                                                ↑
#                               Critical: Compile as MemberDef, not data!
len     : { number, optional: true, "null": false, min: 0 },
minLen  : { number, optional: true, "null": false, min: 0 },
maxLen  : { number, optional: true, "null": false, min: 0 },

# Finally optional/null settings for all types
optional : { bool, optional: true, "null": false },
"null"   : { bool, optional: true, "null": false },
```

**Update Object TypeSchema:**
```io
# Always first three fields
type     : { object, default: object, choices: [object] },
default  : { object, optional: true, "null": false },

# Other type specific fields - Following fields are specific to object type
schema   : { object, optional: true, "null": false, __schema: true },
#                                                    ↑
#                                   Critical: Compile as Schema, not data!

# Finally optional/null settings for all types
optional : { bool, optional: true, "null": false },
"null"   : { bool, optional: true, "null": false },
```

---

## 📋 V2 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Add `__memberdef` and `__schema` properties to TypeSchemaField interface
- [ ] Implement `isMetaField()` and `getMetaType()` in TypeSchema class
- [ ] Update Schema compiler to recognize meta-type markers
- [ ] Add `compileMemberDef()` method to recursively compile nested MemberDefs
- [ ] Add `compileSchema()` method to recursively compile nested Schemas

### Phase 2: Type-Specific Updates
- [ ] Update ArrayTypeSchema with `__memberdef: true` on `of` field
- [ ] Update ObjectTypeSchema with `__schema: true` on `schema` field
- [ ] Update AnyTypeSchema with `__memberdef: true` on `anyOf.of` field
- [ ] Ensure validators expect compiled types (MemberDef/Schema), not raw objects

### Phase 3: Compilation Logic
- [ ] During schema compilation, detect meta-type markers
- [ ] For `__memberdef: true`: Call `compileMemberDef()` recursively
- [ ] For `__schema: true`: Call `compileSchema()` recursively
- [ ] Store compiled MemberDef/Schema in parent MemberDef config
- [ ] Handle recursive nesting (arrays of arrays, nested objects)

### Phase 4: Validation Logic
- [ ] Array validator: Check if `of` is MemberDef or Schema
- [ ] Object validator: Check if `schema` exists and is Schema
- [ ] Any validator: Check if `anyOf` elements are MemberDefs
- [ ] Error handling: Distinguish compilation errors from validation errors

### Phase 5: Testing
- [ ] Test array with object elements (uses both markers)
- [ ] Test nested arrays (recursive __memberdef)
- [ ] Test nested objects (recursive __schema)
- [ ] Test anyOf with multiple types (array of MemberDefs)
- [ ] Test error messages for missing/invalid meta-type fields

---

## 🎯 Critical Examples for Testing

### Example 1: Array of Objects

**Schema:**
```io
~ Order
items: {array, of: {sku: string, qty: number, price: decimal}}
```

**Compilation:**
1. `items` field → ArrayTypeSchema
2. `of` has `__memberdef: true` → Compile `{sku: string, qty: number, price: decimal}`
3. Result: `items.of` = MemberDef with type='object', schema=compiled inner schema

**Data:**
```io
~ OrderData : Order
[{sku: ABC123, qty: 2, price: 19.99m}]
```

### Example 2: Nested Arrays

**Schema:**
```io
~ Matrix
rows: {array, of: {type: array, of: {type: number}}}
```

**Compilation:**
1. Outer `rows.of` compiled via `__memberdef: true`
2. Inner `of` also compiled via `__memberdef: true`
3. Result: Array of arrays of numbers

### Example 3: Any with Union Types

**Schema:**
```io
~ Data
value: {any, anyOf: [
  {type: string, minLen: 3},
  {type: number, min: 0},
  {type: bool}
]}
```

**Compilation:**
1. `anyOf` field has elements with `__memberdef: true`
2. Each element compiled as MemberDef
3. Result: `value.anyOf` = [MemberDef, MemberDef, MemberDef]

**Validation:**
Try each MemberDef in order until one succeeds.

---

## ⚠️ Common Pitfalls

### Pitfall 1: Forgetting to Compile

**Problem:**
```typescript
// BAD: Treating raw config as MemberDef
const typeDef = TypedefRegistry.get(config.of.type)  // ← config.of not compiled!
```

**Solution:**
```typescript
// GOOD: Ensure config.of is compiled MemberDef
// During schema compilation, __memberdef: true triggers compilation
const typeDef = TypedefRegistry.get(config.of.type)  // ← config.of is MemberDef
```

### Pitfall 2: Validating Meta-Types as Data

**Problem:**
```typescript
// BAD: Trying to validate schema definition as data
if (config.__schema) {
  return this.validate(value, config.schema)  // ← Wrong! schema is Schema, not data
}
```

**Solution:**
```typescript
// GOOD: Use compiled schema for validation
if (config.schema) {
  return this.validateAgainstSchema(value, config.schema)  // ← schema is compiled
}
```

### Pitfall 3: Missing Recursive Compilation

**Problem:**
```io
~ Data
matrix: {array, of: {type: array, of: {type: number}}}
        ↑           ↑              ↑
        Compiled    Needs compile  Needs compile too!
```

**Solution:**
Ensure `compileMemberDef()` is recursive - handles nested meta-types.

---

## 📚 Related Documents

- **SCHEMA-REVAMP-TRACKER.md** - Master implementation roadmap
- **TYPESCHEMA-CONCEPT.md** - TypeSchema architecture overview
- **07-array-type.md** - Array type specification
- **08-object-type.md** - Object type specification
- **LAZY-RESOLUTION-PATTERN.md** - Variable resolution patterns

---

## 💡 Key Takeaway

> **Meta-type markers are the foundation of recursive schema compilation in Internet Object.**
>
> - `__memberdef: true` → "This is a type definition, compile it as MemberDef"
> - `__schema: true` → "This is an object structure, compile it as Schema"
>
> Without these markers, Internet Object cannot distinguish between data validation and schema compilation, breaking the ability to define nested types, arrays of objects, and recursive structures.

**In V2:** These markers MUST be preserved and properly handled during both compilation and validation phases!

---

**Status:** Complete - Ready for V2 Implementation
**Last Updated:** 2025-01-21
