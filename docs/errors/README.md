# Internet Object Error System

Welcome to the documentation for the Internet Object error handling system. This system is designed to be robust, consistent across languages, and helpful to users.

## 📚 Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [**Error Code Registry**](./ERROR-CODE-REGISTRY.md) | Official list of all 45+ error codes. **FROZEN**. | Contributors, Port Maintainers |
| [**Error Handling Guidelines**](./ERROR-HANDLING-GUIDELINES.md) | Standards for writing error messages (Style Guide). | Contributors |
| [**Architecture & Design**](./ARCHITECTURE-ERROR-HANDLING.md) | Deep dive into the recursive error aggregation pattern. | Architects, Core Team |
| [**Infrastructure & Best Practices**](./ERROR-INFRASTRUCTURE.md) | Research and organizational strategy. | Core Team |

---

## 🚀 Quick Start

### For Library Users

*How to handle errors when using InternetObject*

InternetObject throws typed errors that you can catch and inspect.

```typescript
import { IOValidationError, IOSyntaxError } from 'internet-object';

try {
  const doc = io.parse(data);
} catch (e) {
  if (e instanceof IOValidationError) {
    console.error("Validation failed:", e.message);
    console.error("Error Code:", e.errorCode); // e.g., 'not-a-number'
  } else if (e instanceof IOSyntaxError) {
    console.error("Syntax error:", e.message);
  }
}
```

### For Contributors

*How to throw errors when developing InternetObject*

1. **Find the right code**: Check [ERROR-CODE-REGISTRY.md](./ERROR-CODE-REGISTRY.md).
2. **Write the message**: Follow [ERROR-HANDLING-GUIDELINES.md](./ERROR-HANDLING-GUIDELINES.md).
3. **Throw it**:

```typescript
import { ErrorCode, IOValidationError } from '../errors';

throw new IOValidationError(
  ErrorCode.INVALID_VALUE,
  "Value must be between 1 and 10",
  node
);
```

---

## 🏗️ System Architecture

The error system is built on four pillars:

1. **Recursive Error Aggregation**: Errors are stored in leaf nodes (Collections) and aggregated dynamically by parent nodes (Documents). This ensures the document always reflects the current state of its children without manual synchronization.
   * *See [ARCHITECTURE-ERROR-HANDLING.md](./ARCHITECTURE-ERROR-HANDLING.md) for details.*

2. **Frozen Error Codes**: We use a fixed set of string-based error codes (e.g., `string-not-closed`) to ensure compatibility across all language implementations (JS, Go, Python, etc.).
   * *See [ERROR-CODE-REGISTRY.md](./ERROR-CODE-REGISTRY.md) for the list.*

3. **Categorized Errors**: Errors are grouped into:
   * **Tokenization**: Character-level issues (Lexer)
   * **Parsing**: Structure-level issues (Parser)
   * **Validation**: Logic/Constraint-level issues (Schema)
   * **General**: Cross-cutting issues

4. **Continue-on-Error Strategy**: The parser and validator are designed to collect as many errors as possible (continue-on-error) rather than halting at the first error. This provides a better developer experience.
   * *Note: A "Return-on-Error" (fail fast) strategy is planned for future performance-critical scenarios.*

---

## 📂 Directory Structure

```text
docs/errors/
├── README.md                       # This file
├── ERROR-CODE-REGISTRY.md          # The source of truth for error codes
├── ERROR-HANDLING-GUIDELINES.md    # Style guide for error messages
├── ARCHITECTURE-ERROR-HANDLING.md  # Technical design documentation
├── ERROR-INFRASTRUCTURE.md         # Background research and planning
├── categories/                     # (Future) Detailed docs per category
└── codes/                          # (Future) Detailed docs per error code
```

## 🔒 Change Policy

* **Error Codes**: Are part of the public API. Changing them is a **breaking change**.
* **Error Messages**: Can be improved at any time, provided they follow the guidelines.
* **New Codes**: Require approval and must be added to the Registry.

---

**Status**: Phase 1 Complete ✅
