# From JSON to Internet Object: A Lean, Schema-First Data Format (Part 1)

> How Internet Object redefines structured data with fewer tokens, smaller payloads, and explicit schemas.

Internet Object is a lean, schema-first data format designed for transmitting structured data efficiently across the internet. Born from the frustrations and limitations of JSON, it has evolved into a research-driven effort to create the optimal data interchange format for modern applications.

JSON is familiar but verbose; CSV is compact but flat. **Internet Object combines the best of both ** -  readable like CSV, expressive like JSON, and ideal for sharing complex, hierarchical data across APIs and analytical workflows alike. Whether you're building backend services, designing APIs, integrating data pipelines, or analyzing large datasets, Internet Object provides a future-ready format that bridges the needs of developers and data scientists alike.

This multipart series explores Internet Object step by step - from its foundations to advanced schema and streaming concepts.

To learn mor, visit [InternetObject.org](https://internetobject.org) or read [the story behind it](https://internetobject.org/the-story).

**Prerequisites:** This series assumes you're familiar with JSON document structure and its applications in REST APIs and general API design and development.

## From JSON to Internet Object

To understand Internet Object documents, let's start with JSON. Most JSON objects are valid Internet Objects, which means you can start using Internet Object without changing your existing data structure. For example, this JSON object is also a valid Internet Object:

```json
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
```

However, this format isn't optimized for transfer over the wire! The goal is to trim down all the unnecessary elements so that it contains only the essential interchangeable data.

The optimized version looks like this:

```ruby
Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
```

Let's see how we get there.

## Step 1: Simplifying the Syntax

Let's start the transition by removing the quotations and the outer curly braces. Also, change `true` to `T`:

```ruby
name: Spiderman,
age: 25,
active: T,
address: {
  street: Queens,
  city: New York,
  state: NY
},
tags: [agile, emotional]
```

The result is a valid **keyed** version of the Internet Object document. To further optimize, let's move everything to a single line:

```ruby
name: Spiderman, age: 25, active: T, address: {street: Queens, city: New York, state: NY}, tags: [agile, emotional]
```

## Step 2: Separating Schema from Data

Now separate out the keys from this object to create the schema:

```ruby
name, age, active, address: {street, city, state}, tags
```

The result is a basic form of Internet Object schema. Though this is not the comprehensive version, it defines the object structure. After the schema is extracted, the object is left with pure data:

```ruby
Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
```

**Note:** We've kept the curly braces for the nested object and square brackets for the array to maintain structure. This is essential, open objects (objects without surrounding curly braces) are valid only as root values. We'll explore this further in future articles. Arrays always require square brackets; there is no concept of open arrays.

## Step 3: Combining Schema and Data

You can use schema and data independently (as defined above) or combine them using the data separator `---`:

```ruby
name, age, active, address: {street, city, state}, tags
---
Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
```

This gives the fundamental structure of the Internet Object document. Just as an HTML document is divided into Head and Body, an Internet Object document is divided into the Header and Data sections. The header contains Schema and/or Metadata. We'll explore metadata in the next article in the series.

## Step 4: Converting to Collections

The real power of Internet Object becomes evident when working with multiple objects. Let's convert the single object above into a collection of a few superheroes. But first, convert the single object into collection format by prefixing the data row with `~`:

```ruby
name, age, active, address: {street, city, state}, tags
---
~ Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
```

From the JSON point of you can you think of this as an array with one object. Now, let's add two more objects to the collection:

```ruby
name, age, active, address: {street, city, state}, tags
---
~ Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
~ Batman, 35, T, {Wayne Manor, Gotham, NJ}, [detective, wealthy]
~ Superman, 30, T, {Metropolis St, Metropolis, NY}, [strong, fast]
```

Now we have a collection of three objects defined with a single schema! Let's compare JSON and Internet Object for a collection of superhero data.

**JSON Collection (662 bytes):**

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

**Internet Object Collection (258 bytes):**

```ruby
name, age, active, address: {street, city, state}, tags
---
~ Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
~ Batman, 35, T, {Wayne Manor, Gotham, NJ}, [detective, wealthy]
~ Superman, 30, T, {Metropolis St, Metropolis, NY}, [strong, fast]
```

### Size Comparison

Now let's see the dramatic difference:

**Single Object:**

- **JSON**: 190 bytes
- **Internet Object (with schema)**: 142 bytes (~25% smaller)
- **Internet Object (data only)**: 67 bytes (~65% smaller!)

**Three Objects (Collection):**

- **JSON**: 628 bytes
- **Minimized JSON**: 409 bytes
- **Internet Object**: 273 bytes (~**61% smaller!**, 40% smaller than minimized JSON)


**The advantage grows with more data:**

- With 10 objects: JSON ~2,100 bytes vs IO ~700 bytes (**67% smaller**)
- With 100 objects: JSON ~21,000 bytes vs IO ~6,500 bytes (**69% smaller**)
- With 1,000 objects: JSON ~210,000 bytes vs IO ~64,000 bytes (**70% smaller**)

**Why such dramatic savings?**

In JSON, every field name is repeated for every object. In our example:

- "name" appears 3 times
- "age" appears 3 times
- "active" appears 3 times
- "address", "street", "city", "state" each appear 3 times
- "tags" appears 3 times

That's **45 repeated field names** in just 3 objects!

Internet Object defines the schema once in the header, and all data rows simply follow that structure. The more objects you have, the greater the savings.

## Step 5: Adding Type Definitions

So far, we've been using a basic schema that only defines the structure. But Internet Object schemas can also specify data types, providing validation and ensuring data integrity. Let's enhance our schema with type definitions:

**Basic Schema (from Step 4):**

```ruby
name, age, active, address: {street, city, state}, tags
```

**Schema with Types:**

```ruby
name: string, age: number, active: bool, address: {street: string, city: string, state: string}, tags: [string]
```

Now the schema explicitly defines:

- `name` is a string
- `age` is a number
- `active` is a boolean
- `address` is an object with string fields
- `tags` is an array of strings

**Complete Document with Typed Schema:**

```ruby
name: string, age: number, active: bool, address: {street: string, city: string, state: string}, tags: [string]
---
~ Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
~ Batman, 35, T, {Wayne Manor, Gotham, NJ}, [detective, wealthy]
~ Superman, 30, T, {Metropolis St, Metropolis, NY}, [strong, fast]
```

### Benefits of Typed Schemas

**Validation:** The parser automatically validates data against types. If someone tries to pass `"twenty-five"` for age, it will be rejected.

**Type Safety:** When working with strongly-typed languages (TypeScript, Java, C#, etc.), types help generate proper interfaces and classes.

**Documentation:** The schema serves as self-documenting specification of your data structure.

**Defaults and Constraints:** Types can include additional constraints like min/max values, string patterns, or default values (covered in future articles).

### Type Inference

When types are not explicitly specified, Internet Object uses intelligent type inference based on the data:

```ruby
name, age, active, address: {street, city, state}, tags
---
~ Spiderman, 25, T, {Queens, New York, NY}, [agile, emotional]
```

From this data, Internet Object infers:

- `name`: string (text without quotes)
- `age`: number (numeric value)
- `active`: boolean (`T` represents true)
- `address`: object with string fields
- `tags`: array of strings

However, explicit types are recommended for production use as they provide better validation and prevent unexpected data from being accepted.

## The Document-Oriented Format

By now, you've seen that Internet Object is a document-oriented format, unlike JSON, which is object/value-oriented. Just as HTML documents are divided into head and body sections, Internet Object documents consist of a header and a data section. The header contains the schema and optional metadata, while the data section contains the actual records.

This document structure is fundamental to Internet Object and enables powerful features like schema separation, collections, metadata, variables and definitions. While we'll explore these advanced concepts in the coming articles, it's worth noting that Internet Object supports more advanced document structures beyond the basic header-data pattern—topics.

## Summary

This article introduced the fundamentals of Internet Object, including:

- **Transition from JSON**: How Internet Object simplifies JSON by removing redundancy
- **Schema separation**: The powerful concept of separating structure from data
- **Document structure**: Understanding the header and data sections
- **Collections**: Working with multiple objects using the `~` prefix
- **Type definitions**: Adding type safety and validation to schemas
- **Size efficiency**: Significant reduction in data size, especially for collections

This article covered the fundamental structure and syntax of Internet Object. The upcoming articles in this series will explore more advanced features. So stay tuned for deeper insights into Internet Object's advanced features!

---

**Try it yourself:** Experiment with Internet Object in the [Interactive Playground](https://playground.internetobject.org)

*Want to learn more? Visit [InternetObject.org](https://internetobject.org) for complete documentation and specifications.*
