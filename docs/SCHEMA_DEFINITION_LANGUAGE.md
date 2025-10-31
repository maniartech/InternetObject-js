# Schema Definition Language

Internet Object provides a powerful and intuitive schema definition language that enables you to define data structures, validation rules, and type constraints for your documents. This document provides a comprehensive guide to understanding and using the schema definition language effectively.

## Overview

The schema definition language in Internet Object serves multiple purposes:

- **Structure Definition**: Define the expected structure of your data
- **Type Safety**: Specify data types and constraints for validation
- **Reusability**: Create reusable schema definitions and variables
- **Documentation**: Self-documenting data structures

## Basic Schema Syntax

### Simple Schema Definition

The most basic form of schema definition is a comma-separated list of field names:

```io
name, age, email
---
John Doe, 30, john@example.com
```

### Typed Schema Definition

You can specify types for each field using the colon syntax:

```io
name: string, age: number, email: string
---
John Doe, 30, john@example.com
```

## Data Types

### Primitive Types

Internet Object supports several primitive data types:

#### String
```io
name: string
title: { string, maxLength: 100 }
description: { string, minLength: 10, maxLength: 500 }
```

#### Number
```io
age: number
price: { number, min: 0, max: 1000 }
rating: { number, min: 1, max: 5 }
```

#### Boolean
```io
isActive: bool
isPublished: { bool, default: false }
```

#### Date and Time
```io
createdAt: datetime
birthDate: date
startTime: time
```

### Derived Types

Internet Object provides several derived types for common use cases:

#### Integer Types
```io
id: int
count: int32
smallNumber: int16
byteValue: byte
```

#### String Derived Types
```io
email: email
website: url
birthDate: date
appointmentTime: time
timestamp: datetime
```

### Complex Types

#### Objects
```io
address: {
  street: string,
  city: string,
  state: string,
  zipCode: string
}
```

#### Arrays
```io
tags: [string]
scores: [number]
addresses: [{
  street: string,
  city: string
}]
```

## Schema Definitions and Variables

### Named Schema Definitions

You can define reusable schemas using the `$` prefix:

```io
~ $Address: {
    street: string,
    city: string,
    state: string,
    zipCode: string
  }

~ $Person: {
    name: string,
    age: number,
    address: $Address
  }

--- $Person
John Doe, 30, { 123 Main St, Anytown, CA, 12345 }
```

### Variables

Define reusable values using the `~` prefix:

```io
~ colors: [red, green, blue, yellow]
~ statuses: [active, inactive, pending]

~ $Product: {
    name: string,
    color: { string, choices: $colors },
    status: { string, choices: $statuses }
  }
```

## Advanced Schema Features

### Optional Fields

Mark fields as optional using the `?` suffix:

```io
name: string,
age?: number,
email?: string
```

### Default Values

Specify default values for fields:

```io
name: string,
isActive: { bool, default: true },
role: { string, default: "user" }
```

### Validation Constraints

#### String Constraints
```io
username: { string, minLength: 3, maxLength: 20 },
email: { string, pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" },
category: { string, choices: [tech, business, lifestyle] }
```

#### Number Constraints
```io
age: { number, min: 0, max: 120 },
price: { number, min: 0, precision: 2 },
rating: { number, min: 1, max: 5, step: 0.5 }
```

### Open Objects

Allow additional properties in objects using the wildcard `*`:

```io
person: {
  name: string,
  age: number,
  *: any  # Allow any additional properties
}
```

Typed open objects:

```io
metadata: {
  version: string,
  *: string  # Additional properties must be strings
}
```

## Schema Resolution and References

### Schema References

Reference previously defined schemas:

```io
~ $User: { name: string, email: string }
~ $Post: { title: string, author: $User }

--- $Post
My First Post, { John Doe, john@example.com }
```

### Nested Schema Definitions

```io
~ $Company: {
    name: string,
    employees: [{
      name: string,
      position: string,
      salary?: number
    }]
  }
```

## Collections and Multiple Sections

### Schema for Collections

```io
name: string, age: number, city: string
---
John, 30, New York
Jane, 25, Los Angeles
Bob, 35, Chicago
```

### Multiple Sections with Different Schemas

```io
~ $User: { name: string, email: string }
~ $Product: { name: string, price: number }

--- $User
John Doe, john@example.com
Jane Smith, jane@example.com

--- $Product
Laptop, 999.99
Mouse, 29.99
```

## Error Handling and Validation

### Schema Validation Errors

The schema system provides detailed error messages for validation failures:

- **Type Mismatch**: When data doesn't match the expected type
- **Missing Required Fields**: When required fields are not provided
- **Constraint Violations**: When data violates defined constraints
- **Unknown Properties**: When additional properties are provided but not allowed

### Example Error Scenarios

```io
# Schema
name: string, age: { number, min: 0, max: 120 }

# Invalid data - will cause validation errors
, -5  # Missing name, invalid age
```

## Best Practices

### 1. Use Descriptive Names

```io
# Good
firstName: string, lastName: string, emailAddress: string

# Avoid
fn: string, ln: string, email: string
```

### 2. Define Reusable Schemas

```io
# Good - reusable components
~ $Address: { street: string, city: string, state: string }
~ $Person: { name: string, address: $Address }

# Avoid - repetitive definitions
person1: { name: string, address: { street: string, city: string, state: string } }
person2: { name: string, address: { street: string, city: string, state: string } }
```

### 3. Use Appropriate Constraints

```io
# Good - meaningful constraints
email: { string, pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" },
age: { number, min: 0, max: 150 },
rating: { number, min: 1, max: 5 }

# Avoid - overly restrictive or meaningless constraints
name: { string, maxLength: 5 },  # Too restrictive
id: { number, min: -999999, max: 999999 }  # Not meaningful
```

### 4. Document Complex Schemas

```io
# User profile schema with comprehensive validation
~ $UserProfile: {
    # Basic information
    firstName: { string, minLength: 1, maxLength: 50 },
    lastName: { string, minLength: 1, maxLength: 50 },
    
    # Contact information
    email: { string, pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" },
    phone?: { string, pattern: "^\\+?[1-9]\\d{1,14}$" },
    
    # Profile data
    age: { number, min: 13, max: 120 },
    bio?: { string, maxLength: 500 },
    
    # Preferences
    preferences: {
        theme: { string, choices: [light, dark], default: "light" },
        notifications: { bool, default: true }
    }
  }
```

## Integration with JavaScript/TypeScript

### Using Schemas in Code

```typescript
import io from 'internet-object';

// Define schema
const userSchema = io.defs`
  name: string,
  age: number,
  email: string
`;

// Parse with schema validation
const user = io.doc.with(userSchema)`
  John Doe, 30, john@example.com
`;

console.log(user.toJSON());
```

### Type Safety

The schema definition language integrates with TypeScript to provide compile-time type safety:

```typescript
// Schema-aware parsing with type inference
const doc = io.doc`
  name: string, age: number, isActive: bool
  ---
  John, 30, true
`;

// TypeScript knows the structure
const firstUser = doc.sections[0].data[0];
// firstUser.name is string
// firstUser.age is number
// firstUser.isActive is boolean
```

## Conclusion

The Internet Object schema definition language provides a powerful, flexible, and intuitive way to define data structures and validation rules. By leveraging its features effectively, you can create robust, self-documenting data formats that are both human-readable and machine-processable.

The combination of simplicity for basic use cases and power for complex scenarios makes it an ideal choice for modern data interchange needs.