# Error Handling Architecture

## Overview
This document describes the error handling architecture implemented in the Internet Object parser and validator. The design follows industry best practices for error resilience, separation of concerns, and performance.

## Design Principles

### 1. **Separation of Concerns**
- **Parser Layer**: Handles syntax errors during tokenization and AST construction
- **Validation Layer**: Handles semantic errors during schema validation
- **No Mixing**: Parser never validates; validator never parses

### 2. **Error Resilience**
- **Continue on Error**: Both parser and validator continue processing after errors
- **Multiple Errors**: Collect all errors in a single pass (better DX)
- **ErrorNode Pattern**: Errors are preserved as first-class nodes in the AST/data structure

### 3. **Performance Optimization**
- **Single Pass**: Errors collected during normal processing (no extra traversals)
- **Pre-allocation**: Collections pre-sized when length is known
- **Schema Reuse**: Schema resolved once per collection, not per item
- **Defensive Copying**: getErrors() returns a copy to prevent external mutation

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TOKENIZATION & PARSING PHASE                             │
│    Source → Tokenizer → Tokens → ASTParser → DocumentNode   │
│                                                              │
│    Errors: Syntax errors (missing brackets, invalid tokens) │
│    Output: ErrorNodes in AST + errors in docNode.getErrors()│
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DOCUMENT CONSTRUCTION                                     │
│    Document created with parser errors from docNode         │
│                                                              │
│    doc = new Document(header, sections, parserErrors)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SCHEMA PROCESSING & VALIDATION PHASE                      │
│    For each section:                                         │
│      - processSchema(data, schema, defs, validationErrors)  │
│      - Collection: processObject for each item               │
│      - Catch validation errors → create ErrorNode           │
│      - Append error to validationErrors array                │
│                                                              │
│    Errors: Validation errors (type mismatch, range, etc)    │
│    Output: ErrorNodes in collection + errors in array       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ERROR AGGREGATION                                         │
│    doc.addErrors(validationErrors)                           │
│                                                              │
│    Result: doc._errors contains ALL errors:                 │
│      - Parser errors (from construction)                     │
│      - Validation errors (from schema processing)           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. SERIALIZATION                                             │
│    doc.toJSON({ skipErrors: false })                         │
│                                                              │
│    - Valid objects serialized normally                       │
│    - ErrorNodes serialized as error info objects:            │
│      { __error: true, message, position, ... }              │
│                                                              │
│    doc.getErrors()                                           │
│    - Returns all errors for IDE/tooling diagnostics          │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### ErrorNode
```typescript
export type ErrorCategory = 'syntax' | 'validation' | 'runtime';

class ErrorNode implements Node {
  readonly error: Error;
  readonly position: Position;
  readonly endPosition?: Position;

  private getErrorCategory(): ErrorCategory {
    const errorName = this.error.name;
    if (errorName.includes('SyntaxError')) return 'syntax';
    if (errorName.includes('ValidationError')) return 'validation';
    return 'runtime';
  }

  toValue(): {
    __error: true,
    category: ErrorCategory,
    message: string,
    name: string,
    position: Position,
    endPosition?: Position
  }
}
```

**Purpose**: Represents an error as a first-class node that can exist alongside valid data.

**Benefits**:
- Allows partial parsing/validation
- Preserves error context (position, type)
- Serializable for UI consumption
- **Error categorization for differential styling** (syntax: red, validation: orange)

**Error Categories**:
- `syntax`: Parser/tokenization errors (missing brackets, invalid tokens) - **Styled RED**
- `validation`: Schema validation errors (type mismatch, range violations) - **Styled ORANGE**
- `runtime`: Other runtime errors - **Styled RED (fallback)**

### Document Error Management

```typescript
class IODocument {
  private _errors: Error[] = [];

  constructor(header, sections, errors: Error[] = []) {
    this._errors = errors; // Parser errors
  }

  public addErrors(errors: Error[]): void {
    this._errors.push(...errors); // Validation errors
  }

  public getErrors(): ReadonlyArray<Error> {
    return [...this._errors]; // Defensive copy
  }
}
```

**Key Design Decisions**:
1. **Constructor receives parser errors**: Errors from AST phase
2. **addErrors() for validation errors**: Called by parser after schema processing
3. **ReadonlyArray return**: Prevents external mutation
4. **Defensive copy**: Caller can't modify internal state

### Collection Processing

