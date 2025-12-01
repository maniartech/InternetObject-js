# Design Document

## Overview

This design outlines simple, incremental enhancements to the Internet Object parser library's parser directory. The focus is on improving code quality, fixing issues, and adding small optimizations while keeping the existing architecture intact and maintaining full backward compatibility.

## Architecture

### Current Parser Architecture (Keep As-Is)

The current parser follows a clean two-phase approach that works well:
1. **Tokenization Phase**: `Tokenizer` converts input string into tokens
2. **AST Construction Phase**: `ASTParser` builds Abstract Syntax Tree from tokens  
3. **Document Processing Phase**: Main parser converts AST to final `Document` objects

### Simple Enhancement Approach

Instead of restructuring, we'll enhance existing files incrementally:

```
src/parser/
├── index.ts                   # Clean up and add better error handling
├── ast-parser.ts             # Fix issues, add validation, improve performance
├── io.ts                     # Complete the implementation
├── parse-defs.ts             # Add better error handling
├── parser-options.ts         # Fix the broken constructor
├── tokenizer/
│   ├── index.ts              # Fix bugs, optimize performance
│   ├── tokens.ts             # Add utility methods
│   ├── token-types.ts        # Add missing token types if needed
│   ├── is.ts                 # Optimize character checking functions
│   ├── literals.ts           # Ensure all literals are defined
│   └── symbols.ts            # Ensure all symbols are defined
└── nodes/
    ├── nodes.ts              # Add utility methods to interface
    ├── objects.ts            # Fix issues, add validation
    ├── arrays.ts             # Fix issues, add validation  
    ├── document.ts           # Add utility methods
    ├── members.ts            # Add validation
    ├── tokens.ts             # Add utility methods
    ├── collections.ts        # Add validation
    ├── containers.ts         # Add utility methods
    └── section.ts            # Add validation
```

## Simple Improvements to Existing Code

Based on the code analysis, here are the specific, simple improvements we'll make:

### Issues Found in Current Code

1. **index.ts**: 
   - Incomplete string literal in `parseDefs` function (line with `if (key.startsWith('`)
   - Duplicated logic in `parseDataWithSchema` function
   - Missing error handling in some paths

2. **ast-parser.ts**:
   - Some methods could have better type safety
   - Error messages could be more descriptive
   - Performance could be improved in token matching

3. **tokenizer/index.ts**:
   - Some regex patterns could be optimized
   - Variable naming inconsistencies (`name` vs `n` in regex groups)
   - Some error handling could be more specific

4. **io.ts**:
   - Incomplete implementation - just returns empty document
   - Should actually use the parsed result

