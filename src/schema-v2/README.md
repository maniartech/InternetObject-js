# Schema V2 - Next Generation Schema System

> **Status:** Active Development (Parallel to schema v1)
> **Target:** InternetObject v2.0
> **Started:** November 10, 2025

## 🎯 Goals

- ⚡ **10x faster validation** through compile-time optimization
- 🏗️ **Clean architecture** with clear separation of concerns
- 💎 **Type-safe** leveraging TypeScript's power
- 🔄 **Serialization first-class** with round-trip guarantee
- 🎨 **Ergonomic API** that's intuitive and discoverable

## 📁 Architecture

```
schema-v2/
  ├── types/              # Type implementations (String, Number, etc.)
  │   ├── type.ts         # Core Type interface
  │   ├── string-type.ts  # String validation & serialization
  │   ├── number-type.ts  # Number validation & serialization
  │   └── ...
  │
  ├── context/            # Validation & serialization contexts
  │   ├── validation-context.ts
  │   ├── validation-result.ts
  │   └── serialization-context.ts
  │
  ├── compilation/        # Schema compilation
  │   ├── compiled-schema.ts
  │   ├── compiled-field.ts
  │   └── schema-compiler.ts
  │
  ├── builder/            # Fluent schema builder
  │   ├── schema-builder.ts
  │   └── field-builder.ts
  │
  └── index.ts            # Public API exports
```

## 🔑 Key Concepts

### 1. Type System

Every type implements the `Type<TInput, TOutput>` interface:
- `validate()` - Transform and validate input
- `serialize()` - Convert to IO format string

### 2. Schema Compilation

Schemas are compiled once into optimized `CompiledSchema`:
- Pre-built validator functions
- Efficient field traversal
- Cached type handlers

### 3. Context-Based Processing

Rich context objects flow through validation/serialization:
- `ValidationContext` - Error accumulation, path tracking, schema resolution
- `SerializationContext` - Formatting options, escaping, indentation

### 4. Error Accumulation

Default behavior is to collect ALL errors:
- Full path to error location
- Clear error messages
- Helpful suggestions

## 🚀 Usage Example

```typescript
import { SchemaBuilder, StringType, NumberType } from './schema-v2';

// Build schema with fluent API
const userSchema = new SchemaBuilder('user')
  .string('name', { minLength: 1, maxLength: 100 })
  .number('age', { min: 0, max: 150, integer: true })
  .string('email', { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  .array('tags', new StringType())
  .build();

// Validate data
const result = userSchema.validate(data, ctx);
if (result.success) {
  console.log('Valid:', result.value);
} else {
  console.error('Errors:', result.errors);
}

// Serialize to IO format
const ioString = userSchema.serialize(result.value, serCtx);
```

## 🔄 Migration from Schema V1

Schema V2 runs in parallel with V1. Migration path:

1. **Phase 1 (Now):** V2 development alongside V1
2. **Phase 2 (Week 2):** Adapter layer for V1 → V2
3. **Phase 3 (Week 3):** Deprecation warnings on V1
4. **Phase 4 (v2.0):** Remove V1 (breaking change)

## 📊 Performance Goals

- **Validation:** < 1ms for 1000-field schemas
- **Memory:** 50% less than V1
- **Bundle:** < 5KB impact (tree-shakable)
- **Compilation:** < 10ms for complex schemas

## ✅ Progress

- [x] Directory structure
- [ ] Core Type interface
- [ ] ValidationContext & SerializationContext
- [ ] Base types (String, Number, Boolean)
- [ ] CompiledSchema
- [ ] SchemaBuilder
- [ ] Integration tests
- [ ] Performance benchmarks

## 🔗 Related Documents

- [SCHEMA-REVAMP-PROPOSAL.md](../../SCHEMA-REVAMP-PROPOSAL.md) - Full proposal
- [SERIALIZATION-ARCHITECTURE.md](../../SERIALIZATION-ARCHITECTURE.md) - Serialization design
