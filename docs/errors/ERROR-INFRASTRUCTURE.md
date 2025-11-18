# Error Infrastructure - Best Practices & Organization

> **Purpose:** Define where error codes, registry, and documentation live in the codebase
> **Audience:** Core team, contributors, language port maintainers
> **Status:** Recommendation for approval

---

## 🎯 Industry Best Practices Research

### What Leading Projects Do

#### 1. **TypeScript** (Microsoft)
```
typescript/
  src/
    compiler/
      diagnosticMessages.json  ← All error codes + messages
      diagnostics.ts           ← Error utilities
  docs/
    errors/                    ← Public error documentation
```
**Approach:** Central JSON file, generated types, public docs site

#### 2. **Rust Compiler**
```
rust/
  compiler/
    rustc_error_codes/
      error_codes.rs          ← Error code definitions
      error_codes/            ← Individual error explanations
        E0001.md
        E0002.md
  src/doc/
    error_codes.md            ← Error documentation
```
**Approach:** Code-driven, Markdown docs per error, rustc --explain E0001

#### 3. **Kubernetes**
```
kubernetes/
  staging/
    src/k8s.io/
      apimachinery/
        pkg/
          api/
            errors/
              errors.go       ← Error types + codes
  docs/
    tasks/
      debug/               ← Troubleshooting guides
```
**Approach:** Error types in core, troubleshooting docs separate

#### 4. **Go Standard Library**
```
go/
  src/
    errors/
      errors.go             ← Error interface + utilities
  doc/
    effective_go.html       ← Error handling patterns
```
**Approach:** Minimal core, conventions over codes

#### 5. **Stripe API** (Best-in-class error design)
```
stripe-api/
  lib/
    error.rb                ← Error classes
    errors/                 ← Specific error types
      api_error.rb
      card_error.rb
  docs/
    api/
      errors/               ← Public error reference
```
**Approach:** Typed errors, comprehensive public docs

---

## 📊 Comparison: Error Organization Strategies

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Central Registry File** (TypeScript) | Single source of truth, easy to maintain, generate types | Can become large, merge conflicts | Large teams |
| **Distributed Enums** (Ours currently) | Co-located with code, modular | Can drift, harder to audit | Small teams |
| **Code + Docs** (Rust) | Self-documenting, explain command | Duplication, maintenance | Educational projects |
| **Simple Strings** (Go) | Minimal, flexible | No contract, inconsistent | Simple projects |
| **Typed Errors** (Stripe) | Type-safe, clear hierarchy | More boilerplate | Production APIs |

---

## ✅ Recommended Structure for Internet Object

### Philosophy

**Hybrid approach:** Code defines contract, docs explain usage, registry tracks status

**Principles:**
1. **Error codes live near usage** (src/errors/) - Developers find them easily
2. **Registry lives in docs** (docs/) - Cross-language reference
3. **Guidelines live in root** (temporary) → Move to docs later
4. **Public docs** (website) - User-facing error catalog

### Proposed Directory Structure

```
internet-object-js/
  ├── src/
  │   └── errors/                          ← SOURCE OF TRUTH (code)
  │       ├── index.ts                      ← Export all error types
  │       ├── io-error.ts                   ← Base error class
  │       ├── io-syntax-error.ts            ← Syntax error class
  │       ├── io-validation-error.ts        ← Validation error class
  │       ├── error-codes.ts                ← **REGISTRY (TypeScript)**
  │       │   // Consolidated error codes enum
  │       │   // export enum ErrorCode {
  │       │   //   INVALID_TYPE = 'invalid-type',
  │       │   //   STRING_NOT_CLOSED = 'string-not-closed',
  │       │   //   ...
  │       │   // }
  │       ├── general-error-codes.ts        ← (Keep for categories)
  │       ├── tokenization-error-codes.ts   ← (Keep for categories)
  │       ├── parsing-error-codes.ts        ← (Keep for categories)
  │       └── validation-error-codes.ts     ← (Keep for categories)
  │
  ├── docs/                                ← DOCUMENTATION (reference)
  │   └── errors/
  │       ├── README.md                    ← Error system overview
  │       ├── ERROR-CODE-REGISTRY.md       ← **REGISTRY (human-readable)**
  │       │   // Cross-language reference
  │       │   // Status tracking (used/unused)
  │       │   // Change policy
  │       ├── ERROR-HANDLING-GUIDELINES.md ← Writing standards
  │       ├── ARCHITECTURE-ERROR-HANDLING.md ← Architecture & patterns
  │       ├── categories/
  │       │   ├── general.md               ← General errors explained
  │       │   ├── tokenization.md          ← Tokenization errors
  │       │   ├── parsing.md               ← Parsing errors
  │       │   └── validation.md            ← Validation errors
  │       └── codes/                       ← Individual error docs (future)
  │           ├── invalid-type.md
  │           ├── string-not-closed.md
  │           └── ...
  │
  ├── tests/
  │   └── errors/                          ← ERROR TESTS
  │       ├── error-range-validation.test.ts
  │       ├── array-error-ranges.test.ts
  │       └── ...
  │
  └── READINESS-TRACKER.md                 ← Root (project status)

```

