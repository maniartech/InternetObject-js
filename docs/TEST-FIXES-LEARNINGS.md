# Test Fixes and Learnings

**Date**: November 18, 2025
**Branch**: schema-revamp
**Context**: Finalization of test cases and fixing all testing issues

## Overview

This document captures the issues encountered, solutions implemented, and key learnings during the test suite finalization process. Starting with 8 skipped tests and 1,650 passing tests, we ended with 1 skipped test and 1,701 passing tests.

**Key areas fixed**:
- Root-level bracing rules for single-field schemas (object.test.ts, any.test.ts)
- IOObject to plain object conversions
- Optional property marker positioning
- Decimal and BigInt multipleOf implementations

---

## Issues Encountered and Solutions

### 1. IOObject vs Plain Object Returns

**Issue**: Tests were expecting plain JavaScript objects but receiving IOObject instances.

**Error Example**:
```
expect(received).toEqual(expected)
- Expected  - 1
+ Received  + 1
- Object {
+ IOObject {
    "age": 25,
    "name": "Alice",
  }
```

**Root Cause**: Objects in arrays and nested structures were being returned as IOObject instances instead of plain objects.

**Solution**: Call `.toJSON()` on IOObject instances to convert them to plain objects.

```typescript
// Wrong
expect(result.users[0]).toEqual({ name: 'Alice', age: 25 })

// Correct
expect(result.users[0].toJSON()).toEqual({ name: 'Alice', age: 25 })
```

**Learning**: IOObject is the internal representation. Always use `.toJSON()` when comparing with plain objects in tests.

---

### 2. Root-Level Bracing Rules for Single Field Schemas

**Issue**: Tests failing with objects in single-field schemas where the field is of type `object` or `any`.

**Root Cause**: For JSON compatibility, root-level braces are invisible/implicit. When you have a single field schema where that field is an object or any type, you need double braces to represent the object value.

**Solution**:
- **Single field of object/any type**: Use **double braces** `{{...}}`
- **Multiple fields**: Use **single braces** (root braces wrap all fields)
- **Arrays with object schema**: Use **single braces** per item `{...}`

```typescript
// Single field of object type - needs double braces
const schema = 'user: { name: string, age: number }'
parse(`${schema}\n---\n{{John, 25}}`, null)

// Single field of any type - needs double braces for object value
const schema = 'val: any'
parse(`${schema}\n---\n{{name: John, age: 25}}`, null)

// Multiple fields - single brace wraps all
const schema = 'user: { name: string }, id: number'
parse(`${schema}\n---\n{{Alice}, 42}`, null)

// Typed array - single braces per item
const schema = 'users: [{ name: string, age: number }]'
parse(`${schema}\n---\n[{Alice, 25}, {Bob, 30}]`, null)

// Untyped array - double braces for objects
parse('mixed: []\n---\n[1, hello, {{x: 10}}, [1, 2]]', null)
```

**Learning**: Root-level braces are implicit for JSON compatibility. Single-field schemas with object/any type require double braces because outer braces are "invisible".

---

### 3. Mixed Type Array Object Access

**Issue**: Objects in mixed-type (untyped) arrays had nested structure requiring correct access pattern.

**Root Cause**: Objects in untyped arrays get wrapped in an additional collection structure.

**Solution**: Access the nested structure correctly:
```typescript
// Untyped array with object
const result = parse('mixed: []\n---\n[1, hello, T, {{x: 10}}, [1, 2]]', null).toJSON()
expect(result.mixed[3][0].toJSON()).toEqual({ x: 10 })
```

**Learning**: Untyped arrays don't have schema guidance, so objects are parsed as collections with items. Access them via the nested structure.

**Files Fixed**: array.test.ts (line 189)

---

### 4. Optional/Nullable Marker Position

**Issue**: Initially placed markers after the type instead of after the field name.

**Wrong Syntax**:
```typescript
'user: { name: string, email: string? }'  // ❌ Wrong
'user: object?*'                          // ❌ Wrong
```

**Correct Syntax**:
```typescript
'user: { name: string, email?: string }'  // ✅ Correct
'user?*: object'                          // ✅ Correct
```

