# Internet Object Error System Specification

## Overview

This document defines a comprehensive, standardized error system for Internet Object that enables automated error handling, recovery, and cross-language consistency. The error model provides machine-readable error codes, structured error information, and deterministic recovery strategies.

## Error Code Registry

### Human-Readable Error Codes

All error codes use human-readable, kebab-case naming convention:

```
Error Code Format: descriptive-name
- Use lowercase with hyphens
- Be descriptive and specific
- Avoid abbreviations where possible
- Group by processing phase in documentation

Examples:
- invalid-character: Invalid character in tokenization
- expecting-bracket: Missing bracket in parsing
- schema-circular-ref: Circular reference in schema
- invalid-type: Type mismatch in validation
```

### Tokenization Errors (TOK_*)

```json
{
  "invalid-character": {
    "message": "Invalid character '{char}' at position {pos}",
    "severity": "error",
    "recoveryAction": "skip",
    "suggestions": ["Remove invalid character", "Escape character in string"]
  },
  "string-not-closed": {
    "message": "Unterminated string starting at line {line}",
    "severity": "error",
    "recoveryAction": "insert",
    "suggestions": ["Add closing quote", "Check for escaped quotes"]
  },
  "invalid-escape-sequence": {
    "message": "Invalid escape sequence '\\{seq}' in string",
    "severity": "error", 
    "recoveryAction": "fallback",
    "suggestions": ["Use valid escape sequence", "Escape backslash as \\\\"]
  },
  "invalid-number-format": {
    "message": "Malformed number '{value}' at position {pos}",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Check number format", "Use quotes for string values"]
  },
  "unsupported-annotation": {
    "message": "Unsupported string annotation '{annotation}'",
    "severity": "warning",
    "recoveryAction": "fallback", 
    "suggestions": ["Remove annotation", "Use supported annotation"]
  },
  "invalid-datetime": {
    "message": "Invalid datetime format '{value}' in annotated string",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Use ISO 8601 format", "Check date/time components"]
  }
}
```

### Parsing Errors (PARSE_*)

```json
{
  "unexpected-token": {
    "message": "Unexpected token '{token}' at line {line}, expected {expected}",
    "severity": "error",
    "recoveryAction": "skip",
    "suggestions": ["Check syntax", "Add missing punctuation"]
  },
  "expecting-bracket": {
    "message": "Missing closing '{bracket}' for structure starting at line {line}",
    "severity": "error",
    "recoveryAction": "insert",
    "suggestions": ["Add closing bracket", "Check bracket pairing"]
  },
  "invalid-memberdef": {
    "message": "Invalid member definition at line {line}",
    "severity": "error",
    "recoveryAction": "skip",
    "suggestions": ["Check member syntax", "Use key: value format"]
  },
  "duplicate-member": {
    "message": "Duplicate key '{key}' in object at line {line}",
    "severity": "error", 
    "recoveryAction": "fallback",
    "suggestions": ["Remove duplicate key", "Use different key name"]
  },
  "unexpected-positional-member": {
    "message": "Invalid positional member in keyed object at line {line}",
    "severity": "error",
    "recoveryAction": "skip",
    "suggestions": ["Add key to member", "Use consistent object style"]
  },
  "mixed-collection-syntax": {
    "message": "Mixed collection and object syntax at line {line}",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Use consistent syntax", "Separate collections and objects"]
  }
}
```

### Schema Errors (SCHEMA_*)

```json
{
  "schema-not-found": {
    "message": "Schema '{name}' not found in definitions",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Define schema", "Check schema name spelling"]
  },
  "schema-circular-ref": {
    "message": "Circular reference detected in schema '{name}' → {path}",
    "severity": "error", 
    "recoveryAction": "abort",
    "suggestions": ["Break circular reference", "Use lazy evaluation"]
  },
  "invalid-schema": {
    "message": "Invalid schema syntax at line {line}: {details}",
    "severity": "error",
    "recoveryAction": "skip",
    "suggestions": ["Check schema syntax", "Refer to schema documentation"]
  },
  "unknown-type": {
    "message": "Unknown type '{type}' in schema definition",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Use built-in type", "Define custom type", "Check spelling"]
  },
  "invalid-constraint": {
    "message": "Invalid constraint '{constraint}' for type '{type}'",
    "severity": "error",
    "recoveryAction": "skip",
    "suggestions": ["Remove invalid constraint", "Use valid constraint for type"]
  }
}
```

### Type Errors (TYPE_*)

