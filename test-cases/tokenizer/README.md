# Internet Object Tokenizer Test Suite

This directory contains test cases for the Internet Object tokenizer. The test cases are organized by token type (one file per token type) and written in YAML format for easy parsing and cross-platform compatibility.

## Directory Structure

```
tokenizer/
├── README.md              # This file
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
├── braces.yaml            # Structural tokens ({}, [], ())
├── punctuation.yaml       # Punctuation tokens (comma, colon)
├── operators.yaml         # Operator tokens (*, ~, @, ...)
├── sections.yaml          # Section separator (---)
│
├── # Whitespace & Comments
├── comments.yaml          # Comment handling (#, /* */)
└── whitespace.yaml        # Whitespace handling (spaces, tabs, newlines)
```

## Test Case Format

Each test file follows a consistent YAML format with a metadata header:

```yaml
_meta:
  suite: tokenizer
  category: category_name
  version: "1.0.0"
  description: "Description of this test file"

test_category:
  name: category_name
  description: "Description of the test category"
  cases:
    - name: test_case_name
      input: "input string"
      expected:
        type: TOKEN_TYPE
        subType: SUB_TYPE  # Optional
        value: expected_value
        token: "original token"

error_cases:
  name: error_category_name
  description: "Description of error cases"
  cases:
    - name: error_case_name
      input: "invalid input"
      expected_error:
        code: ERROR_CODE
        message: "Error message"
```

## Test Files by Token Type

| File | Token Type(s) | Description |
|------|---------------|-------------|
| `strings-regular.yaml` | STRING (REGULAR_STRING) | Double and single quoted strings |
| `strings-open.yaml` | STRING (OPEN_STRING) | Unquoted strings + invalid literal fallbacks |
| `strings-raw.yaml` | STRING (RAW_STRING) | Raw strings preserving escapes |
| `strings-binary.yaml` | BINARY | Base64-encoded binary data |
| `numbers.yaml` | NUMBER | Integers, floats, hex, octal, binary |
| `bigints.yaml` | BIGINT | Arbitrary-precision integers |
| `decimals.yaml` | DECIMAL | Arbitrary-precision decimals |
| `datetime.yaml` | DATETIME | Date, time, and datetime literals |
| `booleans.yaml` | BOOLEAN | true, false, T, F |
| `nulls.yaml` | NULL | null, N |
| `comments.yaml` | (filtered) | Comment handling with # and /* */ |
| `whitespace.yaml` | (filtered) | Space, tab, newline handling |
| `braces.yaml` | OPEN_BRACE, CLOSE_BRACE, etc. | Structural tokens |
| `punctuation.yaml` | COMMA, COLON | Punctuation tokens |
| `operators.yaml` | SPREAD, ASTERISK, TILDE, AT | Operator tokens |
| `sections.yaml` | SECTION_SEP | Section separators |

## Token Properties

Each token in the expected output includes:

- `type`: The token type (e.g., STRING, NUMBER, DATETIME)
- `subType`: Optional subtype (e.g., REGULAR_STRING, HEX)
- `value`: The parsed value
- `token`: The original token text

## Error Codes

The Internet Object tokenizer is **intentionally lenient by design**. Most invalid inputs become valid OPEN_STRING tokens rather than throwing errors. This allows the parser (not the tokenizer) to handle semantic validation.

### Tokenization Error Codes

These are the **ONLY** valid error codes for tokenizer test cases (from `tokenization-error-codes.ts`):

| Code (YAML test) | Code (Source) | Description |
|------------------|---------------|-------------|
| `stringNotClosed` | `string-not-closed` | Unterminated string literal |
| `invalidEscapeSequence` | `invalid-escape-sequence` | Invalid escape sequence in string |
| `unsupportedAnnotation` | `unsupported-annotation` | Unsupported string/type annotation prefix |
| `invalidDateTime` | `invalid-datetime` | Invalid date, time, or datetime format |

> **Important:** Test YAML files use camelCase for error codes (`stringNotClosed`), while the source code uses kebab-case (`string-not-closed`). Implementations should normalize these when comparing.

### Lenient Tokenizer Design

The tokenizer does NOT throw errors for:
- Invalid number formats (e.g., `123abc`, `0x12G3`) → become OPEN_STRING
- Invalid boolean-like values (e.g., `True`, `FALSE`) → become OPEN_STRING
- Invalid null-like values (e.g., `Null`, `NULL`) → become OPEN_STRING
- Invalid special numbers (e.g., `nan`, `inf`) → become OPEN_STRING
- Mismatched braces → individual brace tokens (parser validates)
- Unusual whitespace characters → separators or open strings
- Section-related semantic errors → parser handles these

### Error Case Format

```yaml
error_cases:
  name: error_category_name
  description: "Tests that should produce specific errors"
  cases:
    - name: error_case_name
      input: "invalid input"
      expected_error:
        code: stringNotClosed    # Must be one of the 4 tokenizer errors
        message: "Human readable message (informational)"
```

> **Note:** The `message` field is informational only. Cross-platform implementations should validate against the `code` field, as exact error messages may vary between implementations.

## Using the Test Suite

### Python Example
```python
import yaml

def load_test_cases(file_path):
    with open(file_path, 'r') as f:
        return yaml.safe_load(f)

# Load and run tests
test_cases = load_test_cases('tokenizer/strings.yaml')
for category in test_cases.values():
    for case in category['cases']:
        # Run test case
        result = tokenizer.tokenize(case['input'])
        assert result == case['expected']
```

### JavaScript/TypeScript Example
```typescript
import * as yaml from 'js-yaml';
import * as fs from 'fs';

interface Token {
    type: string;
    subType?: string;
    value: any;
    token: string;
}

interface TestCase {
    name: string;
    input: string;
    expected: Token | Token[];
    expected_error?: {
        code: string;
        message: string;
    };
}

function loadTestCases(filePath: string): Record<string, TestCase[]> {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content) as Record<string, TestCase[]>;
}

// Load and run tests
const testCases = loadTestCases('tokenizer/strings.yaml');
for (const [category, cases] of Object.entries(testCases)) {
    for (const testCase of cases) {
        // Run test case
        const result = tokenizer.tokenize(testCase.input);
        assert.deepEqual(result, testCase.expected);
    }
}
```

## Adding New Tests

1. Choose the appropriate YAML file based on token type
2. Add a new test case following the format
3. Include both success and error cases
4. Add descriptive names and comments
5. Ensure test cases are comprehensive

## Best Practices

1. Keep test cases focused and atomic
2. Include edge cases and error conditions
3. Use descriptive names for test cases
4. Document any special requirements
5. Maintain consistent formatting
6. Include comments for complex cases