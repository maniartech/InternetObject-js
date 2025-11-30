# Internet Object API Simplification

## Current State (Confusing)

### Load Functions (Too Many!)
| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `load` | `(data, schema?, options?)` | `InternetObject \| Collection` | Load with explicit schema or infer |
| `loadDoc` | `(data, schema?, options?)` | `Document` | Load into Document with inferDefs option |
| `loadDocument` | `(data: DocumentData, options?)` | `Document` | Complex document loading with sections |
| `loadObject` | `(data, schema, defs?)` | `InternetObject` | Load single object |
| `loadCollection` | `(data[], schema, defs?, errors?)` | `Collection` | Load array of objects |

### Problems
1. `load` vs `loadDoc` vs `loadDocument` - confusing overlap
2. `inferDefs` hidden as an option flag `{ inferDefs: true }`
3. `loadDocument` has complex `DocumentData` structure
4. Inconsistent return types (`InternetObject | Collection` vs `Document`)

---

## Proposed Simplified API

### Core Functions (7 total)

---

#### 1. `parse` - IO String → Document

Parse IO string to Document.

**Overloads:**
```typescript
parse(ioString): Document
parse(ioString, options): Document
parse(ioString, defs): Document              // External definitions to merge
parse(ioString, defs, options): Document
```

**Signature:**
```typescript
function parse(
  ioString: string,
  defs?: Definitions,
  options?: ParseOptions
): Document

interface ParseOptions {
  schemaName?: string;        // Pick specific schema from defs (e.g., '$User')
  strict?: boolean;           // Throw on first error (default: false)
  errorCollector?: Error[];   // Collect parse errors
}
```

**How schema is resolved:**
1. From IO string header (inline `~ $schema: {...}`)
2. If `options.schemaName` provided → uses `defs.get(schemaName)`
3. From `defs.defaultSchema` if provided (no schemaName)
4. Schema-less parsing if neither

**Usage:**
```typescript
// Simple - schema in IO string header
const doc = parse('~ $schema: {name, age}\n---\nAlice, 28')

// With external definitions (merged with header defs)
const doc = parse(ioString, externalDefs)

// With options
const doc = parse(ioString, { strict: true })

// Full
const doc = parse(ioString, defs, { strict: true })
```

---

#### 2. `stringify` - Document → IO String

Serialize Document/InternetObject/Collection to IO string.

**Overloads:**
```typescript
stringify(doc): string                       // Document has schema
stringify(doc, options): string
stringify(value, defs): string               // InternetObject/Collection needs defs
stringify(value, defs, options): string
```

**Signature:**
```typescript
function stringify(
  value: Document | InternetObject | Collection,
  defs?: Definitions,
  options?: StringifyOptions
): string

interface StringifyOptions {
  schemaName?: string;        // Pick specific schema from defs (e.g., '$User')
  indent?: number | string;   // Pretty print indentation
  includeHeader?: boolean;    // Include definitions header
  skipErrors?: boolean;       // Skip error objects in collections
}
```

**How schema is resolved:**
1. If `Document` → uses `doc.header.schema`
2. If `options.schemaName` provided → uses `defs.get(schemaName)`
3. If `Definitions` (no schemaName) → uses `defs.defaultSchema` (i.e., `$schema`)

**Usage:**
```typescript
// Document (has schema internally)
const io = stringify(doc)
const io = stringify(doc, { indent: 2 })

// InternetObject/Collection with Definitions (uses $schema)
const io = stringify(obj, defs)
const io = stringify(obj, defs, { includeHeader: true })

// With specific schema from definitions
const io = stringify(user, defs, { schemaName: '$User' })
```

---

#### 3. `load` - JS Data → Document

Load JS data into Document (with optional schema validation).

**Overloads:**
```typescript
load(data): Document                        // Schema-less (no validation)
load(data, defs): Document                  // Uses defs.defaultSchema
load(data, options): Document               // Schema-less with options
load(data, defs, options): Document
```

**Signature:**
```typescript
function load(
  data: any,                    // JS object or array
  defs?: Definitions,           // Optional: contains $schema
  options?: LoadOptions
): Document

interface LoadOptions {
  schemaName?: string;        // Pick specific schema from defs (e.g., '$User')
  strict?: boolean;           // Throw on first error (default: false)
  errorCollector?: Error[];   // Collect validation errors
}
```

