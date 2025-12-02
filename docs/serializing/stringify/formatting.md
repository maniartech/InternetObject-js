# Internet Object Formatted Output

This document describes the formatting rules for pretty-printing Internet Object data when using the `stringify()` function with the `indent` option.

## Overview

Internet Object supports two output modes:

1. **Compact mode** (default) - Single line, minimal whitespace
2. **Formatted mode** - Multi-line with indentation for readability

Formatted mode is triggered by providing the `indent` option to `stringify()`.

```typescript
import { stringify } from 'internet-object';

// Compact (default)
stringify(doc);
// Output: John Doe, 25, {Bond Street, New York}, [red, blue]

// Formatted
stringify(doc, { indent: 2 });
// Output: (see formatted examples below)
```

## Formatting Rules

**Key Principles:**
- Top-level objects (root, section, collection item) are always output WITHOUT braces by `stringifyObject`.
- Braces `{ ... }` are only added by consumers (such as array formatters or nested object formatters) when needed for structure.
- Arrays of objects expand with each item on its own line, and each object item is wrapped in braces by the array formatter.
- Nested objects inside arrays or as field values are wrapped in braces by the nested object formatter, but stay inline for readability.
- Only array formatters and nested object formatters add braces; root-level output never has braces.

### 1. Simple Objects Stay Inline

Objects containing only primitive values stay on a single line. If the object is at the root level, it is output WITHOUT braces. If it is nested (e.g., inside an array or as a field value), it is wrapped in braces by the consumer.

**Compact (root-level):**
```io
d'2024-06-15', d'2024-06-17'
```

**Formatted (root-level):**
```io
d'2024-06-15', d'2024-06-17'
```

**Nested (inside array or field):**
```io
{ d'2024-06-15', d'2024-06-17' }
```

### 2. Complex Top-Level Objects Expand

Objects at the root level that contain nested objects or arrays expand, with content on a new indented line, but are output WITHOUT braces. Only nested objects are wrapped in braces by the consumer.

**Compact (root-level):**
```io
Convention Center, {1000 Convention Way, Las Vegas, USA}, 5000
```

**Formatted (root-level):**
```io
Convention Center, { 1000 Convention Way, Las Vegas, USA }, 5000
```

Note: The inner nested object `{ 1000 Convention Way, Las Vegas, USA }` stays inline and is wrapped in braces by the nested object formatter.

### 3. Arrays of Primitives Stay Inline

Arrays containing only primitive values remain on a single line with spaces.

**Compact:**
```io
[AI, machine learning, future tech]
```

**Formatted:**
```io
[ AI, machine learning, future tech ]
```

### 4. Arrays of Objects Expand (Items Stay Inline)

Arrays containing objects expand to multiple lines with each item on its own line. The array formatter wraps each object item in braces, regardless of whether the object is simple or complex. The object items themselves stay inline for readability.

**Compact:**
```io
[ { Widget A, 2, 29.99 }, { Widget B, 1, 49.99 }, { Widget C, 5, 9.99 } ]
```

**Formatted:**
```io
[
  { Widget A, 2, 29.99 },
  { Widget B, 1, 49.99 },
  { Widget C, 5, 9.99 }
]
```

### 5. Nested Objects Inside Array Items Stay Inline

Even when array items contain nested objects, everything stays on the same line.

**Compact:**
```io
[{S001, Keynote, {Dr. Watson, AI Lead, DeepMind}, Main Hall}]
```

**Formatted:**
```io
[
  { S001, Keynote, { Dr. Watson, AI Lead, DeepMind }, Main Hall }
]
```

### 6. Line Breaks After Complex Arrays

When a top-level contains an array of objects, the array expands with one item per line.

**Formatted:**
```io
John Doe, 25, { Bond Street, New York }, [
  { item1, 10 },
  { item2, 20 }
]
```

### 7. Indentation

Each nesting level adds one indent unit. The indent can be specified as a number (spaces) or a string.

```typescript
// 2 spaces per level
stringify(doc, { indent: 2 });

// Tab character per level
stringify(doc, { indent: '\t' });
```

## Complete Examples

### Example 1: User Profile with Address

**Input (JSON representation):**
```json
{
  "name": "Sarah Johnson",
  "email": "sarah.johnson@email.com",
  "age": 32,
  "active": true,
  "address": {
    "street": "742 Evergreen Terrace",
    "city": "Springfield",
    "state": "IL",
    "zip": "62704"
  }
}
```

**Compact output:**
```io
Sarah Johnson, sarah.johnson@email.com, 32, T, {742 Evergreen Terrace, Springfield, IL, 62704}
```

