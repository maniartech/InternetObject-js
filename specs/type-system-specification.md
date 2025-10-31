# Internet Object Type System Specification

## Overview

This document defines the complete type system specification for Internet Object format. It provides language-agnostic behavioral contracts for built-in types, validation algorithms, constraint handling, and Decimal arithmetic operations that all implementations must follow to ensure identical type system behavior across different programming languages and platforms.

## Built-in Type System

### Type Hierarchy

Internet Object provides a comprehensive type system with the following hierarchy:

```
Type System Hierarchy:
├── Primitive Types
│   ├── string (text data with encoding support)
│   ├── number (numeric data with multiple subtypes)
│   │   ├── int (signed integers)
│   │   ├── uint (unsigned integers)
│   │   ├── float (floating-point numbers)
│   │   ├── bigint (arbitrary precision integers)
│   │   └── size-specific (int8, int16, int32, uint8, uint16, uint32, uint64, float32, float64)
│   ├── decimal (high-precision decimal arithmetic)
│   ├── bool (boolean true/false values)
│   ├── datetime (date/time values with timezone support)
│   │   ├── datetime (full date and time)
│   │   ├── date (date only)
│   │   └── time (time only)
│   └── null (null/undefined values)
├── Complex Types
│   ├── object (structured key-value data)
│   ├── array (ordered collections)
│   └── any (flexible type with constraints)
└── Special Types
    ├── binary (base64-encoded binary data)
    └── custom (user-defined types)
```

### Type Definitions

All implementations MUST support these core type definitions:

#### 1. String Type

**Purpose**: Text data with encoding and format support

```typescript
StringType:
  - baseType: "string"
  - subtypes: ["string", "url", "email"]
  - encoding: UTF-8
  - constraints: StringConstraints

StringConstraints:
  - len: Integer?              // Exact length requirement
  - minLen: Integer?           // Minimum length requirement  
  - maxLen: Integer?           // Maximum length requirement
  - pattern: RegExp?           // Regular expression pattern
  - flags: String?             // Regex flags (i, g, m, etc.)
  - choices: Array<String>?    // Enumerated valid values
  - format: StringFormat?      // String format specification
  - escapeLines: Boolean?      // Allow line escapes in strings

StringFormat:
  - auto: Automatic format detection
  - open: Unquoted string format
  - regular: Standard quoted string
  - raw: Raw string (no escape processing)
```

**Validation Algorithm**:
```
validateString(value: Any, constraints: StringConstraints): ValidationResult
  1. Check if value is string type
  2. Validate encoding (UTF-8 normalization)
  3. Check length constraints (len, minLen, maxLen)
  4. Validate pattern matching (if pattern specified)
  5. Check enumerated choices (if choices specified)
  6. Validate format-specific rules (email, URL, etc.)
  7. Return validation result with errors
```

**Format Validators**:
```
Email Validation:
  - Pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  - Additional checks: domain validation, length limits
  
URL Validation:
  - Pattern: /^https?:\/\/[^\s]+$/
  - Additional checks: protocol validation, domain format
  
Custom Format:
  - User-defined validation functions
  - Pluggable format registry
```

#### 2. Number Type

**Purpose**: Numeric data with multiple representations and precision levels

```typescript
NumberType:
  - baseType: "number"
  - subtypes: ["number", "int", "uint", "float", "bigint", "int8", "int16", "int32", "uint8", "uint16", "uint32", "uint64", "float32", "float64"]
  - constraints: NumberConstraints

NumberConstraints:
  - min: Number?               // Minimum value (inclusive)
  - max: Number?               // Maximum value (inclusive)
  - choices: Array<Number>?    // Enumerated valid values
  - format: NumberFormat?      // Number format specification

NumberFormat:
  - decimal: Standard decimal notation
  - hex: Hexadecimal notation (0x prefix)
  - octal: Octal notation (0o prefix)
  - binary: Binary notation (0b prefix)
  - scientific: Scientific notation (e/E)
```

