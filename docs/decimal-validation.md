# Decimal Type Validation

## Overview

The `decimal` type in Internet Object provides flexible yet precise validation for decimal numbers, supporting both natural comparison and strict format enforcement.

## Schema Properties

| Property | Type | Description |
|----------|------|-------------|
| `precision` | number | Maximum total number of significant digits (integer + fractional) |
| `scale` | number | Exact number of decimal places required |
| `min` | decimal | Minimum allowed value (inclusive) |
| `max` | decimal | Maximum allowed value (inclusive) |

## Validation Modes

### 1. Natural Comparison (Default)

When neither `precision` nor `scale` is specified, values are compared naturally without format restrictions.

```io
~ num: { decimal, min: 0, max: 1000 }
---
99.9m       # ✅ Valid
99.90m      # ✅ Valid (treated as equal to 99.9)
123.456m    # ✅ Valid
0.001m      # ✅ Valid
```

**Behavior:**
- Values automatically normalized for min/max comparison
- Trailing zeros ignored
- Focus on numeric value, not representation

**Use cases:**
- General numeric input
- Scientific calculations
- User-facing forms where format doesn't matter

---

### 2. Scale-Only Validation

When only `scale` is specified, values must have exactly that many decimal places.

```io
~ amount: { decimal, scale: 2, min: 0, max: 10000 }
---
99.90m      # ✅ Valid (exactly 2 decimal places)
99.9m       # ❌ Invalid (scale is 1, expected 2)
99.900m     # ❌ Invalid (scale is 3, expected 2)
100m        # ❌ Invalid (scale is 0, expected 2)
```

**Behavior:**
- Enforces exact number of decimal places
- Min/max comparison uses natural comparison (normalized to specified scale)
- Precision is flexible (auto-calculated from value)

**Use cases:**
- Currency amounts (e.g., USD requires scale: 2)
- Percentages (e.g., scale: 2 for "99.99%")
- Tax rates, interest rates
- Any domain requiring fixed decimal places

---

### 3. Precision-Only Validation

When only `precision` is specified, values must not exceed that total number of significant digits.

```io
~ value: { decimal, precision: 5, min: 0, max: 99999 }
---
123.45m     # ✅ Valid (5 significant digits: precision 5, scale 2)
12345m      # ✅ Valid (5 significant digits: precision 5, scale 0)
0.12345m    # ✅ Valid (5 significant digits: precision 5, scale 5)
123456m     # ❌ Invalid (6 significant digits, exceeds precision 5)
1234.567m   # ❌ Invalid (7 significant digits, exceeds precision 5)
```

**Behavior:**
- Validates total significant digits (integer + fractional parts)
- Scale can vary freely
- Min/max comparison uses natural comparison

**Use cases:**
- Scientific measurements with precision limits
- Sensor data with known accuracy bounds
- Display fields with character width constraints

---

### 4. Strict Format Validation

When both `precision` AND `scale` are specified, values must match the exact format (like SQL `DECIMAL(precision, scale)`).

```io
~ price: { decimal, precision: 10, scale: 2, min: 0, max: 99999999.99 }
---
1234.56m    # ✅ Valid (precision 6, scale 2 - fits within 10,2)
99.90m      # ✅ Valid (precision 4, scale 2 - fits within 10,2)
99.9m       # ❌ Invalid (scale is 1, expected 2)
99.900m     # ❌ Invalid (scale is 3, expected 2)
12345678.90m # ✅ Valid (precision 10, scale 2 - exactly fits)
123456789.00m # ❌ Invalid (needs 11 precision: 9 integer + 2 scale)
```

**Behavior:**
- Value must have exactly the specified scale
- Value's total precision must fit within specified precision
- Equivalent to SQL `DECIMAL(precision, scale)`
- Min/max comparison uses natural comparison (all values already same format)

**Formula:**
```
Integer digits allowed = precision - scale
Total significant digits = precision
Decimal places required = scale (exact)
```

**Use cases:**
- Database column mapping (SQL DECIMAL columns)
- Financial systems requiring exact format compliance
- Data exchange formats with strict schemas
- Regulatory compliance (exact decimal representation)

---

## Min/Max Comparison Behavior

**All validation modes use natural comparison for min/max:**

| Mode | Format Validation | Min/Max Comparison |
|------|------------------|-------------------|
| **Neither** | None | Normalize dynamically, compare numerically |
| **Scale only** | Must have exact scale | Normalize to specified scale, compare numerically |
| **Precision only** | Must not exceed precision | Normalize to max precision needed, compare numerically |
| **Both** | Must match exact precision AND scale | Compare numerically (already same format) |