**Formatted output (indent: 2):**
```io
Sarah Johnson, sarah.johnson@email.com, 32, T, { 742 Evergreen Terrace, Springfield, IL, 62704 }
```

### Example 2: Product with Tags

**Input (JSON representation):**
```json
{
  "sku": "LAPTOP-001",
  "name": "MacBook Pro 16\"",
  "price": 2499.99,
  "inStock": true,
  "tags": ["electronics", "computers", "apple", "premium"]
}
```

**Compact output:**
```io
LAPTOP-001, "MacBook Pro 16\"", 2499.99, T, [electronics, computers, apple, premium]
```

**Formatted output (indent: 2):**
```io
LAPTOP-001, "MacBook Pro 16\"", 2499.99, T, [ electronics, computers, apple, premium ]
```

### Example 3: Order with Line Items

**Input (JSON representation):**
```json
{
  "orderId": "ORD-2024-1234",
  "customer": "John Smith",
  "items": [
    {"product": "Widget A", "qty": 2, "price": 29.99},
    {"product": "Widget B", "qty": 1, "price": 49.99},
    {"product": "Widget C", "qty": 5, "price": 9.99}
  ],
  "total": 159.92
}
```

**Compact output:**
```io
ORD-2024-1234, John Smith, [{Widget A, 2, 29.99}, {Widget B, 1, 49.99}, {Widget C, 5, 9.99}], 159.92
```

**Formatted output (indent: 2):**
```io
ORD-2024-1234, John Smith, [
  { Widget A, 2, 29.99 },
  { Widget B, 1, 49.99 },
  { Widget C, 5, 9.99 }
], 159.92
```

### Example 4: Company with Nested Departments

**Input (JSON representation):**
```json
{
  "company": "TechCorp Inc.",
  "founded": 2010,
  "headquarters": {
    "city": "San Francisco",
    "state": "CA",
    "country": "USA",
    "coordinates": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  },
  "industries": ["software", "cloud", "AI"]
}
```

**Compact output:**
```io
TechCorp Inc., 2010, {San Francisco, CA, USA, {37.7749, -122.4194}}, [software, cloud, AI]
```

**Formatted output (indent: 2):**
```io
TechCorp Inc., 2010, {
  San Francisco, CA, USA, { 37.7749, -122.4194 }
}, [ software, cloud, AI ]
```

### Example 5: Blog Post with Comments

**Input (JSON representation):**
```json
{
  "title": "Getting Started with Internet Object",
  "author": "Jane Developer",
  "publishedAt": "2024-03-15",
  "tags": ["tutorial", "io", "serialization"],
  "comments": [
    {"user": "alice", "text": "Great article!", "likes": 12},
    {"user": "bob", "text": "Very helpful, thanks!", "likes": 8},
    {"user": "charlie", "text": "Can you cover advanced topics next?", "likes": 15}
  ]
}
```

**Compact output:**
```io
Getting Started with Internet Object, Jane Developer, d'2024-03-15', [tutorial, io, serialization], [{alice, Great article!, 12}, {bob, "Very helpful, thanks!", 8}, {charlie, Can you cover advanced topics next?, 15}]
```

**Formatted output (indent: 2):**
```io
Getting Started with Internet Object, Jane Developer, d'2024-03-15', [ tutorial, io, serialization ], [
  { alice, Great article!, 12 },
  { bob, "Very helpful, thanks!", 8 },
  { charlie, Can you cover advanced topics next?, 15 }
]
```

---

## Large Real-World Examples

### Example 6: E-Commerce Order with Full Details

**Schema:**
```io
orderId, customer: {name, email, phone}, shippingAddress: {street, city, state, zip, country},
billingAddress: {street, city, state, zip, country}, items: [{sku, name, qty, unitPrice, discount}],
payment: {method, cardLast4, status}, shipping: {carrier, tracking, estimatedDelivery},
subtotal, tax, total, status, createdAt
```