5. **nodes/*.ts**:
   - Missing null checks in some places
   - Could benefit from better type guards
   - Some utility methods would be helpful

### Simple Enhancement Plan

#### 1. Fix Critical Bugs

- Fix the incomplete string literal in `index.ts`
- Complete the `io.ts` implementation
- Add missing null checks where needed

#### 2. Add Simple Error Handling

- Implement simple continue-on-error behavior where it makes sense
- Tokenizer: always continue on error
- AST Parser: skip to next `~` token when object parsing fails in collections

#### 3. Improve Type Safety

- Add proper type guards where missing
- Improve method signatures with better types
- Add readonly modifiers where appropriate

#### 4. Add Simple Utility Methods

- Add helper methods to existing classes (no new classes)
- Add simple validation methods
- Add debugging helpers

#### 5. Optimize Performance (Simple Changes)

- Cache frequently used regex patterns
- Optimize string operations
- Reduce unnecessary object creation

#### 6. Improve Error Messages

- Make error messages more descriptive
- Add better context to errors
- Ensure all error paths are covered

## Error Handling Strategy

Simple built-in error handling with fixed behavior (no configuration needed):

### Error Handling Rules

#### 1. Tokenizer Level
- **Always Continue on Error**: Skip invalid tokens, continue tokenizing
- Never stop tokenization due to individual token errors

#### 2. AST Parser Level  
- **Collection Processing**: When object parsing fails, skip to next `~` token and continue
- **Other Parsing**: Normal error throwing behavior (early exit)

```typescript
// In ASTParser - Collection Processing
private processCollection(): CollectionNode {
  const objects: Node[] = [];

  while (this.match([TokenType.COLLECTION_START])) {
    this.advance(); // Consume the `~` token
    
    try {
      const obj = this.processObject(true);
      objects.push(obj);
    } catch (error) {
      // Create error node and skip to next `~` token
      objects.push(new ErrorNode(error, this.getCurrentPosition()));
      this.skipToNextCollectionItem(); // Skip to next `~` or section end
    }
  }

  return new CollectionNode(objects);
}

private skipToNextCollectionItem(): void {
  // Skip tokens until we find next `~` (COLLECTION_START) or section end
  while (this.peek() && 
         !this.match([TokenType.COLLECTION_START, TokenType.SECTION_SEP])) {
    this.advance();
  }
}
```

### Error Node for AST

```typescript
class ErrorNode implements Node {
  readonly nodeType = 'error';
  readonly error: Error;
  readonly position: PositionRange;
  
  constructor(error: Error, position: PositionRange) {
    this.error = error;
    this.position = position;
  }
  
  toValue(defs?: Definitions): any {
    return {
      __error: true,
      message: this.error.message,
      position: this.getStartPos()
    };
  }
  
  getStartPos(): Position {
    return this.position.getStartPos();
  }
  
  getEndPos(): Position {
    return this.position.getEndPos();
  }
}

### Example of Simple Changes

```typescript
// In tokenizer/index.ts - Fix regex variable naming
const reSectionSchemaName = /^(?:(?:(?<name>[\p{L}\p{M}\p{N}\-_]+)(?<sep>[ \t]*:[ \t]*)?)(?<schema>\$[\p{L}\p{M}\p{N}\-_]+)?|(?<schema2>\$[\p{L}\p{M}\p{N}\-_]+))/u

// In ast-parser.ts - Add simple type guard
private isValidToken(token: Token | null): token is Token {
  return token !== null;
}

// In nodes/objects.ts - Add simple utility method
isEmpty(): boolean {
  return this.children.length === 0;
}

// In index.ts - Fix the incomplete string literal
if (key.startsWith('$')) {
  defs.push(key, memberNode.value, true);
  schemaDefs.push({ key, schemaDef: memberNode.value });
  continue;
}
```

## Implementation Strategy

### Phase 1: Critical Bug Fixes
- Fix syntax errors and incomplete code
- Ensure all existing tests still pass
- Add basic validation where missing

### Phase 2: Type Safety Improvements  
- Add type guards and better typing
- Improve method signatures
- Add readonly modifiers

### Phase 3: Simple Performance Optimizations
- Cache regex patterns
- Optimize string operations
- Reduce object allocations

### Phase 4: Enhanced Error Handling
- Improve error messages
- Add missing error cases
- Ensure consistent error reporting

### Phase 5: Add Simple Utilities
- Add helper methods to existing classes
- Add debugging support
- Add validation methods

## Testing Strategy

### Comprehensive Test Coverage

Since we're making changes to critical parser functionality, we need extensive testing to ensure nothing breaks:

#### 1. Unit Tests for Each Component

**Tokenizer Tests**:
- Valid token parsing (strings, numbers, symbols, etc.)
- Invalid token handling (malformed strings, invalid numbers)
- Error recovery behavior (continue on error)
- Position tracking accuracy
- Section separator parsing
- Annotated string parsing

**AST Parser Tests**:
- Object parsing (simple, nested, empty)
- Array parsing (simple, nested, with objects)
- Collection parsing (valid objects, error recovery)
- Document structure parsing
- Error handling in collections (skip to next `~` token)
- Section parsing with names and schemas

**Node Tests**:
- All node types (ObjectNode, ArrayNode, CollectionNode, etc.)
- Node serialization (`toValue` methods)
- Position tracking
- ErrorNode functionality

#### 2. Integration Tests

**End-to-End Parser Tests**:
- Complete Internet Object documents
- Documents with headers and multiple sections
- Documents with schema definitions
- Documents with variable references
- Mixed valid/invalid content

**Error Handling Integration**:
- Collections with some invalid objects
- Invalid tokens in valid documents
- Malformed sections
- Schema validation errors

#### 3. Regression Tests

**Bug Fix Verification**:
- Test the incomplete string literal fix
- Test the completed `io.ts` implementation
- Test all existing functionality still works

**Performance Tests**:
- Large document parsing
- Deeply nested structures
- Many sections and collections

#### 4. Test Structure

```
tests/parser/
├── unit/
│   ├── tokenizer.test.ts      # Tokenizer unit tests
│   ├── ast-parser.test.ts     # AST parser unit tests
│   ├── nodes/
│   │   ├── object-node.test.ts
│   │   ├── array-node.test.ts
│   │   ├── collection-node.test.ts
│   │   ├── document-node.test.ts
│   │   └── error-node.test.ts
│   └── main-parser.test.ts    # Main parser function tests
├── integration/
│   ├── complete-documents.test.ts
│   ├── error-handling.test.ts
│   └── schema-validation.test.ts
├── regression/
│   ├── bug-fixes.test.ts
│   └── existing-functionality.test.ts
└── performance/
    └── large-documents.test.ts
```

#### 5. Test Cases for Error Handling

**Collection Error Recovery**:
```typescript
describe('Collection Error Recovery', () => {
  it('should skip invalid object and continue to next ~ token', () => {
    const input = `
    ~ valid, object, here
    ~ invalid { unclosed object
    ~ another, valid, object
    `;
    
    const result = parse(input);
    expect(result.sections[0].child.children).toHaveLength(3);
    expect(result.sections[0].child.children[1]).toBeInstanceOf(ErrorNode);
  });
});
```

**Tokenizer Error Recovery**:
```typescript
describe('Tokenizer Error Recovery', () => {
  it('should continue tokenizing after invalid escape sequence', () => {
    const input = `"valid string", "invalid\\z escape", "another valid"`;
    
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    
    expect(tokens).toHaveLength(5); // 3 strings + 2 commas
    expect(tokens[2].type).toBe('ERROR_TOKEN');
  });
});
```

#### 6. Test Data Coverage

**Valid Internet Object Syntax**:
- All supported data types
- Nested structures
- Collections and arrays
- Schema definitions
- Variable references

**Invalid Syntax Scenarios**:
- Malformed strings
- Invalid numbers
- Unclosed brackets
- Missing delimiters
- Invalid schema definitions

**Edge Cases**:
- Empty documents
- Very large documents
- Deeply nested structures
- Unicode characters
- Mixed line endings

### Testing Implementation Plan

1. **Phase 1**: Set up test infrastructure and basic unit tests
2. **Phase 2**: Implement comprehensive tokenizer tests
3. **Phase 3**: Implement AST parser tests with error handling
4. **Phase 4**: Add integration tests for complete parsing pipeline
5. **Phase 5**: Add regression tests and performance tests

This ensures every change is thoroughly tested and existing functionality remains intact.