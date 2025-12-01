# Internet Object Tokenizer Test Suite

This directory contains the **official test specifications** for the Internet Object tokenizer. These specs serve as the definitive reference for implementing tokenizers in any programming language.

## 🎯 Purpose

These test specifications serve as:

1. **Reference Implementation Guide** - Definitive specification for tokenizer behavior
2. **Cross-Platform Compatibility** - Ensures consistent behavior across all language implementations
3. **Regression Testing** - Prevents breaking changes in existing implementations
4. **Documentation** - Documents expected tokenizer behavior with concrete examples

---

## 📁 Directory Structure

```
tokenizer/
├── README.md              # This file (implementation guide)
│
├── # String Types
├── strings-regular.yaml   # Quoted strings ("...", '...')
├── strings-open.yaml      # Unquoted/open strings + fallback cases
├── strings-raw.yaml       # Raw strings (r"...")
├── strings-binary.yaml    # Binary/base64 strings (b"...")
│
├── # Number Types
├── numbers.yaml           # NUMBER tokens (int, float, hex, octal, binary)
├── bigints.yaml           # BIGINT tokens (123n)
├── decimals.yaml          # DECIMAL tokens (123.456m)
│
├── # Other Value Types
├── datetime.yaml          # DATETIME tokens (date, time, datetime)
├── booleans.yaml          # BOOLEAN tokens (true, false, T, F)
├── nulls.yaml             # NULL tokens (null, N)
│
├── # Structural & Syntax
├── braces.yaml            # Structural tokens ({}, [])
├── punctuation.yaml       # Punctuation tokens (comma, colon)
├── operators.yaml         # Operator tokens (~)
├── sections.yaml          # Section separator (---)
│
├── # Whitespace & Comments
├── comments.yaml          # Comment handling (#, /* */)
├── whitespace.yaml        # Whitespace handling
│
├── # Error Handling
└── errors.yaml            # ERROR token generation and recovery
```

---

## 🔤 Token Types Reference

### Complete Token Type Enumeration

Implementations MUST support these exact token type names:

| Token Type | Description | Example Input |
|------------|-------------|---------------|
| `CURLY_OPEN` | Opening curly brace | `{` |
| `CURLY_CLOSE` | Closing curly brace | `}` |
| `BRACKET_OPEN` | Opening square bracket | `[` |
| `BRACKET_CLOSE` | Closing square bracket | `]` |
| `COLON` | Colon separator | `:` |
| `COMMA` | Comma separator | `,` |
| `STRING` | String literal (see subtypes) | `"hello"`, `hello` |
| `BINARY` | Binary/base64 data | `b"SGVsbG8="` |
| `NUMBER` | Numeric literal | `123`, `3.14`, `0xFF` |
| `BIGINT` | Big integer literal | `123n` |
| `DECIMAL` | Decimal literal | `123.456m` |
| `BOOLEAN` | Boolean literal | `true`, `false`, `T`, `F` |
| `NULL` | Null literal | `null`, `N` |
| `DATETIME` | DateTime literal | `dt'2024-01-15T10:30:00'` |
| `SECTION_SEP` | Section separator | `---` |
| `COLLECTION_START` | Collection marker | `~` |
| `ERROR` | Tokenization error | (invalid input) |

### Internal Types (Not Tested)

These types exist in the reference implementation but are NOT tested:

| Token Type | Purpose |
|------------|---------|
| `UNDEFINED` | Internal placeholder |
| `UNKNOWN` | Internal error state |
| `WHITESPACE` | Filtered during tokenization |

### String Subtypes

| SubType | Description | Example |
|---------|-------------|---------|
| `REGULAR_STRING` | Quoted string | `"hello"`, `'world'` |
| `OPEN_STRING` | Unquoted string | `hello` |
| `RAW_STRING` | Raw string (no escape processing) | `r"C:\path"` |

### Number Subtypes

| SubType | Description | Example |
|---------|-------------|---------|
| `HEX` | Hexadecimal | `0xFF` |
| `OCTAL` | Octal | `0o77` |
| `BINARY` | Binary | `0b1010` |

### DateTime Subtypes

| SubType | Description | Example |
|---------|-------------|---------|
| `DATE` | Date only | `d'2024-01-15'` |
| `TIME` | Time only | `t'14:30:00'` |
| (none) | Full datetime | `dt'2024-01-15T14:30:00'` |

### Section Subtypes

| SubType | Description | Example |
|---------|-------------|---------|
| `SECTION_NAME` | Named section | `--- mySection` |
| `SECTION_SCHEMA` | Schema reference | `--- $mySchema` |

---

## 📋 Test Case Format

### File Structure

