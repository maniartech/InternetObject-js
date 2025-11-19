# Document-Level Load and Stringify API

## Overview

The document-level APIs (`loadDocument`, `stringifyDocument`, `documentToObject`) provide comprehensive functionality for working with complete IODocument structures, including headers with definitions and multiple named/unnamed sections.

## IODocument Structure

```
IODocument
├── Header
│   ├── Definitions
│   │   ├── $schemas (keys starting with $)
│   │   ├── @variables (keys starting with @)
│   │   └── Regular definitions
│   └── Default Schema
└── SectionCollection
    ├── Section 1 (named or unnamed)
    │   ├── name
    │   ├── schemaName
    │   └── data (InternetObject or Collection)
    ├── Section 2
    └── ...
```

## loadDocument API

### Function Signature

```typescript
function loadDocument(
  data: DocumentData,
  options?: LoadDocumentOptions
): IODocument
```

### Interfaces

#### DocumentData

```typescript
interface DocumentData {
  header?: {
    definitions?: Record<string, any>  // @variables, $schemas, regular keys
    schema?: string | Schema            // Default schema
  }
  data?: any                           // Single unnamed section
  sections?: Array<{                   // Multiple named sections
    name?: string
    schemaName?: string
    data: any
  }>
}
```

#### LoadDocumentOptions

```typescript
interface LoadDocumentOptions {
  defaultSchema?: string | Schema      // Fallback schema for all sections
  sectionSchemas?: Record<string, string | Schema>  // Per-section schemas
  definitions?: Definitions            // External definitions to merge
  errorCollector?: (error: ValidationError) => void  // Collect errors
  strict?: boolean                     // Throw on first error (default: false)
}
```

### Features

1. **Header Processing**
   - Parses definitions from plain JavaScript objects
   - Automatically categorizes:
     - Schemas: keys starting with `$` (e.g., `$User`, `$Product`)
     - Variables: keys starting with `@` (e.g., `@apiKey`, `@maxRetries`)
     - Regular definitions: any other keys
   - Compiles default schema from IO text or Schema object

2. **Schema Resolution**
   - From IO text: `'name: string, age: number'`
   - From Schema object: Pre-compiled schemas
   - From definition references: `'$User'` resolves to definition
   - Priority: section-specific → per-section option → default schema → header schema

3. **Multiple Sections**
   - Single unnamed section: Use `data` property
   - Multiple named sections: Use `sections` array
   - Each section can have its own schema

4. **External Definitions**
   - Merge additional definitions from code
   - Useful for programmatically created schemas

5. **Error Handling**
   - **Strict mode** (`strict: true`): Throws on first validation error
   - **Non-strict mode** (default): Collects all errors, continues processing
   - Error collector callback for custom error handling

### Usage Examples

#### Simple Document with Single Section

```typescript
import { loadDocument } from 'internet-object';

const doc = loadDocument({
  header: {
    definitions: {
      $User: 'name: string, age: number, email: string'
    },
    schema: '$User'
  },
  data: {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com'
  }
});

console.log(doc.header.schema);  // Schema object
console.log(doc.sections.length);  // 1
console.log(doc.sections.get(0).data.get('name'));  // 'John Doe'
```

#### Document with Multiple Named Sections

```typescript
const doc = loadDocument({
  header: {
    definitions: {
      $User: 'name: string, age: number',
      $Product: 'name: string, price: number',
      '@apiKey': 'secret-123',
      '@maxRetries': 3
    }
  },
  sections: [
    {
      name: 'users',
      schemaName: '$User',
      data: [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ]
    },
    {
      name: 'products',
      schemaName: '$Product',
      data: [
        { name: 'Widget', price: 19.99 },
        { name: 'Gadget', price: 29.99 }
      ]
    }
  ]
});

// Access sections
const users = doc.sections.get('users');
console.log(users.data.length);  // 2

const products = doc.sections.get('products');
console.log(products.data.get(0).get('name'));  // 'Widget'

// Access definitions
const apiKey = doc.header.definitions.getV('@apiKey');
console.log(apiKey);  // 'secret-123'
```

#### Per-Section Schemas from Options

