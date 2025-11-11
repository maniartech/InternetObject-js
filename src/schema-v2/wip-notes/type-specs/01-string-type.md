# String Type Specification

## Type: `string`, `url`, `email`

### Overview
Validates and serializes string values, including specialized formats like URLs and emails. Supports length constraints, pattern matching, and format control.

**CRITICAL CONCEPT - TypeSchema as Self-Documenting Contract:**

This specification defines the **TypeSchema** for string types. The TypeSchema serves two purposes:

1. **Configuration Validator**: When users write `name: {string, minLen: 3}`, this MemberDef is validated against StringTypeSchema
2. **Canonical Defaults**: When users write `name: string`, the TypeSchema provides default values (optional: false, null: false, etc.)

**Example Flow:**
```
User writes: name: {string, minLength: 3}
            ↓
❌ FAILS - "minLength" is not valid in StringTypeSchema
   Error: "Invalid configuration: unknown property 'minLength'. Did you mean 'minLen'?"

User writes: name: {string, minLen: 3}
            ↓
✅ PASSES - "minLen" is valid (type: number, optional: true)
   Config: {type: 'string', minLen: 3, maxLen: undefined, optional: false, ...}
```

### Type Names
- `string` - General string type
- `url` - URL format validation (using URL regex)
- `email` - Email format validation (RFC 5322 compliant)

### TypeSchema Definition (StringTypeSchema)

This schema validates user-provided MemberDef configurations for string types.

**String TypeSchema (IO Syntax):**

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

**Critical Syntax Rules:**
- **Reserved keyword**: `"null"` MUST be quoted (reserved word in IO)
- **First field `type`**: Special syntax `{string, default: string, choices: [...]}`
- **Other fields**: Full MemberDef syntax `{ type, optional, "null", ... }`
- **NEVER shorthand**: NOT `minLen: string` or `minLen?: string`

**Code (V1):**

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

// TypeScript interface (for V2 implementation)
interface StringConfig {
  type: 'string' | 'url' | 'email';  // Required - validated by choices
  default?: string;                   // Optional: Default value
  choices?: string[];                 // Optional: Allowed values (supports @variables)
  optional?: boolean;                 // Optional: Can be undefined (default: false)
  null?: boolean;                     // Optional: Can be null (default: false)
  len?: number;                       // Optional: Exact length (>= 0)
  minLen?: number;                    // Optional: Minimum length (>= 0)
  maxLen?: number;                    // Optional: Maximum length (>= 0)
  pattern?: string;                   // Optional: Regex pattern (string only)
  flags?: string;                     // Optional: Regex flags
  format?: 'auto' | 'open' | 'regular' | 'raw';  // Optional (default: 'auto')
  escapeLines?: boolean;              // Optional (default: true)
  encloser?: '"' | "'";               // Optional (default: '"')
}
```

**Validation Examples:**

```typescript
// ✅ Valid configurations (validated against StringTypeSchema)
{string, minLen: 3}                    // minLen is valid field
{string, pattern: '^[A-Z]+$'}          // pattern is valid field
{email}                                // email is valid type choice
{string, format: 'raw'}                // raw is valid format choice