### Example: Scale-Only Comparison

```io
~ amount: { decimal, scale: 2, min: 10.00, max: 100.00 }
---
50.00m      # ✅ Valid (10.00 ≤ 50.00 ≤ 100.00)
9.99m       # ❌ Invalid (9.99 < 10.00)
100.01m     # ❌ Invalid (100.01 > 100.00)
```

Even though scale is enforced, the comparison `9.99 < 10.00` is natural/numeric.

---

## Precision vs Scale

**Precision:** Total number of significant digits (integer + fractional)
```
123.45  → precision: 5 (3 integer + 2 fractional)
0.123   → precision: 3 (0 integer + 3 fractional)
12345   → precision: 5 (5 integer + 0 fractional)
```

**Scale:** Number of digits after the decimal point
```
123.45  → scale: 2
0.123   → scale: 3
12345   → scale: 0
12.3    → scale: 1
```

**Relationship:**
```
Integer digits = precision - scale

Example: DECIMAL(10, 2)
- Total precision: 10 significant digits
- Scale: 2 decimal places
- Integer digits allowed: 10 - 2 = 8 digits
- Valid range: -99999999.99 to 99999999.99
```

---

## Complete Examples

### Currency (USD)
```io
~ price: { decimal, scale: 2, min: 0.00, max: 999999.99 }
---
19.99m      # ✅ Valid
19.9m       # ❌ Invalid (must be 19.90)
0.99m       # ✅ Valid
1000000.00m # ❌ Invalid (exceeds max)
```

### Database Mapping (SQL DECIMAL(10,2))
```io
~ salary: { decimal, precision: 10, scale: 2, min: 0 }
---
75000.00m   # ✅ Valid
75000.0m    # ❌ Invalid (scale must be exactly 2)
99999999.99m # ✅ Valid (max value for DECIMAL(10,2))
100000000.00m # ❌ Invalid (exceeds precision: needs 10 digits, allows 8 integer + 2 scale)
```

### Scientific Measurement (5 significant digits)
```io
~ measurement: { decimal, precision: 5 }
---
123.45m     # ✅ Valid
0.12345m    # ✅ Valid
12345m      # ✅ Valid
123.456m    # ❌ Invalid (6 significant digits)
```

### Percentage (2 decimal places, 0-100)
```io
~ percentage: { decimal, scale: 2, min: 0.00, max: 100.00 }
---
99.99m      # ✅ Valid
100.00m     # ✅ Valid
0.50m       # ✅ Valid
0.5m        # ❌ Invalid (must be 0.50)
100.01m     # ❌ Invalid (exceeds max)
```

### Flexible Decimal (No Restrictions)
```io
~ value: decimal
---
123m        # ✅ Valid
123.456789m # ✅ Valid
0.001m      # ✅ Valid
999999999.999999m # ✅ Valid
```

---

## Error Messages

| Error Condition | Error Code | Example |
|----------------|------------|---------|
| Value exceeds max | `invalidRange` | Value 150 exceeds max 100 |
| Value below min | `invalidRange` | Value 5 is below min 10 |
| Wrong scale | `invalidScale` | Value has scale 1, expected 2 |
| Exceeds precision | `invalidPrecision` | Value requires precision 11, max is 10 |
| Integer part too large | `invalidPrecision` | Integer part needs 9 digits, DECIMAL(10,2) allows 8 |

---

## Best Practices

1. **Currency:** Always use `scale: 2` (or appropriate scale for currency)
   ```io
   ~ price: { decimal, scale: 2, min: 0 }
   ```

2. **Database mapping:** Use both `precision` and `scale` to match SQL schema
   ```io
   ~ amount: { decimal, precision: 10, scale: 2 }
   ```

3. **User input:** Use natural comparison (no precision/scale) for flexibility
   ```io
   ~ quantity: { decimal, min: 0 }
   ```

4. **Scientific data:** Use `precision` only when accuracy matters
   ```io
   ~ reading: { decimal, precision: 5 }
   ```

5. **Percentages:** Use `scale` with appropriate min/max
   ```io
   ~ rate: { decimal, scale: 2, min: 0.00, max: 100.00 }
   ```

---

## Migration from Earlier Versions

**Before (flexible only):**
```io
~ num: decimal
```
All values accepted, natural comparison used.

**After (backward compatible):**
```io
~ num: decimal  # Still works - natural comparison (unchanged)
~ num: { decimal, scale: 2 }  # New - enforces 2 decimal places
~ num: { decimal, precision: 10, scale: 2 }  # New - strict format
```

Existing schemas continue to work without changes. New constraints are opt-in.