```typescript
const doc = loadDocument(
  {
    sections: [
      { name: 'users', data: [{ name: 'John', age: 30 }] },
      { name: 'products', data: [{ name: 'Widget', price: 10 }] }
    ]
  },
  {
    sectionSchemas: {
      users: 'name: string, age: number',
      products: 'name: string, price: number'
    }
  }
);
```

#### Error Collection (Non-Strict Mode)

```typescript
const errors: ValidationError[] = [];

const doc = loadDocument(
  {
    sections: [
      { name: 'users', data: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 'invalid' },  // Error
        { name: 'Bob', age: 25 }
      ]}
    ]
  },
  {
    defaultSchema: 'name: string, age: number',
    errorCollector: err => errors.push(err),
    strict: false  // Continue processing on errors
  }
);

console.log(errors.length);  // 1
console.log(doc.sections.get(0).data.length);  // 3 (includes error object)
```

#### Strict Mode (Throw on Error)

```typescript
try {
  const doc = loadDocument(
    {
      data: { name: 'John', age: 'invalid' }
    },
    {
      defaultSchema: 'name: string, age: number',
      strict: true  // Throw on first error
    }
  );
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

#### External Definitions Merge

```typescript
import { Definitions } from 'internet-object';

// Create definitions programmatically
const externalDefs = new Definitions();
externalDefs.set('$BaseUser', 'name: string, email: string');
externalDefs.set('@timeout', 5000);

const doc = loadDocument(
  {
    header: {
      definitions: {
        $Admin: 'name: string, role: string'  // Extends base definitions
      }
    },
    data: { name: 'Admin', role: 'superuser' }
  },
  {
    definitions: externalDefs,  // Merged into document
    defaultSchema: '$Admin'
  }
);
```

---

## stringifyDocument API

### Function Signature

```typescript
function stringifyDocument(
  document: IODocument,
  options?: StringifyDocumentOptions
): string
```

### Options

```typescript
interface StringifyDocumentOptions {
  includeHeader?: boolean              // Include header definitions (default: true)
  includeSectionNames?: boolean        // Include section names (default: true)
  headerSeparator?: string             // Separator after header (default: '---')
  sectionSeparator?: string            // Between sections (default: '===')
  sectionsFilter?: (section: Section) => boolean  // Filter sections
  definitionsFormat?: 'io' | 'json'    // Format for definitions (default: 'io')
  indent?: string                      // Indentation for data
  skipErrors?: boolean                 // Exclude error objects from collections
}
```

### Features

1. **Header Formatting**
   - IO format: Native Internet Object syntax
   - JSON format: Standard JSON for definitions

2. **Section Filtering**
   - Filter callback to exclude specific sections
   - Useful for exporting partial documents

3. **Custom Separators**
   - Control header/section boundaries
   - Adapt to different formatting needs

4. **Pretty Printing**
   - Indentation support for readable output
   - Configurable indent string

5. **Error Exclusion**
   - Skip error objects in collections
   - Clean output for valid data only

### Usage Examples

#### Full Document with Header

```typescript
import { stringifyDocument } from 'internet-object';

const io = stringifyDocument(doc);

// Output:
// $User: name: string, age: number
// $Product: name: string, price: number
// @apiKey: secret-123
// @maxRetries: 3
// ---
// === users ===
// Alice, 28
// ---
// Bob, 35
// ===
// === products ===
// Widget, 19.99
// ---
// Gadget, 29.99
```

#### Without Header

```typescript
const io = stringifyDocument(doc, {
  includeHeader: false
});

// Output:
// === users ===
// Alice, 28
// ---
// Bob, 35
// ===
// === products ===
// Widget, 19.99
// ---
// Gadget, 29.99
```

#### Custom Separators

```typescript
const io = stringifyDocument(doc, {
  headerSeparator: '\n\n',
  sectionSeparator: '\n---\n'
});

// Output:
// $User: name: string, age: number
//
//
// Alice, 28
// ---
// Bob, 35
```

#### Section Filtering

```typescript
const io = stringifyDocument(doc, {
  sectionsFilter: section => section.name !== 'internal'
});

