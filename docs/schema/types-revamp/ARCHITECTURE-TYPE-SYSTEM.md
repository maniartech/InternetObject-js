# Type System Architecture Design

## Executive Summary

This document outlines the architectural design for extending the Internet Object type system to support four distinct operations:
1. **Parse** - Destringify from IO text format to JavaScript values
2. **Load** - Destringify from JavaScript objects to validated JavaScript values
3. **Stringify** - Convert JavaScript values back to IO text format
4. **Validate** - Standalone validation (shared by all operations)

## Current State Analysis

### Existing Implementation
- ✅ **Parse**: Text → JS Value (with validation)
- ✅ **Stringify**: JS Value → Text (partial, no validation)
- ❌ **Load**: Not implemented
- ❌ **Validate**: Embedded in parse, not reusable

### Current Flow
```
Text Input → TokenNode/AST → doCommonTypeCheck() → Type-specific validation → JS Value
```

### Issues Identified
1. **Validation is coupled with parsing** - Cannot validate JS objects directly
2. **Stringify lacks validation** - Current implementation doesn't validate before serialization
3. **No load functionality** - Cannot validate and normalize JS objects
4. **Code duplication risk** - Same validation logic would be duplicated across operations

## Proposed Architecture

### Core Principles (KISS, SRP, DRY)

1. **Single Responsibility Principle (SRP)**
   - Separate validation logic from parsing/loading/serialization
   - Each method has one clear responsibility
   - Validation functions are pure and reusable

2. **Don't Repeat Yourself (DRY)**
   - Extract common validation into reusable functions
   - Share validation between parse, load, and stringify
   - Common type checks remain centralized

3. **Keep It Simple, Stupid (KISS)**
   - Clear separation of concerns
   - Predictable data flow
   - Minimal abstraction layers

### Design Pattern: Strategy + Template Method

```typescript
// Strategy: Each TypeDef implements the same interface
// Template Method: Common flow with hook methods for type-specific behavior
```

## New Architecture

### 1. Simplified TypeDef Interface

```typescript
export default interface TypeDef {
  get type(): string
  get schema(): Schema

  /** Parse: Text (Node/TokenNode) → Validated JS Value */
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): any

  /** Load: JS Value → Validated JS Value */
  load(value: any, memberDef: MemberDef, defs?: Definitions): any

  /** Stringify: Validated JS Value → IO Text */
  stringify(value: any, memberDef: MemberDef, defs?: Definitions): string
}

Note: The earlier `collectionIndex` parameter has been removed from these signatures. Positional context for collection items is now applied only at the collection/object processing boundary when constructing error envelopes. This keeps TypeDef implementations purely focused on value normalization and constraint validation.
```

### 2. Validation Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COMMON VALIDATION                         │
│  doCommonTypeCheck() - null, undefined, default, choices    │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TYPE-SPECIFIC VALIDATION                        │
│    validateValue() - type checks, ranges, patterns, etc.    │
└─────────────────────────────────────────────────────────────┘
```

### 3. Operation Flows

#### Parse Flow (Text → JS)
```
Text/Node
   ↓
Extract value from Node/TokenNode
   ↓
doCommonTypeCheck() [handles: undefined, null, default, choices]
   ↓ [if not handled by common check]
Type check (ensure correct token type)
   ↓
validateValue() [type-specific validation]
   ↓
Return validated value
```

#### Load Flow (JS → Validated JS)
```
JavaScript Value
   ↓
doCommonTypeCheck() [handles: undefined, null, default, choices]
   ↓ [if not handled by common check]
Type check (ensure correct JS type)
   ↓
Type conversion if needed (e.g., string → number for numeric strings)
   ↓
validateValue() [type-specific validation]
   ↓
Return validated value
```

#### Stringify Flow (Validated JS → Text)
```
JavaScript Value
   ↓
doCommonTypeCheck() [handles: undefined, null, choices validation]
   ↓ [if not handled by common check]
validateValue() [ensure value is valid before serialization]
   ↓
Format to IO text (type-specific formatting)
   ↓
Return IO text
```

### 4. Refactored Common Type Check

The `doCommonTypeCheck` function works with both Node and raw values and no longer needs any positional index:

```typescript
type CommonTypeCheckInput = Node | any
type CommonTypeCheckResult = {
  value: any
  handled: boolean // true if common check fully handled (null/undefined/default)
}

/**
 * Performs common validations for all operations
 * Works with both Node objects (parse) and raw values (load/stringify)
 */
