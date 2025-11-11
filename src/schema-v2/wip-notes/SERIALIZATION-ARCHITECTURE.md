# Internet Object Serialization Architecture

> **Status:** Design Phase
> **Created:** November 10, 2025
> **Foundation Status:** ✅ All tests passing (1,461/1,462), ready for serialization
>
> **Related Documents:**
> - [SERIALIZATION-USAGE-GUIDE.md](./SERIALIZATION-USAGE-GUIDE.md) - High-level usage patterns and real-world examples
> - [SCHEMA-REVAMP-PROPOSAL.md](./SCHEMA-REVAMP-PROPOSAL.md) - Schema system architecture and TypeSchema design
>
> **Document Purpose:**
> This document describes the **low-level implementation architecture** for serialization, including class hierarchies, serialization flow, type formatters, and implementation phases. For **usage patterns** and **API examples**, see SERIALIZATION-USAGE-GUIDE.md.

## 🎯 Design Philosophy

### Core Principles

1. **Mirror Parsing Ergonomics** - If parsing is beautiful, serialization should be equally elegant
2. **Type-Safe by Default** - Leverage TypeScript to catch errors at compile time
3. **Schema-Driven** - Use schemas to guide serialization, not just validation
4. **Error-Friendly** - Clear error messages when data can't be serialized
5. **Performance-Conscious** - Fast serialization for real-world use cases
6. **Composable** - Support partial serialization, streaming, custom formatters

---

## 📐 API Design Options

### Option 1: Mirror Template Literal Pattern (Recommended)

**Rationale:** Matches the parsing API users already love

```typescript
// Current parsing API (deserialization)
const doc = io.doc`
  name, age
  ---
  Alice, 30
`;

// Load from plain objects (NEW - symmetrical with io.doc)
const doc = IODocument.load(data);  // From plain object/array
const doc = IODocument.load(data, schema);  // With schema validation
const doc = io.doc.load(data);      // Alternative facade API

// Load with definitions (variables, schemas, metadata)
const doc = IODocument.loadWithDefs(data, new IODefinitions()
  .addVar('@varName', value)
  .addSchema('$schemaName', schema)
  .addMeta('metaKey', metaValue)
);

// Serialization API (symmetrical)
const ioString = io.stringify(doc);
// Output:
// name, age
// ---
// Alice, 30

// With schema (validates during serialization)
const ioString = io.stringify(doc, schema);

// Alternative: Method on document
const ioString = doc.toString();
const ioString = doc.toIO(); // More explicit
const ioString = doc.toIO({ validate: true, pretty: true }); // With options
```

**Pros:**
- ✅ Symmetrical with parsing API
- ✅ Intuitive for users
- ✅ Chainable and composable
- ✅ Supports both standalone and method-based usage

**Cons:**
- ⚠️ Need to handle schema serialization separately

---

### Option 2: Facade Pattern (Consistent with Current Design)

```typescript
// Parsing (deserialization)
const doc = io.doc`...`;
const obj = io.object`...`;
const defs = io.defs`...`;

// Load from plain objects (NEW)
const doc = io.doc.load(data);      // From plain object/array
const obj = io.object.load(data);   // From plain object
const defs = io.defs.load(schema);  // From schema object

// Load with definitions
const doc = io.doc.loadWithDefs(data, new IODefinitions()
  .addSchema('$user', userSchema)
  .addMeta('created', new Date())
);

// Serialization (mirror structure)
const ioString = io.doc.stringify(data);
const objString = io.object.stringify(data);
const defsString = io.defs.stringify(schema);

// With options
const ioString = io.doc.stringify(data, {
  pretty: true,
  indent: 2,
  includeDefinitions: true
});
```

**Pros:**
- ✅ Perfectly consistent with existing facade
- ✅ Tree-shakable (import only what you need)
- ✅ Namespace prevents pollution
- ✅ Self-documenting (io.doc.stringify = serialize document)

**Cons:**
- ⚠️ Slightly more verbose than Option 1

---

### Option 3: Builder Pattern (For Advanced Use)

```typescript
// Advanced serialization with builder
const ioString = io.serializer()
  .withSchema(defs)
  .pretty()
  .indent(2)
  .compact(false)
  .includeTypes(true)
  .serialize(data);

// Simple case still simple
const ioString = io.serializer().serialize(data);

// Reusable serializers
const serializer = io.serializer().withSchema(defs).pretty();
const str1 = serializer.serialize(data1);
const str2 = serializer.serialize(data2);
```

**Pros:**
- ✅ Extremely flexible
- ✅ Reusable configurations
- ✅ Discoverable options (IDE autocomplete)
- ✅ Can add advanced features without breaking simple API

**Cons:**
- ⚠️ More complex for simple cases
- ⚠️ Larger API surface

---

## 🏗️ Recommended Hybrid Approach

**Combine Option 1 + Option 2 for best of both worlds:**

```typescript
// Simple cases - Clean and intuitive
io.stringify(doc);
doc.toString();

// Load with definitions
const doc = IODocument.loadWithDefs(data, new IODefinitions()
  .addSchema('$type', schema)
  .addVar('@var', value)
  .addMeta('key', value)
);

// Namespace for tree-shaking
io.doc.stringify(data);
io.object.stringify(obj);
io.defs.stringify(schema);

// Advanced cases - Builder for complex scenarios
io.serializer()
  .withSchema(defs)
  .pretty()
  .serialize(data);

// Instance methods for convenience
doc.toIO();
doc.toIO({ pretty: true, includeDefinitions: true });
collection.toIO();
```

---

## 🎨 Serialization Features

### Core Features (MVP)

