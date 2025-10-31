# Internet Object AST Specification

## Overview

This document defines the complete Abstract Syntax Tree (AST) specification for Internet Object format. It provides language-agnostic behavioral contracts for AST node types, construction rules, and traversal patterns that all implementations must follow to ensure identical AST behavior across different programming languages and platforms.

## AST Node Hierarchy

### Base Node Interface

All AST nodes MUST implement the base Node interface:

```
Node Interface:
  - getStartPos(): Position     - Returns starting position in source
  - getEndPos(): Position       - Returns ending position in source  
  - toValue(defs?: Definitions) - Converts node to runtime value
  - type: String                - Node type identifier
```

### Position Interface

Position tracking MUST provide:

```
Position:
  - row: Integer    - Line number (1-based)
  - col: Integer    - Column number (1-based)  
  - pos: Integer    - Character offset (0-based)
```

### Core Node Types

All implementations MUST support these AST node types:

#### 1. DocumentNode

**Purpose**: Root node representing an entire Internet Object document

```
DocumentNode:
  - type: "document"
  - header: SectionNode | null          - Optional header section with definitions
  - children: Array<SectionNode>        - Data sections
  
Methods:
  - toValue(defs?: Definitions): Document
  - getStartPos(): Position
  - getEndPos(): Position
  - firstChild(): SectionNode | null
```

**Construction Rules**:
1. Header section contains definitions and schemas (optional)
2. Children array contains zero or more data sections
3. Empty document has null header and empty children array
4. Position spans from first token to last token

#### 2. SectionNode

**Purpose**: Represents a logical section of data with optional name and schema

```
SectionNode:
  - type: "section"
  - child: CollectionNode | ObjectNode | null  - Section data
  - nameNode: TokenNode | null                 - Optional section name
  - schemaNode: TokenNode | null               - Optional schema reference
  
Properties:
  - name: String                               - Resolved section name
  - schemaName: String                         - Resolved schema name
  
Methods:
  - toValue(defs?: Definitions): Section
  - getStartPos(): Position
  - getEndPos(): Position
  - firstChild(): CollectionNode | ObjectNode | null
  - firstChildObject(): ObjectNode | null
```

**Construction Rules**:
1. Child contains the actual data (object or collection)
2. NameNode contains section identifier (if present)
3. SchemaNode contains schema reference starting with '$' (if present)
4. Default schema name is "$schema" if not specified
5. Section name defaults to schema name (without '$') or "unnamed"

#### 3. ObjectNode

**Purpose**: Represents a structured object with key-value pairs

```
ObjectNode:
  - type: "object"
  - children: Array<MemberNode | undefined>    - Object members
  - openBracket: Token | undefined             - Opening '{' token (if present)
  - closeBracket: Token | undefined            - Closing '}' token (if present)
  
Methods:
  - toValue(defs?: Definitions): InternetObject
  - toObject(defs?: Definitions): PlainObject
  - getStartPos(): Position
  - getEndPos(): Position
  - isEmpty(): Boolean
  - hasKey(key: String): Boolean
  - getKeys(): Array<String>
  - isValid(): Boolean
```

**Construction Rules**:
1. Children array contains MemberNode instances or undefined for empty slots
2. Brackets are optional (objects can be implicit)
3. Members can have keys (named) or be positional (indexed)
4. Undefined members represent gaps in positional objects
5. Position spans from opening bracket (if present) to closing bracket, or from first to last member

#### 4. ArrayNode

**Purpose**: Represents an ordered collection of values

```
ArrayNode:
  - type: "array"
  - children: Array<Node | undefined>          - Array elements
  - openBracket: Token                         - Opening '[' token
  - closeBracket: Token                        - Closing ']' token
  
Methods:
  - toValue(defs?: Definitions): Array<Any>
  - getStartPos(): Position
  - getEndPos(): Position
```

**Construction Rules**:
1. Children array contains any Node type or undefined for empty slots
2. Brackets are required for arrays
3. Elements are ordered by index
4. Undefined elements represent gaps in sparse arrays
5. Position spans from opening bracket to closing bracket

