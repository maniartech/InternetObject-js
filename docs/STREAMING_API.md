# Internet Object Streaming Protocol and API

## Overview

The Streaming API provides a robust, transport-agnostic protocol for streaming Internet Object data. It is designed to be simple, efficient, and cross-platform compatible, allowing seamless communication between systems (e.g., Go server to JS client).

## Key Principles

1.  **Contract-First**: The stream starts with a **Header** that defines the context (schemas, metadata).
2.  **Multi-Schema Support**: A single stream can carry different types of objects (e.g., Users and Orders), switched via standard IO syntax.
3.  **Transport Agnostic**: Works over HTTP, WebSocket, TCP, or files. The protocol relies on IO syntax, not transport framing.
4.  **Implicit Validation**: The client automatically validates incoming data against the active schema.

---

## Protocol Structure

The stream consists of a **Header Chunk** (sent once) followed by a continuous flow of **Data Chunks**.

### 1. Header Chunk (The Contract)

Sent once at the very beginning. It establishes metadata and optionally defines schemas.

**Option A: With Schemas (Self-Describing)**
Useful for public APIs or when schemas change frequently.

```ruby
~ streamId: "export-2024-001"
~ totalRecords: 50000
~ $user: { id:int, name:string, email:string }
~ $order: { id:int, userId:int, total:decimal }
~ $schema: $user   # Default schema
---
```

**Option B: Without Schemas (Pre-Shared/Obfuscated)**
Useful for internal systems, bandwidth optimization, or obfuscation. The client must provide definitions.

```ruby
~ streamId: "secure-feed"
---
```

The header must end with a section separator `---` to indicate the end of the header. When schemas are not included, the client must have pre-shared definitions to decode the data.

### 2. Data Chunks (The Content)

Data follows standard Internet Object syntax. Context switching is handled natively using the section separator `---`.

#### Using Default Schema

When no schema is specified, the parser uses the default schema  (if available) to decode items. The default schema can be set in the header or provided via client options. If the default schema is not defined, items are deserialized without validation. You may access the members of the data items as per their index or key (if named).

```ruby
# If the default schema is not provided, the following items are deserialized
# without validation. The id and name fields can be accessed by their index.
# While the email field can be accessed by its key or index both.
~ 1, John, email: john@example.com
~ 2, Jane, email: jane@example.com
```

#### Switching Schema (`$order`)

```ruby
--- $order
~ 101, 1, 99.99
~ 102, 1, 45.50
```

#### Mixed Content

A single transmission can contain multiple kinds of data items. To indicate a schema switch, use the section separator followed by the schema name. In the absence of a schema name, the parser reverts to the default schema. As in the case of the example below:

```ruby
# This data section is validated against the default schema ($user)
~ 3, Bob, bob@example.com
~ 4, Alice, alice@example.com
~ 23, Charlie, charlie@example.com

--- $order
# This data section is validated against the $order schema
~ 103, 2, 12.00
~ 104, 3, 7.25
~ 105, 1, 150.00
```

## Client API (`IOStream`)

The client provides a high-level `AsyncIterable` interface. It handles buffering, parsing, and validation internally, yielding simple, typed items to the application.

### `io.openStream(source, definitions?, options?)`

Opens a stream from a source (Response body, WebSocket, Node stream, etc.).

#### Parameters
-   `source`: The data source (e.g., `fetch` response body).
-   `definitions`: (Optional) Pre-shared schema definitions. Allows streaming without sending schemas in the header (useful for obfuscation/bandwidth).
-   `options`: Configuration options.

### Usage Examples

#### Scenario A: Schemas in Stream (Self-Describing)
When the stream header includes schema definitions, the client doesn't need pre-shared definitions.

```typescript
// 1. Open the stream (no definitions needed)
const stream = io.openStream(response.body);

// 2. Iterate Items
for await (const item of stream) {
  if (item.schemaName === '$user') {
    console.log("User:", item.data);
  }
}
```

#### Scenario B: Schemas Pre-Shared (Obfuscated)
When the stream header omits schemas, the client must provide them.

```typescript
// 1. Define schemas locally
const defs = io.defs`
  ~ $user: {id:int, name:string}
  ~ $order: {id:int, total:decimal}`;

// 2. Open stream with definitions
const stream = io.openStream(response.body, defs);

// 3. Iterate Items
for await (const item of stream) {
  // ...
}
```

