# Internet Object Tokenization Specification

## Overview

This document defines the complete tokenization specification for Internet Object format. It provides language-agnostic behavioral contracts that all implementations must follow to ensure identical tokenization behavior across different programming languages and platforms.

## Token Type Enumeration

### Core Token Types

All Internet Object implementations MUST support the following token types:

```
STRING              - String literals (quoted and unquoted)
NUMBER              - Numeric literals (integers, floats, scientific notation)
BIGINT              - Big integer literals (suffixed with 'n')
DECIMAL             - High-precision decimal literals (suffixed with 'm')
BOOLEAN             - Boolean literals (true, false, T, F)
NULL                - Null literal (null, N)
BINARY              - Binary data (base64-encoded, b-prefixed)
DATETIME            - Date/time literals (ISO 8601, dt/d/t-prefixed)
CURLY_OPEN          - Opening curly brace '{'
CURLY_CLOSE         - Closing curly brace '}'
BRACKET_OPEN        - Opening square bracket '['
BRACKET_CLOSE       - Closing square bracket ']'
COMMA               - Comma separator ','
COLON               - Colon separator ':'
COLLECTION_START    - Collection start marker '~'
SECTION_SEP         - Section separator '---'
WHITESPACE          - Whitespace characters (spaces, tabs, newlines)
ERROR               - Error token for invalid input
UNKNOWN             - Unknown/unrecognized token
```

### Token Subtypes

Tokens MAY have subtypes to provide additional semantic information:

```
STRING subtypes:
  - REGULAR_STRING    - Quoted strings with escape sequences
  - OPEN_STRING       - Unquoted strings
  - RAW_STRING        - Raw strings (r-prefixed)

NUMBER subtypes:
  - HEX               - Hexadecimal numbers (0x prefix)
  - OCTAL             - Octal numbers (0o prefix)
  - BINARY            - Binary numbers (0b prefix)

BINARY subtypes:
  - BINARY_STRING     - Base64-encoded binary data

DATETIME subtypes:
  - DATETIME          - Full datetime (dt-prefixed)
  - DATE              - Date only (d-prefixed)
  - TIME              - Time only (t-prefixed)

SECTION subtypes:
  - SECTION_NAME      - Section name identifier
  - SECTION_SCHEMA    - Schema reference ($-prefixed)
```

## Tokenization State Machine

### State Definitions

The tokenizer operates as a finite state machine with the following states:

```
INITIAL             - Starting state, expecting any token
IN_STRING           - Inside a quoted string literal
IN_RAW_STRING       - Inside a raw string literal
IN_BINARY_STRING    - Inside a binary string literal
IN_DATETIME_STRING  - Inside a datetime string literal
IN_NUMBER           - Processing a numeric literal
IN_IDENTIFIER       - Processing an unquoted identifier/open string
IN_COMMENT          - Inside a single-line comment
IN_SECTION_HEADER   - Processing section separator and metadata
ERROR_RECOVERY      - Recovering from tokenization error
```

### State Transitions

#### From INITIAL State

```
Character(s)         -> Next State        -> Action
'"' or "'"          -> IN_STRING          -> Begin string tokenization
'r"' or "r'"        -> IN_RAW_STRING      -> Begin raw string tokenization
'b"' or "b'"        -> IN_BINARY_STRING   -> Begin binary string tokenization
'd"', 't"', 'dt"'   -> IN_DATETIME_STRING -> Begin datetime string tokenization
[0-9], '+', '-', '.' -> IN_NUMBER         -> Begin number tokenization
'{'                 -> INITIAL            -> Emit CURLY_OPEN token
'}'                 -> INITIAL            -> Emit CURLY_CLOSE token
'['                 -> INITIAL            -> Emit BRACKET_OPEN token
']'                 -> INITIAL            -> Emit BRACKET_CLOSE token
','                 -> INITIAL            -> Emit COMMA token
':'                 -> INITIAL            -> Emit COLON token
'~'                 -> INITIAL            -> Emit COLLECTION_START token
'---'               -> IN_SECTION_HEADER  -> Begin section processing
'#'                 -> IN_COMMENT         -> Begin comment processing
[whitespace]        -> INITIAL            -> Skip whitespace
[identifier_start]  -> IN_IDENTIFIER      -> Begin identifier tokenization
[other]             -> ERROR_RECOVERY     -> Handle invalid character
```

#### From IN_STRING State