---

## 📝 Detailed Recommendations

### 1. Source Code (src/errors/)

**Current state:** ✅ Already well organized!

**Keep:**
- Category-based enum files (general, tokenization, parsing, validation)
- Error class hierarchy (IOError → IOSyntaxError/IOValidationError)

**Add:**
- `error-codes.ts` - Consolidated enum for all codes (generated from categories)
- JSDoc on every error code with usage example

**Example: src/errors/error-codes.ts**

```typescript
/**
 * Complete registry of all Internet Object error codes.
 *
 * @remarks
 * These codes are part of the API contract and must remain stable
 * across all language implementations. See docs/errors/ERROR-CODE-REGISTRY.md
 * for cross-language reference and change policy.
 *
 * @public
 */
export enum ErrorCode {
  // ============================================
  // GENERAL ERRORS (Cross-cutting)
  // ============================================

  /**
   * Type specification is invalid or unknown.
   * @example
   * Schema: { age: invalidType }  // Unknown type
   * Error: invalid-type
   */
  INVALID_TYPE = 'invalid-type',

  /**
   * Value doesn't meet basic requirements.
   */
  INVALID_VALUE = 'invalid-value',

  // ... (all 45 codes with JSDoc)
}

// Export category subsets for convenience
export const GeneralErrorCodes = {
  INVALID_TYPE: ErrorCode.INVALID_TYPE,
  INVALID_VALUE: ErrorCode.INVALID_VALUE,
  VALUE_REQUIRED: ErrorCode.VALUE_REQUIRED,
  NULL_NOT_ALLOWED: ErrorCode.NULL_NOT_ALLOWED,
} as const;

// ... other categories
```

**Benefits:**
- Single import: `import { ErrorCode } from './errors'`
- Type-safe: `ErrorCode.INVALID_TYPE`
- Auto-complete works
- Can't typo error codes
- Easy to grep all usage

---

### 2. Documentation (docs/errors/)

**Purpose:** Cross-language reference + user-facing docs

**Create structure:**

```
docs/errors/
├── README.md                       ← Start here (overview)
├── ERROR-CODE-REGISTRY.md          ← Authoritative registry
├── ERROR-HANDLING-GUIDELINES.md    ← Writing standards
├── categories/                     ← Organized by category
│   ├── general.md
│   ├── tokenization.md
│   ├── parsing.md
│   └── validation.md
└── codes/                          ← Individual error docs (Phase 2)
    ├── invalid-type.md
    ├── string-not-closed.md
    └── unexpected-token.md
```

**docs/errors/README.md** (New file - Overview)

```markdown
# Internet Object Error System

## Quick Reference

**Error Categories:**
- [General](categories/general.md) - Cross-cutting errors
- [Tokenization](categories/tokenization.md) - Character-level errors
- [Parsing](categories/parsing.md) - Structure-level errors
- [Validation](categories/validation.md) - Type/constraint errors

**For Developers:**
- [Error Code Registry](ERROR-CODE-REGISTRY.md) - Complete list of all codes
- [Error Handling Guidelines](ERROR-HANDLING-GUIDELINES.md) - How to write errors
- [Architecture](./ARCHITECTURE-ERROR-HANDLING.md) - System design

**For Users:**
- [Troubleshooting Guide](#) (future)
- [Common Errors](#) (future)
- [Error Code Lookup](#) (future)

## Understanding Error Messages

Every Internet Object error follows this pattern:

```
Error: [error-code]
[Problem description]

Location: file.io:3:15
[Context snippet with visual indicator]

[Why this is wrong]

Try:
  • [Suggestion 1]
  • [Suggestion 2]

