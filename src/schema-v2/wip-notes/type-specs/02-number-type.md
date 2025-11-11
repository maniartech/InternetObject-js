# Number Type Specification

## Type: `number`, `int`, `uint`, `int8`, `uint8`, `int16`, `uint16`, `int32`, `uint32`, `float`, `float32`, `float64`, `bigint`, `decimal`

### Overview
Validates and serializes numeric values with support for integers, unsigned integers, floating-point numbers, bigints, and decimals. Includes range constraints and format options.

**CRITICAL CONCEPT - TypeSchema as Self-Documenting Contract:**

This specification document defines the **TypeSchema** for the number type. The TypeSchema serves two purposes:

1. **Configuration Validator**: When users write `age: {number, min: 25}`, this MemberDef is validated against the NumberTypeSchema below
2. **Canonical Defaults**: When users write `age: number` (shorthand), the TypeSchema provides default values for all configuration options

**Example Flow:**
```
User writes: age: {number, minimum: 25}
            ↓
Step 1: Parser extracts config: {minimum: 25}
Step 2: Validate config against NumberTypeSchema
Step 3: ❌ FAILS - "minimum" is not a valid field in NumberTypeSchema
        Error: "Invalid configuration for 'number' type: unknown property 'minimum'. Did you mean 'min'?"

User writes: age: {number, min: 25}
            ↓
Step 1: Parser extracts config: {min: 25}
Step 2: Validate config against NumberTypeSchema
Step 3: ✅ PASSES - "min" is valid (type: number, optional: true)
Step 4: Apply defaults: {min: 25, max: undefined, optional: false, null: false, ...}
Step 5: Use complete config for runtime validation
```

This is **compile-time schema validation** - errors caught during schema parsing, not during data validation!

### Type Names
- `number` - General number (no bounds)
- `int` - Integer (no specific bounds)
- `uint` - Unsigned integer (>= 0)
- `int8` - Signed 8-bit integer (-128 to 127)
- `uint8` - Unsigned 8-bit integer (0 to 255)
- `int16` - Signed 16-bit integer (-32,768 to 32,767)
- `uint16` - Unsigned 16-bit integer (0 to 65,535)
- `int32` - Signed 32-bit integer (-2,147,483,648 to 2,147,483,647)
- `uint32` - Unsigned 32-bit integer (0 to 4,294,967,295)
- `float` - Floating-point number
- `float32` - 32-bit float (not yet supported in V1)
- `float64` - 64-bit float (not yet supported in V1)
- `bigint` - Arbitrary precision integer
- `decimal` - Arbitrary precision decimal

### TypeSchema Definition (NumberTypeSchema)

This schema validates user-provided MemberDef configurations for number types.

**Number TypeSchema (IO Syntax):**

```io
# Always first three fields
type     : { number, default: number, choices: [number, int, uint, int32, uint32, int16, uint16, int8, uint8] },
default  : { number, optional: true, "null": false },
choices  : { array,  optional: true, "null": false, of: { type: number } },

# Other type specific fields - Following fields are specific to number type
min      : { number, optional: true, "null": false },
max      : { number, optional: true, "null": false },
format   : { string, optional: true, "null": false, choices: [decimal, hex, octal, binary, scientific] },

# Finally optional/null settings for all types
optional : { bool,   optional: true, "null": false },
"null"   : { bool,   optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{number, default: number, choices: [...]}`
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **NOT shorthand**: Never use `min?: number` or `min: number`

**Code (V1):**

```typescript
const numberSchema = new Schema(
  "number",
  { type:     { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:  { type: "number", optional: true,  null: false } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "number" } } },
  { min:      { type: "number", optional: true,  null: false } },
  { max:      { type: "number", optional: true,  null: false } },
  { format:   { type: "string", optional: true, null: false, choices: ["decimal", "hex", "octal", "binary", "scientific"] } },
  { optional: { type: "bool",   optional: true, null: false } },
  { null:     { type: "bool",   optional: true, null: false } },
)
```

**TypeScript interface (for V2 implementation):**

```typescript
interface NumberConfig {
  type: NumberTypeName;          // Required - validated by choices
  default?: number;              // Optional: Default value
  choices?: number[];            // Optional: Allowed values (supports @variables)
  optional?: boolean;            // Optional: Can be undefined (default: false)
  null?: boolean;                // Optional: Can be null (default: false)
  min?: number;                  // Optional: Minimum value (overrides type bounds)
  max?: number;                  // Optional: Maximum value (overrides type bounds)
  format?: 'decimal' | 'hex' | 'octal' | 'binary' | 'scientific';  // Optional (default: decimal)
}
```

**Validation Examples:**