#### 5. CollectionNode

**Purpose**: Represents a collection of objects (array of objects)

```
CollectionNode:
  - type: "collection"
  - children: Array<Node | undefined>          - Collection items
  
Methods:
  - toValue(defs?: Definitions): Collection
  - getStartPos(): Position
  - getEndPos(): Position
  - isEmpty(): Boolean
  - size(): Integer
  - hasValidItems(): Boolean
  - getValidItems(): Array<Node>
  - isValid(): Boolean
```

**Construction Rules**:
1. Children typically contain ObjectNode instances
2. No explicit delimiters (implicit collection)
3. Items are separated by whitespace or newlines
4. Position spans from first item to last item
5. Empty collection has empty children array

#### 6. MemberNode

**Purpose**: Represents a key-value pair within an object

```
MemberNode:
  - type: "member"
  - key: TokenNode | undefined                 - Member key (if named)
  - value: Node                                - Member value
  
Methods:
  - toValue(defs?: Definitions): Any
  - getStartPos(): Position
  - getEndPos(): Position
```

**Construction Rules**:
1. Key is optional (positional members have no key)
2. Value is required and can be any Node type
3. Key must be a string token if present
4. Position spans from key (if present) to end of value

#### 7. TokenNode

**Purpose**: Represents leaf nodes containing literal values

```
TokenNode:
  - type: "token"
  - pos: Integer                               - Token position
  - row: Integer                               - Token row
  - col: Integer                               - Token column
  - token: String                              - Raw token text
  - value: Any                                 - Parsed value
  - tokenType: String                          - Token type
  - subType: String | undefined                - Token subtype
  
Methods:
  - toValue(defs?: Definitions): Any
  - getStartPos(): Position
  - getEndPos(): Position
  - clone(): TokenNode
```

**Construction Rules**:
1. Inherits from Token class with Node interface
2. Value contains parsed representation of token
3. Handles variable resolution through definitions
4. Position information matches original token

#### 8. ErrorNode

**Purpose**: Represents parsing errors while allowing continued processing

```
ErrorNode:
  - type: "error"
  - error: Error                               - The error that occurred
  - position: Position                         - Error location
  - recoveryNode: Node | null                  - Recovered partial node
  
Methods:
  - toValue(defs?: Definitions): throws Error
  - getStartPos(): Position
  - getEndPos(): Position
```

**Construction Rules**:
1. Created when parsing errors occur
2. Contains original error information
3. May contain partially parsed node for recovery
4. Position indicates error location

## AST Construction Rules

### Parsing Pipeline

AST construction follows this pipeline:

```
1. Tokenization    -> Token Stream
2. Syntax Analysis -> AST Construction  
3. Validation      -> Error Detection
4. Optimization    -> AST Refinement
```

### Construction Phases

#### Phase 1: Token Stream Processing

1. **Token Grouping**: Group related tokens (e.g., object members)
2. **Structure Detection**: Identify structural boundaries (objects, arrays, sections)
3. **Nesting Analysis**: Determine parent-child relationships
4. **Error Recovery**: Handle malformed input gracefully

#### Phase 2: Node Creation

1. **Bottom-Up Construction**: Build leaf nodes first (TokenNodes)
2. **Container Assembly**: Assemble container nodes (Objects, Arrays, Collections)
3. **Section Organization**: Group data into sections
4. **Document Assembly**: Create root DocumentNode

#### Phase 3: Relationship Establishment

1. **Parent-Child Links**: Establish bidirectional relationships
2. **Position Calculation**: Compute accurate position ranges
3. **Type Resolution**: Resolve node types and subtypes
4. **Reference Validation**: Validate schema and variable references

### Node Relationship Rules

#### Parent-Child Relationships

```
DocumentNode
├── SectionNode (header)
└── SectionNode[] (children)
    └── ObjectNode | CollectionNode (child)
        ├── MemberNode[] (for ObjectNode)
        │   ├── TokenNode (key, optional)
        │   └── Node (value)
        └── Node[] (for CollectionNode)
            └── ObjectNode | ArrayNode | TokenNode
                └── [recursive structure]
```

