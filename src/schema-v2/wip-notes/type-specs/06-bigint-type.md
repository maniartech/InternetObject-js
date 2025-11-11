# Type Spec: BigInt Type

## Type: `bigint`

### Overview
Validates arbitrary-precision integer values using JavaScript's native BigInt type. Supports integers beyond the safe integer range of regular numbers (`±2^53-1`). Useful for large integers in cryptography, timestamps, IDs, and financial calculations requiring whole number precision.

### Type Names
- `bigint` - Arbitrary-precision integer

**Syntax:** BigInt literals use the `n` suffix (e.g., `123n`, `9007199254740992n`)

### TypeSchema Definition (BigIntTypeSchema)

This schema validates user-provided MemberDef configurations for bigint types.

**BigInt TypeSchema (IO Syntax):**

```io
# Always first three fields
type     : { bigint, default: bigint, choices: [bigint] },
default  : { bigint, optional: true, "null": false },
choices  : { array,  optional: true, "null": false, of: { type: bigint } },

# Other type specific fields - Following fields are specific to bigint type
min      : { bigint, optional: true, "null": false },
max      : { bigint, optional: true, "null": false },
format   : { string, optional: true, "null": false, choices: [decimal, hex, octal, binary], default: decimal },

# Finally optional/null settings for all types
optional : { bool,   optional: true, "null": false },
"null"   : { bool,   optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{bigint, default: bigint, choices: [bigint]}`
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **Positional vs Named**: Supports both `{bigint, 0n, min: 0n}` and `{type: bigint, default: 0n, min: 0n}`

**Code (V1):**

```typescript
const bigintSchema = new Schema(
  "bigint",
  { type:     { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:  { type: "bigint", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "bigint" } } },
  { min:      { type: "bigint", optional: true,  null: false } },
  { max:      { type: "bigint", optional: true,  null: false } },
  { format:   { type: "string", optional: true,  null: false, choices: ["decimal", "hex", "octal", "binary"], default:"decimal" } },
  { optional: { type: "bool",   optional: true, null: false } },
  { null:     { type: "bool",   optional: true, null: false } },
)
```

### TypeScript Interface (V2)

```typescript
interface BigIntConfig {
  type: 'bigint'
  default?: bigint
  choices?: bigint[]
  min?: bigint                    // Minimum allowed value
  max?: bigint                    // Maximum allowed value
  format?: 'decimal' | 'hex' | 'octal' | 'binary'  // Serialization format (default: 'decimal')
  optional?: boolean
  null?: boolean
}
```

### Format Options

| Format | Base | Example Input | Serialized Output |
|--------|------|---------------|-------------------|
| decimal | 10 | `255n` | `255` |
| hex | 16 | `255n` | `ff` |
| octal | 8 | `255n` | `377` |
| binary | 2 | `255n` | `11111111` |

**Note:** Format affects serialization only, not parsing. All formats are accepted during parsing.

### Validation Rules

**Common Validations** (from `doCommonTypeCheck`):
1. **Undefined Check** - Returns default, undefined (if optional), or throws error
2. **Null Check** - Returns null (if allowed) or throws error
3. **Choices Validation** - Validates value is in choices array if defined

**Type-Specific Validations**:

1. **Type Validation**
   - Must be a bigint value (JavaScript BigInt type)
   - Regular numbers rejected (even if in safe integer range)
   - Throws `INVALID_TYPE` if not a bigint

2. **Range Validation**
   - If `min` defined: value must be >= min
   - If `max` defined: value must be <= max
   - Throws `INVALID_RANGE` if validation fails

### V1 Implementation Reference

```typescript
class BigIntDef implements TypeDef {
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): bigint {
    // 1. Resolve variable if needed
    const valueNode = defs?.getV(node) || node

    // 2. Common type checks (undefined, null, choices)
    let { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    // 3. Validate type and range
    value = this.validate(memberDef, value, node)

    return value
  }

  validate(memberDef: MemberDef, value: any, node?: Node): bigint {
    // Type check
    if (typeof value !== "bigint") {
      throw new ValidationError(ErrorCodes.invalidType, ...)
    }

    // Range validation
    if (min !== undefined && value < min) {
      throwError(ErrorCodes.invalidRange, ...)
    }
    if (max !== undefined && value > max) {
      throwError(ErrorCodes.invalidRange, ...)
    }

    return value
  }

  stringify(value: any, memberDef: MemberDef): string {
    if (memberDef.format === 'hex') return value.toString(16)
    if (memberDef.format === 'octal') return value.toString(8)
    if (memberDef.format === 'binary') return value.toString(2)
    return value.toString()  // decimal
  }
}
```