function doCommonTypeCheck(
  memberDef: MemberDef,
  input: CommonTypeCheckInput,
  sourceNode?: Node,
  defs?: Definitions,
  equalityComparator?: EqualityComparator
): CommonTypeCheckResult
```

### 5. Type-Specific Validation Function

Each type extracts its validation logic into a separate method:

```typescript
class StringDef implements TypeDef {
  parse(node: Node, memberDef: MemberDef, defs?: Definitions): string {
    const valueNode = defs?.getV(node) || node
    const { value, handled } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (handled) return value
    if (!(valueNode instanceof TokenNode) || valueNode.type !== TokenType.STRING) {
      throw new ValidationError(ErrorCodes.notAString, ...)
    }
    return this.validateValue(valueNode.value, memberDef, valueNode)
  }

  load(value: any, memberDef: MemberDef, defs?: Definitions): string {
    const { value: checkedValue, handled } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (handled) return checkedValue
    if (typeof value !== 'string') {
      throw new ValidationError(ErrorCodes.notAString, ...)
    }
    return this.validateValue(value, memberDef)
  }

  stringify(value: any, memberDef: MemberDef, defs?: Definitions): string {
    const { value: checkedValue, handled } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (handled) {
      if (checkedValue === null) return 'N'
      if (checkedValue === undefined) return ''
      if (typeof checkedValue === 'string') return this.formatToIOText(checkedValue, memberDef)
    }
    const validatedValue = this.validateValue(value, memberDef)
    return this.formatToIOText(validatedValue, memberDef)
  }

  // INTERNAL VALIDATION

  /**
   * Core validation logic shared by parse, load, and stringify
   * Pure function - no side effects except throwing errors
   */
  private validateValue(
    value: string,
    memberDef: MemberDef,
    node?: Node // Optional for error reporting
  ): string {
    // Pattern validation
    this.validatePattern(memberDef, value, node)

    // Length validation
    if (memberDef.len !== undefined && value.length !== memberDef.len) {
      throw new ValidationError(ErrorCodes.invalidLength, ...)
    }

    if (memberDef.maxLen !== undefined && value.length > memberDef.maxLen) {
      throw new ValidationError(ErrorCodes.invalidMaxLength, ...)
    }

    if (memberDef.minLen !== undefined && value.length < memberDef.minLen) {
      throw new ValidationError(ErrorCodes.invalidMinLength, ...)
    }

    return value
  }

  // INTERNAL HELPER

  private formatToIOText(value: string, memberDef: MemberDef): string {
    const format = memberDef.format || 'auto'
    switch (format) {
      case 'auto':
        return strings.toAutoString(value, memberDef.escapeLines, memberDef.encloser)
      case 'open':
        return strings.toOpenString(value, memberDef.escapeLines)
      case 'regular':
        return strings.toRegularString(value, memberDef.escapeLines, memberDef.encloser)
      default:
        return strings.toRawString(value, memberDef.encloser)
    }
  }
}
```

## Implementation Strategy

### Phase 1: Refactor Common Type Check ✅
1. Update `doCommonTypeCheck` signature to return `{ value, handled }`
2. Make it work with both Node and raw values
3. Update all existing TypeDefs to use new signature
4. Add comprehensive tests

### Phase 2: Extract Validation Logic ✅
1. For each TypeDef, extract validation into private `validateValue()` method
2. Update `parse()` to use `validateValue()`
3. Ensure all tests still pass
4. Add validation-specific unit tests

### Phase 3: Implement Load ✅
1. Add `load()` method to TypeDef interface
2. Implement `load()` in each TypeDef
3. Add type checking and conversion logic
4. Add comprehensive tests for load functionality

### Phase 4: Enhance Stringify ✅
1. Update existing `stringify/stringify` methods
2. Add validation before serialization
3. Handle edge cases (null, undefined)
4. Add comprehensive tests

### Phase 5: Integration & Testing ✅
1. Update object-processor to support load operation
2. Update high-level API (InternetObject class)
3. Integration tests for all four operations
4. Performance benchmarking
5. Documentation

## Error Handling Strategy

### Consistent Error Reporting
```typescript
// Parse errors include node position
throw new ValidationError(code, message, node)

// Load/Stringify errors include path
throw new ValidationError(code, message, undefined, { path: memberDef.path })

// All errors include memberDef.path for context
```

### Error Context
- **Parse**: Line/column from Node
- **Load**: Path from memberDef
- **Stringify**: Path from memberDef
- **Validate**: Path from memberDef

## Type Conversion Strategy

### Strict vs Coercive Loading

```typescript
// Option 1: Strict (recommended for initial implementation)
// No automatic type conversion - throw error if types don't match
load(value: any, memberDef: MemberDef): string {
  if (typeof value !== 'string') {
    throw new ValidationError(ErrorCodes.invalidType, ...)
  }
  return this.validate(value, memberDef)
}

