# TypeSchema: The Self-Documenting Type System

**Status:** Architecture Document
**Version:** 1.0
**Last Updated:** 2025-01-21

---

## 🎯 What is a TypeSchema?

A **TypeSchema** is a schema that validates the **schema definition itself**, not the data. It's the meta-schema that:

1. **Validates MemberDef configurations at compile time** - catches typos like `minimum` vs `min`
2. **Provides canonical defaults** - defines standard behavior for each type
3. **Self-documents** - the TypeSchema IS the specification
4. **Reduces validation logic** - eliminates need for separate config validation

---

## 🔑 Key Concept: Two-Phase Validation

Internet Object uses a two-phase validation approach:

### Phase 1: Compile-Time (Schema Validation)
**Input:** User's schema definition (MemberDef)
**Validator:** TypeSchema
**Purpose:** Validate that the schema configuration is correct

```io
~ UserSchema
age: { number, minimum: 25 }  ← Phase 1 validates THIS
```

**Result:** ❌ Error - "minimum" is not a valid field in NumberTypeSchema (should be "min")

### Phase 2: Runtime (Data Validation)
**Input:** Actual data values
**Validator:** Compiled schema (validated MemberDef)
**Purpose:** Validate that data conforms to schema

```io
~ UserSchema
age: { number, min: 25 }  ← Phase 1: ✅ Valid config

~ UserData : UserSchema
age: 20  ← Phase 2: ❌ Invalid (20 < 25)
```

---

## 📐 The TypeSchema Pattern

Every type has its own TypeSchema that defines what configurations are valid.

### Example: StringTypeSchema

**IO Syntax (Proper MemberDef Format):**

```io
# Always first three fields
type        : { string, default: string, choices: [string, email, url] },
default     : { string, optional: true, "null": false },
choices     : { array,  optional: true, "null": false, of: { type: string } },

# Other type specific fields - Following fields are specific to string type
pattern     : { string, optional: true, "null": false },
flags       : { string, optional: true, "null": false },
len         : { number, optional: true, "null": false, min: 0 },
minLen      : { number, optional: true, "null": false, min: 0 },
maxLen      : { number, optional: true, "null": false, min: 0 },
format      : { string, optional: true, "null": false, choices: [auto, open, regular, raw], default: auto },
escapeLines : { bool,   optional: true, "null": false, default: true },

# Finally optional/null settings for all types
optional    : { bool,   optional: true, "null": false },
"null"      : { bool,   optional: true, "null": false },
```

**Critical TypeSchema Syntax Rules:**
- **Reserved keyword**: `"null"` MUST be quoted (reserved word in IO)
- **First field `type`**: Special syntax `{string, default: string, choices: [...]}`
- **Other fields**: Full MemberDef syntax `{ type, optional, "null", ... }`
- **NEVER shorthand**: NOT `default?: string` or `minLen: number`
- **In TypeSchema**: `optional: true` = field can be omitted from user's schema
- **In User Schema**: `?` suffix = data value can be undefined, `*` = data value can be null

**Code Implementation (V1):**
```typescript
const schema = new Schema(
  "string",
  { type:        { type: "string", optional: false, null: false, choices: STRING_TYPES } },
  { default:     { type: "string", optional: true,  null: false  } },
  { choices:     { type: "array",  optional: true,  null: false, of: { type: "string" } } },
  { pattern:     { type: "string", optional: true,  null: false  } },
  { flags:       { type: "string", optional: true,  null: false } },
  { len:         { type: "number", optional: true,  null: false, min: 0 } },
  { minLen:      { type: "number", optional: true,  null: false, min: 0 } },
  { maxLen:      { type: "number", optional: true,  null: false, min: 0 } },
  { format:      { type: "string", optional: true, null: false, choices: ["auto", "open", "regular", "raw"], default:"auto" } },
  { escapeLines: { type: "bool",   optional: true, null: false, default: true } },
  { encloser :   { type: "string", optional: true, null: false, choices: ['"', "'"], default: '"' } },
  { optional:    { type: "bool",   optional: true, null: false } },
  { null:        { type: "bool",   optional: true, null: false } },
)
```

---

## 🎨 Canonical MemberDef Forms