```typescript
// ✅ Valid configurations (validated against NumberTypeSchema)
{number, min: 25}                      // min is valid field
{number, max: 100}                     // max is valid field
{number, optional: true}               // optional is valid field
{int8}                                 // type is valid choice
{number, format: 'hex'}                // format is valid choice

// ❌ Invalid configurations (rejected at schema parse time)
{number, minimum: 25}                  // "minimum" not in NumberTypeSchema → Error
{number, maximum: 100}                 // "maximum" not in NumberTypeSchema → Error
{number, required: true}               // "required" not in NumberTypeSchema → Error
{number, format: 'percentage'}         // "percentage" not in format choices → Error
{int128}                               // "int128" not in type choices → Error
```

### Type Bounds

| Type | Min | Max | Notes |
|------|-----|-----|-------|
| `number` | null | null | No bounds |
| `int` | null | null | No bounds (JavaScript safe integer limits apply) |
| `uint` | 0 | null | Unsigned only |
| `int8` | -128 | 127 | Signed 8-bit |
| `uint8` | 0 | 255 | Unsigned 8-bit |
| `int16` | -32,768 | 32,767 | Signed 16-bit |
| `uint16` | 0 | 65,535 | Unsigned 16-bit |
| `int32` | -2,147,483,648 | 2,147,483,647 | Signed 32-bit |
| `uint32` | 0 | 4,294,967,295 | Unsigned 32-bit |
| `float` | null | null | Floating-point |
| `bigint` | null | null | Arbitrary precision (delegates to BigIntDef) |
| `decimal` | null | null | Arbitrary precision (delegates to DecimalDef) |

**Note**: `config.min` and `config.max` override type bounds if specified.

### Validation Rules

**Common Validations** (applied first via `doCommonTypeCheck`):
1. Undefined → return default OR undefined if optional OR throw `VALUE_REQUIRED`
2. Null → return null if `null: true` OR throw `NULL_NOT_ALLOWED`
3. Choices → validate against array (resolving @variables with `defs.getV()`)

**Type-Specific Validations**:

1. **Type Check**
   - Value must be a number (typeof value === 'number')
   - Throw `INVALID_TYPE` if not a number

2. **Range Validation**
   ```typescript
   // Determine effective min/max
   const effectiveMin = config.min !== undefined ? config.min : typeBoundMin;
   const effectiveMax = config.max !== undefined ? config.max : typeBoundMax;

   // Validate range
   if (effectiveMin !== null && value < effectiveMin) throw INVALID_RANGE;
   if (effectiveMax !== null && value > effectiveMax) throw INVALID_RANGE;
   ```

### V1 Implementation Pattern

```typescript
// V1: src/schema/types/number.ts
class NumberDef implements TypeDef {
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): number {
    // Delegate to specialized types if needed
    if (this._type === 'bigint') return new BigIntDef().parse(node, memberDef, defs);
    if (this._type === 'decimal') return new DecimalDef().parse(node, memberDef, defs);

    // 1. Resolve variables
    const valueNode = defs?.getV(node) || node;

    // 2. Common checks
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs);
    if (changed) return value;

    // 3. Type check
    if (typeof value !== 'number') throw INVALID_TYPE;

    // 4. Range validation with type bounds
    const { min: typeBoundMin, max: typeBoundMax } = this.getTypeBounds(this._type);
    const effectiveMin = memberDef.min ?? typeBoundMin;
    const effectiveMax = memberDef.max ?? typeBoundMax;

    if ((effectiveMin !== null && value < effectiveMin) ||
        (effectiveMax !== null && value > effectiveMax)) {
      throw INVALID_RANGE;
    }

    return value;
  }

  stringify(value: number, memberDef: MemberDef): string {
    if (memberDef.format === 'scientific') return value.toExponential();
    if (memberDef.format === 'hex') return value.toString(16);
    if (memberDef.format === 'octal') return value.toString(8);
    if (memberDef.format === 'binary') return value.toString(2);
    return value.toString();
  }
}
```

### V2 Design

