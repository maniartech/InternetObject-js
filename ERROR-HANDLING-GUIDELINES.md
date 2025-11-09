# Internet Object - Error Handling Guidelines

> **Version:** 1.0.0
> **Last Updated:** November 9, 2025
> **Status:** Foundation Standard

## 🎯 Philosophy

**Errors are teaching moments, not roadblocks.**

Every error message should:
1. **Explain** what went wrong (the problem)
2. **Show** where it happened (the context)
3. **Guide** how to fix it (the solution)
4. **Educate** why it matters (optional, for complex cases)

---

## 📊 Error Architecture

### Layer Structure

```
┌─────────────────────────────────────┐
│     USER CODE                       │
│  (Catches and handles errors)       │
└─────────────────────────────────────┘
              ↑
              │ Error Propagation
              │
┌─────────────────────────────────────┐
│  LAYER 4: Core API                  │
│  - io.doc`...`                      │
│  - parse() / stringify()            │
│  Error: IOError (base)              │
└─────────────────────────────────────┘
              ↑
┌─────────────────────────────────────┐
│  LAYER 3: Schema Validation         │
│  - Type checking                    │
│  - Constraint validation            │
│  Error: IOValidationError           │
│  Codes: ValidationErrorCodes        │
└─────────────────────────────────────┘
              ↑
┌─────────────────────────────────────┐
│  LAYER 2: AST Parser                │
│  - Structure parsing                │
│  - Syntax validation                │
│  Error: IOSyntaxError               │
│  Codes: ParsingErrorCodes           │
└─────────────────────────────────────┘
              ↑
┌─────────────────────────────────────┐
│  LAYER 1: Tokenizer                 │
│  - Character scanning               │
│  - Token generation                 │
│  Error: IOSyntaxError               │
│  Codes: TokenizationErrorCodes      │
└─────────────────────────────────────┘
```

### Error Class Hierarchy

```typescript
Error (JavaScript base)
  └─ IOError (base class)
       ├─ IOSyntaxError (tokenization + parsing)
       └─ IOValidationError (schema validation)
```

---

## 📝 Error Message Template

### Standard Format

```
[WHAT] Problem description in active voice.
[WHERE] Location: file.io:3:15
[CONTEXT] Relevant code snippet or value causing the issue
[WHY] Brief explanation of why this is wrong (optional)
[HOW] Suggested fix: "Try X" or "Change Y to Z"
[DOCS] Learn more: https://docs.internetobject.org/errors/[error-code]
```

### Examples by Quality Level

#### ❌ BAD (Current state - many errors)
```
Error: unexpected-token
"Unexpected token 'foo'" at 3:15
```
**Problems:**
- No context about what was expected
- No suggestion for fixing
- No explanation of why it's wrong
- Generic, unhelpful

#### ⚠️ OKAY (Minimum acceptable)
```
Error: unexpected-token
Unexpected token 'foo'. Expected a valid value (string, number, boolean, null, array, or object).
Location: 3:15
```
**Better because:**
- Lists what was expected
- Has location

**Still missing:**
- Context snippet
- Actionable suggestion
- Link to docs

#### ✅ GOOD (Target quality)
```
Error: unexpected-token
Unexpected token 'foo' in array. Expected a value, comma, or closing bracket ']'.

  2 |   name, age, city
  3 |   Alice, 30, foo]
           ^^^
  4 |   Bob, 25, NYC

Arrays in Internet Object require values to be properly formatted:
- Strings with spaces need quotes: "New York"
- Numbers: 123 or 123.45
- Booleans: true or false

Try:
  • Add quotes if 'foo' is meant to be a string: "foo"
  • Remove 'foo' if it's an error
  • Check if you meant a different value

Location: file.io:3:15
Learn more: https://docs.internetobject.org/errors/unexpected-token
```

**Excellent because:**
- Shows exact problem with context
- Visual indicator (^^^) points to issue
- Explains why (arrays need formatted values)
- Provides 3 concrete solutions
- Links to docs

---

## 🏗️ Guidelines by Layer

### LAYER 1: Tokenizer Errors

**Responsibility:** Character-level problems (unterminated strings, invalid escapes, malformed tokens)

**Error Type:** `IOSyntaxError`
**Error Codes:** `TokenizationErrorCodes`

#### Guidelines

1. **Show the actual character position**
   ```typescript
   // ✅ GOOD
   throw new IOSyntaxError(
     TokenizationErrorCodes.stringNotClosed,
     `Unterminated string literal. Expected closing quote '"' before end of input.`,
     positionRange,
     true // isEof
   );
   ```