**How schema is resolved:**
1. If `options.schemaName` provided → uses `defs.get(schemaName)`
2. If `defs` provided (no schemaName) → uses `defs.defaultSchema` (`$schema`)
3. If no `defs` → schema-less mode (no validation)

**Usage:**
```typescript
// Schema-less (no validation)
const doc = load(data)
const doc = load(data, { strict: true })

// With Definitions (validates against $schema i.e. defs.defaultSchema)
const doc = load(data, defs)
const doc = load(data, defs, { strict: true })

// With specific schema from definitions
const doc = load(data, defs, { schemaName: '$User' })
const doc = load(data, defs, { schemaName: '$Product', errorCollector: errors })

// Creating Definitions using parseDefinitions
const defs = parseDefinitions(`
~ $User: { name: string, age: int }
~ $Product: { title: string, price: number }
~ $address: { street: string, city: string, state: string }
~ $schema: { name: string, age: int, address: $address }
`, null)

// Validate against $schema (default)
const doc = load(data, defs)

// Validate against $User
const doc = load(userData, defs, { schemaName: '$User' })
```

---

#### 4. `loadInferred` - JS Data → Document (Auto Schema)

Load JS data with **inferred schema** into Document.

**Overloads:**
```typescript
loadInferred(data): Document
loadInferred(data, options): Document
```

**Signature:**
```typescript
function loadInferred(
  data: any,                      // JS object or array
  options?: LoadInferredOptions
): Document

interface LoadInferredOptions {
  strict?: boolean;               // Throw on first error
  errorCollector?: Error[];       // Collect validation errors
  // Future: inference hints
}
```

**Usage:**
```typescript
// Simple - infer schema from data
const doc = loadInferred(data)

// With options
const doc = loadInferred(data, { strict: true })

// Access inferred schema
const schema = doc.header.schema
const defs = doc.header.definitions
```

---

#### 7. `parseDefinitions` - Helper: IO Header → Definitions

Parse IO header text (definitions section) into Definitions object.

**Signature:**
```typescript
function parseDefinitions(
  source: string,
  externalDefs?: Definitions | null,
  options?: ParserOptions
): Definitions | null
```

**Usage:**
```typescript
// Parse definitions with variables, schemas, etc.
const defs = parseDefinitions(`
~ @defaultCity: "New York"
~ $address: { street: string, city: string, state: string }
~ $person: { name: string, age: int, address: $address }
~ $schema: $person
`, null)

// Use with load() or parse()
const doc = load(data, defs)
const doc = parse(ioString, defs)

// Access individual definitions
const personSchema = defs.get('$person')  // Schema
const cityVar = defs.get('@defaultCity')  // Variable value
```

**Returns Document with:**
- `doc.header.definitions` - All inferred schemas (`$address`, `$person`, etc.)
- `doc.header.schema` - Root schema
- `doc.sections[0].data` - Loaded InternetObject or Collection

---

#### 5. `loadObject` - Low-level Single Object

Load single JS object (no Document wrapper).

**Overloads:**
```typescript
loadObject(data): InternetObject                    // Schema-less (no validation)
loadObject(data, defs): InternetObject              // Uses defs.defaultSchema
loadObject(data, options): InternetObject           // Schema-less with options
loadObject(data, defs, options): InternetObject
```

**Signature:**
```typescript
function loadObject(
  data: object,
  defs?: Definitions,
  options?: LoadOptions
): InternetObject

interface LoadOptions {
  schemaName?: string;        // Pick specific schema from defs (e.g., '$User')
  strict?: boolean;           // Throw on first error (default: false)
  errorCollector?: Error[];   // Collect validation errors
}
```

**How schema is resolved:**
1. If `options.schemaName` provided → uses `defs.get(schemaName)`
2. If `defs` provided (no schemaName) → uses `defs.defaultSchema` (`$schema`)
3. If no `defs` → schema-less mode (no validation)

**Usage:**
```typescript
// Schema-less (no validation, just wrap in InternetObject)
const obj = loadObject({ name: 'Alice', age: 28 })
const obj = loadObject(data, { strict: true })

// With definitions (validates against $schema)
const obj = loadObject(data, defs)
const obj = loadObject(data, defs, { strict: true })

// With specific schema from definitions
const obj = loadObject(data, defs, { schemaName: '$User' })
```

