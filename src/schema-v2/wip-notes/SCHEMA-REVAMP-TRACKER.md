# Schema V2 Revamp - Master Tracker & Orchestrator

> **Single Source of Truth for Schema V2 Implementation**
> **Last Updated:** November 11, 2025
> **Status:** Planning Phase → Implementation Ready
> **Target:** InternetObject v2.0
> **Estimated Timeline:** 4 weeks (parallel with serialization)
>
> **CRITICAL:** Lazy resolution pattern (V1 proven) documented and mandatory for all validators

## 🎯 Vision & Goals

Transform InternetObject's schema system into a **high-performance, type-safe, developer-friendly** validation and serialization engine.

### Primary Goals

1. **⚡ 10x Performance** - Compile-time optimization, cached validators
2. **🏗️ Clean Architecture** - Separation of concerns, testable components
3. **💎 Type Safety** - Full TypeScript support with inference
4. **🔄 Serialization First-Class** - Bidirectional with round-trip guarantee
5. **🎨 Ergonomic API** - Intuitive, discoverable, chainable

### Success Criteria

- ✅ Schema compilation < 10ms for complex schemas
- ✅ Validation < 1ms for 1000-field schemas
- ✅ Memory usage 50% less than V1
- ✅ Bundle impact < 5KB (tree-shakable)
- ✅ 100% backward compatible via adapter
- ✅ Round-trip: `parse → validate → serialize → parse` preserves data

---

## 📊 Implementation Status Dashboard

## 🛡️ Engineering Principles & Guardrails

All implementation MUST adhere to these non-negotiable standards. They act as automatic review criteria and failure to meet them blocks merge.

### Core Principles
1. **KISS (Keep It Simple & Sharp)** – Prefer the simplest design that satisfies the requirement; avoid speculative complexity. One public concept per file unless cohesion demands more.
2. **SRP (Single Responsibility Principle)** – Each class/module/function has exactly one reason to change. If a function does validation AND formatting, split it.
3. **DRY (Don’t Repeat Yourself)** – Shared logic extracted into internal helpers under `internal/` or colocated private functions. No copy‑pasted validator snippets—compose from primitives.
4. **Fail Fast Internally, Accumulate Externally** – Inside a single field validator throw early for impossible state; user‑facing validation returns aggregated `ValidationResult`.
5. **Deterministic & Pure** – Validation and serialization routines are pure given identical inputs (no hidden globals, time, locale). Side effects restricted to context mutation (errors, path, perf metrics).
6. **Explicit > Implicit** – Config must be declared; no magic shape inference from data at runtime.

### Performance Budgets (Hard Limits)
| Target | Budget | Enforcement |
|--------|--------|-------------|
| Base type validate() | < 50µs (avg) | microbench in CI Week 2 |
| Object (100 fields) validation | < 1ms | benchmark script Week 2/4 |
| Schema compile (100 fields) | < 10ms | benchmark script Week 1/4 |
| Additional memory per compiled schema | < 5KB | heap snapshot diff |
| IODefinitions builder call chain (10 adds) | < 0.2ms | perf test Week 3 |
| Round‑trip serialize+parse (medium doc) | < 2ms | Week 3 integration |

If any budget exceeded → mark task blocked, optimize before proceeding downstream.

### Error Handling Standards

**MANDATORY:** Follow comprehensive guidelines in `docs/errors/ERROR-HANDLING-GUIDELINES.md`

| Aspect | Rule |
|--------|------|
| Codes | Stable, namespaced (`SCHEMA_TYPE_INVALID`, `VALIDATION_RANGE_EXCEEDED`) |
| Messages | Template: `[CODE] Summary. • Found: … • Expected: … • Suggestion: …` |
| Location | Always include line, column, path array for structured errors |
| Aggregation | All validation errors returned together; parsing continues where safe |
| Throwing | Reserved for programmer errors (invariant violations), NEVER for user data issues |
| Docs Link | Each public error exposes `docRef?: string` for future linking |
| Quality | Every error must pass 8-point checklist (see ERROR-HANDLING-GUIDELINES.md) |

### Testing Policy
| Layer | Mandatory Tests |
|-------|-----------------|
| Unit | Each public method: happy path + 2 edge cases |
| Property | Pure functions (e.g., number normalization) – fuzz 100 random inputs |
| Integration | End‑to‑end: schema compile → validate → serialize → parse round‑trip |
| Regression | Every fixed bug adds a test reproducing prior failure |
| Performance | Benchmarks tracked; fail build if >10% regression vs baseline |
| Coverage | Lines >= 90%, branches >= 85% (excluding generated code) |

### Coding Conventions
- **File Naming:** `kebab-case` for files, `PascalCase` for classes, `camelCase` for functions/vars.
- **Public API Surface:** Export only via `index.ts` barrels; avoid deep import reliance.
- **Mutability:** Prefer `readonly` on config & compiled structures; contexts are the only mutable orchestrators.
- **Null vs Undefined:** Use `undefined` for “not provided”; `null` only when semantically meaningful (explicit empty value). Never return both interchangeably.
- **Type Narrowing:** Centralize custom type guards in `type-guards.ts` to prevent duplication.
- **Internal Helpers:** Prefix with underscore if exported solely for testing (temporary; aim to make private).

### Documentation & Developer Experience
- All public types/functions/classes have JSDoc including: purpose, parameters, returns, error scenarios, performance notes if relevant.
- Examples must be runnable (copy/paste into TypeScript file without modification).
- Complex validations include mini timeline (steps executed) inside comments when non‑trivial.

### Dependency Policy
- No new runtime dependencies without justification (performance, security, correctness). Prefer zero‑dependency utility implementations.
- Dev dependencies allowed for benchmarking/testing only; must be tagged in `package.json` comments if large.

### Security & Robustness
- Reject prototype pollution vectors (`__proto__`, `constructor`) during object field traversal.
- Validate regex patterns to avoid catastrophic backtracking (length & safe prefix check).
- Avoid recursive unbounded descent—guard against deep nesting > 100 levels (configurable soft limit). Produce graceful depth error.

### Definition of Done (DoD) – Per Task
Every task check box ONLY marked complete when:
1. Code implemented following principles above.
2. Tests (unit + required integration) added & passing locally.
3. Performance budget measured (where applicable) and within limits or benchmark TODO added with justification.
4. No lint/type errors (`yarn type-check`).
5. JSDoc added/updated.
6. Added to relevant section in CHANGELOG (future) or tracker update.

### Pull Request Checklist (Auto-Review)
Before merge, author asserts all YES:
- [ ] Single responsibility respected.
- [ ] No duplicated logic (scanned for similar blocks).
- [ ] Error messages follow template & include codes.
- [ ] Added/updated tests cover success + failure paths.
- [ ] Performance unchanged or improved (numbers posted).
- [ ] Public API additions documented.
- [ ] No unnecessary dependencies.
- [ ] All TODOs have owner + date or are scoped out.
- [ ] Tracker sections updated (progress % / task status).

Violations → convert PR to draft until resolved.

