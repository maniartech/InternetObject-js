# Error System Documentation

This directory contains comprehensive documentation for InternetObject's error handling system.

## 📋 Overview

InternetObject uses a **frozen error code registry** to ensure consistency across all language implementations (JavaScript, Go, Python, Java, Rust, etc.). Error codes are human-readable strings (e.g., `invalid-type`, `string-not-closed`) rather than numeric codes.

**Key Principles:**
- **Cross-Language Stability**: All implementations must use identical error codes
- **Human-Readable**: Codes describe the error (e.g., `not-a-number` not `V-042`)
- **No Breaking Changes**: Error codes are part of the public API contract
- **Teaching Moments**: Errors guide users to solutions, not just report problems

## 📚 Documentation Files

### [ERROR-CODE-REGISTRY.md](./ERROR-CODE-REGISTRY.md)
**The official frozen registry of all 45 error codes.**

- Complete catalog across 4 categories (General, Tokenization, Parsing, Validation)
- Usage statistics and patterns
- Change policy (FROZEN - no new codes without approval)
- Cross-language coordination requirements

**When to use:** Implementing new language ports, auditing error usage, proposing new error codes

### [ERROR-HANDLING-GUIDELINES.md](./ERROR-HANDLING-GUIDELINES.md)
**Writing standards for error messages across all layers.**

- Error message template (WHAT/WHERE/WHY/HOW/DOCS)
- Quality levels (Bad → Okay → Good with examples)
- Layer-by-layer guidelines (Tokenizer, Parser, Validation, Core API)
- Top 20 errors prioritized by impact
- Writing style guide (active voice, present tense, conversational)

**When to use:** Writing new error messages, improving existing errors, code reviews

### [ERROR-INFRASTRUCTURE.md](./ERROR-INFRASTRUCTURE.md)
**Industry best practices for error code organization.**

- Research: TypeScript, Rust, Kubernetes, Go, Stripe approaches
- Recommended file structure (src/errors/ + docs/errors/)
- Consolidated enum design
- Migration plan and phasing
- Cross-language coordination strategy

**When to use:** Architectural decisions, porting to new languages, infrastructure changes

## 🗂️ Directory Structure

```
docs/errors/
├── README.md                       ← You are here
├── ERROR-CODE-REGISTRY.md          ← Official frozen registry
├── ERROR-HANDLING-GUIDELINES.md    ← Message writing standards
├── ERROR-INFRASTRUCTURE.md         ← Architecture and best practices
├── categories/                     ← [Future] Category documentation
│   ├── general.md
│   ├── tokenization.md
│   ├── parsing.md
│   └── validation.md
└── codes/                          ← [Future] Individual error pages
    ├── invalid-type.md
    ├── unexpected-token.md
    └── ... (one page per error code)
```

## 🏗️ Code Structure

Error handling code lives in `src/errors/`:

```
src/errors/
├── error-codes.ts                  ← Consolidated enum (all 45 codes)
├── general-error-codes.ts          ← Category exports (backwards compat)
├── tokenization-error-codes.ts
├── parsing-error-codes.ts
├── validation-error-codes.ts
├── io-error.ts                     ← Base error class
├── io-syntax-error.ts              ← Tokenization/parsing errors
├── io-validation-error.ts          ← Schema validation errors
└── index.ts                        ← Public exports
```

## 🔢 Error Code Categories

### General (4 codes)
Core errors applicable across all layers:
- `invalid-type` - Type mismatch at definition level
- `invalid-value` - Value doesn't meet constraints
- `value-required` - Missing required value
- `null-not-allowed` - Null where not permitted

### Tokenization (4 codes)
Character-level syntax errors:
- `string-not-closed` - Unterminated string literal
- `invalid-escape-sequence` - Unknown escape in string
- `unsupported-annotation` - Unrecognized annotation syntax
- `invalid-datetime` - Malformed datetime format

### Parsing (13 codes)
Structural syntax errors:
- `unexpected-token` - Token doesn't fit grammar
- `expecting-bracket` - Missing closing bracket
- `invalid-key` - Malformed object key
- `invalid-schema` - Schema definition error
- ... (see registry for complete list)

### Validation (24 codes)
Schema constraint violations:
- `not-a-number` - Expected number, got other type
- `out-of-range` - Number outside min/max bounds
- `invalid-email` - Malformed email address
- `invalid-pattern` - String doesn't match regex
- ... (see registry for complete list)

## 🚀 Quick Start

### For Developers (JavaScript/TypeScript)

**Throwing errors:**
```typescript
import { ErrorCode } from '../errors';
import { IOValidationError } from '../errors';

// Specific error code
throw new IOValidationError(
  ErrorCode.NOT_A_NUMBER,
  "Expected a number but got string 'hello'",
  { line: 5, col: 10 }
);

// With helpful fact
throw new IOValidationError(
  ErrorCode.OUT_OF_RANGE,
  "Age 150 is outside allowed range [0, 120]",
  { line: 8, col: 15 },
  "Age must be between 0 and 120 for human records"
);
```

**Backwards compatible:**
```typescript
import { ValidationErrorCodes } from '../errors'; // Still works!
throw new IOValidationError(ValidationErrorCodes.notANumber, ...);
```

### For Language Port Implementers

1. **Read ERROR-CODE-REGISTRY.md** - Your implementation MUST use these exact codes
2. **Follow ERROR-HANDLING-GUIDELINES.md** - Message format should match
3. **Use ERROR-INFRASTRUCTURE.md** - Organize your error code structure
4. **Coordinate changes** - Propose new codes to core team first

### For Documentation Writers

1. Start with **ERROR-HANDLING-GUIDELINES.md** for message standards
2. Check **ERROR-CODE-REGISTRY.md** for official codes
3. Use quality level "Good" as the bar (context + suggestions + docs)

## 📊 Current Status

- **Total Error Codes**: 45
- **Active**: 37 (82%)
- **Unused**: 8 (18%) - under review
- **Pass Rate**: 96.1% (1,404 passing / 57 failing tests)
- **Infrastructure Phase**: Phase 1 Complete ✅

### Recent Changes
- **Phase 1 Complete** (Nov 2025): Documentation moved to docs/errors/, structure organized
- **Next**: Phase 2 - Consolidate error-codes.ts enum (in progress)

## 🔒 Change Policy

### Adding New Error Codes
1. Propose to core team with justification
2. Verify no existing code covers the use case
3. Update ERROR-CODE-REGISTRY.md
4. Coordinate with all language implementations
5. Get approval before merging

### Modifying Error Messages
- **Allowed**: Improving clarity, adding context, fixing typos
- **Not Allowed**: Changing error codes, removing information

### Cross-Language Coordination
All changes to error codes must be synchronized across:
- JavaScript/TypeScript (this repo)
- Go implementation
- Python implementation (future)
- Java implementation (future)
- Rust implementation (future)

## 📖 Further Reading

- [READINESS-TRACKER.md](../READINESS-TRACKER.md) - Overall project status
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - How to contribute
- [src/errors/](../../src/errors/) - Implementation code

## 💬 Questions?

For questions about error handling:
1. Check ERROR-HANDLING-GUIDELINES.md first
2. Review ERROR-CODE-REGISTRY.md for official codes
3. Open an issue with label `error-handling`
4. Tag maintainers for cross-language coordination

---

**Last Updated**: November 2025
**Status**: Phase 1 Complete ✅
**Next Phase**: Consolidate error-codes.ts enum
