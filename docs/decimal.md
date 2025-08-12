# Decimal type: design, semantics, and usage

This document describes the InternetObject Decimal implementation used across parsing and schema layers. It focuses on correctness (RDBMS-like precision/scale semantics), predictable rounding, and performance.

## Concepts

- Precision (p): total count of significant digits in the value (excluding sign and decimal point).
- Scale (s): count of digits to the right of the decimal point.
- Coefficient: a bigint representing the unscaled integer value. For example, value `-12.345` at scale 3 has coefficient `-12345n`.

The class aims to keep operations deterministic and safe with BigInt (no float), with clear rules for result scale and rounding.

## Construction

- new Decimal(value: string | number | Decimal, precision?: number, scale?: number)
  - String input is preferred for exactness.
  - Number input is parsed to string first (avoid if exactness is critical).
  - When precision and scale are provided alongside a string/number, the value is normalized to that scale using round half up.

Examples:

- `new Decimal('123.45')` → p=5, s=2
- `new Decimal('-0.004', 4, 3)` → normalized scale=3, p computed from digits

## Arithmetic semantics

The library follows repository-wide, RDBMS-inspired behavior and tests. Result precision is derived from actual digits of the computed coefficient; result scale follows predictable policies per operation:

- Addition/Subtraction: result scale = max(sA, sB). Operands are aligned to this scale, then added/subtracted; rounding is not needed beyond alignment. Carry/borrow can increase integer digits (precision grows as needed).
- Multiplication: intermediate scale = sA + sB; result is rounded/adjusted to target scale = max(sA, sB).
- Division: result scale = sB (divisor’s scale). Numerator is scaled using exponent T + sB − sA (where T is target scale); final result is rounded half up using remainder. Direction of rounding is based on the true mathematical sign of the result (important for zero-quotient negative cases).
- Modulo: aligns operands to scale = max(sA, sB); q = trunc toward zero of a/b; r = a − q·b. Result scale = max(sA, sB). Remainder sign matches dividend.

Rounding mode: Round half up (5 rounds away from zero). When scale is reduced, half-up rounding applies; when scale is increased, zeros are appended.

Division by zero throws DecimalError.

## Comparison

- `compareTo(other)` throws if structures differ (precision/scale policy per repo tests). Use when both values are intended to be on the same structure.
- Convenience methods: `equals`, `lt`, `gt`, `lte`, `gte` are based on `compareTo`.

## API surface

- `toString()` → normalized string honoring current scale.
- `getPrecision()` → number of digits (excluding sign/point).
- `getScale()` → scale.
- Arithmetic: `add`, `sub`, `mul`, `div`, `mod`.
- Comparison: `compareTo`, `equals`, `lt`, `gt`, `lte`, `gte`.
- Utilities: `Decimal.ensureDecimal(value)` coerces to Decimal.

## Edge cases covered by tests

- Negative division rounding at zero scale (e.g., -1/3 → 0 with correct rounding direction; -1/2 → -1 at scale 0).
- Extreme precision values (hundreds of digits) using pure BigInt exponentiation.
- Mixed-scale multiplication and division with correct rounding to target scales.
- Modulo with varying scales and sign behavior.

## Performance

BigInt operations are efficient for typical document/workload sizes. See the Decimal benchmark script to measure add/sub/mul/div/mod throughput and constructor overhead at different scales.

Run:

```bash
yarn perf:decimal
```

The script will print a summary table with average times per operation across many iterations.

## Notes and future work

- Internally there are multiple rounding helpers; a future cleanup could consolidate to one canonical implementation without changing behavior.
- Comparison across different declared structures could optionally auto-align, but current tests expect strict matching.