### Progress Reporting Standard
- Update this tracker at least once per workday with: % changed components, newly added tests count, benchmark deltas.
- Use semantic commit messages: `schema(types): add number-type precision handling`.
- Include performance numbers in commit body when touching validator or compiler.

---

### Overall Progress: 5%

| Component | Status | Progress | Priority | Blocking |
|-----------|--------|----------|----------|----------|
| **Core Architecture** | 🟡 Planning | 10% | P0 | - |
| **Type System** | 🔴 Not Started | 0% | P0 | Architecture |
| **Validation Context** | 🔴 Not Started | 0% | P0 | Architecture |
| **Schema Compilation** | 🔴 Not Started | 0% | P1 | Type System |
| **IODefinitions Builder** | 🔴 Not Started | 0% | P0 | Architecture |
| **Load API** | 🔴 Not Started | 0% | P1 | IODefinitions |
| **Serialization Integration** | 🔴 Not Started | 0% | P2 | Load API |
| **V1→V2 Adapter** | 🔴 Not Started | 0% | P2 | All Core |
| **Testing & Benchmarks** | 🔴 Not Started | 0% | P1 | Ongoing |

**Legend:**
- 🟢 Complete | 🟡 In Progress | 🔴 Not Started | ⚪ Blocked

---

## 🗺️ Master Implementation Roadmap

### Phase 0: Foundation (Week 0 - Pre-Implementation)

**Status:** ✅ Complete
**Duration:** Completed November 10, 2025

**Deliverables:**
- ✅ Directory structure created (`types/`, `context/`, `compilation/`, `builder/`)
- ✅ Three design documents synchronized (SCHEMA-REVAMP-PROPOSAL, SERIALIZATION-ARCHITECTURE, SERIALIZATION-USAGE-GUIDE)
- ✅ API patterns standardized (IODefinitions builder)
- ✅ Cross-references established
- ✅ Implementation plans documented

**Quality Gate:** All design documents synchronized ✅

---

### Phase 1: Core Type System (Week 1)

**Status:** 🔴 Not Started
**Priority:** P0 - Foundation for everything
**Duration:** 5 days

#### Day 1-2: TypeSchema Interface & Base Types

**Files to Create:**
- `src/schema-v2/types/type-schema.ts` - Core interface
- `src/schema-v2/types/string-type.ts` - String validator
- `src/schema-v2/types/number-type.ts` - Number validator
- `src/schema-v2/types/boolean-type.ts` - Boolean validator

**Interface Definition:**

```typescript
interface TypeSchema<TConfig = any, TValue = any> {
  readonly typeName: string;
  readonly configSchema: Schema<TConfig>; // Self-documenting!

  validate(value: unknown, config: TConfig, ctx: ValidationContext): ValidationResult<TValue>;
  serialize(value: TValue, config: TConfig, ctx: SerializationContext): string;

  // Optional hooks
  compile?(config: TConfig): CompiledValidator<TValue>;
  getDefaultValue?(config: TConfig): TValue | undefined;
}
```

**Tasks:**
- [ ] Define `TypeSchema<TConfig, TValue>` interface
- [ ] Implement `StringTypeSchema` with config validation
- [ ] Implement `NumberTypeSchema` with config validation
- [ ] Implement `BooleanTypeSchema` with config validation
- [ ] Add unit tests for each type (50 tests target)

**Success Criteria:**
- ✅ All base types validate correctly
- ✅ Config validation works (invalid config → error)
- ✅ Serialization round-trip works
- ✅ 50+ tests passing

**Estimated Effort:** 2 days

---

#### Day 3: Validation Context & Result

**Files to Create:**
- `src/schema-v2/context/validation-context.ts`
- `src/schema-v2/context/validation-result.ts`

**Context Design:**

```typescript
class ValidationContext {
  private errors: ValidationError[] = [];
  private path: string[] = [];
  private schemas: Map<string, CompiledSchema>;

  pushPath(segment: string): void;
  popPath(): void;
  addError(error: ValidationError): void;

  // Schema resolution for nested types
  resolveSchema(name: string): CompiledSchema | undefined;

  // Performance tracking
  startValidation(field: string): void;
  endValidation(field: string): void;
}

interface ValidationResult<T> {
  success: boolean;
  value?: T;
  errors: ValidationError[];
}
```

**🎯 CRITICAL: V1 Lazy Resolution Pattern (Proven & Required)**

Based on analysis of V1 implementation (src/core/definitions.ts, src/schema/types/common-type.ts), we MUST implement lazy resolution for both variables and schema references. This pattern is proven and enables:
- ✅ Recursive schemas (self-referential types)
- ✅ Order-independent reference validation
- ✅ Compile-time symbolic references, runtime resolution

**V1 Pattern Analysis:**

```typescript
// V1: IODefinitions.getV() - Core resolution method
getV(key: string | TokenNode): any {
  if (key instanceof TokenNode) {
    key = key.value;
  }
  const def = this._definitions.get(key);
  if (!def) {
    throw new ValidationError(`Undefined variable or schema: ${key}`);
  }

  // RECURSIVE RESOLUTION: Handle nested variable references
  if (def.value instanceof TokenNode) {
    const resolved = this.getV(def.value);
    if (resolved instanceof Schema) {
      this.set(key, resolved); // Cache compiled schema
      return resolved;
    }
  }
  return def.value;
}

// V1: Universal validator pattern (used in ALL type validators)
const valueNode = defs?.getV(node) || node;

// V1: Choices resolution (runtime, in common-type.ts)
for (let choice of memberDef.choices) {
  if (typeof choice === 'string' && choice[0] === '@') {
    choice = defs?.getV(choice);  // Resolve at validation time
    choice = (choice as any) instanceof TokenNode ? choice.value : choice;
  }
  if (val === choice) { found = true; break; }
}

// V1: Schema references kept as TokenNode through compile
if (node instanceof TokenNode && node.value.startsWith('$')) {
  return node; // Don't compile yet, resolve at validation
}
```

**V2 Improvements (Preserve Pattern + Add Optimizations):**

```typescript
class ValidationContext {
  private errors: ValidationError[] = [];
  private path: string[] = [];
  private definitions: IODefinitions; // Access to V1's getV() - already has caching!

  // Cycle detection only (the one V1 gap)
  private resolvingVars = new Set<string>();
  private resolvingSchemas = new Set<string>();

  // Wrapper for cycle detection - otherwise just use defs.getV()
  resolveVarSafe(name: string): any {
    if (this.resolvingVars.has(name)) {
      throw new ValidationError(`Circular variable reference: @${name}`);
    }
    this.resolvingVars.add(name);
    try {
      return this.definitions.getV(`@${name}`); // V1's method - already cached!
    } finally {
      this.resolvingVars.delete(name);
    }
  }

  resolveSchemaSafe(name: string): CompiledSchema | undefined {
    if (this.resolvingSchemas.has(name)) {
      throw new ValidationError(`Circular schema reference: $${name}`);
    }
    this.resolvingSchemas.add(name);
    try {
      return this.definitions.getV(`$${name}`); // V1's method - already cached!
    } finally {
      this.resolvingSchemas.delete(name);
    }
  }

  pushPath(segment: string): void;
  popPath(): void;
  addError(error: ValidationError): void;

  // Performance tracking (optional)
  startValidation(field: string): void;
  endValidation(field: string): void;
}

// In validators, use defs.getV() directly (it's already O(1) and cached)
// Only use ctx.resolveVarSafe() if you need cycle detection
const value = defs.getV(node); // Simple and proven!
```