**Subtype Specifications**:
```
Integer Types:
  - int8: -128 to 127
  - int16: -32,768 to 32,767
  - int32: -2,147,483,648 to 2,147,483,647
  - uint8: 0 to 255
  - uint16: 0 to 65,535
  - uint32: 0 to 4,294,967,295
  - uint64: 0 to 18,446,744,073,709,551,615
  - bigint: Arbitrary precision integers

Float Types:
  - float32: IEEE 754 single precision
  - float64: IEEE 754 double precision
  - float: Platform default floating point
```

**Validation Algorithm**:
```
validateNumber(value: Any, constraints: NumberConstraints, subtype: String): ValidationResult
  1. Check if value is numeric type
  2. Validate subtype-specific range (int8, uint32, etc.)
  3. Check min/max constraints
  4. Validate enumerated choices (if specified)
  5. Check format-specific parsing (hex, binary, etc.)
  6. Validate precision for floating-point types
  7. Return validation result with errors
```

#### 3. Decimal Type

**Purpose**: High-precision decimal arithmetic with RDBMS compliance

```typescript
DecimalType:
  - baseType: "decimal"
  - representation: ScaledInteger
  - constraints: DecimalConstraints

DecimalConstraints:
  - precision: Integer?        // Total significant digits (1-38)
  - scale: Integer?            // Decimal places (0-precision)
  - min: Decimal?              // Minimum value
  - max: Decimal?              // Maximum value
  - choices: Array<Decimal>?   // Enumerated valid values

DecimalRepresentation:
  - coefficient: BigInteger    // Scaled integer value
  - exponent: Integer          // Decimal point position
  - precision: Integer         // Total significant digits
  - scale: Integer             // Fractional digits
```

**Arithmetic Operations**:
```
DecimalArithmetic (RDBMS-compliant):
  - add(a: Decimal, b: Decimal): Decimal
  - subtract(a: Decimal, b: Decimal): Decimal
  - multiply(a: Decimal, b: Decimal): Decimal
  - divide(a: Decimal, b: Decimal): Decimal
  - modulo(a: Decimal, b: Decimal): Decimal
  - compare(a: Decimal, b: Decimal): Integer (-1, 0, 1)
  - round(value: Decimal, scale: Integer): Decimal
  - truncate(value: Decimal, scale: Integer): Decimal

Precision Rules:
  - Addition/Subtraction: max(scale1, scale2)
  - Multiplication: scale1 + scale2
  - Division: configurable scale (default: max(4, scale1 + precision2 + 1))
  - Rounding: HALF_UP (banker's rounding)
```

**Validation Algorithm**:
```
validateDecimal(value: Any, constraints: DecimalConstraints): ValidationResult
  1. Check if value is decimal type or convertible
  2. Validate precision constraints (total digits)
  3. Validate scale constraints (decimal places)
  4. Check min/max value constraints
  5. Validate enumerated choices (if specified)
  6. Verify arithmetic operation results stay within bounds
  7. Return validation result with errors
```

#### 4. Boolean Type

**Purpose**: Boolean true/false values with multiple representations

```typescript
BooleanType:
  - baseType: "bool"
  - representations: ["true", "false", "T", "F", "1", "0"]
  - constraints: BooleanConstraints

BooleanConstraints:
  - default: Boolean?          // Default value if not specified
```

**Validation Algorithm**:
```
validateBoolean(value: Any, constraints: BooleanConstraints): ValidationResult
  1. Check if value is boolean type
  2. Validate boolean representation (true/false, T/F, 1/0)
  3. Apply default value if value is undefined and default specified
  4. Return validation result with errors
```

#### 5. DateTime Type

**Purpose**: Date and time values with timezone and format support

```typescript
DateTimeType:
  - baseType: "datetime"
  - subtypes: ["datetime", "date", "time"]
  - format: ISO8601
  - constraints: DateTimeConstraints

DateTimeConstraints:
  - min: DateTime?             // Minimum date/time value
  - max: DateTime?             // Maximum date/time value
  - choices: Array<DateTime>?  // Enumerated valid values
  - timezone: TimezoneHandling? // Timezone handling rules

TimezoneHandling:
  - preserve: Keep original timezone
  - convert: Convert to specified timezone
  - utc: Convert to UTC
  - local: Convert to local timezone
```

