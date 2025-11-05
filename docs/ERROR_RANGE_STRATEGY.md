# Error Range Strategy

## Overview

This document describes the industry-standard error range strategy implemented across all layers of the Internet Object parser (tokenizer, AST parser, and schema validator).

Following the principles of **TypeScript**, **Roslyn (C#)**, and **rust-analyzer**, our error ranges are designed to:
1. **Maximize developer UX** by highlighting the entire problematic construct
2. **Provide precise context** for error messages
3. **Enable better IDE integration** with proper error squiggles
4. **Support resilient parsing** with partial results and multiple errors

## Core Principles

### 1. Industry Standard Approach
- **Single-token errors**: Highlight the specific problematic token
- **Construct errors**: Span entire construct (from opening to expected closing)
- **Validation errors**: Highlight the exact value that failed validation
- **Unclosed/unterminated**: From start to end of input or synchronization boundary

### 2. Unified Error Range Utilities

Located in `src/errors/error-range-utils.ts`, these utilities provide consistent error range creation across all layers:

```typescript
// For single token errors (invalid characters, unexpected tokens)
singleTokenRange(token: Token): PositionRange

// For multi-token spans (expressions, schema definitions)
tokenSpanRange(startToken: Token, endToken: Token): PositionRange

// For unclosed constructs (strings, arrays, objects)
unclosedConstructRange(startToken: Token, currentPos: Position): PositionRange

// For custom position spans (validation errors)
positionSpanRange(startPos: Position, endPos: Position): PositionRange

// For EOF errors (unterminated constructs)
toEndOfInputRange(startToken: Token, lastPos: Position): PositionRange
```

## Implementation by Layer

### Layer 1: Tokenizer Errors

The tokenizer handles low-level syntax errors with proper ranges.

#### Unclosed String Literals
**Before:**
```typescript
// Error pointed only to EOF position
throw new SyntaxError(ErrorCodes.stringNotClosed, message, this.currentPosition);
```

**After:**
```typescript
// Error spans from opening quote to EOF
const openingToken = Token.init(start, startRow, startCol, '"', '"', "STRING");
const currentPos = createPosition(this.pos, this.row, this.col);
const error = new SyntaxError(
  ErrorCodes.stringNotClosed,
  message,
  unclosedConstructRange(openingToken, currentPos),
  true
);
```

**Visual Result:**
```
"unterminated string...
^^^^^^^^^^^^^^^^^^^^^
Error: Unterminated string literal. Expected closing quote '"'
```

#### Annotated String Errors
Similar treatment for annotated strings (`s"..."`, `b64"..."`, etc.):
```typescript
const openingToken = Token.init(start, startRow, startCol,
  annotation.name + annotation.quote, annotation.name, "STRING");
const error = new SyntaxError(
  ErrorCodes.stringNotClosed,
  message,
  unclosedConstructRange(openingToken, currentPos),
  true
);
```

### Layer 2: AST Parser Errors

The parser handles structural errors with full construct highlighting.

#### Unclosed Objects and Arrays

**Helper Method** (`ast-parser.ts`):
```typescript
private createUnclosedConstructError(
  errorCode: string,
  message: string,
  startToken: Token | null,
  members: Array<Node | undefined>
): SyntaxError {
  // Find end position (at boundary or last parsed token)
  let errorEndToken = this.peek();

  if (!errorEndToken ||
      errorEndToken.type === TokenType.COLLECTION_START ||
      errorEndToken.type === TokenType.SECTION_SEP) {
    if (this.current > 0) {
      errorEndToken = this.tokens[this.current - 1];
    }
  }

  // Use tokenSpanRange utility for proper range
  if (startToken && errorEndToken) {
    const range = tokenSpanRange(startToken, errorEndToken);
    return new SyntaxError(errorCode, message, range, false);
  }
  // ... fallback cases
}
```

**Usage Examples:**

**Unclosed Object:**
```typescript
// parseObject() - line ~420
if (!this.match(ASTParser.CURLY_CLOSE_ARRAY)) {
  throw this.createUnclosedConstructError(
    ErrorCodes.expectingBracket,
    `Missing closing brace '}'. Object must be properly closed.`,
    openBracket,
    members
  );
}
```

**Visual Result:**
```
{name: John, age: 30
^^^^^^^^^^^^^^^^^^^^^
Error: Missing closing brace '}'
```

**Unclosed Array:**
```typescript
// parseArray() - lines ~470, ~502
if (!currentToken) {
  throw this.createUnclosedConstructError(
    ErrorCodes.expectingBracket,
    `Unexpected end of input while parsing array. Expected closing bracket ']'.`,
    openBracket,
    arr
  );
}

// ... later
if (!this.match(ASTParser.BRACKET_CLOSE_ARRAY)) {
  throw this.createUnclosedConstructError(
    ErrorCodes.expectingBracket,
    `Missing closing bracket ']'. Array must be properly closed.`,
    openBracket,
    arr
  );
}
```

**Visual Result:**
```
[red, green, blue
^^^^^^^^^^^^^^^^^
Error: Missing closing bracket ']'
```

#### Synchronization Boundaries

The parser respects synchronization points:
- `~` (collection item separator)
- `---` (section separator)
- EOF (end of file)

When an unclosed construct reaches a boundary, the error range spans from the opening delimiter to the last valid token before the boundary.

### Layer 3: Schema Validation Errors

Schema validators already receive `Node` objects which implement `PositionRange`.

**Example from `string.ts`:**
```typescript
if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.STRING) {
  throw new ValidationError(
    ErrorCodes.notAString,
    `Expecting a string value for '${memberDef.path}' but found ${valueNode.toValue()}.`,
    node  // Node implements PositionRange
  );
}
```

**Visual Result:**
```
age: "thirty"
     ^^^^^^^^
Error: Expecting a number value for 'age' but found "thirty"
```

The validation error automatically highlights the exact value that failed validation.

## Error Range Types

### Type 1: Single Token Error
```
{name: undefined}
      ^^^^^^^^^
Error: 'undefined' is not a valid value
```
Use: `singleTokenRange(token)`

### Type 2: Token Span Error
```
{name: John, age: 30}
^^^^^^^^^^^^^^^^^^^^^
Error: Missing closing brace '}'
```
Use: `tokenSpanRange(startToken, endToken)`

### Type 3: Unclosed Construct
```
"unterminated
^^^^^^^^^^^^^
Error: Unterminated string literal
```
Use: `unclosedConstructRange(openingToken, currentPos)`

### Type 4: Validation Error
```
age: "not a number"
     ^^^^^^^^^^^^^^
Error: Expected number, found string
```
Use: Node's built-in PositionRange (automatic)

## Benefits

### For Developers
1. **Immediate visual feedback** - errors highlight the entire problematic code
2. **Better context** - can see what's missing or wrong at a glance
3. **Easier fixes** - clear what needs to be added/changed

### For IDEs
1. **Proper error squiggles** - red underlines span the right code
2. **Better quick fixes** - IDE can suggest fixes for the right range
3. **Enhanced code actions** - refactoring tools work with precise ranges

### For Testing
1. **Clearer test assertions** - can verify error positions
2. **Regression detection** - range changes indicate behavioral shifts
3. **Documentation** - error examples show exact highlighting

## Migration Notes

### Before This Implementation
- Errors pointed to boundaries (EOF, `~`, `---`)
- Single-position errors made it hard to see the problem
- Inconsistent error ranges across layers

### After This Implementation
- ✅ Consistent error ranges across tokenizer, parser, validator
- ✅ Industry-standard approach (TypeScript, Roslyn, rust-analyzer)
- ✅ Better UX in playground with full construct highlighting
- ✅ Reusable utilities for future error types
- ✅ All layers follow same patterns

## Testing Error Ranges

### Test Case Examples

**Unclosed Object:**
```io
name: John, age: 30, email: john@example.com} ~ {name: Jane
```
Expected: Error range from `{` to `com}` (position 3:8 to 3:52)

**Unclosed Array:**
```io
colors: [red, green, blue
```
Expected: Error range from `[` to `blue` (position 1:9 to 1:25)

**Unclosed String:**
```io
message: "Hello, world
```
Expected: Error range from `"` to end of input

**Validation Error:**
```io
age: "thirty"
```
Expected: Error range on value `"thirty"` only

## Future Enhancements

1. **Multi-line error ranges** - Better handling of constructs spanning many lines
2. **Related locations** - Point to opening when reporting unclosed construct
3. **Fix suggestions** - Automated fixes with proper insertion points
4. **Error recovery hints** - "Did you mean to close this here?"

## References

- [TypeScript Error Reporting](https://github.com/microsoft/TypeScript)
- [Roslyn (C#) Diagnostics](https://github.com/dotnet/roslyn)
- [rust-analyzer Error Handling](https://github.com/rust-lang/rust-analyzer)
- [Error Recovery Strategy (Phase 2)](./io-go/parsers/ERROR_RECOVERY_STRATEGY.md)