```
Character(s)         -> Next State        -> Action
'"' or "'" (matching) -> INITIAL          -> Emit STRING token
'\\'                -> IN_STRING          -> Process escape sequence
[any other]         -> IN_STRING          -> Accumulate character
EOF                 -> ERROR_RECOVERY     -> Emit string-not-closed error
```

#### From IN_NUMBER State

```
Character(s)         -> Next State        -> Action
[0-9]               -> IN_NUMBER          -> Accumulate digit
'.'                 -> IN_NUMBER          -> Process decimal point
'e', 'E'            -> IN_NUMBER          -> Process exponent
'n'                 -> INITIAL            -> Emit BIGINT token (if valid) or switch to open string
'm'                 -> INITIAL            -> Emit DECIMAL token (if valid) or switch to open string
[whitespace]        -> INITIAL            -> Validate and emit NUMBER or IDENTIFIER token
[delimiter]         -> INITIAL            -> Validate and emit NUMBER or IDENTIFIER token, reprocess char
[identifier_char]   -> IN_IDENTIFIER      -> Switch to open string mode
[other]             -> ERROR_RECOVERY     -> Handle invalid character

Number Validation Strategy:
- Attempt to parse as valid number format
- If number format is invalid, treat entire sequence as open string
- Invalid formats: trailing decimal (123.), incomplete exponent (123e), hex floats (0x123.45)
- Emit IDENTIFIER token for invalid number sequences
- No error tokens for malformed numbers - graceful fallback to open strings
```

## Character Handling Specifications

### UTF-8 Processing

All implementations MUST:

1. **Accept UTF-8 Input**: Process input as UTF-8 encoded text
2. **Normalize Unicode**: Apply NFC normalization to string values containing escape sequences
3. **Handle Surrogates**: Properly process Unicode surrogate pairs in escape sequences
4. **Preserve BOM**: Handle Byte Order Mark (U+FEFF) as whitespace if present

### Whitespace Rules

Whitespace characters are defined as:

```
ASCII Whitespace:
  - U+0009 (TAB)
  - U+000A (LF)
  - U+000B (VT)
  - U+000C (FF)
  - U+000D (CR)
  - U+0020 (SPACE)
  - U+0000-U+0020 (All control characters)

Extended Whitespace:
  - U+00A0 (Non-breaking space)
  - U+1680 (Ogham space mark)
  - U+2000-U+200A (Various em/en spaces)
  - U+2028 (Line separator)
  - U+2029 (Paragraph separator)
  - U+202F (Narrow no-break space)
  - U+205F (Medium mathematical space)
  - U+3000 (Ideographic space)
  - U+FEFF (Zero width no-break space / BOM)
```

**Whitespace Processing Rules:**

1. **Normalization**: Convert `\r\n` and `\r` to `\n`
2. **Skipping**: Skip whitespace between tokens
3. **Preservation**: Preserve whitespace within string literals
4. **Compression**: Compress multiple whitespace characters to single space in open strings

### Escape Sequence Processing

#### Standard Escape Sequences

All implementations MUST support these escape sequences in quoted strings:

```
Sequence    -> Character       -> Unicode
\\          -> Backslash       -> U+005C
\"          -> Double quote    -> U+0022
\'          -> Single quote    -> U+0027
\n          -> Line feed       -> U+000A
\r          -> Carriage return -> U+000D
\t          -> Tab             -> U+0009
\b          -> Backspace       -> U+0008
\f          -> Form feed       -> U+000C
\uXXXX      -> Unicode char    -> U+XXXX (4 hex digits)
\xXX        -> Byte value      -> U+00XX (2 hex digits)
```

#### Escape Sequence Validation

1. **Unicode Escapes**: `\uXXXX` MUST have exactly 4 hexadecimal digits
2. **Byte Escapes**: `\xXX` MUST have exactly 2 hexadecimal digits
3. **Invalid Escapes**: Unrecognized escape sequences SHOULD be treated as literal characters (without backslash)
4. **Error Handling**: Invalid escape sequences MUST generate appropriate error tokens

## Token Boundary Detection

### Delimiter Characters

The following characters act as token delimiters:

```
Structural Delimiters:
  { } [ ] , : ~

Whitespace Delimiters:
  [All whitespace characters as defined above]

String Delimiters:
  " ' (for quoted strings)

Comment Delimiters:
  # (start of line comment)

Section Delimiters:
  --- (section separator)
```

### Identifier Rules