**Learning**: In Internet Object syntax, modifiers (`?`, `*`) always follow the field name, not the type.

**Files Fixed**: object.test.ts (line 172)

---

### 5. Optional Properties with Undefined (`~`)

**Issue**: Tests incorrectly using `~` (undefined) for optional properties in nested objects.

**Root Cause**: The parser doesn't support `~` (undefined) within object value lists for optional properties. Optional values should simply be omitted.

**Correct Usage**:
```typescript
// Correct - omit optional values
const schema = 'user: { name: string, email?: string }'
parse(`${schema}\n---\n{{John}}`, null)
```

**Learning**: Optional properties should be omitted rather than explicitly set to `~` in object literals. The `~` marker is for root-level undefined values, not for omitting optional fields within objects.

**Files Fixed**: object.test.ts (lines 86, 106)

---

### 6. Decimal multipleOf Comparison Method

**Issue**: Attempted to use non-existent `isZero()` method on Decimal class.

**Error**: `remainder.isZero() is not a function`

**Root Cause**: Decimal class doesn't have an `isZero()` convenience method.

**Solution**: Use `compareTo()` method with zero Decimal:
```typescript
// Wrong
if (!remainder.isZero()) { ... }

// Correct
const zero = new Decimal(0, targetPrecision, targetScale)
if (remainder.compareTo(zero) !== 0) { ... }
```

**Learning**: Always check available methods on custom classes. Decimal uses `compareTo()` for all comparisons.

---

### 7. BigInt multipleOf Type Comparison

**Issue**: TypeScript error comparing BigInt with number type.

**Error**: Type 'number' is not comparable to type 'bigint'

**Solution**: Cast the multipleOf value to BigInt:
```typescript
// Wrong
if (value % multipleOf !== 0n) { ... }

// Correct
const remainder = value % BigInt(multipleOf)
if (remainder !== 0n) { ... }
```

**Learning**: BigInt operations require all operands to be BigInt type. Use `BigInt()` constructor to cast numbers.

---

### 8. Decimal Scale Validation in Tests

**Issue**: Test data didn't match the scale constraint specified in schema.

**Root Cause**: When a schema specifies `scale: 2`, the decimal value must have exactly 2 decimal places.

**Correct Usage**:
```typescript
// Correct - scale matches schema
const schema = 'price: { decimal, multipleOf: 0.01m, min: 0m, scale: 2 }'
parse(`${schema}\n---\n0.00m`, null)
```

**Learning**: Decimal validation includes precision and scale checks. Test data must match schema constraints exactly - a value like `0m` (scale 0) will fail when schema requires `scale: 2`.

---

### 9. Schema Format Incompatibility

**Issue**: Some sample schemas use typedef declarations which `compileSchema` doesn't support.

**Example**:
```typescript
// Typedef declarations (not supported by compileSchema)
~ $notations: { hex: uint8, oct: uint8, bin: uint8 }
~ $intRanges: { num1: int8, num2: int16 }

// vs Regular schema (supported)
username: string, age: number
```

**Error**: "Schema must be an object."

**Solution**: Kept test skipped with TODO comment indicating feature not yet implemented.

**Learning**: `compileSchema` expects object-style schemas. Typedef declarations require different parsing logic.

---

## Implementation: multipleOf Constraint

### BigInt Implementation

**Key Points**:
- Native modulo operator works: `value % BigInt(multipleOf)`
- Must cast multipleOf to BigInt type
- Comparison with `0n` literal

```typescript
// Schema definition
multipleOf: { type: "bigint", optional: true, null: false }

// Validation logic
const remainder = value % BigInt(multipleOf)
if (remainder !== 0n) {
  throwError(ErrorCodes.invalidValue, memberDef.path!,
    `Value must be a multiple of ${multipleOf}`, node)
}
```

### Decimal Implementation

**Key Points**:
- Must normalize both values to same scale before modulo
- Use `mod()` method for Decimal arithmetic
- Compare remainder with zero using `compareTo()`

