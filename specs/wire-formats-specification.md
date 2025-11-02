# Internet Object Wire Formats Specification

## Overview

This document defines canonical JSON wire formats for Internet Object parsing artifacts to ensure byte-for-byte identical output across all language implementations. These formats serve as the conformance oracle for cross-language verification.

## Token Dump Format

### Token JSON Schema

```json
{
  "version": "1.0",
  "source": {
    "text": "original input text",
    "length": 123,
    "encoding": "utf-8"
  },
  "tokens": [
    {
      "kind": "STRING",
      "subtype": "REGULAR",
      "span": {"start": 0, "end": 5},
      "position": {"line": 1, "column": 1},
      "raw": "\"hello\"",
      "value": "hello"
    }
  ]
}
```

### Token Kind Registry

```json
Token Kinds (Numeric IDs for deterministic ordering):
{
  "STRING": 1,
  "NUMBER": 2,
  "BIGINT": 3,
  "DECIMAL": 4,
  "BOOLEAN": 5,
  "NULL": 6,
  "BINARY": 7,
  "DATETIME": 8,
  "CURLY_OPEN": 10,
  "CURLY_CLOSE": 11,
  "BRACKET_OPEN": 12,
  "BRACKET_CLOSE": 13,
  "COMMA": 14,
  "COLON": 15,
  "COLLECTION_START": 16,
  "SECTION_SEP": 17,
  "WHITESPACE": 18,
  "COMMENT": 19,
  "IDENTIFIER": 20,
  "ERROR": 99,
  "EOF": 100
}

Token Subtypes:
{
  "STRING": ["REGULAR", "OPEN", "RAW", "BINARY", "DATETIME"],
  "NUMBER": ["INTEGER", "FLOAT", "HEX", "OCTAL", "BINARY", "SCIENTIFIC"],
  "DATETIME": ["DATETIME", "DATE", "TIME"],
  "ERROR": ["INVALID_CHAR", "UNTERMINATED_STRING", "INVALID_ESCAPE", "INVALID_NUMBER"]
}
```

## Event Stream Format (Streaming Mode)

### Event Types

```json
Event Stream Schema:
{
  "version": "1.0",
  "events": [
    {
      "type": "Start",
      "kind": "Document",
      "id": "doc_0",
      "span": {"start": 0, "end": -1}
    },
    {
      "type": "Token",
      "kind": "STRING",
      "span": {"start": 0, "end": 5},
      "value": "hello"
    },
    {
      "type": "End",
      "kind": "Document", 
      "id": "doc_0",
      "span": {"start": 0, "end": 123}
    }
  ]
}
```

### Event Emission Rules

```
Deterministic Event Ordering:
1. Start events: Emitted immediately upon recognizing construct opening
2. Token events: Emitted in source order as tokens are consumed
3. Error events: Emitted inline with recovery sentinel
4. End events: Emitted when construct is complete with final span

Back-pressure Contract:
- Parsers MUST NOT buffer entire CST in streaming mode
- Hosts MAY pull events; parsers yield control at event boundaries
- Memory usage MUST remain constant regardless of input size
```

## CST Snapshot Format (Lossless)

### Compact Node Table Format

```json
CST Snapshot Schema:
{
  "version": "1.0",
  "source": "original input text",
  "nodeTable": [
    {
      "id": 0,
      "kind": 1,
      "span": {"start": 0, "end": 123},
      "parent": null,
      "children": [1, 2, 3],
      "data": null
    }
  ],
  "tokenTable": [
    {
      "id": 0,
      "kind": 1,
      "span": {"start": 0, "end": 5},
      "raw": "\"hello\"",
      "value": "hello"
    }
  ]
}

Node Kinds Registry:
{
  "Document": 1,
  "Section": 2,
  "Object": 3,
  "Array": 4,
  "Collection": 5,
  "Member": 6,
  "Token": 7,
  "Error": 8
}
```

## Validation Result Format

### Standardized Error Schema

```json
Validation Result Schema:
{
  "version": "1.0",
  "isValid": false,
  "errors": [
    {
      "code": "invalid-type",
      "severity": "error",
      "path": "$.users[0].age",
      "span": {"start": 45, "end": 50},
      "message": "Expected number, got string",
      "value": "twenty",
      "expected": ["number"],
      "suggestions": ["Convert to numeric value", "Use quotes for string type"],
      "recoveryAction": "skip"
    }
  ],
  "warnings": [],
  "metadata": {
    "validationTime": 1.23,
    "rulesApplied": 15
  }
}
```

