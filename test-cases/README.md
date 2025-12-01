# Internet Object Cross-Platform Test Suite

## Overview

This repository contains platform-independent test cases for Internet Object parsers and serializers. These test suites serve as a **canonical reference** that parser implementations in any programming language can use to ensure compatibility and correctness across the Internet Object ecosystem.

## Objectives

### 1. **Cross-Platform Compatibility**
Ensure that Internet Object parsers implemented in different programming languages (JavaScript, Go, Python, Rust, Java, C#, etc.) produce identical results for the same input.

### 2. **Specification Compliance**
Provide a machine-readable representation of the Internet Object specification that can be automatically validated against any implementation.

### 3. **Regression Prevention**
Enable parser developers to catch regressions early by running standardized test suites during development and CI/CD pipelines.

### 4. **Implementation Guidance**
Serve as practical documentation for developers implementing new Internet Object parsers, with clear input/output expectations.

### 5. **Edge Case Coverage**
Document and test edge cases, boundary conditions, and error scenarios that might be overlooked in individual implementations.

---

## Directory Structure

```
test-cases/
├── README.md                 # This file
├── manifest.yaml             # Index of all test suites (optional)
├── tokenizer/                # Tokenizer/Lexer test cases
│   ├── README.md
│   ├── strings.yaml
│   ├── numbers.yaml
│   ├── datetime.yaml
│   ├── symbols.yaml
│   └── literals.yaml
├── parser/                   # Parser test cases (planned)
│   ├── objects.yaml
│   ├── arrays.yaml
│   ├── collections.yaml
│   └── sections.yaml
├── schema/                   # Schema validation test cases (planned)
│   ├── types.yaml
│   ├── constraints.yaml
│   └── definitions.yaml
├── serializer/               # Serialization test cases (planned)
│   ├── stringify.yaml
│   └── formatting.yaml
└── index.yaml                  # Master index of all test suites (planned)
```

---

## Test Case Format

All test files use YAML format for maximum portability and readability. Each file follows a consistent schema:

### File Header (Recommended)

```yaml
_meta:
  suite: tokenizer           # Test suite category
  category: strings          # Specific category within suite
  version: "1.0.0"           # Schema version for this test file
  description: "String token test cases"
```

### Test Category Structure

```yaml
category_name:
  name: category_name
  description: "Human-readable description of the test category"
  cases:
    - id: "CAT-001"          # Optional unique identifier
      name: test_case_name   # Required: descriptive name
      description: "..."     # Optional: detailed description
      input: "input string"  # Required: the input to tokenize/parse
      expected:              # Required: expected output
        type: TOKEN_TYPE
        subType: SUB_TYPE    # Optional
        value: expected_value
        token: "original token"
```

### Error Test Cases

```yaml
error_cases:
  name: error_category_name
  description: "Tests that should produce specific errors"
  cases:
    - name: error_case_name
      input: "invalid input"
      expected_error:
        code: ERROR_CODE           # Machine-readable error code
        message: "Error message"   # Human-readable message (informational)
```

---

## Guidelines for Test Case Authors

### General Principles

1. **Atomicity**: Each test case should test ONE specific behavior or feature.

2. **Independence**: Test cases should not depend on each other or require specific execution order.

3. **Determinism**: Test cases must produce the same result every time, regardless of platform or locale.

4. **Clarity**: Use descriptive names that indicate what is being tested.

5. **Completeness**: Include both positive (valid input) and negative (error) test cases.

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| File names | `lowercase_with_underscores.yaml` | `datetime.yaml` |
| Category names | `snake_case` | `regular_strings` |
| Test case names | `snake_case` | `basic_double_quoted` |
| Token types | `UPPER_CASE` | `STRING`, `NUMBER` |
| Error codes | `camelCase` | `stringNotClosed` |

### Value Representation

To ensure cross-platform compatibility, follow these conventions:

| Data Type | Representation | Example |
|-----------|----------------|---------|
| Strings | Native YAML strings | `value: "Hello World"` |
| Numbers | Native YAML numbers | `value: 123.456` |
| Integers | Native YAML integers | `value: 42` |
| Booleans | Native YAML booleans | `value: true` |
| Null | Native YAML null | `value: null` |
| BigInt | String representation | `value: "12345678901234567890"` |
| Decimal | String representation | `value: "123.456"` |
| Binary/Bytes | Base64 encoded | `value: { encoding: base64, data: "SGVsbG8=" }` |
| Infinity | String keyword | `value: Infinity` or `value: -Infinity` |
| NaN | String keyword | `value: NaN` |
| DateTime | ISO 8601 string | `value: "2024-03-20T14:30:00.000Z"` |

### Handling Platform-Specific Values

Some values may have different representations across platforms. Use these strategies:

```yaml
# For floating-point precision issues, specify tolerance
- name: float_precision
  input: "0.1"
  expected:
    type: NUMBER
    value: 0.1
    tolerance: 0.0001  # Optional: for float comparison

# For binary data, always use base64
- name: binary_data
  input: 'b"SGVsbG8="'
  expected:
    type: BINARY
    value:
      encoding: base64
      data: "SGVsbG8="
```

### Error Case Guidelines

1. **Use consistent error codes** across all test files
2. **Error messages are informational** - implementations may vary in exact wording
3. **Focus on the error code** for automated validation
4. **Document expected error location** when relevant:

```yaml
- name: unterminated_string
  input: '"hello'
  expected_error:
    code: stringNotClosed
    message: "String not closed"
    position:              # Optional but helpful
      line: 1
      column: 6
```

---

## Guidelines for Parser Implementers

### Loading Test Cases

```python
# Python example
import yaml

def load_test_suite(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)
```

```typescript
// TypeScript example
import * as yaml from 'js-yaml';
import * as fs from 'fs';

function loadTestSuite(filePath: string): TestSuite {
    const content = fs.readFileSync(filePath, 'utf8');
    return yaml.load(content) as TestSuite;
}
```

```go
// Go example
import "gopkg.in/yaml.v3"

func LoadTestSuite(filePath string) (*TestSuite, error) {
    data, err := os.ReadFile(filePath)
    if err != nil {
        return nil, err
    }
    var suite TestSuite
    err = yaml.Unmarshal(data, &suite)
    return &suite, err
}
```

### Running Tests

1. **Iterate through categories** in each test file
2. **Skip entries starting with `_`** (metadata)
3. **For each test case**:
   - Parse/tokenize the `input`
   - Compare result with `expected` or verify `expected_error`
4. **Report failures** with test case name and details

### Comparing Results

- **Exact match** for strings, booleans, null
- **Numeric tolerance** for floating-point values (if `tolerance` specified)
- **Error code match** for error cases (ignore message differences)
- **Structural equality** for complex objects/arrays

---

## Contributing New Test Cases

### Before Adding Tests

1. Ensure the test case is not already covered
2. Verify the expected behavior matches the Internet Object specification
3. Test with at least one reference implementation

### Submission Checklist

- [ ] Test case has a descriptive `name`
- [ ] `input` is valid YAML (properly escaped)
- [ ] `expected` or `expected_error` is complete
- [ ] No duplicate test cases
- [ ] Edge cases are documented with comments
- [ ] Error cases use existing error codes (or propose new ones)

### Adding New Error Codes

When adding a new error code:

1. Check if an existing code covers the scenario
2. Use `camelCase` naming
3. Document the code in the relevant README
4. Use the code consistently across test files

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-12-01 | Initial test suite with tokenizer tests |

---

## References

- [Internet Object Specification](https://internetobject.org)
- [Internet Object GitHub](https://github.com/maniartech/InternetObject-js)

---

## License

These test cases are part of the Internet Object project and are released under the same license as the main project.
