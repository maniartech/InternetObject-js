# Internet Object - Error Code Registry

> **Version:** 1.0.0
> **Status:** FROZEN - No new codes without approval
> **Last Updated:** November 9, 2025
> **Cross-Language Standard:** All implementations must use these exact codes

## 🎯 Purpose

This registry defines **all official error codes** for Internet Object across all language implementations (JavaScript, Go, Python, Java, Rust, etc.). Error codes are part of the API contract and must remain stable.

## 🔒 Change Policy

- **FROZEN:** No new error codes without team approval
- **Versioned:** Changes tracked with semantic versioning
- **Cross-language:** All implementations must use identical codes
- **Breaking change:** Removing or renaming codes requires major version bump
- **Non-breaking:** Adding new codes (rare) requires minor version bump

## 📊 Error Code Structure

### Format

```
[category]-[specific-issue]
```

### Categories

1. **General** - Cross-cutting concerns (G-xxx)
2. **Tokenization** - Character/token level (T-xxx)
3. **Parsing** - Structure/syntax level (P-xxx)
4. **Validation** - Type/constraint level (V-xxx)

### Numbering System (Future)

For absolute stability across languages, consider prefixed numbers:

```
G-001: invalid-type
T-001: string-not-closed
P-001: unexpected-token
V-001: not-a-number
```

---

## 📋 Complete Error Code Registry

### CATEGORY 1: GENERAL ERRORS (Cross-cutting)

**Purpose:** Errors that can occur across multiple layers

| Code | Name | Layer | Usage Count | Status | Description |
|------|------|-------|-------------|--------|-------------|
| `invalid-type` | Invalid Type | General | 11 | ✅ STABLE | Type specification is invalid or unknown |
| `invalid-value` | Invalid Value | General | 1 | ✅ STABLE | Value doesn't meet basic requirements |
| `value-required` | Value Required | General | 2 | ✅ STABLE | Required value is missing |
| `null-not-allowed` | Null Not Allowed | General | 2 | ✅ STABLE | Null value where not permitted |

**Total General Errors:** 4

---

### CATEGORY 2: TOKENIZATION ERRORS (Character-level)

**Purpose:** Errors during lexical analysis (character → token)

| Code | Name | Layer | Usage Count | Status | Description |
|------|------|-------|-------------|--------|-------------|
| `string-not-closed` | String Not Closed | Tokenizer | 2 | ✅ STABLE | Unterminated string literal (missing closing quote) |
| `invalid-escape-sequence` | Invalid Escape Sequence | Tokenizer | 3 | ✅ STABLE | Invalid escape sequence in string (e.g., `\x`) |
| `unsupported-annotation` | Unsupported Annotation | Tokenizer | 1 | ✅ STABLE | Unknown annotation marker (e.g., `@unknown`) |
| `invalid-datetime` | Invalid DateTime | Tokenizer | 2 | ✅ STABLE | DateTime format doesn't match ISO 8601 |

**Total Tokenization Errors:** 4

**Notes:**
- Tokenization errors always become ERROR tokens
- Parser handles ERROR tokens via error recovery

---

### CATEGORY 3: PARSING ERRORS (Structure-level)

**Purpose:** Errors during AST construction (token → structure)

#### 3.1 Structural Errors

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `unexpected-token` | Unexpected Token | 6 | ✅ STABLE | Token found where not expected (most common) |
| `expecting-bracket` | Expecting Bracket | 5 | ✅ STABLE | Missing closing bracket/brace `]` or `}` |
| `unexpected-positional-member` | Unexpected Positional Member | 1 | ✅ STABLE | Positional member after keyed member |
| `invalid-key` | Invalid Key | 4 | ✅ STABLE | Object key has invalid type/format |

#### 3.2 Schema Parsing Errors

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `invalid-schema` | Invalid Schema | 6 | ✅ STABLE | Schema definition is malformed |
| `schema-not-found` | Schema Not Found | 0 | ⚠️ DEFINED | Referenced schema doesn't exist |
| `schema-missing` | Schema Missing | 1 | ✅ STABLE | Required schema not provided |
| `empty-memberdef` | Empty Member Definition | 1 | ✅ STABLE | Member definition is empty |
| `invalid-definition` | Invalid Definition | 3 | ✅ STABLE | Type definition is malformed |
| `invalid-memberdef` | Invalid Member Definition | 2 | ✅ STABLE | Member definition structure invalid |
| `invalid-schema-name` | Invalid Schema Name | 0 | ⚠️ DEFINED | Schema name format invalid |