// Option 2: Coercive (future enhancement)
// Allow reasonable conversions (e.g., number → string)
load(value: any, memberDef: MemberDef, options?: { coerce?: boolean }): string {
  if (typeof value !== 'string') {
    if (options?.coerce && (typeof value === 'number' || typeof value === 'boolean')) {
      value = String(value)
    } else {
      throw new ValidationError(ErrorCodes.invalidType, ...)
    }
  }
  return this.validate(value, memberDef)
}
```

**Decision**: Start with strict mode for predictability and safety.

## File Structure

### Current Structure
```
src/schema/types/
  ├── common-type.ts       # Common validation utilities
  ├── string.ts            # String type implementation
  ├── number.ts            # Number type implementation
  ├── boolean.ts           # Boolean type implementation
  ├── array.ts             # Array type implementation
  ├── object.ts            # Object type implementation
  ├── datetime.ts          # DateTime type implementation
  ├── decimal.ts           # Decimal type implementation
  ├── bigint.ts            # BigInt type implementation
  └── any.ts               # Any type implementation
```

### Updated Structure (No Changes Needed)
Same structure - all changes are internal to existing files.

## Testing Strategy

### Unit Tests (Per TypeDef)
```typescript
describe('StringDef', () => {
  describe('parse', () => {
    // Existing tests remain
  })

  describe('load', () => {
    it('should validate valid string')
    it('should throw on invalid type')
    it('should apply length constraints')
    it('should apply pattern constraints')
    it('should handle null when allowed')
    it('should handle undefined with default')
    it('should validate choices')
  })

  describe('stringify', () => {
    it('should format string correctly')
    it('should validate before serialization')
    it('should handle special characters')
    it('should respect format option')
    it('should handle null/undefined')
  })

  describe('validate', () => {
    it('should validate all constraints')
    it('should not modify value')
  })
})
```

### Integration Tests
```typescript
describe('Type System Integration', () => {
  it('should parse, stringify, and parse again (round-trip)')
  it('should load JS object, stringify, and parse correctly')
  it('should handle complex nested structures')
  it('should validate consistently across all operations')
})
```

## Performance Considerations

### Optimization Strategies
1. **Validation Caching**: Cache compiled regex patterns in memberDef
2. **Fast Path**: Skip validation for trusted internal operations
3. **Lazy Validation**: Validate only when needed
4. **Batch Operations**: Process arrays/objects efficiently

### Benchmarking Targets
- Parse: Current performance maintained
- Load: < 10% slower than parse
- Stringify: < 20% slower than current stringify
- Validate: < 5% overhead vs inline validation

## Migration Path

### Backward Compatibility
- ✅ Existing `parse()` method unchanged
- ✅ Existing `stringify()` method enhanced (validates now)
- ✅ New methods (`load()`) are additive
- ✅ No breaking changes to public API

### Deprecation Strategy (None Needed)
All changes are additive - no deprecations required.

## Code Quality Standards

### TypeScript Best Practices
- ✅ Strict type checking enabled
- ✅ No `any` types without justification
- ✅ Comprehensive JSDoc comments
- ✅ Consistent naming conventions

### Code Review Checklist
- [ ] DRY: No duplicated validation logic
- [ ] SRP: Each method has single responsibility
- [ ] KISS: Simple, readable code
- [ ] Error messages are clear and actionable
- [ ] All edge cases handled
- [ ] Tests cover all code paths
- [ ] Performance impact measured

## Example: Complete StringDef Implementation

See Section 5 above for detailed example showing:
- Clear separation of concerns
- DRY validation logic
- KISS implementation
- SRP adherence
- Comprehensive error handling

## Conclusion

This architecture provides:
1. ✅ **Clean separation** of validation from parsing/loading/serialization
2. ✅ **Reusable validation** logic (DRY)
3. ✅ **Simple, maintainable** code (KISS)
4. ✅ **Single responsibility** for each method (SRP)
5. ✅ **Backward compatible** with existing code
6. ✅ **Extensible** for future type additions
7. ✅ **Well-tested** with comprehensive coverage
8. ✅ **Type-safe** with full TypeScript support

## Next Steps

1. Review and approve this architecture document
2. Create implementation tasks for each phase
3. Begin Phase 1 implementation
4. Iterate based on code review feedback

---

**Document Version**: 1.1 (collectionIndex removed from TypeDef contract)
**Date**: November 18, 2025
**Status**: Pending Review