2. **Indicate what character was expected**
   ```typescript
   // ✅ GOOD
   `Invalid escape sequence '\\x'. Use valid escapes: \\n, \\t, \\", \\', \\\\, or \\uXXXX.`

   // ❌ BAD
   `Invalid escape sequence`
   ```

3. **For EOF errors, show where the construct started**
   ```typescript
   // ✅ GOOD - Use tokenSpanRange to show from opening quote to EOF
   const range = tokenSpanRange(openingQuote, currentToken);
   ```

#### Common Tokenizer Error Patterns

| Error Code | Template | Example |
|------------|----------|---------|
| `string-not-closed` | Unterminated string literal. Expected closing quote '[quote]' before end of input. | `"hello` → Expected closing `"` |
| `invalid-escape-sequence` | Invalid escape sequence '\\[char]'. Use valid escapes: \\n, \\t, \\", \\', \\\\, or \\uXXXX. | `"hello\x"` → Invalid `\x` |
| `invalid-datetime` | Invalid datetime format '[value]'. Expected ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ | `2023-13-45` → Invalid month |

---

### LAYER 2: Parser Errors (AST Construction)

**Responsibility:** Structural problems (missing brackets, unexpected tokens, invalid syntax)

**Error Type:** `IOSyntaxError`
**Error Codes:** `ParsingErrorCodes`

#### Guidelines

1. **Use `createUnclosedConstructError()` for boundary detection**
   ```typescript
   // ✅ GOOD - Shows range from '{' to last valid token
   throw this.createUnclosedConstructError(
     ParsingErrorCodes.expectingBracket,
     `Missing closing brace '}'. Object must be properly closed.`,
     openBracket,
     members
   );
   ```

2. **Distinguish between EOF and sync boundary errors**
   ```typescript
   // At EOF
   `Unexpected end of input while parsing array. Expected closing bracket ']'.`

   // At sync boundary (~ or ---)
   `Missing closing bracket ']'. Array must be properly closed before collection/section boundary.`
   ```

3. **Explain context for complex structures**
   ```typescript
   // ✅ GOOD
   `Missing comma before '${token.value}'. Object members must be separated by commas.`

   // ❌ BAD
   `Unexpected token '${token.value}'`
   ```

4. **For error recovery, explain what happened**
   ```typescript
   // ✅ GOOD - Error accumulation message
   `Duplicate section name '${name}'. Each section must have a unique name within the document.`
   // Note: Parser auto-renames to `${name}_2` and continues
   ```

#### Common Parser Error Patterns

| Error Code | Template | Example |
|------------|----------|---------|
| `unexpected-token` | Unexpected token '[token]' in [context]. Expected [what]. | `{a b}` → Missing comma or colon |
| `expecting-bracket` | Missing closing [bracket]. [Construct] must be properly closed. | `[1,2,3` → Missing `]` |
| `invalid-key` | Invalid key '[key]'. Object keys must be strings, numbers, booleans, or null. | `{true: 1}` → Invalid key type |
| `unexpectedPositionalMember` | Unexpected positional member after keyed member. All keyed members must come after positional members. | `{a, x:1, b}` → Mixed order |

---

### LAYER 3: Validation Errors (Schema Checking)

**Responsibility:** Type and constraint violations (wrong type, out of range, pattern mismatch)

**Error Type:** `IOValidationError`
**Error Codes:** `ValidationErrorCodes`

#### Guidelines

1. **Show expected vs actual**
   ```typescript
   // ✅ GOOD
   `Expected number but got string '${value}'.`

   // ❌ BAD
   `Invalid type`
   ```

2. **For ranges, show the violated constraint**
   ```typescript
   // ✅ GOOD
   `Number ${value} is out of range. Expected: ${min} <= value <= ${max}.`

   // ❌ BAD
   `Out of range`
   ```

3. **For patterns, show the expected format**
   ```typescript
   // ✅ GOOD
   `Invalid email '${value}'. Expected format: user@domain.com`

   // ❌ BAD
   `Invalid email`
   ```

4. **Suggest closest valid value when possible**
   ```typescript
   // ✅ EXCELLENT
   `Invalid choice '${value}'. Valid options: ${choices.join(', ')}. Did you mean '${closest}'?`
   ```

#### Common Validation Error Patterns

| Error Code | Template | Example |
|------------|----------|---------|
| `not-a-number` | Expected number but got [type] '[value]'. | `age: "25"` with `number` schema |
| `out-of-range` | Number [value] is out of range. Expected: [min] <= value <= [max]. | `age: 150` with range `[0, 120]` |
| `invalid-length` | String length [actual] exceeds maximum [max]. | `name: "verylongname..."` |
| `invalid-pattern` | String '[value]' does not match pattern [regex]. Expected format: [description]. | `email: "notanemail"` |
| `invalid-choice` | Invalid choice '[value]'. Valid options: [choices]. | `color: "purple"` for `["red", "blue"]` |

---

### LAYER 4: Core API Errors

**Responsibility:** High-level orchestration errors (missing schema, invalid input, API misuse)

**Error Type:** `IOError` (base)

#### Guidelines

1. **Focus on API contract violations**
   ```typescript
   // ✅ GOOD
   `Schema required for validation. Provide schema via io.doc.with(schema) or second parameter.`

   // ❌ BAD
   `Missing schema`
   ```

2. **Guide users to correct API usage**
   ```typescript
   // ✅ GOOD
   `Invalid input type '${typeof input}'. Expected string or Buffer.`

   // With example:
   `Try: io.doc\`name, age\nAlice, 30\``
   ```

---

## 🎨 Error Message Writing Style

### Voice and Tone

- ✅ **Active voice:** "Expected comma" not "Comma was expected"
- ✅ **Present tense:** "Missing bracket" not "Bracket was missing"
- ✅ **Conversational:** "Try adding quotes" not "Quotation marks must be added"
- ✅ **Specific:** "Expected ]" not "Expected closing delimiter"
- ✅ **Helpful:** "Did you mean X?" when there's a close match
- ❌ **Avoid blame:** "Invalid input" not "You provided invalid input"
- ❌ **Avoid jargon:** "Array must end with ]" not "Missing terminal symbol"

### Formatting Conventions

1. **Code/tokens in single quotes:** `'{'`, `'foo'`, `','`
2. **Technical terms in backticks:** `number`, `string`, `null`
3. **User values in single quotes:** `'Alice'`, `'30'`
4. **Ranges in math notation:** `[0, 100]`, `min <= value <= max`
5. **Bullet points for multiple solutions:**
   ```
   Try:
     • Option A
     • Option B
     • Option C
   ```

### Length Guidelines

- **One-liner (minimum):** 50-80 characters - Problem + location
- **Standard (target):** 150-250 characters - Problem + context + suggestion
- **Detailed (complex errors):** 300-500 characters - Problem + context + why + how + docs
- **Maximum:** 1000 characters - Detailed explanation with examples

---

## 🔧 Implementation Patterns

### Pattern 1: Simple Error (Tokenizer/Parser)

```typescript
throw new IOSyntaxError(
  ErrorCodes.stringNotClosed,
  `Unterminated string literal. Expected closing quote '"' before end of input.`,
  positionRange,
  true // isEof
);
```

### Pattern 2: Error with Context (Parser)

```typescript
throw new IOSyntaxError(
  ErrorCodes.unexpectedToken,
  `Unexpected token '${token.value}' in object. Expected comma ',' between members or closing brace '}'.`,
  token,
  false
);
```

### Pattern 3: Error with Suggestion (Validation)

```typescript
throw new IOValidationError(
  ErrorCodes.notANumber,
  `Expected number but got string '${value}'. Remove quotes to use as number: ${value} or use a numeric value.`,
  positionRange,
  false
);
```

### Pattern 4: Error with Range (Unclosed Construct)

```typescript
throw this.createUnclosedConstructError(
  ErrorCodes.expectingBracket,
  `Missing closing bracket ']'. Array started at ${startPos.row}:${startPos.col} but never closed.`,
  openBracket,
  elements
);
```

### Pattern 5: Error Accumulation (Phase 2)

```typescript
// Instead of throwing, accumulate for better diagnostics
const error = new IOSyntaxError(
  ErrorCodes.duplicateMember,
  `Duplicate section name '${name}'. Each section must have a unique name within the document.`,
  nameToken,
  false
);
this.errors.push(error); // Collect, don't throw

