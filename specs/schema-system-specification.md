# Internet Object Schema System Specification

## Overview

This document defines the complete schema system specification for Internet Object format. It provides language-agnostic behavioral contracts for schema compilation, validation algorithms, type resolution mechanisms, and constraint handling that all implementations must follow to ensure identical schema behavior across different programming languages and platforms.

## Schema Definition Language

### Schema Syntax

Internet Object schemas are defined using a declarative syntax that specifies data structure, types, and constraints:

```
Basic Schema Definition:
~ { name, age, email }

Named Schema Definition:
~ $person: { name, age, email }

Schema with Types:
~ { name: string, age: number, email: string }

Schema with Constraints:
~ { name: string, age: number, email: string }

Nested Object Schema:
~ $address: { street, city, zipCode }
~ $person: { name, age, address: $address }

Array Schema:
~ { tags: [string], scores: [number] }

Optional and Nullable:
~ { name: string, age?: number, middleName?: string, bio?: string }
```

### Schema Components

#### 1. Schema Declaration

```
Schema Declaration Syntax:
~ $schemaName: { memberDefinitions }

Examples:
~ $user: { name, email, age }
~ $product: { title, price, category, tags }
~ $address: { street, city, state, zipCode }
```

#### 2. Member Definitions

```
Member Definition Syntax:
memberName: type{constraints}
memberName?: type{constraints}        // Optional member
memberName: type | null               // Nullable member
memberName?: type | null              // Optional and nullable

Examples:
name: string
age?: number
email: string{pattern: /^[^@]+@[^@]+$/}
tags: [string]
metadata?: object | null
```

#### 3. Type Specifications

```
Primitive Types:
- string: Text data with optional constraints
- number: Numeric data (int, uint, float, bigint)
- decimal: High-precision decimal numbers
- bool: Boolean true/false values
- datetime: Date/time values (datetime, date, time)
- any: Flexible type with optional constraints

Complex Types:
- object: Structured objects with schema
- array: Homogeneous collections [elementType]
- [type]: Array shorthand syntax

Type Modifiers:
- type | null: Nullable type
- type?: Optional type (can be undefined)
- type | type2: Union types (anyOf constraint)
```

## Schema Compilation Process

### Compilation Pipeline

```
Schema Source Text
    ↓
┌─────────────────┐
│   Tokenization  │ → Schema Tokens
└─────────────────┘
    ↓
┌─────────────────┐
│   Parsing       │ → Schema AST
└─────────────────┘
    ↓
┌─────────────────┐
│ Type Resolution │ → Resolved Types
└─────────────────┘
    ↓
┌─────────────────┐
│  Optimization   │ → Compiled Schema
└─────────────────┘
    ↓
Runtime Schema Object
```

### Compilation Phases

#### Phase 1: Schema Parsing

**Purpose**: Parse schema definition syntax into structured representation

**Input**: Schema definition string
**Output**: Schema AST with member definitions

**Requirements**:
1. MUST parse all schema syntax elements correctly
2. MUST handle nested schema references
3. MUST validate schema definition syntax
4. MUST preserve position information for error reporting
5. MUST support incremental compilation

**Interface**:
```
SchemaParser:
  - parseSchema(source: String): SchemaAST
  - parseMemberDef(source: String): MemberDefAST
  - parseTypeSpec(source: String): TypeSpecAST
  - parseConstraints(source: String): ConstraintsAST
  - getErrors(): Array<SchemaParseError>
```

#### Phase 2: Type Resolution

**Purpose**: Resolve type references and build complete type definitions

**Input**: Schema AST with unresolved references
**Output**: Schema with fully resolved type definitions

**Requirements**:
1. MUST resolve all schema references ($schemaName)
2. MUST detect circular references and report errors
3. MUST validate type compatibility
4. MUST handle built-in and custom types
5. MUST support type inheritance and composition

