# Type Spec Template

This template should be used for all type specifications in Schema V2.

## Type: `<type-name>`

### Overview
Brief description of what this type represents and validates.

### Type Names
List of all type name aliases (e.g., `string`, `url`, `email`)

### Configuration Schema

```typescript
interface TypeConfig {
  type: string;              // Required: The type identifier
  default?: ValueType;       // Optional: Default value
  choices?: ValueType[];     // Optional: Allowed values
  optional?: boolean;        // Optional: Can be undefined
  null?: boolean;            // Optional: Can be null

  // Type-specific properties...
}
```

### Validation Rules

**Common Validations** (from `doCommonTypeCheck`):
1. **Undefined Check**
   - If value is `undefined`:
     - Return `memberDef.default` if defined
     - Return `undefined` if `optional: true`
     - Throw `VALUE_REQUIRED` error otherwise

2. **Null Check**
   - If value is `null`:
     - Return `null` if `null: true`
     - Throw `NULL_NOT_ALLOWED` error otherwise

3. **Choices Validation**
   - If `choices` array defined:
     - Resolve variable references (`@varName`) using `defs.getV()`
     - Check if value is in resolved choices
     - Throw `INVALID_CHOICE` error if not found

**Type-Specific Validations**:
List validation rules specific to this type...

### V1 Implementation Reference

```typescript
// Key excerpts from V1 implementation
```

### V2 Design

```typescript
class TypeTypeSchema implements TypeSchema<TypeConfig, ValueType> {
  readonly typeName = 'type-name';

  validate(value: unknown, config: TypeConfig, ctx: ValidationContext): ValidationResult<ValueType> {
    // Implementation outline
  }

  serialize(value: ValueType, config: TypeConfig, ctx: SerializationContext): string {
    // Serialization outline
  }
}
```

### Examples

#### Valid Cases
```typescript
// Example 1
```

#### Invalid Cases
```typescript
// Example 1
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| ERROR_CODE | When... | Message format... |

### Notes
- Any special considerations
- Edge cases
- Performance notes