---

#### 6. `loadCollection` - Low-level Array

Load JS array (no Document wrapper).

**Overloads:**
```typescript
loadCollection(data): Collection                    // Schema-less (no validation)
loadCollection(data, defs): Collection              // Uses defs.defaultSchema
loadCollection(data, options): Collection           // Schema-less with options
loadCollection(data, defs, options): Collection
```

**Signature:**
```typescript
function loadCollection(
  data: any[],
  defs?: Definitions,
  options?: LoadOptions
): Collection<InternetObject>

interface LoadOptions {
  schemaName?: string;        // Pick specific schema from defs (e.g., '$User')
  strict?: boolean;           // Throw on first error (default: false)
  errorCollector?: Error[];   // Collect validation errors
}
```

**How schema is resolved:**
1. If `options.schemaName` provided → uses `defs.get(schemaName)`
2. If `defs` provided (no schemaName) → uses `defs.defaultSchema` (`$schema`)
3. If no `defs` → schema-less mode (no validation)

**Usage:**
```typescript
// Schema-less (no validation)
const col = loadCollection([{ name: 'Alice' }, { name: 'Bob' }])
const col = loadCollection(data, { strict: true })

// With definitions (validates each item against $schema)
const col = loadCollection(data, defs)
const col = loadCollection(data, defs, { errorCollector: errors })

// With specific schema from definitions
const col = loadCollection(users, defs, { schemaName: '$User' })
```

---

## Current API Analysis

### Current Exports (from `src/index.ts`)
```typescript
// Core Classes
export { IODocument, IOHeader, IODefinitions, IOCollection, IOObject, IOSection, ... }

// Error Classes
export { IOError, ErrorCodes, IOSyntaxError, IOValidationError }

// Schema
export { Schema }

// Main Functions
export { parse }                              // ✅ Keep
export { parseDefinitions }                   // ✅ Keep
export { load, loadDoc, LoadOptions }         // ⚠️ Simplify
export { stringify }                          // ✅ Keep (update signature)
export { loadObject, loadCollection }         // ⚠️ Update signature
export { loadDocument }                       // ❌ Remove
export { stringifyDocument, documentToObject } // ⚠️ Review
export { inferDefs, InferredDefs }            // ⚠️ Make internal

// Tag Functions
export { ioDefinitions, ioDocument, ioObject }

// Default facade
export default io
```

### Current Function Signatures vs Proposed

#### `parse` (parser/index.ts)
**Current:**
```typescript
parse(source: string, options?: ParserOptions): Document
parse(source: string, defs?: Definitions | null, options?: ParserOptions): Document
parse(source: string, defs?: Definitions | Schema | string | null, errorCollector?: Error[], options?: ParserOptions): Document
```
**Proposed:**
```typescript
parse(ioString): Document
parse(ioString, options): Document
parse(ioString, defs): Document
parse(ioString, defs, options): Document
```
**Impact:** Minor - remove `schema` param (use defs), consolidate options

---

#### `stringify` (facade/stringify.ts)
**Current:**
```typescript
stringify(value: any, schema?: string | Schema, defs?: Definitions, options?: StringifyOptions): string
stringify(value: any, defs?: Definitions | Schema | string, errorCollector?: Error[], options?: StringifyOptions): string
```
**Proposed:**
```typescript
stringify(doc): string
stringify(doc, options): string
stringify(value, defs): string
stringify(value, defs, options): string
```
**Impact:** Medium - remove `schema` param, simplify overloads

---

#### `load` (facade/load.ts)
**Current:**
```typescript
load(data: any, schema?: string | Schema | Definitions, options?: LoadOptions): InternetObject | Collection
load(data: any, schemaName: string, definitions: Definitions, errors?: Error[]): InternetObject | Collection
```
**Proposed:**
```typescript
load(data): Document
load(data, defs): Document
load(data, options): Document
load(data, defs, options): Document
```
**Impact:** HIGH -
1. Returns `Document` instead of `InternetObject | Collection`
2. Schema comes from `defs.defaultSchema`, not separate param
3. Schema-less mode supported

