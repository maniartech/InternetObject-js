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

### Pattern 5: Embedded Error Aggregation

```typescript
// Instead of throwing, accumulate in the collection
const error = new IOValidationError(
  ErrorCodes.duplicateMember,
  `Duplicate section name '${name}'. Each section must have a unique name within the document.`,
  nameToken,
  false
);

// 1. Push to collection's error list (for programmatic access)
collection.errors.push(error);

// 2. Push ErrorNode to collection (for serialization/visualization)
collection.push(new ErrorNode(error, ...));

// Continue processing...
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
  3 |   ---
  4 |   "Alice, 30
    |    ^


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

## 📖 Error Catalog

The complete list of error codes is maintained in the **[Error Code Registry](./ERROR-CODE-REGISTRY.md)**.

Please refer to that document for:
- The official list of all error codes
- Correct spelling and categorization
- Usage status (Active/Deprecated)

---

## 🔗 Related Documents

- [**Error Code Registry**](./ERROR-CODE-REGISTRY.md) - The single source of truth for error codes
- [**Architecture**](./ARCHITECTURE-ERROR-HANDLING.md) - How errors are processed internally
- `src/errors/` - Error class implementations
- `tests/errors/` - Error message tests

---

**End of Guidelines** | Version 1.0.0 | November 2025