**Migration Strategy: V1 → V2**

| V1 Pattern | V2 Equivalent | Improvement |
|------------|---------------|-------------|
| `defs?.getV(node)` | `ctx.resolveVar(name)` or `ctx.resolveSchema(name)` | Type-safe, cached |
| `defs?.getV(choice)` in loop | `ctx.resolveChoices(choices, path)` | Cached set lookup |
| TokenNode with `$` prefix | SchemaRefNode (typed AST) | Type safety |
| TokenNode with `@` prefix | VarRefNode (typed AST) | Type safety |
| No caching | Per-run caches (var, schema, choices) | 10x faster for repeated validations |
| No cycle detection | resolvingVars/resolvingSchemas guards | Prevents infinite loops |
| Order-dependent definitions | Same (validated at compile) | Explicit forward-ref error |

**Implementation Order:**
1. **Week 1 Day 3:** Implement ValidationContext with lazy resolution methods
2. **Week 1 Day 4:** Add per-run caching (varCache, schemaCache, choicesCache)
3. **Week 1 Day 5:** Add cycle detection guards and error messages
4. **Week 2 Day 2:** Integrate into all type validators (string, number, etc.)
5. **Week 2 Day 4:** Benchmark improvement (expect 10x for repeated validations)

**Tasks:**
- [ ] Implement `ValidationContext` with path tracking
- [ ] Add `resolveVar()` method with lazy resolution (V1 pattern)
- [ ] Add `resolveSchema()` method with lazy resolution (V1 pattern)
- [ ] Add `resolveChoices()` method with caching (V1 improvement)
- [ ] Add per-run caches (varCache, schemaCache, choicesCache)
- [ ] Add cycle detection guards (resolvingVars, resolvingSchemas Sets)
- [ ] Implement `ValidationResult<T>` interface
- [ ] Add error accumulation logic
- [ ] Add unit tests for lazy resolution (15 tests)
- [ ] Add unit tests for cycle detection (5 tests)
- [ ] Add unit tests for caching behavior (10 tests)
- [ ] Total: 30 tests target

**Success Criteria:**
- ✅ Path tracking works correctly
- ✅ Error accumulation preserves all errors
- ✅ Variable lazy resolution working with caching
- ✅ Schema lazy resolution working with caching
- ✅ Cycle detection prevents infinite loops
- ✅ 40+ tests passing (increased due to lazy resolution)

**Estimated Effort:** 1.5 days (increased due to lazy resolution complexity)

---

**🔧 Type Validator Integration with Lazy Resolution**

All type validators MUST follow this pattern for variable and schema resolution. This is the V1 proven pattern enhanced with caching.

**Example: String Type Validator with Choices**

```typescript
class StringTypeSchema implements TypeSchema<StringConfig, string> {
  readonly typeName = 'string';

  validate(value: unknown, config: StringConfig, ctx: ValidationContext): ValidationResult<string> {
    // 1. Handle variable references in value (V1 pattern)
    if (value instanceof VarRefNode) {
      value = ctx.resolveVar(value.name); // Lazy resolution with caching
    }

    // 2. Type check
    if (typeof value !== 'string') {
      return ValidationResult.failure([{
        code: 'SCHEMA_TYPE_INVALID',
        message: `Expected string, got ${typeof value}`,
        path: ctx.currentPath
      }]);
    }

    // 3. Choices validation with lazy resolution (V1 pattern improved)
    if (config.choices && config.choices.length > 0) {
      const resolvedChoices = ctx.resolveChoices(config.choices, ctx.currentPath.join('.'));
      if (!resolvedChoices.has(value)) {
        return ValidationResult.failure([{
          code: 'VALIDATION_INVALID_CHOICE',
          message: `Value "${value}" not in allowed choices`,
          path: ctx.currentPath,
          metadata: { choices: Array.from(resolvedChoices) }
        }]);
      }
    }

    // 4. Other validations (minLength, maxLength, pattern, etc.)
    // ...

    return ValidationResult.success(value);
  }
}
```

**Example: Object Type Validator with Schema References**

```typescript
class ObjectTypeSchema implements TypeSchema<ObjectConfig, any> {
  readonly typeName = 'object';

  validate(value: unknown, config: ObjectConfig, ctx: ValidationContext): ValidationResult<any> {
    if (typeof value !== 'object' || value === null) {
      return ValidationResult.failure([/* ... */]);
    }

    const result: any = {};
    const errors: ValidationError[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(config.fields)) {
      ctx.pushPath(fieldName);

      // Handle schema references (V1 pattern)
      let actualSchema = fieldSchema;
      if (fieldSchema instanceof SchemaRefNode) {
        const resolved = ctx.resolveSchema(fieldSchema.name);
        if (!resolved) {
          errors.push({
            code: 'SCHEMA_REFERENCE_UNRESOLVED',
            message: `Schema $${fieldSchema.name} not found`,
            path: ctx.currentPath
          });
          ctx.popPath();
          continue;
        }
        actualSchema = resolved;
      }

      // Validate field using resolved schema
      const fieldValue = (value as any)[fieldName];
      const fieldResult = actualSchema.validate(fieldValue, actualSchema.config, ctx);

      if (fieldResult.success) {
        result[fieldName] = fieldResult.value;
      } else {
        errors.push(...fieldResult.errors);
      }

      ctx.popPath();
    }

    return errors.length === 0
      ? ValidationResult.success(result)
      : ValidationResult.failure(errors);
  }
}
```

**Key Integration Points:**

1. **Variable Resolution**: `ctx.resolveVar(name)` replaces V1's `defs?.getV(node)`
2. **Schema Resolution**: `ctx.resolveSchema(name)` replaces V1's `defs?.getV($name)`
3. **Choices Resolution**: `ctx.resolveChoices(choices, path)` replaces V1's loop with caching
4. **AST Nodes**: Use typed `VarRefNode` and `SchemaRefNode` instead of generic `TokenNode`
5. **Caching**: All resolution methods cache per-run (10x performance for repeated validations)
6. **Cycle Detection**: Automatic guards prevent infinite loops in circular references

**Universal Pattern (ALL type validators):**

```typescript
// At start of validate() method:
if (value instanceof VarRefNode) {
  value = ctx.resolveVar(value.name);
}

// For choices validation:
if (config.choices) {
  const resolvedChoices = ctx.resolveChoices(config.choices, ctx.currentPath.join('.'));
  if (!resolvedChoices.has(value)) {
    // Error handling
  }
}

// For nested schema references:
if (schema instanceof SchemaRefNode) {
  schema = ctx.resolveSchema(schema.name) || throwError();
}
```