### Stream Item Structure

The iterator yields objects with this structure:

```typescript
interface StreamItem<T = any> {
  data: T;          // The parsed and validated object
  schemaName: string;   // The schema name (e.g., 'user', 'order')
  index: number;    // Global index in the stream
  error?: Error;    // Present if validation failed
}
```

## Server API (`IOStreamWriter`)

Helper class to generate the protocol format. The server sends the header once, followed by data items.

### Usage Examples

#### Scenario A: Sending Schemas in Header

The default behavior includes schemas in the header.

```typescript
const externalSchemaDef = io.defs`
  ~ $user: {id:int, name:string}
  ~ $order: {id:int, total:decimal}
  ~ $schema: $user`;

// Define stream-specific metadata
const header = io.defs`
  ~ streamId: "export-2024-001"
  ~ totalRecords: 1000`;

// Initialize writer with or without external definitions. External definitions
// allows you to reuse schema definitions across multiple streams and across
// server/client without including them in every stream.
const writer = io.createStreamWriter(transport, externalSchemaDef);


// Now we have created a writer that includes schema definitions, we dont need
// to add them again to the header. If you want to add metadata, you can set the
// header as below:
const metaHeader = io.defs`
  ~ streamId: "export-2024-001"
  ~ totalRecords: 1000`;


// Remember, header must be sent once at the start of the stream. It is not sent
// automatically.
writer.setHeader(metaHeader)
transport.send(writer.getHeader());


// 2. Send Data
transport.send(writer.write({ id: 1, name: "John" }));
```

#### Scenario B: Excluding Schemas from Header
Use options to prevent schemas from being written to the stream.

```typescript
const defs = io.defs`
  ~ $user: {id:int, name:string}
  ~ $order: {id:int, total:decimal}
  ~ $schema: $user`;

// Initialize with 'includeSchemas: false'
const writer = io.createStreamWriter(defs, { includeSchemas: false });

// Define stream-specific metadata
const header = io.defs`
  ~ streamId: "export-2024-001"
  ~ totalRecords: 1000`;

// 1. Set and Send Header
// (Contains only metadata, no schema defs)
writer.setHeader(header);
transport.send(writer.getHeader());

// 2. Send Data
transport.send(writer.write({ id: 1, name: "John" }));
```

---

## Advanced Scenarios

### 1. Streaming Without Header Schemas (Obfuscation)

The server sends only metadata in the header, keeping schemas private or pre-agreed.

**Server Output:**
```ruby
~ streamId: "secure-feed"
~ $schema: $user
---
~ 1, John
~ 2, Jane
```

**Client Code:**

```typescript
// Client must provide definitions to decode
const defs = io.defs`
  ~ $user: {id:int, name:string}`;

const stream = io.openStream(source, defs);
```

### 2. Default Schema Logic

If the stream data does not specify a schema (no `--- $name`), the parser uses:
1.  The `$schema` defined in the Header.
2.  The `defaultSchema` passed in `options` (if header doesn't specify).
3.  If neither exists, the item is deserialized without schema validation.

**Example Stream:**
```ruby
~ 1, A  # <-- Uses default ($user)
~ 2, B  # <-- Uses default ($user)
--- $order
~ 10, X # <-- Uses $order
~ 20, Y # <-- Uses $order
---     # <-- Switches back to default ($user)
~ 3, C
```

---

## Transport Compatibility

This protocol is purely text-based and works over any transport that preserves order. It will also work with any framework that allows streaming text data.

-   **HTTP/1.1 Chunked**: Each chunk adds to the buffer.
-   **WebSocket**: Messages are pushed to the parser.
-   **TCP/Socket**: Raw bytes are fed to the parser.
-   **File System**: Read streams pipe directly.

End-of-stream is handled by the transport layer (e.g., closing the socket or HTTP response ending). The `IOStream` iterator finishes automatically.

---

## Best Practices

### Stream IDs

While `streamId` is optional in the header, it is **highly recommended** for:
1.  **Debugging**: Tracing data flows across distributed systems.
2.  **Multiplexing**: Distinguishing multiple logical streams if sent over a single connection.
3.  **Logging**: Correlating server logs with client-side errors.

The protocol does not enforce any specific format for `streamId`, though UUIDs are commonly used.