**Interface**:
```
TypeResolver:
  - resolveTypes(schema: SchemaAST, context: TypeContext): ResolvedSchema
  - resolveReference(ref: String, context: TypeContext): TypeDefinition
  - detectCircularRefs(schema: ResolvedSchema): Array<CircularRefError>
  - validateTypeCompat(type1: Type, type2: Type): Boolean
```

#### Phase 3: Constraint Compilation

**Purpose**: Compile constraints into efficient validation functions

**Input**: Resolved schema with constraint specifications
**Output**: Compiled schema with optimized validation rules

**Requirements**:
1. MUST compile all constraint types into validation functions
2. MUST optimize constraint checking for performance
3. MUST handle constraint composition and precedence
4. MUST support custom constraint types
5. MUST generate efficient validation code

**Interface**:
```
ConstraintCompiler:
  - compileConstraints(constraints: ConstraintsAST): ValidationRules
  - optimizeValidation(rules: ValidationRules): OptimizedRules
  - generateValidator(rules: OptimizedRules): ValidatorFunction
  - registerCustomConstraint(name: String, validator: ConstraintValidator)
```

### Open Schema Semantics

#### Additional Properties Handling

**Open Schema Configuration**:
```
AdditionalProperties Modes:
{
  "false": {
    "description": "No additional properties allowed",
    "validation": "Error on any unknown property",
    "example": "additionalProperties: false"
  },
  "true": {
    "description": "Any additional properties allowed",
    "validation": "Accept any unknown property without validation",
    "example": "additionalProperties: true"
  },
  "TypeDefinition": {
    "description": "Additional properties must match specified type",
    "validation": "Validate unknown properties against type definition",
    "example": "additionalProperties: string"
  }
}
```

**Validation Algorithm**:
```
validateAdditionalProperties(object: Object, schema: Schema): ValidationResult
  1. Identify known properties from schema definition
  2. Find additional properties not in schema
  3. Apply additional properties policy:
     - false: Error if any additional properties exist
     - true: Accept all additional properties
     - TypeDef: Validate each additional property against type
  4. Return validation result with property-level errors
```

### Union Type Semantics (anyOf)

#### Union Validation Strategy

**Deterministic Union Resolution**:
```
Union Validation Rules:
{
  "strategy": "First successful match wins",
  "ordering": "Schema definition order (left to right)",
  "shortCircuit": "Stop on first successful validation",
  "errorReporting": "Report all attempted validations if all fail",
  "tieBreaker": "Not applicable (first match wins)"
}
```

**Validation Algorithm**:
```
validateUnion(value: Any, unionTypes: Array<TypeDefinition>): ValidationResult
  1. Iterate through union types in definition order
  2. Attempt validation against each type
  3. Return success on first successful validation
  4. If all validations fail, return aggregated errors
  5. Include metadata about which types were attempted
```

#### Union Type Scoring (Optional Enhancement)

For implementations that want more sophisticated union resolution:

```
Union Scoring System (Optional):
{
  "exactMatch": 100,        // Exact type match
  "compatibleMatch": 80,    // Compatible type (e.g., int → number)
  "convertibleMatch": 60,   // Requires conversion (e.g., string → number)
  "partialMatch": 40,       // Partial validation success
  "noMatch": 0              // Validation failed
}
```

### Compiled Schema Structure

```
CompiledSchema:
  - name: String                      // Schema identifier
  - version: String                   // Schema version
  - members: Map<String, MemberDef>   // Member definitions by name
  - memberOrder: Array<String>        // Ordered member names
  - openSchema: Boolean | MemberDef   // Additional properties handling
  - validationRules: ValidationRules  // Compiled validation functions
  - metadata: SchemaMetadata          // Schema metadata and annotations

MemberDef:
  - name: String                      // Member name
  - type: TypeDefinition              // Resolved type definition
  - optional: Boolean                 // Optional member flag
  - nullable: Boolean                 // Nullable flag
  - defaultValue: Any                 // Default value (if any)
  - constraints: CompiledConstraints  // Compiled constraint validators
  - position: Position                // Source position for errors

TypeDefinition:
  - typeName: String                  // Type identifier
  - baseType: String                  // Base type (string, number, etc.)
  - genericArgs: Array<TypeDefinition> // Generic type arguments
  - validator: TypeValidator          // Type-specific validator
  - serializer: TypeSerializer        // Type-specific serializer
```

