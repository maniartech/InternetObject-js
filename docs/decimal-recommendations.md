
# Pending Recommendations for Decimal Arithmetic Implementation

This document lists only the recommendations that are not yet implemented or require further review, based on the current codebase and RDBMS standards.

## 1. Decimal Comparison (RDBMS Standard Alignment)

### 1.1 Comparison Method

- The `compareTo` method should align both operands to the same scale (using the higher scale of the two), then compare the coefficients.
- The current implementation throws an error if precision or scale differ, which does **not** match RDBMS/SQL behavior. In SQL, decimals of different precision/scale are always comparable after scale alignment.
- **Recommendation:**
    - Update `compareTo` to align scales before comparison, returning -1, 0, or 1 as per standard.
    - Update all public comparison helpers (`equals`, `lessThan`, etc.) to use the improved `compareTo`.

### 1.2 Test Coverage

- Add tests for comparing decimals with different scales and precisions, including edge cases (e.g., 1.23 vs 1.2300, 1.23 vs 1.24, negative values, etc.).

## 2. Division and Complex Operation Scale Handling

- The division logic (`performLongDivision` and `div` method) does not correctly account for the scales of the dividend and divisor, leading to incorrect results in some cases.
- In complex operations, scales are not always tracked and adjusted correctly, causing errors in multi-step calculations.
- **Recommendation:**
    - Update `performLongDivision` and `div` to properly handle input scales, so that results match RDBMS/SQL expectations.
    - Add or update helper functions to manage and propagate scales correctly in all arithmetic operations.
    - Add tests for division and complex expressions, especially with mixed scales.

## 3. Rounding and Precision Overflow

- Ensure that all arithmetic operations (add, sub, mul, div) round results to the target scale using the correct rounding mode (typically round-half-up by default, as in SQL).
- When a result exceeds the allowed precision, attempt to fit by reducing scale if possible, otherwise throw an error.
- **Recommendation:**
    - Review and update rounding logic in all arithmetic methods to match RDBMS standards.
    - Add tests for rounding and overflow scenarios.

## 4. Documentation and API Clarity

- Improve API documentation to clearly state:
    - How precision and scale are handled in each operation.
    - That comparison between decimals of different precision/scale is supported (after update).
    - Rounding and overflow behavior.

## 5. Additional Testing

- Add or expand tests for:
    - Maximum precision/scale edge cases.
    - Operations with very large/small numbers.
    - Negative values and zero.
    - Integration tests for multi-step expressions.

---



## RDBMS/SQL Standard for Addition Result Precision and Scale

- **RDBMS/SQL standard:**
    - Result scale: `scale = max(s1, s2)`
    - Result precision: `precision = max(p1 - s1, p2 - s2) + scale + 1`
    - Where `p1, s1` are the precision and scale of the first operand, and `p2, s2` are those of the second operand.

- **Serialization/Data Interchange (Internet Object) standard:**
    - There is no artificial system precision limit (such as 38 digits in RDBMS).
    - Precision in the results should be expanded as needed to accommodate the calculated value, unless the value cannot be represented by the underlying data type (e.g., BigInt limits).
    - Only throw an error if the integer part cannot be represented, not due to arbitrary system limits.

---

## Review of Current Public Methods vs. RDBMS Standards

### Methods that **do not** fully match RDBMS/SQL standards:

- `compareTo` and all comparison helpers: Require same precision/scale, but should align and compare as in SQL.
- `div` (and division helpers): Scale handling does not always match SQL, especially for mixed-scale operands.

### Methods that **do** match RDBMS/SQL standards (as of current code):

- `add`, `sub`, `mul`: These methods align scales and check for overflow, which is consistent with RDBMS behavior, but rounding and overflow handling should be reviewed for edge cases.

---

**Action Plan:**

1. Update `compareTo` and related helpers to align scales and match RDBMS comparison semantics.
2. Refactor division and scale management logic to ensure correct results for all operand combinations.
3. Review and improve rounding/overflow handling in all arithmetic methods.
4. Expand and improve test coverage for all edge cases and multi-step operations.
5. Update documentation to reflect these changes and clarify API behavior.