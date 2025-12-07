# Internet Object Streaming API

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

Sent once at the very beginning. It establishes:
-   **Metadata**: Stream ID, total records, etc.
-   **Schemas**: Definitions for the objects being streamed (optional if pre-shared).
-   **Default Schema**: The schema to apply when none is specified.

**Example Header:**
```ruby
~ streamId: "export-2024-001"
~ totalRecords: 50000
~ $user: { id:int, name:string, email:string }
~ $order: { id:int, userId:int, total:decimal }
~ $schema: $user   # Default schema
---
```

### 2. Data Chunks (The Content)

Data follows standard Internet Object syntax. Context switching is handled natively using the section separator `---`.

**Using Default Schema (`$user`):**
```ruby
~ 1, John, john@example.com
~ 2, Jane, jane@example.com
```

**Switching Schema (`$order`):**
```ruby
--- $order
~ 101, 1, 99.99
~ 102, 1, 45.50
```

**Mixed Content:**
A single transmission can contain multiple types.
```ruby
~ 3, Bob, bob@example.com
--- $order
~ 103, 2, 12.00
```

---

## Client API (`IOStream`)

The client provides a high-level `AsyncIterable` interface. It handles buffering, parsing, and validation internally, yielding simple, typed items to the application.

### `io.openStream(source, definitions?, options?)`

Opens a stream from a source (Response body, WebSocket, Node stream, etc.).

#### Parameters
-   `source`: The data source (e.g., `fetch` response body).
-   `definitions`: (Optional) Pre-shared schema definitions. Allows streaming without sending schemas in the header (useful for obfuscation/bandwidth).
-   `options`: Configuration options.

### Usage Example

```typescript
// 1. Open the stream
// Optional: Provide local definitions if not sent in header
const defs = io.defs`
  ~ $users: {id:int, name:string}
  ~ $orders: {id:int, total:decimal}`

const stream = io.openStream(response.body, defs);

// 2. Access Metadata (available after header is parsed)
console.log(`Stream ID: ${stream.header.get('streamId')}`);

// 3. Iterate Items
for await (const item of stream) {
  // Handle errors (e.g., validation failure for a specific row)
  if (item.error) {
    console.error(`Row ${item.index} invalid:`, item.error);
    continue;
  }

  // Handle different data types
  if (item.schema === 'user') {
    // item.data is typed as User
    await db.users.save(item.data);
  }
  else if (item.schema === 'order') {
    // item.data is typed as Order
    await db.orders.save(item.data);
  }
}
```

### Stream Item Structure

The iterator yields objects with this structure:

```typescript
interface StreamItem<T = any> {
  data: T;          // The parsed and validated object
  schema: string;   // The schema name (e.g., 'user', 'order')
  index: number;    // Global index in the stream
  error?: Error;    // Present if validation failed
}
```

---

## Server API (`IOStreamWriter`)

Helper class to generate the protocol format.

```typescript

const defs = io.defs`
  ~ $user: {id:int, name:string}
  ~ $order: {id:int, total:decimal}
  ~ $schema: $user`;

const writer = io.createStreamWriter(defs, options); // This includes external defs which wont be sent, but for validating and serializing

// You need to explicitly set header metadata
const clientHeader = io.defs`
  ~ streamId: "export-2024-001"
  ~ totalRecords: 1000
`

// 1. Send Header
writer.setHeader(clientHeader);
transport.send(writer.getHeader());

// 2. Send Data
// Uses default schema ($user)
transport.send(writer.write({ id: 1, name: "John" }));  // Implicitly uses $user to validate and serialize

// Switch schema explicitly
transport.send(writer.write({ id: 101, total: 99.99 }, 'order')); // Uses $order schema
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
3.  If neither exists, the item is marked as an error.

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

This protocol is purely text-based and works over any transport that preserves order.

-   **HTTP/1.1 Chunked**: Each chunk adds to the buffer.
-   **WebSocket**: Messages are pushed to the parser.
-   **TCP/Socket**: Raw bytes are fed to the parser.
-   **File System**: Read streams pipe directly.

End-of-stream is handled by the transport layer (e.g., closing the socket or HTTP response ending). The `IOStream` iterator finishes automatically.