#### 3.3 Reference Errors

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `variable-not-defined` | Variable Not Defined | 0 | ⚠️ DEFINED | Variable reference doesn't exist |
| `schema-not-defined` | Schema Not Defined | 0 | ⚠️ DEFINED | Schema reference doesn't exist |

**Total Parsing Errors:** 13

**Notes:**
- `schema-not-found`, `schema-not-defined`, `variable-not-defined`, `invalid-schema-name` are defined but not currently used
- May be used in future schema features or removed in cleanup

---

### CATEGORY 4: VALIDATION ERRORS (Type/Constraint-level)

**Purpose:** Errors during schema validation (value → type check)

#### 4.1 Object Validation

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `invalid-object` | Invalid Object | 1 | ✅ STABLE | Value is not a valid object |
| `unknown-member` | Unknown Member | 1 | ✅ STABLE | Object member not defined in schema |
| `duplicate-member` | Duplicate Member | 2 | ✅ STABLE | Object has duplicate keys |
| `additional-values-not-allowed` | Additional Values Not Allowed | 1 | ✅ STABLE | Extra values in closed schema |

#### 4.2 Array Validation

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `invalid-array` | Invalid Array | 0 | ⚠️ DEFINED | Array structure invalid |
| `not-an-array` | Not An Array | 1 | ✅ STABLE | Expected array, got different type |

#### 4.3 String Validation

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `not-a-string` | Not A String | 1 | ✅ STABLE | Expected string, got different type |
| `invalid-email` | Invalid Email | 1 | ✅ STABLE | String doesn't match email pattern |
| `invalid-url` | Invalid URL | 1 | ✅ STABLE | String doesn't match URL pattern |
| `invalid-length` | Invalid Length | 2 | ✅ STABLE | String length constraint violated |
| `invalid-min-length` | Invalid Min Length | 1 | ✅ STABLE | String shorter than minimum |
| `invalid-max-length` | Invalid Max Length | 1 | ✅ STABLE | String longer than maximum |
| `invalid-pattern` | Invalid Pattern | 2 | ✅ STABLE | String doesn't match regex pattern |

#### 4.4 Number Validation

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `unsupported-number-type` | Unsupported Number Type | 2 | ✅ STABLE | Number type specifier unknown |
| `not-a-number` | Not A Number | 0 | ⚠️ DEFINED | Expected number, got different type |
| `not-an-integer` | Not An Integer | 0 | ⚠️ DEFINED | Expected integer, got decimal |
| `out-of-range` | Out Of Range | 4 | ✅ STABLE | Number outside min/max bounds |
| `invalid-range` | Invalid Range | 5 | ✅ STABLE | Range specification invalid |
| `invalid-scale` | Invalid Scale | 4 | ✅ STABLE | Decimal scale (digits after .) violated |
| `invalid-precision` | Invalid Precision | 6 | ✅ STABLE | Decimal precision (total digits) violated |

#### 4.5 Boolean Validation

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `not-a-bool` | Not A Boolean | 1 | ✅ STABLE | Expected boolean, got different type |

#### 4.6 Choice Validation

| Code | Name | Usage Count | Status | Description |
|------|------|-------------|--------|-------------|
| `invalid-choice` | Invalid Choice | 1 | ✅ STABLE | Value not in allowed choices list |

**Total Validation Errors:** 24

**Notes:**
- `invalid-array`, `not-a-number`, `not-an-integer` defined but rarely/never used
- Should verify if actually needed or can be consolidated

---

## 📊 Summary Statistics

| Category | Total Codes | Used Codes | Unused Codes | Status |
|----------|-------------|------------|--------------|--------|
| General | 4 | 4 | 0 | ✅ All Active |
| Tokenization | 4 | 4 | 0 | ✅ All Active |
| Parsing | 13 | 9 | 4 | ⚠️ Review Unused |
| Validation | 24 | 20 | 4 | ⚠️ Review Unused |
| **TOTAL** | **45** | **37** | **8** | **82% Active** |

---

## 🔍 Unused Error Codes (Candidates for Review)

### Parsing Layer (4 unused)

1. `schema-not-found` - Defined but never thrown
   - **Decision needed:** Remove or implement?
   - **Use case:** When `$schema: MySchema` references non-existent schema

2. `invalid-schema-name` - Defined but never thrown
   - **Decision needed:** Remove or implement?
   - **Use case:** When schema name has invalid format