```typescript
function processCollection(
  data: CollectionNode,
  schema: Schema | TokenNode,
  defs?: Definitions,
  errorCollector?: Error[]  // Optional error aggregation
): Collection<any> {
  const resolvedSchema = SchemaResolver.resolve(schema, defs);
  const collection = new Collection<InternetObject>();

  for (let i = 0; i < data.children.length; i++) {
    const item = data.children[i];

    if (item instanceof ErrorNode) {
      // Parser error - preserve in collection (already in doc._errors)
      // Also annotate underlying error with the top-level collection index
      (item as any).error.collectionIndex = i;
      collection.push(item as unknown as any);
    } else {
      try {
        collection.push(processObject(item, resolvedSchema, defs, i));
      } catch (error) {
        // Validation error - annotate with top-level collection index
        (error as any).collectionIndex = i;
        // Create ErrorNode and collect error
        const errorNode = new ErrorNode(error as Error, item.getStartPos(), item.getEndPos());
        if (errorCollector) {
          errorCollector.push(error as Error);
        }
        collection.push(errorNode as unknown as any);
      }
    }
  }

  return collection;
}
```

**Key Points**:
1. **Parser ErrorNodes**: Preserved but NOT added to errorCollector (avoid duplicates)
2. **Validation Errors**: Caught, wrapped in ErrorNode, AND added to errorCollector
3. **Schema Resolution**: Done once per collection (performance)
4. **Optional errorCollector**: Supports both standalone and integrated usage

## Error Flow Example

Given this input with errors:
```
name, age:{number, min:30}
---
~ John, 25          ← Validation error (age < 30)
~ Jane, 35          ← Valid
~ Bob, {invalid     ← Parser error (unclosed brace)
~ Alice, 45         ← Valid
```

### Phase 1: Parsing
```javascript
docNode.getErrors() = [
  SyntaxError("Missing closing brace", row:5, col:8)
]

docNode.sections[0].child.children = [
  ObjectNode({ name: "John", age: 25 }),
  ObjectNode({ name: "Jane", age: 35 }),
  ErrorNode(SyntaxError, row:5, col:8),  // ← Parser error preserved
  ObjectNode({ name: "Alice", age: 45 })
]
```

### Phase 2: Document Construction
```javascript
doc._errors = [
  SyntaxError("Missing closing brace", row:5, col:8)
]
```

### Phase 3: Schema Validation
```javascript
validationErrors = [
  ValidationError("age must be >= 30", row:3, col:9)
]

collection = [
  ErrorNode(ValidationError, row:3, col:9),  // ← Validation error wrapped
  IOObject({ name: "Jane", age: 35 }),
  ErrorNode(SyntaxError, row:5, col:8),      // ← Parser error preserved
  IOObject({ name: "Alice", age: 45 })
]
```

### Phase 4: Error Aggregation
```javascript
doc.addErrors(validationErrors)

doc._errors = [
  SyntaxError("Missing closing brace", row:5, col:8),      // Parser
  ValidationError("age must be >= 30", row:3, col:9)       // Validation
]
```

### Phase 5: Serialization
```javascript
doc.toJSON({ skipErrors: false }) = [
  {
    __error: true,
    category: "validation",
    message: "age must be >= 30",
    position: {...}
  },
  { name: "Jane", age: 35 },
  {
    __error: true,
    category: "syntax",
    message: "Missing closing brace",
    position: {...}
  },
  { name: "Alice", age: 45 }
]

doc.getErrors() = [
  SyntaxError(...),
  ValidationError(...)
]
```

## Error Categorization & UI Styling

### Error Categories

The system classifies errors into three categories for differential UI treatment:

| Category | Source | Example | UI Color | Use Case |
|----------|--------|---------|----------|----------|
| `syntax` | Parser/Tokenizer | Missing bracket, invalid token | **Red** | Structural issues preventing parse |
| `validation` | Schema Validator | Type mismatch, range violation | **Orange** | Data doesn't match schema rules |
| `runtime` | Other | Unexpected errors | **Red** | Fallback for uncategorized errors |

### Category Determination

Error category is determined automatically by inspecting the error's type:

```typescript
private getErrorCategory(): ErrorCategory {
  const errorName = this.error.name;

  // Check error type name
  if (errorName.includes('SyntaxError')) return 'syntax';
  if (errorName.includes('ValidationError')) return 'validation';

  return 'runtime'; // fallback
}
```

**Why this approach?**
1. **Type-based**: Uses existing error hierarchy (IOSyntaxError, IOValidationError)
2. **No additional metadata**: No need to pass category through layers
3. **Automatic**: Category derived at serialization time
4. **Extensible**: New error types automatically categorized
5. **Performance**: String check is O(1) and happens once per error

