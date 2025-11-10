# Internet Object Serialization & Deserialization Guide

> **Comprehensive guide for converting between IO strings, JavaScript objects, and streaming data**
> **Status:** Design Phase
> **Created:** November 10, 2025
>
> **Related Documents:**
> - [SERIALIZATION-ARCHITECTURE.md](./SERIALIZATION-ARCHITECTURE.md) - Low-level implementation details and class hierarchies
> - [SCHEMA-REVAMP-PROPOSAL.md](./SCHEMA-REVAMP-PROPOSAL.md) - Schema system architecture and TypeSchema design
>
> **Document Purpose:**
> This guide provides **high-level usage patterns**, **real-world examples**, and **API documentation** for serialization and deserialization. For **implementation architecture**, see SERIALIZATION-ARCHITECTURE.md.

---

## 🎯 Overview

Internet Object supports bidirectional conversion:
- **Deserialization (Parsing)**: IO String → JavaScript Objects
- **Serialization**: JavaScript Objects → IO String
- **Validation**: Schema-driven validation during both operations
- **Streaming**: Support for large datasets and progressive processing

---

## ⚡ Quick Reference

### Common Patterns

```typescript
// ============ DESERIALIZATION (String → Object) ============

// Parse IO string
const doc = io.doc`...`;
const doc = io.parse(ioString);
const doc = io.parse(ioString, { schema });

// ============ SERIALIZATION (Object → String) ============

// Create new document from data
const doc = IODocument.load(data);
const doc = IODocument.load(data, schema);

// Load with definitions (variables, schemas, metadata)
const doc = IODocument.loadWithDefs(data, new IODefinitions()
  .addVar('@varName', value)
  .addSchema('$schemaName', schema)
  .addMeta('metaKey', metaValue)
);

// Load into existing document
doc.load(data);                          // Append to main section
doc.load(data, { replace: true });       // Replace data
doc.load(data, { validate: true });      // Validate

// Load into sections
doc.sections['people'].load(peopleData);              // Named section
doc.sections[0].load(data);                           // By index
doc.loadSection('products', productsData, '$schema'); // Create + load

// Serialize to string
const ioString = doc.toIO();
const ioString = doc.toIO({ pretty: true, includeDefinitions: true });
```

---

## 📖 Table of Contents