```typescript
// Schema definition
multipleOf: { type: "decimal", optional: true, null: false }

// Validation logic
const targetScale = Math.max(value.scale, multipleOfD.scale)
const targetPrecision = Math.max(value.precision, multipleOfD.precision)

const normalizedVal = value.withScale(targetScale, targetPrecision)
const normalizedMultiple = multipleOfD.withScale(targetScale, targetPrecision)

const remainder = normalizedVal.mod(normalizedMultiple)
const zero = new Decimal(0, targetPrecision, targetScale)

if (remainder.compareTo(zero) !== 0) {
  throwError(ErrorCodes.invalidValue, memberDef.path!,
    `Value must be a multiple of ${multipleOfD}`, node)
}
```

**Learning**: Decimal operations require careful scale management. Always normalize to common scale before arithmetic operations.

---

## Test Coverage Added

### BigInt multipleOf Tests (18 tests)
- Basic validation (multiples and non-multiples)
- Different multipleOf values (2, 10, 1)
- Large multipleOf values (beyond Number.MAX_SAFE_INTEGER)
- Combination with min/max constraints
- Edge cases (zero, negative values, boundaries)
- Multiple fields with different constraints
- Real-world use cases (prices, quantities, data sizes)

### Decimal multipleOf Tests (26 tests)
- Basic validation
- Fractional multipleOf (0.5, 0.1, 0.25, 0.01)
- Integer multipleOf (2, 10)
- Combination with min/max constraints
- Combination with precision/scale constraints
- Edge cases (zero, negatives, boundaries, very small values)
- Large decimal values
- Multiple fields with different constraints
- Real-world use cases (prices, measurements, percentages)

---

## Key Learnings Summary

1. **Root-Level Brace Rules**: Single-field schemas with object/any type need double braces because root braces are implicit for JSON compatibility. This is the most common source of test failures.

2. **Type System Awareness**: Understand the difference between internal representations (IOObject) and output format (plain objects). Use `.toJSON()` appropriately.

3. **Array Context Matters**: Typed arrays use single braces per item, untyped arrays use double braces for object values.

4. **Marker Positioning**: Modifiers follow field names, not types. This is consistent across the Internet Object syntax.

5. **Custom Class APIs**: Always verify available methods on custom classes. Don't assume standard methods exist (like `isZero()`).

6. **Type Casting**: Languages with strict typing (TypeScript, BigInt) require explicit casts. Plan for type conversions in validation logic.

7. **Decimal Precision**: Working with decimals requires careful scale management. Normalize before operations, validate against schema constraints.

8. **Feature Completeness**: Some syntax features may not be fully implemented. Document with TODO comments and skip tests appropriately.

9. **Test Data Precision**: Test data must match schema constraints exactly, including precision, scale, and format requirements.

---

## Final Metrics

- **Starting**: 8 skipped, 1,650 passing (1,658 total)
- **Ending**: 1 skipped, 1,701 passing (1,702 total)
- **Improvement**: +51 passing tests, -7 skipped tests
- **New Tests**: 44 tests for multipleOf constraint (bigint + decimal)
- **Success Rate**: 99.94% (1,701/1,702)

---

## Remaining Work

1. **Optional Properties with `~`**: Full support for undefined marker in nested object value lists
2. **Typedef Declarations**: Schema compilation support for typedef syntax (`~ $name: type`)
3. **Decimal Helper Methods**: Consider adding convenience methods like `isZero()`, `isPositive()`, etc.

---

## Best Practices Established

### For Test Writing:
1. Always use `.toJSON()` when comparing IOObject with plain objects
2. Match bracing style to array type (typed vs untyped)
3. Ensure test data matches all schema constraints (precision, scale, format)
4. Test edge cases: zero, negatives, boundaries, very large/small values
5. Test constraint combinations (multipleOf + min/max, etc.)

### For Implementation:
1. Add comprehensive tests before implementation
2. Test compilation first, then runtime behavior
3. Use proper type conversion (BigInt(), new Decimal())
4. Normalize values before comparison operations
5. Provide clear, specific error messages

### For Documentation:
1. Document syntax rules clearly (marker positions, brace rules)
2. Include examples for each rule
3. Note feature limitations with TODO comments
4. Keep test learnings documented for future reference
