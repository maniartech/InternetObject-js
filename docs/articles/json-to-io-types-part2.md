# From JSON to Internet Object: Types and Structure (Part 2)

> Mastering the flexibility of Internet Object with comments, mixed data definitions, and a powerful type system.

In [Part 1](./json-to-io-introduction-part1.md), we explored how Internet Object (IO) dramatically reduces data size and improves readability by separating schema from data. We saw how a simple superhero collection could be shrunk by over 60% compared to JSON.

But efficiency is just the beginning. In this second part, we'll dive into the features that make Internet Object not just smaller, but smarter: its flexible data definition styles, rich commenting system, and robust type system.

## Comments: Documenting Your Data

One of the biggest frustrations with JSON is the lack of comments. Internet Object solves this by treating comments as a first-class citizen. You can add context, explanations, or disable parts of your data using the hash symbol `#`.

Comments in Internet Object are single-line and can be placed anywhere:

```ruby
# This is a comment about the schema
name, age, active
---
# This is a comment about the data
Spiderman, 25, T  # Inline comments work too!
```

This simple feature makes configuration files and complex data structures much easier to maintain and understand.

## Flexible Data Definition

Internet Object offers three ways to define your data, giving you the best of both the CSV and JSON worlds.

### 1. Sequential (Positional)
This is the most compact form, similar to CSV. Values are mapped to the schema based on their order.

```ruby
name, age, city
---
Spiderman, 25, New York
```

### 2. Key-Value (Keyed)
This is the most expressive form, similar to JSON. Order doesn't matter because values are explicitly assigned to keys.

```ruby
name, age, city
---
name: Spiderman, city: New York, age: 25
```

### 3. Mixed Mode
Here's where it gets interesting. You can mix both styles in a single object! You can start with sequential values and switch to key-value pairs.

```ruby
name, age, city, active
---
Spiderman, 25, active: T, city: New York
```

**The Golden Rule:** Once you switch to key-value pairs, you cannot go back to sequential values for that object. The parser needs to know exactly which field you are referring to, so after the first named field, all subsequent fields must also be named.

## The Power of Types

In JSON, everything is loosely typed. In Internet Object, you have a powerful type system at your disposal.

### Default Type: Any
If you don't specify a type in your schema, Internet Object defaults to `any`. This allows for maximum flexibility but less validation.

```ruby
# 'data' can be anything
data
---
~ 100
~ "Hello"
~ T
```

### Explicit Types
To enforce structure, you can define types explicitly.

```ruby
name: string, age: number
---
Spiderman, 25
```

### Type Constraints
You can go further by adding constraints to your types. This is done by wrapping the type and its options in curly braces.

```ruby
password: {string, minLen: 10}, age: {number, min: 0, max: 120}
```

Now, the parser will automatically validate that the password is at least 10 characters long and the age is within a valid range.

### Nullable and Optional Fields
Internet Object uses simple canonical markers to define nullability and optionality:

*   **`?` (Optional):** The field can be omitted entirely.
*   **`*` (Nullable):** The field can be set to `null`.

```ruby
name: string, email?: string, phone*: string
```

In this example:
*   `name` is required.
*   `email` is optional (can be missing).
*   `phone` is nullable (can be `null` or a string).

## The Type Gallery

Internet Object supports a rich set of types to cover modern application needs:

*   **Bool**: Boolean values (`T` or `F`, `true` or `false`).
*   **String**: Textual data. Supports patterns, length constraints, and formats (email, url).
*   **Number**: Numeric values (integers and floats).
*   **BigInt**: For numbers larger than $2^{53}-1$, ensuring precision for large identifiers or financial calculations.
*   **Decimal**: High-precision fixed-point numbers, perfect for monetary values where floating-point errors are unacceptable.
*   **DateTime**: Native support for dates and times (ISO 8601).
*   **Base64**: Efficient handling of binary data encoded as text.
*   **Object**: Nested structures.
*   **Array**: Lists of values.
*   **Any**: The flexible fallback for dynamic data.

## Summary

Internet Object isn't just about saving bytes; it's about expressing data more clearly and safely. With comments, you can document your intent. With mixed data definitions, you can balance brevity and readability. And with a robust type system, you can ensure data integrity right at the parsing level.

In the next part of this series, we will explore **Metadata** and how it allows you to attach additional information to your documents without cluttering the data itself.
