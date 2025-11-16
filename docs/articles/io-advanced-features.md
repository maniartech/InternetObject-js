# Internet Object: Advanced Features for Real-World Data (Part 2)

> Exploring comments, string types, numeric precision, separate schemas, and metadata - features that make Internet Object production-ready.

In [Part 1](json-to-io.md), we explored how Internet Object simplifies data interchange by separating schema from data and dramatically reducing payload sizes. But production applications need more than just compact data - they need documentation, flexible string handling, numeric precision, reusable schemas, and contextual metadata.

This article explores the advanced features that make Internet Object a robust, production-ready format for modern applications.

## Comments: Documentation Where It Matters

Internet Object treats documentation as a first-class feature. You can add comments directly in your data files, making them self-documenting and easier to maintain.

### Inline Comments

Inline comments start with `#` and continue to the end of the line:

```ruby
name: string, age: number, active: bool  # Basic user fields
---
~ Alice, 28, T  # Active user
~ Bob, 32, F    # Inactive user
```

### Block Comments

Internet object does not have a dedicated block comment syntax. You can however create block comments by prefixing each line with `#`:

```ruby
#
# Superhero Database Schema
# Version: 2.0
# Last updated: 2024-01-15
# Maintains compatibility with legacy systems
#
name: string,    # Instead of same line
age: number,     # this schema is splitted into multiple lines for clarity
active: bool,
address: {
  street: string,
  city: string,
  state: string
},
tags: [string]
---
~ Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
~ Batman, 35, T, {Wayne Manor, Gotham, NJ}, [detective, wealthy]
```

## String Value Types: Handling Text With Flexibility

Strings are the most common data type. Internet Object provides three distinct string types, each optimized for different use cases.

### Open Strings

The default format for simple, unquoted strings without special characters:

```ruby
name: string, city: string, country: string
---
~ John Smith, New York, USA
~ Alice Johnson, Los Angeles, USA
```

**Ideal for:** Names, cities, simple identifiers, tags, categories.

**Restrictions:** Cannot contain commas or quotes. Perfect for clean, structured data.

**Note on newlines:** Open strings preserve newlines and line breaks as part of the value.

### Regular Strings

Quoted strings that support escape sequences and special characters:

```ruby
message: string, code: string
---
~ "Hello, World!", "#!/bin/bash"
~ "Line 1\nLine 2\nLine 3", "Path: C:\\Users\\Admin"
~ "She said, \"Hello!\"", "Email: user@domain.com"
```

**Ideal for:** Messages with punctuation, paths, code snippets, formatted text.

**Features:**
- Preserves newlines and line breaks within quoted values
- Escape sequences: `\n` (newline), `\t` (tab), `\"` (quote), `\\` (backslash)
- Can contain commas, quotes, and most special characters
- Single or double quotes supported

### Raw Strings

Multi-line strings annotated as `r'...'` or `r"..."` that preserve exact formatting, perfect for code, JSON, or formatted text:

```ruby
description: string, sql_query: string, json_config: string
---
~ r'This is a raw string.
  It preserves:
    - Line breaks
    - Indentation
    - "Quotes" without escaping
    - Special characters: @#$%^&*',
  r"SELECT users.name, orders.total
  FROM users
  LEFT JOIN orders ON users.id = orders.user_id
  WHERE orders.created_at > '2024-01-01'
  ORDER BY orders.total DESC",
  r'{
    "api_key": "sk-1234567890",
    "timeout": 30,
    "retry_policy": {
      "max_attempts": 3,
      "backoff": "exponential"
    }
  }'
```

**Ideal for:** SQL queries, configurations, Regular Expressions, Code snippets, Formatted documentation etc.

**Features:**

- No escape sequences needed
- Preserves exact formatting
- Supports any characters
- Perfect for embedding other formats (JSON, XML, YAML, code)

### String Type Comparison

| Feature | Open Strings | Regular Strings | Raw Strings |
|---------|--------------|------------------|-------------|
| Quotes | Not required | Required | r'...' or r"..." |
| Commas | Not allowed | Allowed | Allowed |
| Line breaks | Preserved | Preserved | Preserved exactly |
| Escape sequences | N/A | Supported | Not processed |
| Best for | Simple text | General purpose | Multi-line content |

**Real-world example:**

```ruby
username: string,
bio: string,
code_snippet: string,
notes: string
---
~ john_doe,
  "Full-stack developer specializing in TypeScript, React, and Node.js.",
  r"function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n }",
  "Reminder: Review pull requests by EOD"
```

## Number Types: Precision When It Counts

A single numeric representation can lead to precision issues with large integers or financial calculations. Internet Object provides three distinct numeric types for different use cases.

### Number Type

Standard floating-point numbers, equivalent to JavaScript's `Number`:

```ruby
price: number, temperature: number, percentage: number
---
~ 19.99, 72.5, 98.6
~ 0.01, -40.0, 100.0
```

**Range:** ±1.7976931348623157 × 10^308 (double precision)

**Precision:** ~15-17 significant digits

