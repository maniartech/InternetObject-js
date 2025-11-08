# Understanding Internet Object - Part 2: Working with Internet Object

In the [previous article](./json-to-io.md), we explored how Internet Object provides a more efficient alternative to JSON by separating schema from data. Now, let's dive into the practical aspects of working with Internet Object in your applications.

This article demonstrates how to parse, serialize, and manipulate Internet Object documents using JavaScript/TypeScript. While the examples use JavaScript, the concepts apply to other language implementations as well.

## Installation

First, install the Internet Object library:

```bash
npm install internet-object
```

or

```bash
yarn add internet-object
```

## Basic Concepts

Internet Object provides a clean, modern API using template literals. The main functions you'll use are:

- **`io.doc`** - Parse complete documents (with schema and data)
- **`io.defs`** - Define reusable schemas
- **`io.doc.with(schema)`** - Parse data with an external schema
- **`io.object`** - Parse single objects

## Parsing a Complete Document

When you have both schema and data in a single document, use `io.doc`:

```typescript
import io from 'internet-object';

const doc = io.doc`
  name, age, active, address: {street, city, state}, tags
  ---
  Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
`;

console.log(doc.toJSON());
```

**Output:**

```json
[
  {
    "name": "Spiderman",
    "age": 25,
    "active": true,
    "address": {
      "street": "Queens",
      "city": "New York",
      "state": "NY"
    },
    "tags": ["agile", "emotional"]
  }
]
```

Internet Object intelligently:

- Parses the schema to understand data structure
- Validates data against the schema
- Converts shorthand values (like `T` for `true`)
- Produces properly typed JavaScript objects

## Parsing with External Schema

In real-world applications, especially APIs, you often define the schema once and reuse it for multiple data payloads. This is where Internet Object really shines:

```typescript
import io from 'internet-object';

// Define the schema once
const userSchema = io.defs`
  name, age, active, address: {street, city, state}, tags
`;

// Parse data using the schema
const doc = io.doc.with(userSchema)`
  Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
`;

console.log(doc.toJSON());
```

**Benefits of external schemas:**

- Define once, use many times
- Centralized validation rules
- Easier to maintain
- Better for API responses where schema is known

## Parsing Multiple Objects

Internet Object excels at handling collections. The schema is specified once, and all data rows follow that structure:

```typescript
import io from 'internet-object';

const doc = io.doc`
  name, age, active, address: {street, city, state}, tags
  ---
  Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
  Batman, 35, T, {Wayne Manor, Gotham, NJ}, [detective, wealthy]
  Superman, 30, T, {Metropolis St, Metropolis, NY}, [strong, fast]
`;

console.log(doc.toJSON());
```

**Output:**

```json
[
  {
    "name": "Spiderman",
    "age": 25,
    "active": true,
    "address": {
      "street": "Queens",
      "city": "New York",
      "state": "NY"
    },
    "tags": ["agile", "emotional"]
  },
  {
    "name": "Batman",
    "age": 35,
    "active": true,
    "address": {
      "street": "Wayne Manor",
      "city": "Gotham",
      "state": "NJ"
    },
    "tags": ["detective", "wealthy"]
  },
  {
    "name": "Superman",
    "age": 30,
    "active": true,
    "address": {
      "street": "Metropolis St",
      "city": "Metropolis",
      "state": "NY"
    },
    "tags": ["strong", "fast"]
  }
]
```

**Notice the efficiency:** The schema is defined once, but data savings are realized across all three objects. With JSON, you'd repeat all the keys for each object!

## Working with Single Objects

To parse a single object:

```typescript
import { ioObject } from 'internet-object';

const person = ioObject`
  name, age, active, address: {street, city, state}
  ---
  Spiderman, 25, T, {Queens, New York, NY}
`;

console.log(person.toJSON());
```

**Output:**

```json
{
  "name": "Spiderman",
  "age": 25,
  "active": true,
  "address": {
    "street": "Queens",
    "city": "New York",
    "state": "NY"
  }
}
```