**Format Specifications**:
```
DateTime Formats (ISO 8601):
  - datetime: YYYY-MM-DDTHH:mm:ss[.fff][Z|±HH:mm]
  - date: YYYY-MM-DD
  - time: HH:mm:ss[.fff]

Examples:
  - 2023-12-25T15:30:00Z
  - 2023-12-25T15:30:00.123-05:00
  - 2023-12-25
  - 15:30:00.123
```

**Validation Algorithm**:
```
validateDateTime(value: Any, constraints: DateTimeConstraints, subtype: String): ValidationResult
  1. Check if value is datetime type or valid string
  2. Parse datetime string according to subtype format
  3. Validate date/time component ranges
  4. Check min/max constraints
  5. Validate enumerated choices (if specified)
  6. Handle timezone conversion (if required)
  7. Return validation result with errors
```

#### 6. Array Type

**Purpose**: Ordered collections with element type constraints

```typescript
ArrayType:
  - baseType: "array"
  - elementType: TypeDefinition
  - constraints: ArrayConstraints

ArrayConstraints:
  - of: TypeDefinition         // Element type definition
  - len: Integer?              // Exact length requirement
  - minLen: Integer?           // Minimum length requirement
  - maxLen: Integer?           // Maximum length requirement
```

**Validation Algorithm**:
```
validateArray(value: Any, constraints: ArrayConstraints): ValidationResult
  1. Check if value is array type
  2. Validate length constraints (len, minLen, maxLen)
  3. Validate each element against element type definition
  4. Collect element validation errors with path information
  5. Return validation result with aggregated errors
```

#### 7. Object Type

**Purpose**: Structured key-value data with schema validation

```typescript
ObjectType:
  - baseType: "object"
  - schema: Schema?            // Object schema definition
  - constraints: ObjectConstraints

ObjectConstraints:
  - schema: Schema?            // Required schema definition
  - additionalProperties: Boolean | TypeDefinition // Allow unknown properties
```

**Validation Algorithm**:
```
validateObject(value: Any, constraints: ObjectConstraints): ValidationResult
  1. Check if value is object type
  2. Validate against schema (if specified)
  3. Check for required properties
  4. Validate known properties against their definitions
  5. Handle additional properties according to constraints
  6. Return validation result with property-level errors
```

#### 8. Any Type

**Purpose**: Flexible type with optional constraints and union support

```typescript
AnyType:
  - baseType: "any"
  - constraints: AnyConstraints

AnyConstraints:
  - choices: Array<Any>?       // Enumerated valid values
  - anyOf: Array<TypeDefinition>? // Union type definitions
  - isSchema: Boolean?         // Treat value as schema definition
```

**Validation Algorithm**:
```
validateAny(value: Any, constraints: AnyConstraints): ValidationResult
  1. If choices specified, validate against enumerated values
  2. If anyOf specified, validate against union types (OR logic)
  3. If isSchema specified, validate as schema definition
  4. Otherwise, accept any value as valid
  5. Return validation result with errors
```

## Type Registry System

### Registry Interface

All implementations MUST provide a type registry for managing built-in and custom types:

```typescript
TypeRegistry:
  - register(typeDef: TypeDefinition): void
  - get(typeName: String): TypeDefinition?
  - has(typeName: String): Boolean
  - list(): Array<String>
  - unregister(typeName: String): Boolean

TypeDefinition:
  - type: String               // Type identifier
  - baseType: String           // Base type category
  - validator: TypeValidator   // Validation function
  - serializer: TypeSerializer // Serialization function
  - constraints: ConstraintSchema // Supported constraints
  - metadata: TypeMetadata     // Type metadata
```

### Built-in Type Registration

```typescript
Built-in Types Registration:
  registry.register(StringTypeDef)
  registry.register(NumberTypeDef)
  registry.register(DecimalTypeDef)
  registry.register(BooleanTypeDef)
  registry.register(DateTimeTypeDef)
  registry.register(ArrayTypeDef)
  registry.register(ObjectTypeDef)
  registry.register(AnyTypeDef)
```

### Custom Type Definition