1. [Deserialization Patterns](#deserialization-patterns)
2. [Serialization Patterns](#serialization-patterns)
3. [Real-World Use Cases](#real-world-use-cases)
4. [Schema Placement Strategies](#schema-placement-strategies)
5. [Streaming & Performance](#streaming--performance)
6. [Future: References (RFC 3986)](#future-references-rfc-3986)

---

## 1. Deserialization Patterns

### 1.1 Simple Object (String → Object)

**Input (IO String):**
```io
name, age, isActive, joiningDt, address: {street, city, state}, colors
---
John Doe, 25, T, d'2022-01-01', {Bond Street, New York, NY}, [red, blue]
```

**Deserialization:**
```typescript
// Pattern 1: Template literal (current)
const doc = io.doc`
  name, age, isActive, joiningDt, address: {street, city, state}, colors
  ---
  John Doe, 25, T, d'2022-01-01', {Bond Street, New York, NY}, [red, blue]
`;

// Pattern 2: Parse from string
const ioString = `...`; // IO string
const doc = io.parse(ioString);
const doc = IODocument.parse(ioString);

// Pattern 3: Parse with schema validation
const doc = io.parse(ioString, { schema: mySchema });
```

**Output (JavaScript Object):**
```typescript
{
  name: 'John Doe',
  age: 25,
  isActive: true,
  joiningDt: new Date('2022-01-01'),
  address: {
    street: 'Bond Street',
    city: 'New York',
    state: 'NY'
  },
  colors: ['red', 'blue']
}
```

---

### 1.2 Collection (String → Array of Objects)

**Input (IO String):**
```io
name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive
---
~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T
~ Bob Johnson, 22, m, d'2022-02-20', {Oak Street, Chicago, IL}, [blue, black], T
~ Rachel Green, 31, f, d'2021-12-11', {Sunset Boulevard, Los Angeles, CA}, [purple, pink], T
```

**Deserialization:**
```typescript
const doc = io.doc`...`;

// Access collection data
const people: Array<Person> = doc.data;

// Or parse directly to array
const people = io.collection.parse(ioString);
```

**Output (JavaScript Array):**
```typescript
[
  {
    name: 'Alice Smith',
    age: 28,
    gender: 'f',
    joiningDt: new Date('2021-04-15'),
    address: { street: 'Elm Street', city: 'Dallas', state: 'TX' },
    colors: ['yellow', 'green'],
    isActive: true
  },
  // ... more records
]
```

---

### 1.3 Separate Schema (Schema + Data)

**Input (IO String with Separate Schema):**
```io
# Schema Section
~ @officeAddr: {Santacruze, California, CA}
~ $address: {
      street: string,
      city: {string, choices:[New York, California, San Fransisco, Washington]},
      state: {string, maxLen:2, choices:[NY, CA, WA]}
    }
~ $schema: {
    name: string,
    age: {int, min:20, max:35},
    joiningDt: date,
    gender?: {string, choices:[m, f, u]},
    currentAddress: $address,
    permanentAddress?*: $address,
    colors?: [string],
    isActive?: {bool, F}
  }

# Data Section
---
~ recordCount: 23
~ page: 3
~ prevPage: "/api/v1/people/page/2"
~ nextPage: T
---
~ John Doe, 25, d'2022-01-01', m, @officeAddr, @officeAddr, [red, green, blue]
~ Jane Done, 20, d'2022-10-10', f, {Bond Street, "New York", NY}, N, [green, purple]
```

**Deserialization:**
```typescript
const doc = io.doc`...`;

// Access schema
const schema = doc.schema;  // Compiled schema object

// Access metadata
const metadata = doc.metadata;
// { recordCount: 23, page: 3, prevPage: "/api/v1/people/page/2", nextPage: true }

// Access validated data
const people = doc.data;

// Variable resolution
const officeAddr = doc.getVariable('@officeAddr');
// { street: 'Santacruze', city: 'California', state: 'CA' }
```

---

### 1.4 Multiple Sections (Different Types in One Document)

**Input (IO String):**
```io
~ $borrower: {userId:string, dueDate:date}
~ $borrowedBooks: {bookIsbn:number, borrowDate:date}
~ $users: {userId:string, name:string, membershipType:{type:string, choices:[Standard, Premium]}, currentlyBorrowedBooks:[$borrowedBooks]}
~ $books: {title:string, author:string, isbn:number, availability:bool, categories:[string], published:number, borrowedBy?: $borrower}
~ $library: {name: string, address: string}

--- $library
# Bookville Library
City Central Library, "123 Library St, Bookville"

--- $books
~ The Great Gatsby, "F. Scott Fitzgerald", 1234567890, T,[Fiction, Classic], 1925
~ "1984", George Orwell, 2345678901, F, [Fiction, Dystopian], 1949, { user123, d"2024-02-20"}

--- subscribers: $users
~ user123, John Doe, Standard,  [{2345678901,d"2024-01-20"}]
~ user456, Jane Smith, Premium, []
```

**Deserialization:**
```typescript
const doc = io.doc`...`;

// Access different sections
const library = doc.getSection('library');
// { name: 'City Central Library', address: '123 Library St, Bookville' }

const books = doc.getSection('books');
// [
//   { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', ... },
//   { title: '1984', author: 'George Orwell', ... }
// ]

const subscribers = doc.getSection('subscribers');
// [
//   { userId: 'user123', name: 'John Doe', membershipType: 'Standard', ... },
//   { userId: 'user456', name: 'Jane Smith', membershipType: 'Premium', ... }
// ]

// Or iterate all sections
for (const [name, data] of doc.sections()) {
  console.log(`Section ${name}:`, data);
}
```

---

## 2. Serialization Patterns

### 2.1 Object → IO String (Simple)

**Input (JavaScript Object):**
```typescript
const person = {
  name: 'John Doe',
  age: 25,
  isActive: true,
  joiningDt: new Date('2022-01-01'),
  address: {
    street: 'Bond Street',
    city: 'New York',
    state: 'NY'
  },
  colors: ['red', 'blue']
};
```

**Serialization (Option A - Load then Stringify):**
```typescript
// Simple load - data only
const doc = IODocument.load(person);

// Load with schema validation
const doc = IODocument.load(person, personSchema);

// Load with definitions (schema, metadata, variables)
const doc = IODocument.loadWithDefs(person, new IODefinitions()
  .addSchema('$person', personSchema)
  .addMeta('created', new Date())
  .addMeta('source', 'api')
  .addMeta('version', '1.0')
);

// Load with variables and schema
const doc = IODocument.loadWithDefs(person, new IODefinitions()
  .addVar('@officeAddr', { street: '123 Tech St', city: 'SF', state: 'CA' })
  .addVar('@homeAddr', { street: '456 Home Ave', city: 'Oakland', state: 'CA' })
  .addSchema('$person', personSchema)
  .addSchema('$address', addressSchema)
);

// Serialize to IO string
const ioString = doc.toString();
const ioString = doc.toIO();  // More explicit

// With additional options during serialization
const ioString = doc.toIO({
  validate: true,  // Re-validates during serialization
  pretty: true,
  includeDefinitions: true  // Include all definitions (schemas, vars, metadata)
});
```**Serialization (Option B - Direct Stringify):**
```typescript
// Direct serialization
const ioString = io.stringify(person);

// With schema
const ioString = io.stringify(person, { schema: mySchema });

// With options
const ioString = io.stringify(person, {
  schema: mySchema,
  pretty: true,
  indent: 2,
  includeDefinitions: true  // Include schema and metadata in output
});
```

**Output (IO String):**
```io
name, age, isActive, joiningDt, address: {street, city, state}, colors
---
John Doe, 25, T, d'2022-01-01', {Bond Street, New York, NY}, [red, blue]
```

---

### 2.2 Array → IO String (Collection)

**Input (JavaScript Array):**
```typescript
const people = [
  {
    name: 'Alice Smith',
    age: 28,
    gender: 'f',
    joiningDt: new Date('2021-04-15'),
    address: { street: 'Elm Street', city: 'Dallas', state: 'TX' },
    colors: ['yellow', 'green'],
    isActive: true
  },
  {
    name: 'Bob Johnson',
    age: 22,
    gender: 'm',
    joiningDt: new Date('2022-02-20'),
    address: { street: 'Oak Street', city: 'Chicago', state: 'IL' },
    colors: ['blue', 'black'],
    isActive: true
  }
];
```

**Serialization:**
```typescript
// Load collection into document
const doc = IODocument.load(people);

// Load with schema
const doc = IODocument.load(people, peopleSchema);

// Load with full definitions
const doc = IODocument.loadWithDefs(people, new IODefinitions()
  .addSchema('$person', peopleSchema)
  .addMeta('recordCount', people.length)
  .addMeta('exportDate', new Date())
);

// Serialize
const ioString = doc.toIO();

// Or direct (without IODocument wrapper)
const ioString = io.collection.stringify(people);

// With schema
const ioString = io.collection.stringify(people, peopleSchema);
```

**Output (IO String):**
```io
name, age, gender, joiningDt, address: {street, city, state}, colors, isActive
---
~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T
~ Bob Johnson, 22, m, d'2022-02-20', {Oak Street, Chicago, IL}, [blue, black], T
```

---

### 2.3 With Metadata (API Response Pattern)

**Input (JavaScript Object with Metadata):**
```typescript
const apiResponse = {
  metadata: {
    success: true,
    errorMessage: null,
    recordCount: 102,
    pageNo: 11,
    nextPage: '/api/v1/products?page=12',
    prevPage: '/api/v1/products?page=10'
  },
  data: [
    {
      pid: '1a2b3c4d-5e6f-7g8h',
      name: 'Apple iPhone 13',
      shortDesc: 'The latest iPhone',
      image: 'https://example.com/iphone13.jpg',
      price: 999.99,
      isAvailable: true,
      category: 'electronics',
      offer: {
        discount: 10,
        validTill: new Date('2022-12-31')
      },
      tags: ['apple', 'iphone', 'smartphone']
    },
    // ... more products
  ]
};
```

**Serialization:**
```typescript
// Load with metadata using definitions
const doc = IODocument.loadWithDefs(apiResponse.data, new IODefinitions()
  .addSchema('$product', productSchema)
  .addMeta('success', apiResponse.metadata.success)
  .addMeta('errorMessage', apiResponse.metadata.errorMessage)
  .addMeta('recordCount', apiResponse.metadata.recordCount)
  .addMeta('pageNo', apiResponse.metadata.pageNo)
  .addMeta('nextPage', apiResponse.metadata.nextPage)
  .addMeta('prevPage', apiResponse.metadata.prevPage)
);

const ioString = doc.toIO();
```

**Output (IO String):**
```io
~ success: T
~ errorMessage: N
~ recordCount: 102
~ pageNo: 11
~ nextPage: /api/v1/products?page=12
~ prevPage: /api/v1/products?page=10
---
~ 1a2b3c4d-5e6f-7g8h, Apple iPhone 13, The latest iPhone, "https://example.com/iphone13.jpg", 999.99, T, electronics, {10, d'2022-12-31'}, [apple, iphone, smartphone]
```

---

### 2.4 Multiple Sections (Complex Document)

**Input (JavaScript Objects):**
```typescript
const libraryData = {
  library: {
    name: 'City Central Library',
    address: '123 Library St, Bookville'
  },
  books: [
    {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      isbn: 1234567890,
      availability: true,
      categories: ['Fiction', 'Classic'],
      published: 1925
    },
    {
      title: '1984',
      author: 'George Orwell',
      isbn: 2345678901,
      availability: false,
      categories: ['Fiction', 'Dystopian'],
      published: 1949,
      borrowedBy: {
        userId: 'user123',
        dueDate: new Date('2024-02-20')
      }
    }
  ],
  subscribers: [
    {
      userId: 'user123',
      name: 'John Doe',
      membershipType: 'Standard',
      currentlyBorrowedBooks: [
        { bookIsbn: 2345678901, borrowDate: new Date('2024-01-20') }
      ]
    },
    {
      userId: 'user456',
      name: 'Jane Smith',
      membershipType: 'Premium',
      currentlyBorrowedBooks: []
    }
  ]
};
```

**Serialization:**
```typescript
// Create document with definitions
const doc = new IODocument(new IODefinitions()
  .addSchema('$borrower', borrowerSchema)
  .addSchema('$borrowedBooks', borrowedBooksSchema)
  .addSchema('$users', usersSchema)
  .addSchema('$books', booksSchema)
  .addSchema('$library', librarySchema)
);

// Add sections with data
doc.addSection('library', libraryData.library, '$library');
doc.addSection('books', libraryData.books, '$books');
doc.addSection('subscribers', libraryData.subscribers, '$users');

// Or create sections and load separately
doc.createSection('library', '$library');
doc.sections['library'].load(libraryData.library);

// Serialize
const ioString = doc.toIO({
  includeDefinitions: true  // Include schema definitions
});
```

**Output (IO String):**
```io
~ $borrower: {userId:string, dueDate:date}
~ $borrowedBooks: {bookIsbn:number, borrowDate:date}
~ $users: {userId:string, name:string, membershipType:{type:string, choices:[Standard, Premium]}, currentlyBorrowedBooks:[$borrowedBooks]}
~ $books: {title:string, author:string, isbn:number, availability:bool, categories:[string], published:number, borrowedBy?: $borrower}
~ $library: {name: string, address: string}

--- $library
City Central Library, "123 Library St, Bookville"

--- $books
~ The Great Gatsby, "F. Scott Fitzgerald", 1234567890, T,[Fiction, Classic], 1925
~ "1984", George Orwell, 2345678901, F, [Fiction, Dystopian], 1949, { user123, d"2024-02-20"}

--- subscribers: $users
~ user123, John Doe, Standard,  [{2345678901,d"2024-01-20"}]
~ user456, Jane Smith, Premium, []
```

---

### 2.5 Loading into Existing Documents and Sections

#### 2.5.1 Load into New Document

```typescript
// Simple load - data only
const doc = IODocument.load(person);

// Load with schema
const doc = IODocument.load(person, personSchema);

// Load with definitions (variables, schemas, metadata)
const doc = IODocument.loadWithDefs(person, new IODefinitions()
  .addSchema('$person', personSchema)
  .addMeta('version', '1.0')
  .addMeta('created', new Date())
);

// Complex example with all definition types
const doc = IODocument.loadWithDefs(person, new IODefinitions()
  // Variables (reusable values)
  .addVar('@defaultAddr', { street: '123 Main St', city: 'NYC', state: 'NY' })
  .addVar('@companyName', 'Tech Corp Inc.')

  // Schema definitions
  .addSchema('$address', addressSchema)
  .addSchema('$person', personSchema)

  // Metadata
  .addMeta('version', '2.0')
  .addMeta('created', new Date())
  .addMeta('source', 'hr-system')
  .addMeta('author', 'admin@example.com')
);
```

#### 2.5.2 Load into Existing Document (Append/Replace)

```typescript
// Create document with initial data and definitions
const doc = IODocument.loadWithDefs(initialPeople, new IODefinitions()
  .addSchema('$person', personSchema)
  .addMeta('created', new Date())
);

// Load more data into same document (appends to main section)
doc.load(morePeople);

// Load with validation against existing schema
doc.load(morePeople, { validate: true });

// Replace existing data
doc.load(newPeople, { replace: true });

// Add more definitions to existing document
doc.definitions
  .addVar('@newVar', 'value')
  .addMeta('updated', new Date());
```

#### 2.5.3 Load into Specific Section

**Scenario:** Multi-section document with different data types

```typescript
// Create document with multiple sections and definitions
const doc = new IODocument(new IODefinitions()
  .addSchema('$person', personSchema)
  .addSchema('$product', productSchema)
  .addSchema('$order', orderSchema)
);

// Create sections (schemas are referenced by name from definitions)
doc.createSection('people', '$person');
doc.createSection('products', '$product');
doc.createSection('orders', '$order');

// Load data into specific sections
doc.sections['people'].load(peopleArray);
doc.sections['products'].load(productsArray);
doc.sections['orders'].load(ordersArray);

// Or by index
doc.sections[0].load(morePeople);
doc.sections[1].load(moreProducts);

// Or by name (alternative syntax)
doc.getSection('people').load(morePeople);

// Section inherits schema, so data is validated automatically
doc.sections['people'].load(invalidPerson);  // Throws validation error
```

#### 2.5.4 Load with Schema Override

**Scenario:** Section has a schema, but you want to load data with different schema

```typescript
// Section created with original schema
const doc = new IODocument();
doc.createSection('people', { schema: basicPersonSchema });

// Load data with extended schema (overrides section schema for this operation)
doc.sections['people'].load(detailedPeople, {
  schema: detailedPersonSchema,  // Use different schema
  merge: true  // Merge with existing data
});

// Section retains original schema for future operations
// unless explicitly changed
doc.sections['people'].setSchema(detailedPersonSchema);
```

#### 2.5.5 Dynamic Section Creation via Load

```typescript
const doc = new IODocument();

// Load creates section if it doesn't exist
doc.loadSection('users', usersArray, { schema: userSchema });
doc.loadSection('products', productsArray, { schema: productSchema });

// Equivalent to:
// doc.createSection('users', { schema: userSchema });
// doc.sections['users'].load(usersArray);
```

#### 2.5.6 Incremental Loading (Streaming Pattern)

```typescript
const doc = new IODocument();
doc.createSection('logs', { schema: logSchema });

// Load data incrementally (e.g., from streaming source)
for await (const logBatch of logStream) {
  doc.sections['logs'].load(logBatch, {
    append: true,  // Always append, never replace
    validate: true  // Validate each batch
  });

  // Optionally flush to disk periodically
  if (doc.sections['logs'].data.length >= 10000) {
    await doc.sections['logs'].flushToDisk('logs.io');
    doc.sections['logs'].clear();  // Clear memory
  }
}
```

#### 2.5.7 Load with Schema from Document

**Scenario:** Document already has schemas defined, load data using those schemas

```typescript
// Document with schema definitions
const docString = `
~ $person: {name: string, age: {int, min:0, max:150}}
~ $product: {id: string, name: string, price: number}
---
`;

const doc = io.doc.parse(docString);

// Load data - automatically uses $person schema from definitions
doc.load(peopleArray);  // Validates against $person schema if defined

// Load into named section with explicit schema reference (by name)
doc.loadSection('products', productsArray, {
  schema: '$product'  // Reference schema by name from definitions
});

// Load with automatic schema resolution
doc.loadSection('people', peopleArray);
// Looks up '$people' schema from definitions automatically

// Or retrieve schema object and use it
const personSchema = doc.getDefinition('$person');
const newDoc = IODocument.load(newPeople, { schema: personSchema });

// Multiple schemas in one document - each section uses its own
const doc = io.doc.parse(`
~ $user: {id: string, name: string}
~ $post: {id: string, title: string, authorId: string}
~ $comment: {id: string, postId: string, text: string}
---
`);

doc.loadSection('users', usersArray);      // Uses $user schema
doc.loadSection('posts', postsArray);      // Uses $post schema
doc.loadSection('comments', commentsArray); // Uses $comment schema
```

#### 2.5.8 Load Patterns: Visual Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                    Loading Data Patterns                        │
└─────────────────────────────────────────────────────────────────┘

1. CREATE NEW DOCUMENT
   ┌──────────────┐
   │ IODocument   │
   │ .load(data)  │◄─── data + optional schema
   │ .loadWithDefs│◄─── data + IODefinitions
   └──────────────┘

2. LOAD INTO EXISTING DOCUMENT
   ┌──────────────┐
   │  doc         │
   │  .load(data) │◄─── { replace?, append?, validate? }
   └──────────────┘

3. LOAD INTO SECTIONS
   ┌──────────────┐
   │  doc         │
   │  .sections   │
   │   ['name']   │◄─── .load(data, options)
   │   [index]    │◄─── .load(data, options)
   └──────────────┘

4. CREATE SECTION + LOAD
   ┌──────────────┐
   │  doc         │
   │ .loadSection │◄─── (name, data, { schema })
   └──────────────┘

SCHEMA INHERITANCE HIERARCHY:
┌────────────────────────────────────────────────────────────┐
│ Document Level                                             │
│ ├─ Definitions: { $person, $product, $order }             │
│ └─ Metadata: { version, created, source }                 │
│                                                            │
│ Section Level                                              │
│ ├─ Section 0 (main): uses $person schema                 │
│ ├─ Section 1 (products): uses $product schema            │
│ └─ Section 2 (orders): uses $order schema                │
│                                                            │
│ Load Operation Level                                       │
│ └─ Can override section schema: .load(data, { schema })  │
└────────────────────────────────────────────────────────────┘
```

#### 2.5.9 Complete Example: Building Complex Document

```typescript
// Create document with definitions upfront
const doc = new IODocument(new IODefinitions()
  // Schema definitions
  .addSchema('$address', addressSchema)
  .addSchema('$person', personSchema)
  .addSchema('$company', companySchema)

  // Variables (reusable values)
  .addVar('@defaultCity', 'San Francisco')
  .addVar('@defaultState', 'CA')

  // Metadata
  .addMeta('created', new Date())
  .addMeta('version', '2.0')
  .addMeta('source', 'hr-system')
  .addMeta('author', 'admin@example.com')
);

// Load data into main section (uses first matching schema or specify)
doc.load(peopleData, { schema: '$person' });

// Create additional sections
doc.createSection('companies', '$company');
doc.sections['companies'].load(companiesData);

// Add more people later
doc.load(morePeople, { append: true, validate: true });

// Add company with inline data
doc.sections['companies'].load({
  name: 'Tech Corp',
  employees: ['Alice', 'Bob', 'Charlie'],
  headquarters: {
    street: '123 Tech St',
    city: 'San Francisco',
    state: 'CA'
  }
}, { append: true });

// Modify definitions at any time
doc.definitions
  .addMeta('updated', new Date())
  .addVar('@newVariable', 'some value');

// Serialize entire document
const ioString = doc.toIO({
  includeDefinitions: true,
  pretty: true
});

// Output:
// ~ $address: {street: string, city: string, state: {string, maxLen:2}}
// ~ $person: {name: string, age: {int, min:0, max:150}, address: $address}
// ~ $company: {name: string, employees: [string], headquarters: $address}
// ~ @defaultCity: San Francisco
// ~ @defaultState: CA
// ~ @newVariable: some value
// ~ created: dt'2025-11-10T...'
// ~ version: 2.0
// ~ source: hr-system
// ~ author: admin@example.com
// ~ updated: dt'2025-11-10T...'
// ---
// ~ Alice, 30, {123 Main St, New York, NY}
// ~ Bob, 25, {456 Oak Ave, Boston, MA}
// --- companies: $company
// ~ Tech Corp, [Alice, Bob, Charlie], {123 Tech St, San Francisco, CA}
```---

## 3. Real-World Use Cases

### 3.1 REST API Response Serialization

**Scenario:** Express.js API returning product data

```typescript
import express from 'express';
import io from 'internet-object';

const app = express();

app.get('/api/v1/products', async (req, res) => {
  // Fetch data from database
  const products = await db.products.find({ page: req.query.page });

  // Serialize to IO format
  const doc = IODocument.load(products, {
    metadata: {
      success: true,
      recordCount: products.length,
      pageNo: req.query.page,
      nextPage: `/api/v1/products?page=${parseInt(req.query.page) + 1}`,
      prevPage: req.query.page > 1 ? `/api/v1/products?page=${parseInt(req.query.page) - 1}` : null
    }
  });

  // Return as IO string
  res.type('text/plain').send(doc.toIO({ schema: productSchema }));

  // Or JSON if client prefers
  if (req.accepts('application/json')) {
    res.json(doc.toJSON());
  }
});
```

---

### 3.2 Structured Logging (IO Format)

**Scenario:** Log aggregation system storing structured logs

```typescript
// Logger that outputs IO format
class IOLogger {
  private logs: LogEntry[] = [];

  log(level: string, message: string, user: string, session: string, details: any) {
    this.logs.push({
      timestamp: new Date(),
      level,
      message,
      user,
      session,
      details
    });
  }

  flush(): string {
    const doc = IODocument.load(this.logs, {
      schema: logSchema  // Validates log structure
    });

    const ioString = doc.toIO({ pretty: false });  // Compact for storage
    this.logs = [];  // Clear buffer
    return ioString;
  }
}

// Usage
const logger = new IOLogger();
logger.log('error', 'Login attempt failed', 'annbrown',
  '471dbfa8-c3d4-4888-b7a7-02bcfeeadf00',
  { ipAddress: '122.27.53.82', browser: 'Safari 14.0', os: 'Windows 10', device: 'Tablet' }
);

// Flush logs to file/database
const logString = logger.flush();
fs.appendFileSync('app.io.log', logString + '\n');
```

---

### 3.3 Configuration Files (Bidirectional)

**Scenario:** Application configuration with type safety

```typescript
// Load config from IO file
const configString = fs.readFileSync('app.config.io', 'utf8');
const config = io.object.parse(configString, { schema: configSchema });

// Modify config programmatically
config.database.maxConnections = 50;
config.features.newUI = true;

// Save back to IO format
const updatedConfigString = io.object.stringify(config, {
  schema: configSchema,
  pretty: true,
  indent: 2
});
fs.writeFileSync('app.config.io', updatedConfigString);
```

---

### 3.4 Employee Register (Large Dataset)

**Scenario:** HR system with 200+ employee records

```typescript
// Load from database
const employees = await db.employees.find();

// Serialize with schema
const doc = IODocument.load(employees, {
  schema: employeeSchema,
  metadata: {
    exportDate: new Date(),
    department: 'All',
    totalEmployees: employees.length
  }
});

// Export to IO file
const ioString = doc.toIO({
  includeDefinitions: true,  // Include schema for self-describing data
  pretty: true
});

fs.writeFileSync('employee-register.io', ioString);

// Later: Import back
const importedDoc = io.doc.parse(fs.readFileSync('employee-register.io', 'utf8'));
const importedEmployees = importedDoc.data;

// Validate and insert into database
for (const employee of importedEmployees) {
  await db.employees.upsert(employee);
}
```

---

## 4. Schema Placement Strategies

### 4.1 Inline Schema (Self-Describing)

**When to use:**
- Small documents
- Data shared across systems
- Long-term archival (schema preserved with data)

```io
~ $person: {name: string, age: {int, min:0, max:150}, email: string}
---
~ Alice, 30, alice@example.com
~ Bob, 25, bob@example.com
```

**Pros:**
- ✅ Self-describing data
- ✅ No external schema file needed
- ✅ Schema versioning embedded

**Cons:**
- ⚠️ Larger file size
- ⚠️ Redundant for collections with same schema

---

### 4.2 Separate Schema File

**When to use:**
- Large datasets
- Schema reuse across multiple files
- API endpoints with consistent structure

**Schema file (`person.schema.io`):**
```io
~ $person: {
  name: string,
  age: {int, min:0, max:150},
  email: {string, pattern: r'^[^\s@]+@[^\s@]+\.[^\s@]+$'}
}
```

**Data file (`people.data.io`):**
```io
~ Alice, 30, alice@example.com
~ Bob, 25, bob@example.com
```

**Usage:**
```typescript
// Load schema once
const schema = io.schema.parse(fs.readFileSync('person.schema.io', 'utf8'));

// Parse multiple data files with same schema
const people1 = io.collection.parse(fs.readFileSync('people.data.io', 'utf8'), { schema });
const people2 = io.collection.parse(fs.readFileSync('more-people.data.io', 'utf8'), { schema });
```

**Pros:**
- ✅ Smaller data files
- ✅ Schema reuse
- ✅ Centralized schema management

**Cons:**
- ⚠️ Need to manage schema files separately

---

### 4.3 Schema-less (Inferred)

**When to use:**
- Prototyping
- Simple data structures
- Dynamic data

```typescript
const data = [
  { name: 'Alice', age: 30, email: 'alice@example.com' },
  { name: 'Bob', age: 25, email: 'bob@example.com' }
];

// Serialize without schema (inferred from data)
const ioString = io.collection.stringify(data, { inferSchema: true });
```

**Output:**
```io
name, age, email
---
~ Alice, 30, alice@example.com
~ Bob, 25, bob@example.com
```

**Pros:**
- ✅ Quick and easy
- ✅ No schema maintenance

**Cons:**
- ⚠️ No validation
- ⚠️ Type information lost

---

### 4.4 Programmatic Schema (TypeScript First)

**When to use:**
- TypeScript-first applications
- Type-safe APIs
- Runtime validation with compile-time types

```typescript
// Define schema in TypeScript
const personSchema = new SchemaBuilder('person')
  .string('name', { minLength: 1, maxLength: 100 })
  .number('age', { type: 'int', min: 0, max: 150 })
  .string('email', { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  .build();

// TypeScript type derived from schema
type Person = SchemaType<typeof personSchema>;

// Use for both serialization and deserialization
const ioString = io.collection.stringify(people, { schema: personSchema });
const parsed: Person[] = io.collection.parse(ioString, { schema: personSchema });
```

**Pros:**
- ✅ Type-safe
- ✅ Single source of truth
- ✅ IDE autocomplete

**Cons:**
- ⚠️ Requires TypeScript
- ⚠️ Schema not embedded in output

---

## 5. Streaming & Performance

### 5.1 Streaming Deserialization (Large Files)

**Scenario:** Process 10GB employee register file without loading entire file into memory

```typescript
import { IOStreamParser } from 'internet-object';

// Create stream parser
const parser = new IOStreamParser({
  schema: employeeSchema,
  chunkSize: 1000  // Process 1000 records at a time
});

// Read file as stream
const readStream = fs.createReadStream('large-employee-register.io');

// Process chunks
parser.on('chunk', (employees: Employee[]) => {
  // Process 1000 employees at a time
  console.log(`Processing ${employees.length} employees...`);

  // Insert into database
  db.employees.bulkInsert(employees);
});

parser.on('metadata', (metadata) => {
  console.log('Document metadata:', metadata);
});

parser.on('end', () => {
  console.log('Finished processing all employees');
});

parser.on('error', (error) => {
  console.error('Parse error:', error);
});

// Pipe stream to parser
readStream.pipe(parser);
```

---

### 5.2 Streaming Serialization (Large Datasets)

**Scenario:** Export 1 million records to IO format

```typescript
import { IOStreamSerializer } from 'internet-object';

// Create stream serializer
const serializer = new IOStreamSerializer({
  schema: employeeSchema,
  includeDefinitions: true,
  bufferSize: 1000  // Buffer 1000 records before writing
});

// Write to file
const writeStream = fs.createWriteStream('export-employees.io');
serializer.pipe(writeStream);

// Write metadata
serializer.writeMetadata({
  exportDate: new Date(),
  totalRecords: 1000000
});

// Stream records from database
const cursor = db.employees.find().cursor();

for await (const employee of cursor) {
  serializer.write(employee);  // Validates and serializes
}

// Finish
serializer.end();

await new Promise((resolve) => writeStream.on('finish', resolve));
console.log('Export complete');
```

---

### 5.3 Progressive Loading (Web Applications)

**Scenario:** Load large dataset progressively in browser

```typescript
// Fetch with streaming support
const response = await fetch('/api/v1/products?page=all');
const reader = response.body.getReader();
const decoder = new TextDecoder();

const parser = new IOStreamParser({ schema: productSchema });

parser.on('chunk', (products) => {
  // Update UI progressively
  renderProducts(products);
});

// Read stream
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  parser.write(chunk);
}

parser.end();
```

---

## 6. Future: References (RFC 3986)

### 6.1 URI References (Planned)

**Scenario:** Link related documents without duplication

```io
# Main document (products.io)
~ $product: {id: string, name: string, category: ref<$category>}

--- products
~ prod-001, iPhone 13, #categories/electronics
~ prod-002, MacBook Pro, #categories/electronics
~ prod-003, Nike Shoes, #categories/sports

# External reference (categories.io)
--- categories
~ electronics, Electronics & Gadgets, true
~ sports, Sports & Outdoors, true
~ fashion, Fashion & Apparel, false
```

**Usage:**
```typescript
// Load with reference resolution
const doc = await io.doc.parse(fs.readFileSync('products.io', 'utf8'), {
  resolveRefs: true,
  baseUri: 'file:///data/'  // Base URI for relative references
});

// References automatically resolved
const product = doc.data[0];
console.log(product.category);
// { id: 'electronics', name: 'Electronics & Gadgets', active: true }
```

---

### 6.2 HTTP References

**Scenario:** Distributed data across multiple services

```io
# User document
~ $user: {
  id: string,
  name: string,
  orders: [ref<https://api.example.com/orders>]  # External API
}

--- users
~ user-001, Alice, [https://api.example.com/orders/123, https://api.example.com/orders/456]
```

**Usage:**
```typescript
// Automatic HTTP reference resolution
const doc = await io.doc.parse(userString, {
  resolveRefs: true,
  refResolver: async (uri) => {
    const response = await fetch(uri);
    return response.json();
  }
});

// Orders fetched automatically
const user = doc.data[0];
console.log(user.orders);
// [
//   { id: 123, total: 99.99, ... },
//   { id: 456, total: 149.99, ... }
// ]
```

---

### 6.3 Fragment References (Same Document)

**Scenario:** Complex nested structures with shared components

```io
~ $address: {street: string, city: string, state: string}
~ $person: {
  name: string,
  homeAddress: $address,
  workAddress: ref<#/vars/@officeAddr>  # Reference to variable
}

~ @officeAddr: {123 Business St, San Francisco, CA}

---
~ Alice, {456 Home St, Oakland, CA}, #/vars/@officeAddr
~ Bob, {789 Home Ave, Berkeley, CA}, #/vars/@officeAddr
```

**Usage:**
```typescript
const doc = io.doc.parse(docString, { resolveRefs: true });

// Both Alice and Bob reference the same office address object (identity preserved)
const alice = doc.data[0];
const bob = doc.data[1];

console.log(alice.workAddress === bob.workAddress);  // true (same object reference)
```

---

## 7. API Summary

### Deserialization API

```typescript
// Parse from string
io.doc`...`;                                    // Template literal
io.parse(ioString);                              // Parse document
io.object.parse(ioString);                       // Parse single object
io.collection.parse(ioString);                   // Parse collection
IODocument.parse(ioString, { schema });          // With schema validation

// Stream parsing
new IOStreamParser({ schema, chunkSize })        // Stream large files
```

### Serialization API

```typescript
// Load from objects (create new document)
IODocument.load(data);                           // Load object/array
IODocument.load(data, schema);                   // With schema validation
IODocument.loadWithDefs(data, definitions);      // With full definitions (vars, schemas, metadata)

// Load into existing document
doc.load(data);                                  // Append to main section
doc.load(data, { replace: true });               // Replace existing data
doc.load(data, { validate: true });              // Validate against doc schema

// Load into sections
doc.sections['name'].load(data);                 // Load into named section
doc.sections[0].load(data);                      // Load into section by index
doc.getSection('name').load(data);               // Alternative syntax
doc.loadSection('name', data, { schema });       // Create section + load

// Section-specific operations
doc.sections['name'].load(data, { append: true }); // Append to section
doc.sections['name'].load(data, { schema });       // Override section schema
doc.sections['name'].setSchema(schema);            // Change section schema
doc.sections['name'].clear();                      // Clear section data

// Stringify
doc.toIO();                                      // Serialize to IO string
doc.toIO({ schema, pretty, indent });            // With options
doc.toIO({ includeDefinitions: true });          // Include schema definitions
io.stringify(data);                              // Direct serialization
io.object.stringify(obj, { schema });            // Serialize object
io.collection.stringify(arr, { schema });        // Serialize collection

// Stream serialization
new IOStreamSerializer({ schema, bufferSize })   // Stream large datasets
```

### Schema API

```typescript
// Programmatic schema
new SchemaBuilder('name')
  .string('field', options)
  .number('field', options)
  .build();

// Schema from IO string
io.schema.parse(schemaString);

// Schema serialization
schema.toIO();                                   // Schema → IO string
```

---

## 8. Next Steps

1. **Implement Core Serialization** (Week 1-2)
   - [ ] IODocument.load() method
   - [ ] doc.toIO() method
   - [ ] io.stringify() facade
   - [ ] Basic type serializers

2. **Schema Integration** (Week 3)
   - [ ] Schema validation during serialization
   - [ ] Schema inference from data
   - [ ] Schema embedding in output

3. **Streaming Support** (Week 4-5)
   - [ ] IOStreamParser implementation
   - [ ] IOStreamSerializer implementation
   - [ ] Chunk-based processing
   - [ ] Memory-efficient large file handling

4. **References (Future)**
   - [ ] URI reference parsing
   - [ ] Fragment reference resolution
   - [ ] HTTP reference resolver
   - [ ] Circular reference detection

---

**Ready to implement!** 🚀
