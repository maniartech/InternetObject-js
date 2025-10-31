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
'n'                 -> INITIAL            -> Emit BIGINT token
'm'                 -> INITIAL            -> Emit DECIMAL token
[whitespace]        -> INITIAL            -> Emit NUMBER token
[delimiter]         -> INITIAL            -> Emit NUMBER token, reprocess char
[identifier_char]   -> IN_IDENTIFIER      -> Merge with identifier
[other]             -> ERROR_RECOVERY     -> Handle invalid character
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