// Continue with error recovery (e.g., auto-rename)
```

---

## 📚 Error Code Naming Conventions

### Structure

```
[category]-[specific-issue]
```

### Categories

- **Tokenization:** Character/token level
  - `string-not-closed`
  - `invalid-escape-sequence`
  - `invalid-datetime`

- **Parsing:** Structure/syntax level
  - `unexpected-token`
  - `expecting-bracket`
  - `invalid-key`

- **Validation:** Type/constraint level
  - `not-a-number`
  - `out-of-range`
  - `invalid-pattern`

### Rules

1. **Kebab-case:** `invalid-escape-sequence` not `invalidEscapeSequence`
2. **Descriptive:** `string-not-closed` not `str-err-01`
3. **Specific:** `invalid-email` not `invalid-string`
4. **Unique:** No code reuse across categories
5. **Searchable:** Users can Google `"io-js string-not-closed"`

---

## 🧪 Testing Error Messages

### Checklist for Every Error

- [ ] **Error code present** and matches category
- [ ] **Message is helpful** (passes "can user fix it?" test)
- [ ] **Position accurate** (points to actual problem)
- [ ] **Context shown** (for complex errors)
- [ ] **Suggestion provided** (when possible)
- [ ] **No jargon** (accessible to beginners)
- [ ] **Consistent tone** (matches other errors)
- [ ] **Tested manually** (actually tried to fix based on message)

### Error Message Review Process

Before committing error message changes:

1. **Read it out loud** - Does it sound natural?
2. **Give to a beginner** - Can they understand it?
3. **Try to fix the error** - Is the suggestion clear?
4. **Compare with similar errors** - Is it consistent?
5. **Check error catalog** - Is it documented?

---

## 📖 Error Catalog (To Be Created)

**Location:** `docs/errors/` (future work)

Each error code should have:

1. **Code:** `string-not-closed`
2. **Category:** Tokenization
3. **Description:** String literal was not closed with matching quote
4. **Common causes:**
   - Forgot closing quote
   - Used wrong quote type (mismatched ' and ")
   - Newline in string without multiline syntax
5. **Examples:**
   - ❌ Bad: `"hello`
   - ✅ Good: `"hello"`
