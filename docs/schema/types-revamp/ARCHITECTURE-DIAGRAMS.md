# Type System Architecture - Visual Overview

## Data Flow Diagrams

### Current State (Before Enhancement)

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────┘

TEXT INPUT (IO Format)
    │
    ├─[Parser]──> TokenNode/AST
    │
    ├─[TypeDef.parse()]
    │     │
    │     ├─> doCommonTypeCheck() ─────┐
    │     │                              │
    │     └─> Type-specific validation ─┤ (Coupled Together)
    │         ├─ Type check              │
    │         ├─ Range check             │
    │         ├─ Pattern check           │
    │         └─ Length check            │
    │                                    │
    └────────> VALIDATED JS VALUE ◄─────┘

LIMITATIONS:
❌ Cannot validate plain JS objects
❌ Validation logic tied to parsing
❌ Stringify doesn't validate
❌ No way to normalize JS objects
```

### Proposed State (After Enhancement)

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   VALIDATION     │
                    │      CORE        │
                    └──────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   PARSE     │ │    LOAD     │ │  SERIALIZE  │
    │ (Text → JS) │ │  (JS → JS)  │ │ (JS → Text) │
    └─────────────┘ └─────────────┘ └─────────────┘


OPERATION: PARSE (Text → JS Value)
═══════════════════════════════════

IO Text Format
    │
    ├─[Tokenizer]─> TokenNode/AST
    │
    ├─[TypeDef.parse()]
    │     │
    │     ├─> doCommonTypeCheck(node)
    │     │    ├─ Handle undefined → default
    │     │    ├─ Handle null (if allowed)
    │     │    └─ Validate choices
    │     │
    │     ├─> Type Check (TokenNode type)
    │     │    └─ Ensure correct token type
    │     │
    │     └─> validateValue(value, memberDef, node)
    │          ├─ Pattern validation
    │          ├─ Range validation
    │          ├─ Length validation
    │          └─ Format validation
    │
    └────────> VALIDATED JS VALUE


OPERATION: LOAD (JS Value → Validated JS Value)
═══════════════════════════════════════════════

JavaScript Object
    │
    ├─[TypeDef.load()]
    │     │
    │     ├─> doCommonTypeCheck(value)
    │     │    ├─ Handle undefined → default
    │     │    ├─ Handle null (if allowed)
    │     │    └─ Validate choices
    │     │
    │     ├─> Type Check (typeof value)
    │     │    └─ Ensure correct JS type
    │     │
    │     ├─> Type Coercion (optional)
    │     │    └─ e.g., "123" → 123 for numbers
    │     │
    │     └─> validateValue(value, memberDef)
    │          ├─ Pattern validation
    │          ├─ Range validation
    │          ├─ Length validation
    │          └─ Format validation
    │
    └────────> VALIDATED & NORMALIZED JS VALUE


OPERATION: SERIALIZE (JS Value → IO Text)
═════════════════════════════════════════

JavaScript Value
    │
    ├─[TypeDef.serialize()]
    │     │
    │     ├─> doCommonTypeCheck(value)
    │     │    ├─ Handle null → 'N'
    │     │    ├─ Handle undefined → '' or error
    │     │    └─ Validate choices
    │     │
    │     ├─> validateValue(value, memberDef)
    │     │    ├─ Pattern validation
    │     │    ├─ Range validation
    │     │    ├─ Length validation
    │     │    └─ Format validation
    │     │
    │     └─> formatToIOText(value, memberDef)
    │          ├─ Apply format options
    │          ├─ Escape special chars
    │          └─ Add enclosers/quotes
    │
    └────────> IO TEXT FORMAT


BENEFITS:
✅ Reusable validation logic (DRY)
✅ Can validate JS objects directly
✅ Serialize with validation
✅ Consistent behavior across operations
✅ Single source of truth for constraints
```

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYERS                          │
└─────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                    HIGH-LEVEL API                         │
│  InternetObject.parse()                                   │
│  InternetObject.load()                                    │
│  InternetObject.serialize()                               │
└───────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  OBJECT PROCESSOR                         │
│  processObject() - for parse                              │
│  loadObject()    - for load (NEW)                         │
└───────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  MEMBER PROCESSOR                         │
│  processMember() - delegates to TypeDef                   │
└───────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  TYPE REGISTRY                            │
│  TypedefRegistry.get(type) → TypeDef instance             │
└───────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                    TYPE DEFS                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  TypeDef Interface                                  │  │
│  │  ├─ parse(node, memberDef) → value                  │  │
│  │  ├─ load(value, memberDef) → value     (NEW)       │  │
│  │  └─ serialize(value, memberDef) → text (ENHANCED)  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Implementations:                                         │
│  ├─ StringDef                                             │
│  ├─ NumberDef                                             │
│  ├─ BooleanDef                                            │
│  ├─ ArrayDef                                              │
│  ├─ ObjectDef                                             │
│  ├─ DateTimeDef                                           │
│  ├─ DecimalDef                                            │
│  ├─ BigIntDef                                             │
│  └─ AnyDef                                                │
└───────────────────────────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                VALIDATION UTILITIES                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  doCommonTypeCheck()                                │  │
│  │  ├─ Handles: null, undefined, default, choices     │  │
│  │  ├─ Works with: Node or raw value                  │  │
│  │  └─ Returns: { value, handled }                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  TypeDef.validateValue()  (NEW - per type)         │  │
│  │  ├─ Pattern validation                              │  │
│  │  ├─ Range/Length validation                         │  │
│  │  ├─ Format validation                               │  │
│  │  └─ Returns: validated value                        │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## StringDef Internal Structure (Example)

