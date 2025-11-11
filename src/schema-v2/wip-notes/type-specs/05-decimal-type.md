# Type Spec: Decimal Type

## Type: `decimal`

### Overview
Validates arbitrary-precision decimal values. Supports fixed-point arithmetic with configurable precision and scale. Used for financial calculations, scientific data, and any scenario requiring exact decimal representation without floating-point errors.

### Type Names
- `decimal` - Arbitrary-precision decimal number

**Syntax:** Decimal literals use the `m` suffix (e.g., `123.45m`, `0.001m`)

### TypeSchema Definition (DecimalTypeSchema)

This schema validates user-provided MemberDef configurations for decimal types.

**Decimal TypeSchema (IO Syntax):**

```io
# Always first three fields
type      : { decimal, default: decimal, choices: [decimal] },
default   : { decimal, optional: true, "null": false },
choices   : { array,  optional: true, "null": false, of: { type: decimal } },

# Other type specific fields - Following fields are specific to decimal type
precision : { number, optional: true, "null": false, min: 1 },
scale     : { number, optional: true, "null": false, min: 0 },
min       : { decimal, optional: true, "null": false },
max       : { decimal, optional: true, "null": false },

# Finally optional/null settings for all types
optional  : { bool,   optional: true, "null": false },
"null"    : { bool,   optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{decimal, default: decimal, choices: [decimal]}`
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **Positional vs Named**: Supports both `{decimal, 0.00m, precision: 10, scale: 2}` and `{type: decimal, precision: 10, scale: 2, default: 0.00m}`

**Code (V1):**

```typescript
const decimalSchema = new Schema(
  "decimal",
  { type:       { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:    { type: "decimal", optional: true,  null: false  } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "decimal" } } },
  { precision:  { type: "number", optional: true, null: false } },
  { scale:      { type: "number", optional: true, null: false } },
  { min:        { type: "decimal", optional: true,  null: false } },
  { max:        { type: "decimal", optional: true,  null: false } },
  { optional:   { type: "bool",   optional: true, null: false } },
  { null:       { type: "bool",   optional: true, null: false } },
)
```

### TypeScript Interface (V2)

```typescript
interface DecimalConfig {
  type: 'decimal'
  default?: Decimal
  choices?: Decimal[]
  precision?: number       // Total number of significant digits
  scale?: number          // Number of digits after decimal point
  min?: Decimal           // Minimum allowed value
  max?: Decimal           // Maximum allowed value
  optional?: boolean
  null?: boolean
}
```

### Decimal Precision and Scale

**Terminology:**
- **Precision**: Total number of significant digits (integer + fractional)
- **Scale**: Number of digits after the decimal point

**Example:** `DECIMAL(10, 2)`
- Precision = 10 (total digits)
- Scale = 2 (decimal places)
- Max integer digits = 10 - 2 = 8
- Range: -99999999.99 to 99999999.99

### Validation Modes

Decimal type supports 4 validation modes based on precision and scale configuration:

#### Mode 1: Natural Comparison (No Precision/Scale)
```io
price: {decimal, min: 0.00m}
```
- No precision or scale constraints
- Simple value comparison
- Any decimal precision allowed

#### Mode 2: Scale-Only Validation
```io
price: {decimal, scale: 2, min: 0.00m}
```
- Exact decimal places required
- Value must have exactly `scale` decimal places
- Precision unlimited

#### Mode 3: Precision-Only Validation
```io
coefficient: {decimal, precision: 15}
```
- Maximum significant digits
- Total digits (integer + fractional) ≤ precision
- Scale flexible

#### Mode 4: Strict Validation (SQL DECIMAL Type)
```io
price: {decimal, precision: 10, scale: 2, min: 0.00m, max: 99999999.99m}
```
- Both precision and scale specified
- Mimics SQL `DECIMAL(precision, scale)` behavior
- Integer digits = precision - scale
- Most restrictive mode

### Validation Rules

**Common Validations** (from `doCommonTypeCheck`):
1. **Undefined Check** - Returns default, undefined (if optional), or throws error
2. **Null Check** - Returns null (if allowed) or throws error
3. **Choices Validation** - Validates value is in choices array if defined

**Type-Specific Validations**:

