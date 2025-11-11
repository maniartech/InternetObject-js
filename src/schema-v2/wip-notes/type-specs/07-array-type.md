# Type Spec: Array Type

## Type: `array`

### Overview
Validates array/list values. Supports homogeneous arrays (all elements same type) and heterogeneous arrays (mixed types). Can validate element types, array length constraints, and nested structures including arrays of objects.

### Type Names
- `array` - Ordered collection of values

### TypeSchema Definition (ArrayTypeSchema)

This schema validates user-provided MemberDef configurations for array types.

**Array TypeSchema (IO Syntax):**

```io
# Always first three fields
type    : { array, default: array, choices: [array] },
default : { array, optional: true, "null": false },

# Other type specific fields - Following fields are specific to array type
of      : { any, optional: true, "null": false, __memberdef: true },
len     : { number, optional: true, "null": false, min: 0 },
minLen  : { number, optional: true, "null": false, min: 0 },
maxLen  : { number, optional: true, "null": false, min: 0 },

# Finally optional/null settings for all types
optional : { bool, optional: true, "null": false },
"null"   : { bool, optional: true, "null": false },
```

**Key Syntax Rules:**
- **Reserved word**: `"null"` must be quoted (it's a reserved keyword in IO)
- **First field `type`**: Uses special syntax `{array, default: array, choices: [array]}`
- **⚠️ CRITICAL - Meta-type marker `__memberdef: true` on `of` field**:
  - Indicates `of` contains a **type definition**, not data
  - Triggers **compilation** of the value as a MemberDef during schema parsing
  - Without this marker, system would try to validate `of` value as array data (wrong!)
  - Example: `of: {type: string}` is compiled into MemberDef, not validated as data
- **Other fields**: Use full MemberDef syntax `{ type, optional, "null", ... }`
- **Positional vs Named**: Supports both `{array, of: {type: string}}` and `{type: array, of: {type: string}}`

**Code (V1):**

```typescript
const schema = new Schema(
  "array",
  { type:     { type: "string", optional: false, null: false, choices: ["array"] } },
  { default:  { type: "array",  optional: true,  null: false } },
  { of:       { type: "any",    optional: true,  null: false, __memberdef: true } },
  { len:      { type: "number", optional: true,  null: false, min: 0 } },
  { minLen:   { type: "number", optional: true,  null: false, min: 0 } },
  { maxLen:   { type: "number", optional: true,  null: false, min: 0 } },
)
```

### TypeScript Interface (V2)

```typescript
interface ArrayConfig {
  type: 'array'
  default?: any[]
  of?: MemberDef | Schema       // Element type definition or schema for array of objects
  len?: number                  // Exact length required
  minLen?: number              // Minimum array length
  maxLen?: number              // Maximum array length
  optional?: boolean
  null?: boolean
}
```

### The `of` Field

The `of` field defines what type of elements the array contains:

**Primitive Element Type:**
```io
tags: {array, of: {type: string}}
scores: {array, of: {type: number, min: 0, max: 100}}
```

**Object Element Type (inline schema):**
```io
users: {array, of: {name: string, age: number}}
```

**Object Element Type (reference schema):**
```io
~ $user: { name: string, age: number }
~ $team: { members: {array, of: user} }
```

**Any Type (no validation):**
```io
data: {array}  ← Elements can be any type
data: {array, of: {type: any}}  ← Explicit any
```

### Validation Rules

**Common Validations** (from `doCommonTypeCheck`):
1. **Undefined Check** - Returns default, undefined (if optional), or throws error
2. **Null Check** - Returns null (if allowed) or throws error
3. **Choices Validation** - Not commonly used for arrays

**Type-Specific Validations**:

1. **Type Validation**
   - Must be an ArrayNode
   - Throws `NOT_AN_ARRAY` if not an array

2. **Length Validation**
   - If `len` defined: array length must equal len exactly
   - If `minLen` defined: array length must be >= minLen
   - If `maxLen` defined: array length must be <= maxLen
   - Throws `INVALID_LENGTH` or `OUT_OF_RANGE` if validation fails

3. **Element Validation**
   - Each element validated against `of` definition
   - If `of` is Schema: validates as object
   - If `of` is MemberDef: validates using specified type
   - If `of` not defined: validates as `any` (no validation)
   - Element errors include array index in path

### V1 Implementation Reference

```typescript
class ArrayDef implements TypeDef {
  parse(valueNode: Node, memberDef: MemberDef, defs?: Definitions): any[] {
    // 1. Resolve variable if needed
    const valueNode = defs?.getV(node) || node

    // 2. Common type checks (undefined, null, choices)
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    // 3. Type check: must be ArrayNode
    if (!(valueNode instanceof ArrayNode)) {
      throw new ValidationError(ErrorCodes.notAnArray, ...)
    }

    // 4. Determine element type
    let typeDef: TypeDef
    let arrayMemberDef: MemberDef

    if (memberDef.of instanceof Schema) {
      // Array of objects with schema
      typeDef = TypedefRegistry.get('object')
      arrayMemberDef.schema = memberDef.of
    } else if (memberDef.of?.type) {
      // Array of specific type
      typeDef = TypedefRegistry.get(memberDef.of.type)
      arrayMemberDef = memberDef.of
    } else {
      // Array of any
      typeDef = TypedefRegistry.get('any')
    }

    // 5. Validate each element
    const array: any[] = []
    valueNode.children.forEach((item) => {
      array.push(typeDef.parse(item, arrayMemberDef, defs))
    })

    return array
  }
}
```

### V2 Design

```typescript
class ArrayTypeSchema implements TypeSchema<ArrayConfig, any[]> {
  readonly typeName = 'array';

  validate(value: unknown, config: ArrayConfig, ctx: ValidationContext): ValidationResult<any[]> {
    // 1. Common checks (handled by base validator)
    const commonResult = doCommonTypeCheck(value, config, ctx);
    if (commonResult.handled) return commonResult;

    // 2. Type validation
    if (!Array.isArray(value)) {
      return ctx.error('NOT_AN_ARRAY', `Expected array for '${ctx.path}'`);
    }

    // 3. Length validation
    if (config.len !== undefined && value.length !== config.len) {
      return ctx.error('INVALID_LENGTH', `Array must have exactly ${config.len} elements, got ${value.length}`);
    }
    if (config.minLen !== undefined && value.length < config.minLen) {
      return ctx.error('OUT_OF_RANGE', `Array must have at least ${config.minLen} elements, got ${value.length}`);
    }
    if (config.maxLen !== undefined && value.length > config.maxLen) {
      return ctx.error('OUT_OF_RANGE', `Array must have at most ${config.maxLen} elements, got ${value.length}`);
    }

    // 4. Element validation
    const validatedArray: any[] = [];
    for (let i = 0; i < value.length; i++) {
      const elementCtx = ctx.push(`[${i}]`);
      const elementResult = this.validateElement(value[i], config.of, elementCtx);

      if (!elementResult.success) {
        return elementResult;  // Propagate element error
      }

      validatedArray.push(elementResult.value);
    }

    return ctx.success(validatedArray);
  }

  validateElement(value: unknown, ofConfig: MemberDef | Schema | undefined, ctx: ValidationContext): ValidationResult<any> {
    if (!ofConfig) {
      // No validation (any type)
      return ctx.success(value);
    }

    if (ofConfig instanceof Schema) {
      // Validate as object
      return ctx.validator.validateObject(value, ofConfig, ctx);
    }

    // Validate as MemberDef type
    const typeDef = ctx.registry.get(ofConfig.type);
    return typeDef.validate(value, ofConfig, ctx);
  }

  serialize(value: any[], config: ArrayConfig, ctx: SerializationContext): string {
    const elements = value.map(item => {
      if (config.of) {
        return this.serializeElement(item, config.of, ctx);
      }
      return ctx.serializeAny(item);
    });

    return `[${elements.join(', ')}]`;
  }
}
```

### Examples

#### User Schema Examples

**Array of primitives (positional):**
```io
tags: {array, of: {type: string}}
scores: {array, of: {type: number, min: 0, max: 100}, minLen: 1}
```

**Array of primitives (named):**
```io
tags: {type: array, of: {type: string}}
scores: {minLen: 1, type: array, of: {min: 0, type: number, max: 100}}
```

**Array of objects (inline schema):**
```io
items: {array, of: {sku: string, quantity: {number, min: 1}, price: decimal}}
```

**Array of objects (reference schema):**
```io
~ $item: { sku: string, quantity: number, price: decimal }
~ $order: { items: {array, of: item, minLen: 1} }
```

**Length constraints:**
```io
channels: {array, of: {type: int, min: 0, max: 255}, len: 3}  ← Exactly 3 elements
```

**Nested arrays:**
```io
rows: {array, of: {type: array, of: {type: number}}}
```

#### Valid Data Examples

```io
~ $product: { tags: {array, of: {type: string}}, scores: {array, of: {type: number}} }
---
~ : product
[electronics, laptop, gaming], [95, 87, 92]
```

**Array of objects:**
```io
~ $order: { items: {array, of: {sku: string, qty: number}} }
---
~ : order
[{sku: ABC123, qty: 2}, {sku: DEF456, qty: 1}]
```

**Positional data (CSV-style):**
```io
~ $order: { items: {array, of: {sku: string, qty: number}} }
---
~ : order
[[ABC123, 2], [DEF456, 1]]  ← Each array item matches schema by position
```

#### Invalid Data Examples

**Type mismatch:**
```io
~ $product: { tags: {array, of: {type: string}} }
---
~ : product
[electronics, 123, gaming]  ← Error: NOT_A_STRING at [1]
```

**Length violation:**
```io
~ $rgb: { channels: {array, len: 3} }
---
~ : rgb
[255, 128]  ← Error: INVALID_LENGTH (expected 3, got 2)
```

**Element validation failure:**
```io
~ $product: { scores: {array, of: {type: number, min: 0, max: 100}} }
---
~ : product
[95, 105, 87]  ← Error: OUT_OF_RANGE at [1] (105 > 100)
```

### Error Codes

| Code | Condition | Message Template |
|------|-----------|------------------|
| NOT_AN_ARRAY | Value is not an array | Expecting an array value for '{path}' |
| INVALID_LENGTH | Array length ≠ len | The array must have exactly {len} elements, got {actual} |
| OUT_OF_RANGE | Array length < minLen | The array must have at least {minLen} elements, got {actual} |
| OUT_OF_RANGE | Array length > maxLen | The array must have at most {maxLen} elements, got {actual} |
| INVALID_TYPE | Element type mismatch | Invalid type for '{path}[{index}]', expected {expectedType} |
| VALUE_REQUIRED | Value is undefined and not optional | Value required for {path} |
| NULL_NOT_ALLOWED | Value is null but null: false | Null value not allowed for {path} |

### Notes

**Homogeneous vs Heterogeneous:**
- With `of`: Homogeneous array (all elements same type)
- Without `of`: Heterogeneous array (mixed types, validated as `any`)

**Array of Objects:**
- Can use inline schema: `{array, of: {name: string, age: number}}`
- Can use reference schema: `{array, of: UserSchema}`
- Both styles equivalent

**Nested Arrays:**
- Arrays can contain arrays: `{array, of: {type: array, of: {type: number}}}`
- Unlimited nesting depth supported
- Each level independently validated

**Performance:**
- Element validation is O(n) where n = array length
- Large arrays with complex `of` schemas may be slow
- Consider pagination for very large arrays

**Empty Arrays:**
- Empty array `[]` is valid unless `minLen > 0` or `len > 0`
- Default `default: []` creates empty array when field omitted

**Positional vs Named (Data):**
- Array elements support both styles
- `[electronics, laptop]` - positional
- `[{name: electronics}, {name: laptop}]` - named
- Can mix: `[electronics, {name: laptop, category: tech}]`

**Error Reporting:**
- Element errors include index in path: `items[2].sku`
- Makes debugging large arrays easier
- Preserves full validation context

**V1 Special Handling:**
- `__memberdef: true` marker indicates `of` field is a MemberDef
- Distinguishes from regular schema fields
- Used during schema compilation

---

**Status:** Complete
**Last Updated:** 2025-01-21