Each test file follows this YAML format:

```yaml
_meta:
  suite: tokenizer
  category: category_name
  version: "1.0.0"
  description: "Description of this test file"

test_group:
  name: group_name
  description: "Description of tests"
  cases:
    - name: test_case_name
      input: "input string"
      expected:
        type: TOKEN_TYPE
        subType: SUB_TYPE      # Optional
        value: expected_value
        token: "original text"
```

### Token Properties

Each expected token includes:

| Property | Required | Description |
|----------|----------|-------------|
| `type` | ✅ Yes | Token type (e.g., `STRING`, `NUMBER`) |
| `subType` | ❌ No | Token subtype (e.g., `REGULAR_STRING`, `HEX`) |
| `value` | ✅ Yes | Parsed/processed value |
| `token` | ❌ No | Original source text |

### Multiple Tokens

When input produces multiple tokens:

```yaml
- name: key_value_pair
  input: "key:value"
  expected:
    - type: STRING
      subType: OPEN_STRING
      value: "key"
    - type: COLON
      token: ":"
    - type: STRING
      subType: OPEN_STRING
      value: "value"
```

### Error Cases

For expected errors, use `expected_error` instead of `expected`:

```yaml
- name: unclosed_string
  input: '"hello'
  expected_error:
    code: stringNotClosed
    message: "String not closed"
```

---

## ⚠️ Error Handling

### Design Philosophy: Lenient Tokenizer

The Internet Object tokenizer is **intentionally lenient**. Instead of throwing exceptions for invalid input, it:

1. Creates ERROR tokens for unrecoverable syntax errors
2. Falls back to OPEN_STRING for invalid literals
3. Continues tokenizing after errors (error recovery)

This design allows the **parser** (not tokenizer) to handle semantic validation.

### Valid Error Codes

These are the **ONLY** error codes the tokenizer produces:

| Error Code | Description | Example Trigger |
|------------|-------------|-----------------|
| `stringNotClosed` | Unterminated string literal | `"hello` |
| `invalidEscapeSequence` | Invalid escape in string | `"\q"` (if strict) |
| `unsupportedAnnotation` | Unknown string annotation | `x"hello"` |
| `invalidDateTime` | Invalid date/time format | `d'2024-13-45'` |
| `schemaMissing` | Missing schema after colon | `--- name:` |

### ERROR Token Structure

```yaml
type: ERROR
token: "original text"
value:
  __error: true
  errorCode: stringNotClosed
  message: "Human readable description"
```

### What Does NOT Produce Errors

The tokenizer does **NOT** throw errors for:

| Input | Result | Reason |
|-------|--------|--------|
| `123abc` | OPEN_STRING | Invalid number → fallback |
| `True` | OPEN_STRING | Wrong case → fallback |
| `Null` | OPEN_STRING | Wrong case → fallback |
| `nan` | OPEN_STRING | Wrong case (should be `NaN`) |
| `inf` | OPEN_STRING | Wrong case (should be `Inf`) |
| `0x12G3` | OPEN_STRING | Invalid hex → fallback |
| `{}` mismatch | Individual tokens | Parser validates matching |

---

## ✅ DOs and ❌ DON'Ts for Implementers

### ✅ DO

1. **Match token types exactly** - Use `CURLY_OPEN`, not `OPEN_BRACE` or `LBRACE`
2. **Support all escape sequences** - `\n`, `\t`, `\r`, `\\`, `\"`, `\'`, `\b`, `\f`, `\uXXXX`, `\xXX`
3. **Preserve original token text** - Store the source text in the `token` field
4. **Handle Unicode properly** - Support full Unicode in strings and identifiers
5. **Create ERROR tokens** - Don't throw exceptions; create ERROR tokens for recovery
6. **Fallback to OPEN_STRING** - Invalid literals become strings, not errors
7. **Case-sensitive literals** - `true` ≠ `True` ≠ `TRUE`
8. **Support number bases** - Hex (`0x`), octal (`0o`), binary (`0b`)
9. **Support special numbers** - `Inf`, `+Inf`, `-Inf`, `NaN`

### ❌ DON'T

1. **Don't support parentheses** - `()` are NOT structural tokens
2. **Don't support semicolon** - `;` is NOT a separator token
3. **Don't tokenize operators** - Only `~` is a token; `*`, `@`, `...` become OPEN_STRING
4. **Don't throw exceptions** - Create ERROR tokens instead
5. **Don't validate semantics** - Leave brace matching, type checking to parser
6. **Don't modify whitespace in strings** - Preserve exactly as written
7. **Don't support nested comments** - `/* /* */ */` behavior is implementation-defined
8. **Don't case-normalize** - `True` → OPEN_STRING, not BOOLEAN