1. **Document Serialization**
   ```typescript
   const doc = io.doc`
     name, age
     ---
     Alice, 30
   `;
   io.stringify(doc); // → "name, age\n---\nAlice, 30"
   ```

2. **Collection Serialization**
   ```typescript
   const collection = doc.getSection('users').getChild();
   io.stringify(collection); // → "~ Alice, 30\n~ Bob, 25"
   ```

3. **Object Serialization**
   ```typescript
   const obj = { name: 'Alice', age: 30 };
   io.object.stringify(obj); // → "Alice, 30" or "{name: Alice, age: 30}"
   ```

4. **Schema Serialization**
   ```typescript
   const defs = io.defs`$user: {name: string, age: number}`;
   io.defs.stringify(defs); // → "$user: {name: string, age: number}"
   ```

5. **Schema-Driven Serialization**
   ```typescript
   const data = { name: 'Alice', age: 30 };
   io.stringify(data, schema); // Validates & serializes according to schema
   ```

### Advanced Features (Post-MVP)

1. **Pretty Printing**
   ```typescript
   io.stringify(doc, { pretty: true, indent: 2 });
   ```

2. **Partial Serialization**
   ```typescript
   io.stringify(doc, {
     sections: ['users', 'products'], // Only these sections
     fields: ['name', 'email']        // Only these fields
   });
   ```

3. **Custom Formatters**
   ```typescript
   io.stringify(doc, {
     formatters: {
       date: (d) => d.toISOString(),
       decimal: (d) => d.toFixed(2)
     }
   });
   ```

4. **Streaming Serialization**
   ```typescript
   const stream = io.serializer().stream(largeData);
   for await (const chunk of stream) {
     console.log(chunk);
   }
   ```

5. **Round-Trip Guarantees**
   ```typescript
   const original = io.doc`...`;
   const serialized = io.stringify(original);
   const parsed = io.doc(serialized);
   expect(parsed).toEqual(original); // Deep equality
   ```

---

## 📦 Data Structure Support

### Serialization Methods on Core Types

```typescript
// IODocument
class IODocument {
  toString(options?: SerializationOptions): string
  toIO(options?: SerializationOptions): string
  toJSON(): any // Already exists
}

// IOCollection
class IOCollection {
  toString(options?: SerializationOptions): string
  toIO(options?: SerializationOptions): string
  toJSON(): any[] // Already exists
}

// IOObject
class IOObject<T> {
  toString(options?: SerializationOptions): string
  toIO(options?: SerializationOptions): string
  toJSON(): Record<string, any> // Already exists
}

// IOSection
class IOSection {
  toString(options?: SerializationOptions): string
  toIO(options?: SerializationOptions): string
}
```

---

## 🔧 Type System

### Core Types

```typescript
// Serialization options
interface SerializationOptions {
  // Output formatting
  pretty?: boolean;        // Pretty print with indentation
  indent?: number;         // Spaces per indent level (default: 2)
  lineWidth?: number;      // Max line width for wrapping
  compact?: boolean;       // Minimize whitespace

  // Schema & definitions handling
  schema?: Schema;         // Validate against schema during serialization
  validate?: boolean;      // Validate before serializing
  strict?: boolean;        // Fail on schema violations
  includeDefinitions?: boolean; // Include definitions (schemas, vars, metadata) in output

  // Field control
  includeTypes?: boolean;  // Include type annotations
  excludeFields?: string[];
  includeFields?: string[];
  includeComments?: boolean; // Preserve comments from parsed doc

  // Custom behavior
  formatters?: FormatterMap;
  encoding?: 'utf8' | 'ascii';
  preserveWhitespace?: boolean; // Keep original whitespace

  // Error handling
  onError?: (error: SerializationError) => void;
  skipErrors?: boolean;    // Continue on errors
}

// Custom formatters
type FormatterMap = {
  [typeName: string]: (value: any) => string;
};

// Serialization result
interface SerializationResult {
  output: string;
  errors?: SerializationError[];
  metadata?: {
    sections: number;
    objects: number;
    size: number;
  };
}

// IODefinitions - Builder for document definitions
class IODefinitions {
  private variables: Map<string, any> = new Map();
  private schemas: Map<string, Schema> = new Map();
  private metadata: Map<string, any> = new Map();

  // Add variable (@varName)
  addVar(name: string, value: any): this {
    this.variables.set(name, value);
    return this;
  }

  // Add schema definition ($schemaName)
  addSchema(name: string, schema: Schema): this {
    this.schemas.set(name, schema);
    return this;
  }

  // Add metadata (~metaKey)
  addMeta(key: string, value: any): this {
    this.metadata.set(key, value);
    return this;
  }

  // Query methods
  hasSchemas(): boolean {
    return this.schemas.size > 0;
  }

  getDefaultSchema(): Schema | undefined {
    // Return first schema or schema named '$default'
    return this.schemas.get('$default') || this.schemas.values().next().value;
  }

  getSchema(name: string): Schema | undefined {
    return this.schemas.get(name);
  }

  getVariable(name: string): any {
    return this.variables.get(name);
  }

  getMeta(key: string): any {
    return this.metadata.get(key);
  }
}

// Error handling
class SerializationError extends Error {
  code: string;
  path: string[];          // Path to problematic value
  value: any;
  message: string;
  suggestion?: string;
}
```

---

## 🏛️ Architecture

### Schema Flexibility (Key Design Insight)

Internet Object supports **multiple schema placement strategies**:

#### 1. **Top-Level Definitions** (Traditional)
```io
$user: {name: string, age: number}

---
~ Alice, 30
~ Bob, 25
```

#### 2. **Schema as Section** (Collection of Definitions)
```io
--- schema definitions
~ $user: {name: string, age: number}
~ $book: {title: string, isbn: number}

--- users: $user
~ Alice, 30
```