Learn more: https://docs.internetobject.org/errors/[error-code]
```

## Error Classes

- `IOError` - Base error class
- `IOSyntaxError` - Tokenization and parsing errors
- `IOValidationError` - Schema validation errors

## Quick Examples

### Unterminated String
```typescript
const io = require('internet-object');
io.parse('"hello');  // Missing closing quote
// Error: string-not-closed
// Unterminated string literal. Expected closing quote '"' before end of input.
```

### Type Mismatch
```typescript
io.parse('Alice, "25"', { schema: 'name: string, age: number' });
// Error: not-a-number
// Expected number but got string '"25"' for member 'age'.
```

See [Error Catalog](#) for all errors.
```

**docs/errors/ERROR-CODE-REGISTRY.md**
- Keep current content (comprehensive registry)
- Move from root → docs/errors/
- This is the SOURCE OF TRUTH for cross-language coordination

**docs/errors/ERROR-HANDLING-GUIDELINES.md**
- Keep current content (writing standards)
- Move from root → docs/errors/
- This is the STYLE GUIDE for all error messages

---

### 3. Root Documentation (project root)

**Keep in root:**
- `READINESS-TRACKER.md` - Project status (already there)
- `README.md` - Main entry point
- `CONTRIBUTING.md` - How to contribute
- `DESIGN.md` - Architecture decisions

**Move to docs/errors/:**
- `ERROR-CODE-REGISTRY.md` → `docs/errors/ERROR-CODE-REGISTRY.md`
- `ERROR-HANDLING-GUIDELINES.md` → `docs/errors/ERROR-HANDLING-GUIDELINES.md`

**Why move:**
- Root should be high-level only
- Detailed technical docs belong in docs/
- Easier to navigate for new contributors
- Consistent with other projects (TypeScript, Rust, etc.)

---

### 4. Public Website (future: docs.internetobject.org)

**Structure:**

```
docs.internetobject.org/
├── errors/
│   ├── index.html              ← Error catalog homepage
│   ├── string-not-closed/      ← Individual error pages
│   │   └── index.html
│   ├── unexpected-token/
│   │   └── index.html
│   └── ...
```

**Each error page contains:**
- Error code and description
- Common causes
- Examples (bad → good)
- Related errors
- Link to source code
- Searchable/indexed by Google

**Example: docs.internetobject.org/errors/string-not-closed**

```markdown
# string-not-closed

**Category:** Tokenization
**Class:** IOSyntaxError

## Description

String literal was not closed with matching quote before end of input.

## Common Causes

1. Forgot closing quote
2. Used wrong quote type (mismatched ' and ")
3. Newline in string without escaping

## Examples

❌ **Bad:**
```io
name, age
"Alice, 30
```

✅ **Good:**
```io
name, age
"Alice", 30
```

## How to Fix

- Add closing quote: `"Alice"`
- Check for escaped quotes: `"She said \"hi\""`
- Use proper multiline syntax if needed

## See Also

- [invalid-escape-sequence](../invalid-escape-sequence)
- [String Documentation](/types/string)

## Source Code

- [TypeScript](https://github.com/maniartech/internetobject-js/blob/main/src/parser/tokenizer/index.ts#L325)
- [Go](https://github.com/maniartech/internetobject-go/...)
```

---

## 🚀 Migration Plan

### Phase 1: Organize Source Code (Week 1)

**Day 1-2: Consolidate error codes**
```bash
# Create consolidated enum
src/errors/error-codes.ts   # New file with all 45 codes

# Keep category files for backwards compat
src/errors/general-error-codes.ts
src/errors/tokenization-error-codes.ts
src/errors/parsing-error-codes.ts
src/errors/validation-error-codes.ts
```

**Day 3-4: Add JSDoc to all codes**
```typescript
// Add documentation to every error code
/**
 * [Description]
 *
 * @category [General|Tokenization|Parsing|Validation]
 * @example
 * [Usage example]
 */
STRING_NOT_CLOSED = 'string-not-closed',
```

**Day 5: Update imports**
```typescript
// Update all files to use consolidated ErrorCode enum
import { ErrorCode } from './errors';

// Old: ErrorCodes.stringNotClosed
// New: ErrorCode.STRING_NOT_CLOSED
```

---

### Phase 2: Organize Documentation (Week 1-2)

**Create docs/errors/ structure:**
```bash
mkdir -p docs/errors/categories
mkdir -p docs/errors/codes

# Move registry and guidelines
mv ERROR-CODE-REGISTRY.md docs/errors/
mv ERROR-HANDLING-GUIDELINES.md docs/errors/

# Create overview
touch docs/errors/README.md

# Create category docs
touch docs/errors/categories/general.md
touch docs/errors/categories/tokenization.md
touch docs/errors/categories/parsing.md
touch docs/errors/categories/validation.md
```

