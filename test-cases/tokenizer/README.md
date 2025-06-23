# Internet Object Tokenizer Test Suite

This directory contains test cases for the Internet Object tokenizer. The test cases are organized by token type and written in YAML format for easy parsing and maintenance.

## Directory Structure

```
tokenizer/
├── README.md           # This file
├── strings.yaml        # String token tests
├── numbers.yaml        # Number token tests
├── datetime.yaml       # DateTime token tests
├── symbols.yaml        # Symbol and operator tests
└── literals.yaml       # Literal token tests
```

## Test Case Format

Each test file follows a consistent YAML format:

```yaml
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
    # ... more test cases ...

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

## Test Categories

### 1. String Tests (`strings.yaml`)
- Regular strings (quoted)
- Open strings (unquoted)
- Raw strings (r-prefixed)
- Byte strings (b-prefixed)
- String error cases

### 2. Number Tests (`numbers.yaml`)
- Decimal numbers
- Special numbers (Inf, NaN)
- Hexadecimal numbers
- Octal numbers
- Binary numbers
- BigInt numbers
- Decimal type numbers
- Number error cases

### 3. DateTime Tests (`datetime.yaml`)
- Date strings (d-prefixed)
- Time strings (t-prefixed)
- DateTime strings (dt-prefixed)
- DateTime error cases

### 4. Symbol Tests (`symbols.yaml`)
- Special symbols
- Operators
- Section separators
- Schema tokens
- Symbol error cases

### 5. Literals (`literals.yaml`)
- Boolean literals (true, false, t, f)
- Null literals (null, n)
- Comments (single-line)
- Whitespace handling
- Complex combinations (objects, arrays, sections)
- Error cases (invalid literals)

## Token Properties

Each token in the expected output includes:

- `type`: The token type (e.g., STRING, NUMBER, DATETIME)
- `subType`: Optional subtype (e.g., REGULAR_STRING, HEX)
- `value`: The parsed value
- `token`: The original token text

## Error Cases

Error cases include:
- `code`: Error code
- `message`: Error message

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