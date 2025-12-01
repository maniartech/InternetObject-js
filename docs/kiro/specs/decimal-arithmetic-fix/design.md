# Design Document

## Overview

This design document outlines the technical approach for fixing the Decimal class arithmetic operations by implementing robust utility functions and refactoring the existing arithmetic methods. The solution focuses on BigInt-only calculations, consistent rounding behavior, and proper scale alignment to resolve precision handling issues, rounding problems, and inconsistent behavior with different scales.

## Architecture

### Current Issues Analysis

Based on the failing tests and code analysis:
1. **Division precision overflow**: `formatBigIntAsDecimal` function is missing, causing precision errors
2. **Rounding inconsistencies**: Division results like `4.565 / 1.23 = 3.71` returning `3.70`
3. **Scale alignment problems**: Arithmetic operations not properly handling different scales
4. **Intermediate calculation overflow**: Creating values that exceed precision during processing

### Design Principles

1. **KISS (Keep It Simple, Stupid)**: All utility functions will be simple, readable, and maintainable
2. **BigInt-Only**: No use of JavaScript Number class for any calculations
3. **Consistent Behavior**: All arithmetic operations follow the same patterns
4. **Precision Safety**: Avoid intermediate calculations that exceed precision limits

## Components and Interfaces

### Core Utility Functions Module

```typescript
// Core utility functions for Decimal arithmetic operations
interface DecimalUtilities {
  // String formatting utilities
  formatBigIntAsDecimal(coefficient: bigint, scale: number): string;
  
  // Rounding utilities
  roundHalfUp(coefficient: bigint, scale: number, targetScale: number): bigint;
  ceil(coefficient: bigint, scale: number, targetScale: number): bigint;
  floor(coefficient: bigint, scale: number, targetScale: number): bigint;
  
  // Scale operation utilities
  scaleUp(coefficient: bigint, scaleFactor: number): bigint;
  scaleDown(coefficient: bigint, scaleFactor: number): bigint;
  
  // Coefficient utilities
  normalizeCoefficient(coefficient: bigint): { coefficient: bigint; isZero: boolean };
  getAbsoluteValue(coefficient: bigint): bigint;
  getSign(coefficient: bigint): 1 | -1 | 0;
  
  // Precision and validation utilities
  fitToPrecision(coefficient: bigint, precision: number): bigint;
  validatePrecisionScale(coefficient: bigint, precision: number, scale: number): boolean;
  
  // Division utilities
  performLongDivision(dividend: bigint, divisor: bigint, targetScale: number): bigint;
  
  // Operand alignment utilities
  alignOperands(a: Decimal, b: Decimal): { aCoeff: bigint; bCoeff: bigint; commonScale: number };
}
```

### Refactored Arithmetic Methods

The existing arithmetic methods (`add`, `sub`, `mul`, `div`) will be refactored to:
1. Use utility functions for all operations
2. Follow consistent patterns for scale handling
3. Avoid precision overflow during intermediate calculations
4. Return results with proper precision and scale

## Data Models

### Utility Function Parameters

```typescript
interface ArithmeticContext {
  leftOperand: {
    coefficient: bigint;
    scale: number;
    precision: number;
  };
  rightOperand: {
    coefficient: bigint;
    scale: number;
    precision: number;
  };
  targetScale: number;
  targetPrecision: number;
}

interface RoundingContext {
  coefficient: bigint;
  currentScale: number;
  targetScale: number;
  mode: 'round' | 'ceil' | 'floor';
}
```

### Internal Calculation State

```typescript
interface CalculationState {
  intermediateCoefficient: bigint;
  intermediateScale: number;
  requiresRounding: boolean;
  exceedsPrecision: boolean;
}
```

## Implementation Strategy

### Phase 1: Core Utility Functions

#### 1.1 String Formatting Utilities

```typescript
function formatBigIntAsDecimal(coefficient: bigint, scale: number): string {
  // Handle zero case
  if (coefficient === 0n) {
    return scale > 0 ? `0.${'0'.repeat(scale)}` : '0';
  }
  
  // Extract sign and work with absolute value
  const sign = coefficient < 0n ? '-' : '';
  const absCoeff = coefficient < 0n ? -coefficient : coefficient;
  let coeffStr = absCoeff.toString();
  
  // Pad with leading zeros if needed
  while (coeffStr.length <= scale) {
    coeffStr = '0' + coeffStr;
  }
  
  // Split into integer and fractional parts
  const integerPart = coeffStr.slice(0, coeffStr.length - scale) || '0';
  const fractionalPart = scale > 0 ? coeffStr.slice(-scale) : '';
  
  return sign + integerPart + (scale > 0 ? '.' + fractionalPart : '');
}
```

#### 1.2 Rounding Utilities

```typescript
function roundHalfUp(coefficient: bigint, currentScale: number, targetScale: number): bigint {
  if (currentScale <= targetScale) {
    // Scale up by padding zeros
    return coefficient * (10n ** BigInt(targetScale - currentScale));
  }
  
  // Scale down with rounding
  const scaleDiff = currentScale - targetScale;
  const divisor = 10n ** BigInt(scaleDiff);
  const quotient = coefficient / divisor;
  const remainder = coefficient % divisor;
  
  // Round half up logic
  const halfDivisor = divisor / 2n;
  if (remainder >= halfDivisor || (remainder <= -halfDivisor && coefficient < 0n)) {
    return quotient + (coefficient >= 0n ? 1n : -1n);
  }
  
  return quotient;
}
```

#### 1.3 Scale Operation Utilities