Unquoted identifiers (open strings) follow these rules:

1. **Start Characters**: Letters, digits, underscore, hyphen, or any non-delimiter
2. **Continuation Characters**: Same as start characters
3. **Termination**: Whitespace, delimiter, or end of input
4. **Reserved Words**: `true`, `false`, `null`, `T`, `F`, `N`, `Inf`, `NaN` are converted to appropriate token types

### Literal Value Recognition

#### Reserved Literal Values

The following literal values are recognized and converted to appropriate token types:

```
Boolean Literals:
true       → BOOLEAN(true)
false      → BOOLEAN(false)
T          → BOOLEAN(true)     // Short form
F          → BOOLEAN(false)    // Short form

Null Literals:
null       → NULL(null)
N          → NULL(null)        // Short form

Numeric Literals:
Inf        → NUMBER(Infinity)
+Inf       → NUMBER(Infinity)
-Inf       → NUMBER(-Infinity)
NaN        → NUMBER(NaN)

Mixed Alphanumeric (Not Reserved):
true123    → IDENTIFIER(true123)    // Not a reserved word
null_val   → IDENTIFIER(null_val)   // Not a reserved word
Infinity   → IDENTIFIER(Infinity)   // Not a reserved word (use Inf instead)
```

### Token Boundary Disambiguation

#### Longest Match Rule

The tokenizer MUST apply longest match for ambiguous sequences:

```
Disambiguation Examples:
1e+2id     → NUMBER(1e+2) + IDENTIFIER(id)  // Scientific notation ends at valid boundary
123abc     → IDENTIFIER(123abc)             // Open string (unquoted identifier)
.5e10      → NUMBER(.5e10)                  // Valid scientific notation
..5        → DOT + DOT + NUMBER(5)          // Two separate dots + number
@var123    → VARIABLE(@var123)              // Variable reference
$schema    → SCHEMA_REF($schema)            // Schema reference
true123    → IDENTIFIER(true123)            // Not BOOLEAN + NUMBER
null_val   → IDENTIFIER(null_val)           // Not NULL + IDENTIFIER
Inf        → NUMBER(Infinity)               // Special numeric literal
NaN        → NUMBER(NaN)                    // Special numeric literal
+Inf       → NUMBER(Infinity)               // Positive infinity
-Inf       → NUMBER(-Infinity)              // Negative infinity
```

#### Numeric Canonicalization

**Special Numeric Values**:
```
Canonical Representations:
+0         → NUMBER(0)           // Normalize positive zero
-0         → NUMBER(0)           // Normalize negative zero to positive zero
Inf        → NUMBER(Infinity)    // Internet Object's infinity literal
+Inf       → NUMBER(Infinity)    // Positive infinity
-Inf       → NUMBER(-Infinity)   // Negative infinity
NaN        → NUMBER(NaN)         // Internet Object's NaN literal

Reserved Literals:
- Inf, +Inf, -Inf are parsed as NUMBER tokens with Infinity values
- NaN is parsed as NUMBER token with NaN value
- These are special numeric literals, not identifiers
- Must be handled consistently across all language implementations

Cross-Language Compatibility:
- Always normalize zeros to positive zero for consistency
- Inf/NaN literals become language-appropriate representations
- JavaScript: Infinity, -Infinity, NaN
- Java: Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, Double.NaN
- Python: float('inf'), float('-inf'), float('nan')
- Rust: f64::INFINITY, f64::NEG_INFINITY, f64::NAN

Overflow Behavior:
- Integer overflow: Promote to bigint or decimal type
- Float overflow: May result in Inf literal
- Underflow: Round to zero (positive zero)
```