3. `variable-not-defined` - Defined but never thrown
   - **Decision needed:** Remove or implement?
   - **Use case:** When `$var` references non-existent variable

4. `schema-not-defined` - Defined but never thrown
   - **Decision needed:** Remove or implement?
   - **Use case:** Similar to `schema-not-found`?
   - **Note:** Might be duplicate of `schema-not-found`

### Validation Layer (4 unused)

1. `invalid-array` - Defined but never thrown
   - **Current:** Using `not-an-array` instead
   - **Decision needed:** Consolidate or differentiate?
   - **Proposal:** Use `not-an-array` for type mismatch, remove `invalid-array`

2. `not-a-number` - Defined but never thrown
   - **Current:** Using `invalid-type` instead
   - **Decision needed:** Consolidate or differentiate?
   - **Proposal:** Use `not-a-number` consistently, replace `invalid-type` in number validation

3. `not-an-integer` - Defined but never thrown
   - **Current:** Using `invalid-type` or `invalid-range`
   - **Decision needed:** Implement for integer-specific validation?
   - **Proposal:** Use when expecting integer but got decimal (e.g., 3.14 for int field)

4. `invalid-array` - Duplicate listed
   - Already covered above

---

## 🎯 Recommendations

### Priority 1: Consolidate Duplicate Concepts

**Problem:** Some errors overlap in purpose

#### Number Type Errors

**Current state:**
```typescript
// Sometimes throws:
ErrorCodes.invalidType  // "Expected number but got string"

// But we have defined:
ErrorCodes.notANumber   // Never used!
```

**Recommendation:**
```typescript
// ✅ Use consistently:
ErrorCodes.notANumber   // For type mismatches (string when expecting number)
ErrorCodes.invalidType  // Only for invalid TYPE DEFINITIONS (not values)
```

**Action:** Replace all `invalidType` in validation with specific type errors:
- `notANumber` (number validation)
- `notAString` (string validation)
- `notABool` (boolean validation)
- `notAnArray` (array validation)

#### Integer vs Decimal

**Current state:**
```typescript
// No distinction between integer and decimal validation
number: int  // How do we enforce?
```

**Recommendation:**
```typescript
// ✅ Implement:
ErrorCodes.notAnInteger  // When expecting int but got decimal
```

**Example:**
```
age: int
data: Alice, 25.5

Error: not-an-integer
Expected integer for 'age' but got decimal '25.5'.
Try: Remove decimal part: 25
```

### Priority 2: Remove or Implement Unused Codes

| Code | Recommendation | Rationale |
|------|---------------|-----------|
| `schema-not-found` | ✅ **KEEP** - Implement | Needed for schema references |
| `schema-not-defined` | ❌ **REMOVE** | Duplicate of `schema-not-found` |
| `invalid-schema-name` | ❌ **REMOVE** | Use `invalid-key` instead |
| `variable-not-defined` | 🤔 **DEFER** | Future feature (variables) |
| `invalid-array` | ❌ **REMOVE** | Redundant with `not-an-array` |

### Priority 3: Add Missing Type Errors

**Current gap:** Some types don't have dedicated "not-a-X" errors

**Proposal:** Add for completeness (future):
- `not-a-bigint` (currently using `invalid-type`)
- `not-a-decimal` (currently using `invalid-type`)
- `not-an-object` (currently using `invalid-object`)

**Status:** LOW PRIORITY - Current approach works, add only if needed

---

## 🔒 Error Code Approval Process

### For New Error Codes

1. **Propose** - Create GitHub issue with:
   - Error code name (kebab-case)
   - Category (General/Tokenization/Parsing/Validation)
   - Use case (when thrown)
   - Example message
   - Cross-language impact assessment

2. **Review** - Team reviews:
   - Is this truly needed?
   - Can we use existing code?
   - Does it fit our taxonomy?
   - Is name clear and consistent?

3. **Approve** - Requires:
   - 2+ team member approvals
   - Documentation update
   - Implementation in ALL language ports

4. **Document** - Add to this registry:
   - Code name and number (if using numbers)
   - Description
   - Usage examples
   - Cross-language status

### For Removing Error Codes

**Breaking change!** Requires:

1. **Deprecation period** - Mark as deprecated for 1 major version
2. **Migration guide** - Document replacement code
3. **All implementations** - Remove from all language ports simultaneously
4. **Major version bump** - Requires InternetObject 2.0, 3.0, etc.

### For Renaming Error Codes

