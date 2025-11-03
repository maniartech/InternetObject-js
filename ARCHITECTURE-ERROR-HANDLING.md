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
      collection.push(item as unknown as any);
    } else {
      try {
        collection.push(processObject(item, resolvedSchema, defs, i));
      } catch (error) {
        // Validation error - create ErrorNode and collect error
        const errorNode = new ErrorNode(error, item.getStartPos(), item.getEndPos());
        if (errorCollector) {
          errorCollector.push(error);
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

## Conclusion

The current implementation achieves:
- ✅ **Correctness**: All errors captured without duplicates
- ✅ **Performance**: O(n) time complexity, minimal overhead
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Developer Experience**: Rich error information, both structured and inline
- ✅ **Industry Standards**: Follows SOLID principles, defensive programming

The architecture is production-ready and follows best practices for parser/validator error handling.