## Validation Algorithms

### Validation Pipeline

```
Input Data + Compiled Schema
    ↓
┌─────────────────┐
│ Structure Check │ → Structural Validation
└─────────────────┘
    ↓
┌─────────────────┐
│  Type Check     │ → Type Validation
└─────────────────┘
    ↓
┌─────────────────┐
│Constraint Check │ → Constraint Validation
└─────────────────┘
    ↓
┌─────────────────┐
│Custom Validation│ → Custom Rule Validation
└─────────────────┘
    ↓
Validation Result
```

### Validation Phases

#### Phase 1: Structural Validation

**Purpose**: Validate data structure against schema structure

**Checks**:
1. Required members are present
2. No unknown members (unless schema is open)
3. Correct data types (object vs array vs primitive)
4. Proper nesting structure
5. Array element count constraints

**Algorithm**:
```
validateStructure(data: Any, schema: CompiledSchema): StructuralResult
  1. Check if data type matches schema expectation
  2. For objects: validate member presence and unknown members
  3. For arrays: validate element count and structure
  4. For primitives: validate basic type compatibility
  5. Return structural validation result with errors
```

#### Phase 2: Type Validation

**Purpose**: Validate data values against type definitions

**Checks**:
1. Primitive type validation (string, number, boolean, etc.)
2. Format validation (email, URL, datetime, etc.)
3. Range validation (min/max for numbers, length for strings)
4. Pattern validation (regex patterns for strings)
5. Enum validation (choice constraints)

**Algorithm**:
```
validateType(value: Any, typeDef: TypeDefinition): TypeResult
  1. Get type validator for the type definition
  2. Execute type-specific validation logic
  3. Check format constraints (if applicable)
  4. Validate range and pattern constraints
  5. Return type validation result with errors
```

#### Phase 3: Constraint Validation

**Purpose**: Validate data against schema constraints

**Constraint Types**:

```
String Constraints:
  - len: Exact length requirement
  - minLen: Minimum length requirement
  - maxLen: Maximum length requirement
  - pattern: Regular expression pattern
  - choices: Enumerated valid values
  - format: String format (email, url, etc.)

Number Constraints:
  - min: Minimum value (inclusive)
  - max: Maximum value (inclusive)
  - choices: Enumerated valid values
  - format: Number format (decimal, hex, etc.)

Decimal Constraints:
  - precision: Total significant digits
  - scale: Decimal places
  - min: Minimum value
  - max: Maximum value

Array Constraints:
  - len: Exact length requirement
  - minLen: Minimum length requirement
  - maxLen: Maximum length requirement
  - of: Element type definition

Object Constraints:
  - schema: Object schema definition
  - additionalProperties: Allow unknown properties

Universal Constraints:
  - choices: Enumerated valid values
  - anyOf: Union type constraints
  - custom: Custom validation functions
```

**Algorithm**:
```
validateConstraints(value: Any, constraints: CompiledConstraints): ConstraintResult
  1. Iterate through all applicable constraints
  2. Execute constraint validation functions
  3. Collect constraint violations
  4. Apply constraint precedence rules
  5. Return constraint validation result
```

### Validation Result Structure

```
ValidationResult:
  - isValid: Boolean                  // Overall validation success
  - errors: Array<ValidationError>    // Validation errors
  - warnings: Array<ValidationWarning> // Validation warnings
  - metadata: ValidationMetadata      // Validation metadata

ValidationError:
  - code: ErrorCode                   // Standardized error code
  - message: String                   // Human-readable error message
  - path: String                      // Data path where error occurred
  - value: Any                        // Invalid value
  - constraint: String                // Violated constraint
  - suggestions: Array<String>        // Suggested fixes

ValidationWarning:
  - code: WarningCode                 // Standardized warning code
  - message: String                   // Human-readable warning message
  - path: String                      // Data path where warning occurred
  - suggestion: String                // Suggested improvement
```