```
┌───────────────────────────────────────────────────────────┐
│                      StringDef                            │
└───────────────────────────────────────────────────────────┘

PUBLIC METHODS:
├─ parse(node, memberDef, defs)
│   ├─ Extract TokenNode value
│   ├─ Call doCommonTypeCheck()
│   ├─ Verify TokenType.STRING
│   └─ Call validateValue() ───────────┐
│                                       │
├─ load(value, memberDef, defs)        │
│   ├─ Call doCommonTypeCheck()        │
│   ├─ Verify typeof === 'string'      │
│   └─ Call validateValue() ───────────┤
│                                       │
└─ serialize(value, memberDef, defs)   │
    ├─ Call doCommonTypeCheck()        │
    ├─ Call validateValue() ───────────┤
    └─ Call formatToIOText()           │
                                        │
PRIVATE METHODS:                        │
                                        │
├─ validateValue(value, memberDef, node?) ◄──┘
│   │  [SHARED VALIDATION LOGIC]
│   ├─ validatePattern()
│   ├─ Check len/minLen/maxLen
│   └─ Return validated value
│
├─ validatePattern(memberDef, value, node?)
│   ├─ Compile regex (cached)
│   ├─ Test against pattern
│   └─ Throw error if invalid
│
└─ formatToIOText(value, memberDef)
    ├─ Check format option
    │   ├─ 'auto'    → toAutoString()
    │   ├─ 'open'    → toOpenString()
    │   ├─ 'regular' → toRegularString()
    │   └─ 'raw'     → toRawString()
    └─ Return formatted text

KEY PRINCIPLES:
✓ DRY: validateValue() used by all operations
✓ SRP: Each method has single responsibility
✓ KISS: Clear, simple flow
```

## Validation Flow Comparison

```
┌───────────────────────────────────────────────────────────┐
│              BEFORE: Duplicated Validation                │
└───────────────────────────────────────────────────────────┘

parse():                  stringify():
  ├─ Check null              ├─ (No validation)
  ├─ Check undefined         └─ Format to text
  ├─ Check choices
  ├─ Check type                 PROBLEM:
  ├─ Validate pattern           ❌ No validation
  ├─ Validate length            ❌ Can serialize invalid data
  └─ Return value               ❌ Inconsistent behavior

load(): (NOT IMPLEMENTED)
  ❌ No way to validate JS objects
  ❌ No way to normalize data


┌───────────────────────────────────────────────────────────┐
│              AFTER: Shared Validation                     │
└───────────────────────────────────────────────────────────┘

                ┌──────────────────────┐
                │  validateValue()     │
                │  ├─ Pattern check    │
                │  ├─ Length check     │
                │  └─ Range check      │
                └──────────────────────┘
                          ▲
          ┌───────────────┼───────────────┐
          │               │               │
    parse()          load()        serialize()
      │               │               │
      │               │               │
  Extracts        Type checks    Validates then
  from Node      JS value        formats to text
      │               │               │
      └───────────────┴───────────────┘
                      │
          All use doCommonTypeCheck()
          All use validateValue()

BENEFITS:
✅ Single source of truth
✅ Consistent validation
✅ DRY principle
✅ Easy to maintain
```

## Round-Trip Data Flow

```
┌───────────────────────────────────────────────────────────┐
│                   ROUND-TRIP FLOW                         │
└───────────────────────────────────────────────────────────┘

Step 1: START WITH JS OBJECT
──────────────────────────────
{
  name: "John Doe",
  age: 30,
  active: true
}

Step 2: LOAD (Validate JS Object)
──────────────────────────────────
InternetObject.load(obj, schema)
    │
    ├─ Validates each field
    ├─ Applies defaults if needed
    ├─ Normalizes values
    └─ Returns validated InternetObject

Step 3: SERIALIZE (JS → IO Text)
─────────────────────────────────
io.serialize(schema)
    │
    ├─ Validates before serialization
    ├─ Formats each field
    └─ Returns: "John Doe, 30, T"

Step 4: PARSE (IO Text → JS)
─────────────────────────────
InternetObject.parse("John Doe, 30, T", schema)
    │
    ├─ Tokenizes text
    ├─ Validates each token
    └─ Returns new InternetObject

Step 5: COMPARE
───────────────
original.toObject() === parsed.toObject()
✅ Data integrity maintained
✅ All validations passed three times
✅ Round-trip successful


Alternative Flow: DIRECT LOAD → SERIALIZE
──────────────────────────────────────────

JS Object
    │
    ├─[load]─> Validated Object
    │
    └─[serialize]─> IO Text

Use Case: Converting JS configs to IO format
```

