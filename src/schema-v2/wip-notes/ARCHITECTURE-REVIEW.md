# Schema V2 Architecture Review

> **Date:** November 11, 2025
> **Context:** Review current implementation against V1 patterns and ERROR-HANDLING-GUIDELINES.md
> **Status:** � Critical - Must Follow V1 Pattern

---

## 🎯 Executive Summary

The current Schema V2 implementation has **critical architectural deviation from V1**:

### ❌ What V2 Got Wrong

1. **Error Accumulation** - V2 accumulates errors in ValidationResult wrapper
2. **ValidationContext** - V2 uses context for error tracking (V1 doesn't have this)
3. **ValidationResult Pattern** - V2 returns `{ success, value, errors }` (V1 throws)
4. **No Collection Recovery** - V2's error accumulation breaks collection-level error recovery

### ✅ What V1 Does Correctly

1. **Throws Immediately** - Validators throw IOValidationError on first failure
2. **Node Parameter** - Position tracking via Node, not context object
3. **Simple Return** - Returns value directly or throws (no wrapper)
4. **Collection Boundary Recovery** - Collection processor catches errors, converts to ErrorNode
5. **Error Accumulation at Document Level** - errorCollector in collection processor, not in validators

### 🎯 The Fix

**Remove these:**
- ❌ `validation-result.ts` (ValidationResult pattern)
- ❌ `ValidationContext` interface (not needed in validators)
- ❌ Error accumulation in validators

**Keep these:**
- ✅ Throw IOValidationError immediately (V1 pattern)
- ✅ Pass Node for position tracking (V1 pattern)
- ✅ Return value directly (V1 pattern)
- ✅ `{ value, changed }` pattern for common validation (V1 pattern)
- ✅ Lazy resolution utilities (resolveVar, resolveSchema, resolveChoices)

**Result:** V2 follows V1's proven, tested architecture with 1,461 passing tests.---

## 📊 V1 Error Handling Pattern (The Truth)

### How V1 Actually Works

**V1 String Type:**
```typescript
// src/schema/types/string.ts
function _process(node: Node, memberDef: MemberDef, defs?: Definitions): string {
  const valueNode = defs?.getV(node) || node
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (changed) return value  // ✅ Early return for default/optional/null

  // ❌ Type check - THROW immediately
  if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.STRING) {
    throw new ValidationError(ErrorCodes.notAString,
      `Expecting a string value for '${memberDef.path}' but found ${valueNode.toValue()}.`,
      node)
  }

  // ❌ Pattern validation - THROW immediately
  if (memberDef.pattern && !re.test(value)) {
    throw new ValidationError(ErrorCodes.invalidPattern,
      `The value '${value}' does not match the pattern '${memberDef.pattern}'.`, node)
  }

  // ❌ Length validation - THROW immediately
  if (maxLen !== undefined && value.length > maxLen) {
    throw new ValidationError(ErrorCodes.invalidMaxLength,
      `Invalid maxLength for ${memberDef.path}.`, valueNode)
  }

  return value  // ✅ Only reached if all validations pass
}
```

**V1 Common Type Check:**
```typescript
// src/schema/types/common-type.ts
function doCommonTypeCheck(memberDef, value, node?, defs?): { value, changed } {
  // ❌ Undefined - THROW immediately if not optional/default
  if (isUndefined) {
    if (memberDef.default !== undefined) return { value: _default(memberDef.default), changed: true }
    if (memberDef.optional) return { value: undefined, changed: true }
    throw new InternetObjectValidationError(ErrorCodes.valueRequired, msg, node)  // ✅ THROW!
  }

  // ❌ Null - THROW immediately if not nullable
  if (isNull) {
    if (memberDef.null) return { value: null, changed: true }
    throw new InternetObjectValidationError(ErrorCodes.nullNotAllowed, msg, node)  // ✅ THROW!
  }

  // ❌ Choices - THROW immediately if invalid
  if (memberDef.choices && !found) {
    throw new InternetObjectValidationError(ErrorCodes.invalidChoice, msg, node)  // ✅ THROW!
  }

  return { value, changed: false }  // ✅ All checks passed
}
```

### Key Insights

1. **✅ V1 THROWS immediately** - No error accumulation
2. **✅ V1 passes Node** - Position tracking built-in via node parameter
3. **✅ V1 uses { value, changed } pattern** - Signals early return for default/optional/null
4. **✅ V1 has no ValidationContext** - Just throws IOValidationError directly
5. **✅ V1 has no ValidationResult** - Return value or throw, no wrapper

### ❌ What V2 Got Wrong

#### Issue 1: Wrong Pattern - Error Accumulation vs Throw

**❌ V2 Current (WRONG):**
```typescript
// V2 tries to accumulate errors in ValidationResult
validate(value: unknown, config: StringConfig, ctx: ValidationContext): ValidationResult<string> {
  const errors: ValidationError[] = [];

  // ❌ Accumulates errors instead of throwing
  if (typeof value !== 'string') {
    errors.push({ code: ErrorCodes.notAString, message: '...', path, metadata });
  }
  if (value.length < config.minLength) {
    errors.push({ code: ErrorCodes.outOfRange, message: '...', path, metadata });
  }
  if (value.length > config.maxLength) {
    errors.push({ code: ErrorCodes.outOfRange, message: '...', path, metadata });
  }

  return errors.length > 0
    ? ValidationResult.failure(errors)  // ❌ Returns errors
    : ValidationResult.success(value);
}
```

**✅ V1 Actual (CORRECT):**
```typescript
// V1 throws on first error
parse(node: Node, memberDef: MemberDef, defs?: Definitions): string {
  const valueNode = defs?.getV(node) || node
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (changed) return value

  // ✅ THROW immediately on type error
  if (valueNode.type !== TokenType.STRING) {
    throw new ValidationError(ErrorCodes.notAString,
      `Expecting a string value for '${memberDef.path}' but found ${valueNode.toValue()}.`,
      node)  // ✅ Pass node for position tracking
  }

  // ✅ THROW immediately on length error
  if (maxLen !== undefined && value.length > maxLen) {
    throw new ValidationError(ErrorCodes.invalidMaxLength,
      `Invalid maxLength for ${memberDef.path}.`, valueNode)
  }

  return value  // ✅ Only reached if all validations pass
}
```

**Problems with V2:**
1. ❌ ValidationResult pattern doesn't exist in V1
2. ❌ ValidationContext.addError() doesn't exist in V1
3. ❌ Error accumulation makes debugging harder (which error caused the issue?)
4. ❌ Inconsistent with entire V1 codebase (1,461 tests expect throws)
5. ❌ Breaks error recovery patterns in parser

**Why V1 Throws (Critical Insight):**

V1's throw pattern enables **error recovery at collection boundaries**:

```typescript
// src/schema/processing/collection-processor.ts
export default function processCollection(
  data: CollectionNode,
  schema: Schema,
  defs?: Definitions,
  errorCollector?: Error[]  // ✅ Accumulation happens HERE, not in validators
): Collection<any> {
  const collection = new Collection<InternetObject>();

  for (let i = 0; i < data.children.length; i++) {
    const item = data.children[i];

    // ✅ Parser ErrorNodes pass through (syntax errors)
    if (item instanceof ErrorNode) {
      collection.push(item as unknown as any);
    } else {
      try {
        // ✅ processObject → processMember → typeDef.parse() → MAY THROW
        collection.push(processObject(item as ObjectNode, schema, defs, i));
      } catch (error) {
        // ✅ CATCH at collection boundary, convert to ErrorNode
        if (error instanceof Error) {
          const errorNode = new ErrorNode(error, item.getStartPos(), item.getEndPos());

          // ✅ Accumulate error at document level
          if (errorCollector) {
            errorCollector.push(error);
          }

          // ✅ Add ErrorNode to collection (item is faulty but collection continues)
          collection.push(errorNode as unknown as any);
        } else {
          throw error;  // Re-throw non-Error exceptions
        }
      }
    }
  }

  return collection;  // ✅ Returns collection with mix of valid items and ErrorNodes
}
```

**Key Benefits of Throw Pattern:**
- ✅ **Error recovery at collection boundary** - Individual items can fail without breaking entire collection
- ✅ **Individual items marked faulty** - Converted to ErrorNode with position info
- ✅ **Downstream can handle errors** - UI/JSON serialization shows error details
- ✅ **errorCollector accumulates** - Document-level tracking for multiple validation issues
- ✅ **Consistent with parser** - Same pattern for syntax errors (ErrorNode in AST)
- ✅ **Fail fast per item** - Clear which validation failed, easier debugging
- ✅ **Clean separation** - Validators just validate, collection processor handles recovery

**Impact:**
- 🔴 **CRITICAL** - Architectural deviation from proven V1 pattern
- 🔴 **CRITICAL** - Incompatible with existing error handling guidelines
- 🔴 **CRITICAL** - Makes migration/compatibility impossible
- 🔴 **CRITICAL** - Breaks error recovery at collection boundary

**Proposal Architecture:**
```typescript
// Single error return pattern with ctx.error()
if (value.length < config.minLength) {
  return ctx.error('minLength', `String too short`);
}
// Next validation...
```

**Current Implementation:**
```typescript
// Array accumulation pattern
const errors: ValidationError[] = [];

if (value.length < config.minLength) {
  errors.push({ code, message, path, metadata }); // Plain object
}
if (value.length > config.maxLength) {
  errors.push({ code, message, path, metadata }); // Plain object
}

return errors.length > 0
  ? ValidationResult.failure(errors)  // ❌ Plain objects, not IOValidationError
  : ValidationResult.success(value);
```

**Problems:**
1. ❌ Accumulates plain objects instead of IOValidationError instances
2. ❌ Doesn't use ctx.addError() which would create IOValidationError
3. ❌ Position tracking lost (ctx.currentPosition not used)
4. 🤔 **Decision needed:** Should validators return on first error or accumulate all?

**Two Possible Patterns:**

**Pattern A: Accumulate All Errors (Current)**
```typescript
validate(value: unknown, config: StringConfig, ctx: ValidationContext): ValidationResult<string> {
  // Check all constraints, collect all errors
  if (value.length < config.minLength) {
    ctx.addError(ErrorCodes.outOfRange, `Too short`, ctx.currentPosition);
  }
  if (value.length > config.maxLength) {
    ctx.addError(ErrorCodes.outOfRange, `Too long`, ctx.currentPosition);
  }
  if (config.pattern && !regex.test(value)) {
    ctx.addError(ErrorCodes.invalidPattern, `Pattern mismatch`, ctx.currentPosition);
  }

  const errors = ctx.getErrors();
  return errors.length > 0
    ? ValidationResult.failure(errors)
    : ValidationResult.success(value);
}
```

**Pattern B: Fail Fast (Proposal Style)**
```typescript
validate(value: unknown, config: StringConfig, ctx: ValidationContext): ValidationResult<string> {
  // Return on first error
  if (value.length < config.minLength) {
    ctx.addError(ErrorCodes.outOfRange, `Too short`, ctx.currentPosition);
    return ValidationResult.failure(ctx.getErrors());
  }
  if (value.length > config.maxLength) {
    ctx.addError(ErrorCodes.outOfRange, `Too long`, ctx.currentPosition);
    return ValidationResult.failure(ctx.getErrors());
  }
  // ... etc

  return ValidationResult.success(value);
}
```

**Recommendation:** ✅ **Pattern A (Accumulate All)**
- Better UX: Show all validation errors at once
- Matches Schema V2 design goal: "Error accumulation first"
- Aligns with V1 behavior for schema validation
- BUT: Must fix to use IOValidationError instances

#### Issue 3: ValidationContext Interface

**Proposal Architecture:**
```typescript
class ValidationContext {
  error(code: string, message: string): ValidationResult<never>;
  success<T>(value: T): ValidationResult<T>;
  addError(code: string, message: string): void;
}
```

**Current Implementation:**
```typescript
interface ValidationContext {
  addError(errorCode: string, message: string, positionRange?: PositionRange): void;
  // ❌ Missing: error() and success() helper methods
}
```

**Problems:**
1. ❌ No `ctx.error()` helper for immediate return
2. ❌ No `ctx.success()` helper for consistent success
3. ✅ Has `addError()` but it's not being used by validators

**Recommendation:** Add helper methods to ValidationContext:
```typescript
interface ValidationContext {
  // Existing
  addError(errorCode: string, message: string, positionRange?: PositionRange): void;
  getErrors(): IOValidationError[];

  // NEW: Helper methods for validators
  error<T = never>(errorCode: string, message: string, metadata?: any): ValidationResult<T>;
  success<T>(value: T): ValidationResult<T>;
}
```

#### Issue 4: Common Validation Integration

**Current Implementation:**
```typescript
// common-validation.ts uses ctx.addError() CORRECTLY
export function doCommonValidation<T>(value: unknown, config: CommonConfig<T>, ctx: ValidationContext) {
  if (value === undefined) {
    // ❌ Creates plain object instead of using ctx.addError()
    ctx.addError({
      code: ErrorCodes.valueRequired,
      message: `Value is required...`,
      path: ctx.currentPath,
      metadata: { ... }
    });
  }
}
```

**Problems:**
1. ❌ `ctx.addError()` signature expects `(errorCode, message, positionRange?)` but receives plain object
2. ❌ This is a **type mismatch** - needs fixing

**Current ValidationContext.addError signature:**
```typescript
addError(errorCode: string, message: string, positionRange?: PositionRange): void;
```

**What common-validation.ts is calling:**
```typescript
ctx.addError({  // ❌ Wrong! Passing object to errorCode parameter
  code: ErrorCodes.valueRequired,
  message: `...`,
  path: ctx.currentPath,
  metadata: { ... }
});
```

---

## ✅ Correct V2 Architecture (Following V1 Pattern)

### TypeSchema Interface - Simplified

```typescript
/**
 * Core interface that all type schemas must implement.
 *
 * CRITICAL: validate() method THROWS IOValidationError on failure (V1 pattern)
 */
export interface TypeSchema<TConfig = any, TValue = any> {
  readonly typeName: string;

  /**
   * Validate a value against this type's rules.
   *
   * **THROWS IOValidationError immediately on first validation failure.**
   * Error recovery happens at collection boundary, not here.
   *
   * @param value - Value to validate (may be Node from parser)
   * @param config - Configuration object (type-specific)
   * @param node - Optional Node for position tracking (pass to IOValidationError)
   * @param defs - Optional Definitions for lazy resolution (@var, $schema)
   *
   * @returns Validated value (only reached if all validations pass)
   * @throws IOValidationError on first validation failure
   */
  validate(
    value: unknown,
    config: TConfig,
    node?: Node,
    defs?: Definitions
  ): TValue;  // ✅ Returns value or throws, no ValidationResult wrapper

  serialize(value: TValue, config: TConfig): string;
}
```

### String Type - Following V1 Pattern

```typescript
export class StringTypeSchema implements TypeSchema<StringConfig, string> {
  readonly typeName = 'string';

  validate(
    value: unknown,
    config: StringConfig,
    node?: Node,
    defs?: Definitions
  ): string {
    // 1. Common validation (undefined, null, choices with lazy resolution)
    const { value: processedValue, changed } = doCommonValidation(value, config, node, defs);
    if (changed) return processedValue as string;

    // 2. Resolve variables (V1 pattern)
    if (value instanceof VarRefNode && defs) {
      value = defs.getV(value.name);
    }

    // 3. Type check - THROW immediately
    if (typeof value !== 'string') {
      throw new IOValidationError(
        ErrorCodes.notAString,
        `Expected string, got ${typeof value}.`,
        node  // ✅ Pass node for position tracking
      );
    }

    let str = value;

    // 4. Apply transformations
    if (config.trim) str = str.trim();
    if (config.lowercase) str = str.toLowerCase();
    if (config.uppercase) str = str.toUpperCase();

    // 5. Validate minLength - THROW immediately
    if (config.minLength !== undefined && str.length < config.minLength) {
      throw new IOValidationError(
        ErrorCodes.outOfRange,
        `String length ${str.length} is less than minimum ${config.minLength}.`,
        node
      );
    }

    // 6. Validate maxLength - THROW immediately
    if (config.maxLength !== undefined && str.length > config.maxLength) {
      throw new IOValidationError(
        ErrorCodes.outOfRange,
        `String length ${str.length} exceeds maximum ${config.maxLength}.`,
        node
      );
    }

    // 7. Validate pattern - THROW immediately
    if (config.pattern) {
      const regex = typeof config.pattern === 'string' ? new RegExp(config.pattern) : config.pattern;
      if (!regex.test(str)) {
        throw new IOValidationError(
          ErrorCodes.invalidPattern,
          `String '${str}' does not match pattern '${config.pattern}'.`,
          node
        );
      }
    }

    // 8. Validate format - THROW immediately
    if (config.format && !this.validateFormat(str, config.format)) {
      throw new IOValidationError(
        ErrorCodes.invalidChoice,
        `String '${str}' is not a valid ${config.format}.`,
        node
      );
    }

    return str;  // ✅ Only reached if all validations pass
  }

  serialize(value: string, config: StringConfig): string {
    // Serialization logic...
  }
}
```

### Common Validation - Following V1 Pattern

```typescript
/**
 * Result of common validation checks.
 * Matches V1's doCommonTypeCheck return type.
 */
export interface CommonValidationResult<T> {
  value: T | null | undefined;
  changed: boolean;  // true = early return (default/optional/null handled)
}

/**
 * Performs common validation checks that apply to all types.
 * Follows V1's doCommonTypeCheck pattern exactly.
 *
 * THROWS IOValidationError immediately on validation failure.
 */
export function doCommonValidation<T>(
  value: unknown,
  config: CommonConfig<T>,
  node?: Node,
  defs?: Definitions
): CommonValidationResult<T> {
  const isUndefined = value === undefined;
  const isNull = value === null;

  // 1. Check for undefined - THROW if required
  if (isUndefined) {
    if (config.default !== undefined) {
      return { value: config.default, changed: true };
    }
    if (config.optional) {
      return { value: undefined, changed: true };
    }

    // ✅ THROW immediately
    throw new IOValidationError(
      ErrorCodes.valueRequired,
      `Value is required.`,
      node
    );
  }

  // 2. Check for null - THROW if not nullable
  if (isNull) {
    if (config.nullable) {
      return { value: null, changed: true };
    }

    // ✅ THROW immediately
    throw new IOValidationError(
      ErrorCodes.nullNotAllowed,
      `Null is not allowed.`,
      node
    );
  }

  // 3. Validate choices - THROW if invalid
  if (config.choices && config.choices.length > 0) {
    const resolvedChoices = resolveChoices(config.choices, defs);
    const found = resolvedChoices.some(choice => value === choice);

    if (!found) {
      const choicesStr = resolvedChoices.join(', ');

      // ✅ THROW immediately
      throw new IOValidationError(
        ErrorCodes.invalidChoice,
        `Invalid choice '${value}'. Valid options: ${choicesStr}.`,
        node
      );
    }
  }

  // All common checks passed, continue with type-specific validation
  return { value: value as T, changed: false };
}
```

### What Gets Removed

```typescript
// ❌ DELETE: validation-result.ts - Not needed
export interface ValidationResult<T> {
  success: boolean;
  value?: T;
  errors: IOValidationError[];
}

// ❌ DELETE: Most of validation-context.ts - Not needed
export interface ValidationContext {
  readonly currentPath: string[];
  readonly currentPosition?: PositionRange;
  addError(errorCode: string, message: string, positionRange?: PositionRange): void;
  getErrors(): IOValidationError[];
  // ... etc
}

// ✅ KEEP: Only lazy resolution helpers (can be standalone utility)
export function resolveVar(name: string, defs?: Definitions): any;
export function resolveSchema(name: string, defs?: Definitions): any;
export function resolveChoices(choices: any[], defs?: Definitions): any[];
```

---

## 🎯 Required Changes

### Priority 1: Remove ValidationResult/ValidationContext (CRITICAL)

**Change 1: Update ValidationContext Interface**

Add helper methods and fix addError usage:

```typescript
interface ValidationContext {
  readonly currentPath: string[];
  readonly currentPosition?: PositionRange;

  // Core error methods
  addError(errorCode: string, message: string, metadata?: any, positionRange?: PositionRange): void;
  getErrors(): IOValidationError[];
  clearErrors(): void;

  // Helper methods for validators (convenience)
  error<T = never>(errorCode: string, message: string, metadata?: any): ValidationResult<T>;
  success<T>(value: T): ValidationResult<T>;

  // Path management
  pushPath(segment: string): void;
  popPath(): void;
  setPosition(position?: PositionRange): void;

  // Lazy resolution (V1 pattern)
  resolveVar(name: string): any;
  resolveSchema(name: string): any;
  resolveChoices(choices: any[], path: string): Set<any>;
}
```

**Change 2: Fix common-validation.ts**

```typescript
export function doCommonValidation<T>(
  value: unknown,
  config: CommonConfig<T>,
  ctx: ValidationContext
): CommonValidationResult<T> {

  if (value === undefined) {
    if (config.default !== undefined) {
      return { value: config.default, shouldContinue: false };
    }
    if (config.optional) {
      return { value: undefined, shouldContinue: false };
    }

    // ✅ Fix: Use correct addError signature
    ctx.addError(
      ErrorCodes.valueRequired,
      `Value is required at '${ctx.currentPath.join('.')}'.`,
      { expected: 'defined value', actual: 'undefined' },
      ctx.currentPosition  // Use current position from context
    );
    return { value: undefined, shouldContinue: false };
  }

  // Similar fixes for null and choices...
}
```

**Change 3: Fix All Validators**

Pattern for string-type.ts, number-type.ts, boolean-type.ts:

```typescript
validate(value: unknown, config: StringConfig, ctx: ValidationContext): ValidationResult<string> {
  // 1. Common validation
  const commonResult = doCommonValidation(value, config, ctx);
  if (!commonResult.shouldContinue) {
    const errors = ctx.getErrors();
    return errors.length > 0
      ? ValidationResult.failure(errors)
      : ValidationResult.success(commonResult.value as string);
  }

  // 2. Type check - use ctx.error() helper
  if (typeof value !== 'string') {
    return ctx.error(
      ErrorCodes.notAString,
      `Expected string, got ${typeof value}.`,
      { expectedType: 'string', actualType: typeof value }
    );
  }

  let processedValue = value;

  // 3. Transformations
  if (config.trim) processedValue = processedValue.trim();
  if (config.lowercase) processedValue = processedValue.toLowerCase();
  if (config.uppercase) processedValue = processedValue.toUpperCase();

  // 4. Validate constraints - accumulate errors
  if (config.minLength !== undefined && processedValue.length < config.minLength) {
    ctx.addError(
      ErrorCodes.outOfRange,
      `String length ${processedValue.length} is less than minimum ${config.minLength}.`,
      {
        constraint: 'minLength',
        actual: processedValue.length,
        min: config.minLength
      },
      ctx.currentPosition
    );
  }

  if (config.maxLength !== undefined && processedValue.length > config.maxLength) {
    ctx.addError(
      ErrorCodes.outOfRange,
      `String length ${processedValue.length} exceeds maximum ${config.maxLength}.`,
      {
        constraint: 'maxLength',
        actual: processedValue.length,
        max: config.maxLength
      },
      ctx.currentPosition
    );
  }

  // Similar for pattern, format...

  // 5. Return result
  const errors = ctx.getErrors();
  return errors.length > 0
    ? ValidationResult.failure(errors)
    : ValidationResult.success(processedValue);
}
```

### Priority 2: Implement ValidationContext (Day 3)

Full implementation with:
- IOValidationError creation in addError()
- Helper methods error() and success()
- Position tracking integration
- Lazy resolution with cycle detection
- Per-run caches

### Priority 3: Update Type Definitions

Fix ValidationError type inconsistency:

**Current (Wrong):**
```typescript
// validation-context.ts
export interface ValidationError {  // ❌ Plain interface
  code: string;
  message: string;
  path: string[];
  metadata?: any;
}
```

**Should Be:**
```typescript
// validation-context.ts
import IOValidationError from '../../errors/io-validation-error';

// Remove ValidationError interface, use IOValidationError class
export { IOValidationError };

// Update all imports
export interface ValidationContext {
  addError(...): void;
  getErrors(): IOValidationError[];  // ✅ Use class, not interface
}
```

---

## 🏗️ Implementation Plan

### Step 1: Remove ValidationResult/ValidationContext (60 min)

- [ ] Delete `validation-result.ts` file (not needed)
- [ ] Delete ValidationContext interface from `validation-context.ts`
- [ ] Keep only lazy resolution utilities in `validation-context.ts`
- [ ] Update all type imports

### Step 2: Fix TypeSchema Interface (15 min)

- [ ] Change `validate()` return type: `ValidationResult<T>` → `T`
- [ ] Add `node?: Node` parameter for position tracking
- [ ] Add `defs?: Definitions` parameter for lazy resolution
- [ ] Remove `ctx: ValidationContext` parameter
- [ ] Update documentation to clarify THROWS pattern

### Step 3: Fix common-validation.ts (30 min)

- [ ] Change return type: no longer returns result object
- [ ] Keep `{ value, changed }` pattern from V1
- [ ] Change `doCommonValidation()` to THROW IOValidationError instead of ctx.addError()
- [ ] Pass `node` parameter to IOValidationError constructor
- [ ] Update all error messages following ERROR-HANDLING-GUIDELINES.md

### Step 4: Fix All Type Validators (90 min)

**string-type.ts:**
- [ ] Remove `ValidationContext` parameter
- [ ] Add `node?: Node` and `defs?: Definitions` parameters
- [ ] Change return type: `ValidationResult<string>` → `string`
- [ ] Remove `ValidationResult.failure()` / `.success()` calls
- [ ] THROW IOValidationError directly on each validation failure
- [ ] Pass `node` to all IOValidationError constructors
- [ ] Remove local `errors: ValidationError[]` array

**number-type.ts:**
- [ ] Same changes as string-type.ts
- [ ] THROW on NaN/Infinity checks
- [ ] THROW on range violations
- [ ] THROW on integer checks

**boolean-type.ts:**
- [ ] Same changes as string-type.ts
- [ ] THROW on type check failures
- [ ] Remove ValidationResult pattern

### Step 5: Create Lazy Resolution Utilities (30 min)

- [ ] Create `src/schema-v2/utils/lazy-resolution.ts`
- [ ] Extract `resolveVar(name, defs)` utility
- [ ] Extract `resolveSchema(name, defs)` utility
- [ ] Extract `resolveChoices(choices, defs)` utility
- [ ] Add cycle detection for @var/@schema references
- [ ] Write unit tests for lazy resolution

### Step 6: Verify All Files Compile (15 min)

- [ ] Run TypeScript compiler
- [ ] Fix any type errors
- [ ] Verify all imports correct
- [ ] Verify no ValidationResult references remain---

## 📋 Architecture Decisions

### Decision 1: Throw Immediately vs Error Accumulation

**Question:** Should validators return on first error or accumulate all errors?

**Decision:** ✅ **THROW IMMEDIATELY (V1 Pattern)**

**Rationale:**
1. ✅ V1 throws immediately - Proven, tested, works for 1,461 tests
2. ✅ Error recovery at collection boundary - Collection processor catches and converts to ErrorNode
3. ✅ Fail fast per item - Clear which validation failed, easier debugging
4. ✅ Clean separation - Validators validate, collection processor handles recovery
5. ✅ Consistent with parser - Same pattern for syntax errors (ErrorNode in AST)
6. ✅ Follows ERROR-HANDLING-GUIDELINES.md - "Errors are teaching moments" with clear messages
7. ❌ Error accumulation in validators breaks collection recovery pattern

**Implementation:**
```typescript
validate(value: unknown, config: StringConfig, node?: Node, defs?: Definitions): string {
  // ✅ THROW on type error
  if (typeof value !== 'string') {
    throw new IOValidationError(ErrorCodes.notAString, message, node);
  }

  // ✅ THROW on constraint error
  if (value.length > config.maxLength) {
    throw new IOValidationError(ErrorCodes.outOfRange, message, node);
  }

  return value;  // ✅ Only reached if all validations pass
}
```

### Decision 2: ValidationResult Pattern

**Question:** Should TypeSchema.validate() return ValidationResult<T> or T?

**Decision:** ✅ **Return T (V1 Pattern)**

**Rationale:**
1. ✅ V1 returns value directly or throws
2. ✅ No ValidationResult wrapper needed
3. ✅ Simpler API - return value or throw error
4. ✅ Matches standard JavaScript/TypeScript patterns
5. ❌ ValidationResult adds complexity without benefit

**Implementation:**
```typescript
interface TypeSchema<TConfig, TValue> {
  validate(value: unknown, config: TConfig, node?: Node, defs?: Definitions): TValue;
  // Returns TValue or throws IOValidationError
}
```

### Decision 3: ValidationContext

**Question:** Do we need ValidationContext for state management?

**Decision:** ❌ **NO - Not Needed for Validators**

**Rationale:**
1. ✅ V1 has no ValidationContext in validators
2. ✅ Node parameter provides position tracking
3. ✅ Definitions parameter provides lazy resolution
4. ✅ Validators are stateless - no need for context object
5. ⚠️ KEEP lazy resolution utilities (resolveVar, resolveSchema, resolveChoices) as standalone functions

**Implementation:**
```typescript
// ❌ DELETE: ValidationContext interface (not needed in validators)

// ✅ KEEP: Lazy resolution utilities (standalone functions)
export function resolveVar(name: string, defs?: Definitions): any;
export function resolveSchema(name: string, defs?: Definitions): any;
export function resolveChoices(choices: any[], defs?: Definitions): any[];
```

### Decision 4: Error Position Tracking

**Question:** How do validators track positions for IDE integration?

**Decision:** ✅ **Pass Node Parameter (V1 Pattern)**

**Rationale:**
1. ✅ V1 passes Node to every validator method
2. ✅ Node contains PositionRange built-in
3. ✅ IOValidationError constructor accepts Node directly
4. ✅ Optional for plain value validation (unit tests)
5. ✅ Simple, proven pattern

**Implementation:**
```typescript
validate(value: unknown, config: StringConfig, node?: Node, defs?: Definitions): string {
  if (typeof value !== 'string') {
    throw new IOValidationError(
      ErrorCodes.notAString,
      message,
      node  // ✅ Pass node for position tracking (optional)
    );
  }
  return value;
}
```

---

## ✅ Success Criteria (V1-Aligned)

### Must Have

- ✅ All validators THROW IOValidationError immediately (no error accumulation)
- ✅ All validators follow V1 `{ value, changed }` pattern for common validation
- ✅ Position tracking works via Node parameter (not ValidationContext)
- ✅ ValidationResult pattern removed (validators return T or throw)
- ✅ ValidationContext removed (not needed, use Node + Definitions)
- ✅ All three validators (String, Number, Boolean) refactored to throw
- ✅ common-validation.ts throws IOValidationError directly
- ✅ All files compile without TypeScript errors
- ✅ Error recovery at collection boundary works (catch and convert to ErrorNode)
- ✅ Lazy resolution utilities extracted as standalone functions

### Should Have

- ✅ Validators accumulate all constraint errors (not fail fast)
- ✅ Type check errors return immediately (fail fast)
- ✅ Error messages follow ERROR-HANDLING-GUIDELINES.md
- ✅ Metadata included in all errors for debugging
- ✅ Helper methods documented with examples

### Nice to Have

- ⏳ Performance benchmarks (< 50µs per validation)
- ⏳ Unit tests for position tracking
- ⏳ Integration tests with parser (AST → validation)

---

## 🚀 Next Actions

1. **Update ValidationContext interface** with helper methods and metadata parameter
2. **Fix common-validation.ts** to use correct addError signature
3. **Refactor all three validators** to use ctx.addError() and IOValidationError
4. **Remove ValidationError interface** (use IOValidationError class)
5. **Verify all files compile** without errors
6. **Test position tracking** with both AST nodes and plain values

---

**Status:** 🟡 Architecture review complete, implementation fixes needed

**Priority:** 🔴 HIGH - Position tracking is critical for IDE integration

**Estimated Time:** 2-3 hours to fix all issues

**Blocker:** Must fix before Day 3 (full ValidationContext implementation)