6. **Related errors:** `invalid-escape-sequence`
7. **Learn more:** Link to string documentation

---

## 🎯 Priority Order for Error Message Improvements

### Phase 1: High-Impact Errors (Week 1)
**Top 20 most common errors** based on test failures and user reports:

1. `unexpected-token` (Parser) - Most common, very generic currently
2. `expecting-bracket` (Parser) - Arrays and objects
3. `string-not-closed` (Tokenizer) - Beginners struggle with this
4. `not-a-number` (Validation) - Type confusion
5. `out-of-range` (Validation) - Needs better range display
6. `invalid-key` (Parser) - Object key rules unclear
7. `not-a-string` (Validation) - Type confusion
8. `invalid-pattern` (Validation) - Regex errors confusing
9. `invalid-choice` (Validation) - Should suggest closest match
10. `duplicate-member` (Validation) - Object key uniqueness
11. `invalid-length` (Validation) - String length constraints
12. `invalid-escape-sequence` (Tokenizer) - Escape rules unclear
13. `not-an-array` (Validation) - Type confusion
14. `invalid-email` (Validation) - Pattern explanation needed
15. `invalid-url` (Validation) - Pattern explanation needed
16. `not-a-bool` (Validation) - Type confusion
17. `not-an-integer` (Validation) - Int vs float distinction
18. `invalid-datetime` (Tokenizer) - ISO 8601 format unclear
19. `additional-values-not-allowed` (Validation) - Schema strictness
20. `unknown-member` (Validation) - Schema member mismatch

### Phase 2: Complete Coverage (Week 2)
- All remaining tokenization errors
- All remaining parsing errors
- All remaining validation errors

### Phase 3: Polish (Week 3)
- Add contextual examples to complex errors
- Implement "did you mean?" suggestions
- Add visual indicators (arrows, highlights)
- Create error catalog documentation

---

## 💡 Examples: Before & After

### Example 1: Unterminated String

#### ❌ Before
```
Error: string-not-closed
"Unterminated string literal" at 3:15
```

#### ✅ After
```
Error: string-not-closed
Unterminated string literal. Expected closing quote '"' before end of input.

  2 |   name, age
  3 |   "Alice, 30
        ^
  4 | ---

String literals in Internet Object must be closed with a matching quote.

Try:
  • Add closing quote: "Alice", 30
  • Check for escaped quotes: "She said \"hi\""
  • Use multiline strings if needed (see docs)

Location: file.io:3:7 to EOF
Learn more: https://docs.internetobject.org/errors/string-not-closed
```

### Example 2: Type Mismatch

#### ❌ Before
```
Error: not-a-number
"Invalid type" at 3:15
```