## Error Propagation

```
┌───────────────────────────────────────────────────────────┐
│                  ERROR HANDLING FLOW                      │
└───────────────────────────────────────────────────────────┘

PARSE Operation:
────────────────
User Input: "age: abc"
    │
    ├─[TokenNode] → value="abc", type=STRING
    │
    ├─[NumberDef.parse()]
    │     │
    │     └─ validateValue(value="abc")
    │          └─[THROW] ValidationError
    │               ├─ code: "not-a-number"
    │               ├─ message: "Expected number for 'age'"
    │               ├─ node: TokenNode (has position)
    │               └─ path: "age"
    │
    └─> ValidationError with line/column info


LOAD Operation:
───────────────
User Input: { age: "abc" }
    │
    ├─[NumberDef.load()]
    │     │
    │     ├─ Type check: typeof "abc" !== "number"
    │     └─[THROW] ValidationError
    │          ├─ code: "invalid-type"
    │          ├─ message: "Expected number for 'age' but got string"
    │          └─ path: "age"
    │
    └─> ValidationError with path info


SERIALIZE Operation:
────────────────────
User Input: { age: 200 } (max is 150)
    │
    ├─[NumberDef.serialize()]
    │     │
    │     └─ validateValue(value=200)
    │          ├─ Check max: 200 > 150
    │          └─[THROW] ValidationError
    │               ├─ code: "out-of-range"
    │               ├─ message: "Age must be <= 150"
    │               └─ path: "age"
    │
    └─> ValidationError with path info


CONSISTENT ERROR FORMAT:
────────────────────────
{
  code: "error-code",
  message: "Human readable message",
  path: "field.path",           // Always present
  position?: {                  // Only for parse
    line: number,
    column: number
  }
}
```

## Implementation Phases Visual

```
┌───────────────────────────────────────────────────────────┐
│                  IMPLEMENTATION ROADMAP                   │
└───────────────────────────────────────────────────────────┘

PHASE 1: Refactor Common Type Check
════════════════════════════════════
┌─────────────────────────────────┐
│ doCommonTypeCheck()             │
│ ├─ Update return type           │  Week 1
│ ├─ Support raw values           │  ────────
│ └─ Update all callsites         │  Low Risk
└─────────────────────────────────┘  ✓ Tests pass
         │                            ✓ No new features
         └──> All TypeDefs updated    ✓ Foundation ready


PHASE 2: Extract Validation Logic
══════════════════════════════════
┌─────────────────────────────────┐
│ TypeDef.validateValue()         │
│ ├─ StringDef                    │  Week 2-3
│ ├─ NumberDef                    │  ──────────
│ ├─ BooleanDef                   │  Medium Risk
│ └─ Other types                  │  ✓ Refactor only
└─────────────────────────────────┘  ✓ Same behavior
         │                            ✓ Better structure
         └──> DRY validation ready


PHASE 3: Implement Load
════════════════════════
┌─────────────────────────────────┐
│ TypeDef.load()                  │
│ ├─ Core types (string, number) │  Week 4-5
│ ├─ Complex types (array, obj)  │  ──────────
│ └─ Specialized types            │  High Value
└─────────────────────────────────┘  ✓ New feature
         │                            ✓ Validates JS
         └──> Can validate JS objects ✓ High impact


PHASE 4: Enhance Serialize
═══════════════════════════
┌─────────────────────────────────┐
│ TypeDef.serialize()             │
│ ├─ Add validation               │  Week 6
│ ├─ Update all types             │  ──────────
│ └─ Handle edge cases            │  Medium Risk
└─────────────────────────────────┘  ✓ Safer serialize
         │                            ✓ Consistent
         └──> Validated serialization


PHASE 5: Integration
════════════════════
┌─────────────────────────────────┐
│ High-level API                  │
│ ├─ loadObject()                 │  Week 7-8
│ ├─ Update InternetObject        │  ──────────
│ ├─ Integration tests            │  Final Phase
│ └─ Documentation                │  ✓ Complete
└─────────────────────────────────┘  ✓ Tested
                                     ✓ Documented


ROLLOUT STRATEGY:
─────────────────
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
  ↓          ↓          ↓          ↓          ↓
Tests    Tests      Tests      Tests      Tests
  ↓          ↓          ↓          ↓          ↓
Deploy   Deploy     Deploy     Deploy     Deploy
```

## Summary

This architecture provides:

1. **Separation of Concerns**: Parse/load/serialize are separate but share validation
2. **DRY Principle**: Validation logic written once, used everywhere
3. **KISS Principle**: Simple, clear flow for each operation
4. **SRP Principle**: Each method has one responsibility
5. **Extensibility**: Easy to add new types following the pattern
6. **Maintainability**: Changes to validation happen in one place
7. **Testability**: Each component can be tested independently
8. **Type Safety**: Full TypeScript support with strict mode

---

**Document Version**: 1.0
**Date**: November 18, 2025