**Write category documentation:**
- General errors (4 codes) - 1-2 hours
- Tokenization errors (4 codes) - 1-2 hours
- Parsing errors (13 codes) - 3-4 hours
- Validation errors (24 codes) - 4-5 hours

---

### Phase 3: Individual Error Pages (Week 2-3)

**Create docs for top 20 most common errors:**

Priority list (by usage frequency):
1. `invalid-type` (11x)
2. `unexpected-token` (6x)
3. `invalid-schema` (6x)
4. `invalid-precision` (6x)
5. `expecting-bracket` (5x)
... (see ERROR-CODE-REGISTRY.md)

**Template:** `docs/errors/codes/[error-code].md`
- Description
- Common causes
- Examples (bad → good)
- How to fix
- Related errors

---

### Phase 4: Public Website (Future)

**Build static site generator:**
- Convert Markdown to HTML
- Add search functionality
- Generate error catalog index
- Deploy to docs.internetobject.org/errors/

**Tools:**
- VitePress, Docusaurus, or custom
- Syntax highlighting for IO examples
- Cross-references between errors

---

## 📋 Implementation Checklist

### Immediate (This Week)

- [ ] **Review and approve this structure**
- [ ] **Create `src/errors/error-codes.ts`** - Consolidated enum
- [ ] **Add JSDoc to all 45 error codes**
- [ ] **Create `docs/errors/` directory**
- [ ] **Move ERROR-CODE-REGISTRY.md to docs/errors/**
- [ ] **Move ERROR-HANDLING-GUIDELINES.md to docs/errors/**
- [ ] **Create docs/errors/README.md** - Overview

### Short-term (Next 2 Weeks)

- [ ] **Create category documentation** (4 files)
- [ ] **Write top 20 error code docs** (individual pages)
- [ ] **Update all imports** to use ErrorCode enum
- [ ] **Add error code constants** to each language port

### Long-term (Future)

- [ ] **Build error catalog website**
- [ ] **Add search functionality**
- [ ] **Set up docs.internetobject.org domain**
- [ ] **Create error explain CLI command** (`io explain string-not-closed`)

---

## 🌍 Cross-Language Coordination

### Each Language Port Must Have:

**1. Error Code Definitions**
```
src/errors/codes.{ext}     # All 45 codes as constants/enum
```

**Examples:**
```typescript
// TypeScript
export enum ErrorCode {
  INVALID_TYPE = 'invalid-type',
  // ...
}
```

```go
// Go
const (
  InvalidType = "invalid-type"
  StringNotClosed = "string-not-closed"
  // ...
)
```

```python
# Python
class ErrorCode:
    INVALID_TYPE = "invalid-type"
    STRING_NOT_CLOSED = "string-not-closed"
    # ...
```

**2. Link to Registry**
```
# Each language repo links to canonical registry
README.md → "Error codes defined in docs.internetobject.org/errors/"
```

**3. Consistent Naming**
- Error code strings: IDENTICAL across languages (`'invalid-type'`)
- Constant names: Follow language conventions (camelCase, SCREAMING_SNAKE, etc.)

---

## 💡 Best Practices Summary

### DO ✅

- ✅ Keep error codes human-readable: `string-not-closed`
- ✅ Co-locate code with implementation: `src/errors/`
- ✅ Centralize registry: `docs/errors/ERROR-CODE-REGISTRY.md`
- ✅ Document every code with JSDoc
- ✅ Use TypeScript enums for type safety
- ✅ Maintain cross-language registry
- ✅ Version error code changes

### DON'T ❌

- ❌ Use numeric codes without names: `T-003`
- ❌ Scatter error definitions across codebase
- ❌ Add codes without documentation
- ❌ Change codes without major version bump
- ❌ Let languages drift apart
- ❌ Skip migration planning

---

## 🔗 Related Documents

- `ERROR-CODE-REGISTRY.md` - Complete error code list
- `ERROR-HANDLING-GUIDELINES.md` - Error message standards
- `ARCHITECTURE-ERROR-HANDLING.md` - System design
- `../../READINESS-TRACKER.md` - Project status

---

## 📞 Questions & Decisions

### For Team Discussion

1. **Approve directory structure?** (src/errors/ + docs/errors/)
2. **Approve consolidation of error codes?** (Create error-codes.ts)
3. **Timeline for Phase 1?** (This week vs next sprint)
4. **Who maintains cross-language registry?** (Core team lead?)

---

**Status:** DRAFT - Awaiting approval
**Author:** GitHub Copilot + Core Team
**Date:** November 9, 2025
