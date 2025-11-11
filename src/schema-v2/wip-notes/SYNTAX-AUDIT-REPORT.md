# Syntax Audit Report - Type Spec Documents

**Date:** 2025-01-21
**Status:** ⚠️ NEEDS CORRECTION

## Summary

All type specification documents in `type-specs/` folder contain schema definitions using **incorrect syntax** that needs to be corrected. The issue stems from confusion between **Default Schemas** (anonymous schemas for data) and **Named Schema Definitions** (reusable schemas in the header's Definitions section).

## Understanding Internet Object Header Types

Internet Object headers support two distinct patterns:

### 1. **Default Schema** (Anonymous - No Name)
Used when defining a single schema directly for the data that follows. No `~` prefix needed.

```io
name: string, age: number, *
---
John Doe, 30, city: NYC
Jane Smith, 25, country: USA
```

### 2. **Definitions** (Key-Value Pairs)
Used for metadata, variables, and **named schemas** that can be referenced. Uses `~ key: value` format.

```io
~ $User: { name: string, age: number }
~ pageSize: 10
---
~ : User
John Doe, 30
Jane Smith, 25
```

## Correct Syntax Patterns

### ✅ CORRECT: Default Schema (No Name)
When discussing schema structure without naming, use open default object syntax:

```io
name: string, age: number, *
```

### ✅ CORRECT: Named Schema Definition
When creating a reusable schema in Definitions, use `~ $Name: { ... }`:

```io
~ $User: { name: string, age: number }
```

### ✅ CORRECT: Data Instance with Named Schema
Reference a named schema with `~ : SchemaName`:

```io
~ $User: { name: string, age: number }
---
~ : User
John Doe, 30
```

### ❌ WRONG: Mixed Syntax
Don't use `~ Name` without `$` prefix and curly braces:

```io
~ User
name: string, age: number
```

This is incorrect because:
- Named schemas in Definitions **must** use `~ $Name: { ... }` format
- Default schemas don't use `~` prefix at all
- The syntax above is neither a valid Default Schema nor a valid Named Schema Definition

## Files Requiring Updates

### 1. **07-array-type.md** ✅ AUDITED
**Issues Found:** Multiple schema definitions in examples section

**Lines with incorrect syntax:**
- Line 90: `~ User` → Should be `~ $User: { ... }`
- Line 93: `~ Team` → Should be `~ $Team: { ... }`
- Line 252: `~ Product` → Should be `~ $Product: { ... }`
- Line 259: `~ Product` → Should be `~ $Product: { ... }`
- Line 266: `~ Order` → Should be `~ $Order: { ... }`
- Line 272: `~ Item` → Should be `~ $Item: { ... }`
- Line 275: `~ Order` → Should be `~ $Order: { ... }`
- Line 281: `~ RGB` → Should be `~ $RGB: { ... }`
- Line 287: `~ Matrix` → Should be `~ $Matrix: { ... }`
- Lines 294-344: Multiple schema definitions in Valid/Invalid examples

**Sections needing updates:**
- "The `of` Field" section (lines 86-96)
- "User Schema Examples" section (lines 252-289)
- "Valid Data Examples" section (lines 294-320)
- "Invalid Data Examples" section (lines 323-347)

---

### 2. **08-object-type.md** ✅ AUDITED
**Issues Found:** Multiple open schema examples and user schema definitions

**Lines with incorrect syntax:**
- Line 72: `~ User` → Should be `~ $User: { ... }`
- Line 78: `~ Profile` → Should be `~ $Profile: { ... }`
- Line 81: `~ User` → Should be `~ $User: { ... }`
- Line 87: `~ User` → Should be `~ $User: { ... }`
- Line 97: `~ User` → Should be `~ $User: { ... }`
- Line 110: `~ User` → Should be `~ $User: { ... }`
- Line 119: `~ Config` → Should be `~ $Config: { ... }`
- Line 129: `~ Metadata` → Should be `~ $Metadata: { ... }`
- Line 132: `~ Tags` → Should be `~ $Tags: { ... }`
- Lines 576-631: Multiple schema definitions in examples section

**Sections needing updates:**
- "The `schema` Field" section (lines 69-90)
- "Open Schema" section (lines 97-133)
- "User Schema Examples" section (lines 576-607)
- "Valid Data Examples" section (lines 613-634)

---

### 3. **04-datetime-type.md** ✅ AUDITED
**Issues Found:** Schema definitions in examples section

**Lines with incorrect syntax:**
- Line 192: `~ Event` → Should be `~ $Event: { ... }`
- Line 200: `~ Event` → Should be `~ $Event: { ... }`
- Line 209: `~ Event` → Should be `~ $Event: { ... }`
- Line 219: `~ Event` → Should be `~ $Event: { ... }`

**Sections needing updates:**
- "User Schema Examples" section
- "Valid Cases" examples

---

### 4. **05-decimal-type.md** ✅ AUDITED
**Issues Found:** Schema definitions in examples section

**Lines with incorrect syntax:**
- Line 278: `~ Product` → Should be `~ $Product: { ... }`
- Line 284: `~ Product` → Should be `~ $Product: { ... }`
- Line 290: `~ Scientific` → Should be `~ $Scientific: { ... }`
- Line 296: `~ Financial` → Should be `~ $Financial: { ... }`
- Line 304: `~ Product` → Should be `~ $Product: { ... }`
- Line 311: `~ Product` → Should be `~ $Product: { ... }`
- Line 323: `~ Product` → Should be `~ $Product: { ... }`
- Line 333: `~ Scientific` → Should be `~ $Scientific: { ... }`

**Sections needing updates:**
- "Examples" section (lines 275-340)
- Both "Valid Cases" and "Invalid Cases" subsections

---

### 5. **06-bigint-type.md** ✅ AUDITED
**Issues Found:** Schema definitions in examples section

**Lines with incorrect syntax:**
- Line 191: `~ User` → Should be `~ $User: { ... }`
- Line 199: `~ User` → Should be `~ $User: { ... }`
- Line 208: `~ Transaction` → Should be `~ $Transaction: { ... }`
- Line 217: `~ Config` → Should be `~ $Config: { ... }`
- Line 228: `~ User` → Should be `~ $User: { ... }`
- Line 237: `~ Product` → Should be `~ $Product: { ... }`
- Line 272: `~ Example` → Should be `~ $Example: { ... }`

**Sections needing updates:**
- "User Schema Examples" section (lines 188-203)
- "Valid Cases" examples (lines 208-244)
- "Error Codes" table examples (line 272)

---

### 6. **01-string-type.md** ✅ NO ISSUES
- Uses correct syntax in TypeSchema definition
- No user schema examples with incorrect syntax

---

### 7. **02-number-type.md** ✅ NO ISSUES
- Uses correct syntax in TypeSchema definition
- No user schema examples with incorrect syntax

---

### 8. **03-boolean-type.md** ⏳ NOT AUDITED YET

---

### 9. **09-any-type.md** ⏳ NOT AUDITED YET

---

### 10. **00-type-spec-template.md** ⏳ NOT AUDITED YET

---

## Pattern for Corrections

Most examples in type specs are discussing **schema structure** without creating named definitions. These should use **Default Schema syntax** (no `~` prefix):

### When Discussing Schema Structure (Use Default Schema)

**Simple schema:**
```io
name: string
```

**Multi-field schema:**
```io
name: string, age: number, email: email
```

**Schema with open fields:**
```io
name: string, age: number, *
```

**Schema with comments:**
```io
host: string,     # server host
port: number,     # server port
*: string         # additional config
```

### When Creating Named Definitions (Use Named Schema)

**Named schema definition:**
```io
~ $User: { name: string, age: number }
```

**Multiple named schemas:**
```io
~ $User: { name: string, age: number }
~ $Product: { name: string, price: decimal }
```

**Complete example with data:**
```io
~ $User: { name: string, age: number }
---
~ : User
John Doe, 30
```

### What To Fix

Change all examples like this:
```io
# WRONG - Neither Default Schema nor Named Schema Definition
~ User
name: string, age: number
```

To either:
```io
# OPTION 1: Default Schema (if just discussing structure)
name: string, age: number
```

Or:
```io
# OPTION 2: Named Schema Definition (if creating reusable schema)
~ $User: { name: string, age: number }
```

## Action Items

- [x] **COMPLETED**: OPEN-SCHEMA-PATTERN.md - All syntax corrected
- [ ] **TODO**: 07-array-type.md - ~15 schema definitions to fix
- [ ] **TODO**: 08-object-type.md - ~20 schema definitions to fix
- [ ] **TODO**: 04-datetime-type.md - ~4 schema definitions to fix
- [ ] **TODO**: 05-decimal-type.md - ~8 schema definitions to fix
- [ ] **TODO**: 06-bigint-type.md - ~7 schema definitions to fix
- [ ] **TODO**: 03-boolean-type.md - Audit required
- [ ] **TODO**: 09-any-type.md - Audit required
- [ ] **TODO**: 00-type-spec-template.md - Audit and update template

## Decision Guide for Corrections

When correcting examples in type spec files:

1. **Is the example discussing schema structure generically?**
   - YES → Use Default Schema syntax (no `~` prefix)
   - Example: `name: string, age: number, *`

2. **Is the example showing how to create a reusable named schema?**
   - YES → Use Named Schema Definition syntax with `~ $Name: { ... }`
   - Example: `~ $User: { name: string, age: number }`

3. **Is the example showing complete data with schema?**
   - If using named schema → Include `~ $Name: { ... }` definition and `~ : Name` for data
   - If using default schema → Just show schema fields followed by `---` and data

## Priority

**HIGH PRIORITY** - These files serve as specification documents and examples for developers implementing Internet Object. Incorrect syntax could lead to:
1. Confusion about Default Schema vs Named Schema Definitions
2. Implementation errors in parsers
3. Invalid test cases in implementations
4. Documentation inconsistencies across ecosystem

## Recommendation

Systematically update all type spec files to use correct syntax:
1. **Context is key**: Most examples should use Default Schema syntax (no `~`)
2. Start with template file (00-type-spec-template.md) to establish correct pattern
3. For each type spec, determine if examples are:
   - Discussing structure → Use Default Schema
   - Creating named definitions → Use Named Schema Definition
4. Update data examples to use `---` separator and proper data format
5. Verify all examples match header.md and object-definition-mechanisms.md specifications

---

**Next Steps:** Would you like me to proceed with fixing these files systematically?
