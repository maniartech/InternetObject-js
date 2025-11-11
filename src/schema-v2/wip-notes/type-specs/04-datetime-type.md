# Type Spec: DateTime Type

## Type: `datetime`, `date`, `time`

### Overview
Validates date and time values. Supports three variants:
- `datetime` - Full date and time (e.g., `2025-01-21T10:30:00Z`)
- `date` - Date only (e.g., `2025-01-21`)
- `time` - Time only (e.g., `10:30:00`)

### Type Names
- `datetime` - Full date and time with timezone
- `date` - Date only (YYYY-MM-DD)
- `time` - Time only (HH:MM:SS)

### TypeSchema Definition (DateTimeTypeSchema)

This schema validates user-provided MemberDef configurations for datetime types.

**DateTime TypeSchema (IO Syntax):**

```io
# Always first three fields
type     : { datetime, default: datetime, choices: [datetime, date, time] },
default  : { datetime, optional: true, "null": false },
choices  : { array,  optional: true, "null": false, of: { type: datetime } },

# Other type specific fields - Following fields are specific to datetime type
min      : { datetime, optional: true, "null": false },
max      : { datetime, optional: true, "null": false },

# Finally optional/null settings for all types
optional : { bool,   optional: true, "null": false },
"null"   : { bool,   optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{datetime, default: datetime, choices: [...]}`
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **Positional vs Named**: Supports both `{datetime, 2025-01-01T00:00:00Z, min: 2020-01-01}` and `{type: datetime, default: 2025-01-01T00:00:00Z, min: 2020-01-01}`

**Code (V1):**

```typescript
const schema = new Schema(
  "datetime",
  { type:     { type: "string",   optional: false, null: false, choices: DATETIME_TYPES } },
  { default:  { type: "datetime", optional: true,  null: false  } },
  { choices:  { type: "array",    optional: true,  null: false, of: { type: "datetime" } } },
  { min:      { type: "datetime", optional: true,  null: false } },
  { max:      { type: "datetime", optional: true,  null: false } },
  { optional: { type: "bool",     optional: true, null: false } },
  { null:     { type: "bool",     optional: true, null: false } }
)
```

### TypeScript Interface (V2)

```typescript
interface DateTimeConfig {
  type: 'datetime' | 'date' | 'time'
  default?: Date
  choices?: Date[]
  min?: Date              // Minimum allowed date/time
  max?: Date              // Maximum allowed date/time
  optional?: boolean
  null?: boolean
}
```

### Validation Rules

**Common Validations** (from `doCommonTypeCheck`):
1. **Undefined Check** - Returns default, undefined (if optional), or throws error
2. **Null Check** - Returns null (if allowed) or throws error
3. **Choices Validation** - Validates value is in choices array if defined

**Type-Specific Validations**:

1. **Type Validation**
   - Must be a valid datetime token
   - Must match the specified type (`datetime`, `date`, or `time`)
   - Throws `INVALID_DATETIME` if not valid

2. **Range Validation**
   - If `min` defined: value must be >= min
   - If `max` defined: value must be <= max
   - Throws `OUT_OF_RANGE` if validation fails

### DateTime Format Examples

**datetime (full date and time):**
```io
2025-01-21T10:30:00Z
2025-01-21T10:30:00+05:30
2025-01-21T10:30:00.123Z
```

**date (date only):**
```io
2025-01-21
2025-12-31
2020-02-29
```

**time (time only):**
```io
10:30:00
23:59:59
00:00:00.123
```

### V1 Implementation Reference