**Number Format Validation**:
```
Valid Decimal Numbers:
123        → NUMBER(123)          // Valid integer
123.45     → NUMBER(123.45)       // Valid float
.45        → NUMBER(0.45)         // Valid float (leading zero optional)
123e10     → NUMBER(123e10)       // Valid scientific notation
123E-5     → NUMBER(123E-5)       // Valid scientific notation
123.45e10  → NUMBER(123.45e10)    // Valid scientific notation

Invalid Numbers (become open strings):
123.       → IDENTIFIER(123.)     // Trailing decimal point
123e       → IDENTIFIER(123e)     // Incomplete scientific notation
123.e10    → IDENTIFIER(123.e10)  // Decimal point without fractional digits

Valid Hexadecimal Numbers:
0x123      → NUMBER(0x123)        // Valid hex integer
0X123      → NUMBER(0X123)        // Valid hex integer (case insensitive)

Invalid Hex (become open strings):
0x123.45   → IDENTIFIER(0x123.45) // Hex floats not supported
0xG123     → IDENTIFIER(0xG123)   // Invalid hex digits

Valid Octal Numbers:
0o123      → NUMBER(0o123)        // Valid octal integer
0O123      → NUMBER(0O123)        // Valid octal integer (case insensitive)

Valid Binary Numbers:
0b101      → NUMBER(0b101)        // Valid binary integer
0B101      → NUMBER(0B101)        // Valid binary integer (case insensitive)

Valid BigInt Numbers:
123n       → BIGINT(123n)         // Valid bigint
0x123n     → BIGINT(0x123n)       // Valid hex bigint
0o123n     → BIGINT(0o123n)       // Valid octal bigint
0b101n     → BIGINT(0b101n)       // Valid binary bigint

Valid Decimal Numbers:
123.45m    → DECIMAL(123.45m)     // Valid decimal
123m       → DECIMAL(123m)        // Valid decimal (integer coefficient)
.45m       → DECIMAL(.45m)        // Valid decimal (fractional coefficient)

Invalid Decimals (become open strings):
123.m      → IDENTIFIER(123.m)    // Trailing decimal point
```

#### Open String Delimiters

**Delimiter Character Classes**:
```
Structural Delimiters (ALWAYS terminate open strings):
{ } [ ] , : ~ ---

Whitespace Delimiters (terminate and are skipped):
SPACE TAB LF CR VT FF and all Unicode whitespace

Quote Delimiters (start quoted strings):
" ' (single and double quotes)

Comment Delimiters (start comments):
# (hash symbol at start of line or after whitespace)

Special Prefixes (modify string interpretation):
r" r'  → Raw string literals
b" b'  → Binary string literals  
d" dt" → Date/datetime string literals
t"     → Time string literals

ASCII Punctuation Behavior:
! @ # $ % ^ & * ( ) - + = \ | ; : ' " < > ? / .
- Most punctuation terminates open strings
- Exceptions: - (hyphen) and _ (underscore) are valid in identifiers
- . (dot) terminates unless part of number
```

**Open String Examples**:
```
hello world    → IDENTIFIER(hello) + IDENTIFIER(world)
hello,world    → IDENTIFIER(hello) + COMMA + IDENTIFIER(world)
hello:world    → IDENTIFIER(hello) + COLON + IDENTIFIER(world)
hello-world    → IDENTIFIER(hello-world)
hello_world    → IDENTIFIER(hello_world)
hello.world    → IDENTIFIER(hello) + DOT + IDENTIFIER(world)
hello123       → IDENTIFIER(hello123)
123hello       → IDENTIFIER(123hello)    // Mixed alphanumeric = open string
123            → NUMBER(123)             // Pure number
123.45         → NUMBER(123.45)          // Valid decimal number
123.abc        → IDENTIFIER(123.abc)     // Invalid number = open string
```

**Number vs Open String Decision Rules**:
```
1. Start tokenizing as potential number if first character is digit, +, -, or .
2. Continue accumulating characters while they could be part of a number
3. At end of sequence, validate if it forms a complete valid number
4. If valid number format: emit NUMBER/BIGINT/DECIMAL token
5. If invalid number format: emit IDENTIFIER token (open string)
6. If mixed alphanumeric: always emit IDENTIFIER token (open string)

Examples of the decision process:
- "123" → Valid number → NUMBER(123)
- "123abc" → Mixed alphanumeric → IDENTIFIER(123abc)
- "123.45" → Valid decimal → NUMBER(123.45)  
- "123." → Invalid decimal (trailing dot) → IDENTIFIER(123.)
- "123.abc" → Mixed alphanumeric → IDENTIFIER(123.abc)
- ".45" → Valid decimal (leading dot) → NUMBER(0.45)
- "." → Just a dot, not a number → DOT token
- "abc123" → Starts with letter → IDENTIFIER(abc123)
- "123e" → Invalid scientific notation → IDENTIFIER(123e)
- "123e10" → Valid scientific notation → NUMBER(123e10)
- "0x123.45" → Invalid hex float → IDENTIFIER(0x123.45)
- "123.m" → Invalid decimal literal → IDENTIFIER(123.m)

Graceful Fallback Strategy:
- No error tokens for malformed numbers
- Invalid number sequences become open strings
- Allows flexible parsing without breaking on malformed input
- Users can still reference malformed numbers as identifiers
```