```typescript
function scaleUp(coefficient: bigint, scaleFactor: number): bigint {
  return coefficient * (10n ** BigInt(scaleFactor));
}

function scaleDown(coefficient: bigint, scaleFactor: number): bigint {
  return coefficient / (10n ** BigInt(scaleFactor));
}
```

#### 1.4 Division Utilities

```typescript
function performLongDivision(dividend: bigint, divisor: bigint, targetScale: number): bigint {
  if (divisor === 0n) {
    throw new DecimalError('Division by zero');
  }
  
  // Scale up dividend to maintain precision
  const scaledDividend = dividend * (10n ** BigInt(targetScale));
  
  // Perform division
  const quotient = scaledDividend / divisor;
  const remainder = scaledDividend % divisor;
  
  // Round half up if needed
  const halfDivisor = divisor / 2n;
  if (remainder >= halfDivisor || (remainder <= -halfDivisor && dividend < 0n)) {
    return quotient + (dividend >= 0n ? 1n : -1n);
  }
  
  return quotient;
}
```

### Phase 2: Arithmetic Method Refactoring

#### 2.1 Addition Method

```typescript
add(other: Decimal): Decimal {
  const { aCoeff, bCoeff, commonScale } = alignOperands(this, other);
  const resultCoeff = aCoeff + bCoeff;
  const resultStr = formatBigIntAsDecimal(resultCoeff, commonScale);
  return new Decimal(resultStr, this.precision, this.scale);
}
```

#### 2.2 Division Method (Fixed)

```typescript
div(other: Decimal): Decimal {
  if (other.coefficient === 0n) {
    throw new DecimalError('Division by zero');
  }
  
  const resultCoeff = performLongDivision(this.coefficient, other.coefficient, this.scale);
  const resultStr = formatBigIntAsDecimal(resultCoeff, this.scale);
  return new Decimal(resultStr, this.precision, this.scale);
}
```

### Phase 3: Operand Alignment

```typescript
function alignOperands(a: Decimal, b: Decimal): { aCoeff: bigint; bCoeff: bigint; commonScale: number } {
  const targetScale = a.getScale(); // Use first operand's scale as target
  
  let aCoeff = a.getCoefficient();
  let bCoeff = b.getCoefficient();
  
  // Align scales
  if (b.getScale() > targetScale) {
    // Round b to target scale
    bCoeff = roundHalfUp(bCoeff, b.getScale(), targetScale);
  } else if (b.getScale() < targetScale) {
    // Scale up b
    bCoeff = scaleUp(bCoeff, targetScale - b.getScale());
  }
  
  return { aCoeff, bCoeff, commonScale: targetScale };
}
```

## Error Handling

### Precision Overflow Prevention

```typescript
function validateIntermediateResult(coefficient: bigint, precision: number): void {
  const coeffStr = coefficient.toString().replace('-', '');
  if (coeffStr.length > precision) {
    throw new DecimalError(`Intermediate calculation exceeds precision limit (${precision})`);
  }
}
```

### Division by Zero Handling

All division operations will check for zero divisor before performing calculations and throw appropriate `DecimalError`.

### Scale Validation

```typescript
function validateScale(scale: number): void {
  if (scale < 0) {
    throw new DecimalError('Scale cannot be negative');
  }
}
```

## Testing Strategy

### Unit Tests for Utility Functions

Each utility function will have comprehensive test suites covering:

1. **formatBigIntAsDecimal Tests**:
   - Zero coefficients with various scales
   - Negative coefficients
   - Very large coefficients (hundreds of digits)
   - Boundary conditions (scale = 0, maximum scale)

2. **Rounding Function Tests**:
   - Positive, negative, and zero values
   - Boundary rounding cases (exactly 0.5)
   - Very large numbers requiring rounding
   - Scale increase and decrease scenarios

3. **Scale Operation Tests**:
   - Scaling by zero
   - Maximum scale differences
   - Very large coefficients with scaling
   - Precision overflow scenarios

4. **Division Utility Tests**:
   - Division by very small numbers
   - Repeating decimal scenarios
   - Very large dividend/divisor combinations
   - Precision overflow prevention

### Integration Tests

1. **Arithmetic Operation Tests**:
   - All existing test cases must pass
   - Additional edge cases with very large numbers
   - Mixed scale operations
   - Precision boundary testing

2. **Performance Tests**:
   - Operations with coefficients having hundreds of digits
   - Scale alignment with extreme differences
   - Memory usage validation for large operations

## Performance Considerations

### BigInt Optimization

- Minimize BigInt string conversions
- Cache frequently used powers of 10
- Use efficient division algorithms for large numbers

### Memory Management

- Avoid creating unnecessary intermediate BigInt values
- Reuse calculation contexts where possible
- Implement lazy evaluation for complex operations

## Migration Strategy

### Backward Compatibility

- All existing Decimal API methods remain unchanged
- Internal implementation changes are transparent to users
- Existing test suites must continue to pass

### Rollout Plan

1. Implement utility functions with comprehensive tests
2. Refactor arithmetic methods one by one
3. Validate against existing test suites
4. Add new edge case tests
5. Performance validation with large numbers

## Success Criteria

1. All existing tests pass without modification
2. Division operations return correct results (e.g., `4.565 / 1.23 = 3.71`)
3. No precision overflow errors during intermediate calculations
4. Consistent behavior across all arithmetic operations
5. Support for very large numbers (100,000+ times larger than Number.MAX_SAFE_INTEGER)
6. All utility functions have 100% test coverage with edge cases