### Short Form (Type Only)
Uses TypeSchema defaults:

```io
name: string
```

Expands to (applying defaults from StringTypeSchema):

```io
name: { string, optional: false, "null": false, format: auto, escapeLines: true }
```

### Extended Form (MemberDef Object)
User provides specific configuration:

```io
name: { string, minLen: 3, maxLen: 50 }
```

**Phase 1 Validation:**
- ✅ `minLen` exists in StringTypeSchema
- ✅ `maxLen` exists in StringTypeSchema
- ✅ Values are valid (numbers >= 0)

---

## ✅ Benefits of TypeSchema Approach

### 1. Self-Documenting
The TypeSchema **IS** the documentation. No need for separate docs explaining valid options.

```io
~ StringTypeSchema
pattern: { string, optional: true, null: false }  ← This line documents:
                                                      - Field name: "pattern"
                                                      - Type: string
                                                      - Can be omitted
                                                      - Cannot be null
```

### 2. Catches Configuration Errors Early

**Common typos caught at compile time:**

```
age: { number, minimum: 25 }     ❌ "minimum" not in NumberTypeSchema (use "min")
age: { number, maximum: 100 }    ❌ "maximum" not in NumberTypeSchema (use "max")
age: { number, required: T }     ❌ "required" not in NumberTypeSchema (use "optional: F")
name: { string, minLength: 3 }   ❌ "minLength" not in StringTypeSchema (use "minLen")
email: { string, regex: "..." }  ❌ "regex" not in StringTypeSchema (use "pattern")
```

### 3. Reduces Validation Logic

**Without TypeSchema:** Separate validation for every config option
```typescript
// Manual validation everywhere
if (config.minimum !== undefined && typeof config.minimum !== 'number') {
  throw new Error('minimum must be a number')
}
if (config.minLength !== undefined) {
  throw new Error('Invalid option: minLength. Did you mean minLen?')
}
// ... hundreds more checks
```

**With TypeSchema:** Single validation pass
```typescript
// One validation call
const validatedConfig = validateAgainstTypeSchema(userConfig, NumberTypeSchema)
// Now validatedConfig is guaranteed correct!
```

### 4. Consistent Defaults

All types use same default behavior from TypeSchema:

```io
optional : { bool, optional: true, "null": false },  # When omitted: defaults to false (field is required)
"null"   : { bool, optional: true, "null": false },  # When omitted: defaults to false (null not allowed)
```

User writes:

```io
name: string
```

System applies defaults:

```io
name: { string, optional: false, "null": false }
```

### 5. Type-Safe by Design

TypeScript interfaces derived from TypeSchema:

```typescript
// Generated from NumberTypeSchema
interface NumberConfig {
  type: 'number' | 'int' | 'uint' | 'int8' | 'uint8' | 'int16' | 'uint16' | 'int32' | 'uint32'
  default?: number
  choices?: number[]
  min?: number
  max?: number
  format?: 'decimal' | 'hex' | 'octal' | 'binary' | 'scientific'
  optional?: boolean
  null?: boolean
}
```

No risk of using invalid fields - TypeScript catches them at development time!

---

## 🔄 V1 vs V2 TypeSchema

### V1 (Current - Proven Pattern)

```typescript
const schema = new Schema(
  "string",
  { type:        { type: "string", optional: false, null: false, choices: STRING_TYPES } },
  { default:     { type: "string", optional: true,  null: false  } },
  { choices:     { type: "array",  optional: true,  null: false, of: { type: "string" } } },
  // ... more fields
)
```

**Characteristics:**
- ✅ Variadic constructor (each field is separate parameter)
- ✅ Self-contained field definitions
- ✅ Validated via Schema class
- ✅ Proven in production

### V2 (Future - Enhanced)

**Goal:** Keep V1 structure, add typed AST representation

```typescript
// V2 will parse IO format into typed AST
interface TypeSchemaAST {
  name: string
  fields: Map<string, FieldConfig>
}

// Then use for validation
function validateMemberDef(userConfig: MemberDef, typeSchema: TypeSchemaAST): ValidatedMemberDef {
  // Validate each field against TypeSchema
  // Return type-safe config
}
```

**Strategy:** Preserve V1 patterns, add modern typing