---

#### `loadDoc` (facade/load.ts)
**Current:**
```typescript
loadDoc(data: any, schema?: string | Schema | Definitions, options?: LoadDocOptions): Document
```
**Proposed:** **REMOVE** - merged into `load()`

**Impact:** HIGH - deprecate, users migrate to `load()`

---

#### `loadDocument` (facade/load-document.ts)
**Current:**
```typescript
loadDocument(data: DocumentData, options: LoadDocumentOptions): Document
```
**Proposed:** **REMOVE** - too complex, use `load()` instead

**Impact:** HIGH - remove entirely

---

#### `loadObject` (schema/load-processor.ts)
**Current:**
```typescript
loadObject(data: any, schema: Schema | string, defs?: Definitions): InternetObject
```
**Proposed:**
```typescript
loadObject(data): InternetObject
loadObject(data, defs): InternetObject
loadObject(data, options): InternetObject
loadObject(data, defs, options): InternetObject
```
**Impact:** HIGH -
1. Schema from `defs.defaultSchema`, not separate param
2. Schema-less mode supported

---

#### `loadCollection` (schema/load-processor.ts)
**Current:**
```typescript
loadCollection(data: any[], schema: Schema | string, defs?: Definitions, errorCollector?: Error[]): Collection
```
**Proposed:**
```typescript
loadCollection(data): Collection
loadCollection(data, defs): Collection
loadCollection(data, options): Collection
loadCollection(data, defs, options): Collection
```
**Impact:** HIGH -
1. Schema from `defs.defaultSchema`, not separate param
2. Schema-less mode supported
3. `errorCollector` moves to options

---

#### `inferDefs` (schema/utils/defs-inferrer.ts)
**Current:** Public export
**Proposed:** Internal only (used by `loadInferred`)

**Impact:** Medium - users migrate to `loadInferred()`

---

#### NEW: `loadInferred`
**Proposed:**
```typescript
loadInferred(data): Document
loadInferred(data, options): Document
```
**Impact:** NEW function to add

---

## Implementation Impact Summary

| Function | Change Level | Breaking? | Migration Path |
|----------|-------------|-----------|----------------|
| `parse` | Low | No | Minor signature cleanup |
| `stringify` | Medium | Partial | Remove schema param |
| `load` | HIGH | YES | Returns Document, schema in defs |
| `loadDoc` | HIGH | YES | Deprecated → use `load()` |
| `loadDocument` | HIGH | YES | Removed |
| `loadObject` | HIGH | YES | Schema in defs, schema-less mode |
| `loadCollection` | HIGH | YES | Schema in defs, schema-less mode |
| `inferDefs` | Medium | YES | Use `loadInferred()` instead |
| `loadInferred` | NEW | No | New function |

### Files to Modify

**Source Files (6):**

1. **`src/facade/load.ts`**
   - Rewrite `load()` to return Document
   - Remove `loadDoc()` or deprecate
   - Add schema-less support

2. **`src/facade/load-inferred.ts`** (NEW)
   - Create `loadInferred()` function

3. **`src/schema/load-processor.ts`**
   - Rewrite `loadObject()` signature
   - Rewrite `loadCollection()` signature
   - Add schema-less support

4. **`src/facade/stringify.ts`**
   - Simplify overloads
   - Remove schema param

5. **`src/parser/index.ts`**
   - Minor cleanup of overloads

6. **`src/index.ts`**
   - Update exports
   - Add `loadInferred`
   - Remove `loadDocument`
   - Remove `inferDefs` from public exports

**Test Files (7):**
- `tests/facade/document.test.ts`
- `tests/schema/load-processor.test.ts`
- `tests/schema/types/load-and-stringify-complex-types.test.ts`
- `tests/schema/utils/defs-inferrer-edge-cases.test.ts`
- `tests/schema/utils/defs-inferrer-memory.test.ts`
- `tests/schema/utils/defs-inferrer.test.ts`
- `tests/trial.test.ts`

---

## API Comparison