```typescript
CustomTypeDef Example:
{
  type: "email",
  baseType: "string",
  validator: (value, constraints) => {
    // Email-specific validation logic
    return validateEmailFormat(value, constraints)
  },
  serializer: (value) => {
    // Email-specific serialization
    return value.toLowerCase().trim()
  },
  constraints: {
    domain: "string?",         // Required domain
    allowLocal: "boolean?"     // Allow local addresses
  },
  metadata: {
    description: "Email address type",
    examples: ["user@example.com"],
    version: "1.0"
  }
}
```

## Type Validation Algorithms

### Validation Pipeline

```
Value + Type Definition
    ↓
┌─────────────────┐
│  Type Check     │ → Basic type compatibility
└─────────────────┘
    ↓
┌─────────────────┐
│ Format Check    │ → Format-specific validation
└─────────────────┘
    ↓
┌─────────────────┐
│Constraint Check │ → Constraint validation
└─────────────────┘
    ↓
┌─────────────────┐
│ Custom Check    │ → Custom validation rules
└─────────────────┘
    ↓
Validation Result
```

### Universal Validation Interface

```typescript
TypeValidator Interface:
  validate(value: Any, constraints: Constraints, context: ValidationContext): ValidationResult

ValidationContext:
  - path: String               // Current validation path
  - definitions: Definitions   // Available definitions
  - options: ValidationOptions // Validation options
  - parent: ValidationContext? // Parent context

ValidationResult:
  - isValid: Boolean           // Validation success flag
  - value: Any                 // Validated/converted value
  - errors: Array<ValidationError> // Validation errors
  - warnings: Array<ValidationWarning> // Validation warnings
```

### Constraint Validation

#### Universal Constraints

All types support these universal constraints:

```typescript
UniversalConstraints:
  - choices: Array<Any>        // Enumerated valid values
  - default: Any               // Default value
  - nullable: Boolean          // Allow null values
  - optional: Boolean          // Allow undefined values
```

#### Type-Specific Constraints

Each type defines its own constraint set:

```typescript
StringConstraints: len, minLen, maxLen, pattern, flags, choices, format, escapeLines
NumberConstraints: min, max, choices, format
DecimalConstraints: precision, scale, min, max, choices
BooleanConstraints: default
DateTimeConstraints: min, max, choices, timezone
ArrayConstraints: of, len, minLen, maxLen
ObjectConstraints: schema, additionalProperties
AnyConstraints: choices, anyOf, isSchema
```

### Error Handling

#### Validation Error Types

```typescript
ValidationError Types:
  - type-mismatch: Value type doesn't match expected type
  - constraint-violation: Value violates type constraint
  - format-error: Value format is invalid
  - range-error: Value is outside allowed range
  - pattern-mismatch: Value doesn't match required pattern
  - choice-invalid: Value is not in allowed choices
  - precision-error: Decimal precision/scale violation
  - overflow-error: Numeric value overflow
  - underflow-error: Numeric value underflow
```

#### Error Context

```typescript
ValidationError:
  - code: ErrorCode            // Standardized error code
  - message: String            // Human-readable message
  - path: String               // Validation path
  - value: Any                 // Invalid value
  - constraint: String         // Violated constraint
  - expected: Any              // Expected value/format
  - suggestions: Array<String> // Suggested fixes
```

## Type Conversion and Coercion

### Conversion Rules

#### Implicit Conversions (Safe)

```typescript
Safe Conversions:
  - string → number (if valid numeric format)
  - number → string (always safe)
  - int → float (always safe)
  - smaller int → larger int (always safe)
  - number → decimal (with precision/scale validation)
  - string → datetime (if valid ISO 8601 format)
  - array → object (with numeric keys)
```

#### Explicit Conversions (Potentially Lossy)

```typescript
Explicit Conversions:
  - float → int (truncation)
  - larger int → smaller int (overflow check)
  - decimal → number (precision loss)
  - datetime → string (formatting)
  - object → array (value extraction)
  - any → specific type (validation required)
```

### Conversion Interface