// ❌ Invalid configurations (rejected at schema parse time)
{string, minLength: 3}                 // "minLength" not in StringTypeSchema → Error
{string, maxLength: 10}                // "maxLength" not in StringTypeSchema → Error
{string, regex: '^[A-Z]+$'}            // "regex" not in StringTypeSchema → Error
{string, format: 'json'}               // "json" not in format choices → Error
{phone}                                // "phone" not in type choices → Error
```

### Validation Rules

**Common Validations** (applied first via `doCommonTypeCheck`):
1. Undefined → return default OR undefined if optional OR throw `VALUE_REQUIRED`
2. Null → return null if `null: true` OR throw `NULL_NOT_ALLOWED`
3. Choices → validate against array (resolving @variables with `defs.getV()`)

**Type-Specific Validations**:

1. **Type Check**
   - Value must be TokenNode with `type === TokenType.STRING`
   - Throw `NOT_A_STRING` if type mismatch

2. **Pattern Validation** (applied in order)
   - **For `type === 'string'` with `pattern` defined:**
     ```typescript
     // Compile regex once and cache in memberDef.re
     const re = memberDef.re || new RegExp(pattern, flags);
     if (!re.test(value)) throw INVALID_PATTERN;
     ```

   - **For `type === 'email'`:**
     ```typescript
     // RFC 5322 email regex
     const emailExp = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
     if (!emailExp.test(value)) throw INVALID_EMAIL;
     ```

   - **For `type === 'url'`:**
     ```typescript
     const urlExp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;
     if (!urlExp.test(value)) throw INVALID_URL;
     ```

3. **Length Validation** (all must pass)
   - **Exact Length:** `if (len !== undefined && value.length !== len) throw INVALID_LENGTH`
   - **Max Length:** `if (maxLen !== undefined && value.length > maxLen) throw INVALID_MAX_LENGTH`
   - **Min Length:** `if (minLen !== undefined && value.length < minLen) throw INVALID_MIN_LENGTH`

### V1 Implementation Pattern

```typescript
// V1: src/schema/types/string.ts
function _process(node: Node, memberDef: MemberDef, defs?: Definitions): string {
  // 1. Resolve variables
  const valueNode = defs?.getV(node) || node;

  // 2. Common checks (undefined, null, choices)
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs);
  if (changed) return value;

  // 3. Type check
  if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.STRING) {
    throw new ValidationError(ErrorCodes.notAString, `Expecting a string value...`, node);
  }

  // 4. Pattern validation (email, url, or custom pattern)
  _validatePattern(memberDef, value, node);

  // 5. Length validations
  if (len !== undefined && value.length !== len) throw InvalidLength;
  if (maxLen !== undefined && value.length > maxLen) throw InvalidMaxLength;
  if (minLen !== undefined && value.length < minLen) throw InvalidMinLength;

  return value;
}
```

### V2 Design

```typescript
class StringTypeSchema implements TypeSchema<StringConfig, string> {
  readonly typeName: string; // 'string', 'url', or 'email'