---

#### Day 4-5: Schema Compilation

**Files to Create:**
- `src/schema-v2/compilation/compiled-schema.ts`
- `src/schema-v2/compilation/compiled-field.ts`
- `src/schema-v2/compilation/schema-compiler.ts`

**Compilation Strategy:**

```typescript
class CompiledSchema {
  readonly name: string;
  readonly fields: CompiledField[];
  private validatorFn: (data: any, ctx: ValidationContext) => ValidationResult<any>;

  validate(data: unknown, ctx?: ValidationContext): ValidationResult<any> {
    const context = ctx || new ValidationContext();
    return this.validatorFn(data, context);
  }
}

class SchemaCompiler {
  compile(schema: SchemaDefinition): CompiledSchema {
    // 1. Parse schema definition
    // 2. Resolve type handlers
    // 3. Build optimized validator function
    // 4. Cache result
  }
}
```

**Tasks:**
- [ ] Implement `CompiledSchema` class
- [ ] Implement `CompiledField` class
- [ ] Implement `SchemaCompiler` with optimization
- [ ] Add caching layer
- [ ] Add compilation benchmarks (< 10ms target)
- [ ] Add unit tests (40 tests target)

**Success Criteria:**
- ✅ Compilation < 10ms for 100-field schema
- ✅ Cached compilation reuses validator
- ✅ Compiled validators 10x faster than V1
- ✅ 40+ tests passing

**Estimated Effort:** 2 days

---

**Phase 1 Quality Gate:**
- ✅ All base types working (String, Number, Boolean)
- ✅ ValidationContext tracks paths correctly
- ✅ SchemaCompiler generates optimized validators
- ✅ 120+ tests passing
- ✅ Performance targets met (< 10ms compilation)

---

### Phase 2: Advanced Types & Object Support (Week 2)

**Status:** 🔴 Not Started
**Priority:** P0 - Required for real-world use
**Duration:** 5 days

#### Day 1-2: Complex Types

**Files to Create:**
- `src/schema-v2/types/date-type.ts`
- `src/schema-v2/types/decimal-type.ts`
- `src/schema-v2/types/bigint-type.ts`
- `src/schema-v2/types/array-type.ts`

**Tasks:**
- [ ] Implement `DateTypeSchema` (ISO 8601, custom formats)
- [ ] Implement `DecimalTypeSchema` (precision, scale validation)
- [ ] Implement `BigIntTypeSchema` (range validation)
- [ ] Implement `ArrayTypeSchema` (generic item validation)
- [ ] Add unit tests (60 tests target)

**Success Criteria:**
- ✅ Date parsing handles multiple formats
- ✅ Decimal maintains precision
- ✅ BigInt supports arbitrary size
- ✅ Array validates nested items
- ✅ 60+ tests passing

**Estimated Effort:** 2 days

---

#### Day 3-4: Object Type & Nested Schemas

**Files to Create:**
- `src/schema-v2/types/object-type.ts`
- `src/schema-v2/types/type-composition.ts`

**Object Type Design:**

```typescript
class ObjectTypeSchema implements TypeSchema<ObjectConfig, any> {
  validate(value: unknown, config: ObjectConfig, ctx: ValidationContext): ValidationResult<any> {
    // 1. Check if value is object
    // 2. Validate each field according to schema
    // 3. Handle optional/required fields
    // 4. Handle additional properties
    // 5. Accumulate all errors
  }
}
```

**Tasks:**
- [ ] Implement `ObjectTypeSchema` with field validation
- [ ] Add support for nested schemas
- [ ] Add optional/required field handling
- [ ] Implement `additionalProperties` config
- [ ] Add type composition (union, intersection)
- [ ] Add unit tests (50 tests target)

**Success Criteria:**
- ✅ Nested objects validate correctly
- ✅ Optional fields work as expected
- ✅ Additional properties configurable
- ✅ Type composition works (union, intersection)
- ✅ 50+ tests passing

**Estimated Effort:** 2 days

---

#### Day 5: SerializationContext

**Files to Create:**
- `src/schema-v2/context/serialization-context.ts`

**Context Design:**

```typescript
class SerializationContext {
  readonly indent: string;
  readonly includeDefinitions: boolean;
  readonly prettyPrint: boolean;

  private indentLevel: number = 0;
  private buffer: string[] = [];

  write(text: string): void;
  writeLine(text: string): void;
  increaseIndent(): void;
  decreaseIndent(): void;

  toString(): string;
}
```

**Tasks:**
- [ ] Implement `SerializationContext` class
- [ ] Add formatting options (indent, pretty-print)
- [ ] Add buffer management
- [ ] Add unit tests (20 tests target)

**Success Criteria:**
- ✅ Pretty printing works correctly
- ✅ Indentation tracked properly
- ✅ Buffer management efficient
- ✅ 20+ tests passing

**Estimated Effort:** 1 day

---

**Phase 2 Quality Gate:**
- ✅ All advanced types working (Date, Decimal, BigInt, Array)
- ✅ Object type validates nested structures
- ✅ Type composition works (union, intersection)
- ✅ SerializationContext ready for use
- ✅ 130+ tests passing
- ✅ Validation < 1ms for 100-field object

---

### Phase 3: IODefinitions Builder & Load API (Week 3)

**Status:** 🔴 Not Started
**Priority:** P0 - Core API for users
**Duration:** 5 days

#### Day 1-2: IODefinitions Builder

**Files to Create:**
- `src/schema-v2/builder/io-definitions.ts`
- `src/schema-v2/builder/schema-builder.ts`

**Builder Design:**

```typescript
class IODefinitions {
  private vars = new Map<string, any>();
  private schemas = new Map<string, CompiledSchema>();
  private metadata = new Map<string, any>();

  addVar(name: string, value: any): this;
  addSchema(name: string, schema: SchemaDefinition | CompiledSchema): this;
  addMeta(key: string, value: any): this;

  getVar(name: string): any | undefined;
  getSchema(name: string): CompiledSchema | undefined;
  getMeta(key: string): any | undefined;

  toJSON(): { vars: any; schemas: any; metadata: any };
}

class SchemaBuilder {
  constructor(private name: string) {}

  string(name: string, config?: StringConfig): this;
  number(name: string, config?: NumberConfig): this;
  boolean(name: string, config?: BooleanConfig): this;
  date(name: string, config?: DateConfig): this;
  array(name: string, itemType: TypeSchema): this;
  object(name: string, fields: FieldDefinition[]): this;

  optional(): this;
  required(): this;

  build(): CompiledSchema;
}
```

**Tasks:**
- [ ] Implement `IODefinitions` class with fluent API
- [ ] Implement `SchemaBuilder` for ergonomic schema creation
- [ ] Add validation for builder methods
- [ ] Add method chaining support
- [ ] Add unit tests (40 tests target)

**Success Criteria:**
- ✅ Builder API intuitive and discoverable
- ✅ Method chaining works smoothly
- ✅ Builder validates inputs
- ✅ toJSON() serializes correctly
- ✅ 40+ tests passing