**Input (JSON representation):**
```json
{
  "orderId": "ORD-2024-78542",
  "customer": {
    "name": "Emily Richardson",
    "email": "emily.r@example.com",
    "phone": "+1-555-0123"
  },
  "shippingAddress": {
    "street": "456 Oak Avenue, Apt 12B",
    "city": "Portland",
    "state": "OR",
    "zip": "97201",
    "country": "USA"
  },
  "billingAddress": {
    "street": "456 Oak Avenue, Apt 12B",
    "city": "Portland",
    "state": "OR",
    "zip": "97201",
    "country": "USA"
  },
  "items": [
    {"sku": "PHONE-IP15-256", "name": "iPhone 15 Pro 256GB", "qty": 1, "unitPrice": 1199.00, "discount": 0},
    {"sku": "CASE-IP15-BLK", "name": "Leather Case - Black", "qty": 1, "unitPrice": 59.00, "discount": 5.90},
    {"sku": "CHRG-USB-C-20W", "name": "20W USB-C Charger", "qty": 2, "unitPrice": 29.00, "discount": 0}
  ],
  "payment": {
    "method": "credit_card",
    "cardLast4": "4242",
    "status": "captured"
  },
  "shipping": {
    "carrier": "FedEx",
    "tracking": "794644790132",
    "estimatedDelivery": "2024-03-20"
  },
  "subtotal": 1316.00,
  "tax": 105.28,
  "total": 1421.28,
  "status": "shipped",
  "createdAt": "2024-03-15T14:32:00Z"
}
```

**Compact output:**
```io
ORD-2024-78542, {Emily Richardson, emily.r@example.com, +1-555-0123}, {"456 Oak Avenue, Apt 12B", Portland, OR, 97201, USA}, {"456 Oak Avenue, Apt 12B", Portland, OR, 97201, USA}, [{PHONE-IP15-256, iPhone 15 Pro 256GB, 1, 1199, 0}, {CASE-IP15-BLK, Leather Case - Black, 1, 59, 5.9}, {CHRG-USB-C-20W, 20W USB-C Charger, 2, 29, 0}], {credit_card, 4242, captured}, {FedEx, 794644790132, d'2024-03-20'}, 1316, 105.28, 1421.28, shipped, dt'2024-03-15T14:32:00Z'
```

**Formatted output (indent: 2):**
```io
ORD-2024-78542, { Emily Richardson, emily.r@example.com, +1-555-0123 },
{ "456 Oak Avenue, Apt 12B", Portland, OR, 97201, USA },
{ "456 Oak Avenue, Apt 12B", Portland, OR, 97201, USA }, [
  { PHONE-IP15-256, iPhone 15 Pro 256GB, 1, 1199, 0 },
  { CASE-IP15-BLK, Leather Case - Black, 1, 59, 5.9 },
  { CHRG-USB-C-20W, 20W USB-C Charger, 2, 29, 0 }
], { credit_card, 4242, captured }, { FedEx, 794644790132, d'2024-03-20' },
1316, 105.28, 1421.28, shipped, dt'2024-03-15T14:32:00Z'
```

### Example 7: API Response with Nested Data

**Schema:**
```io
success, data: {users: [{id, name, email, role, department: {id, name, manager}, permissions: [string], lastLogin}]},
pagination: {page, perPage, total, totalPages}, meta: {requestId, timestamp, version}
```