#### 3. **Section-Specific Schema Reference**
```io
--- subscribers: $users
~ user123, John Doe, Standard

--- books: $books
~ The Great Gatsby, 1234567890
```

#### 4. **Schema-Less Documents**
```io
--- data
~ Alice, 30
~ Bob, 25
```

**Architectural Implications:**
- `IODocument.definitions` is **optional** (can be null)
- Sections can contain **either data or schema definitions**
- Section headers can **reference schema types** (`--- name: $type`)
- Serialization must handle **all four patterns**

---

### Module Structure

```
src/
  serializer/
    index.ts                 // Main entry point
    document-serializer.ts   // Document → IO string
    collection-serializer.ts // Collection → IO string
    object-serializer.ts     // Object → IO string
    schema-serializer.ts     // Schema → IO string
    formatters/
      string-formatter.ts
      number-formatter.ts
      date-formatter.ts
      decimal-formatter.ts
      custom-formatter.ts
    options.ts              // SerializationOptions type
    errors.ts               // SerializationError
    builder.ts              // Builder pattern API
    utils/
      indent.ts
      escape.ts
      validate.ts
```

### Class Hierarchy

**Top-Down Serialization Flow:**
```
IODocument
  ├─> Section(s)
  │     └─> Collection or Object
  │           └─> IOObject(s)
  │                 └─> Member(s)
  │                       └─> Value(s)
  │                             └─> Type Formatters
  └─> Schema Definitions (if present)
```