// Only exports sections where name !== 'internal'
```

#### Pretty Printing

```typescript
const io = stringifyDocument(doc, {
  indent: '  ',
  includeSectionNames: true
});

// Indented output with readable formatting
```

#### JSON Format for Definitions

```typescript
const io = stringifyDocument(doc, {
  definitionsFormat: 'json'
});

// Output:
// {
//   "$User": "name: string, age: number",
//   "@apiKey": "secret-123"
// }
// ---
// === users ===
// ...
```

#### Skip Error Objects

```typescript
const io = stringifyDocument(docWithErrors, {
  skipErrors: true  // Exclude validation error objects
});
```

---

## documentToObject API

### Function Signature

```typescript
function documentToObject(
  document: IODocument,
  options?: { skipErrors?: boolean }
): any
```

### Purpose

Convert IODocument to plain JavaScript object for:
- JSON serialization
- API responses
- External system integration
- Debugging and inspection

### Usage Examples

#### Basic Conversion

```typescript
import { documentToObject } from 'internet-object';

const obj = documentToObject(doc);

// Result:
// {
//   header: {
//     definitions: {
//       $User: 'name: string, age: number',
//       $Product: 'name: string, price: number',
//       '@apiKey': 'secret-123'
//     },
//     schema: 'name: string, age: number'
//   },
//   sections: [
//     {
//       name: 'users',
//       data: [
//         { name: 'Alice', age: 28 },
//         { name: 'Bob', age: 35 }
//       ]
//     },
//     {
//       name: 'products',
//       data: [
//         { name: 'Widget', price: 19.99 },
//         { name: 'Gadget', price: 29.99 }
//       ]
//     }
//   ]
// }
```

#### Skip Error Objects

```typescript
const obj = documentToObject(docWithErrors, { skipErrors: true });

// Only valid data included, error objects excluded
```

#### JSON Serialization

```typescript
const json = JSON.stringify(documentToObject(doc), null, 2);
console.log(json);

// Pretty-printed JSON for APIs
```

---

## Round-Trip Workflow

### Load → Modify → Stringify

```typescript
// 1. Load document from external data
const doc = loadDocument({
  header: {
    definitions: { $User: 'name: string, age: number, active: bool' }
  },
  sections: [
    {
      name: 'users',
      schemaName: '$User',
      data: [
        { name: 'Alice', age: 28, active: true },
        { name: 'Bob', age: 35, active: false }
      ]
    }
  ]
});

// 2. Modify data
const users = doc.sections.get('users').data as Collection<InternetObject>;
for (const user of users) {
  if (!user.get('active')) {
    user.set('active', true);  // Activate all users
  }
}

// 3. Serialize back to IO format
const output = stringifyDocument(doc, { indent: '  ' });
console.log(output);
```

### API Integration

```typescript
// Receive data from API
const apiResponse = await fetch('/api/users').then(r => r.json());

// Load into document
const doc = loadDocument({
  header: {
    definitions: { $User: 'name: string, email: string' }
  },
  data: apiResponse.users
}, {
  defaultSchema: '$User',
  strict: false,  // Collect errors, don't fail
  errorCollector: err => console.warn('Validation error:', err)
});

// Process and export
const validUsers = doc.sections.get(0).data;
const exportData = documentToObject(doc, { skipErrors: true });

await fetch('/api/export', {
  method: 'POST',
  body: JSON.stringify(exportData)
});
```

---

## Schema Resolution Priority

When loading a section, schemas are resolved in this order:

1. **Section-specific schema**: `section.schemaName` from `DocumentData`
2. **Per-section option**: `options.sectionSchemas[sectionName]`
3. **Default schema option**: `options.defaultSchema`
4. **Header schema**: `header.schema` from `DocumentData`

Example:

```typescript
loadDocument(
  {
    header: {
      definitions: { $User: '...' },
      schema: '$User'  // Priority 4 (lowest)
    },
    sections: [
      { name: 'admins', schemaName: '$Admin', data: [...] }  // Priority 1 (highest)
    ]
  },
  {
    defaultSchema: '$User',  // Priority 3
    sectionSchemas: {
      admins: '$SuperAdmin'  // Priority 2 (overrides section.schemaName)
    }
  }
);
```

---

## Error Handling Strategies

### Non-Strict Mode (Default)

```typescript
const errors: ValidationError[] = [];