### UI Implementation

The playground uses error categories to apply differential styling:

#### JSON Output Decorations
```typescript
// Extract category from error object in JSON
const categoryMatch = objText.match(/"category"\s*:\s*"(syntax|validation|runtime)"/);
const category = categoryMatch ? categoryMatch[1] : 'syntax';

// Apply category-specific styling
const className = category === 'validation'
  ? 'io-error-object-decoration io-error-validation'  // Orange
  : 'io-error-object-decoration io-error-syntax';     // Red
```

**Visual Indicators**:
- **Background highlight**: Translucent colored background on error object
- **Left border**: 3px solid colored bar (red for syntax, orange for validation)
- **Gutter marker**: Colored bar in editor gutter
- **Overview ruler**: Colored marker in scrollbar

#### Error Overlay
```typescript
// Determine error type from message prefix
const isValidation = errMsg.startsWith('VALIDATION_ERROR:');
const errorClass = isValidation ? 'error validation-error' : 'error';
```

**CSS Implementation**:
```css
/* Syntax errors - red */
.io-error-syntax {
  background-color: rgba(255, 83, 83, 0.16);
  border-left: 3px solid rgba(255, 83, 83, 0.6);
}

/* Validation errors - orange */
.io-error-validation {
  background-color: rgba(255, 152, 0, 0.16);
  border-left: 3px solid rgba(255, 152, 0, 0.7);
}
```

### Benefits of Categorization

1. **Visual Distinction**: Developers instantly recognize error type by color
2. **Priority Signals**: Red (syntax) typically needs fixing before orange (validation)
3. **Better UX**: Less cognitive load to parse error lists
4. **Filtering Capability**: Can filter/sort by category (future enhancement)
5. **Accessibility**: Color + text label provides redundant information

## Best Practices Followed

### ✅ Industry Standards

1. **Single Responsibility Principle**
   - Parser: syntax analysis only
   - Validator: semantic analysis only
   - Document: error aggregation only

2. **Fail-Safe Defaults**
   - skipErrors defaults to false (show all errors)
   - errorCollector is optional (works standalone or integrated)

3. **Defensive Programming**
   - Defensive copying in getErrors()
   - ReadonlyArray return type
   - Type guards for ErrorNode detection

4. **Performance First**
   - Single-pass error collection
   - Pre-allocated collections
   - Schema resolved once per collection
   - Early returns for empty data

5. **Developer Experience**
   - All errors collected in one pass
   - Rich error context (position, type, message)
   - Errors preserved in both structured (getErrors) and inline (toJSON) forms

### ✅ Code Quality

1. **Clear Documentation**
   - JSDoc comments on all public methods
   - Internal methods marked with @internal
   - Comments explain "why" not just "what"

2. **Type Safety**
   - Proper TypeScript types throughout
   - No unsafe casts except where necessary with comments
   - Readonly return types where appropriate

3. **Maintainability**
   - Clear variable names (validationErrors vs _errors)
   - Logical separation of phases
   - Comments mark decision points

4. **Testability**
   - Pure functions where possible
   - Error collection is injectable
   - Clear input/output contracts

## Performance Characteristics

| Operation | Time Complexity | Space Complexity | Notes |
|-----------|----------------|------------------|-------|
| Parse + Validate | O(n) | O(n) | Single pass through tokens |
| getErrors() | O(e) | O(e) | e = number of errors; defensive copy |
| toJSON() | O(n) | O(n) | n = number of items in collection |
| ErrorNode creation | O(1) | O(1) | Constant time/space |

**Memory Optimization**: Error objects are shared between ErrorNode and the errors array (no duplication of Error objects, only references).

## Potential Improvements (Future)

1. **~~Error Codes~~**: ✅ Already implemented via errorCode property
2. **~~Error Severity~~**: ✅ Implemented via error categorization (syntax/validation/runtime)
3. **Error Recovery**: Smarter recovery strategies for common errors
4. **Async Validation**: Support for async validators (API calls, etc.)
5. **Error Filtering**: Built-in filters for error types/severity in UI
6. **Error Quickfixes**: Suggested fixes for common validation errors
7. **Multi-level Severity**: Info/Warning/Error within each category

---

## Error Code System & Directory Structure (Implementation Overview)

The error handling architecture is backed by a deliberately structured error code system located in `src/errors/` and mirrored for documentation in `docs/errors/`.