## Serializing JavaScript Objects

To convert JavaScript objects back into Internet Object format, you need a schema:

```typescript
import io from 'internet-object';

const schema = io.defs`
  name, age, address: {street, city, state}, active, tags
`;

const jsObject = {
  name: "Spiderman",
  age: 25,
  active: true,
  address: {
    street: "Queens",
    city: "New York",
    state: "NY"
  },
  tags: ["agile", "emotional"]
};

// Serialization API is under development
// Once available, it will work like this:
// const ioString = io.serialize(jsObject, schema);
```

**Expected output:**

```io
Spiderman, 25, {Queens, New York, NY}, T, [agile, emotional]
```

> **Note:** The serialization API is currently under development and will be available in the stable release.

## Accessing Document Properties

The parsed document provides several useful properties:

```typescript
import io from 'internet-object';

const doc = io.doc`
  name, age, active
  ---
  Alice, 30, T
  Bob, 25, F
`;

// Access as JSON
const data = doc.toJSON();
console.log(data);

// Access document sections
console.log(doc.header);    // Schema information
console.log(doc.data);      // Parsed data sections
```

## Real-World Use Cases

### API Response Optimization

```typescript
// Traditional JSON API response (275 bytes)
const jsonResponse = `[
  {"name":"Alice","age":30,"email":"alice@example.com"},
  {"name":"Bob","age":25,"email":"bob@example.com"},
  {"name":"Charlie","age":35,"email":"charlie@example.com"}
]`;

// Internet Object API response (165 bytes - 40% smaller!)
const ioResponse = `name,age,email
---
Alice,30,alice@example.com
Bob,25,bob@example.com
Charlie,35,charlie@example.com`;

// Client-side parsing
const users = io.doc`${ioResponse}`.toJSON();
```

### Configuration Files

```typescript
// config.io
const config = io.doc`
  host, port, ssl, timeout, retries
  ---
  api.example.com, 8080, T, 5000, 3
`;

const settings = config.toJSON()[0];
console.log(settings.host);     // "api.example.com"
console.log(settings.ssl);      // true
console.log(settings.timeout);  // 5000
```

### Data Import/Export

```typescript
// Export data from database
const users = await db.users.find();
const schema = io.defs`id, name, email, created`;

// Serialize to IO format for efficient transfer
// const ioData = io.serialize(users, schema);

// Import data
const imported = io.doc.with(schema)`${ioData}`;
await db.users.insertMany(imported.toJSON());
```

## Best Practices

### 1. Define Schemas Once

```typescript
// Good: Define schema at module level
const userSchema = io.defs`
  name, age, email, active
`;

// Reuse throughout your application
export function parseUsers(data: string) {
  return io.doc.with(userSchema)`${data}`.toJSON();
}
```

### 2. Use Type Annotations

```typescript
interface User {
  name: string;
  age: number;
  email: string;
  active: boolean;
}

const users = io.doc`
  name, age, email, active
  ---
  Alice, 30, alice@example.com, T
`.toJSON() as User[];
```

### 3. Handle Errors Gracefully

```typescript
try {
  const doc = io.doc`${userInput}`;
  const data = doc.toJSON();
  // Process data
} catch (error) {
  console.error('Failed to parse Internet Object:', error);
  // Handle error appropriately
}
```

## Summary

This article covered the practical aspects of working with Internet Object, including:

- **Installation and setup** in JavaScript/TypeScript projects
- **Parsing complete documents** with `io.doc`
- **Working with external schemas** using `io.defs` and `io.doc.with()`
- **Handling collections** of data efficiently
- **Real-world use cases** for APIs, configuration, and data transfer
- **Best practices** for production applications

In the next article, we'll dive deeper into Internet Object schemas, exploring:

- Advanced data types and validation
- Optional and required fields
- Default values
- Custom types and constraints
- Metadata and documentation

---

*Want to learn more? Visit [InternetObject.org](https://internetobject.org) for complete documentation and specifications.*
