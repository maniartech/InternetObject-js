# Internet Object Schema Architecture

## Table of Contents

1. [Overview](#overview)
2. [Core Data Structures](#core-data-structures)
3. [Schema Parsing Pipeline](#schema-parsing-pipeline)
4. [Schema Compilation](#schema-compilation)
5. [Data Validation (Parse)](#data-validation-parse)
6. [Data Loading](#data-loading)
7. [Data Stringification](#data-stringification)
8. [Multi-Pass Workflow](#multi-pass-workflow)
9. [Variable Resolution](#variable-resolution)
10. [TypeDef System](#typedef-system)
11. [Schema Variable References](#schema-variable-references)
12. [Open Schemas & Wildcards](#open-schemas--wildcards)

---

## Overview

The Internet Object schema system provides complete data validation, transformation, and serialization capabilities. It follows a multi-pass architecture that handles:

- **Parsing**: IO text → AST (Abstract Syntax Tree)
- **Compilation**: AST → Schema (compiled type definitions)
- **Evaluation/Validation**: Data + Schema → Validated InternetObject
- **Loading**: Plain JS objects + Schema → Validated InternetObject
- **Stringification**: InternetObject + Schema → IO text

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                    INTERNET OBJECT SCHEMA WORKFLOW                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────┐      ┌─────────┐      ┌──────────┐      ┌─────────────────┐ │
│  │ IO Text │ ──── │  AST    │ ──── │  Schema  │ ──── │ InternetObject  │ │
│  │ (input) │ parse│  Nodes  │compile│  Object  │ eval │   (output)      │ │
│  └─────────┘      └─────────┘      └──────────┘      └─────────────────┘ │
│       ▲                                                      │           │
│       │                                                      │           │
│       └──────────────────────────────────────────────────────┘           │
│                          stringify                                        │
│                                                                           │
│  ┌─────────┐      ┌──────────┐      ┌─────────────────┐                  │
│  │ JS Data │ ──── │  Schema  │ ──── │ InternetObject  │                  │
│  │ (input) │ load │  Object  │      │   (output)      │                  │
│  └─────────┘      └──────────┘      └─────────────────┘                  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Core Data Structures

### Schema

The `Schema` class (`src/schema/schema.ts`) holds compiled schema information:

```typescript
class Schema {
  public name: string;                    // Schema name (e.g., "person", "$employee")
  public readonly names: string[] = [];   // Ordered list of field names
  public readonly defs: MemberMap = {};   // Field name → MemberDef mapping
  public open: boolean | MemberDef = false; // Additional properties control
}
```

**Open Schema Modes:**

- `false`: No additional properties allowed (closed schema)
- `true`: Any additional property allowed
- `MemberDef`: Additional properties must match the given type/constraints

### MemberDef

The `MemberDef` interface (`src/schema/types/memberdef.ts`) defines field metadata:

```typescript
interface MemberDef {
  type: string;          // Type name: 'string', 'number', 'object', 'array', etc.
  optional?: boolean;    // Field is optional (? suffix)
  null?: any;            // Field allows null (* suffix)
  path?: string;         // Dot-notation path (e.g., "user.address.city")
  default?: any;         // Default value or @variable reference
  choices?: any[];       // Allowed values
  schema?: Schema | TokenNode; // Nested object schema or $variable reference
  of?: MemberDef;        // Array element type definition
  // Type-specific constraints: min, max, minLen, maxLen, pattern, etc.
  [key: string]: any;
}
```

### Definitions

The `Definitions` class (`src/core/definitions.ts`) manages schemas, variables, and metadata:

```typescript
class IODefinitions {
  private _defaultSchema: Schema | null = null;
  private _definitions: { [key: string]: IODefinitionValue } = {};

  // Key prefixes:
  // - $xxx: Schema definitions (e.g., $employee, $address)
  // - @xxx: Variable definitions (e.g., @defaultAge, @minQty)
  // - xxx:  Regular metadata (e.g., appName, version)
}
```

**Definition Types:**

```typescript
type IODefinitionValue = {
  isSchema: boolean,    // Key starts with $
  isVariable: boolean,  // Key starts with @
  value: any            // Schema instance, TokenNode, or raw value
};
```

### TokenNode

The `TokenNode` class represents unresolved variable references in the AST:

```typescript
class TokenNode {
  type: TokenType;  // STRING, NUMBER, BOOLEAN, etc.
  value: any;       // Actual value or variable name (e.g., "$employee", "@minAge")
  // Position information for error reporting...
}
```

---

## Schema Parsing Pipeline

### 1. Tokenization

Source text is tokenized into tokens:

```text
"name: string, age: {number, min: 0}"
    ↓
[STRING:"name", COLON, STRING:"string", COMMA, STRING:"age", COLON,
 OPEN_BRACE, STRING:"number", COMMA, STRING:"min", COLON, NUMBER:0, CLOSE_BRACE]
```

### 2. AST Parsing

Tokens are parsed into an Abstract Syntax Tree:

```text
ObjectNode
├── MemberNode(key: "name", value: TokenNode("string"))
└── MemberNode(key: "age", value: ObjectNode
    ├── MemberNode(key: null, value: TokenNode("number"))
    └── MemberNode(key: "min", value: TokenNode(0))
)
```

### 3. Document Parsing

The `parse()` function (`src/parser/index.ts`) orchestrates the full pipeline:

```typescript
function parse(source: string, defs?: Definitions, errorCollector?: Error[]): Document {
  // 1. Tokenize
  const tokenizer = new Tokenizer(source);
  const tokens = tokenizer.tokenize();

  // 2. Build AST
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  // 3. Parse definitions (two-pass: store raw, then compile)
  if (docNode.header?.child instanceof CollectionNode) {
    parseDefs(doc, docNode.header.child);
  }

  // 4. Process data sections with schema validation
  parseDataWithSchema(docNode, doc, errorCollector);

  return doc;
}
```

---

## Schema Compilation

### compileObject()

The `compileObject()` function (`src/schema/compile-object.ts`) compiles AST into Schema:

```typescript
function compileObject(name: string, node: Node, defs?: Definitions): Schema | TokenNode {
  // Handle schema variable reference: $employee
  if (node instanceof TokenNode && node.value.startsWith('$')) {
    return node; // Return unresolved reference for later
  }

  const schema = new Schema(name);
  parseObjectDef(node as ObjectNode, schema, "", defs);
  return schema;
}
```

### parseObjectDef()

Parses object definition nodes into Schema:

```typescript
function parseObjectDef(o: ObjectNode, schema: Schema, path: string, defs?: Definitions): Schema {
  for (const child of o.children) {
    const memberNode = child as MemberNode;

    // Handle wildcard (*) for additional properties
    if (memberNode.key?.value === '*') {
      schema.open = canonicalizeAdditionalProps(memberNode.value, '*');
      continue;
    }

    // Regular member
    if (memberNode.key) {
      const memberDef = getMemberDef(memberNode, path, defs);
      addMemberDef(memberDef, schema, path);
    } else {
      // Keyless member (positional)
      const fieldInfo = parseName(memberNode.value);
      const memberDef = createMemberDef({ ...fieldInfo, type: 'any' });
      addMemberDef(memberDef, schema, path);
    }
  }

  return schema;
}
```

### getMemberDef()

Converts a member node into a MemberDef:

```typescript
function getMemberDef(memberDef: MemberNode, path: string, defs?: Definitions): MemberDef {
  const node = memberDef.value;
  const fieldInfo = parseName(memberDef.key);  // { name, optional, null }

  // Simple type: name: string
  if (node instanceof TokenNode && node.type === TokenType.STRING) {
    const type = node.value;

    // Schema variable reference: address: $address
    if (type.startsWith('$')) {
      return { ...fieldInfo, type: "object", schema: node } as MemberDef;
    }

    // Built-in type
    if (TypedefRegistry.isRegisteredType(type)) {
      return { ...fieldInfo, type } as MemberDef;
    }
  }

  // Complex type: age: {number, min: 0, max: 100}
  if (node instanceof ObjectNode) {
    return { ...fieldInfo, ...parseObjectOrTypeDef(node, path, defs) };
  }

  // Array type: tags: [string]
  if (node instanceof ArrayNode) {
    return { ...fieldInfo, ...parseArrayOrTypeDef(node, path, defs) };
  }
}
```

### parseObjectOrTypeDef()

Handles complex object/type definitions:

```typescript
function parseObjectOrTypeDef(o: ObjectNode, path: string, defs?: Definitions): MemberDef {
  // Empty object: {} → open object
  if (o.children.length === 0) {
    const schema = new Schema(path);
    schema.open = true;
    return { type: 'object', schema, path };
  }

  const firstNode = o.children[0] as MemberNode;

  // Type shorthand: {number, min: 0}
  if (!firstNode.key && firstNode.value instanceof TokenNode) {
    const type = firstNode.value.value;
    if (TypedefRegistry.isRegisteredType(type)) {
      return parseMemberDef(type, o, defs);
    }
    // Schema variable shorthand: {$Person, ...}
    if (type.startsWith('$')) {
      return { type: 'object', schema: firstNode.value, path };
    }
  }

  // Explicit type property: {min: 0, type: number}
  const typeNode = findTypeProperty(o);
  if (typeNode) {
    return parseMemberDef(typeNode.value, o, defs);
  }

  // Nested object schema: {name: string, age: number}
  return { type: 'object', schema: parseObjectDef(o, new Schema(path), path, defs), path };
}
```

### parseArrayOrTypeDef()

Handles array type definitions:

```typescript
function parseArrayOrTypeDef(a: ArrayNode, path: string, defs?: Definitions): MemberDef {
  // Empty array: [] → array of any
  if (a.children.length === 0) {
    return createMemberDef({
      type: 'array',
      of: { type: 'any', path, null: true },
      path
    });
  }

  const child = a.children[0];

  // Simple type: [string]
  if (child instanceof TokenNode && child.type === TokenType.STRING) {
    const type = child.value;
    if (TypedefRegistry.isRegisteredType(type)) {
      return createMemberDef({ type: 'array', of: { type, path }, path });
    }
    // Schema variable: [$employee]
    if (type.startsWith('$')) {
      return createMemberDef({
        type: 'array',
        of: { type: 'object', schema: child, path },
        path
      });
    }
  }

  // Object element: [{name: string}]
  if (child instanceof ObjectNode) {
    return createMemberDef({
      type: 'array',
      of: parseObjectOrTypeDef(child, path, defs),
      path
    });
  }

  // Nested array: [[string]]
  if (child instanceof ArrayNode) {
    return createMemberDef({
      type: 'array',
      of: parseArrayOrTypeDef(child, path, defs),
      path
    });
  }
}
```

---

## Data Validation (Parse)

### processSchema()

The main entry point for data validation (`src/schema/processor.ts`):

```typescript
function processSchema(
  data: ProcessableData,
  schema: SchemaType,
  defs?: Definitions,
  errorCollector?: Error[]
): ProcessResult {
  if (data === null) return null;

  if (data instanceof ObjectNode) {
    return processObject(data, schema, defs);
  }

  return processCollection(data as CollectionNode, schema, defs, errorCollector);
}
```

### processObject()

Validates an ObjectNode against a Schema (`src/schema/object-processor.ts`):

```typescript
function processObject(data: ObjectNode, schema: Schema, defs?: Definitions): InternetObject {
  const o = new InternetObject();
  const processedNames = new Set<string>();
  let positional = true;

  // Phase 1: Process positional members (in schema order)
  for (let i = 0; i < schema.names.length; i++) {
    const member = data.children[i] as MemberNode;
    const name = schema.names[i];
    const memberDef = _resolveMemberDefVariables(schema.defs[name], defs);

    if (member) {
      if (member.key) {
        positional = false;
        break; // Switch to keyed processing
      }

      const val = processMember(member, memberDef, defs);
      processedNames.add(name);
      o.set(name, val);
    } else if (!memberDef.optional && memberDef.default === undefined) {
      throw new ValidationError(ErrorCodes.valueRequired, `Expecting a value for ${memberDef.path}`);
    }
  }

  // Phase 2: Process remaining keyed members
  for (; i < data.children.length; i++) {
    const member = data.children[i] as MemberNode;
    const name = member.key.value;

    if (!schema.defs[name] && !schema.open) {
      throw new SyntaxError(ErrorCodes.unknownMember, `Schema does not define '${name}'`);
    }

    const memberDef = schema.defs[name] || { type: 'any', path: name };
    const val = processMember(member, memberDef, defs);
    o.set(name, val);
  }

  // Phase 3: Check for missing required members
  for (const name in schema.defs) {
    if (!processedNames.has(name)) {
      const memberDef = schema.defs[name];
      if (!memberDef.optional && memberDef.default === undefined) {
        throw new ValidationError(ErrorCodes.valueRequired, `Value required for ${name}`);
      }
    }
  }

  return o;
}
```

### processMember()

Validates a single member using its TypeDef (`src/schema/processing/member-processor.ts`):

```typescript
function processMember(member: MemberNode, memberDef: MemberDef, defs?: IODefinitions): any {
  const typeDef = TypedefRegistry.get(memberDef.type);
  return typeDef.parse(member?.value, memberDef, defs);
}
```

---

## Data Loading

### load()

Loads and validates plain JavaScript objects (`src/facade/load.ts`):

```typescript
function load(
  data: any,
  schema: string | Schema,
  defs?: Definitions,
  errorCollector?: Error[]
): InternetObject | Collection<InternetObject> {
  // Resolve schema from string or Schema object
  const resolvedSchema = resolveSchema(schema, defs);

  // Route to appropriate loader
  if (Array.isArray(data)) {
    return loadCollection(data, resolvedSchema, defs, errorCollector);
  }
  return loadObject(data, resolvedSchema, defs);
}
```

### loadObject()

Validates a plain JS object against schema (`src/schema/load-processor.ts`):

```typescript
function loadObject(data: any, schema: Schema, defs?: Definitions): InternetObject {
  // Type check
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ValidationError(ErrorCodes.invalidObject, 'Expecting an object');
  }

  const result = new InternetObject();
  const processedNames = new Set<string>();

  // Process schema-defined members
  for (const name of schema.names) {
    const memberDef = _resolveMemberDefVariables(schema.defs[name], defs);
    const value = data[name];

    const typeDef = TypedefRegistry.get(memberDef.type);

    // Use TypeDef.load() if available
    if (typeDef.load) {
      const loadedValue = typeDef.load(value, memberDef, defs);
      if (loadedValue !== undefined) {
        result.set(name, loadedValue);
      }
    } else {
      // Fallback handling
      if (value !== undefined) {
        result.set(name, value);
      } else if (memberDef.default !== undefined) {
        result.set(name, memberDef.default);
      } else if (!memberDef.optional) {
        throw new ValidationError(ErrorCodes.valueRequired, `Value required for '${name}'`);
      }
    }

    processedNames.add(name);
  }

  // Handle additional properties (open schema)
  if (schema.open) {
    for (const key in data) {
      if (!processedNames.has(key)) {
        const extraMemberDef = typeof schema.open === 'object'
          ? { ...schema.open, path: key }
          : { type: 'any', path: key };

        const typeDef = TypedefRegistry.get(extraMemberDef.type);
        result.set(key, typeDef.load?.(data[key], extraMemberDef, defs) ?? data[key]);
      }
    }
  } else {
    // Check for unexpected properties (closed schema)
    for (const key in data) {
      if (!processedNames.has(key)) {
        throw new ValidationError(ErrorCodes.unknownMember, `Unknown member '${key}'`);
      }
    }
  }

  return result;
}
```

### TypeDef.load()

Each TypeDef implements a `load()` method for JS value validation:

```typescript
// Example: ObjectDef.load()
load = (value: any, memberDef: MemberDef, defs?: Definitions): any => {
  const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs);
  if (changed) return checkedValue;

  // Type check
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(ErrorCodes.invalidObject, `Expecting object for '${memberDef.path}'`);
  }

  const schema = memberDef.schema;
  if (!schema) return value; // No schema - return as-is

  return this._loadObject(value, schema, memberDef.path || '', defs);
}
```

---

## Data Stringification

### stringify()

Converts InternetObject to IO text (`src/facade/stringify.ts`):

```typescript
function stringify(
  value: InternetObject | Collection | Document,
  schema?: string | Schema,
  defs?: Definitions,
  options?: StringifyOptions
): string {
  // Handle Document (IODocument)
  if (value instanceof Document) {
    return stringifyDocument(value, options);
  }

  // Handle Collection
  if (value instanceof Collection) {
    return stringifyCollection(value, schema, defs, options);
  }

  // Handle InternetObject
  if (value instanceof InternetObject) {
    return stringifyObject(value, schema, defs, options);
  }

  return JSON.stringify(value);
}
```

### stringifyObject()

Converts an InternetObject to IO text:

```typescript
function stringifyObject(
  obj: InternetObject,
  schema?: Schema,
  defs?: Definitions,
  options?: StringifyOptions
): string {
  const parts: string[] = [];
  const includeTypes = options?.includeTypes ?? false;

  if (schema) {
    // Output in schema order
    for (const name of schema.names) {
      const memberDef = schema.defs[name];
      const val = obj.get(name);

      const typeDef = TypedefRegistry.get(memberDef.type);
      let strValue: string;

      if (typeDef?.stringify) {
        strValue = typeDef.stringify(val, memberDef, defs);
      } else {
        strValue = stringifyAnyValue(val, defs);
      }

      if (includeTypes) {
        parts.push(`${name}: ${strValue}`);
      } else {
        parts.push(strValue); // Positional output
      }
    }
  }

  return parts.join(', ');
}
```

### stringifyDocument()

Stringifies a complete Document including header and sections (`src/facade/stringify-document.ts`):

```typescript
function stringifyDocument(doc: Document, options: StringifyDocumentOptions = {}): string {
  const parts: string[] = [];

  // Stringify header (definitions, schemas)
  if (doc.header?.definitions?.length > 0) {
    const headerText = stringifyHeader(doc.header, 'io', options);
    if (headerText) parts.push(headerText);
  } else if (doc.header?.schema) {
    const schemaText = stringifySchema(doc.header.schema, options);
    if (schemaText) parts.push(schemaText);
  }

  // Stringify sections
  for (const section of doc.sections) {
    // Add section separator
    if (section.name) {
      parts.push(`--- ${section.name}`);
    } else {
      parts.push('---');
    }

    // Stringify section data
    const sectionText = stringifySection(section, doc.header.definitions, options);
    if (sectionText) parts.push(sectionText);
  }

  return parts.join('\n');
}
```

### stringifyMemberDef()

Converts a MemberDef to schema definition format (`src/schema/types/memberdef-stringify.ts`):

```typescript
function stringifyMemberDef(memberDef: MemberDef, includeTypes: boolean): string {
  // Handle nested objects
  if (memberDef.type === 'object' && memberDef.schema) {
    return formatNestedSchema(memberDef.schema);
  }

  // Skip if no type or type is 'any'
  if (!includeTypes || !memberDef.type || memberDef.type === 'any') {
    return '';
  }

  // Handle array type
  if (memberDef.type === 'array' && memberDef.of) {
    return stringifyArrayMemberDef(memberDef);
  }

  // Detect constraints
  const constraintProps = detectConstraintProperties(memberDef);

  // Format with or without constraints
  if (constraintProps.length > 0) {
    return formatTypeWithConstraints(memberDef.type, memberDef, constraintProps);
  }
  return memberDef.type;
}
```

### formatNestedSchema()

Formats nested object schemas, handling both Schema instances and variable references:

```typescript
function formatNestedSchema(schema: any): string {
  // Handle schema variable reference (e.g., $employee, $address)
  if (schema instanceof TokenNode) {
    if (typeof schema.value === 'string' && schema.value.startsWith('$')) {
      return schema.value; // Return as-is: $employee
    }
  }

  // Handle string reference directly
  if (typeof schema === 'string' && schema.startsWith('$')) {
    return schema;
  }

  // Format Schema instance
  const nestedFields: string[] = [];
  for (const nestedName of schema.names) {
    const nestedMember = schema.defs[nestedName];
    let nestedField = nestedName;

    if (nestedMember?.optional) nestedField += '?';
    if (nestedMember?.null) nestedField += '*';

    // Recursively add type annotation
    const typeAnnotation = stringifyMemberDef(nestedMember, true);
    if (typeAnnotation) {
      nestedField += `: ${typeAnnotation}`;
    }

    nestedFields.push(nestedField);
  }

  return `{${nestedFields.join(', ')}}`;
}
```

### TypeDef.stringify()

Each TypeDef implements a `stringify()` method:

```typescript
// Example: ObjectDef.stringify()
stringify = (value: any, memberDef: MemberDef, defs?: Definitions): string => {
  const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs);
  if (changed) {
    if (checkedValue === null) return 'N';
    if (checkedValue === undefined) return '';
    value = checkedValue;
  }

  // Type check
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(ErrorCodes.invalidObject, `Expecting object for '${memberDef.path}'`);
  }

  // Resolve schema (may be TokenNode reference)
  const schema = this._resolveSchema(memberDef.schema, defs);
  return this._stringifyObject(value, schema, memberDef.path || '', defs);
}
```

---

## Multi-Pass Workflow

The schema system uses a **multi-pass workflow** to handle forward references and variable dependencies.

### Pass 1: Store Raw Definitions

During `parseDefs()`, definitions are stored raw without compilation:

```typescript
function parseDefs(doc: Document, cols: CollectionNode): void {
  const defs = doc.header.definitions;
  const schemaDefs: Array<{ key: string; schemaDef: Node }> = [];

  for (const child of cols.children) {
    const memberNode = child.children[0] as MemberNode;
    const key = memberNode.key.value;

    // Schema definition ($xxx): Store raw, compile later
    if (key.startsWith('$')) {
      defs.push(key, memberNode.value, true);
      schemaDefs.push({ key, schemaDef: memberNode.value });
      continue;
    }

    // Variable definition (@xxx): Store as-is
    if (key.startsWith('@')) {
      defs.push(key, memberNode.value, false, true);
      continue;
    }

    // Regular metadata: Evaluate immediately
    defs.push(key, memberNode.value.toValue(defs));
  }

  // Pass 2: Compile all schema definitions
  for (const { key, schemaDef } of schemaDefs) {
    const def = compileObject(key, schemaDef, defs);
    defs.set(key, def);
  }
}
```

### Pass 2: Compile Schemas with Context

Schema compilation happens **after** all definitions are stored, so forward references resolve:

```typescript
// Example: Forward reference in schema
// ~ $address: {street, city, zip}
// ~ $employee: {name, age, address: $address}  ← $address available
```

### Pass 3: Resolve Variables at Runtime

Variable references (`@xxx`) are resolved at data processing time:

```typescript
function _resolveMemberDefVariables(memberDef: MemberDef, defs?: Definitions): MemberDef {
  const resolved = { ...memberDef };

  // Resolve default value
  if (typeof resolved.default === 'string' && resolved.default.startsWith('@')) {
    resolved.default = defs.getV(resolved.default);
    if (resolved.default instanceof TokenNode) {
      resolved.default = resolved.default.value;
    }
  }

  // Resolve choices
  if (Array.isArray(resolved.choices)) {
    resolved.choices = resolved.choices.map(choice => {
      if (typeof choice === 'string' && choice.startsWith('@')) {
        let val = defs.getV(choice);
        return val instanceof TokenNode ? val.value : val;
      }
      return choice;
    });
  }

  // Resolve min/max
  // ...similar pattern...

  return resolved;
}
```

### Lazy Schema Resolution

Schema variable references remain as `TokenNode` until data processing:

```typescript
// In Definitions.getV()
getV(k: any): any {
  const def = this._definitions[key];

  // Check nested references and resolve them
  if (def.value instanceof TokenNode) {
    const schema = this.getV(def.value);
    if (schema instanceof Schema) {
      this.set(key, schema); // Cache resolved schema
      return schema;
    }
  }

  return def.value;
}
```

---

## Variable Resolution

### Two-Stage Variable Dereferencing

Variables are resolved in two stages:

1. **Schema Compilation Runtime**: Resolves `@variables` when validating MemberDef constraints
2. **Data Processing Runtime**: Resolves `@variables` in `processObject()` via `_resolveMemberDefVariables()`

### dereferenceObjectNodeVariables()

Resolves variables during schema compilation:

```typescript
function dereferenceObjectNodeVariables(o: ObjectNode, defs?: Definitions): void {
  if (!defs) return;

  for (const child of o.children) {
    if (!(child instanceof MemberNode)) continue;

    const value = child.value;
    if (value instanceof TokenNode &&
        typeof value.value === 'string' &&
        value.value.startsWith('@')) {

      const resolved = defs.getV(value.value);
      if (resolved instanceof TokenNode) {
        (child as any).value = resolved;
      } else {
        (value as any).value = resolved;
      }
    }
  }
}
```

### Variable Reference Examples

```io
~ @minAge: 18
~ @defaultRole: "user"
~ $employee: {
    name: string,
    age: {number, min: @minAge},
    role: {string, default: @defaultRole}
  }
---
~ Alice, 25, admin
```

---

## TypeDef System

### TypeDef Interface

The core interface for type handlers (`src/schema/typedef.ts`):

```typescript
interface TypeDef {
  get type(): string;         // Type name (e.g., 'string', 'number')
  get schema(): Schema;       // Schema for type's own constraints

  // Required: Parse IO text → JS value
  parse(node: Node, memberDef: MemberDef, definitions?: Definitions): any;

  // Optional: Load JS value → Validated JS value
  load?(value: any, memberDef: MemberDef, definitions?: Definitions): any;

  // Optional: Stringify JS value → IO text
  stringify?(value: any, memberDef: MemberDef, definitions?: Definitions): string;
}
```

### TypedefRegistry

Central registry for type handlers (`src/schema/typedef-registry.ts`):

```typescript
class TypedefRegistry {
  private static readonly typeDefMap = new Map<string, TypeDef>();

  static register(...typeDefConstructors: TypeDefConstructor[]): void {
    for (const Constructor of typeDefConstructors) {
      for (const type of Constructor.types) {
        this.typeDefMap.set(type, new Constructor(type));
      }
    }
  }

  static get(type: string): TypeDef {
    const typeDef = this.typeDefMap.get(type);
    if (!typeDef) throw new Error(`Type '${type}' is not registered`);
    return typeDef;
  }

  static isRegisteredType(typeName: string): boolean {
    return this.typeDefMap.has(typeName);
  }
}
```

### Built-in Types

Registered via `registerTypes()` (`src/schema/types/index.ts`):

```typescript
TypedefRegistry.register(
  AnyDef,       // 'any' - accepts any value
  ArrayDef,     // 'array' - with 'of' element type
  BooleanDef,   // 'bool', 'boolean'
  NumberDef,    // 'number', 'int', 'uint', 'bigint', 'decimal'
  ObjectDef,    // 'object' - with nested schema
  StringDef,    // 'string', 'email', 'url', 'base64'
  DateTimeDef   // 'date', 'time', 'datetime'
);
```

### doCommonTypeCheck()

Shared validation for all types (`src/schema/types/common-type.ts`):

```typescript
function doCommonTypeCheck(
  memberDef: MemberDef,
  value: any,
  node?: Node,
  defs?: Definitions,
  equalityComparator?: EqualityComparator
): CommonTypeCheckResult {
  const isUndefined = value === undefined || (value instanceof TokenNode && value.type === TokenType.UNDEFINED);
  const isNull = value === null;

  // Check undefined
  if (isUndefined) {
    if (memberDef.default !== undefined) {
      return { value: _default(memberDef.default, defs), changed: true };
    }
    if (memberDef.optional) return { value: undefined, changed: true };
    throw new ValidationError(ErrorCodes.valueRequired, `Value required for ${memberDef.path}`);
  }

  // Check null
  if (isNull) {
    if (memberDef.null) return { value: null, changed: true };
    throw new ValidationError(ErrorCodes.nullNotAllowed, `Null not allowed for ${memberDef.path}`);
  }

  // Validate choices
  if (memberDef.choices) {
    const val = value instanceof TokenNode ? value.value : value;
    const found = memberDef.choices.some(choice => {
      if (typeof choice === 'string' && choice.startsWith('@')) {
        choice = defs?.getV(choice);
      }
      return equalityComparator ? equalityComparator(val, choice) : val === choice;
    });

    if (!found) {
      throw new ValidationError(ErrorCodes.invalidChoice, `Invalid choice for ${memberDef.path}`);
    }
  }

  return { value, changed: false };
}
```

---

## Schema Variable References

### Defining Schema Variables

```io
~ $address: {street: string, city: string, zip: string}
~ $employee: {
    name: string,
    age: {number, min: 18},
    homeAddress: $address,
    workAddress?: $address
  }
~ $user: $employee  # Schema alias
```

### Recursive Schemas

Schemas can reference themselves for tree-like structures:

```io
~ $employee: {
    name: string,
    age: {number, min: 25},
    managers?*: [$employee]  # Optional nullable array of $employee
  }
```

### Schema Resolution

Schema references are preserved as `TokenNode` until runtime:

```typescript
// During compilation: memberDef.schema = TokenNode("$employee")
// During data processing/stringify: resolved via _resolveSchema()

private _resolveSchema(schema: Schema | TokenNode | string | undefined, defs?: Definitions): Schema | undefined {
  if (schema instanceof Schema) return schema;

  if (schema instanceof TokenNode) {
    if (typeof schema.value === 'string' && schema.value.startsWith('$') && defs) {
      const resolved = defs.getV(schema.value);
      if (resolved instanceof Schema) return resolved;
      return this._resolveSchema(resolved, defs);
    }
  }

  if (typeof schema === 'string' && schema.startsWith('$') && defs) {
    const resolved = defs.getV(schema);
    if (resolved instanceof Schema) return resolved;
  }

  return undefined;
}
```

### Preserving References in Stringify

When stringifying schemas, variable references are preserved:

```typescript
function stringifyHeader(header: any, format: 'io', options: StringifyOptions): string {
  for (const [key, defValue] of defs.entries()) {
    if (defValue.isSchema) {
      const schemaValue = defValue.value;

      // Handle schema alias (TokenNode reference)
      if (schemaValue instanceof TokenNode ||
          (typeof schemaValue?.value === 'string' && schemaValue.value.startsWith('$'))) {
        formattedValue = schemaValue.value; // Output as $employee
      } else {
        formattedValue = `{${stringifySchema(schemaValue, options)}}`;
      }
    }

    defParts.push(`~ ${key}: ${formattedValue}`);
  }
}
```

---

## Open Schemas & Wildcards

### Wildcard Syntax

```io
# Open schema with any additional properties
schema: {name: string, age: number, *}

# Open schema with typed additional properties
schema: {name: string, *: string}

# Open schema with constrained additional properties
schema: {name: string, *: {number, min: 0}}

# Open schema with array additional properties
schema: {name: string, *: [string]}
```

### canonicalizeAdditionalProps()

Converts wildcard values to MemberDef:

```typescript
function canonicalizeAdditionalProps(valueNode: Node | null, name: string): MemberDef | true {
  if (!valueNode) return true; // Plain * → allow any

  // String type: *: string
  if (valueNode instanceof TokenNode && valueNode.type === TokenType.STRING) {
    if (TypedefRegistry.isRegisteredType(valueNode.value)) {
      return { type: valueNode.value, path: name } as MemberDef;
    }
  }

  // Object type: *: {number, min: 0}
  if (valueNode instanceof ObjectNode) {
    return parseObjectOrTypeDef(valueNode, name);
  }

  // Array type: *: [string]
  if (valueNode instanceof ArrayNode) {
    return parseArrayOrTypeDef(valueNode, name);
  }

  return true;
}
```

### Processing Additional Properties

```typescript
// In processObject()
if (memberNode.key?.value === '*') {
  const additionalDef = canonicalizeAdditionalProps(memberNode.value, '*');
  schema.defs['*'] = additionalDef;
  schema.open = additionalDef;
  continue;
}

// Later, when processing unknown keys:
if (!memberDef && schema.open) {
  if (typeof schema.open === 'object' && schema.open.type) {
    memberDef = { ...schema.open, path: name };
  } else {
    memberDef = { type: 'any', path: name };
  }
}
```

---

## Appendix: Complete Flow Example

### Input

```io
~ @minAge: 18
~ $address: {street: string, city: string}
~ $person: {name: string, age: {number, min: @minAge}, address: $address}
---
~ Alice, 25, {123 Main St, NYC}
~ Bob, 30, {456 Oak Ave, LA}
```

### Processing Flow

```text
1. TOKENIZATION
   ───────────────────────────────────────────
   Input: "~ @minAge: 18\n~ $address: ..."
   Output: [TILDE, STRING:"@minAge", COLON, NUMBER:18, ...]

2. AST PARSING
   ───────────────────────────────────────────
   Output: DocumentNode
   ├── header: SectionNode
   │   └── child: CollectionNode
   │       ├── ObjectNode (@minAge: 18)
   │       ├── ObjectNode ($address: {...})
   │       └── ObjectNode ($person: {...})
   └── sections: [SectionNode, SectionNode]

3. DEFINITION PARSING (Pass 1: Store Raw)
   ───────────────────────────────────────────
   defs["@minAge"] = TokenNode(18)
   defs["$address"] = ObjectNode({street, city})  # Raw node
   defs["$person"] = ObjectNode({name, age, address})  # Raw node

4. SCHEMA COMPILATION (Pass 2: Compile)
   ───────────────────────────────────────────
   defs["$address"] = Schema {
     names: ["street", "city"],
     defs: {
       street: { type: "string", path: "street" },
       city: { type: "string", path: "city" }
     }
   }

   defs["$person"] = Schema {
     names: ["name", "age", "address"],
     defs: {
       name: { type: "string", path: "name" },
       age: { type: "number", path: "age", min: TokenNode("@minAge") },
       address: { type: "object", path: "address", schema: TokenNode("$address") }
     }
   }

5. DATA PROCESSING (Pass 3: Validate & Resolve)
   ───────────────────────────────────────────
   For each data row:
   a. _resolveMemberDefVariables(): age.min = 18 (from @minAge)
   b. processObject(): Validate positional values
   c. TypeDef.parse(): Convert IO values to JS values

   Output: Collection<InternetObject>
   ├── InternetObject { name: "Alice", age: 25, address: {...} }
   └── InternetObject { name: "Bob", age: 30, address: {...} }

6. STRINGIFICATION (Round-trip)
   ───────────────────────────────────────────
   Input: Document with processed data
   Output:
   ~ @minAge: 18
   ~ $address: {street: string, city: string}
   ~ $person: {name: string, age: {number, min:18}, address: $address}
   ---
   ~ Alice, 25, {123 Main St, NYC}
   ~ Bob, 30, {456 Oak Ave, LA}
```

---

## Summary

| Component | File | Purpose |
|-----------|------|---------|
| `Schema` | `src/schema/schema.ts` | Compiled schema structure |
| `MemberDef` | `src/schema/types/memberdef.ts` | Field definition metadata |
| `Definitions` | `src/core/definitions.ts` | Schema/variable storage |
| `compileObject` | `src/schema/compile-object.ts` | AST → Schema compilation |
| `processObject` | `src/schema/object-processor.ts` | Data validation |
| `loadObject` | `src/schema/load-processor.ts` | JS value validation |
| `stringify` | `src/facade/stringify.ts` | InternetObject → IO text |
| `stringifyDocument` | `src/facade/stringify-document.ts` | Document → IO text |
| `stringifyMemberDef` | `src/schema/types/memberdef-stringify.ts` | MemberDef → schema text |
| `TypedefRegistry` | `src/schema/typedef-registry.ts` | Type handler registry |
| `TypeDef` | `src/schema/typedef.ts` | Type handler interface |