#### ✅ After
```
Error: not-a-number
Expected number but got string '"25"' for member 'age'.

  Schema: { name: string, age: number, city: string }
  Data:   { Alice, "25", NYC }
                   ^^^^

The schema requires 'age' to be a number (no quotes).

Try:
  • Remove quotes: Alice, 25, NYC
  • If '25' is meant to be text, update schema to: age: string

Location: file.io:3:15
Learn more: https://docs.internetobject.org/errors/not-a-number
```

### Example 3: Missing Bracket

#### ❌ Before
```
Error: expecting-bracket
"Missing closing bracket" at 4:1
```

#### ✅ After
```
Error: expecting-bracket
Missing closing bracket ']'. Array started at 2:10 but was never closed.

  1 | name, ages, city
  2 | Alice, [25, 30, NYC
             ^~~~~~~~~~
  3 | Bob, [28], SF
  4 | ---

Array opened with '[' must be closed with ']' before the next member or section.

Try:
  • Add closing bracket: Alice, [25, 30], NYC
  • Check if array is complete: [25, 30] or [25]

Location: file.io:2:10 to 2:19
Learn more: https://docs.internetobject.org/errors/expecting-bracket
```

---

## 🚀 Action Plan

### Week 1: Foundation
- [ ] Review and approve these guidelines
- [ ] Set up error message templates in code
- [ ] Create helper functions for common patterns
- [ ] Fix top 10 highest-impact errors

### Week 2: Coverage
- [ ] Fix all tokenization error messages
- [ ] Fix all parsing error messages
- [ ] Fix all validation error messages
- [ ] Add tests for error message quality

### Week 3: Polish
- [ ] Add contextual snippets to complex errors
- [ ] Implement "did you mean?" for close matches
- [ ] Create error catalog documentation
- [ ] User testing with real developers

---

## 📊 Success Metrics

### Quantitative
- **Error self-service rate:** >90% of users can fix errors without external help
- **Support questions about errors:** Reduce by 80%
- **Time to fix errors:** Average <2 minutes (measured in user testing)
- **Error message quality score:** >4.5/5 in user surveys

### Qualitative
- Developers say "helpful" not "confusing"
- Beginners can understand and fix errors
- Error messages cited as positive in reviews
- Reduced frustration in user feedback

---

## 🔗 Related Documents

- `READINESS-TRACKER.md` - Overall project readiness
- `src/errors/` - Error class implementations
- `docs/errors/` - Error catalog (to be created)
- `tests/errors/` - Error message tests

---

## 📝 Appendix: Complete Error Code Reference

### Tokenization Layer
```typescript
enum TokenizationErrorCodes {
  stringNotClosed = 'string-not-closed',
  invalidEscapeSequence = 'invalid-escape-sequence',
  unsupportedAnnotation = 'unsupported-annotation',
  invalidDateTime = 'invalid-datetime'
}
```

### Parsing Layer
```typescript
enum ParsingErrorCodes {
  unexpectedToken = 'unexpected-token',
  expectingBracket = 'expecting-bracket',
  unexpectedPositionalMember = 'unexpected-positional-member',
  invalidKey = 'invalid-key',
  invalidSchema = 'invalid-schema',
  schemaNotFound = 'schema-not-found',
  schemaMissing = 'schema-missing',
  emptyMemberDef = 'empty-memberdef',
  invalidDefinition = 'invalid-definition',
  invalidMemberDef = 'invalid-memberdef',
  invalidSchemaName = 'invalid-schema-name',
  variableNotDefined = 'variable-not-defined',
  schemaNotDefined = 'schema-not-defined'
}
```

### Validation Layer
```typescript
enum ValidationErrorCodes {
  invalidObject = 'invalid-object',
  unknownMember = 'unknown-member',
  duplicateMember = 'duplicate-member',
  additionalValuesNotAllowed = 'additional-values-not-allowed',
  invalidArray = 'invalid-array',
  notAnArray = 'not-an-array',
  notAString = 'not-a-string',
  invalidEmail = 'invalid-email',
  invalidUrl = 'invalid-url',
  invalidLength = 'invalid-length',
  invalidMinLength = 'invalid-min-length',
  invalidMaxLength = 'invalid-max-length',
  invalidPattern = 'invalid-pattern',
  unsupportedNumberType = 'unsupported-number-type',
  notANumber = 'not-a-number',
  notAnInteger = 'not-an-integer',
  outOfRange = 'out-of-range',
  invalidRange = 'invalid-range',
  invalidScale = 'invalid-scale',
  invalidPrecision = 'invalid-precision',
  notABool = 'not-a-bool',
  invalidChoice = 'invalid-choice'
}
```

---

**End of Guidelines** | Version 1.0.0 | November 2025