## Error Conditions and Recovery

### Tokenization Error Types

```
string-not-closed:
  - Description: String literal not terminated before EOF
  - Recovery: Emit ERROR token, continue from EOF

invalid-escape-sequence:
  - Description: Invalid escape sequence in string
  - Recovery: Treat as literal characters, continue tokenization

unsupported-annotation:
  - Description: Unknown string annotation prefix
  - Recovery: Skip to next token boundary

invalid-datetime:
  - Description: Invalid date/time format in annotated string
  - Recovery: Emit ERROR token, continue after string

invalid-number-format:
  - Description: Malformed numeric literal
  - Recovery: Treat as open string, continue tokenization

unexpected-character:
  - Description: Character not valid in current context
  - Recovery: Skip character, continue tokenization
```

### Error Recovery Strategies

1. **Skip to Boundary**: Advance to next whitespace or delimiter
2. **Emit Error Token**: Create ERROR token with diagnostic information
3. **Continue Processing**: Resume tokenization from recovery point
4. **Preserve Context**: Maintain position information for error reporting

## Performance Requirements

### Throughput Specifications

All implementations MUST achieve:

1. **Minimum Speed**: 1,000,000 simple tokens per second per CPU core
2. **Memory Efficiency**: Zero-copy string processing where possible
3. **Streaming Support**: Process input incrementally without full buffering
4. **Thread Safety**: Support concurrent tokenization of different inputs

### Optimization Guidelines

1. **Character Code Lookup**: Use character code comparison for ASCII characters
2. **Regex Caching**: Pre-compile and cache regular expressions
3. **String Interning**: Intern common string values (keywords, operators)
4. **Fast Paths**: Optimize common cases (ASCII strings, simple numbers)
5. **Minimal Allocation**: Reuse token objects and string buffers

## Implementation Validation

### Conformance Test Requirements

All implementations MUST pass:

1. **Token Type Tests**: Correctly identify all token types
2. **Boundary Tests**: Handle edge cases and malformed input
3. **Unicode Tests**: Process UTF-8 and escape sequences correctly
4. **Performance Tests**: Meet minimum throughput requirements
5. **Error Tests**: Generate appropriate error tokens and messages

### Test Case Categories

```
Basic Tokenization:
  - String literals (quoted, unquoted, raw, binary, datetime)
  - Numeric literals (integers, floats, hex, octal, binary, bigint, decimal)
  - Boolean and null literals
  - Structural tokens (braces, brackets, separators)

Edge Cases:
  - Empty input
  - Whitespace-only input
  - Very long tokens
  - Deeply nested structures
  - Unicode edge cases

Error Handling:
  - Unterminated strings
  - Invalid escape sequences
  - Malformed numbers
  - Invalid annotations
  - Unexpected characters

Performance:
  - Large input files
  - Many small tokens
  - Complex nested structures
  - Unicode-heavy content
```

## Language-Specific Adaptations

### Allowed Variations

While maintaining behavioral consistency, implementations MAY adapt:

1. **Error Types**: Use language-native exception/error types
2. **Token Representation**: Use language-appropriate data structures
3. **Memory Management**: Follow language-specific memory patterns
4. **API Style**: Provide idiomatic APIs for the target language

### Required Consistency

All implementations MUST maintain:

1. **Token Types**: Identical token type enumeration
2. **Token Values**: Identical parsed values for equivalent input
3. **Error Codes**: Standardized error code strings
4. **Position Tracking**: Consistent line/column position reporting
5. **Unicode Handling**: Identical Unicode normalization behavior

## Specification Compliance

### Validation Checklist

- [ ] All token types implemented
- [ ] State machine follows specification
- [ ] UTF-8 processing correct
- [ ] Whitespace handling compliant
- [ ] Escape sequences processed correctly
- [ ] Error recovery implemented
- [ ] Performance requirements met
- [ ] Conformance tests pass
- [ ] Thread safety verified (if applicable)
- [ ] Memory efficiency validated

### Version Compatibility

This specification is version 1.0. Future versions will:

1. **Maintain Backward Compatibility**: Existing valid input continues to tokenize identically
2. **Add New Features**: New token types or annotations may be added
3. **Deprecate Carefully**: Deprecated features will have long transition periods
4. **Document Changes**: All changes will be clearly documented with migration guides