### Error Code Registry

```json
Error Codes (Human-Readable):
{
  "Tokenization": [
    "invalid-character",
    "string-not-closed", 
    "invalid-escape-sequence",
    "invalid-number-format"
  ],
  
  "Parsing": [
    "unexpected-token",
    "expecting-bracket",
    "invalid-memberdef",
    "duplicate-member"
  ],
  
  "Schema": [
    "schema-not-found",
    "schema-circular-ref",
    "invalid-schema"
  ],
  
  "Validation": [
    "invalid-type",
    "invalid-value",
    "out-of-range",
    "invalid-format"
  ]
}

Recovery Actions:
{
  "skip": "Skip invalid element and continue",
  "insert": "Insert missing element with default",
  "fallback": "Use fallback value or type",
  "abort": "Stop processing and report error"
}
```

## Canonical Examples

### Basic Object Tokenization

```json
Input: `~ name: "John", age: 30`

Expected Token Dump:
{
  "version": "1.0",
  "source": {"text": "~ name: \"John\", age: 30", "length": 22},
  "tokens": [
    {"kind": "COLLECTION_START", "span": {"start": 0, "end": 1}, "value": "~"},
    {"kind": "IDENTIFIER", "span": {"start": 2, "end": 6}, "value": "name"},
    {"kind": "COLON", "span": {"start": 6, "end": 7}, "value": ":"},
    {"kind": "STRING", "subtype": "REGULAR", "span": {"start": 8, "end": 14}, "value": "John"},
    {"kind": "COMMA", "span": {"start": 14, "end": 15}, "value": ","},
    {"kind": "IDENTIFIER", "span": {"start": 16, "end": 19}, "value": "age"},
    {"kind": "COLON", "span": {"start": 19, "end": 20}, "value": ":"},
    {"kind": "NUMBER", "subtype": "INTEGER", "span": {"start": 21, "end": 23}, "value": 30},
    {"kind": "EOF", "span": {"start": 23, "end": 23}, "value": null}
  ]
}
```

### Schema Compilation Result

```json
Input Schema: `~ $user: { name: string, age: number }`

Expected Compiled Schema:
{
  "version": "1.0",
  "name": "user",
  "members": {
    "name": {
      "type": "string",
      "optional": false,
      "nullable": false,
      "constraints": {},
      "position": 0
    },
    "age": {
      "type": "number", 
      "optional": false,
      "nullable": false,
      "constraints": {},
      "position": 1
    }
  },
  "memberOrder": ["name", "age"],
  "openSchema": false,
  "compiledAt": "2023-12-25T10:00:00Z"
}
```

## Implementation Requirements

### Cross-Language Verification

All implementations MUST:

1. **Produce Identical Wire Formats**: Byte-for-byte identical JSON output for equivalent inputs
2. **Support All Format Types**: Token dumps, event streams, CST snapshots, validation results
3. **Handle Format Versioning**: Support version field and maintain backward compatibility
4. **Validate Format Compliance**: Include format validation in test suites

### Performance Requirements

Wire format generation MUST:

1. **Streaming Support**: Generate formats incrementally without full buffering
2. **Memory Efficiency**: Constant memory overhead for format generation
3. **Speed Requirements**: Format generation adds <10% overhead to parsing time
4. **Compression Ready**: Formats should compress well with standard algorithms

### Testing Integration

```json
Conformance Test Structure:
{
  "fixtures/": {
    "tokens/": "input.io → tokens.json",
    "events/": "input.io → events.json", 
    "cst/": "input.io → cst.json",
    "schemas/": "schema.io → compiled.json",
    "validation/": "data.io + schema.io → result.json"
  }
}
```

## Version Compatibility

### Format Evolution

```json
Version Compatibility Rules:
{
  "1.0": "Initial format specification",
  "1.1": "May add optional fields, maintain 1.0 compatibility",
  "2.0": "May change required fields, breaking compatibility"
}

Migration Strategy:
- Include version field in all formats
- Provide conversion utilities between versions
- Maintain support for N-1 versions minimum
- Document breaking changes with migration guides
```