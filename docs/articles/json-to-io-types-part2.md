# From JSON to Internet Object: Object Structure and Other Types (Part 2)

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

## Object Structure: Open vs. Closed

Internet Object distinguishes between "Open" and "Closed" objects based on where they appear.

* **Open Objects**: The top-level object (the root) can be defined without curly braces `{}`. This is what makes the format look so clean.

    ```ruby
    Spiderman, 25
    ```

* **Closed Objects**: Any nested object (a child of another object or array) *must* be enclosed in curly braces `{}`.

    ```ruby
    name, age, address: {street, city, coordinates: {lat, lon }}
    ---
    Spiderman, 25, { "123 Main St", "New York", {40.7128, -74.0060 }}
    ```

In the example above, the `address` and its nested `coordinates` are properly enclosed in braces, while the root object (the person) is open.

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

You can go further by adding constraints to your types. This is done by wrapping the type and its options in curly braces `{}`.

```ruby
password: {string, minLen: 10, pattern: '^[a-zA-Z0-9]+$'},
age: {number, min: 0, max: 120},
role: {string, choices: ["admin", "user", "guest"]}
```

Now, the parser will automatically validate that:

* `password` is at least 10 characters long and matches the alphanumeric pattern.
* `age` is between 0 and 120.
* `role` is one of the specified values.

> **Note:** This article covers the most common constraints. You might need to refer to the official specification and documentation (available soon) for a complete list of all available constraints for every type.

### Nullable and Optional Fields

Internet Object uses simple canonical markers to define nullability and optionality:

* **`?` (Optional):** The field can be omitted entirely.
* **`*` (Nullable):** The field can be set to `null`.

```ruby
name: string, email?: string, phone*: string
```

In this example:

* `name` is required.
* `email` is optional (can be missing).
* `phone` is nullable (can be `null` or a string).

## The Type Gallery

Internet Object supports a rich set of types to cover modern application needs. Let's explore them in detail.

### 1. String

Strings in Internet Object are versatile and come in three flavors to handle different text scenarios efficiently.

* **Open String**: The simplest form. No quotes required! It ends at a structural character (like `,` or `}`) or a new line. Perfect for simple text.

    ```ruby
    name: John Doe
    ```

* **Regular String**: Enclosed in double quotes (`"`). Supports standard escape sequences (like `\n`, `\t`, `\uXXXX`) and two-digit hex codes (`\xXX`). Use this when your text contains special characters or delimiters.

    ```ruby
    message: "Hello, \"World\"!\nWelcome."
    ```

* **Raw String**: Prefixed with `r` and enclosed in single (`'`) or double (`"`) quotes. It ignores most escape sequences, making it ideal for regular expressions or file paths.

    ```ruby
    path: r'C:\Users\Admin\Documents'
    regex: r'\d{3}-\d{2}-\d{4}'
    ```

#### String Constraints

* **`minLen`, `maxLen`, `len`**: Validate string length.
* **`pattern`**: Validate against a regular expression.
* **`choices`**: Restrict to a specific list of values.

```ruby
username: {string, minLen: 3, maxLen: 20, pattern: r'^[a-z0-9_]+$'}
```

### 2. Number Types

Internet Object provides three distinct numeric types to ensure precision where it matters.

* **Number**: Standard 64-bit floating-point numbers (IEEE 754). Suitable for general calculations.
  * Supports scientific notation: `1.5e10`
  * Supports special values: `NaN` (Not a Number) and `Inf` (Infinity).
  * Supports non-decimal formats (integers only):
    * Hexadecimal: `0xFF`
    * Octal: `0o777`
    * Binary: `0b1010`

* **Decimal**: Fixed-precision numbers, suffixed with `m`. Crucial for financial calculations where floating-point errors are unacceptable.

    ```ruby
    price: 19.99m
    ```

* **BigInt**: Arbitrary-precision integers, suffixed with `n`. Use this for numbers larger than $2^{53}-1$.

    ```ruby
    id: 9007199254740991n
    ```

#### Number Constraints

* **`min`, `max`**: Range validation.
* **`multipleOf`**: Step validation.
* **`choices`**: Allowed values.

```ruby
age: {number, min: 0, max: 120}
```

### 3. Date and Time

Native support for temporal data using ISO 8601 formats, prefixed to indicate the type.

* **Date (`d`)**: Represents a calendar date.

    ```ruby
    birthday: d'2025-01-01'
    ```

* **Time (`t`)**: Represents a time of day.

    ```ruby
    alarm: t'07:30:00'
    ```

* **DateTime (`dt`)**: Represents a specific point in time, optionally with timezone.

    ```ruby
    meeting: dt'2025-01-01T14:00:00Z'
    ```

#### Date Constraints

* **`min`, `max`**: Validate date ranges.

```ruby
# Must be born after 2000
birthday: {date, min: d'2000-01-01'}
```

### 4. Base64

Efficiently handle binary data encoded as text. Prefixed with `b`.

```ruby
avatar: b'SGVsbG8gV29ybGQ='
```

### 5. Boolean

Represents logical values.

* True: `T`, `true`
* False: `F`, `false`

### 6. Array

Arrays are enclosed in square brackets `[]`. They are ordered lists of values and can contain any type of data, including other arrays or objects.

```ruby
tags: ["hero", "avenger", "spider-verse"]
matrix: [[1, 2], [3, 4]]
    ```

#### Array Constraints

* **`minLen`, `maxLen`, `len`**: Validate the number of items in the array.

```ruby
# Array must have exactly 3 items
coordinates: {array, len: 3}
```

### 7. Any

The flexible fallback. If no type is specified, `any` is assumed, allowing any valid Internet Object value.

## Summary

Internet Object isn't just about saving bytes; it's about expressing data more clearly and safely. With comments, you can document your intent. With mixed data definitions, you can balance brevity and readability. And with a robust type system, you can ensure data integrity right at the parsing level.

In the next part of this series, we will explore other structural aspects of the Internet Object format and how it allows you to attach additional information to your documents without cluttering the data itself.
