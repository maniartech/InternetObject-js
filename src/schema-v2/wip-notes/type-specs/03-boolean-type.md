# Boolean Type Specification

## Type: `bool`

### Overview
Validates boolean values (true/false). Supports default values, optional fields, and null handling.

### TypeSchema Definition (BooleanTypeSchema)

This schema validates user-provided MemberDef configurations for boolean types.

**Boolean TypeSchema (IO Syntax):**

```io
# Always first three fields
type     : { bool, default: bool, choices: [bool] },
default  : { bool, optional: true, "null": false },

# Finally optional/null settings for all types
optional : { bool, optional: true, "null": false },
"null"   : { bool, optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{bool, default: bool, choices: [bool]}`
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **NOT shorthand**: Never use `default?: bool` or `default: bool`

**Code (V1):**

```typescript
const schema = new Schema(
  "bool",
  { type:     { type: "string", optional: false, null: false, choices: ["bool"] } },
  { default:  { type: "bool",   optional: true,  null: false  } },
  { optional: { type: "bool",   optional: true,  null: false } },
  { null:     { type: "bool",   optional: true,  null: false } },
)
```

### TypeScript Interface (V2)

```typescript
interface BooleanConfig {
  type: 'bool';          // Required - always 'bool'
  default?: boolean;     // Optional: Default value
  optional?: boolean;    // Optional: Can be undefined (default: false)
  null?: boolean;        // Optional: Can be null (default: false)
}
```

### Validation Examples

```typescript
// ✅ Valid configurations (validated against BooleanTypeSchema)
bool                           // Simple boolean
{bool}                         // Explicit type
{bool, default: true}          // With default
{bool, optional: true}         // Optional field
{bool, null: true}             // Nullable field

// ❌ Invalid configurations (rejected at schema parse time)
{boolean}                      // "boolean" not in type choices (use "bool")
{bool, required: true}         // "required" not in BooleanTypeSchema (use "optional: false")
{bool, default: "true"}        // default must be boolean, not string
{bool, choices: [true]}        // "choices" not in BooleanTypeSchema
```

### Validation Rules

**Common Validations** (applied first via `doCommonTypeCheck`):
1. Undefined → return default OR undefined if optional OR throw `VALUE_REQUIRED`
2. Null → return null if `null: true` OR throw `NULL_NOT_ALLOWED`

**Type-Specific Validations**:

1. **Type Check**
   - Value must be TokenNode with `type === TokenType.BOOLEAN`
   - Throw `NOT_A_BOOL` if type mismatch

### V1 Implementation Pattern

```typescript
// V1: src/schema/types/boolean.ts
#validate(node: Node, memberDef: MemberDef, defs?: Definitions): any {
  // 1. Resolve variables
  const valueNode = defs?.getV(node) || node;

  // 2. Common checks (undefined, null, default)
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs);
  if (changed) return value;

  // 3. Type check
  if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.BOOLEAN) {
    throw new ValidationError(ErrorCodes.notABool,
      `Expecting a boolean value for '${memberDef.path}' but found ${valueNode.toValue()}.`,
      node
    );
  }

  return valueNode.value;
}
```

### V2 Design

```typescript
class BooleanTypeSchema implements TypeSchema<BooleanConfig, boolean> {
  readonly typeName = 'bool';

  validate(value: unknown, config: BooleanConfig, ctx: ValidationContext): ValidationResult<boolean> {
    // 1. Handle variable references (V1 pattern)
    if (value instanceof VarRefNode) {
      value = defs.getV(`@${value.name}`);
    }

    // 2. Common validations (undefined, null, default)
    //    Use V1's doCommonTypeCheck logic

    // 3. Type check
    if (typeof value !== 'boolean') {
      return ValidationResult.failure([{
        code: 'NOT_A_BOOL',
        message: `Expecting a boolean value for '${ctx.currentPath}' but found ${typeof value}`,
        path: ctx.currentPath
      }]);
    }

    return ValidationResult.success(value);
  }

  serialize(value: boolean, config: BooleanConfig, ctx: SerializationContext): string {
    return value ? 'T' : 'F';
  }
}
```

### Examples

#### Valid Cases

```typescript
// Basic boolean
{ type: 'bool' }
validate(true)  // ✓ true
validate(false) // ✓ false

// With default
{ type: 'bool', default: true, optional: true }
validate(undefined) // ✓ true (uses default)

// Optional
{ type: 'bool', optional: true }
validate(undefined) // ✓ undefined

// Nullable
{ type: 'bool', null: true }
validate(null) // ✓ null

// Optional and nullable with default
{ type: 'bool', default: false, optional: true, null: true }
validate(undefined) // ✓ false
validate(null)      // ✓ null
validate(true)      // ✓ true
```

#### Invalid Cases

```typescript
// Type mismatch
{ type: 'bool' }
validate('true')  // ✗ NOT_A_BOOL
validate(1)       // ✗ NOT_A_BOOL
validate('false') // ✗ NOT_A_BOOL

// Required field
{ type: 'bool' }
validate(undefined) // ✗ VALUE_REQUIRED

// Null not allowed
{ type: 'bool' }
validate(null) // ✗ NULL_NOT_ALLOWED
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| `NOT_A_BOOL` | Value is not a boolean type | `Expecting a boolean value for '{path}' but found {type}` |
| `VALUE_REQUIRED` | Undefined value for required field | `Value is required for {path}` |
| `NULL_NOT_ALLOWED` | Null value when not allowed | `Null is not allowed for {path}` |

### IO Syntax Examples

```
~ UserSchema
# Simple boolean (required, non-null)
active: bool

# Optional boolean
verified?: bool
# OR
verified: { bool, optional: true }

# Nullable boolean
status*: bool
# OR
status: { bool, null: true }

# Optional and nullable with default
agreed?*: { bool, default: false }

~ UserData : UserSchema
active: T
verified: ~
status: N
agreed: ~
```

### Notes

- **Boolean Values in IO**: `T`, `true`, `F`, `false` are valid boolean literals
- **Serialization**: V1 serializes as `T` or `F` (single character)
- **Variable Resolution**: Boolean values can be variables resolved via `defs.getV()`
- **No Choices**: Unlike string/number, boolean has no `choices` field (only two values possible)
- **Simple Validation**: Boolean is the simplest type - only type checking needed after common checks