#### Sibling Relationships

1. **Section Siblings**: Multiple sections in document
2. **Member Siblings**: Multiple members in object
3. **Element Siblings**: Multiple elements in array/collection
4. **Ordered Positioning**: Siblings maintain source order

#### Reference Relationships

1. **Schema References**: SectionNode.schemaNode references schema definitions
2. **Variable References**: TokenNode values may reference variable definitions
3. **Definition Scope**: References resolved within appropriate scope

## AST Traversal Patterns

### Standard Traversal Methods

All implementations SHOULD provide these traversal patterns:

#### 1. Depth-First Traversal

```
traverse(node: Node, visitor: NodeVisitor): void
  - Pre-order: Visit node before children
  - In-order: Visit node between children (for binary structures)
  - Post-order: Visit node after children
```

#### 2. Breadth-First Traversal

```
traverseBreadthFirst(node: Node, visitor: NodeVisitor): void
  - Level-order: Visit all nodes at current depth before descending
```

#### 3. Selective Traversal

```
traverseType(node: Node, nodeType: String, visitor: NodeVisitor): void
  - Visit only nodes of specified type
  
traverseWhere(node: Node, predicate: NodePredicate, visitor: NodeVisitor): void
  - Visit only nodes matching predicate
```

### Visitor Pattern Interface

```
NodeVisitor:
  - visitDocument(node: DocumentNode): VisitorResult
  - visitSection(node: SectionNode): VisitorResult
  - visitObject(node: ObjectNode): VisitorResult
  - visitArray(node: ArrayNode): VisitorResult
  - visitCollection(node: CollectionNode): VisitorResult
  - visitMember(node: MemberNode): VisitorResult
  - visitToken(node: TokenNode): VisitorResult
  - visitError(node: ErrorNode): VisitorResult

VisitorResult:
  - CONTINUE    - Continue traversal normally
  - SKIP        - Skip children of current node
  - STOP        - Stop traversal entirely
```

## AST Validation Rules

### Structural Validation

#### Document Level

1. **Single Root**: Document must have exactly one DocumentNode root
2. **Header Uniqueness**: At most one header section allowed
3. **Section Order**: Header section (if present) must come first
4. **Non-Empty Content**: Document must contain at least header or data sections

#### Section Level

1. **Child Consistency**: Section child must be ObjectNode, CollectionNode, or null
2. **Schema Format**: Schema references must start with '$' character
3. **Name Validity**: Section names must be valid identifiers
4. **Content Requirement**: Sections should contain meaningful data

#### Object Level

1. **Member Validity**: All members must be MemberNode instances or undefined
2. **Key Uniqueness**: Named members must have unique keys within object
3. **Key Format**: Member keys must be string tokens
4. **Bracket Matching**: If brackets present, must be properly paired

#### Array Level

1. **Bracket Requirement**: Arrays must have both opening and closing brackets
2. **Element Types**: Elements can be any Node type or undefined
3. **Index Consistency**: Element positions must align with array indices

#### Collection Level

1. **Item Homogeneity**: Collection items should be compatible types
2. **Non-Empty Preference**: Collections should contain at least one item
3. **Object Preference**: Collection items typically should be ObjectNodes

### Semantic Validation

#### Reference Validation

1. **Schema Existence**: Referenced schemas must be defined
2. **Variable Existence**: Referenced variables must be defined
3. **Circular References**: Detect and prevent circular schema references
4. **Scope Compliance**: References must respect definition scope rules

#### Type Consistency

1. **Value Types**: Token values must match their declared types
2. **Schema Compliance**: Objects must conform to their declared schemas
3. **Collection Homogeneity**: Collection items should have compatible schemas
4. **Constraint Satisfaction**: Values must satisfy schema constraints

#### Position Consistency

1. **Range Validity**: Position ranges must be valid (start ≤ end)
2. **Parent Containment**: Child positions must be within parent positions
3. **Sibling Ordering**: Sibling positions must reflect source order
4. **Gap Detection**: Identify and report position gaps or overlaps