## Type System Integration

### Built-in Type Registry

All implementations MUST provide these built-in types:

```
StringType:
  - Validates string values
  - Supports length, pattern, format constraints
  - Handles encoding and normalization

NumberType:
  - Validates numeric values (int, uint, float, bigint)
  - Supports range constraints and format validation
  - Handles different number representations

DecimalType:
  - Validates high-precision decimal values
  - Supports precision/scale constraints
  - Provides RDBMS-compliant arithmetic

BooleanType:
  - Validates boolean values (true/false, T/F)
  - Supports default value constraints

DateTimeType:
  - Validates date/time values
  - Supports format validation (ISO 8601)
  - Handles timezone and precision

ArrayType:
  - Validates array structures
  - Supports element type and length constraints
  - Handles sparse arrays and type homogeneity

ObjectType:
  - Validates object structures
  - Supports schema-based validation
  - Handles additional properties and inheritance

AnyType:
  - Flexible validation with optional constraints
  - Supports union types (anyOf)
  - Handles dynamic typing scenarios
```

### Custom Type Registration

```
TypeRegistry:
  - registerType(typeDef: CustomTypeDef): void
  - getType(typeName: String): TypeDefinition
  - hasType(typeName: String): Boolean
  - listTypes(): Array<String>

CustomTypeDef:
  - name: String                      // Type identifier
  - baseType: String                  // Base type to extend
  - validator: TypeValidator          // Validation function
  - serializer: TypeSerializer        // Serialization function
  - constraints: Array<ConstraintDef> // Supported constraints
  - metadata: TypeMetadata            // Type metadata
```

## Schema Reference Resolution

### Reference Types

```
Schema References:
  $schemaName         - Reference to named schema
  $schemaName.member  - Reference to specific member
  @variableName       - Reference to variable definition

Type References:
  typeName            - Reference to built-in or custom type
  $schemaName         - Schema used as type
  [elementType]       - Array type reference
```

### Resolution Algorithm

```
resolveReference(ref: String, context: ResolutionContext): ResolvedReference
  1. Parse reference syntax (schema, member, variable)
  2. Look up reference in appropriate scope
  3. Validate reference exists and is accessible
  4. Resolve nested references recursively
  5. Detect and prevent circular references
  6. Return resolved reference or error
```

### Circular Reference Detection

```
CircularReferenceDetector:
  - detectCycles(schema: Schema): Array<CyclicPath>
  - isReachable(from: String, to: String): Boolean
  - getReferencePath(ref: String): Array<String>
  - breakCycle(cycle: CyclicPath): Resolution

Cycle Breaking Strategies:
  1. Lazy evaluation for self-references
  2. Reference limits for deep recursion
  3. Explicit cycle markers in schema
  4. Error reporting for unresolvable cycles
```

## Performance Optimization

### Schema Compilation Optimization

#### 1. Constraint Optimization

```
Optimization Strategies:
  - Constraint ordering by execution cost
  - Short-circuit evaluation for failing constraints
  - Constraint combination and simplification
  - Pre-computed validation tables for enums
  - Cached regex compilation for patterns
```

#### 2. Type Validation Optimization

```
Fast Path Optimizations:
  - Type-specific optimized validators
  - Inline validation for simple constraints
  - Batch validation for arrays
  - Parallel validation for independent members
  - Memoization for repeated validations
```

#### 3. Memory Optimization

```
Memory Strategies:
  - Schema sharing across instances
  - Constraint object pooling
  - Lazy compilation of unused schemas
  - Weak references for cached results
  - Memory-mapped schema storage for large schemas
```