```typescript
TypeConverter:
  - canConvert(from: Type, to: Type): Boolean
  - convert(value: Any, from: Type, to: Type): ConversionResult
  - isLossless(from: Type, to: Type): Boolean

ConversionResult:
  - success: Boolean           // Conversion success flag
  - value: Any                 // Converted value
  - warnings: Array<String>    // Conversion warnings
  - errors: Array<String>      // Conversion errors
```

## Performance Requirements

### Type Validation Performance

All implementations MUST achieve:

1. **Validation Speed**: 1,000,000 simple type validations per second per CPU core
2. **Memory Efficiency**: Constant memory overhead per validation
3. **Latency**: Sub-microsecond validation for primitive types
4. **Scalability**: Linear performance scaling with data complexity

### Optimization Strategies

#### 1. Fast Path Optimization

```typescript
Fast Path Conditions:
  - No constraints specified → skip constraint validation
  - Simple types (string, number, boolean) → optimized validators
  - Cached validation results → memoization
  - Type-specific optimizations → specialized algorithms
```

#### 2. Constraint Optimization

```typescript
Constraint Optimizations:
  - Constraint ordering by execution cost
  - Short-circuit evaluation on first failure
  - Pre-compiled regex patterns
  - Lookup tables for enumerated choices
  - Range check optimization for numbers
```

#### 3. Memory Optimization

```typescript
Memory Optimizations:
  - Object pooling for validation results
  - String interning for error messages
  - Lazy evaluation of expensive validations
  - Weak references for cached results
  - Memory-mapped constraint data
```

## Thread Safety and Concurrency

### Immutable Type Definitions

```typescript
Immutability Requirements:
  - Type definitions MUST be immutable after registration
  - Validation operations MUST be side-effect free
  - Thread-safe concurrent access to type registry
  - No synchronization required for validation operations
```

### Concurrent Validation

```typescript
Concurrency Support:
  - Independent validation contexts per thread
  - Parallel validation of array elements
  - Concurrent validation of object properties
  - Lock-free validation result aggregation
  - Thread-safe error collection
```

## Language-Specific Adaptations

### Allowed Variations

While maintaining behavioral consistency, implementations MAY adapt:

1. **Type Representation**: Use language-native type systems
2. **Validation API**: Provide idiomatic validation interfaces
3. **Error Handling**: Use language-native exception mechanisms
4. **Performance**: Use language-specific optimization techniques
5. **Memory Management**: Follow language-specific patterns

### Required Consistency

All implementations MUST maintain:

1. **Type Semantics**: Identical type validation behavior
2. **Constraint Logic**: Consistent constraint validation
3. **Error Codes**: Standardized error code strings
4. **Conversion Rules**: Identical type conversion behavior
5. **Decimal Arithmetic**: RDBMS-compliant decimal operations

## Specification Compliance

### Validation Checklist

- [ ] All built-in types implemented with correct validation
- [ ] Type registry supports registration and lookup
- [ ] Constraint validation works for all constraint types
- [ ] Decimal arithmetic is RDBMS-compliant
- [ ] Type conversion follows specified rules
- [ ] Performance requirements met for all operations
- [ ] Thread safety verified for concurrent access
- [ ] Error handling provides comprehensive reporting
- [ ] Custom type registration supported
- [ ] Memory optimization implemented

### Testing Requirements

All implementations MUST pass:

1. **Type Validation Tests**: Verify all built-in type validators
2. **Constraint Tests**: Test all constraint types and combinations
3. **Conversion Tests**: Validate type conversion rules
4. **Decimal Tests**: Verify RDBMS-compliant decimal arithmetic
5. **Performance Tests**: Meet minimum performance benchmarks
6. **Concurrency Tests**: Verify thread safety
7. **Error Tests**: Validate error detection and reporting
8. **Registry Tests**: Test type registration and lookup
9. **Custom Type Tests**: Verify custom type definition support
10. **Edge Case Tests**: Handle boundary conditions and malformed input

### Version Compatibility

This specification is version 1.0. Future versions will:

1. **Maintain Backward Compatibility**: Existing type definitions continue to work
2. **Add New Built-in Types**: New types may be added to the registry
3. **Extend Constraint Types**: New constraint types may be added
4. **Improve Performance**: Performance requirements may be increased
5. **Document Changes**: All changes will be clearly documented with migration guides