### V2 Design

```typescript
class BigIntTypeSchema implements TypeSchema<BigIntConfig, bigint> {
  readonly typeName = 'bigint';

  validate(value: unknown, config: BigIntConfig, ctx: ValidationContext): ValidationResult<bigint> {
    // 1. Common checks (handled by base validator)
    const commonResult = doCommonTypeCheck(value, config, ctx);
    if (commonResult.handled) return commonResult;

    // 2. Type validation
    if (typeof value !== 'bigint') {
      return ctx.error('INVALID_TYPE', `Expected bigint, got ${typeof value}`);
    }

    // 3. Range validation
    if (config.min !== undefined && value < config.min) {
      return ctx.error('INVALID_RANGE', `Value must be >= ${config.min}`);
    }
    if (config.max !== undefined && value > config.max) {
      return ctx.error('INVALID_RANGE', `Value must be <= ${config.max}`);
    }

    return ctx.success(value);
  }

  serialize(value: bigint, config: BigIntConfig, ctx: SerializationContext): string {
    const format = config.format || 'decimal';
    switch (format) {
      case 'hex': return value.toString(16);
      case 'octal': return value.toString(8);
      case 'binary': return value.toString(2);
      default: return value.toString();
    }
  }
}
```

### Examples

#### User Schema Examples

**Positional syntax:**
```io
id: {bigint, 0n, min: 0n}
balance: {bigint, 0n, min: 0n, max: 18446744073709551615n}
timestamp: {bigint, format: hex}
```

**Named syntax:**
```io
id: {type: bigint, default: 0n, min: 0n}
balance: {min: 0n, type: bigint, max: 18446744073709551615n, default: 0n}
timestamp: {format: hex, type: bigint}
```

#### Valid Data Examples

```io
~ $transaction: { id: bigint, amount: {bigint, min: 0n} }
---
~ : transaction
9007199254740993n, 1000000000000000000n
```

**With format:**
```io
~ $config: { flags: {bigint, format: hex} }
---
~ : config
ffn  ← Serialized as "ff"
```

#### Invalid Data Examples

**Type mismatch:**
```io
~ $user: { id: bigint }
---
~ : user
123  ← Error: INVALID_TYPE (number, not bigint)
```

**Range violation:**
```io
~ $product: { stock: {bigint, min: 0n, max: 1000n} }
---
~ : product
-5n   ← Error: INVALID_RANGE (less than min)
2000n ← Error: INVALID_RANGE (greater than max)
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| INVALID_TYPE | Value is not a bigint | Expecting a value of type 'bigint' for '{path}' |
| INVALID_RANGE | Value < min or > max | Value {value} is out of range for '{path}' |
| VALUE_REQUIRED | Value is undefined and not optional | Value required for {path} |
| NULL_NOT_ALLOWED | Value is null but null: false | Null value not allowed for {path} |
| INVALID_CHOICE | Value not in choices array | Invalid choice for {path}. Expected one of: {choices} |

### Notes

**Why BigInt Instead of Number:**
- JavaScript `number` is IEEE 754 double (53-bit precision)
- Safe integer range: `±(2^53 - 1)` = `±9,007,199,254,740,991`
- BigInt supports arbitrary precision integers
- No precision loss for large integers

**Use Cases:**
- **IDs**: Snowflake IDs, Twitter IDs (64-bit integers)
- **Cryptography**: Large primes, cryptographic keys
- **Financial**: Whole number amounts in smallest units (e.g., cents, satoshis)
- **Timestamps**: Nanosecond precision timestamps
- **Large Counters**: View counts, metrics beyond 2^53

**Comparison with Number:**
```io
regularNumber: {number, max: 9007199254740991}      ← Safe integer limit
bigInteger: {bigint, max: 18446744073709551615n}   ← 64-bit unsigned limit
```

**Format Performance:**
- Decimal format (default) is fastest
- Hex/octal/binary add conversion overhead
- Choose format based on use case (hex for flags/bitmasks, decimal for IDs)

**Interoperability:**
- BigInt and number cannot be mixed in operations
- Use explicit conversion: `BigInt(number)` or `Number(bigint)`
- Be cautious: `Number(bigint)` may lose precision for large values

**Serialization:**
- Format affects output representation only
- All formats parsed during input
- Example: `255n` → `"ff"` (hex), `"377"` (octal), `"11111111"` (binary)

---

**Status:** Complete
**Last Updated:** 2025-01-21