---

## 📋 Implementation Checklist

### Phase 1: TypeSchema Infrastructure
- [ ] Define TypeSchema interface
- [ ] Implement Schema validation against TypeSchema
- [ ] Add compile-time error reporting
- [ ] Generate TypeScript interfaces from TypeSchemas

### Phase 2: Type-Specific TypeSchemas
- [x] StringTypeSchema (documented in 01-string-type.md)
- [x] NumberTypeSchema (documented in 02-number-type.md)
- [ ] BooleanTypeSchema
- [ ] DatetimeTypeSchema
- [ ] DecimalTypeSchema
- [ ] BigintTypeSchema
- [ ] ArrayTypeSchema
- [ ] ObjectTypeSchema

### Phase 3: Validation Integration
- [ ] Compile-time validation (Phase 1)
- [ ] Runtime validation (Phase 2)
- [ ] Error message generation
- [ ] Default application

### Phase 4: Testing
- [ ] Typo detection tests (minimum vs min)
- [ ] Invalid field tests
- [ ] Invalid value tests (wrong type, out of range)
- [ ] Default application tests
- [ ] Canonical form expansion tests

---

## 🎯 Usage Examples

### Example 1: Catch Common Typos

**User writes:**

```io
~ UserProfile
age: { number, minimum: 18 }
```

**Phase 1 Validation:**

```
Error: Invalid field "minimum" in NumberTypeSchema
  Did you mean: "min"?
  Valid fields: type, default, choices, min, max, format, optional, "null"
```

### Example 2: Enforce Type Choices

**User writes:**

```io
~ UserProfile
age: { int128, min: 18 }
```

**Phase 1 Validation:**
```
Error: Invalid type "int128"
  Valid choices: number, int, uint, int8, uint8, int16, uint16, int32, uint32
```

### Example 3: Validate Nested Configurations

**User writes:**
```io
~ UserProfile
tags: { array, of: { string, minLength: 3 } }
```

**Phase 1 Validation:**
```
Error in field "tags.of": Invalid field "minLength" in StringTypeSchema
  Did you mean: "minLen"?
```

### Example 4: Apply Defaults

**User writes:**
```io
~ UserProfile
email: email
```

**After Phase 1 (defaults applied):**

```io
~ UserProfile
email: { email, optional: false, "null": false, format: auto, escapeLines: true }
```

---

## 🏗️ Architecture Benefits

### Separation of Concerns
- **TypeSchema:** Validates schema configuration (compile time)
- **Type Validator:** Validates data values (runtime)
- **No overlap:** Each has single responsibility

### Maintainability
- **Add new field:** Update TypeSchema only
- **Change default:** Update TypeSchema only
- **Documentation:** TypeSchema IS the spec

### Extensibility
- **Custom types:** Define new TypeSchema
- **Type variants:** Extend existing TypeSchema
- **Plugins:** Contribute TypeSchemas

### Performance
- **Compile once:** TypeSchema validation happens once during schema compilation
- **Runtime fast:** No config validation overhead at runtime
- **Cached:** Validated configs reused across multiple data validations

---

## 🚀 Next Steps

1. **Complete type specs:** Document all TypeSchemas in proper IO format
2. **Implement infrastructure:** TypeSchema validation engine
3. **Integration:** Phase 1 validation in schema compiler
4. **Testing:** Comprehensive typo detection and error reporting
5. **Documentation:** User-facing guide on TypeSchema concept

---

## 📚 Related Documents

- **SCHEMA-REVAMP-TRACKER.md** - Master roadmap
- **01-string-type.md** - String TypeSchema specification
- **02-number-type.md** - Number TypeSchema specification
- **LAZY-RESOLUTION-PATTERN.md** - Variable/schema resolution
- **V1 Reference:** src/schema/types/*.ts - Current TypeSchema implementations

---

## 💡 Key Takeaway

> **TypeSchema = Configuration Validator + Canonical Defaults + Self-Documentation**
>
> It answers: "What configurations are valid for this type?"
> Not: "What data values are valid?" (that's the type validator's job)

By validating the schema itself, TypeSchema catches errors early, reduces code complexity, and creates self-documenting type definitions. It's the foundation of Internet Object's type safety.