---

## 🔢 Literal Formats

### Booleans

```
true  → BOOLEAN (true)
false → BOOLEAN (false)
T     → BOOLEAN (true)
F     → BOOLEAN (false)
```

**Invalid** (become OPEN_STRING): `True`, `False`, `TRUE`, `FALSE`

### Null

```
null → NULL
N    → NULL
```

**Invalid** (become OPEN_STRING): `Null`, `NULL`, `nil`, `none`, `None`

### Numbers

```
123       → NUMBER (integer)
-123      → NUMBER (negative integer)
123.456   → NUMBER (float)
.5        → NUMBER (0.5)
1.23e10   → NUMBER (scientific)
1.23E-10  → NUMBER (scientific)
0xFF      → NUMBER subType:HEX (255)
0o77      → NUMBER subType:OCTAL (63)
0b1010    → NUMBER subType:BINARY (10)
Inf       → NUMBER (Infinity)
+Inf      → NUMBER (Infinity)
-Inf      → NUMBER (-Infinity)
NaN       → NUMBER (NaN)
```

**Invalid** (become OPEN_STRING): `123abc`, `00123`, `123.`, `0x12G3`

### BigInts

```
123n    → BIGINT ("123")
-123n   → BIGINT ("-123")
0xFFn   → BIGINT subType:HEX ("255")
```

### Decimals

```
123.456m → DECIMAL ("123.456")
123m     → DECIMAL ("123")
```

### DateTime

```
d'2024-01-15'              → DATETIME subType:DATE
t'14:30:00'                → DATETIME subType:TIME
t'14:30:00.123'            → DATETIME subType:TIME
dt'2024-01-15T14:30:00'    → DATETIME
dt'2024-01-15T14:30:00Z'   → DATETIME
dt'2024-01-15T14:30:00+05:30' → DATETIME
```

### Strings

```
"hello"       → STRING subType:REGULAR_STRING
'hello'       → STRING subType:REGULAR_STRING
hello         → STRING subType:OPEN_STRING
r"C:\path"    → STRING subType:RAW_STRING
b"SGVsbG8="   → BINARY
```

---

## 🧪 Implementation Testing

### Recommended Test Order

1. **Punctuation** (`punctuation.yaml`) - Basic structural tokens
2. **Braces** (`braces.yaml`) - Brackets and curly braces
3. **Booleans** (`booleans.yaml`) - Simple literals
4. **Nulls** (`nulls.yaml`) - Null literals
5. **Numbers** (`numbers.yaml`) - Numeric parsing
6. **Strings Regular** (`strings-regular.yaml`) - Quoted strings
7. **Strings Open** (`strings-open.yaml`) - Open strings + fallbacks
8. **Strings Raw** (`strings-raw.yaml`) - Raw strings
9. **Strings Binary** (`strings-binary.yaml`) - Binary data
10. **BigInts** (`bigints.yaml`) - Big integers
11. **Decimals** (`decimals.yaml`) - Decimal numbers
12. **DateTime** (`datetime.yaml`) - Date/time literals
13. **Comments** (`comments.yaml`) - Comment handling
14. **Whitespace** (`whitespace.yaml`) - Whitespace handling
15. **Operators** (`operators.yaml`) - Special operators
16. **Sections** (`sections.yaml`) - Section separators
17. **Errors** (`errors.yaml`) - Error handling

### Test Runner Example (Python)

```python
import yaml
from pathlib import Path

def load_test_suite(directory: str):
    """Load all test cases from YAML files."""
    tests = {}
    for file in Path(directory).glob("*.yaml"):
        with open(file) as f:
            data = yaml.safe_load(f)
            # Skip metadata
            tests[file.stem] = {
                k: v for k, v in data.items()
                if not k.startswith('_')
            }
    return tests

def run_tokenizer_tests(tokenizer, test_suite):
    """Run all test cases against a tokenizer."""
    results = {"passed": 0, "failed": 0, "errors": []}

    for file_name, categories in test_suite.items():
        for category_name, category in categories.items():
            if not isinstance(category, dict) or 'cases' not in category:
                continue

            for case in category['cases']:
                try:
                    tokens = tokenizer.tokenize(case['input'])

                    if 'expected_error' in case:
                        # Should have produced an error
                        if not has_error_token(tokens, case['expected_error']['code']):
                            results['failed'] += 1
                            results['errors'].append({
                                'file': file_name,
                                'case': case['name'],
                                'expected': f"ERROR: {case['expected_error']['code']}",
                                'got': tokens
                            })
                        else:
                            results['passed'] += 1
                    else:
                        # Should match expected tokens
                        if matches_expected(tokens, case['expected']):
                            results['passed'] += 1
                        else:
                            results['failed'] += 1
                            results['errors'].append({
                                'file': file_name,
                                'case': case['name'],
                                'expected': case['expected'],
                                'got': tokens
                            })
                except Exception as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'file': file_name,
                        'case': case['name'],
                        'exception': str(e)
                    })

    return results
```