```typescript
// Core interface that all serializable types implement
interface Serializable {
  toIO(options?: SerializationOptions): string;
}

// Existing classes implement Serializable
class IODocument implements Serializable {
  // Load from plain objects (symmetrical with io.doc`...`)
  static load(data: any, schema?: Schema): IODocument {
    // Simple load - data only or with schema
    if (schema) {
      validateData(data, schema);
    }
    return new IODocument(/* converted data */);
  }

  // Load with definitions (variables, schemas, metadata)
  static loadWithDefs(data: any, definitions: IODefinitions): IODocument {
    // 1. Create document with definitions
    const doc = new IODocument(definitions);

    // 2. Validate against schemas in definitions (if any)
    if (definitions.hasSchemas()) {
      validateData(data, definitions.getDefaultSchema());
    }

    // 3. Load data
    doc.load(data);

    return doc;
  }

  // Constructor can accept definitions
  constructor(definitions?: IODefinitions) {
    this.definitions = definitions || new IODefinitions();
  }

  toIO(options?: SerializationOptions): string {
    const parts: string[] = [];

    // Note: Schema definitions can be:
    // 1. At document level (this.definitions) - serialized at top
    // 2. In a section (collection of ~ $type: {...}) - serialized as section
    // 3. Not present at all - schema-less document

    // 1. Validate against schema if provided in options
    if (options?.schema) {
      validateData(this, options.schema);
    }

    // 2. Serialize top-level schema definitions (if present)
    // This is optional - documents can be schema-less
    if (this.definitions) {
      parts.push(serializeDefinitions(this.definitions, options));
      if (this.sections.length > 0) {
        parts.push('---'); // Separator before sections
      }
    }

    // 3. Serialize each section with separator (---)
    // Sections may contain schema definitions as collections
    this.sections.forEach((section, index) => {
      if (index > 0) parts.push('---');
      parts.push(section.toIO(options)); // Delegate to section
    });

    return parts.join('\n');
  }
}

class IOSection implements Serializable {
  toIO(options?: SerializationOptions): string {
    const parts: string[] = [];

    // Sections can have:
    // 1. Named sections: --- sectionName or --- sectionName: $schemaType
    // 2. Schema sections: collection of ~ $type: {...} definitions
    // 3. Data sections: collection or object with data

    // 1. Serialize section header (if named)
    if (this.name) {
      // Check if section references a schema type
      if (this.schemaType) {
        parts.push(`--- ${this.name}: ${this.schemaType}`);
      } else {
        parts.push(`--- ${this.name}`);
      }
    }

    // 2. Delegate to child (Collection or Object)
    // Child could be:
    // - Schema definitions (collection of type definitions)
    // - Data collection (collection of objects)
    // - Single object
    if (this.child) {
      parts.push(this.child.toIO(options));
    }

    return parts.join('\n');
  }
}

class IOCollection implements Serializable {
  // Load from plain array (symmetrical with parsing)
  static load(data: any[], schema?: Definitions): IOCollection {
    // 1. Validate against schema if provided
    if (schema) {
      data.forEach(item => validateData(item, schema));
    }

    // 2. Convert plain array to IOCollection
    return new IOCollection(/* converted data */);
  }

  toIO(options?: SerializationOptions): string {
    // 1. Validate against schema if provided
    if (options?.schema) {
      this.items.forEach(item => validateData(item, options.schema!));
    }

    // 2. Serialize header (if present)
    const parts: string[] = [];

    if (this.header) {
      parts.push(serializeHeader(this.header, options));
    }

    // 3. Serialize each item with ~ prefix
    const items = this.items.map(item => {
      const serialized = item.toIO(options);
      return `~ ${serialized}`;
    });

    parts.push(...items);
    return parts.join('\n');
  }
}

class IOObject<T = any> implements Serializable {
  // Load from plain object (symmetrical with io.object`...`)
  static load(data: Record<string, any>, schema?: Definitions): IOObject {
    // 1. Validate against schema if provided
    if (schema) {
      validateData(data, schema);
    }

    // 2. Convert plain object to IOObject
    return new IOObject(/* converted data */);
  }

  toIO(options?: SerializationOptions): string {
    // 1. Validate against schema if provided
    if (options?.schema) {
      validateData(this, options.schema);
    }

    // 2. Determine if open or closed object
    const isOpen = this._isOpen;
    const members = this._members;

    if (isOpen) {
      // Open object: value, value, value
      return members
        .map(member => serializeValue(member.value, options))
        .join(', ');
    } else {
      // Closed object: {key: value, key: value}
      const memberStrings = members.map(member => {
        const value = serializeValue(member.value, options);
        return `${member.key}: ${value}`;
      });
      return `{${memberStrings.join(', ')}}`;
    }
  }
}

// Validation helper
function validateData(data: any, schema: Definitions): void {
  // Validate data against schema before serialization
  // Throw SerializationError with path context if validation fails
  // This ensures data integrity during serialization

  const errors = schema.validate(data);
  if (errors.length > 0) {
    throw new SerializationError(
      'Schema validation failed during serialization',
      { errors, data, schema }
    );
  }
}

// Helper functions (not classes)
function serializeValue(value: any, options?: SerializationOptions): string {
  // 1. Handle special cases
  if (value === null) return 'null';
  if (value === undefined) return '';

  // 2. Validate if schema provided
  if (options?.schema && options?.validate !== false) {
    validateData(value, options.schema);
  }

  // 3. Check if value implements Serializable
  if (isSerializable(value)) {
    return value.toIO(options);
  }

  // 4. Delegate to type formatters
  const type = getType(value);
  const formatter = getFormatter(type, options);

  if (formatter) {
    return formatter.format(value, options);
  }

  // 4. Handle arrays
  if (Array.isArray(value)) {
    return serializeArray(value, options);
  }

  // 5. Handle plain objects
  if (typeof value === 'object') {
    return serializeObject(value, options);
  }

  // Fallback
  return String(value);
}

function serializeArray(arr: any[], options?: SerializationOptions): string {
  const items = arr.map(item => serializeValue(item, options));
  return `[${items.join(', ')}]`;
}

function serializeObject(obj: Record<string, any>, options?: SerializationOptions): string {
  // Convert plain object to IOObject format
  const entries = Object.entries(obj);
  const memberStrings = entries.map(([key, value]) => {
    const serialized = serializeValue(value, options);
    return `${key}: ${serialized}`;
  });
  return `{${memberStrings.join(', ')}}`;
}

function serializeHeader(header: string[], options?: SerializationOptions): string {
  return header.join(', ');
}

function serializeDefinitions(defs: Definitions, options?: SerializationOptions): string {
  // Serialize schema definitions
  // Format: $name: {field: type, ...}
  return defs.toIO(options);
}

function isSerializable(value: any): value is Serializable {
  return value && typeof value.toIO === 'function';
}

function getType(value: any): string {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  if (value instanceof Decimal) return 'decimal';
  return 'unknown';
}

// Type Formatters (leaf level)
interface TypeFormatter {
  format(value: any, options?: SerializationOptions): string;
}

class StringFormatter implements TypeFormatter {
  format(value: string, options?: SerializationOptions): string {
    // Check context: open vs closed object
    const needsQuotes = options?.context === 'closed' || this.hasSpecialChars(value);
    return needsQuotes ? `"${this.escape(value)}"` : value;
  }

  private escape(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  private hasSpecialChars(value: string): boolean {
    return /[,:\[\]\{\}\n\r\t]/.test(value);
  }
}

class NumberFormatter implements TypeFormatter {
  format(value: number): string {
    return String(value);
  }
}

class BooleanFormatter implements TypeFormatter {
  format(value: boolean): string {
    return String(value);
  }
}

class DateFormatter implements TypeFormatter {
  format(value: Date): string {
    return value.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}

class DecimalFormatter implements TypeFormatter {
  format(value: Decimal): string {
    return `${value.toString()}m`; // Include 'm' suffix
  }
}

// Formatter registry
const formatters = new Map<string, TypeFormatter>([
  ['string', new StringFormatter()],
  ['number', new NumberFormatter()],
  ['boolean', new BooleanFormatter()],
  ['date', new DateFormatter()],
  ['decimal', new DecimalFormatter()]
]);

function getFormatter(type: string, options?: SerializationOptions): TypeFormatter | undefined {
  // Check for custom formatters first
  if (options?.formatters?.[type]) {
    return {
      format: (value: any) => options.formatters![type](value)
    };
  }
  return formatters.get(type);
}
```

---

## 🎯 Implementation Strategy

### Serialization Flow (Top-Down Approach)

**Philosophy:** Start from the document level and drill down through the hierarchy.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IODocument (Entry Point)                                 │
│    - Schema definitions (if present)                         │
│    - Section separators (---)                                │
│    ↓                                                          │
├─────────────────────────────────────────────────────────────┤
│ 2. IOSection                                                 │
│    - Section name/header (if present)                        │
│    - Determine child type (Collection or Object)             │
│    ↓                                                          │
├─────────────────────────────────────────────────────────────┤
│ 3. IOCollection or IOObject                                  │
│    Collection: ~ prefix for each item                        │
│    Object: open (val, val) or closed {key: val}             │
│    ↓                                                          │
├─────────────────────────────────────────────────────────────┤
│ 4. Members                                                   │
│    - Key:value pairs (closed objects)                        │
│    - Values only (open objects, collections)                 │
│    ↓                                                          │
├─────────────────────────────────────────────────────────────┤
│ 5. Values                                                    │
│    - Type detection (string, number, date, etc.)            │
│    - Handle special cases (null, arrays, nested objects)     │
│    ↓                                                          │
├─────────────────────────────────────────────────────────────┤
│ 6. Type Formatters (Leaf Level)                             │
│    - StringFormatter: escape & quote                         │
│    - NumberFormatter: numeric representation                 │
│    - DateFormatter: ISO date format                          │
│    - DecimalFormatter: with 'm' suffix                       │
│    - Custom formatters (user-defined)                        │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**