**Estimated Effort:** 2 days

---

#### Day 3-4: IODocument Load API

**Files to Update:**
- `src/core/document.ts` - Add load methods

**API Design:**

```typescript
class IODocument {
  // Existing: constructor(header, sections, errors)

  // NEW: Static load methods
  static load(data: any): IODocument;
  static load(data: any, schema: string | CompiledSchema): IODocument;
  static loadWithDefs(data: any, definitions: IODefinitions): IODocument;

  // NEW: Instance serialization
  toIO(options?: SerializationOptions): string;
}

interface SerializationOptions {
  includeDefinitions?: boolean;
  prettyPrint?: boolean;
  indent?: string;
}
```

**Tasks:**
- [ ] Implement `IODocument.load()` overloads
- [ ] Implement `IODocument.loadWithDefs()`
- [ ] Integrate ValidationContext for error accumulation
- [ ] Implement `toIO()` serialization method
- [ ] Add round-trip tests (parse → load → toIO → parse)
- [ ] Add unit tests (50 tests target)

**Success Criteria:**
- ✅ All load signatures work correctly
- ✅ Schema validation during load
- ✅ Error accumulation matches parsing
- ✅ toIO() produces valid IO format
- ✅ Round-trip preserves data
- ✅ 50+ tests passing

**Estimated Effort:** 2 days

---

#### Day 5: Integration Testing

**Files to Create:**
- `tests/schema-v2/integration/load-api.test.ts`
- `tests/schema-v2/integration/round-trip.test.ts`

**Tasks:**
- [ ] Create end-to-end integration tests
- [ ] Test all load API patterns
- [ ] Test round-trip scenarios
- [ ] Test error handling across layers
- [ ] Add performance benchmarks

**Success Criteria:**
- ✅ All integration tests passing (30+ tests)
- ✅ Round-trip works for all types
- ✅ Load API < 2ms for typical documents
- ✅ Error messages clear and actionable

**Estimated Effort:** 1 day

---

**Phase 3 Quality Gate:**
- ✅ IODefinitions builder working
- ✅ SchemaBuilder provides ergonomic API
- ✅ IODocument.load() all signatures work
- ✅ toIO() serialization working
- ✅ Round-trip tests passing
- ✅ 120+ tests passing
- ✅ Performance targets met

---

### Phase 4: Performance & Polish (Week 4)

**Status:** 🔴 Not Started
**Priority:** P1 - Production readiness
**Duration:** 5 days

#### Day 1-2: Performance Optimization

**Tasks:**
- [ ] Profile validation hot paths
- [ ] Optimize compilation caching
- [ ] Reduce object allocations
- [ ] Add fast paths for common cases
- [ ] Benchmark against targets

**Targets:**
- Schema compilation: < 10ms for 100-field schema
- Validation: < 1ms for 1000-field object
- Memory: 50% less than V1
- Bundle: < 5KB impact

**Success Criteria:**
- ✅ All performance targets met
- ✅ Benchmarks tracked in CI
- ✅ No regressions vs V1

**Estimated Effort:** 2 days

---

#### Day 3-4: V1→V2 Adapter

**Files to Create:**
- `src/schema-v2/adapters/v1-adapter.ts`

**Adapter Strategy:**

```typescript
class V1Adapter {
  static convertSchema(v1Schema: V1Schema): CompiledSchema;
  static wrapDocument(v1Doc: V1Document): IODocument;
}
```

**Tasks:**
- [ ] Implement schema conversion (V1 → V2)
- [ ] Add compatibility layer for V1 APIs
- [ ] Add deprecation warnings
- [ ] Test migration scenarios
- [ ] Document migration path

**Success Criteria:**
- ✅ All V1 schemas convert correctly
- ✅ V1 code works with adapter
- ✅ Clear deprecation warnings
- ✅ Migration guide complete

**Estimated Effort:** 2 days

---

#### Day 5: Final Polish & Documentation

**Tasks:**
- [ ] Complete JSDoc for all public APIs
- [ ] Update README with V2 examples
- [ ] Create migration guide
- [ ] Add troubleshooting section
- [ ] Final integration test pass

**Success Criteria:**
- ✅ 100% JSDoc coverage
- ✅ Migration guide tested
- ✅ All examples work
- ✅ Documentation reviewed

**Estimated Effort:** 1 day

---

**Phase 4 Quality Gate:**
- ✅ All performance targets met
- ✅ V1→V2 adapter working
- ✅ Documentation complete
- ✅ Migration guide published
- ✅ 400+ total tests passing
- ✅ Zero critical bugs

---

## 📋 Detailed Task Breakdown

### Week 1: Core Type System (120 tasks estimated)

<details>
<summary>Day 1-2: TypeSchema Interface & Base Types (40 tasks)</summary>

**type-schema.ts (10 tasks)**
- [ ] Define `TypeSchema<TConfig, TValue>` interface
- [ ] Add `typeName` property
- [ ] Add `configSchema` property (self-documenting)
- [ ] Define `validate()` signature
- [ ] Define `serialize()` signature
- [ ] Add optional `compile()` method
- [ ] Add optional `getDefaultValue()` method
- [ ] Add JSDoc with examples
- [ ] Export interface
- [ ] Add unit tests (5 tests)

**string-type.ts (10 tasks)**
- [ ] Create `StringTypeSchema` class
- [ ] Implement `validate()` method
- [ ] Add minLength/maxLength validation
- [ ] Add pattern (regex) validation
- [ ] Add format validation (email, url, etc.)
- [ ] Implement `serialize()` method
- [ ] Add config schema validation
- [ ] Add JSDoc with examples
- [ ] Export class
- [ ] Add unit tests (15 tests)

**number-type.ts (10 tasks)**
- [ ] Create `NumberTypeSchema` class
- [ ] Implement `validate()` method
- [ ] Add min/max validation
- [ ] Add integer validation
- [ ] Add multipleOf validation
- [ ] Implement `serialize()` method
- [ ] Add config schema validation
- [ ] Add JSDoc with examples
- [ ] Export class
- [ ] Add unit tests (15 tests)

**boolean-type.ts (10 tasks)**
- [ ] Create `BooleanTypeSchema` class
- [ ] Implement `validate()` method
- [ ] Add truthy/falsy conversion
- [ ] Implement `serialize()` method
- [ ] Add config schema validation
- [ ] Add JSDoc with examples
- [ ] Export class
- [ ] Add unit tests (10 tests)

</details>

<details>
<summary>Day 3: Validation Context & Result (30 tasks)</summary>