**Extremely rare!** Same as removal - breaking change.

---

## 🗂️ Error Code Cross-Reference

### By Usage Frequency (Top 20)

| Rank | Code | Count | Category | Priority |
|------|------|-------|----------|----------|
| 1 | `invalid-type` | 11 | General | P0 - Consolidate usage |
| 2 | `unexpected-token` | 6 | Parsing | P0 - Improve messages |
| 3 | `invalid-schema` | 6 | Parsing | P1 - Review usage |
| 4 | `invalid-precision` | 6 | Validation | P1 - Improve messages |
| 5 | `expecting-bracket` | 5 | Parsing | P0 - Improve messages |
| 6 | `invalid-range` | 5 | Validation | P0 - Improve messages |
| 7 | `invalid-key` | 4 | Parsing | P1 - Review consistency |
| 8 | `out-of-range` | 4 | Validation | P0 - Improve messages |
| 9 | `invalid-scale` | 4 | Validation | P1 - Improve messages |
| 10 | `invalid-definition` | 3 | Parsing | P2 - Review usage |
| 11 | `invalid-escape-sequence` | 3 | Tokenization | P0 - Improve messages |
| 12 | `duplicate-member` | 2 | Validation | P2 - Good messages |
| 13 | `invalid-datetime` | 2 | Tokenization | P1 - Improve messages |
| 14 | `invalid-length` | 2 | Validation | P1 - Improve messages |
| 15 | `invalid-memberdef` | 2 | Parsing | P2 - Review usage |
| 16 | `invalid-pattern` | 2 | Validation | P0 - Improve messages |
| 17 | `null-not-allowed` | 2 | General | P2 - Good messages |
| 18 | `string-not-closed` | 2 | Tokenization | P0 - Improve messages |
| 19 | `unsupported-number-type` | 2 | Validation | P2 - Review usage |
| 20 | `value-required` | 2 | General | P2 - Good messages |

### By Category and Alphabetical

#### General (4)
- `invalid-type`
- `invalid-value`
- `null-not-allowed`
- `value-required`

#### Tokenization (4)
- `invalid-datetime`
- `invalid-escape-sequence`
- `string-not-closed`
- `unsupported-annotation`

#### Parsing (13)
- `empty-memberdef`
- `expecting-bracket`
- `invalid-definition`
- `invalid-key`
- `invalid-memberdef`
- `invalid-schema`
- `invalid-schema-name` ⚠️ UNUSED
- `schema-missing`
- `schema-not-defined` ⚠️ UNUSED
- `schema-not-found` ⚠️ UNUSED
- `unexpected-positional-member`
- `unexpected-token`
- `variable-not-defined` ⚠️ UNUSED

#### Validation (24)
- `additional-values-not-allowed`
- `duplicate-member`
- `invalid-array` ⚠️ UNUSED
- `invalid-choice`
- `invalid-email`
- `invalid-length`
- `invalid-max-length`
- `invalid-min-length`
- `invalid-object`
- `invalid-pattern`
- `invalid-precision`
- `invalid-range`
- `invalid-scale`
- `invalid-url`
- `not-a-bool`
- `not-a-number` ⚠️ UNUSED
- `not-a-string`
- `not-an-array`
- `not-an-integer` ⚠️ UNUSED
- `out-of-range`
- `unknown-member`
- `unsupported-number-type`

---

## 📝 Error Code Mapping (TypeScript)

### Current Implementation Files