```typescript
class DateTimeDef implements TypeDef {
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): Date {
    // 1. Resolve variable if needed
    const valueNode = defs?.getV(node) || node

    // 2. Common type checks (undefined, null, choices)
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    // 3. Validate token type
    if (valueNode.type !== TokenType.DATETIME) {
      throw new ValidationError(ErrorCodes.invalidDateTime, ...)
    }

    // 4. Range validation (min/max)
    this.#validate(value, memberDef, node)

    return value
  }

  #validate(value: Date, memberDef: MemberDef, node: Node) {
    // Min validation
    if (memberDef.min && value < memberDef.min) {
      throw new ValidationError(ErrorCodes.outOfRange, ...)
    }

    // Max validation
    if (memberDef.max && value > memberDef.max) {
      throw new ValidationError(ErrorCodes.outOfRange, ...)
    }
  }
}
```

### V2 Design

```typescript
class DateTimeTypeSchema implements TypeSchema<DateTimeConfig, Date> {
  readonly typeName = 'datetime';
  readonly typeAliases = ['datetime', 'date', 'time'];

  validate(value: unknown, config: DateTimeConfig, ctx: ValidationContext): ValidationResult<Date> {
    // 1. Common checks (handled by base validator)
    const commonResult = doCommonTypeCheck(value, config, ctx);
    if (commonResult.handled) return commonResult;

    // 2. Type validation
    if (!isValidDateTime(value, config.type)) {
      return ctx.error('INVALID_DATETIME', `Expected ${config.type} value`);
    }

    // 3. Range validation
    const dateValue = value as Date;
    if (config.min && dateValue < config.min) {
      return ctx.error('OUT_OF_RANGE', `Value must be >= ${config.min}`);
    }
    if (config.max && dateValue > config.max) {
      return ctx.error('OUT_OF_RANGE', `Value must be <= ${config.max}`);
    }

    return ctx.success(dateValue);
  }

  serialize(value: Date, config: DateTimeConfig, ctx: SerializationContext): string {
    return dateToIOString(value, config.type);
  }
}
```

### Examples

#### User Schema Examples

**Positional syntax:**
```io
createdAt: {datetime, 2025-01-01T00:00:00Z, min: 2020-01-01}
birthDate: {date, min: 1900-01-01, max: 2025-12-31}
startTime: {time, 09:00:00}
```

**Named syntax:**
```io
createdAt: {type: datetime, default: 2025-01-01T00:00:00Z, min: 2020-01-01}
birthDate: {min: 1900-01-01, type: date, max: 2025-12-31}
startTime: {default: 09:00:00, type: time}
```

#### Valid Data Examples

```io
~ $event: { createdAt: datetime, birthDate: date, startTime: time }
---
~ : event
2025-01-21T10:30:00Z, 1990-05-15, 14:30:00
```

#### Invalid Data Examples

```io
~ $event: { createdAt: {datetime, min: 2020-01-01, max: 2025-12-31} }
---
~ : event
2019-12-31T23:59:59Z  ← Error: OUT_OF_RANGE (before min)
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| INVALID_DATETIME | Value is not a valid datetime/date/time | Expecting a {TYPE} value for {path}, currently {value}, a {actualType} value |
| OUT_OF_RANGE | Value < min | Expecting the value for '{path}' to be greater than or equal to '{min}' |
| OUT_OF_RANGE | Value > max | Expecting the value for '{path}' to be less than or equal to '{max}' |
| VALUE_REQUIRED | Value is undefined and not optional | Value required for {path} |
| NULL_NOT_ALLOWED | Value is null but null: false | Null value not allowed for {path} |
| INVALID_CHOICE | Value not in choices array | Invalid choice for {path}. Expected one of: {choices} |

### Notes

**Timezone Handling:**
- `datetime` values should include timezone information
- `date` values are timezone-independent
- `time` values are timezone-independent

**Comparison:**
- JavaScript Date objects are used internally
- Comparisons use standard Date comparison operators

**Serialization:**
- `datetime` → ISO 8601 format with timezone
- `date` → YYYY-MM-DD format
- `time` → HH:MM:SS format (with optional milliseconds)

**V1 Utilities:**
- `dateToIOString(date, type)` - Converts Date to IO string format
- `dateToSmartString(date, type)` - Converts Date to human-readable format for error messages

---

**Status:** Complete
**Last Updated:** 2025-01-21