**validation-context.ts (15 tasks) - SIMPLIFIED: Use V1's proven getV()**
- [ ] Create `ValidationContext` class
- [ ] Add error accumulation array
- [ ] Add path tracking (push/pop)
- [ ] Implement `addError()` method
- [ ] Add IODefinitions reference property
- [ ] **Add resolvingVars Set for cycle detection**
- [ ] **Add resolvingSchemas Set for cycle detection**
- [ ] **Add `resolveVarSafe(name)` wrapper with cycle detection only**
- [ ] **Add `resolveSchemaSafe(name)` wrapper with cycle detection only**
- [ ] Add performance tracking (optional)
- [ ] Add current path getter
- [ ] Add error count getter
- [ ] Export class
- [ ] **Add unit tests for cycle detection (5 tests)**
- [ ] Add unit tests for path tracking (5 tests)
- [ ] Add unit tests for error accumulation (5 tests)
- [ ] **Total: 15 tests (KISS - no over-engineering)**

**validation-result.ts (15 tasks)**
- [ ] Define `ValidationResult<T>` interface
- [ ] Add `success` property
- [ ] Add `value` property (optional)
- [ ] Add `errors` array
- [ ] Create helper: `ValidationResult.success(value)`
- [ ] Create helper: `ValidationResult.failure(errors)`
- [ ] Add `isSuccess()` type guard
- [ ] Add `isFailure()` type guard
- [ ] Add JSDoc
- [ ] Export interface and helpers
- [ ] Add unit tests (15 tests)

</details>

<details>
<summary>Day 4-5: Schema Compilation (50 tasks)</summary>

**compiled-schema.ts (15 tasks)**
- [ ] Create `CompiledSchema` class
- [ ] Add schema name property
- [ ] Add compiled fields array
- [ ] Add validator function property
- [ ] Implement `validate()` method
- [ ] Add caching layer
- [ ] Add compilation metadata
- [ ] Add performance metrics
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (15 tests)

**compiled-field.ts (10 tasks)**
- [ ] Create `CompiledField` class
- [ ] Add field name property
- [ ] Add type schema reference
- [ ] Add config object
- [ ] Add optional/required flag
- [ ] Add default value
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (10 tests)

**schema-compiler.ts (25 tasks)**
- [ ] Create `SchemaCompiler` class
- [ ] Implement `compile()` method
- [ ] Add schema definition parsing
- [ ] Add type handler resolution
- [ ] Build optimized validator function
- [ ] Add compilation caching
- [ ] Add circular reference detection
- [ ] Add optimization passes
- [ ] Add compilation benchmarks
- [ ] Handle compilation errors gracefully
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (25 tests)

</details>

---

### Week 2: Advanced Types (130 tasks estimated)

<details>
<summary>Day 1-2: Complex Types (60 tasks)</summary>

**date-type.ts (15 tasks)**
- [ ] Create `DateTypeSchema` class
- [ ] Implement ISO 8601 parsing
- [ ] Add custom format support
- [ ] Add min/max date validation
- [ ] Implement `serialize()` method
- [ ] Add timezone handling
- [ ] Add config validation
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (20 tests)

**decimal-type.ts (15 tasks)**
- [ ] Create `DecimalTypeSchema` class
- [ ] Implement precision validation
- [ ] Implement scale validation
- [ ] Add min/max validation
- [ ] Implement `serialize()` method
- [ ] Handle rounding modes
- [ ] Add config validation
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (15 tests)

**bigint-type.ts (15 tasks)**
- [ ] Create `BigIntTypeSchema` class
- [ ] Implement range validation
- [ ] Add config validation
- [ ] Implement `serialize()` method
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (10 tests)

**array-type.ts (15 tasks)**
- [ ] Create `ArrayTypeSchema` class
- [ ] Implement item validation
- [ ] Add minItems/maxItems validation
- [ ] Add uniqueItems validation
- [ ] Implement `serialize()` method
- [ ] Add config validation
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (15 tests)

</details>

<details>
<summary>Day 3-4: Object Type & Composition (50 tasks)</summary>

**object-type.ts (30 tasks)**
- [ ] Create `ObjectTypeSchema` class
- [ ] Implement field-by-field validation
- [ ] Add optional/required handling
- [ ] Add additionalProperties support
- [ ] Implement nested object validation
- [ ] Implement `serialize()` method
- [ ] Add config validation
- [ ] Handle circular references
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (30 tests)

**type-composition.ts (20 tasks)**
- [ ] Create union type support
- [ ] Create intersection type support
- [ ] Add type narrowing
- [ ] Add discriminated unions
- [ ] Add JSDoc
- [ ] Export helpers
- [ ] Add unit tests (20 tests)

</details>

<details>
<summary>Day 5: SerializationContext (20 tasks)</summary>

**serialization-context.ts (20 tasks)**
- [ ] Create `SerializationContext` class
- [ ] Add indent tracking
- [ ] Add buffer management
- [ ] Implement `write()` method
- [ ] Implement `writeLine()` method
- [ ] Add pretty-print support
- [ ] Add options (includeDefinitions, etc.)
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (20 tests)

</details>

---

### Week 3: Builder & Load API (120 tasks estimated)

<details>
<summary>Day 1-2: IODefinitions Builder (40 tasks)</summary>

**io-definitions.ts (20 tasks)**
- [ ] Create `IODefinitions` class
- [ ] Implement `addVar()` method
- [ ] Implement `addSchema()` method
- [ ] Implement `addMeta()` method
- [ ] Add getter methods
- [ ] Implement `toJSON()` method
- [ ] Add method chaining
- [ ] Add validation
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (20 tests)

**schema-builder.ts (20 tasks)**
- [ ] Create `SchemaBuilder` class
- [ ] Add field definition methods (string, number, etc.)
- [ ] Add modifier methods (optional, required)
- [ ] Implement `build()` method
- [ ] Add validation
- [ ] Add method chaining
- [ ] Add JSDoc
- [ ] Export class
- [ ] Add unit tests (20 tests)

</details>

<details>
<summary>Day 3-4: Load API (50 tasks)</summary>

**document.ts updates (50 tasks)**
- [ ] Add `IODocument.load(data)` signature
- [ ] Add `IODocument.load(data, schema)` signature
- [ ] Add `IODocument.loadWithDefs(data, definitions)` signature
- [ ] Implement load logic with validation
- [ ] Integrate ValidationContext
- [ ] Add error accumulation
- [ ] Implement `toIO()` method
- [ ] Implement `toIO(options)` overload
- [ ] Add SerializationOptions interface
- [ ] Integrate SerializationContext
- [ ] Add JSDoc with examples
- [ ] Add unit tests (30 tests)
- [ ] Add round-trip tests (20 tests)

</details>

<details>
<summary>Day 5: Integration Testing (30 tasks)</summary>

**integration tests (30 tasks)**
- [ ] Create load-api.test.ts
- [ ] Test all load signatures
- [ ] Test schema validation
- [ ] Test error accumulation
- [ ] Create round-trip.test.ts
- [ ] Test parse → load → toIO → parse
- [ ] Test all type round-trips
- [ ] Test nested structures
- [ ] Add performance benchmarks
- [ ] Document test coverage

</details>

---

### Week 4: Performance & Polish (100 tasks estimated)

<details>
<summary>Day 1-2: Performance (30 tasks)</summary>