| Old API | New API | Notes |
|---------|---------|-------|
| `load(data, schema)` | `load(data, schema)` | Same, returns Document now |
| `load(data, undefined, { inferDefs: true })` | `loadInferred(data)` | Cleaner! |
| `loadDoc(data, schema)` | `load(data, schema)` | Merged |
| `loadDoc(data, undefined, { inferDefs: true })` | `loadInferred(data)` | Merged |
| `loadDocument(docData, options)` | **REMOVE** | Too complex, rarely needed |
| `loadObject(data, schema, defs)` | `loadObject(data, schema, defs)` | Keep (low-level) |
| `loadCollection(data, schema, defs)` | `loadCollection(data, schema, defs)` | Keep (low-level) |
| `inferDefs(data)` | Internal only | Used by `loadInferred` |

---

## Usage Examples

### Before (Confusing)
```typescript
// Option 1: load + inferDefs option
const obj = load(data, undefined, { inferDefs: true })

// Option 2: loadDoc + inferDefs option
const doc = loadDoc(data, undefined, { inferDefs: true })

// Option 3: Manual inferDefs + load
const { schema } = inferDefs(data)
const obj = load(data, schema)
```

### After (Clear)
```typescript
// With explicit schema (production)
const doc = load(data, '{ name: string, age: int }')
const io = stringify(doc)

// With inferred schema (development/convenience)
const doc = loadInferred(data)
const io = stringify(doc)

// Extract schema for hardcoding
const doc = loadInferred(data)
console.log(doc.header.schema)  // Copy this!

// Low-level (when you need InternetObject directly)
const obj = loadObject(data, schema, defs)
const col = loadCollection(dataArray, schema, defs)
```

---

## Implementation Plan

### Phase 1: Add New Functions
1. [ ] Create `loadInferred()` function in `src/facade/load-inferred.ts`
   - Calls `inferDefs()` internally
   - Returns `Document` with inferred schema in header
   - Single pass (no double scanning)

2. [ ] Update `load()` to always return `Document`
   - Currently returns `InternetObject | Collection`
   - Should return `Document` for consistency

### Phase 2: Update Exports
3. [ ] Update `src/index.ts` exports:
   ```typescript
   // Primary API
   export { parse } from './parser';
   export { stringify } from './facade/stringify';
   export { load } from './facade/load';
   export { loadInferred } from './facade/load-inferred';

   // Low-level API
   export { loadObject, loadCollection } from './schema/load-processor';

   // Types
   export { LoadOptions, LoadInferredOptions, StringifyOptions } from './facade/types';
   ```

4. [ ] Deprecate old functions:
   - `loadDoc` → use `load`
   - `loadDocument` → use `load` or remove

### Phase 3: Update Tests
5. [ ] Add tests for `loadInferred()`
6. [ ] Update existing tests to use new API
7. [ ] Add deprecation warnings to old functions

### Phase 4: Update Documentation
8. [ ] Update `LOAD-STRINGIFY-IMPLEMENTATION.md`
9. [ ] Update `defs-inferrance.md` → rename to `load-inferred.md`
10. [ ] Update README examples

---

## Breaking Changes

| Change | Migration |
|--------|-----------|
| `load()` returns `Document` instead of `InternetObject \| Collection` | Access data via `doc.data` or `doc.sections[0].data` |
| `loadDoc()` deprecated | Use `load()` |
| `loadDocument()` removed | Use `load()` with explicit schema |
| `inferDefs()` not exported | Use `loadInferred()` |

---

## Questions to Resolve

1. **Should `load()` auto-detect array vs object?**
   - Current: Yes, returns `InternetObject | Collection`
   - Proposed: Yes, but wrapped in `Document`

2. **Should `loadInferred()` return schema separately?**
   - Option A: `loadInferred(data) → Document` (schema in `doc.header.schema`)
   - Option B: `loadInferred(data) → { document, schema }` (explicit)
   - Recommendation: Option A (simpler, schema accessible via document)

3. **Keep `inferDefs()` public or internal?**
   - If internal: Simpler API, users use `loadInferred()`
   - If public: Power users can extract schema without loading
   - Recommendation: Keep internal, `loadInferred()` is enough

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| `loadInferred` not `loadWithInference` | Shorter, clearer |
| Return `Document` from `load()` | Consistency with `parse()` |
| Keep `loadObject`/`loadCollection` public | Users may need low-level access |
| Remove `loadDocument` | Too complex, `load()` covers use cases |