## Error Handling in AST

### Error Recovery Strategies

#### 1. Error Node Insertion

```
When: Parsing error occurs
Action: Create ErrorNode with error details
Recovery: Continue parsing from next valid token
Result: Partial AST with error markers
```

#### 2. Node Substitution

```
When: Invalid node structure detected
Action: Replace with valid default node
Recovery: Use sensible defaults (empty object, null value)
Result: Valid AST with substituted nodes
```

#### 3. Graceful Degradation

```
When: Critical structure missing
Action: Infer missing structure
Recovery: Add implied nodes (brackets, separators)
Result: Complete AST with inferred elements
```

### Error Information Preservation

All error handling MUST preserve:

1. **Original Error**: Complete error details and stack trace
2. **Error Position**: Exact location where error occurred
3. **Recovery Context**: Information about recovery actions taken
4. **Partial Results**: Any successfully parsed partial nodes

## Performance Requirements

### Construction Performance

All implementations MUST achieve:

1. **Linear Complexity**: O(n) construction time relative to input size
2. **Memory Efficiency**: Minimal memory overhead beyond necessary node storage
3. **Streaming Support**: Ability to construct AST incrementally
4. **Concurrent Safety**: Thread-safe construction for different inputs

### Traversal Performance

All implementations SHOULD provide:

1. **Efficient Iteration**: O(n) traversal time for visiting all nodes
2. **Selective Traversal**: Optimized traversal for specific node types
3. **Early Termination**: Ability to stop traversal based on conditions
4. **Memory Locality**: Cache-friendly traversal patterns

### Memory Management

All implementations MUST handle:

1. **Node Lifecycle**: Proper creation and cleanup of nodes
2. **Reference Management**: Avoid memory leaks from circular references
3. **Large Documents**: Efficient handling of large AST structures
4. **Garbage Collection**: Language-appropriate memory management

## Language-Specific Adaptations

### Allowed Variations

While maintaining behavioral consistency, implementations MAY adapt:

1. **Node Representation**: Use language-appropriate class/struct definitions
2. **Collection Types**: Use native collection types (arrays, lists, maps)
3. **Error Handling**: Use language-native exception/error mechanisms
4. **Memory Management**: Follow language-specific memory patterns
5. **API Style**: Provide idiomatic APIs for the target language

### Required Consistency

All implementations MUST maintain:

1. **Node Types**: Identical node type hierarchy and semantics
2. **Traversal Results**: Identical traversal order and results
3. **Position Information**: Consistent position calculation and reporting
4. **Value Conversion**: Identical toValue() results for equivalent ASTs
5. **Error Semantics**: Consistent error detection and recovery behavior

## Specification Compliance

### Validation Checklist

- [ ] All node types implemented with correct interfaces
- [ ] Construction rules followed for all node types
- [ ] Traversal patterns implemented correctly
- [ ] Validation rules enforced appropriately
- [ ] Error handling provides graceful recovery
- [ ] Performance requirements met
- [ ] Position tracking accurate and consistent
- [ ] Reference resolution working correctly
- [ ] Memory management appropriate for language
- [ ] Thread safety verified (if applicable)

### Testing Requirements

All implementations MUST pass:

1. **Construction Tests**: Verify correct AST construction from tokens
2. **Traversal Tests**: Validate all traversal patterns and visitor support
3. **Validation Tests**: Ensure structural and semantic validation works
4. **Error Tests**: Verify error recovery and ErrorNode creation
5. **Performance Tests**: Meet minimum performance requirements
6. **Position Tests**: Validate accurate position tracking
7. **Reference Tests**: Verify schema and variable reference resolution
8. **Edge Case Tests**: Handle malformed input gracefully

### Version Compatibility

This specification is version 1.0. Future versions will:

1. **Maintain Backward Compatibility**: Existing ASTs continue to work
2. **Add New Node Types**: New node types may be added for new features
3. **Extend Interfaces**: Node interfaces may gain new optional methods
4. **Deprecate Carefully**: Deprecated features will have long transition periods
5. **Document Changes**: All changes will be clearly documented with migration guides