**Input (JSON representation):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1001,
        "name": "Alice Chen",
        "email": "alice.chen@company.com",
        "role": "admin",
        "department": {
          "id": 10,
          "name": "Engineering",
          "manager": "Bob Wilson"
        },
        "permissions": ["read", "write", "delete", "admin"],
        "lastLogin": "2024-03-15T09:30:00Z"
      },
      {
        "id": 1002,
        "name": "David Kim",
        "email": "david.kim@company.com",
        "role": "developer",
        "department": {
          "id": 10,
          "name": "Engineering",
          "manager": "Bob Wilson"
        },
        "permissions": ["read", "write"],
        "lastLogin": "2024-03-15T11:45:00Z"
      },
      {
        "id": 1003,
        "name": "Maria Garcia",
        "email": "maria.garcia@company.com",
        "role": "analyst",
        "department": {
          "id": 20,
          "name": "Data Science",
          "manager": "Sarah Lee"
        },
        "permissions": ["read", "write", "export"],
        "lastLogin": "2024-03-14T16:20:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "perPage": 25,
    "total": 3,
    "totalPages": 1
  },
  "meta": {
    "requestId": "req-abc123",
    "timestamp": "2024-03-15T12:00:00Z",
    "version": "2.1.0"
  }
}
```

**Compact output:**
```io
T, {[{1001, Alice Chen, alice.chen@company.com, admin, {10, Engineering, Bob Wilson}, [read, write, delete, admin], dt'2024-03-15T09:30:00Z'}, {1002, David Kim, david.kim@company.com, developer, {10, Engineering, Bob Wilson}, [read, write], dt'2024-03-15T11:45:00Z'}, {1003, Maria Garcia, maria.garcia@company.com, analyst, {20, Data Science, Sarah Lee}, [read, write, export], dt'2024-03-14T16:20:00Z'}]}, {1, 25, 3, 1}, {req-abc123, dt'2024-03-15T12:00:00Z', 2.1.0}
```

**Formatted output (indent: 2):**
```io
T, {
  [
    { 1001, Alice Chen, alice.chen@company.com, admin, { 10, Engineering, Bob Wilson }, [ read, write, delete, admin ], dt'2024-03-15T09:30:00Z' },
    { 1002, David Kim, david.kim@company.com, developer, { 10, Engineering, Bob Wilson }, [ read, write ], dt'2024-03-15T11:45:00Z' },
    { 1003, Maria Garcia, maria.garcia@company.com, analyst, { 20, Data Science, Sarah Lee }, [ read, write, export ], dt'2024-03-14T16:20:00Z' }
  ]
}, { 1, 25, 3, 1 }, { req-abc123, dt'2024-03-15T12:00:00Z', 2.1.0 }
```

### Example 8: Event with Attendees and Sessions

**Schema:**
```io
eventId, name, description, venue: {name, address: {street, city, country}, capacity},
dates: {start, end}, organizer: {name, email, company},
sessions: [{id, title, speaker: {name, bio, company}, room, time, topics: [string]}],
attendees: [{id, name, email, ticketType, sessions: [int]}],
sponsors: [{name, tier, logo}], totalAttendees, status
```

**Input (JSON representation):**
```json
{
  "eventId": "CONF-2024-TECH",
  "name": "TechSummit 2024",
  "description": "Annual technology conference",
  "venue": {
    "name": "Convention Center",
    "address": {
      "street": "1000 Convention Way",
      "city": "Las Vegas",
      "country": "USA"
    },
    "capacity": 5000
  },
  "dates": {
    "start": "2024-06-15",
    "end": "2024-06-17"
  },
  "organizer": {
    "name": "TechEvents Inc.",
    "email": "info@techsummit.com",
    "company": "TechEvents Inc."
  },
  "sessions": [
    {
      "id": "S001",
      "title": "Keynote: Future of AI",
      "speaker": {
        "name": "Dr. James Watson",
        "bio": "AI Research Lead",
        "company": "DeepMind"
      },
      "room": "Main Hall",
      "time": "2024-06-15T09:00:00",
      "topics": ["AI", "machine learning", "future tech"]
    },
    {
      "id": "S002",
      "title": "Building Scalable Systems",
      "speaker": {
        "name": "Lisa Park",
        "bio": "Principal Engineer",
        "company": "Netflix"
      },
      "room": "Room A",
      "time": "2024-06-15T11:00:00",
      "topics": ["architecture", "scalability", "microservices"]
    },
    {
      "id": "S003",
      "title": "Modern Web Development",
      "speaker": {
        "name": "Carlos Mendez",
        "bio": "Frontend Architect",
        "company": "Vercel"
      },
      "room": "Room B",
      "time": "2024-06-15T11:00:00",
      "topics": ["web", "javascript", "react", "performance"]
    }
  ],
  "attendees": [
    {"id": "A001", "name": "John Doe", "email": "john@example.com", "ticketType": "VIP", "sessions": [1, 2, 3]},
    {"id": "A002", "name": "Jane Smith", "email": "jane@example.com", "ticketType": "Standard", "sessions": [1, 3]},
    {"id": "A003", "name": "Bob Johnson", "email": "bob@example.com", "ticketType": "Standard", "sessions": [1, 2]}
  ],
  "sponsors": [
    {"name": "Google", "tier": "platinum", "logo": "google-logo.png"},
    {"name": "Microsoft", "tier": "platinum", "logo": "ms-logo.png"},
    {"name": "AWS", "tier": "gold", "logo": "aws-logo.png"}
  ],
  "totalAttendees": 3500,
  "status": "registration_open"
}
```

**Formatted output (indent: 2):**
```io
CONF-2024-TECH, TechSummit 2024, Annual technology conference, {
  Convention Center, { 1000 Convention Way, Las Vegas, USA }, 5000
}, { d'2024-06-15', d'2024-06-17' }, { TechEvents Inc., info@techsummit.com, TechEvents Inc. }, [
  { S001, "Keynote: Future of AI", { Dr. James Watson, AI Research Lead, DeepMind }, Main Hall, dt'2024-06-15T09:00:00', [ AI, machine learning, future tech ] },
  { S002, Building Scalable Systems, { Lisa Park, Principal Engineer, Netflix }, Room A, dt'2024-06-15T11:00:00', [ architecture, scalability, microservices ] },
  { S003, Modern Web Development, { Carlos Mendez, Frontend Architect, Vercel }, Room B, dt'2024-06-15T11:00:00', [ web, javascript, react, performance ] }
], [
  { A001, John Doe, john@example.com, VIP, [ 1, 2, 3 ] },
  { A002, Jane Smith, jane@example.com, Standard, [ 1, 3 ] },
  { A003, Bob Johnson, bob@example.com, Standard, [ 1, 2 ] }
], [
  { Google, platinum, google-logo.png },
  { Microsoft, platinum, ms-logo.png },
  { AWS, gold, aws-logo.png }
], 3500, registration_open
```

## Document-Level Formatting

### Collections with `~` Prefix

When formatting documents with collections, each `~` item is output using `stringifyObject` (no braces at root level). If the item contains nested objects or arrays, those are wrapped in braces or brackets by the respective formatter.

**Compact:**
```io
~ John Doe, 25, { Bond Street, New York }
~ Jane Doe, 30, { Main Street, Chicago }
```

**Formatted (indent: 2):**
```io
~ John Doe, 25, { Bond Street, New York }
~ Jane Doe, 30, { Main Street, Chicago }
```

### With Schema Header

When `includeTypes: true` is specified along with formatting:

**Formatted with header:**
```io
name, age, address: { street, city }
---
~ John Doe, 25, { Bond Street, New York }
~ Jane Doe, 30, { Main Street, Chicago }
```

## API Reference

### StringifyOptions

```typescript
interface StringifyOptions {
  /**
   * Indentation for pretty printing.
   * - number: Number of spaces per indent level
   * - string: String to use for each indent level (e.g., '\t')
   * - undefined/omitted: Compact output (no formatting)
   */
  indent?: number | string;

