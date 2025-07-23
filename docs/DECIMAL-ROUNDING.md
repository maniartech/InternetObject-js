# High-Precision Decimal Rounding in Internet Object

## Introduction

Accurate decimal arithmetic is critical for financial, scientific, and database applications. The Internet Object project implements a robust, RDBMS-style decimal number system in JavaScript/TypeScript, supporting high-precision calculations and industry-standard rounding behaviors. This article details the design, implementation, and best practices for decimal rounding in Internet Object, focusing on the `Decimal` class and its utility functions.

---

## Decimal Representation

A decimal number is represented by three key properties:
- **Coefficient**: The integer value (as a `BigInt`) representing the significant digits.
- **Precision (P)**: The total number of significant digits.
- **Scale (S)**: The number of digits after the decimal point.

For example, the value `123.45` with precision 5 and scale 2 is stored as:
- Coefficient: `12345n`
- Precision: `5`
- Scale: `2`

---

## Rounding Methods

Internet Object provides three main rounding methods, mirroring RDBMS and financial standards:

### 1. Round-Half-Up (`round`)
- **Behavior**: Rounds to the nearest value; if exactly halfway, rounds away from zero.
- **Industry Standard**: Matches SQL `ROUND()` and most financial systems.
- **Examples:**
  - `1.25` rounded to 1 decimal → `1.3`
  - `-1.25` rounded to 1 decimal → `-1.3`
  - `0.5` rounded to integer → `1`
  - `-0.5` rounded to integer → `-1`

### 2. Ceiling (`ceil`)
- **Behavior**: Always rounds up (towards positive infinity). For negative numbers, this means rounding towards zero.
- **Industry Standard**: Matches SQL `CEILING()`.
- **Examples:**
  - `1.21` ceiled to 1 decimal → `1.3`
  - `-1.21` ceiled to 1 decimal → `-1.2`
  - `0.1` ceiled to integer → `1`
  - `-0.1` ceiled to integer → `0`

### 3. Floor (`floor`)
- **Behavior**: Always rounds down (towards negative infinity). For positive numbers, this means rounding towards zero.
- **Industry Standard**: Matches SQL `FLOOR()`.
- **Examples:**
  - `1.29` floored to 1 decimal → `1.2`
  - `-1.29` floored to 1 decimal → `-1.3`
  - `0.9` floored to integer → `0`
  - `-0.9` floored to integer → `-1`

---

## Precision and Scale Conversion

When converting a decimal to a new precision and/or scale, the following rules apply:

### Increasing Scale (Target S > Source S)
- Pads with zeros to the right (no rounding needed).
- Example: `1.23` (3,2) → (5,4) → `1.2300`

### Decreasing Scale (Target S < Source S)
- Rounds or truncates using the selected method.
- Example: `1.236` (4,3) → (3,1):
  - `round`: `1.2` or `1.3` (depending on value)
  - `ceil`: `1.3`
  - `floor`: `1.2`

### Increasing Precision (Target P > Source P)
- No change to value, but more digits are allowed.

### Decreasing Precision (Target P < Source P)
- If the value fits, no change. If not, error (overflow).
- Example: `123.45` (5,2) → (4,2) → Error

---

## Special Cases

- **Zero and Integers**: Rounding preserves zero and integer values, only adjusting scale/format.
- **Negative Numbers**: Rounding direction is handled correctly for all methods.
- **Large Numbers**: All operations use `BigInt` for unlimited precision.

---

## Implementation Highlights

- All arithmetic uses `BigInt` to avoid floating-point errors.
- Rounding methods are implemented in both the `Decimal` class and utility functions for flexibility.
- Edge cases (boundary values, carry-over, extreme precision/scale) are thoroughly tested.
- Errors are thrown for invalid conversions (e.g., target precision too small).

---

## Example Table

| Source Value | Source (P,S) | Target (P,S) | round   | ceil    | floor   |
|--------------|--------------|--------------|---------|---------|---------|
| 1.236        | (4,3)        | (3,1)        | 1.2/1.3 | 1.3     | 1.2     |
| 1.23         | (3,2)        | (5,4)        | 1.2300  | 1.2300  | 1.2300  |
| 123.45       | (5,2)        | (4,2)        | Error   | Error   | Error   |
| -1.25        | (3,2)        | (3,1)        | -1.3    | -1.2    | -1.3    |
| 0.00         | (3,2)        | (5,4)        | 0.0000  | 0.0000  | 0.0000  |

---

## Best Practices

- Always check if the value fits the target precision before converting.
- Use the appropriate rounding method for your use case (financial, scientific, etc.).
- For database compatibility, use `round` for SQL `ROUND()`, `ceil` for `CEILING()`, and `floor` for `FLOOR()`.
- Handle errors gracefully when conversions are not possible.

---

## Conclusion

The Internet Object decimal implementation provides robust, RDBMS-compatible decimal arithmetic with precise, predictable rounding. By following these standards and best practices, you can ensure correctness and compatibility in all high-precision numeric applications.