```json
{
  "invalid-type": {
    "message": "Expected {expected}, got {actual} at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Convert to expected type", "Update schema definition"]
  },
  "invalid-value": {
    "message": "Value '{value}' violates constraint '{constraint}' at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Adjust value to meet constraint", "Relax constraint"]
  },
  "out-of-range": {
    "message": "Value {value} outside allowed range [{min}, {max}] at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback", 
    "suggestions": ["Use value within range", "Adjust range constraints"]
  },
  "invalid-format": {
    "message": "Invalid format for {type}: '{value}' at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Use correct format", "Check format specification"]
  },
  "precision-error": {
    "message": "Decimal precision/scale violation: '{value}' at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Reduce precision", "Adjust scale constraints"]
  },
  "overflow-error": {
    "message": "Numeric overflow: '{value}' exceeds type limits at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Use smaller value", "Use larger numeric type"]
  }
}
```

### Validation Errors (VALID_*)

```json
{
  "value-required": {
    "message": "Required field '{field}' missing at path '{path}'",
    "severity": "error",
    "recoveryAction": "insert",
    "suggestions": ["Add required field", "Make field optional"]
  },
  "additional-values-not-allowed": {
    "message": "Additional property '{property}' not allowed at path '{path}'",
    "severity": "error", 
    "recoveryAction": "skip",
    "suggestions": ["Remove additional property", "Allow additional properties"]
  },
  "invalid-length": {
    "message": "Array length {length} violates constraint at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Adjust array length", "Modify length constraints"]
  },
  "invalid-choice": {
    "message": "Value '{value}' not in allowed choices {choices} at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Use allowed value", "Add value to choices"]
  },
  "invalid-pattern": {
    "message": "Value '{value}' does not match pattern '{pattern}' at path '{path}'",
    "severity": "error",
    "recoveryAction": "fallback",
    "suggestions": ["Adjust value to match pattern", "Update pattern"]
  }
}
```

## Error Structure

### Standard Error Object

```typescript
ErrorObject:
{
  "code": "invalid-type",            // Human-readable error code
  "phase": "validation",             // Processing phase where error occurred
  "severity": "error",               // error | warning | info
  "message": "Expected string, got number at path '$.age'",
  "path": "$.users[0].age",          // JSONPath to error location
  "span": {"start": 45, "end": 47},  // Source position span
  "value": 25,                       // Actual value that caused error
  "expected": ["string"],            // Expected type(s) or values
  "constraint": "type",              // Violated constraint name
  "suggestions": [                   // Actionable suggestions
    "Convert number to string",
    "Update schema to accept numbers"
  ],
  "recoveryAction": "fallback",      // Automated recovery strategy
  "context": {                       // Additional context
    "schemaPath": "$.properties.age",
    "parentType": "object",
    "memberIndex": 1
  }
}
```

### Error Severity Levels

```typescript
Severity Levels:
{
  "error": {
    "description": "Critical error that prevents processing",
    "action": "Must be fixed before continuing",
    "exitCode": 1
  },
  "warning": {
    "description": "Non-critical issue that may cause problems", 
    "action": "Should be reviewed and potentially fixed",
    "exitCode": 0
  },
  "info": {
    "description": "Informational message about processing",
    "action": "No action required",
    "exitCode": 0
  }
}
```

### Recovery Actions

```typescript
Recovery Actions:
{
  "skip": {
    "description": "Skip the invalid element and continue processing",
    "applicability": "Non-critical elements, additional properties",
    "example": "Skip unknown object member"
  },
  "insert": {
    "description": "Insert missing element with default value",
    "applicability": "Missing required elements with defaults",
    "example": "Insert missing closing bracket"
  },
  "fallback": {
    "description": "Use fallback value or type conversion",
    "applicability": "Type mismatches, constraint violations",
    "example": "Convert string to number"
  },
  "abort": {
    "description": "Stop processing and report error",
    "applicability": "Critical structural errors",
    "example": "Circular schema reference"
  }
}
```

## Error Context and Path Tracking

### JSONPath Specification

All error paths MUST use JSONPath notation:

```typescript
Path Examples:
{
  "$": "Root document",
  "$.users": "users property of root",
  "$.users[0]": "First element of users array", 
  "$.users[0].name": "name property of first user",
  "$.users[*].age": "age property of all users",
  "$..name": "All name properties (recursive)",
  "$.['special-key']": "Property with special characters"
}

Path Construction Rules:
1. Always start with $ (root)
2. Use dot notation for object properties
3. Use bracket notation for array indices
4. Use bracket notation for special characters in keys
5. Escape quotes and backslashes in property names
```