- [ ] Profile validation hot paths
- [ ] Profile compilation process
- [ ] Identify optimization opportunities
- [ ] Optimize object allocation
- [ ] Add fast paths for primitives
- [ ] Optimize schema resolution
- [ ] Add compilation caching improvements
- [ ] Reduce memory footprint
- [ ] Add benchmarks for all types
- [ ] Run benchmarks against targets
- [ ] Document performance characteristics

</details>

<details>
<summary>Day 3-4: V1 Adapter (40 tasks)</summary>

- [ ] Create v1-adapter.ts
- [ ] Implement schema conversion
- [ ] Handle V1 type mapping
- [ ] Add compatibility layer
- [ ] Add deprecation warnings
- [ ] Create migration tests
- [ ] Test all V1 schemas
- [ ] Document migration path
- [ ] Add migration examples
- [ ] Create troubleshooting guide

</details>

<details>
<summary>Day 5: Documentation (30 tasks)</summary>

- [ ] Complete JSDoc for all APIs
- [ ] Update src/schema-v2/README.md
- [ ] Create migration guide
- [ ] Add usage examples
- [ ] Add troubleshooting section
- [ ] Update main README
- [ ] Create API reference
- [ ] Add performance guide
- [ ] Review all documentation
- [ ] Final quality pass

</details>

---

## 🧪 Testing Strategy

### Unit Tests Target: 400+ tests

| Component | Test Count | Status |
|-----------|-----------|--------|
| Type System | 120 tests | 🔴 0/120 |
| Validation Context | 30 tests | 🔴 0/30 |
| Schema Compilation | 40 tests | 🔴 0/40 |
| Advanced Types | 90 tests | 🔴 0/90 |
| Object Type | 30 tests | 🔴 0/30 |
| IODefinitions | 40 tests | 🔴 0/40 |
| Load API | 30 tests | 🔴 0/30 |
| Round-trip | 20 tests | 🔴 0/20 |
| **Total** | **400 tests** | **🔴 0/400** |

### Integration Tests

- [ ] End-to-end validation scenarios (20 tests)
- [ ] Round-trip preservation (20 tests)
- [ ] Error handling across layers (10 tests)
- [ ] Performance benchmarks (10 tests)

### Benchmarks

- [ ] Schema compilation speed
- [ ] Validation performance
- [ ] Serialization speed
- [ ] Memory usage
- [ ] Bundle size impact

---

## 📦 Deliverables Checklist

### Phase 1 Deliverables
- [ ] Core TypeSchema interface
- [ ] Base types (String, Number, Boolean)
- [ ] ValidationContext with path tracking
- [ ] ValidationResult interface
- [ ] CompiledSchema architecture
- [ ] SchemaCompiler with caching
- [ ] 120+ unit tests passing
- [ ] Performance targets met

### Phase 2 Deliverables
- [ ] Advanced types (Date, Decimal, BigInt, Array)
- [ ] Object type with nested validation
- [ ] Type composition (union, intersection)
- [ ] SerializationContext
- [ ] 130+ additional tests passing
- [ ] Object validation < 1ms

### Phase 3 Deliverables
- [ ] IODefinitions builder with fluent API
- [ ] SchemaBuilder for ergonomic schemas
- [ ] IODocument.load() all signatures
- [ ] toIO() serialization
- [ ] Round-trip tests passing
- [ ] 120+ additional tests passing

### Phase 4 Deliverables
- [ ] Performance optimization complete
- [ ] V1→V2 adapter working
- [ ] Complete documentation
- [ ] Migration guide
- [ ] 400+ total tests passing
- [ ] All quality gates passed

---

## 🎯 Quality Gates

### Gate 1: Phase 1 Complete
- ✅ All base types implemented and tested
- ✅ ValidationContext working correctly
- ✅ Schema compilation < 10ms
- ✅ 120+ tests passing
- ✅ Zero critical bugs

### Gate 2: Phase 2 Complete
- ✅ All advanced types working
- ✅ Object validation complete
- ✅ Type composition working
- ✅ 250+ tests passing
- ✅ Validation < 1ms for 100-field object

### Gate 3: Phase 3 Complete
- ✅ IODefinitions builder working
- ✅ Load API all signatures functional
- ✅ Round-trip tests passing
- ✅ 370+ tests passing
- ✅ API ergonomics validated

### Gate 4: Phase 4 Complete
- ✅ All performance targets met
- ✅ V1 adapter functional
- ✅ Documentation 100% complete
- ✅ 400+ tests passing
- ✅ Production ready

---

## ✅ Phase Definitions of Done (DoD)

These DoD checklists are required to flip each Phase Quality Gate to PASS.

### Phase 1 DoD – Core Type System
- [ ] Base types implemented with SRP and unit tests (String/Number/Boolean)
- [ ] ValidationContext + ValidationResult complete with path & aggregation
- [ ] Compiler produces optimized functions; cached by schema signature
- [ ] Benchmarks recorded: compile < 10ms (100 fields)
- [ ] Coverage for phase modules ≥ 90%
- [ ] JSDoc complete with runnable examples
- [ ] Performance and error messages validated

### Phase 2 DoD – Advanced Types & Object
- [ ] Date/Decimal/BigInt/Array finished with config validation
- [ ] ObjectType with required/optional/additionalProperties
- [ ] Type composition (union/intersection) documented and tested
- [ ] Validation for 100-field object < 1ms (avg)
- [ ] SerializationContext implemented and tested
- [ ] Coverage for phase modules ≥ 90%

### Phase 3 DoD – Builders & Load API
- [ ] IODefinitions and SchemaBuilder ergonomic and type-safe
- [ ] IODocument.load() overloads implemented + tests
- [ ] toIO() + round-trip integration tests passing
- [ ] Error messages for load failures follow template with codes
- [ ] Performance numbers posted for load + serialize
- [ ] Coverage for phase modules ≥ 90%

### Phase 4 DoD – Performance & Polish
- [ ] No perf regressions vs recorded baselines
- [ ] V1→V2 adapter migration tested with real samples
- [ ] Docs complete: guides, reference, migration, troubleshooting
- [ ] Final integration pass; zero critical bugs
- [ ] Coverage ≥ 90% overall; branches ≥ 85%

---

## 📚 Documentation Requirements

### API Documentation
- [ ] JSDoc for every public class/method
- [ ] Code examples in JSDoc
- [ ] Type parameter documentation
- [ ] Error cases documented

### Guides
- [ ] Getting started guide
- [ ] Migration guide (V1→V2)
- [ ] Type system guide
- [ ] Performance guide
- [ ] Troubleshooting guide

### Reference
- [ ] Complete API reference
- [ ] Type catalog with examples
- [ ] Error code reference
- [ ] Configuration reference

---

## 🚀 Coordination with Serialization

Schema V2 and Serialization work in parallel with clear interfaces:

### Week 1-2: Independent Development
- Schema V2: Core types + validation
- Serialization: IODefinitions + formatters

### Week 3: Integration Point
- Schema V2 provides: CompiledSchema, ValidationContext
- Serialization uses: schemas for validation during load