**Use cases:** Measurements, percentages, scientific calculations

**Limitation:** May lose precision with very large integers beyond 2^53 - 1 (9,007,199,254,740,991)

### BigInt Type

Arbitrary-precision integers for handling large whole numbers without precision loss:

```ruby
transaction_id: bigint, population: bigint, national_debt: bigint
---
~ 9007199254740992n, 8045311447n, 34000000000000n
~ 9223372036854775807n, 1425775850n, 28000000000000n
```

**Range:** Unlimited (only constrained by memory)

**Precision:** Exact for all integer operations

**Use cases:** IDs, timestamps, cryptocurrency values, scientific computing, population statistics

**Notation:** Suffix with `n` (required for BigInt literals): `9007199254740992n`

### Decimal Type

Arbitrary-precision decimal numbers for financial and monetary calculations:

```ruby
account_balance: decimal, tax_rate: decimal, exchange_rate: decimal
---
~ 1234567.89m, 0.0825m, 1.18475m
~ 0.000001m, 99.999999m, 1000000.50m
```

**Precision:** User-defined, no rounding errors in arithmetic

**Use cases:** Financial calculations, currency conversions, tax computations, accounting

**Advantage:** Avoids floating-point arithmetic issues:

```ruby
# In JavaScript: 0.1 + 0.2 = 0.30000000000004
# In Internet Object (decimals): 0.1m + 0.2m = 0.3m (exact)
```

### Number Type Comparison

| Type | Precision | Range | Best For |
|------|-----------|-------|----------|
| `number` | ~15-17 digits | ±10^308 | General math, measurements |
| `bigint` | Infinite | Unlimited | Large integers, IDs |
| `decimal` | User-defined | Unlimited | Money, finance, accounting |

**Financial application example:**

```ruby
# Financial Transaction Record
# All monetary values use decimal type to prevent rounding errors
transaction_id: bigint,
amount: decimal,
tax: decimal,
total: decimal,
timestamp: bigint
---
~ 1234567890123456789n, 1000.00m, 82.50m, 1082.50m, 1705392000000n
~ 1234567890123456790n, 2500.50m, 206.29m, 2706.79m, 1705392060000n
```

## Separate Schemas: Reusability and Clarity

As your application grows, you'll often use the same schema across multiple endpoints or data files. Internet Object supports separate schema files that can be referenced by data files, promoting reusability and maintainability.

### Schema File

Create a reusable schema in a separate file:

```ruby
# schemas/user.io

# User Schema Definition
# Version: 2.1
# Used across: /api/users, /api/profiles, /api/admin/users

id: bigint,
username: string,
email: string,
age: number,
active: bool,
created_at: bigint,        # Unix timestamp
profile: {
  bio: string,
  avatar_url: string,
  location?: string        # Optional field
},
tags: [string]
```

### Data File Referencing Schema

Reference the schema in your data file:

```ruby
# data/users.io
~ 1001n, alice_wonder, alice@example.com, 28, T, 1672531200000n,
  {
    "Software engineer passionate about open-source",
    'https://avatar.example.com/alice.jpg',
    San Francisco
  },
  [developer, typescript, react]

~ 1002n, bob_builder, bob@example.com, 32, T, 1672617600000n,
  {
    "Full-stack developer and coffee enthusiast",
    'https://avatar.example.com/bob.jpg',
    Austin
  },
  [developer, java, spring]
```

### Benefits of Separate Schemas

**Reusability:** One schema, multiple data files:

```ruby
# API responses
@schema: schemas/user.io
# Admin exports
@schema: schemas/user.io
# Test fixtures
@schema: schemas/user.io
```

**Version Control:** Track schema changes independently from data:

```ruby
# schemas/user-v2.io
# Added: role field
# Deprecated: legacy_id field
# Breaking change: email now required
```

**Team Collaboration:** Frontend and backend teams share the same schema definition:

```ruby
# Backend team maintains schemas/
# Frontend team references schemas in API integration
# Both teams always in sync
```

**Validation:** Central schema ensures data consistency across all consumers.

## Header with Metadata: Context Is Everything

Internet Object includes a powerful metadata system in the document header, so documents carry information about their version, creation time, and intended use.

### Basic Metadata

Add contextual information to your documents:

```ruby
~ version: 2.1
~ created: "2024-01-15T10:30:00Z"
~ author: api-service
~ description: User data export for analytics team
~ $schema: { name: string, age: number, city: string }
---
~ Alice, 28, New York
~ Bob, 32, Seattle
```

### Practical Example: API Versioning

Response with metadata:

```ruby
~ version: 2.1
~ api_endpoint: /api/v2/users
~ generated: '2024-01-15T10:30:00Z'
~ total_count: 2
~ has_more: F

~ $schema: { id: bigint, name: string }
---
~ 1n, Alice
~ 2n, Bob
```

### Metadata for Data Lineage

Track data provenance and transformations:

```ruby
~ source: production-db-primary
~ extracted: 2024-01-15
~ transformed: 2024-01-15
~ format_version: 3.0
~ row_count: 1500
~ checksum: a3f5e9c1b2d4a6e8

# User activity data
~ $schema: { user_id: bigint, action: string, timestamp: bigint }
---
~ 1001n, login, 1705392000000n
~ 1001n, page_view, 1705392015000n
```

### Metadata for Caching

Enable intelligent caching strategies:

```ruby
~ cache_key: 'users:active:2024-01-15'
~ expires: '2024-01-15T11:30:00Z'
~ etag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
~ last_modified: '2024-01-15T10:30:00Z'

~ $schema: { id: number, name: string, status: string }
---
~ 1, Alice, active
~ 2, Bob, active
```

## JSON vs Internet Object: The Metadata Gap

### JSON: Context-Free Data

JSON documents carry no self-describing metadata. Context must be provided externally:

```json
{
  "users": [
    {"id": 1, "name": "Alice", "age": 28},
    {"id": 2, "name": "Bob", "age": 32}
  ]
}
```

**Questions left unanswered:**

- What version of the API produced this?
- When was this data generated?
- Is this data complete or paginated?
- What timezone are any dates in?
- How long can this be cached?
- What's the data quality score?

### Internet Object: Self-Describing Documents

The same data with context:

```ruby
~ version: 2.1
~ api_endpoint: /api/v2/users
~ generated: 2024-01-15T10:30:00Z
~ timezone: UTC
@page: 1
@page_size: 50
@total_count: 2
@has_more: false
@cache_ttl: 300
@data_quality: 0.98

id: bigint, name: string, age: number
---
~ 1, Alice, 28
~ 2, Bob, 32
```

**Now we know:**

- API version and endpoint
- Generation timestamp and timezone
- Pagination context
- Caching policy
- Data quality metrics

### Real-World Impact

#### Microservices Architecture

Service A generates data, passes to Service B, then to Service C:

**With JSON:**

- Service A logs metadata separately
- Service B must look up context from external sources
- Service C has no idea about data provenance
- Debugging requires correlating logs across services

**With Internet Object:**

- Metadata travels with the data
- Each service can add its own metadata
- Complete audit trail embedded in the document
- Debugging is straightforward

```ruby
@source_service: user-service
@source_version: 3.2.1
@generated: 2024-01-15T10:30:00Z
@processed_by: [enrichment-service, validation-service]
@validation_passed: true
@enrichment_added: location_data

id: bigint, name: string, location: string
---
~ 1, Alice, "San Francisco, CA"
```

## Putting It All Together

Here's a production-ready example combining all the features:

```ruby
# E-commerce Order Export
# Generated: 2024-01-15
# Contains: Last 24 hours of completed orders

@version: 3.0
@source: orders-db-replica-01
@extracted: 2024-01-15T00:00:00Z
@timezone: UTC
@total_orders: 3
@total_revenue: 8789.28
@currency: USD
@quality_score: 1.0

# Order schema
order_id: bigint,
customer_name: string,
email: string,
total: decimal,              # All prices in USD
tax: decimal,
shipping: decimal,
grand_total: decimal,
items: [string],            # Product names
notes: string?,             # Optional delivery instructions
created_at: bigint          # Unix timestamp
---
~ 9001234567890,
  Alice Johnson,
  alice@example.com,
  1000.00,
  82.50,
  15.00,
  1097.50,
  [Laptop Pro 15", Wireless Mouse, USB-C Hub],
  "Please leave at front door",
  1705276800000

~ 9001234567891,
  Bob Smith,
  bob@example.com,
  2500.00,
  206.25,
  0.00,                     # Free shipping over $1000
  2706.25,
  [Monitor 27" 4K, Ergonomic Keyboard],
  ,                         # No delivery notes
  1705280400000

~ 9001234567892,
  Charlie Davis,
  charlie@example.com,
  4500.00,
  371.25,
  0.00,
  4871.25,
  [Workstation Desktop, Graphics Card RTX 4090],
  r"Office delivery
  Requires signature
  Contact: +1-555-0199
  Business hours only",                      # Multi-line delivery instructions
  1705284000000
```

## Summary

This article explored the advanced features that make Internet Object production-ready:

- **Comments**: Inline and block comments using `#`-prefixed lines
- **String Types**: Open, regular, and raw strings for different use cases
- **Number Types**: `number`, `bigint`, and `decimal` for precision when it matters
- **Separate Schemas**: Reusable schema files for consistency across data files
- **Metadata**: Built-in contextual information that travels with your data

These features address real-world challenges that typical data formats leave to external tooling. Internet Object makes documentation, versioning, and context first-class features of the format itself.

In the next article, we'll explore **schema validation, constraints, and default values** - the features that make Internet Object schemas powerful enough to replace traditional validation libraries.

---

**Try it yourself:** Experiment with these features in the [Interactive Playground](https://playground.internetobject.org)

*Want to learn more? Visit [InternetObject.org](https://internetobject.org) for complete documentation and specifications.*