1. **Type Validation**
   - Must be a Decimal instance (values with `m` suffix)
   - Regular numbers rejected (even if numerically equal)
   - Throws `INVALID_TYPE` if not a Decimal

2. **Scale Validation** (Mode 2 & 4)
   - If `scale` defined: actual scale must equal required scale
   - Throws `INVALID_SCALE` if mismatch

3. **Precision Validation** (Mode 3 & 4)
   - Mode 3: Total significant digits ≤ precision
   - Mode 4: Integer digits ≤ (precision - scale)
   - Throws `INVALID_PRECISION` if constraint violated

4. **Range Validation**
   - If `min` defined: value must be >= min (after normalization)
   - If `max` defined: value must be <= max (after normalization)
   - Throws `INVALID_RANGE` if validation fails
   - **Normalization**: Both values converted to same scale for accurate comparison

### V1 Implementation Reference

```typescript
class DecimalDef implements TypeDef {
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): Decimal {
    // 1. Resolve variable if needed
    const valueNode = defs?.getV(node) || node

    // 2. Common type checks (undefined, null, choices)
    let { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    // 3. Type check: Reject regular numbers
    if (typeof value === 'number') {
      throwError(ErrorCodes.invalidType, ...)
    }

    // 4. Validate precision, scale, and range
    value = this.validate(memberDef, value, node)

    return value
  }

  validate(memberDef: MemberDef, value: any, node?: Node): Decimal {
    const valD = Decimal.ensureDecimal(value)

    // Scale validation (Mode 2 & 4)
    if (hasRequiredScale && actualScale !== requiredScale) {
      throwError(ErrorCodes.invalidScale, ...)
    }

    // Precision validation (Mode 3 & 4)
    if (hasRequiredPrecision) {
      if (hasRequiredScale) {
        // Mode 4: Check integer digits
        if (intDigits > maxIntDigits) {
          throwError(ErrorCodes.invalidPrecision, ...)
        }
      } else {
        // Mode 3: Check total precision
        if (actualPrecision > requiredPrecision) {
          throwError(ErrorCodes.invalidPrecision, ...)
        }
      }
    }

    // Range validation (with normalization)
    if (min && normalizedVal < normalizedMin) {
      throwError(ErrorCodes.invalidRange, ...)
    }
    if (max && normalizedVal > normalizedMax) {
      throwError(ErrorCodes.invalidRange, ...)
    }

    return valD
  }
}
```

### V2 Design

```typescript
class DecimalTypeSchema implements TypeSchema<DecimalConfig, Decimal> {
  readonly typeName = 'decimal';

  validate(value: unknown, config: DecimalConfig, ctx: ValidationContext): ValidationResult<Decimal> {
    // 1. Common checks (handled by base validator)
    const commonResult = doCommonTypeCheck(value, config, ctx);
    if (commonResult.handled) return commonResult;

    // 2. Type validation
    if (typeof value === 'number') {
      return ctx.error('INVALID_TYPE', 'Expected decimal (m suffix), got number');
    }
    const decimalValue = Decimal.ensureDecimal(value);

    // 3. Scale validation
    if (config.scale !== undefined) {
      const actualScale = decimalValue.getScale();
      if (actualScale !== config.scale) {
        return ctx.error('INVALID_SCALE', `Expected scale ${config.scale}, got ${actualScale}`);
      }
    }

    // 4. Precision validation
    if (config.precision !== undefined) {
      if (config.scale !== undefined) {
        // Mode 4: Strict DECIMAL(p,s)
        const intDigits = getIntegerDigits(decimalValue);
        const maxIntDigits = config.precision - config.scale;
        if (intDigits > maxIntDigits) {
          return ctx.error('INVALID_PRECISION', `Integer digits exceed DECIMAL(${config.precision},${config.scale})`);
        }
      } else {
        // Mode 3: Precision-only
        const actualPrecision = decimalValue.getPrecision();
        if (actualPrecision > config.precision) {
          return ctx.error('INVALID_PRECISION', `Precision ${actualPrecision} exceeds max ${config.precision}`);
        }
      }
    }

    // 5. Range validation (with normalization)
    if (config.min && compareDecimal(decimalValue, config.min) < 0) {
      return ctx.error('INVALID_RANGE', `Value must be >= ${config.min}`);
    }
    if (config.max && compareDecimal(decimalValue, config.max) > 0) {
      return ctx.error('INVALID_RANGE', `Value must be <= ${config.max}`);
    }

    return ctx.success(decimalValue);
  }

  serialize(value: Decimal, config: DecimalConfig, ctx: SerializationContext): string {
    return value.toString() + 'm';
  }
}
```