1. **Delegation Pattern** - Each level delegates to the next level down
2. **Single Responsibility** - Each serializer handles one type of node
3. **Composability** - Serializers can be combined and reused
4. **Error Propagation** - Errors bubble up with context path
5. **Schema-Aware** - Schema guides serialization at every level

**Example Flow:**

```typescript
// Input: IODocument with users collection
const doc = io.doc`
  name, age
  ---
  ~ Alice, 30
  ~ Bob, 25
`;

// Serialization flow:
DocumentSerializer.serialize(doc)
  → SectionSerializer.serialize(section)
    → CollectionSerializer.serialize(collection)
      → ObjectSerializer.serialize(item1) // Alice
        → MemberSerializer.serializeValue("Alice")
          → ValueSerializer.serialize("Alice")
            → StringFormatter.format("Alice")
              → "Alice"
        → MemberSerializer.serializeValue(30)
          → ValueSerializer.serialize(30)
            → NumberFormatter.format(30)
              → "30"
      → ObjectSerializer.serialize(item2) // Bob
        → ... (same pattern)
```

---

### Phase 1: Core Serialization (Week 1)

**Goal:** Basic serialization working for all core types

**Implementation Order:** Bottom-up (build leaf nodes first, then compose upward)

#### Day 1-2: Foundation & Core Classes
- [ ] Create serializer module structure
- [ ] **IODefinitions class** - Builder for document definitions
  - [ ] addVar(name, value) - Add variables
  - [ ] addSchema(name, schema) - Add schema definitions
  - [ ] addMeta(key, value) - Add metadata
  - [ ] Query methods (getSchema, getVariable, getMeta)
- [ ] Implement BaseSerializer abstract class
- [ ] Add SerializationOptions type (with includeDefinitions)
- [ ] Add SerializationError class
- [ ] Set up basic tests

#### Day 3-4: Bottom-Up Implementation (Type Formatters First)
- [ ] **Type Formatters** (leaf level)
  - [ ] StringFormatter - escape and quote strings
  - [ ] NumberFormatter - serialize numbers
  - [ ] BooleanFormatter - serialize booleans
  - [ ] NullFormatter - serialize null values
- [ ] **ValueSerializer** - orchestrates type formatters
  - [ ] Type detection
  - [ ] Array serialization
  - [ ] Nested object handling
- [ ] **MemberSerializer** - key:value pairs
  - [ ] Serialize keys (if present)
  - [ ] Delegate to ValueSerializer

#### Day 4-5: Middle Layer (Object & Collection)
- [ ] **ObjectSerializer** - open/closed objects
  - [ ] Detect open vs closed format
  - [ ] Serialize members
  - [ ] Delegate to MemberSerializer
- [ ] **CollectionSerializer** - collection items with ~
  - [ ] Serialize items with ~ prefix
  - [ ] Delegate to ObjectSerializer

#### Day 5: Top Layer (Section & Document)
- [ ] **SectionSerializer** - sections with headers
  - [ ] Named sections with --- separator
  - [ ] Detect Collection vs Object child
  - [ ] Delegate to appropriate serializer
- [ ] **DocumentSerializer** (entry point)
  - [ ] Schema definitions serialization
  - [ ] Section separators (---)
  - [ ] Orchestrate entire document

#### Day 5: Integration & Load API
- [ ] **IODocument.load() family**
  - [ ] IODocument.load(data) - Simple load
  - [ ] IODocument.load(data, schema) - With schema validation
  - [ ] IODocument.loadWithDefs(data, definitions) - With IODefinitions
- [ ] Add methods to IODocument, IOCollection, IOObject
  - [ ] doc.toIO() - Serialize document
  - [ ] collection.toIO() - Serialize collection
  - [ ] object.toIO() - Serialize object
- [ ] Add io.stringify() facade
- [ ] Add io.doc.stringify(), io.object.stringify()
- [ ] Write integration tests

**Success Criteria:**
```typescript
// Must work - Simple load
const doc = IODocument.load({ name: 'Alice', age: 30 });
const output = doc.toIO();
expect(output).toContain("Alice, 30");

// With definitions
const doc2 = IODocument.loadWithDefs({ name: 'Bob', age: 25 },
  new IODefinitions()
    .addSchema('$person', personSchema)
    .addMeta('created', new Date())
);
const output2 = doc2.toIO({ includeDefinitions: true });
expect(output2).toContain("$person");
expect(output2).toContain("created");

// Round-trip
const parsed = io.doc(output);
expect(parsed.toJSON()).toEqual(doc.toJSON());
```

---

### Phase 2: Schema-Driven Serialization (Week 2)

**Goal:** Use schemas to guide serialization

#### Day 1-2: Schema Integration
- [ ] SchemaSerializer implementation
- [ ] Schema-driven field ordering
- [ ] Type annotation support
- [ ] Schema validation before serialization

#### Day 3-4: Advanced Types
- [ ] Date/DateTime formatting
- [ ] Decimal formatting with precision/scale
- [ ] BigInt serialization
- [ ] Array and nested object handling

#### Day 5: Error Handling
- [ ] SerializationError with context
- [ ] Error accumulation (like parsing)
- [ ] Validation errors vs serialization errors
- [ ] Error recovery strategies

**Success Criteria:**
```typescript
const schema = io.defs`$user: {name: string, age: number, joined: date}`;
const data = { name: 'Alice', age: 30, joined: new Date() };
const output = io.stringify(data, schema);

// Should serialize with correct types
// Should validate against schema
// Should provide clear errors for invalid data
```