### Runtime Performance Requirements

All implementations MUST achieve:

1. **Schema Compilation**: 10,000 schemas per second for simple schemas
2. **Validation Speed**: 100,000 validations per second per CPU core
3. **Memory Efficiency**: Maximum 10x schema size memory usage
4. **Latency**: Sub-millisecond validation for small objects
5. **Scalability**: Linear performance scaling with data size

## Error Handling and Recovery

### Schema Compilation Errors

```
Schema Error Types:
  - syntax-error: Invalid schema syntax
  - reference-error: Unresolved schema/type reference
  - circular-reference: Circular schema dependency
  - constraint-error: Invalid constraint specification
  - type-error: Invalid type definition or usage
```

### Validation Error Reporting

```
Error Reporting Requirements:
  1. MUST provide exact error location (path)
  2. MUST include violated constraint information
  3. MUST suggest possible corrections
  4. MUST support error aggregation and filtering
  5. MUST maintain error context for debugging
```

### Error Recovery Strategies

```
Recovery Approaches:
  1. Partial validation: Continue validation after errors
  2. Default value substitution: Use defaults for invalid values
  3. Constraint relaxation: Temporarily relax constraints
  4. Schema fallback: Use simpler schema for validation
  5. Graceful degradation: Provide best-effort results
```

## Thread Safety and Concurrency

### Immutable Schema Design

```
Immutability Requirements:
  - Compiled schemas MUST be immutable after creation
  - Schema modifications MUST create new instances
  - Validation operations MUST be side-effect free
  - Thread-safe concurrent access to schemas
  - No synchronization required for read operations
```

### Concurrent Validation

```
Concurrency Support:
  - Independent validation contexts per thread
  - Parallel validation of array elements
  - Concurrent validation of object members
  - Lock-free validation result aggregation
  - Thread-safe error collection and reporting
```

## Language-Specific Adaptations

### Allowed Variations

While maintaining behavioral consistency, implementations MAY adapt:

1. **Schema Representation**: Use language-appropriate data structures
2. **Validation API**: Provide idiomatic validation interfaces
3. **Error Handling**: Use language-native exception mechanisms
4. **Type System**: Integrate with language type systems
5. **Performance**: Use language-specific optimization techniques

### Required Consistency

All implementations MUST maintain:

1. **Schema Semantics**: Identical schema compilation behavior
2. **Validation Results**: Consistent validation outcomes
3. **Error Codes**: Standardized error code strings
4. **Constraint Behavior**: Identical constraint validation logic
5. **Type Compatibility**: Consistent type checking and conversion

## Specification Compliance

### Validation Checklist

- [ ] Schema definition language fully supported
- [ ] Compilation pipeline implemented correctly
- [ ] All validation algorithms working properly
- [ ] Type system integration complete
- [ ] Reference resolution handles all cases
- [ ] Performance requirements met
- [ ] Error handling provides comprehensive reporting
- [ ] Thread safety verified for concurrent access
- [ ] Memory optimization implemented
- [ ] Custom type registration supported

### Testing Requirements

All implementations MUST pass:

1. **Schema Compilation Tests**: Verify correct schema parsing and compilation
2. **Validation Tests**: Validate all constraint types and combinations
3. **Reference Tests**: Test schema and type reference resolution
4. **Performance Tests**: Meet minimum performance benchmarks
5. **Concurrency Tests**: Verify thread safety and concurrent validation
6. **Error Tests**: Validate error detection and reporting
7. **Type Tests**: Test all built-in and custom types
8. **Edge Case Tests**: Handle malformed schemas and data gracefully

### Version Compatibility

This specification is version 1.0. Future versions will:

1. **Maintain Backward Compatibility**: Existing schemas continue to work
2. **Add New Constraint Types**: New constraint types may be added
3. **Extend Type System**: New built-in types may be added
4. **Improve Performance**: Performance requirements may be increased
5. **Document Changes**: All changes will be clearly documented with migration guides