### Examples

#### User Schema Examples

**Mode 1: Natural (no constraints):**
```io
price: {decimal, 0.00m, min: 0.00m}
```

**Mode 2: Scale-only:**
```io
price: {decimal, 0.00m, scale: 2, min: 0.00m}  ← Must have exactly 2 decimal places
```

**Mode 3: Precision-only:**
```io
coefficient: {decimal, precision: 15}  ← Max 15 significant digits
```

**Mode 4: Strict DECIMAL(10,2):**
```io
amount: {decimal, 0.00m, precision: 10, scale: 2, min: 0.00m, max: 99999999.99m}
         ↑              ↑
         8 integer digits max, 2 decimal places required
```

**Named syntax:**
```io
price: {type: decimal, default: 0.00m, scale: 2, min: 0.00m}
```

#### Valid Data Examples

```io
~ $product: { price: {decimal, scale: 2} }
---
~ : product
19.99m   ← Valid (exactly 2 decimal places)
0.00m    ← Valid (exactly 2 decimal places)
```

#### Invalid Data Examples

**Scale mismatch:**
```io
~ $product: { price: {decimal, scale: 2} }
---
~ : product
19.9m    ← Error: INVALID_SCALE (has 1 decimal place, expected 2)
19       ← Error: INVALID_TYPE (number, not decimal)
```

**Precision exceeded:**
```io
~ $scientific: { coefficient: {decimal, precision: 10, scale: 2} }
---
~ : scientific
123456789.00m  ← Error: INVALID_PRECISION (9 integer digits, max is 8)
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| INVALID_TYPE | Value is not a Decimal | Expected decimal value (with 'm' suffix), got {actualType} |
| INVALID_SCALE | Actual scale ≠ required scale | Value has scale {actualScale}, expected {requiredScale} |
| INVALID_PRECISION | Precision constraint violated | Value has precision {actualPrecision}, max allowed is {requiredPrecision} |
| INVALID_PRECISION | Integer digits exceed limit (Mode 4) | Integer part has {intDigits} digits, DECIMAL({precision},{scale}) allows {maxIntDigits} |
| INVALID_RANGE | Value < min | Value {value} is less than minimum {min} |
| INVALID_RANGE | Value > max | Value {value} is greater than maximum {max} |
| VALUE_REQUIRED | Value is undefined and not optional | Value required for {path} |
| NULL_NOT_ALLOWED | Value is null but null: false | Null value not allowed for {path} |
| INVALID_CHOICE | Value not in choices array | Invalid choice for {path}. Expected one of: {choices} |

### Notes

**Why Reject Regular Numbers:**
- Prevents accidental precision loss
- Forces explicit decimal notation (`m` suffix)
- Ensures user awareness of decimal type
- Example: `19.99` (number) ≠ `19.99m` (decimal)

**Normalization for Comparison:**
- When comparing decimals with different scales
- Both values converted to common scale
- Ensures accurate comparison
- Example: `1.5m` vs `1.50m` → both become scale 2 for comparison

**SQL DECIMAL Compatibility:**
- Mode 4 mimics SQL `DECIMAL(precision, scale)` exactly
- Useful for database schema validation
- Example: `DECIMAL(10,2)` = 8 integer digits + 2 fractional digits

**Performance:**
- Arbitrary-precision operations slower than native numbers
- Use only when precision is critical (financial, scientific)
- Consider `number` type for performance-critical code

**V1 Utilities:**
- `Decimal.ensureDecimal(value)` - Converts to Decimal if needed
- `getIntegerDigits(decimal)` - Counts digits before decimal point
- `decimal.getPrecision()` - Total significant digits
- `decimal.getScale()` - Decimal places
- `decimal.convert(precision, scale)` - Normalizes for comparison

---

**Status:** Complete
**Last Updated:** 2025-01-21