---

### Phase 3: Advanced Features (Week 3)

**Goal:** Polish and advanced use cases

#### Day 1-2: Pretty Printing
- [ ] Indentation support
- [ ] Line wrapping
- [ ] Comment preservation
- [ ] Whitespace control

#### Day 3: Custom Formatters
- [ ] Custom formatter API
- [ ] Formatter registration
- [ ] Built-in formatter library
- [ ] Examples for common cases

#### Day 4-5: Performance & Polish
- [ ] Performance benchmarks
- [ ] Memory optimization
- [ ] Bundle size check
- [ ] Documentation

**Success Criteria:**
```typescript
// Pretty printing
const pretty = io.stringify(doc, { pretty: true, indent: 2 });

// Custom formatters
const output = io.stringify(doc, {
  formatters: {
    price: (n) => `$${n.toFixed(2)}`,
    status: (s) => s.toUpperCase()
  }
});

// Performance
// Serialize 10,000 objects in < 100ms
```

---

### Phase 4: Streaming & Advanced (Week 4)

**Goal:** Support large datasets and advanced scenarios

- [ ] Streaming serialization
- [ ] Incremental serialization
- [ ] Partial serialization
- [ ] Compression support
- [ ] Browser vs Node optimizations

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('Serializer', () => {
  describe('Basic Types', () => {
    it('serializes strings with quotes', () => {
      expect(serialize('hello')).toBe('"hello"');
    });

    it('escapes special characters', () => {
      expect(serialize('hello\nworld')).toBe('"hello\\nworld"');
    });

    it('serializes numbers', () => {
      expect(serialize(42)).toBe('42');
      expect(serialize(3.14)).toBe('3.14');
    });
  });

  describe('Collections', () => {
    it('serializes collection with ~ prefix', () => {
      const collection = new IOCollection([
        new IOObject({ name: 'Alice' }),
        new IOObject({ name: 'Bob' })
      ]);
      expect(io.stringify(collection)).toBe('~ Alice\n~ Bob');
    });
  });

  describe('Schema-Driven', () => {
    it('validates data against schema', () => {
      const schema = io.defs`$user: {name: string, age: number}`;
      const invalid = { name: 'Alice', age: 'thirty' }; // Wrong type

      expect(() => io.stringify(invalid, schema))
        .toThrow(SerializationError);
    });
  });
});
```

### Integration Tests

```typescript
describe('Round-Trip', () => {
  it('parses and serializes to original', () => {
    const input = `
      name, age, email
      ---
      ~ Alice, 30, alice@example.com
      ~ Bob, 25, bob@example.com
    `;

    const doc = io.doc(input);
    const output = io.stringify(doc);
    const reparsed = io.doc(output);

    expect(reparsed.toJSON()).toEqual(doc.toJSON());
  });
});
```

### Performance Tests

```typescript
describe('Performance', () => {
  it('serializes 10,000 objects quickly', () => {
    const data = Array(10000).fill(null).map((_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`
    }));

    const start = performance.now();
    io.stringify(data);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // < 100ms
  });
});
```

---

## 📝 API Summary

### Loading from Plain Objects (NEW)

```typescript
// IODocument.load() - Load from plain objects/arrays
const doc = IODocument.load(data);           // Basic load
const doc = IODocument.load(data, schema);   // With validation

// IODocument.loadWithDefs() - Load with definitions
const doc = IODocument.loadWithDefs(data, new IODefinitions()
  .addVar('@varName', value)
  .addSchema('$schemaName', schema)
  .addMeta('metaKey', metaValue)
);

// Facade API
const doc = io.doc.load(data, schema);       // Facade API

// IOCollection.load() - Load from arrays
const collection = IOCollection.load(arrayData);
const collection = IOCollection.load(arrayData, schema);

// IOObject.load() - Load from objects
const obj = IOObject.load(objectData);
const obj = IOObject.load(objectData, schema);
```

### Serialization API

```typescript
// toIO() instance methods (all classes)
doc.toIO();                     // Basic serialization
doc.toIO({ validate: true });   // With validation
doc.toIO({ pretty: true });     // Pretty print
doc.toIO({ includeDefinitions: true }); // Include schemas, vars, metadata

// Facade API
io.stringify(doc);              // Simple
io.stringify(doc, schema);      // With schema
io.stringify(doc, { options }); // With options
```

### Complete Workflow

```typescript
// From plain objects → IO format
const data = [{ name: 'Alice', age: 30 }];
const schema = io.defs`$user: {name: string, age: number}`;

// Load (validates)
const doc = IODocument.load(data, schema);

// Serialize (already validated)
const ioString = doc.toIO();

// Parse back
const parsed = io.doc(ioString);

// Round-trip guarantee
expect(parsed.toJSON()).toEqual(doc.toJSON());
```

---

## 🎨 API Examples

### Example 0: Flexible Schema Structure

**Understanding schema placement options:**

```typescript
// Option 1: Schema at document level (top-level definitions)
const doc1 = io.doc`
  $user: {name: string, age: number}

  --- users
  ~ Alice, 30
  ~ Bob, 25
`;

// Option 2: Schema in a section (collection of definitions)
const doc2 = io.doc`
  --- schema definitions
  ~ $borrower: {userId:string, dueDate:date}
  ~ $user: {userId:string, name:string}

  --- users: $user
  ~ user123, John Doe
  ~ user456, Jane Smith
`;

// Option 3: Mixed - multiple schema sections + data sections
const doc3 = io.doc`
  --- type definitions
  ~ $library: {name: string, address: string}
  ~ $book: {title:string, author:string, isbn:number}

  --- $library
  Bookville Library, "123 Library St"

  --- books: $book
  ~ The Great Gatsby, F. Scott Fitzgerald, 1234567890
  ~ 1984, George Orwell, 2345678901
`;

// Option 4: Schema-less document (no schema at all)
const doc4 = io.doc`
  --- users
  ~ Alice, 30
  ~ Bob, 25

  --- settings
  theme: dark
  language: en
`;

// All options work with serialization
const ioString1 = doc1.toIO();
const ioString2 = doc2.toIO();
const ioString3 = doc3.toIO();
const ioString4 = doc4.toIO(); // No schema, just data
```

### Example 0b: Top-Down Serialization Flow

**Understanding the hierarchy:**

```typescript
// Complex document with multiple sections and types
const doc = io.doc`
  $user: {name: string, age: number, email: string}

  --- users
  name, age, email
  ~ Alice, 30, alice@example.com
  ~ Bob, 25, bob@example.com

  --- settings
  theme: dark
  language: en
`;

// Serialization executes top-down:

// 1. DocumentSerializer starts
//    ├─ Serializes schema definitions: $user: {...}
//    ├─ Adds section separator: ---
//    ├─ Delegates to SectionSerializer for "users" section
//    │
// 2. SectionSerializer (users section)
//    ├─ Writes section header: --- users
//    ├─ Writes collection header: name, age, email
//    ├─ Detects child is IOCollection
//    ├─ Delegates to CollectionSerializer
//    │
// 3. CollectionSerializer
//    ├─ For each item, adds ~ prefix
//    ├─ Delegates to ObjectSerializer for each item
//    │
// 4. ObjectSerializer (for Alice)
//    ├─ Detects open object format
//    ├─ Delegates to MemberSerializer for each member
//    │
// 5. MemberSerializer
//    ├─ No keys (open object)
//    ├─ Delegates to ValueSerializer for each value
//    │
// 6. ValueSerializer
//    ├─ Detects "Alice" is string → StringFormatter
//    ├─ Detects 30 is number → NumberFormatter
//    ├─ Detects "alice@..." is string → StringFormatter
//    │
// 7. TypeFormatters (leaf level)
//    ├─ StringFormatter: "Alice" (no quotes in open object)
//    ├─ NumberFormatter: 30
//    ├─ StringFormatter: "alice@example.com"

// Result: Perfectly formatted IO document
const output = io.stringify(doc);
console.log(output);
// Output:
// $user: {name: string, age: number, email: string}
//
// --- users
// name, age, email
// ~ Alice, 30, alice@example.com
// ~ Bob, 25, bob@example.com
//
// --- settings
// theme: dark
// language: en
```

---

### Example 1: Real-World Library System (Multiple Schemas & Sections)

```typescript
// Complex data structure with multiple types
const libraryData = {
  library: {
    name: 'Bookville Library',
    address: '123 Library St, Bookville'
  },

  books: [
    { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: 1234567890, available: true },
    { title: '1984', author: 'George Orwell', isbn: 2345678901, available: false }
  ],

  subscribers: [
    { userId: 'user123', name: 'John Doe', membershipType: 'Standard' },
    { userId: 'user456', name: 'Jane Smith', membershipType: 'Premium' }
  ]
};

// Define schemas using IODefinitions builder
const librarySchema = io.defs`$library: {name: string, address: string}`;
const bookSchema = io.defs`$book: {title: string, author: string, isbn: number, available: bool}`;
const borrowerSchema = io.defs`$borrower: {userId: string, dueDate: date}`;
const userSchema = io.defs`$user: {userId: string, name: string, membershipType: string}`;

// Create document with definitions
const doc = new IODocument(new IODefinitions()
  .addSchema('$library', librarySchema)
  .addSchema('$book', bookSchema)
  .addSchema('$borrower', borrowerSchema)
  .addSchema('$user', userSchema)
);

// Add sections with data
doc.addSection('library', libraryData.library, '$library');
doc.addSection('books', libraryData.books, '$book');
doc.addSection('subscribers', libraryData.subscribers, '$user');

// Serialize to IO format
const ioString = doc.toIO({ includeDefinitions: true });

console.log(ioString);
// Output:
// --- schema definitions
// ~ $library: {name: string, address: string}
// ~ $book: {title: string, author: string, isbn: number, available: bool}
// ~ $borrower: {userId: string, dueDate: date}
// ~ $user: {userId: string, name: string, membershipType: string}
//
// --- $library
// Bookville Library, "123 Library St, Bookville"
//
// --- books: $book
// ~ The Great Gatsby, "F. Scott Fitzgerald", 1234567890, T
// ~ 1984, George Orwell, 2345678901, F
//
// --- subscribers: $user
// ~ user123, John Doe, Standard
// ~ user456, Jane Smith, Premium
```

### Example 2: Loading from Plain Objects (Simple Case)

```typescript
// Load from plain JavaScript objects (symmetrical with io.doc`...`)
const data = [
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 }
];

// Option 1: Static method on IODocument
const doc = IODocument.load(data);

// Option 2: Facade API (tree-shakable)
const doc = io.doc.load(data);

// Option 3: With schema validation
const schema = io.defs`$user: {name: string, age: number}`;
const doc = IODocument.load(data, schema); // Validates during load

// Then serialize to IO format
const ioString = doc.toIO();
console.log(ioString);
// Output:
// name, age
// ---
// ~ Alice, 30
// ~ Bob, 25
```

### Example 3: Simple Serialization

```typescript
// Create data from parsing
const doc = io.doc`
  name, age
  ---
  Alice, 30
  Bob, 25
`;

// Serialize back to IO format
const ioString = io.stringify(doc);
console.log(ioString);
// Output:
// name, age
// ---
// Alice, 30
// Bob, 25

// Alternative: instance method
const ioString2 = doc.toIO();
```

### Example 4: Schema-Driven Serialization with Validation

```typescript
// Define schema
const userSchema = io.defs`
  $user: {
    name: string,
    age: number,
    email: string,
    joined: date
  }
`;

// Create data
const users = [
  { name: 'Alice', age: 30, email: 'alice@example.com', joined: new Date('2024-01-15') },
  { name: 'Bob', age: 25, email: 'bob@example.com', joined: new Date('2024-03-20') }
];

// Load with schema validation (validates structure)
const doc = IODocument.load(users, userSchema);

// Serialize (already validated during load)
const ioString = doc.toIO();
console.log(ioString);
// Output:
// ~ Alice, 30, alice@example.com, 2024-01-15
// ~ Bob, 25, bob@example.com, 2024-03-20

// Alternative: Validate during serialization
const ioString2 = io.stringify(users, { schema: userSchema });

// Invalid data throws during load
try {
  const badData = [{ name: 'Alice', age: 'thirty' }]; // Wrong type
  const doc = IODocument.load(badData, userSchema);
} catch (error) {
  console.error('Validation failed:', error.message);
  // Error: Schema validation failed - age must be number, got string
}
```

### Example 5: Custom Formatting

```typescript
const data = {
  name: 'Alice',
  balance: 1234.56,
  status: 'active'
};

const formatted = io.stringify(data, {
  formatters: {
    balance: (n) => `$${n.toFixed(2)}`,
    status: (s) => s.toUpperCase()
  }
});
// Output: Alice, $1234.56, ACTIVE
```

### Example 6: Pretty Printing

```typescript
const doc = io.doc`
  name, age, address
  ---
  Alice, 30, {street: Main St, city: NYC}
`;

const pretty = io.stringify(doc, {
  pretty: true,
  indent: 2
});
console.log(pretty);
// Output (formatted):
// name, age, address
// ---
// Alice, 30, {
//   street: Main St,
//   city: NYC
// }
```

### Example 7: Builder Pattern (Advanced)

```typescript
// Create reusable serializer
const serializer = io.serializer()
  .withSchema(userSchema)
  .pretty()
  .indent(2)
  .validate()
  .formatters({
    date: (d) => d.toLocaleDateString()
  });

// Serialize multiple datasets with same config
const output1 = serializer.serialize(users1);
const output2 = serializer.serialize(users2);
```

### Example 8: Error Handling

```typescript
try {
  const output = io.stringify(data, schema);
} catch (error) {
  if (error instanceof SerializationError) {
    console.error(`Failed at path: ${error.path.join('.')}`);
    console.error(`Value: ${error.value}`);
    console.error(`Suggestion: ${error.suggestion}`);
  }
}

// Or with error accumulation
const result = io.serializer()
  .skipErrors()
  .serialize(data);

if (result.errors) {
  result.errors.forEach(err => console.warn(err.message));
}
```

---

## 🔄 Comparison with Parsing API

**Goal:** Perfect symmetry

| Parsing | Serialization |
|---------|---------------|
| `io.doc\`...\`` | `io.stringify(doc)` |
| `io.object\`...\`` | `io.object.stringify(obj)` |
| `io.defs\`...\`` | `io.defs.stringify(schema)` |
| `io.doc.with(defs)\`...\`` | `io.stringify(data, defs)` |
| Parse with schema | Serialize with schema |
| Error accumulation | Error accumulation |
| Position tracking | Path tracking |
| Template literals | String output |

---

## ✅ Success Criteria

### Must Have (MVP)

- ✅ Serialize IODocument, IOCollection, IOObject
- ✅ Schema-driven serialization
- ✅ Round-trip guarantee (parse → serialize → parse)
- ✅ Clear error messages with context
- ✅ Type-safe TypeScript API
- ✅ Tree-shakable exports
- ✅ < 5KB bundle size impact

### Should Have (Post-MVP)

- ✅ Pretty printing with indentation
- ✅ Custom formatters
- ✅ Partial serialization
- ✅ Performance: 10,000 objects in < 100ms
- ✅ Comprehensive error handling

### Nice to Have (Future)

- ⏳ Streaming serialization
- ⏳ Compression support
- ⏳ Comment preservation
- ⏳ Diff-based updates

---

## 📊 Metrics

### Performance Targets

- **Small objects** (< 10 fields): < 0.1ms per object
- **Medium objects** (10-50 fields): < 0.5ms per object
- **Large objects** (50+ fields): < 2ms per object
- **Collections** (1,000 items): < 50ms
- **Large datasets** (10,000 items): < 100ms

### Bundle Size Targets

- **Core serializer**: < 3KB gzipped
- **With formatters**: < 5KB gzipped
- **Full serialization**: < 10KB gzipped

### Quality Targets

- **Test coverage**: > 90%
- **Type safety**: 100% (no any types)
- **Documentation**: 100% public API
- **Error handling**: Context + suggestion for all errors

---

## 🚀 Next Steps

### Immediate Actions

1. **Review this architecture** - Get feedback on API design
2. **Create prototype** - Implement basic serializer for IOObject
3. **Test ergonomics** - Does the API feel right?
4. **Validate bundle size** - Check impact on tree-shaking
5. **Start Phase 1** - Begin core serialization implementation

### Questions to Answer

- [ ] Do we prefer `stringify()` or `serialize()`?
- [ ] Should `toIO()` and `toString()` be identical or different?
- [ ] How much validation happens during serialization?
- [ ] Should we support async serialization for large datasets?
- [ ] How do we handle circular references?

---

**Status:** Ready for review and feedback
**Next:** Prototype implementation to validate API design