```typescript
class NumberTypeSchema implements TypeSchema<NumberConfig, number> {
  readonly typeName: string;

  private readonly typeBounds: { min: number | null; max: number | null };

  constructor(type: string) {
    this.typeName = type;
    this.typeBounds = this.getTypeBounds(type);
  }

  validate(value: unknown, config: NumberConfig, ctx: ValidationContext): ValidationResult<number> {
    // 1. Handle variable references (V1 pattern)
    if (value instanceof VarRefNode) {
      value = defs.getV(`@${value.name}`);
    }

    // 2. Common validations (undefined, null, choices)

    // 3. Type check
    if (typeof value !== 'number') {
      return ValidationResult.failure([{
        code: 'INVALID_TYPE',
        message: `Expecting a value of type '${config.type}' for '${ctx.currentPath}'`,
        path: ctx.currentPath
      }]);
    }

    // 4. Range validation
    const effectiveMin = config.min !== undefined ? config.min : this.typeBounds.min;
    const effectiveMax = config.max !== undefined ? config.max : this.typeBounds.max;

    if (effectiveMin !== null && value < effectiveMin) {
      return ValidationResult.failure([{
        code: 'INVALID_RANGE',
        message: `Value ${value} is below minimum ${effectiveMin} for '${ctx.currentPath}'`,
        path: ctx.currentPath
      }]);
    }

    if (effectiveMax !== null && value > effectiveMax) {
      return ValidationResult.failure([{
        code: 'INVALID_RANGE',
        message: `Value ${value} exceeds maximum ${effectiveMax} for '${ctx.currentPath}'`,
        path: ctx.currentPath
      }]);
    }

    return ValidationResult.success(value);
  }

  serialize(value: number, config: NumberConfig, ctx: SerializationContext): string {
    switch (config.format) {
      case 'scientific': return value.toExponential();
      case 'hex': return value.toString(16);
      case 'octal': return value.toString(8);
      case 'binary': return value.toString(2);
      default: return value.toString();
    }
  }

  private getTypeBounds(type: string): { min: number | null; max: number | null } {
    switch (type) {
      case 'uint': return { min: 0, max: null };
      case 'int8': return { min: -(2 ** 7), max: 2 ** 7 - 1 };
      case 'uint8': return { min: 0, max: 2 ** 8 - 1 };
      case 'int16': return { min: -(2 ** 15), max: 2 ** 15 - 1 };
      case 'uint16': return { min: 0, max: 2 ** 16 - 1 };
      case 'int32': return { min: -(2 ** 31), max: 2 ** 31 - 1 };
      case 'uint32': return { min: 0, max: 2 ** 32 - 1 };
      default: return { min: null, max: null };
    }
  }
}
```

### Examples

#### Valid Cases

```typescript
// Basic number
{ type: 'number' }
validate(42) // ✓ 42

// With default
{ type: 'number', default: 0, optional: true }
validate(undefined) // ✓ 0

// With range
{ type: 'number', min: 0, max: 100 }
validate(50) // ✓ 50

// Type bounds (uint)
{ type: 'uint' }
validate(42) // ✓ 42

// Type bounds (int8)
{ type: 'int8' }
validate(-100) // ✓ -100
validate(127) // ✓ 127

// Override type bounds
{ type: 'uint', min: 10, max: 20 }
validate(15) // ✓ 15

// With choices
{ type: 'number', choices: [1, 2, 3, '@maxValue'] }
// Assuming @maxValue = 10
validate(2) // ✓ 2
validate(10) // ✓ 10
```

#### Invalid Cases

```typescript
// Type mismatch
{ type: 'number' }
validate('42') // ✗ INVALID_TYPE

// Below minimum
{ type: 'number', min: 0 }
validate(-5) // ✗ INVALID_RANGE

// Above maximum
{ type: 'number', max: 100 }
validate(150) // ✗ INVALID_RANGE

// Type bounds violated (uint)
{ type: 'uint' }
validate(-1) // ✗ INVALID_RANGE

// Type bounds violated (int8)
{ type: 'int8' }
validate(-129) // ✗ INVALID_RANGE
validate(128) // ✗ INVALID_RANGE

// Invalid choice
{ type: 'number', choices: [1, 2, 3] }
validate(4) // ✗ INVALID_CHOICE
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| `INVALID_TYPE` | Value is not a number | `Expecting a value of type '{type}' for '{path}'` |
| `INVALID_RANGE` | Value outside allowed range | `Value {value} is outside the valid range [{min}, {max}] for '{path}'` |
| `VALUE_REQUIRED` | Undefined value for required field | `Value is required for {path}` |
| `NULL_NOT_ALLOWED` | Null value when not allowed | `Null is not allowed for {path}` |
| `INVALID_CHOICE` | Value not in choices array | `The value of "{path}" must be one of the [{choices}]. Currently it is {value}` |

### Notes

- **Type Delegation**: V1 delegates `bigint` and `decimal` types to specialized TypeDef implementations
- **Type Bounds**: Some types have built-in min/max bounds that are enforced unless overridden by `config.min`/`config.max`
- **Unsupported Types**: V1 throws `UNSUPPORTED_NUMBER_TYPE` for `uint64`, `int64`, `float32`, `float64`
- **Format Options**: Serialization supports decimal (default), hex, octal, binary, and scientific notation
- **Variable Resolution**: Choices can contain variable references resolved via `defs.getV()`
