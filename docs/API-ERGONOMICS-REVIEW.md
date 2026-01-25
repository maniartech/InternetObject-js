# API Ergonomics Review

> **Status**: Pre-Beta Review
> **Date**: January 25, 2026
> **Purpose**: Identify gaps, inconsistencies, and improvements for developer experience

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Signature Mismatches](#signature-mismatches)
3. [Naming Inconsistencies](#naming-inconsistencies)
4. [Missing Function Pairs](#missing-function-pairs)
5. [Essential Functions Missing](#essential-functions-missing)
6. [Parameter Awkwardness](#parameter-awkwardness)
7. [Export Organization Issues](#export-organization-issues)
8. [Streaming API Gaps](#streaming-api-gaps)
9. [Recommendations Summary](#recommendations-summary)

---

## Executive Summary

The Internet Object API is **functional and well-typed**. After review, most issues are resolved or deferred:

| Category | Status | Notes |
|----------|--------|-------|
| Signature Mismatches | ✅ Resolved | All 4 reviewed - docs updated |
| Naming Inconsistencies | ✅ Resolved | 1 fix (`documentToObject` → deprecate) |
| Missing Function Pairs | ✅ Resolved | Added round-trip tests + docs note |
| Essential Functions Missing | ✅ Resolved | `parseSchema`/`io.schema`, `validate*`, `toJSON` implemented |
| Parameter Awkwardness | ✅ Resolved | `parseDefinitions(source)` works without `null` |
| Export Organization | ✅ Resolved | `Schema` renamed to `IOSchema` (no duplicate export) |
| Streaming API | ⏳ Deferred | API still volatile |

**Overall API Score: 8.3/10** - Good for beta, improvements recommended post-launch.

---

## Signature Analysis

> **Note**: Issues 1-3 below are **well-designed APIs** that need **better documentation**, not code changes.

### 1. `parse()` vs `parseDefinitions()` - Different Purposes ✅

```typescript
// parse() - parses full IO document, returns Document wrapper
function parse(input: string, defs: IODefinitions | IOSchema | null, errors?: Error[]): IODocument;

// parseDefinitions() - parses definitions only, returns IODefinitions
function parseDefinitions(input: string, defs?: IODefinitions | null, options?: ParserOptions): IODefinitions;
```

| Function | Purpose | Returns | When to Use |
|----------|---------|---------|-------------|
| `parse()` | Parse complete IO text with data | `Document` | Full document with header + data sections |
| `parseDefinitions()` | Parse schema/variable definitions only | `Definitions` | Creating reusable schemas to pass to other functions |

**Parameter difference explained**:
- `parse()` accepts `IOSchema | null` because you can pass an inline schema for validation
- `parseDefinitions()` creates/extends `IODefinitions` (and supports `parseDefinitions(text)` with no `null`)


---

### 2. `load()` vs `loadObject()` vs `loadCollection()` - Layered API ✅

```typescript
// All three have IDENTICAL overload patterns:
// (data), (data, defs), (data, options), (data, defs, options)

// load() - returns Document (wrapper with header)
function load(data: any): Document;
function load(data: any, defs: Definitions): Document;
function load(data: any, options: LoadOptions): Document;
function load(data: any, defs: Definitions, options: LoadOptions): Document;

// loadObject() - returns raw InternetObject (no wrapper)
function loadObject(data: object): InternetObject;
function loadObject(data: object, defs: Definitions): InternetObject;
function loadObject(data: object, options: LoadObjectOptions): InternetObject;
function loadObject(data: object, defs: Definitions, options: LoadObjectOptions): InternetObject;

// loadCollection() - returns raw Collection (no wrapper)
function loadCollection(data: any[]): Collection<InternetObject>;
function loadCollection(data: any[], defs: Definitions): Collection<InternetObject>;
function loadCollection(data: any[], options: LoadCollectionOptions): Collection<InternetObject>;
function loadCollection(data: any[], defs: Definitions, options: LoadCollectionOptions): Collection<InternetObject>;
```

**✅ Signatures are consistent** - all follow the same `(data, defs?, options?)` pattern.

**Issue**: Naming overlap - when should user choose `load()` vs `loadObject()`?

| Function | Returns | Use Case |
|----------|---------|----------|
| `load()` | `Document` | Need full document with header for stringify |
| `loadObject()` | `InternetObject` | Just need the validated object |
| `loadCollection()` | `Collection` | Just need the validated array |

**Verdict**: ✅ Good layered design - provides both convenience (`load`) and precision (`loadObject`/`loadCollection`).


---

### 3. `stringify()` vs `stringifyDocument()` - Complementary APIs ✅

```typescript
// stringify() - universal entry point, handles any type
function stringify(
  value: InternetObject | Collection | Document | any,
  defs?: Definitions,
  options?: StringifyOptions
): string;

// stringifyDocument() - Document-specific with extra options
function stringifyDocument(doc: Document, options?: StringifyDocumentOptions): string;

// StringifyDocumentOptions EXTENDS StringifyOptions with:
interface StringifyDocumentOptions extends StringifyOptions {
  includeSectionNames?: boolean;  // Include section names after '---'
  sectionsFilter?: string[];       // Only include specific sections
  definitionsFormat?: 'io';        // Format for definitions in header
}
```

**Relationship**: `stringify()` **delegates** to `stringifyDocument()` when passed a Document:

```typescript
// In stringify.ts
if (value instanceof Document) {
  return stringifyDocument(value, docOptions);  // delegation!
}
```

| Function | Use Case |
|----------|----------|
| `stringify(doc)` | Simple document output with default options |
| `stringify(obj)` | InternetObject, Collection, or plain values |
| `stringifyDocument(doc, opts)` | Full control: filter sections, control names, etc. |

**Verdict**: ✅ Good layered design:
- `stringify()` = convenience API (universal)
- `stringifyDocument()` = power-user API (document-specific options)


---

### 4. Template Tags vs Regular Functions - ✅ RESOLVED

```typescript
// Template tags ALL have .with() method
ioDocument.with(defs)`...`;
ioObject.with(defs)`...`;
ioDefinitions.with(parentDefs)`...`;  // ✅ Now available!
```

**Resolved**: Added `ioDefinitions.with()` for extending/merging definitions.

---

## Naming Inconsistencies

### Pattern Analysis

| Function | Pattern | Consistency Issue |
|----------|---------|-------------------|
| `parse` | verb | ✅ Good |
| `parseDefs` | verb + noun | ✅ **Added** - Short alias |
| `parseDefinitions` | verb + noun | ✅ Full name available |
| `load` | verb | ✅ Good - returns Document |
| `loadObject` | verb + noun | ✅ Good - returns InternetObject |
| `loadCollection` | verb + noun | ✅ Good - returns Collection |
| `loadInferred` | verb + adjective | ✅ Good - **different purpose** (infers schema from data) |
| `stringify` | verb | ✅ Good |
| `stringifyDocument` | verb + noun | ✅ Good - power-user API with extra options |
| `documentToObject` | noun + verb | ❌ Opposite pattern! |
| `openStream` | verb + noun | ✅ Good |
| `createStreamWriter` | verb + noun + noun | ⚠️ Verbose |
| `createPushSource` | verb + noun + noun | ⚠️ Verbose |

### Load Function Family - ✅ Well Organized

The `load*` functions form a coherent family with distinct purposes:

| Function | Purpose | Schema | Returns |
|----------|---------|--------|---------|
| `load()` | Load with explicit schema | Provided by user | `Document` |
| `loadObject()` | Load single object with schema | Provided by user | `InternetObject` |
| `loadCollection()` | Load array with schema | Provided by user | `Collection` |
| `loadInferred()` | Load with **auto-inferred** schema | Generated from data | `Document` |

**Verdict**: ✅ `loadInferred` uses a different naming pattern (`verb + adjective`) because it has a fundamentally different behavior - it **guesses** the schema instead of requiring one.

### Remaining Issues

| Function | Issue | Recommendation |
|----------|-------|----------------|
| `documentToObject` | Opposite pattern (noun + verb) | **Deprecate** - replace with `io.toJSON(value)` using `Jsonable` interface |
| `createStreamWriter` | ✅ Acceptable | Standard factory pattern (`create + Noun`) |
| `createPushSource` | ✅ Acceptable | Descriptive name for specialized utility |

---

## Missing Function Pairs

### 1. ✅ `parse()` ↔ `stringify()` Round-Trip - IMPLEMENTED

```typescript
// Forward
const doc = parse(ioText);

// Reverse
const text = stringify(doc);

// Round-trip should be guaranteed:
const doc = parse(text);
const text2 = stringify(doc);
const doc2 = parse(text2);  // Should equal doc
```

**Implemented**:
1. Added round-trip/idempotence tests under `tests/ergonomics/roundtrip.test.ts`
2. Added a short README note showing how to get stable normalized output
3. Recommendation: for full document round-trips, use explicit `stringify(doc, { includeHeader: true, includeSectionNames: true })`

---

### 2. ✅ `loadObject()` ↔ `toJSON()` Pair - SOLUTION IDENTIFIED

```typescript
// From JS object
const ioObj = loadObject({ name: 'Alice', age: 30 }, defs);

// Back to JS object
const jsObj = ioObj.toJSON();  // Method exists on all IO classes

// But there's no top-level function, and documentToObject uses wrong pattern
const jsObj = documentToObject(doc);  // ❌ noun+verb pattern
```

**Solution**: Add `io.toJSON()` with `Jsonable` interface:

```typescript
// Define interface for any object with toJSON()
interface Jsonable {
  toJSON(options?: { skipErrors?: boolean }): any;
}

// Universal toJSON function works with ANY Jsonable
function toJSON(value: Jsonable, options?: { skipErrors?: boolean }): any {
  return value.toJSON(options);
}

// Works with all IO types:
io.toJSON(doc);         // Document → JS object
io.toJSON(obj);         // InternetObject → JS object
io.toJSON(collection);  // Collection → JS array
io.toJSON(section);     // Section → JS object
```

**Benefits**:
- Deprecates `documentToObject` (redundant, wrong naming)
- Functional composition: `items.map(io.toJSON)`
- Future-proof: any class implementing `Jsonable` works automatically

---

### 3. ✅ Schema Validation Family - IMPLEMENTED

```typescript
// Current: Load with validation (throws if invalid)
const obj = loadObject(data, defs);  // throws ValidationError

// MISSING: Validate without loading - returns ValidationResult
const result = validate(data, schemaOrDefs);  // ✅ returns ValidationResult
```

**Implementation Plan**: Mirror the `load*` family pattern:

```typescript
// ValidationResult - immutable, functional style (like Zod, Yup)
interface ValidationResult<T = any> {
  valid: boolean;
  errors: ValidationError[];
  data?: T;  // The validated/coerced data (only if valid)
}

// validate() - auto-detect object or array
function validate(data: any, schema: IOSchema | IODefinitions): ValidationResult;

// validateObject() - explicit single object
function validateObject(data: object, schema: IOSchema | IODefinitions): ValidationResult<object>;

// validateCollection() - explicit array
function validateCollection(data: any[], schema: IOSchema | IODefinitions): ValidationResult<any[]>;
```

**Usage**:
```typescript
const result = validateObject(userData, userSchema);
if (result.valid) {
  saveUser(result.data);  // TypeScript knows data exists
} else {
  showErrors(result.errors);
}
```

**Benefits**:
- ✅ Mirrors `load*` family (consistency)
- ✅ Immutable result (no mutation)
- ✅ Functional style (composable)
- ✅ TypeScript narrowing (`if (result.valid) { result.data }`)
- ✅ Modern pattern (Zod, Yup, io-ts style)

---

## Essential Functions Missing

### 1. ✅ `validate*()` Family - IMPLEMENTED

Mirrors the `load*` family for validation without wrapping:

```typescript
interface ValidationResult<T = any> {
  valid: boolean;
  errors: ValidationError[];
  data?: T;  // Validated/coerced data (only if valid)
}

// Auto-detect (handles object or array)
function validate(data: any, schema: IOSchema | IODefinitions): ValidationResult;

// Explicit object (stricter TypeScript types)
function validateObject(data: object, schema: IOSchema | IODefinitions): ValidationResult<object>;

// Explicit array (stricter TypeScript types)
function validateCollection(data: any[], schema: IOSchema | IODefinitions): ValidationResult<any[]>;
```

**Use Case**: Form validation, API validation, data pipeline validation.

---

### 2. ✅ `io.fromJSON()` - NOT NEEDED

`load(jsonData, defs)` already handles this. No additional function needed.

---

### 3. ✅ `io.toJSON()` - Universal JSON Conversion - IMPLEMENTED

```typescript
// MISSING at top level - only exists as instance methods
// Should accept ANY object implementing Jsonable interface

interface Jsonable {
  toJSON(options?: { skipErrors?: boolean }): any;
}

function toJSON(value: Jsonable, options?: { skipErrors?: boolean }): any;
```

**Use Case**:
- Symmetry with `fromJSON()`
- Works with Document, InternetObject, Collection, Section, etc.
- Enables functional composition: `items.map(io.toJSON)`
- Deprecates awkward `documentToObject()` function

**Status**: Available as both `toJSON(value)` and `io.toJSON(value)`.

---

### 4. ✅ `io.schema` / `parseSchema()` - Quick Schema Creation - IMPLEMENTED

Follow the same pattern as `parseDefinitions` / `io.defs`:

```typescript
// Regular function
const schema = parseSchema('{ name: string, age: int }');
const schema = parseSchema('{ name: string, age: int }', parentDefs);

// Template tag
const schema = io.schema`{ name: string, age: int }`;
const schema = ioSchema`{ name: string, age: int }`;

// With parent definitions
const schema = io.schema.with(defs)`{ name: string, age: int }`;
const schema = ioSchema.with(defs)`{ name: string, age: int }`;
```

**Current Workaround** (two steps):
```typescript
const defs = parseDefinitions('~ $User: { name: string, age: int }');
const schema = defs.get('$User');
```

**Benefits**:
- One-step schema creation
- Consistent with `parseDefinitions` / `io.defs` pattern
- Template tag for inline definitions, function for dynamic strings

---

### 5. ⏳ `io.clone()` / `io.merge()` - Object Manipulation - POST-BETA

```typescript
// NOT NEEDED FOR BETA - consider for future versions
function clone(obj: InternetObject): InternetObject;
function merge(target: InternetObject, source: InternetObject): InternetObject;
function pick(obj: InternetObject, keys: string[]): InternetObject;
function omit(obj: InternetObject, keys: string[]): InternetObject;
```

**Current approach**: Use native JS spread/destructuring

---

## Parameter Awkwardness

### 1. ✅ Required `null` for Optional Parameters - FIXED

```typescript
// parse() - already works! ✅
const doc = parse(text);  // Works without null

// parseDefinitions() - no null needed ✅
const defs = parseDefinitions(text);
const defs2 = parseDefinitions(text, null); // still supported for backward-compat
```

**Fix needed**: Make `externalDefs` parameter optional in `parseDefinitions()`:

```typescript
// From:
function parseDefinitions(source: string, externalDefs: Definitions | null, ...)

// To:
function parseDefinitions(source: string, externalDefs?: Definitions | null, ...)
```

---

### 2. Options Object Position Varies

```typescript
// parse() - errors is 3rd param, no options object
parse(text, defs, errors);

// stringify() - options is 3rd param
stringify(value, defs, options);

// loadObject() - options can be 2nd OR 3rd
loadObject(data, options);        // 2nd
loadObject(data, defs, options);  // 3rd
```

**Issue**: Inconsistent parameter positioning.

**Expected**: Always `(primary, defs?, options?)` or use single options object.

---

### 3. Error Collection Pattern Varies

```typescript
// parse() - errors array as parameter
const errors: Error[] = [];
parse(text, defs, errors);

// loadObject() - errors in options
loadObject(data, defs, { errorCollector: errors });

// ioDocument.with() - errors as second param
ioDocument.with(defs, errors)`...`;
```

**Issue**: Three different patterns for error collection.

**Expected**: Single consistent pattern, preferably options object:
```typescript
{ errors: Error[] }  // or
{ onError: (e: Error) => void }
```

---

## Export Organization Issues

### 1. ✅ Duplicate Exports - VERIFIED CLEAN

```typescript
// index.ts exports the SAME class twice with different names!
export { default as IODefinitions } from './core/definitions';
```

**Status**: No duplicate export in current `src/index.ts`.

---

### 2. ✅ Class Naming - FIXED FOR SCHEMA

| Class | Current | Recommendation |
|-------|---------|----------------|
| `IODocument` | ✅ Has IO prefix | Keep |
| `IOHeader` | ✅ Has IO prefix | Keep |
| `IODefinitions` | ✅ Has IO prefix | Keep |
| `IOCollection` | ✅ Has IO prefix | Keep |
| `IOObject` | ✅ Has IO prefix | Keep |
| `IOSchema` | ✅ Has IO prefix | Keep |
| `Decimal` | ❌ No IO prefix | ✅ **Keep as-is** |

**Rationale**:
- `IOSchema` - IO-specific schema definition, should have prefix for consistency
- `Decimal` - General-purpose precision number class. JS lacks this, so we provide it. Other language implementations can use native decimal types (C# `decimal`, Python `Decimal`, Java `BigDecimal`).

---

## Streaming API Gaps

> ⚠️ **STREAMING API IS EXPERIMENTAL** - The streaming API is still volatile and may change.
> All streaming improvements deferred until API stabilizes.

### 1. ⏳ No Simple Stream Reader - POST-STABLE

```typescript
// Current - async iteration (works)
for await (const item of openStream(source, defs)) {
  // process item
}

// Future consideration - callback-based alternative
streamRead(source, defs, (item) => { /* process */ });

// Future consideration - collect all
const items = await collectStream(source, defs);
```

---

### 2. ⏳ No Stream Builder Pattern - POST-STABLE

```typescript
// Current - constructor with options (works)
const writer = createStreamWriter(transport, defs, options);

// Future consideration - fluent builder
const writer = io.writer(transport).definitions(defs).build();
```

---

### 3. ⏳ Missing Stream Utilities - POST-STABLE

```typescript
// Future consideration
function streamToArray(stream): Promise<any[]>;
function streamFirst(stream): Promise<StreamItem | null>;
function streamCount(stream): Promise<number>;
```

---

## Recommendations Summary

### 🔴 High Priority - FOR BETA

| Issue | Recommendation | Status |
|-------|----------------|--------|
| Missing `validate()` family | Add `validate`, `validateObject`, `validateCollection` → `ValidationResult` | ✅ Resolved |
| `io.toJSON(Jsonable)` | Universal JSON conversion for all types | ✅ Resolved |
| `parseSchema` / `io.schema` | Quick schema creation (function + template tag) | ✅ Resolved |
| `parseDefinitions` requires `null` | Make `externalDefs` optional | ✅ Resolved |
| Remove `IODefinitionValue` duplicate | Clean up exports | ✅ Verified clean |
| Rename `Schema` → `IOSchema` | Avoid generic name collision | ✅ Resolved |
| Deprecate `documentToObject` | Replace with `io.toJSON()` | ✅ Resolved |

### 🟡 Medium Priority - POST-BETA

| Issue | Recommendation | Status |
|-------|----------------|--------|
| Round-trip tests | Verify parse → stringify preserves data | ✅ Resolved |
| Consistent error collection | Standardize on options object pattern | ⏳ Deferred |

### 🟢 Low Priority - FUTURE

| Issue | Recommendation | Status |
|-------|----------------|--------|
| `clone`/`merge`/`pick`/`omit` | Object manipulation utils | ⏳ POST-BETA |
| Stream utilities | `collectStream`, `streamFirst`, etc. | ⏳ POST-STABLE |
| Fluent stream builder | `io.writer().definitions().build()` | ⏳ POST-STABLE |
| Rename `createStreamWriter` | Shorter name (API still volatile) | ⏳ POST-STABLE |

### ✅ Already Done

| Issue | Resolution |
|-------|------------|
| `parseDefs` alias | Added ✅ |
| `ioDefinitions.with()` | Added ✅ |
| `fromJSON` needed? | NO - `load()` handles it ✅ |
| `loadInferred` naming | Correct - different purpose ✅ |

---

## Appendix: Ideal API Surface

```typescript
// ═══════════════════════════════════════════════════════
// PARSING (IO Text → Objects)
// ═══════════════════════════════════════════════════════
io.parse(text)                           // → Document
io.parse(text, defs)                     // → Document with schema
io.parse(text, { errors: [] })           // → Document, collect errors

io.parseDefs(text)                       // → Definitions (alias)
io.parseDefinitions(text)                // → Definitions (full name)

// ═══════════════════════════════════════════════════════
// LOADING (JS Data → IO Objects)
// ═══════════════════════════════════════════════════════
io.load(data)                            // → Document (auto-detect)
io.load(data, defs)                      // → Document with validation
io.load(data, { schema: '$User' })       // → Document with named schema

io.loadObject(obj)                       // → InternetObject
io.loadObject(obj, defs)                 // → with validation
io.loadCollection(arr)                   // → Collection
io.loadCollection(arr, defs)             // → with validation

// Note: io.fromJSON() NOT needed - io.load() handles JSON data directly

// ═══════════════════════════════════════════════════════
// SERIALIZING (Objects → IO Text / JSON)
// ═══════════════════════════════════════════════════════
io.stringify(doc)                        // → IO text
io.stringify(obj, defs)                  // → IO text with types
io.stringify(obj, { indent: 2 })         // → Pretty IO text

io.toJSON(value: Jsonable)              // → JS object/array (works with Doc, Object, Collection, etc.)

// ═══════════════════════════════════════════════════════
// VALIDATION (Check without Loading) - Returns ValidationResult
// ═══════════════════════════════════════════════════════
io.validate(data, schema)                // → ValidationResult (auto-detect)
io.validateObject(obj, schema)           // → ValidationResult<object>
io.validateCollection(arr, schema)       // → ValidationResult<any[]>

// ═══════════════════════════════════════════════════════
// SCHEMA (Quick Schema Creation)
// ═══════════════════════════════════════════════════════
io.parseSchema(text)                     // → Schema (function)
io.parseSchema(text, parentDefs)         // → with parent definitions
io.schema`{ name: string, age: int }`    // → Schema (template tag)
io.schema.with(defs)`{ ... }`            // → with parent definitions

io.parseDefs(text)                       // → Definitions (alias)
io.parseDefinitions(text)                // → Definitions (full name)
io.defs`~ $User: { name, age }`          // → Definitions (template tag)
io.defs.with(parentDefs)`...`            // → with parent definitions

// ═══════════════════════════════════════════════════════
// STREAMING (Chunked I/O) - ⚠️ EXPERIMENTAL, API may change
// ═══════════════════════════════════════════════════════
io.openStream(source, defs)              // → AsyncIterable<StreamItem>
io.createStreamWriter(transport, defs)   // → IOStreamWriter
io.createPushSource(defs)                // → PushSource
// Note: Stream utilities deferred until API stabilizes

// ═══════════════════════════════════════════════════════
// TEMPLATE TAGS (Ergonomic Inline) - All have .with() method
// ═══════════════════════════════════════════════════════
io.doc`...`                              // → Document (alias: ioDocument)
io.doc.with(defs)`...`                   // → Document with defs
io.object`...`                           // → InternetObject (alias: ioObject)
io.object.with(defs)`...`                // → with validation
io.schema`...`                           // → Schema (alias: ioSchema)
io.schema.with(defs)`...`                // → with parent definitions
io.defs`...`                             // → Definitions (alias: ioDefinitions)
io.defs.with(parentDefs)`...`            // → with parent definitions
```

---

*Document generated for Internet Object JS v0.2.0*