### Week 4: Joint Testing
- Round-trip tests validate both systems
- Performance optimization benefits both
- Documentation covers unified API

---

## 🔗 Related Documents

### Design Documents (src/schema-v2/docs/)
- **SCHEMA-REVAMP-PROPOSAL.md** - Architecture and type system design
- **SERIALIZATION-ARCHITECTURE.md** - Serialization implementation details
- **SERIALIZATION-USAGE-GUIDE.md** - Usage patterns and examples

### Standards & Guidelines (docs/errors/)
- **ERROR-HANDLING-GUIDELINES.md** - MANDATORY error handling standards (8-point checklist, message templates, top 20 prioritized errors)

### Other Trackers
- **READINESS-TRACKER.md** - Overall library publishing readiness
- **src/schema-v2/README.md** - Quick overview and progress checklist

---

## ⚡ Critical Implementation Patterns

### 🎯 Lazy Resolution Pattern (V1 Proven → V2 Enhanced)

**Status:** MANDATORY - This is non-negotiable and proven in V1

**Problem:** Variables (@name) and schema references ($name) must be resolved at validation time, not compile time, to support:
- Recursive schemas (self-referential types like `$employee` referencing itself)
- Order-independent validation
- Performance optimization through caching

**V1 Implementation Analysis:**
- ✅ Uses `IODefinitions.getV()` for lazy resolution
- ✅ Keeps schema references as `TokenNode` through compilation
- ✅ Resolves variables in choices arrays at validation time
- ✅ Supports recursive resolution (variables can reference other variables)
- ❌ No caching → resolves same variable multiple times (performance issue)
- ❌ No cycle detection → infinite loops possible (safety issue)

**V2 Approach - Keep It Simple:**

V1 already has the right pattern! V2 should:
1. **Preserve V1's lazy resolution** - Use `IODefinitions.getV()` directly (already O(1) with built-in caching)
2. **Add cycle detection** - Guard against infinite loops (the one V1 gap)
3. **Use typed AST nodes** - VarRefNode/SchemaRefNode instead of generic TokenNode (type safety)

```typescript
// Core pattern: All type validators
if (value instanceof VarRefNode) {
  value = defs.getV(`@${value.name}`); // Direct V1 pattern - already cached!
}

// Choices validation - keep V1 pattern
for (let choice of choices) {
  if (typeof choice === 'string' && choice[0] === '@') {
    choice = defs.getV(choice); // V1 pattern works fine
  }
  if (val === choice) found = true;
}

// Schema references - V1 pattern with type safety
if (schema instanceof SchemaRefNode) {
  schema = defs.getV(`$${schema.name}`); // Already cached by V1!
}
```

**Implementation Locations:**
1. All type validators - Use `defs.getV()` directly (Week 2)
2. `schema-compiler.ts` - Keep refs symbolic during compile (Week 1 Day 4)
3. `validation-context.ts` - Only add cycle detection wrapper if needed (Week 1 Day 3)

**What V2 Adds (Minimal):**
- ✅ Cycle detection guards (prevent infinite loops)
- ✅ Typed AST nodes (VarRefNode, SchemaRefNode for type safety)
- ✅ That's it! Don't over-engineer.

**Testing Requirements:**
- Unit tests: 15 for lazy resolution patterns, 5 for cycle detection
- Integration tests: Recursive schema validation, variables in choices

**Related Files (V1 Reference):**
- `src/core/definitions.ts` - `getV()` implementation
- `src/schema/types/common-type.ts` - `doCommonTypeCheck()` with choices
- `src/schema/compile-object.ts` - TokenNode preservation
- All `src/schema/types/*.ts` - Universal pattern usage

---

### 🔒 Error Handling Philosophy

**Fail Fast Internally, Accumulate Externally**
- Inside validators: `throw` for impossible states (programmer errors)
- User-facing: Return `ValidationResult` with all errors accumulated
- Never throw for invalid user data

**Error Structure:**
```typescript
interface ValidationError {
  code: string;           // Stable: SCHEMA_TYPE_INVALID
  message: string;        // Human-readable with context
  path: string[];        // Field path array
  line?: number;         // Source location
  column?: number;       // Source location
  metadata?: any;        // Additional context
}
```

---

### 🎨 API Design Patterns

**Builder Pattern:**
```typescript
const defs = IODefinitions.builder()
  .addVar('maxAge', 100)
  .addVar('minAge', 18)
  .addSchema('person', { name: 'string', age: 'number' })
  .build();
```

**Type-Safe Compilation:**
```typescript
interface TypeSchema<TConfig, TValue> {
  validate(value: unknown, config: TConfig, ctx: ValidationContext): ValidationResult<TValue>;
}
```

**Chainable Results:**
```typescript
const result = schema.validate(data);
if (result.isSuccess()) {
  console.log(result.value); // Type-safe
} else {
  console.error(result.errors); // All errors at once
}
```

---

## 📞 Decision Log

### Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-10 | Use TypeSchema<TConfig, TValue> | Self-documenting, type-safe |
| 2025-11-10 | Compile-time optimization | 10x performance improvement |
| 2025-11-10 | Error accumulation by default | Better DX, see all errors |
| 2025-11-10 | IODefinitions builder pattern | Ergonomic API, discoverable |
| 2025-11-10 | Parallel with V1 via adapter | Zero breaking changes |
| **2025-11-11** | **Preserve V1 lazy resolution + add cycle detection only** | **V1's `getV()` is already O(1) with built-in caching. V2 only adds cycle detection guards to prevent infinite loops. KISS principle - no over-engineering.** |

### Open Questions

- [ ] **Q:** Should compilation be synchronous or async?
- [ ] **Q:** How to handle schema versioning?
- [ ] **Q:** Support for schema evolution/migration?
- [ ] **Q:** Custom type registration API?

---

## 📊 Metrics & KPIs

### Performance Targets
- ✅ Schema compilation: < 10ms for 100-field schema
- ✅ Validation: < 1ms for 1000-field object
- ✅ Memory: 50% reduction vs V1
- ✅ Bundle: < 5KB tree-shakable impact

### Quality Targets
- ✅ Test coverage: > 90%
- ✅ Unit tests: 400+
- ✅ Integration tests: 60+
- ✅ Zero critical bugs
- ✅ Documentation: 100% public API coverage

### Success Metrics
- ✅ 10x faster validation than V1
- ✅ 100% backward compatible (via adapter)
- ✅ Round-trip guarantee maintained
- ✅ Developer satisfaction: "delightful API"

---

## 🔄 Update History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-10 | 1.0 | Initial tracker created - comprehensive 4-week plan |
| 2025-11-11 | 1.1 | **Added V1 lazy resolution pattern documentation** - Analyzed V1 implementation (10 files), documented proven patterns, added V2 enhancements (caching, cycle detection). Updated ValidationContext tasks (+25 tasks), added type validator integration examples, created Critical Implementation Patterns section. |

---

**Last Review:** November 10, 2025
**Next Review:** End of Week 1 (Phase 1 complete)
**Status:** Ready to start implementation - all design work complete ✅
