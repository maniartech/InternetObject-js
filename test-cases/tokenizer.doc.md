# IO Tokenizer String Types Documentation

## Overview

The IO tokenizer supports multiple string types, each with specific use cases and features. This document details the various string types, their syntax, and behavior.

## String Types

### 1. Regular Strings

Regular strings are enclosed in either single (`'`) or double (`"`) quotes.

#### Features


- Support for escape sequences
- Whitespace preservation
- Unicode character support
- NFC normalization when escape sequences are used

#### Escape Sequences


- `\n` - Newline
- `\t` - Tab
- `\r` - Carriage return
- `\b` - Backspace
- `\f` - Form feed
- `\uXXXX` - Unicode character (4 hex digits)
- `\xXX` - Byte value (2 hex digits)
- `\\` - Backslash
- `\'` - Single quote
- `\"` - Double quote

#### Examples


```io
"Hello World"           # Double-quoted string
'Hello World'           # Single-quoted string
"Line 1\nLine 2"        # String with newline
"Unicode: \u0041"       # Unicode character (A)
"Byte: \x41"            # Byte value (A)
"Escaped: \"quoted\""   # Escaped quotes
```

### 2. Open Strings

Open strings are unquoted strings that don't contain special characters or whitespace at the beginning/end.

#### Features

- No quotes required
- Must not contain special characters
- Can contain escape sequences
- Trimmed of trailing whitespace
- NFC normalization when escape sequences are used

#### Examples

```io
HelloWorld              # Simple open string
Hello_World             # With underscore
Hello-World             # With hyphen
Hello123                # With numbers
```

### 3. Raw Strings
Raw strings are prefixed with `r` and preserve all characters literally, including backslashes.

#### Features

- Prefixed with `r`
- No escape sequence processing
- Preserves all characters as-is
- Can use either single or double quotes

#### Examples

```io
r"Hello\nWorld"        # Literal \n, not a newline
r'C:\path\to\file'     # Windows path without escaping
r"Raw string with \"quotes\""  # Literal quotes
```

### 4. Byte Strings

Byte strings are prefixed with `b` and contain base64-encoded binary data.

#### Features

- Prefixed with `b`
- Content must be valid base64
- Automatically decoded to binary data
- Can use either single or double quotes

#### Examples

```io
b"SGVsbG8gV29ybGQ="    # Base64 encoded "Hello World"
b'U29tZSBiaW5hcnkgZGF0YQ=='  # Base64 encoded binary data
```

### 5. DateTime Strings

DateTime strings are special annotated strings for handling date and time values.

#### Types

- `d"..."` - Date only
- `t"..."` - Time only
- `dt"..."` - Date and time combined

#### Features

- Strict format validation
- Automatic parsing to Date objects
- Support for ISO 8601 formats

#### Examples

```io
d"2024-03-20"          # Date only
t"14:30:00"            # Time only
dt"2024-03-20T14:30:00" # Date and time
```

## String Processing Rules

### 1. Whitespace Handling

- Regular strings preserve all whitespace
- Open strings trim trailing whitespace
- Leading whitespace in open strings is preserved
- Newlines are normalized to `\n`

### 2. Character Encoding

- All strings support UTF-8 encoding
- Unicode characters can be entered directly or via escape sequences
- NFC normalization is applied when escape sequences are used

### 3. String Concatenation

- Strings can be concatenated in the tokenizer
- Number literals followed by strings are merged
- Whitespace between concatenated parts is preserved

### 4. Error Handling
The tokenizer provides specific error messages for:

- Unclosed strings
- Invalid escape sequences
- Invalid Unicode escape sequences
- Invalid byte escape sequences
- Invalid base64 in byte strings
- Invalid datetime formats

## Best Practices

1. Use regular strings when:
   - The string contains special characters
   - You need escape sequences
   - The string contains whitespace at the beginning/end

2. Use open strings when:
   - The string is simple and doesn't contain special characters
   - You want to avoid quote escaping
   - The string is a simple identifier or value

3. Use raw strings when:
   - You need to preserve backslashes
   - Working with regular expressions
   - Handling file paths

4. Use byte strings when:
   - Storing binary data
   - Working with base64 encoded content

5. Use datetime strings when:
   - Working with date/time values
   - Need automatic date parsing
   - Require strict date format validation