  private static emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+...)/;
  private static urlRegex = /((([A-Za-z]{3,9}:(?:\/\/)?...)/;

  validate(value: unknown, config: StringConfig, ctx: ValidationContext): ValidationResult<string> {
    // 1. Handle variable references (V1 pattern)
    if (value instanceof VarRefNode) {
      value = defs.getV(`@${value.name}`);
    }

    // 2. Common validations (undefined, null, choices)
    //    Use V1's doCommonTypeCheck logic

    // 3. Type check
    if (typeof value !== 'string') {
      return ValidationResult.failure([{
        code: 'NOT_A_STRING',
        message: `Expecting a string value for '${ctx.currentPath}' but found ${typeof value}`,
        path: ctx.currentPath
      }]);
    }

    // 4. Pattern validation
    if (this.typeName === 'email' && !StringTypeSchema.emailRegex.test(value)) {
      return ValidationResult.failure([{
        code: 'INVALID_EMAIL',
        message: `Invalid email address: ${value}`,
        path: ctx.currentPath
      }]);
    }

    if (this.typeName === 'url' && !StringTypeSchema.urlRegex.test(value)) {
      return ValidationResult.failure([{
        code: 'INVALID_URL',
        message: `Invalid URL: ${value}`,
        path: ctx.currentPath
      }]);
    }

    if (this.typeName === 'string' && config.pattern) {
      // Compile and cache regex
      const regex = new RegExp(config.pattern, config.flags);
      if (!regex.test(value)) {
        return ValidationResult.failure([{
          code: 'INVALID_PATTERN',
          message: `The value '${value}' does not match the pattern '${config.pattern}'`,
          path: ctx.currentPath
        }]);
      }
    }

    // 5. Length validations
    const errors: ValidationError[] = [];

    if (config.len !== undefined && value.length !== config.len) {
      errors.push({
        code: 'INVALID_LENGTH',
        message: `String length must be ${config.len}, but is ${value.length}`,
        path: ctx.currentPath
      });
    }

    if (config.maxLen !== undefined && value.length > config.maxLen) {
      errors.push({
        code: 'INVALID_MAX_LENGTH',
        message: `String length must be <= ${config.maxLen}, but is ${value.length}`,
        path: ctx.currentPath
      });
    }

    if (config.minLen !== undefined && value.length < config.minLen) {
      errors.push({
        code: 'INVALID_MIN_LENGTH',
        message: `String length must be >= ${config.minLen}, but is ${value.length}`,
        path: ctx.currentPath
      });
    }

    if (errors.length > 0) {
      return ValidationResult.failure(errors);
    }

    return ValidationResult.success(value);
  }

  serialize(value: string, config: StringConfig, ctx: SerializationContext): string {
    const format = config.format || 'auto';

    switch (format) {
      case 'auto':
        return toAutoString(value, config.escapeLines, config.encloser);
      case 'open':
        return toOpenString(value, config.escapeLines);
      case 'regular':
        return toRegularString(value, config.escapeLines, config.encloser);
      case 'raw':
        return toRawString(value, config.encloser);
    }
  }
}
```

### Examples

#### Valid Cases

```typescript
// Basic string
{ type: 'string' }
validate('hello') // ✓ 'hello'

// With default
{ type: 'string', default: 'world', optional: true }
validate(undefined) // ✓ 'world'

// With choices (including variables)
{ type: 'string', choices: ['red', 'green', '@primaryColor'] }
// Assuming @primaryColor = 'blue'
validate('red')   // ✓ 'red'
validate('blue')  // ✓ 'blue'

// Email validation
{ type: 'email' }
validate('user@example.com') // ✓ 'user@example.com'

// URL validation
{ type: 'url' }
validate('https://example.com') // ✓ 'https://example.com'

// Length constraints
{ type: 'string', minLen: 3, maxLen: 10 }
validate('hello') // ✓ 'hello'

// Pattern matching
{ type: 'string', pattern: '^[A-Z]+$', flags: 'i' }
validate('HELLO') // ✓ 'HELLO'
validate('hello') // ✓ 'hello' (case insensitive)
```

#### Invalid Cases

```typescript
// Type mismatch
{ type: 'string' }
validate(123) // ✗ NOT_A_STRING

// Required field
{ type: 'string' }
validate(undefined) // ✗ VALUE_REQUIRED

// Null not allowed
{ type: 'string' }
validate(null) // ✗ NULL_NOT_ALLOWED

// Invalid choice
{ type: 'string', choices: ['red', 'green', 'blue'] }
validate('yellow') // ✗ INVALID_CHOICE

// Invalid email
{ type: 'email' }
validate('not-an-email') // ✗ INVALID_EMAIL

// Invalid URL
{ type: 'url' }
validate('not a url') // ✗ INVALID_URL

// Pattern mismatch
{ type: 'string', pattern: '^[A-Z]+$' }
validate('hello') // ✗ INVALID_PATTERN

// Length violations
{ type: 'string', len: 5 }
validate('hello world') // ✗ INVALID_LENGTH

{ type: 'string', maxLen: 5 }
validate('hello world') // ✗ INVALID_MAX_LENGTH

{ type: 'string', minLen: 10 }
validate('hello') // ✗ INVALID_MIN_LENGTH
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| `NOT_A_STRING` | Value is not a string type | `Expecting a string value for '{path}' but found {type}` |
| `INVALID_EMAIL` | Email format validation failed | `Invalid email address: {value}` |
| `INVALID_URL` | URL format validation failed | `Invalid URL: {value}` |
| `INVALID_PATTERN` | Custom pattern does not match | `The value '{value}' does not match the pattern '{pattern}'` |
| `INVALID_LENGTH` | Exact length constraint violated | `String length must be {len}, but is {actualLength}` |
| `INVALID_MAX_LENGTH` | Maximum length exceeded | `String length must be <= {maxLen}, but is {actualLength}` |
| `INVALID_MIN_LENGTH` | Minimum length not met | `String length must be >= {minLen}, but is {actualLength}` |
| `VALUE_REQUIRED` | Undefined value for required field | `Value is required for {path}` |
| `NULL_NOT_ALLOWED` | Null value when not allowed | `Null is not allowed for {path}` |
| `INVALID_CHOICE` | Value not in choices array | `The value of "{path}" must be one of the [{choices}]. Currently it is {value}` |

### Notes

- **Pattern Caching**: V1 caches compiled regex in `memberDef.re` for performance. V2 should consider caching at config level.
- **Regex Compilation**: Pattern compilation errors should be caught and reported clearly
- **Variable Resolution**: Choices can contain variable references (`@varName`) resolved via `defs.getV()`
- **Serialization Formats**:
  - `auto`: Choose format based on content (quotes if needed)
  - `open`: Multi-line without quotes
  - `regular`: Always quoted with escaping
  - `raw`: Raw string with minimal escaping
- **Email Regex**: V1 uses RFC 5322 compliant regex from emailregex.com
- **URL Regex**: V1 uses comprehensive URL regex from urlregex.com