const doc = loadDocument(data, {
  errorCollector: err => errors.push(err),
  strict: false  // Continue on errors
});

// Check errors after loading
if (errors.length > 0) {
  console.warn(`${errors.length} validation errors occurred`);
  errors.forEach(err => console.error(err.message));
}

// Document still created with valid + error objects
const validItems = doc.sections.get(0).data.filter(item => !(item instanceof Error));
```

### Strict Mode

```typescript
try {
  const doc = loadDocument(data, {
    strict: true  // Throw on first error
  });

  // Only executes if no errors
  console.log('Document loaded successfully');
} catch (error) {
  console.error('Validation failed:', error.message);
  // Handle error appropriately
}
```

### Partial Processing

```typescript
// Load multiple sections, collect errors per section
const sectionErrors = new Map<string, ValidationError[]>();

const doc = loadDocument(
  {
    sections: [
      { name: 'users', data: usersData },
      { name: 'products', data: productsData }
    ]
  },
  {
    errorCollector: err => {
      const sectionName = err.path?.[0] || 'unknown';
      if (!sectionErrors.has(sectionName)) {
        sectionErrors.set(sectionName, []);
      }
      sectionErrors.get(sectionName)!.push(err);
    }
  }
);

// Report errors by section
sectionErrors.forEach((errors, section) => {
  console.log(`Section '${section}': ${errors.length} errors`);
});
```

---

## Test Coverage

**File**: `tests/facade/document.test.ts`
**Tests**: 23 tests, all passing

### Test Categories

1. **loadDocument**: Single sections, multiple sections, header integration
2. **Schema Resolution**: IO text, Schema objects, definition references
3. **Error Handling**: Strict mode, non-strict mode, error collection
4. **stringifyDocument**: With/without header, multiple sections, filtering
5. **documentToObject**: Plain object conversion, skipErrors
6. **Round-Trip**: Load → stringify → load integrity

---

## Performance Considerations

- **Lazy Schema Compilation**: Schemas compiled only when needed
- **Section-Level Processing**: Each section processed independently
- **Error Collection**: Minimal overhead in non-strict mode
- **Streaming Potential**: Document structure supports streaming sections

---

## Best Practices

1. **Use Definitions for Reusable Schemas**
   ```typescript
   {
     header: {
       definitions: {
         $BaseUser: 'name: string, email: string',
         $Admin: '$BaseUser, role: string'  // Extend base schema
       }
     }
   }
   ```

2. **Validate at Document Load**
   ```typescript
   // Catch errors early
   const doc = loadDocument(externalData, {
     strict: true,  // Fail fast on invalid data
     defaultSchema: '$User'
   });
   ```

3. **Filter Sensitive Sections on Export**
   ```typescript
   stringifyDocument(doc, {
     sectionsFilter: s => !s.name?.startsWith('private_')
   });
   ```

4. **Use Error Collector for Logging**
   ```typescript
   loadDocument(data, {
     errorCollector: err => logger.warn('Validation error', err),
     strict: false
   });
   ```

5. **Merge External Definitions for Modularity**
   ```typescript
   const commonDefs = loadDefinitionsFromConfig();
   loadDocument(data, { definitions: commonDefs });
   ```

---

## Conclusion

The document-level APIs provide comprehensive functionality for:

✅ **Complete Document Structure**: Header (definitions + schema) + Sections
✅ **Flexible Schema Resolution**: Multiple sources and priority
✅ **Error Handling**: Strict and non-strict modes
✅ **Multiple Sections**: Named/unnamed with per-section schemas
✅ **Formatting Options**: Custom separators, filtering, indentation
✅ **Round-Trip Integrity**: Load → modify → stringify workflows
✅ **External Integration**: Plain object conversion for APIs

**Test Coverage**: 23 tests, all passing
**Lines of Code**: ~400 lines across 2 main files
**Integration**: Seamless with existing load/stringify APIs