### Source Layout (`src/errors/`)

| File | Purpose |
|------|---------|
| `io-error.ts` | Base class: shared code, position range message formatting, stable API (errorCode, fact, positionRange) |
| `io-syntax-error.ts` | Syntax (tokenization + parsing) subtype – categorizes as `syntax` |
| `io-validation-error.ts` | Validation subtype – categorizes as `validation` |
| `general-error-codes.ts` | Cross-cutting error codes (null handling, required values, generic type/value failures) |
| `tokenization-error-codes.ts` | Character & lexical level problems (string-not-closed, invalid-escape-sequence) |
| `parsing-error-codes.ts` | Structural / AST construction problems (unexpected-token, expecting-bracket) |
| `validation-error-codes.ts` | Schema / constraint violations (not-a-string, out-of-range, invalid-pattern, invalid-precision) |
| `io-error-codes.ts` | Aggregated read-only object combining all category enums for ergonomic imports: `import ErrorCodes from '.../io-error-codes'` |
| `error-args.ts` | Tuple type `[code, fact, node]` used as a compact factory pattern in common validation helpers |
| `error-range-utils.ts` | Utilities for precise range construction (single token, span, unclosed construct, toEndOfInput) ensuring consistent positional reporting |

### Documentation Layout (`docs/errors/`)

| Document | Role |
|----------|------|
| `ERROR-CODE-REGISTRY.md` | Canonical registry (frozen list) with usage statistics & lifecycle policy |
| `ERROR-HANDLING-GUIDELINES.md` | Authoritative style & quality standards for crafting messages |
| `ERROR-INFRASTRUCTURE.md` | Strategic organization & cross-language coordination plan |
| `categories/*.md` | (Planned) Per-category human explanations |
| `codes/*.md` | (Planned) Individual deep-dive pages (future public site) |

### Design Rationale

1. **Stability First** – Codes are kebab-case strings (human memorable, diff-friendly, language agnostic).
2. **Categorical Separation** – Keeps cognitive load low; new contributors immediately see where to add a code.
3. **Aggregation Layer** – `io-error-codes.ts` allows unified import while preserving semantic grouping.
4. **Position Precision** – Centralized range helpers avoid ad-hoc line/column handling and keep messages uniform.
5. **Extensibility** – Adding a code requires: (a) enum insertion in category file (b) registry update (c) message style compliance (d) team approval (see below).

### Category → Error Class → Public Category Mapping

| Internal Enum Source | Thrown As | Public JSON `category` | Notes |
|----------------------|----------|------------------------|-------|
| `tokenization-error-codes.ts` | `IOSyntaxError` | `syntax` | Character / lexical boundary issues |
| `parsing-error-codes.ts` | `IOSyntaxError` | `syntax` | Structural formation issues |
| `validation-error-codes.ts` | `IOValidationError` | `validation` | Type & constraint violations |
| `general-error-codes.ts` | Either (`IOSyntaxError` or `IOValidationError`) | Derived | Context-dependent (e.g. `value-required` during validation) |

Runtime (unexpected) errors fallback to `runtime` category unless recognized subclass.

### Selecting the Right Error Code (Decision Rules)

1. **Type Mismatch** – Prefer specific codes (`not-a-string`, `not-a-number`, `not-a-bool`, `not-an-array`) over generic `invalid-type` inside validation logic.
2. **Constraint Violation** – Use the narrowest applicable code (`invalid-min-length` vs `invalid-length`).
3. **Structure Formation** – Use parsing codes (e.g., `unexpected-token`, `expecting-bracket`) only during AST phase – NEVER in validation.
4. **Lexical Issues** – Tokenization codes must originate before AST nodes exist.
5. **General Codes** – Reserve for cross-cutting semantics: presence (`value-required`), nullability (`null-not-allowed`), or fallback value semantics.

### Position Range Best Practices

| Scenario | Utility | Highlight Strategy |
|----------|---------|--------------------|
| Unexpected single token | `singleTokenRange()` | Exact offending token |
| Unclosed list/object | `unclosedConstructRange()` | From opening delimiter to last known pos |
| Multi-token schema/member | `tokenSpanRange(start,end)` | Entire construct for clarity |
| Validation targeting a value | `positionSpanRange(start,end)` | Value span only |
| EOF after opener | `toEndOfInputRange()` | Complete unterminated region |

### CollectionIndex Integration & Error Envelope

When serializing mixed result collections the system emits uniform error objects. Canonical shape:

```jsonc
{
  "__error": true,
  "code": "invalid-email",
  "category": "validation",
  "message": "Invalid email 'alice@@example.com'. Expected format user@domain.tld",
  "path": "users[3].email",          // Path with composed indices
  "collectionIndex": 3,               // Top-level collection item index (0-based)
  "position": { "row": 12, "col": 18 },
  "endPosition": { "row": 12, "col": 39 } // Optional if available
}
```

**Implementation Details:**
1. `collectionIndex` only refers to the top-level record location inside the processed collection – nested arrays embed their index in `path` instead of another field.
2. `path` MUST be pre-composed with `[n]` segments for each array nesting level.
3. `code` aligns with registry; `category` inferred from error instance type.
4. `position`/`endPosition` align with `error-range-utils` output; if only a start is known omit `endPosition`.
5. Errors remain first-class items preserving ordering to support partial success workflows.
6. **Multi-Section Behavior**: `collectionIndex` is reset to 0 for each section in the document. Each section maintains its own independent collection with 0-based indexing.

**Multi-Section Example:**

Given a document with multiple named sections:
```
schema
--- collection1
~ item0  // collectionIndex: 0
~ item1  // collectionIndex: 1
--- collection2
~ item0  // collectionIndex: 0 (reset)
~ item1  // collectionIndex: 1
```

Both syntax and validation errors include `collectionIndex`:
- **Syntax errors** (from parser): Annotated at collection boundary before being added to the collection.
- **Validation errors** (from schema validator): Annotated at collection boundary when caught during processing.

The serialized output preserves section structure:
```jsonc
{
  "collection1": [
    { "data": "..." },           // Index 0
    { "__error": true, "collectionIndex": 1, "category": "syntax", ... }
  ],
  "collection2": [
    { "__error": true, "collectionIndex": 0, "category": "validation", ... },
    { "data": "..." }            // Index 1
  ]
}
```

### Adding a New Error Code (Workflow Summary)

1. Draft use-case & example message → PR description.
2. Add code to proper category enum (do NOT add directly to aggregate).
3. Update `ERROR-CODE-REGISTRY.md` (status: proposed) & link issue.
4. Implement throwing site with high-quality message (style guide compliance).
5. Add unit test asserting code, message pattern & category.
6. Team review → on approval mark registry entry STABLE.

### Refactoring Guidance

During ongoing type system enhancements (e.g., `load()`/`serialize()` addition):
* Replace generic `invalid-type` usages within validation logic with specific type mismatch codes.
* Attach `collectionIndex` only at the collection boundary when wrapping/propagating errors; do not pass it through TypeDef signatures.
* Path composition updates (array items) should precede enhanced error envelope adoption to avoid churn.

### Cross-Language Consistency

Implementers of other language ports MUST:
1. Mirror code strings exactly.
2. Preserve category semantics (tokenization → syntax, validation → validation).
3. Provide equivalent positional granularity where feasible.
4. Serialize envelope fields with identical names for tooling interoperability.

---

## Quick Reference Cheat (For Contributors)

| Task | Action |
|------|--------|
| Need new code | Propose → enum → registry → tests |
| Type mismatch string | Throw `not-a-string` (validation layer) |
| Unterminated array | `IOSyntaxError` + `expecting-bracket` + `unclosedConstructRange()` |
| Missing required member value | `IOValidationError` + `value-required` |
| Email format failure | `IOValidationError` + `invalid-email` + single token range |
| Envelope field origin | Base error + categorization + composed path + collectionIndex |

---

## Future Enhancements (Error System Specific)

1. Single consolidated `ErrorCode` enum exporting JSDoc-rich entries (generate from categories) – optional; maintain current separation for churn control.
2. Machine-readable JSON registry (`error-codes.schema.json`) enabling docs generation & IDE intellisense.
3. CLI helper `io explain <code>` rendering markdown from `docs/errors/codes/<code>.md`.
4. Integration of similarity matching for `invalid-choice` (Levenshtein suggestion pre-computed for small choice sets).
5. Structured severity layering (info/warn/error) at validation stage for soft constraints.
6. Optional `causes: []` array in envelope for chained diagnostic context.


## Conclusion

The current implementation achieves:
- ✅ **Correctness**: All errors captured without duplicates
- ✅ **Performance**: O(n) time complexity, minimal overhead
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Developer Experience**: Rich error information, both structured and inline
- ✅ **Industry Standards**: Follows SOLID principles, defensive programming

The architecture is production-ready and follows best practices for parser/validator error handling.