  /**
   * Include type annotations in output.
   * Default: false
   */
  includeTypes?: boolean;

  /**
   * Skip error objects in collections.
   * Default: false
   */
  skipErrors?: boolean;

  /**
   * Include header section with definitions (for Document only).
   * Default: false
   */
  includeHeader?: boolean;

  /**
   * The name of the schema to use from definitions.
   */
  schemaName?: string;
}
```

### Usage Examples

```typescript
import IO, { stringify } from 'internet-object';

const doc = IO.parse(`
name, age, address: {street, city}, colors
---
John Doe, 25, {Bond Street, New York}, [red, blue]
`);

// Compact output (default)
console.log(stringify(doc));
// John Doe, 25, {Bond Street, New York}, [red, blue]

// Formatted with 2-space indent
console.log(stringify(doc, { indent: 2 }));
// John Doe, 25, { Bond Street, New York }, [ red, blue ]

// With array of objects
const data = IO.parse(`
name, items: [{id, name}]
---
Order001, [{1, Apple}, {2, Banana}]
`);

console.log(stringify(data, { indent: 2 }));
// Order001, [
//   { 1, Apple },
//   { 2, Banana }
// ]

// Collection with schema header
const collection = IO.parse(`
name, age, address: {street, city}
---
~ John Doe, 25, {Bond Street, New York}
~ Jane Doe, 30, {Main Street, Chicago}
`);

console.log(stringify(collection, { indent: 2, includeTypes: true }));
// name, age, address: { street, city }
// ---
// ~ John Doe, 25, { Bond Street, New York }
// ~ Jane Doe, 30, { Main Street, Chicago }
```

## Summary Table

| Structure | Compact | Formatted |
|-----------|---------|-----------|
| Simple object (root-level) | `a, b, c, d` | `a, b, c, d` |
| Object in array (array formatter adds braces) | `[ { a, b } ]` | `[
  { a, b }
]` |
| Array of primitives | `[a, b, c]` | `[ a, b, c ]` |
| Array of objects | `[ { a, b }, { c, d } ]` | `[
  { a, b },
  { c, d }
]` |
| Top-level with nested array | `a, [ { x, y } ]` | `a, [
  { x, y }
]` |
| Nested object in array item (nested formatter adds braces) | `[ { a, { b, c } } ]` | `[
  { a, { b, c } }
]` |

## Design Rationale

The formatting rules are designed to:

1. **Maximize readability** - Arrays of objects expand to show each item on its own line
2. **Minimize verbosity** - Inline objects and primitive arrays keep related data together
3. **Maintain consistency** - Rules apply predictably at all nesting levels
4. **Support round-trip** - Formatted output can be parsed back to the same data structure
5. **Follow IO conventions** - Objects inside arrays stay inline, arrays of objects expand