```typescript
// src/errors/general-error-codes.ts
enum GeneralErrorCodes {
  invalidType = 'invalid-type',           // ✅ Used (11x)
  invalidValue = 'invalid-value',         // ✅ Used (1x)
  valueRequired = 'value-required',       // ✅ Used (2x)
  nullNotAllowed = 'null-not-allowed'     // ✅ Used (2x)
}

// src/errors/tokenization-error-codes.ts
enum TokenizationErrorCodes {
  stringNotClosed = 'string-not-closed',           // ✅ Used (2x)
  invalidEscapeSequence = 'invalid-escape-sequence', // ✅ Used (3x)
  unsupportedAnnotation = 'unsupported-annotation',  // ✅ Used (1x)
  invalidDateTime = 'invalid-datetime'               // ✅ Used (2x)
}

// src/errors/parsing-error-codes.ts
enum ParsingErrorCodes {
  unexpectedToken = 'unexpected-token',                     // ✅ Used (6x)
  expectingBracket = 'expecting-bracket',                   // ✅ Used (5x)
  unexpectedPositionalMember = 'unexpected-positional-member', // ✅ Used (1x)
  invalidKey = 'invalid-key',                               // ✅ Used (4x)
  invalidSchema = 'invalid-schema',                         // ✅ Used (6x)
  schemaNotFound = 'schema-not-found',                      // ⚠️ UNUSED
  schemaMissing = 'schema-missing',                         // ✅ Used (1x)
  emptyMemberDef = 'empty-memberdef',                       // ✅ Used (1x)
  invalidDefinition = 'invalid-definition',                 // ✅ Used (3x)
  invalidMemberDef = 'invalid-memberdef',                   // ✅ Used (2x)
  invalidSchemaName = 'invalid-schema-name',                // ⚠️ UNUSED
  variableNotDefined = 'variable-not-defined',              // ⚠️ UNUSED
  schemaNotDefined = 'schema-not-defined'                   // ⚠️ UNUSED
}

// src/errors/validation-error-codes.ts
enum ValidationErrorCodes {
  invalidObject = 'invalid-object',                           // ✅ Used (1x)
  unknownMember = 'unknown-member',                           // ✅ Used (1x)
  duplicateMember = 'duplicate-member',                       // ✅ Used (2x)
  additionalValuesNotAllowed = 'additional-values-not-allowed', // ✅ Used (1x)
  invalidArray = 'invalid-array',                             // ⚠️ UNUSED
  notAnArray = 'not-an-array',                                // ✅ Used (1x)
  notAString = 'not-a-string',                                // ✅ Used (1x)
  invalidEmail = 'invalid-email',                             // ✅ Used (1x)
  invalidUrl = 'invalid-url',                                 // ✅ Used (1x)
  invalidLength = 'invalid-length',                           // ✅ Used (2x)
  invalidMinLength = 'invalid-min-length',                    // ✅ Used (1x)
  invalidMaxLength = 'invalid-max-length',                    // ✅ Used (1x)
  invalidPattern = 'invalid-pattern',                         // ✅ Used (2x)
  unsupportedNumberType = 'unsupported-number-type',          // ✅ Used (2x)
  notANumber = 'not-a-number',                                // ⚠️ UNUSED
  notAnInteger = 'not-an-integer',                            // ⚠️ UNUSED
  outOfRange = 'out-of-range',                                // ✅ Used (4x)
  invalidRange = 'invalid-range',                             // ✅ Used (5x)
  invalidScale = 'invalid-scale',                             // ✅ Used (4x)
  invalidPrecision = 'invalid-precision',                     // ✅ Used (6x)
  notABool = 'not-a-bool',                                    // ✅ Used (1x)
  invalidChoice = 'invalid-choice'                            // ✅ Used (1x)
}
```

---

## 🚀 Action Items

### Immediate (This Week)

1. **Review unused codes** - Team decision on each unused code
2. **Consolidate `invalid-type`** - Replace with specific type errors in validation
3. **Implement `notAnInteger`** - Add integer validation
4. **Remove duplicates** - Delete `schema-not-defined` (use `schema-not-found`)

### Short-term (Next Sprint)

5. **Document all codes** - Add to error catalog with examples
6. **Cross-language audit** - Check Go/other implementations match
7. **Version error codes** - Consider adding numeric prefixes (G-001, T-001, etc.)

### Long-term (Future)

8. **Error code website** - docs.internetobject.org/errors/[code]
9. **Error analytics** - Track which errors users encounter most
10. **Machine-readable catalog** - JSON schema for error codes

---

## 🌍 Cross-Language Implementation Checklist

For each language implementation:

- [ ] **JavaScript/TypeScript** - Reference implementation (this repo)
- [ ] **Go** - Match error codes exactly
- [ ] **Python** - Match error codes exactly
- [ ] **Java** - Match error codes exactly
- [ ] **Rust** - Match error codes exactly
- [ ] **C#** - Match error codes exactly
- [ ] **PHP** - Match error codes exactly
- [ ] **Ruby** - Match error codes exactly

**Requirement:** All implementations must throw identical error codes for identical errors.

---

## 📚 Related Documents

- `ERROR-HANDLING-GUIDELINES.md` - How to write error messages
- `READINESS-TRACKER.md` - Overall project status
- `src/errors/` - Implementation files
- `docs/errors/` - Error catalog (future)

---

**Registry Status:** DRAFT - Awaiting team review and approval
**Version:** 1.0.0
**Maintained by:** Internet Object Core Team
