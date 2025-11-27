# Schema Architecture - Areas of Improvement

This document outlines potential improvements to the Internet Object schema architecture, organized by priority phases.

---

## Table of Contents

1. [Current Strengths](#current-strengths)
2. [Identified Improvement Areas](#identified-improvement-areas)
3. [Phase-wise Implementation Plan](#phase-wise-implementation-plan)
4. [Detailed Recommendations](#detailed-recommendations)

---

## Current Strengths

Before diving into improvements, it's important to acknowledge what's already well-designed:

| Pattern | Implementation | Quality |
|---------|----------------|---------|
| **Registry Pattern** | TypedefRegistry | ✅ Excellent |
| **Strategy Pattern** | TypeDef interface | ✅ Excellent |
| **Lazy Evaluation** | TokenNode preservation | ✅ Excellent |
| **Builder Pattern** | Schema construction | ✅ Good |
| **Visitor-like Processing** | processObject traversal | ✅ Good |

**Overall Architecture Score: 8/10** - Production-quality with room for optimization.

---

## Identified Improvement Areas

### 1. Performance Optimizations

| Issue | Impact | Complexity |
|-------|--------|------------|
| No MemberDef caching (Flyweight) | Medium | Low |
| No schema resolution caching | Medium | Low |
| Repeated variable resolution | Low | Low |

### 2. Extensibility Enhancements

| Issue | Impact | Complexity |
|-------|--------|------------|
| Monolithic validation in `doCommonTypeCheck()` | Medium | Medium |
| Inline constraint handling | Medium | Medium |
| No centralized Schema factory | Low | Low |

### 3. Developer Experience

| Issue | Impact | Complexity |
|-------|--------|------------|
| No schema state snapshots (Memento) | Low | High |
| Limited error context in validation | Medium | Medium |
| No schema introspection API | Low | Medium |

### 4. Advanced Features

| Issue | Impact | Complexity |
|-------|--------|------------|
| No async/streaming support | Low | High |
| No partial validation/error recovery | Medium | High |
| No schema composition operators | Low | Medium |

---

## Phase-wise Implementation Plan

### Phase 1: Quick Wins (1-2 weeks)
**Priority: High | Effort: Low | Impact: Medium-High**

Focus on low-hanging fruit that improves performance without architectural changes.

- [ ] **1.1** Implement MemberDef Flyweight cache
- [ ] **1.2** Add schema resolution memoization in `_resolveSchema()`
- [ ] **1.3** Cache resolved variable values in `_resolveMemberDefVariables()`
- [ ] **1.4** Create `SchemaFactory` utility class

### Phase 2: Validation Pipeline (2-3 weeks)
**Priority: Medium-High | Effort: Medium | Impact: Medium**

Refactor validation into composable, extensible pipeline.

- [ ] **2.1** Design `Validator` interface
- [ ] **2.2** Implement Chain of Responsibility for validation
- [ ] **2.3** Extract constraints into `Constraint` classes (Interpreter pattern)
- [ ] **2.4** Add custom validator registration API

### Phase 3: Developer Experience (2-3 weeks)
**Priority: Medium | Effort: Medium | Impact: Medium**

Improve debugging, introspection, and error handling.

- [ ] **3.1** Enhance error messages with full context path
- [ ] **3.2** Add schema introspection API (`schema.describe()`)
- [ ] **3.3** Implement validation result object (not just throw)
- [ ] **3.4** Add schema diff utility

### Phase 4: Advanced Features (4-6 weeks)
**Priority: Low | Effort: High | Impact: Low-Medium**

Long-term enhancements for specialized use cases.

- [ ] **4.1** Schema state snapshots (Memento pattern)
- [ ] **4.2** Streaming/async parsing support
- [ ] **4.3** Partial validation with error collection
- [ ] **4.4** Schema composition operators (extend, merge, pick, omit)

---

## Detailed Recommendations

### 1.1 MemberDef Flyweight Cache

**Problem**: Identical MemberDefs are created repeatedly for common types.

**Solution**:

```typescript
// src/schema/memberdef-cache.ts
class MemberDefCache {
  private static cache = new Map<string, MemberDef>();

  static get(type: string, path: string, options?: Partial<MemberDef>): MemberDef {
    const key = this.generateKey(type, path, options);

    if (!this.cache.has(key)) {
      this.cache.set(key, { type, path, ...options } as MemberDef);
    }

    return this.cache.get(key)!;
  }

  private static generateKey(type: string, path: string, options?: Partial<MemberDef>): string {
    return `${type}:${path}:${JSON.stringify(options || {})}`;
  }

  static clear(): void {
    this.cache.clear();
  }
}
```

**Files to modify**:
- `src/schema/compile-object.ts` - Use cache in `getMemberDef()`
- `src/schema/types/memberdef.ts` - Export cache utility

---

### 1.2 Schema Resolution Memoization

**Problem**: `_resolveSchema()` resolves the same references repeatedly.

**Solution**:

```typescript
// In ObjectDef or as utility
class SchemaResolver {
  private resolvedCache = new WeakMap<TokenNode, Schema>();

  resolveSchema(
    schema: Schema | TokenNode | string | undefined,
    defs?: Definitions
  ): Schema | undefined {
    if (schema instanceof Schema) return schema;

    if (schema instanceof TokenNode) {
      // Check cache first
      if (this.resolvedCache.has(schema)) {
        return this.resolvedCache.get(schema);
      }

      const resolved = this._doResolve(schema, defs);
      if (resolved) {
        this.resolvedCache.set(schema, resolved);
      }
      return resolved;
    }

    return this._resolveString(schema, defs);
  }
}
```

**Files to modify**:
- `src/schema/types/object.ts` - Add memoization to `_resolveSchema()`
- `src/schema/types/array.ts` - Same pattern for array element schemas

---

### 1.4 Schema Factory

**Problem**: Schema creation logic is scattered across multiple functions.

**Solution**:

```typescript
// src/schema/schema-factory.ts
export class SchemaFactory {
  /**
   * Create schema from AST node
   */
  static fromAST(node: Node, name?: string, defs?: Definitions): Schema {
    return compileObject(name || '', node, defs) as Schema;
  }

  /**
   * Create schema from IO text
   */
  static fromString(io: string, defs?: Definitions): Schema {
    const parsed = parse(`~ $temp: ${io}`, defs);
    return parsed.header.definitions.getV('$temp');
  }

  /**
   * Create schema from plain object definition
   */
  static fromObject(def: Record<string, string | MemberDef>): Schema {
    const schema = new Schema();
    for (const [name, typeDef] of Object.entries(def)) {
      const memberDef = typeof typeDef === 'string'
        ? { type: typeDef, path: name }
        : { ...typeDef, path: name };
      schema.names.push(name);
      schema.defs[name] = memberDef as MemberDef;
    }
    return schema;
  }

  /**
   * Clone an existing schema
   */
  static clone(schema: Schema): Schema {
    const cloned = new Schema(schema.name);
    cloned.names.push(...schema.names);
    for (const [key, def] of Object.entries(schema.defs)) {
      cloned.defs[key] = { ...def };
    }
    cloned.open = schema.open;
    return cloned;
  }
}
```

**Files to create**:
- `src/schema/schema-factory.ts`

---

### 2.1-2.2 Validation Pipeline (Chain of Responsibility)

**Problem**: `doCommonTypeCheck()` is monolithic and hard to extend.

**Solution**:

```typescript
// src/schema/validation/validator.ts
export interface ValidationContext {
  memberDef: MemberDef;
  value: any;
  node?: Node;
  defs?: Definitions;
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  value?: any;        // Transformed value (for defaults, coercion)
  changed?: boolean;  // Whether value was transformed
  error?: ValidationError;
}

export interface Validator {
  validate(ctx: ValidationContext, next: () => ValidationResult): ValidationResult;
}

// src/schema/validation/validators/undefined-validator.ts
export class UndefinedValidator implements Validator {
  validate(ctx: ValidationContext, next: () => ValidationResult): ValidationResult {
    const { memberDef, value, defs } = ctx;

    if (value === undefined) {
      if (memberDef.default !== undefined) {
        return { valid: true, value: resolveDefault(memberDef.default, defs), changed: true };
      }
      if (memberDef.optional) {
        return { valid: true, value: undefined, changed: true };
      }
      return {
        valid: false,
        error: new ValidationError(ErrorCodes.valueRequired, `Value required for ${ctx.path}`)
      };
    }

    return next();
  }
}

// src/schema/validation/validators/null-validator.ts
export class NullValidator implements Validator {
  validate(ctx: ValidationContext, next: () => ValidationResult): ValidationResult {
    if (ctx.value === null) {
      if (ctx.memberDef.null) {
        return { valid: true, value: null, changed: true };
      }
      return {
        valid: false,
        error: new ValidationError(ErrorCodes.nullNotAllowed, `Null not allowed for ${ctx.path}`)
      };
    }
    return next();
  }
}

// src/schema/validation/validators/choices-validator.ts
export class ChoicesValidator implements Validator {
  validate(ctx: ValidationContext, next: () => ValidationResult): ValidationResult {
    const { memberDef, value, defs, path } = ctx;

    if (!memberDef.choices) return next();

    const resolvedChoices = memberDef.choices.map(c =>
      typeof c === 'string' && c.startsWith('@') ? defs?.getV(c) : c
    );

    if (!resolvedChoices.includes(value)) {
      return {
        valid: false,
        error: new ValidationError(
          ErrorCodes.invalidChoice,
          `Invalid choice '${value}' for ${path}. Expected: ${resolvedChoices.join(', ')}`
        )
      };
    }

    return next();
  }
}

// src/schema/validation/validation-chain.ts
export class ValidationChain {
  private validators: Validator[] = [];

  add(validator: Validator): this {
    this.validators.push(validator);
    return this;
  }

  validate(ctx: ValidationContext): ValidationResult {
    const executeChain = (index: number): ValidationResult => {
      if (index >= this.validators.length) {
        return { valid: true, value: ctx.value, changed: false };
      }
      return this.validators[index].validate(ctx, () => executeChain(index + 1));
    };

    return executeChain(0);
  }
}

// Default chain
export const defaultValidationChain = new ValidationChain()
  .add(new UndefinedValidator())
  .add(new NullValidator())
  .add(new ChoicesValidator());
```

**Files to create**:
- `src/schema/validation/validator.ts`
- `src/schema/validation/validation-chain.ts`
- `src/schema/validation/validators/` (directory with individual validators)

---

### 2.3 Constraint Interpreter Pattern

**Problem**: Constraints (min, max, pattern) are handled inline in each TypeDef.

**Solution**:

```typescript
// src/schema/constraints/constraint.ts
export interface Constraint<T = any> {
  readonly name: string;

  applies(memberDef: MemberDef): boolean;
  validate(value: T, memberDef: MemberDef): ConstraintResult;

  // For stringify
  serialize(memberDef: MemberDef): string | undefined;
}

export interface ConstraintResult {
  valid: boolean;
  error?: string;
}

// src/schema/constraints/min-constraint.ts
export class MinConstraint implements Constraint<number> {
  readonly name = 'min';

  applies(memberDef: MemberDef): boolean {
    return memberDef.min !== undefined;
  }

  validate(value: number, memberDef: MemberDef): ConstraintResult {
    if (value < memberDef.min!) {
      return {
        valid: false,
        error: `Value ${value} is less than minimum ${memberDef.min}`
      };
    }
    return { valid: true };
  }

  serialize(memberDef: MemberDef): string | undefined {
    return memberDef.min !== undefined ? `min: ${memberDef.min}` : undefined;
  }
}

// src/schema/constraints/pattern-constraint.ts
export class PatternConstraint implements Constraint<string> {
  readonly name = 'pattern';

  applies(memberDef: MemberDef): boolean {
    return memberDef.pattern !== undefined;
  }

  validate(value: string, memberDef: MemberDef): ConstraintResult {
    const regex = new RegExp(memberDef.pattern!);
    if (!regex.test(value)) {
      return {
        valid: false,
        error: `Value '${value}' does not match pattern ${memberDef.pattern}`
      };
    }
    return { valid: true };
  }

  serialize(memberDef: MemberDef): string | undefined {
    return memberDef.pattern !== undefined ? `pattern: "${memberDef.pattern}"` : undefined;
  }
}

// src/schema/constraints/constraint-registry.ts
export class ConstraintRegistry {
  private static constraints = new Map<string, Constraint>();

  static register(constraint: Constraint): void {
    this.constraints.set(constraint.name, constraint);
  }

  static getApplicable(memberDef: MemberDef): Constraint[] {
    return Array.from(this.constraints.values())
      .filter(c => c.applies(memberDef));
  }

  static validateAll(value: any, memberDef: MemberDef): ConstraintResult[] {
    return this.getApplicable(memberDef)
      .map(c => c.validate(value, memberDef));
  }
}

// Register built-in constraints
ConstraintRegistry.register(new MinConstraint());
ConstraintRegistry.register(new MaxConstraint());
ConstraintRegistry.register(new MinLenConstraint());
ConstraintRegistry.register(new MaxLenConstraint());
ConstraintRegistry.register(new PatternConstraint());
```

---

### 3.2 Schema Introspection API

**Problem**: No easy way to inspect schema structure programmatically.

**Solution**:

```typescript
// src/schema/schema.ts - Add to Schema class
class Schema {
  // ... existing code ...

  /**
   * Get human-readable description of schema
   */
  describe(): SchemaDescription {
    return {
      name: this.name,
      fields: this.names.map(name => ({
        name,
        ...this.defs[name],
        required: !this.defs[name].optional && this.defs[name].default === undefined
      })),
      open: this.open,
      additionalProperties: typeof this.open === 'object' ? this.open : undefined
    };
  }

  /**
   * Get list of required field names
   */
  getRequiredFields(): string[] {
    return this.names.filter(name => {
      const def = this.defs[name];
      return !def.optional && def.default === undefined;
    });
  }

  /**
   * Get list of optional field names
   */
  getOptionalFields(): string[] {
    return this.names.filter(name => {
      const def = this.defs[name];
      return def.optional || def.default !== undefined;
    });
  }

  /**
   * Check if schema has a field
   */
  hasField(name: string): boolean {
    return name in this.defs;
  }

  /**
   * Get field definition
   */
  getField(name: string): MemberDef | undefined {
    return this.defs[name];
  }

  /**
   * Convert to JSON Schema (for interoperability)
   */
  toJSONSchema(): object {
    const properties: Record<string, object> = {};
    const required: string[] = [];

    for (const name of this.names) {
      const def = this.defs[name];
      properties[name] = memberDefToJSONSchema(def);
      if (!def.optional && def.default === undefined) {
        required.push(name);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: this.open === true ? true :
                           this.open === false ? false :
                           memberDefToJSONSchema(this.open as MemberDef)
    };
  }
}

interface SchemaDescription {
  name: string;
  fields: Array<MemberDef & { name: string; required: boolean }>;
  open: boolean | MemberDef;
  additionalProperties?: MemberDef;
}
```

---

### 3.3 Validation Result Object

**Problem**: Validation throws on first error, no way to collect all errors.

**Solution**:

```typescript
// src/schema/validation/validation-result.ts
export class SchemaValidationResult {
  readonly valid: boolean;
  readonly value?: any;
  readonly errors: ValidationError[];

  constructor(valid: boolean, value?: any, errors: ValidationError[] = []) {
    this.valid = valid;
    this.value = value;
    this.errors = errors;
  }

  static success(value: any): SchemaValidationResult {
    return new SchemaValidationResult(true, value, []);
  }

  static failure(errors: ValidationError[]): SchemaValidationResult {
    return new SchemaValidationResult(false, undefined, errors);
  }

  /**
   * Get errors for a specific path
   */
  getErrorsForPath(path: string): ValidationError[] {
    return this.errors.filter(e => e.path === path);
  }

  /**
   * Get first error
   */
  getFirstError(): ValidationError | undefined {
    return this.errors[0];
  }

  /**
   * Throw if invalid
   */
  throwIfInvalid(): void {
    if (!this.valid && this.errors.length > 0) {
      throw this.errors[0];
    }
  }

  /**
   * Get formatted error messages
   */
  getMessages(): string[] {
    return this.errors.map(e => `${e.path}: ${e.message}`);
  }
}

// Usage in load/process functions
function loadObjectSafe(
  data: any,
  schema: Schema,
  defs?: Definitions
): SchemaValidationResult {
  const errors: ValidationError[] = [];

  try {
    const result = loadObject(data, schema, defs, errors);
    return SchemaValidationResult.success(result);
  } catch (e) {
    if (e instanceof ValidationError) {
      errors.push(e);
    }
    return SchemaValidationResult.failure(errors);
  }
}
```

---

### 4.4 Schema Composition Operators

**Problem**: No built-in way to extend, merge, or pick from schemas.

**Solution**:

```typescript
// src/schema/schema-operators.ts
export class SchemaOperators {
  /**
   * Extend schema with additional fields
   */
  static extend(base: Schema, extension: Schema | Record<string, MemberDef>): Schema {
    const result = SchemaFactory.clone(base);

    const extDefs = extension instanceof Schema ? extension.defs : extension;
    const extNames = extension instanceof Schema ? extension.names : Object.keys(extension);

    for (const name of extNames) {
      if (!result.defs[name]) {
        result.names.push(name);
      }
      result.defs[name] = { ...extDefs[name] };
    }

    return result;
  }

  /**
   * Pick specific fields from schema
   */
  static pick(schema: Schema, fields: string[]): Schema {
    const result = new Schema(schema.name + '_pick');

    for (const name of fields) {
      if (schema.defs[name]) {
        result.names.push(name);
        result.defs[name] = { ...schema.defs[name] };
      }
    }

    return result;
  }

  /**
   * Omit specific fields from schema
   */
  static omit(schema: Schema, fields: string[]): Schema {
    const fieldsSet = new Set(fields);
    const result = new Schema(schema.name + '_omit');

    for (const name of schema.names) {
      if (!fieldsSet.has(name)) {
        result.names.push(name);
        result.defs[name] = { ...schema.defs[name] };
      }
    }

    result.open = schema.open;
    return result;
  }

  /**
   * Make all fields optional
   */
  static partial(schema: Schema): Schema {
    const result = SchemaFactory.clone(schema);

    for (const name of result.names) {
      result.defs[name] = { ...result.defs[name], optional: true };
    }

    return result;
  }

  /**
   * Make all fields required
   */
  static required(schema: Schema): Schema {
    const result = SchemaFactory.clone(schema);

    for (const name of result.names) {
      const { optional, ...rest } = result.defs[name];
      result.defs[name] = rest as MemberDef;
    }

    return result;
  }

  /**
   * Merge multiple schemas
   */
  static merge(...schemas: Schema[]): Schema {
    const result = new Schema('merged');

    for (const schema of schemas) {
      for (const name of schema.names) {
        if (!result.defs[name]) {
          result.names.push(name);
        }
        result.defs[name] = { ...schema.defs[name] };
      }

      // Merge open property (last wins, or combine MemberDefs)
      if (schema.open) {
        result.open = schema.open;
      }
    }

    return result;
  }
}
```

---

## Implementation Timeline

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION TIMELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Week 1-2: Phase 1 (Quick Wins)                                         │
│  ├── MemberDef cache                                                    │
│  ├── Schema resolution memoization                                      │
│  ├── Variable resolution cache                                          │
│  └── SchemaFactory utility                                              │
│                                                                          │
│  Week 3-5: Phase 2 (Validation Pipeline)                                │
│  ├── Validator interface design                                         │
│  ├── Chain of Responsibility implementation                             │
│  ├── Constraint classes                                                 │
│  └── Custom validator API                                               │
│                                                                          │
│  Week 6-8: Phase 3 (Developer Experience)                               │
│  ├── Enhanced error messages                                            │
│  ├── Schema introspection API                                           │
│  ├── ValidationResult object                                            │
│  └── Schema diff utility                                                │
│                                                                          │
│  Week 9-14: Phase 4 (Advanced Features)                                 │
│  ├── Schema state snapshots                                             │
│  ├── Streaming/async support                                            │
│  ├── Partial validation                                                 │
│  └── Schema composition operators                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Notes

- Phase 1 items can be implemented independently and incrementally
- Phase 2 requires careful design to maintain backward compatibility
- Phase 3 items are additive and won't break existing code
- Phase 4 items are optional enhancements for specific use cases

## Related Documents

- [Schema Architecture](./schema-archtiecture.md) - Core architecture documentation
- [DESIGN.md](../../DESIGN.md) - Overall project design
- [READINESS-TRACKER.md](../../READINESS-TRACKER.md) - Implementation status