### Test Runner Example (Go)

```go
package tokenizer_test

import (
    "os"
    "path/filepath"
    "testing"

    "gopkg.in/yaml.v3"
)

type TestCase struct {
    Name          string                 `yaml:"name"`
    Input         string                 `yaml:"input"`
    Expected      interface{}            `yaml:"expected"`
    ExpectedError *ExpectedError         `yaml:"expected_error"`
}

type ExpectedError struct {
    Code    string `yaml:"code"`
    Message string `yaml:"message"`
}

func TestTokenizer(t *testing.T) {
    files, _ := filepath.Glob("testcases/tokenizer/*.yaml")

    for _, file := range files {
        data, _ := os.ReadFile(file)
        var suite map[string]interface{}
        yaml.Unmarshal(data, &suite)

        for categoryName, category := range suite {
            if categoryName == "_meta" {
                continue
            }

            categoryMap := category.(map[string]interface{})
            cases := categoryMap["cases"].([]interface{})

            for _, c := range cases {
                testCase := parseTestCase(c)
                t.Run(testCase.Name, func(t *testing.T) {
                    tokens := Tokenize(testCase.Input)
                    // Assert tokens match expected...
                })
            }
        }
    }
}
```

---

## 📝 Notes for Language Porters

### String Handling

1. **Escape Sequences**: Process in REGULAR_STRING, preserve in RAW_STRING
2. **Unicode**: Support `\uXXXX` (4 hex digits) and `\xXX` (2 hex digits)
3. **Multiline**: Strings cannot span lines (produces `stringNotClosed` error)
4. **Quote Matching**: `"..."` and `'...'` are equivalent

### Number Handling

1. **Leading Zeros**: `00123` is invalid (becomes OPEN_STRING)
2. **Leading Dot**: `.5` is valid (equals `0.5`)
3. **Trailing Dot**: `123.` is invalid (becomes OPEN_STRING)
4. **Exponent**: Both `e` and `E` are valid
5. **Sign in Exponent**: Both `e+10` and `e-10` are valid

### BigInt/Decimal Storage

1. **BigInt**: Store as string to preserve precision beyond native int limits
2. **Decimal**: Store as string to preserve exact decimal representation
3. **Don't Parse**: Keep the numeric string; let the application handle conversion

### Section Handling

1. **SECTION_SEP**: Always `---` (exactly three dashes)
2. **SECTION_NAME**: Identifier after `---` (without `$`)
3. **SECTION_SCHEMA**: Identifier starting with `$` after `---`

### Unicode Whitespace Support

Internet Object supports comprehensive Unicode whitespace, unlike many other formats.

**Recognized Whitespace Characters:**

| Range | Code Points | Description |
|-------|-------------|-------------|
| ASCII Control | U+0000 to U+0020 | All control chars including space, tab, CR, LF |
| NBSP | U+00A0 | No-Break Space |
| Em/En Spaces | U+2000 to U+200A | Typographic spaces (11 characters) |
| Ogham | U+1680 | Ogham Space Mark |
| Separators | U+2028, U+2029 | Line and Paragraph Separator |
| Special | U+202F, U+205F, U+3000 | Narrow NBSP, Math Space, Ideographic Space |
| BOM | U+FEFF | Byte Order Mark |

**NOT Whitespace:**
- U+200B Zero Width Space (becomes part of strings)
- U+200C/U+200D Zero Width (Non-)Joiner
- U+2060 Word Joiner
- Anything above U+FEFF

**Algorithm for Implementers:**
```
function isWhitespace(code):
  if code <= 0x20: return true           // ASCII control + space
  if code == 0x00A0: return true         // NBSP
  if code >= 0x2000 && code <= 0x200A:   // Em/en spaces
    return true
  if code in {0x1680, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF}:
    return true
  return false
```

### Position Tracking (Optional but Recommended)

Consider tracking source positions for error reporting:

```typescript
interface TokenPosition {
    line: number;      // 1-based
    column: number;    // 1-based
    offset: number;    // 0-based byte offset
}
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12 | Initial comprehensive test suite |

---

## 📚 Related Resources

- [Internet Object Specification](https://internetobject.org)
- [Reference Implementation (TypeScript)](../../src/parser/tokenizer/)
- [Parser Test Cases](../parser/)