### Source Position Tracking

```typescript
Position Information:
{
  "span": {
    "start": 123,        // Character offset from start of input
    "end": 145           // Character offset of end position
  },
  "startPos": {
    "line": 5,           // Line number (1-based)
    "column": 12,        // Column number (1-based)
    "offset": 123        // Character offset (0-based)
  },
  "endPos": {
    "line": 5,
    "column": 34,
    "offset": 145
  },
  "context": "~ name: \"John\", age: 30"  // Surrounding source text
}
```

## Error Aggregation and Reporting

### Error Collection Strategy

```typescript
Error Collection Rules:
1. Continue processing after recoverable errors
2. Collect all errors in processing phase before stopping
3. Group related errors by path or context
4. Limit error count to prevent overwhelming output
5. Prioritize errors by severity and impact

Error Limits:
- Maximum errors per phase: 100
- Maximum errors per path: 10  
- Maximum total errors: 500
- Stop processing on critical errors (abort recovery)
```

### Error Report Format

```json
{
  "version": "1.0",
  "summary": {
    "totalErrors": 5,
    "totalWarnings": 2,
    "totalInfo": 1,
    "processingTime": 1.23,
    "success": false
  },
  "errors": [
    {
      "code": "V001",
      "severity": "error",
      "message": "Expected string, got number at path '$.age'",
      "path": "$.age",
      "span": {"start": 45, "end": 47},
      "suggestions": ["Convert to string", "Update schema"]
    }
  ],
  "warnings": [],
  "info": [],
  "metadata": {
    "inputSize": 1024,
    "linesProcessed": 25,
    "phase": "validation"
  }
}
```

## Language-Specific Error Handling

### Error Translation

```typescript
Error Message Translation:
{
  "messageTemplates": {
    "V001": {
      "en": "Expected {expected}, got {actual} at path '{path}'",
      "es": "Se esperaba {expected}, se obtuvo {actual} en la ruta '{path}'",
      "fr": "Attendu {expected}, obtenu {actual} au chemin '{path}'"
    }
  },
  "parameterFormatting": {
    "expected": "array → comma-separated list",
    "path": "string → JSONPath notation", 
    "value": "any → string representation"
  }
}
```

### Exception Mapping

```typescript
Language Exception Mapping:
{
  "JavaScript": {
    "error": "throw new InternetObjectError(errorObject)",
    "warning": "console.warn(errorObject.message)",
    "info": "console.info(errorObject.message)"
  },
  "Java": {
    "error": "throw new InternetObjectException(errorObject)",
    "warning": "logger.warn(errorObject.getMessage())",
    "info": "logger.info(errorObject.getMessage())"
  },
  "Python": {
    "error": "raise InternetObjectError(error_object)",
    "warning": "warnings.warn(error_object.message)",
    "info": "logging.info(error_object.message)"
  },
  "Rust": {
    "error": "Err(InternetObjectError::from(error_object))",
    "warning": "warn!(\"{}\", error_object.message)",
    "info": "info!(\"{}\", error_object.message)"
  }
}
```

## Testing and Validation

### Error Test Cases

```json
Error Test Structure:
{
  "fixtures/errors/": {
    "tokenization/": "Input → expected tokenization errors",
    "parsing/": "Tokens → expected parsing errors", 
    "schema/": "Schema → expected compilation errors",
    "validation/": "Data + Schema → expected validation errors"
  },
  "testFormat": {
    "input": "test input",
    "expectedErrors": [
      {
        "code": "V001",
        "path": "$.age",
        "severity": "error"
      }
    ]
  }
}
```

### Error Consistency Verification

All implementations MUST:

1. **Produce Identical Error Codes**: Same input produces same error codes
2. **Maintain Error Paths**: Consistent JSONPath generation
3. **Preserve Error Context**: Same source position tracking
4. **Follow Recovery Actions**: Identical recovery behavior
5. **Generate Consistent Messages**: Same message templates and parameters

## Version Compatibility

### Error Code Evolution

```json
Version Compatibility Rules:
{
  "1.0": "Initial error code specification",
  "1.1": "May add new error codes, maintain existing codes",
  "2.0": "May change error code meanings, breaking compatibility"
}

Migration Strategy:
- Maintain error code registry with version history
- Provide error code mapping between versions
- Document deprecated error codes with replacements
- Support multiple error code versions during transition
```