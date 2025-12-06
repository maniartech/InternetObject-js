# Internet Object Streaming API

## Overview

The Streaming API provides transport-agnostic streaming serialization and deserialization for Internet Object. It enables efficient, incremental processing of data without requiring the full dataset in memory.

## Key Characteristics

- **Transport Agnostic**: Pure serialization/deserialization - no HTTP, WebSocket, or transport layer dependencies
- **External Schema**: Schema definitions are shared externally, not embedded in the stream
- **Atomic Delivery**: Each item/batch is complete and self-contained
- **Unified API**: Single API for both real-time and batch streaming
- **Automatic Batching**: Batching is an internal optimization, transparent to the user

---

## API

### IOStreamWriter

Creates serialized IO stream output from JavaScript objects.

```typescript
const writer = io.createStreamWriter(schema, options?);
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `Schema \| string` | The schema definition for validation and serialization |
| `options` | `StreamWriterOptions` | Optional configuration |

#### StreamWriterOptions

```typescript
interface StreamWriterOptions {
  // Batching control
  batchSize?: number;         // Items per batch (default: 1 = real-time mode)
  flushInterval?: number;     // Auto-flush interval in ms (default: none)

  // Resume support
  startIndex?: number;        // Starting item index (default: 0)
  startBatchNo?: number;      // Starting batch number (default: 1)

  // Validation
  validate?: boolean;         // Validate before serializing (default: true)

  // Batch header options (only applies when batchSize > 1)
  includeTimestamp?: boolean;   // Add timestamp to header (default: true)
  includeChecksum?: boolean;    // Add checksum to header (default: false)
}
```

#### Methods

##### `write(item: object): string | null`

Serializes an item. Returns immediately in real-time mode, or buffers and returns batch when full.

```typescript
// Real-time mode (batchSize: 1, default)
const writer = io.createStreamWriter(schema);
const chunk = writer.write({ name: "John", age: 20, city: "Mumbai" });
// Returns: "~ John, 20, Mumbai\n"

// Batch mode (batchSize: 3)
const writer = io.createStreamWriter(schema, { batchSize: 3 });
writer.write({ name: "John", age: 20, city: "Mumbai" });   // null
writer.write({ name: "Ashok", age: 30, city: "Delhi" });   // null
const batch = writer.write({ name: "Priya", age: 25, city: "Bangalore" });
// Returns:
// ~ batchNo: 1
// ~ recordCount: 3
// ~ timestamp: 1733500000
// ---
// ~ John, 20, Mumbai
// ~ Ashok, 30, Delhi
// ~ Priya, 25, Bangalore
```

##### `writeMany(items: Iterable<object>): Generator<string>`

Writes multiple items, yielding output as available.

```typescript
const writer = io.createStreamWriter(schema, { batchSize: 2 });

for (const chunk of writer.writeMany(items)) {
  send(chunk);
}

// Don't forget remaining items
const remaining = writer.flush();
if (remaining) send(remaining);
```

##### `flush(): string | null`

Forces any buffered items to be emitted. Returns `null` if buffer is empty.

```typescript
const writer = io.createStreamWriter(schema, { batchSize: 100 });

writer.write(item1);
writer.write(item2);

// Force send incomplete batch
const batch = writer.flush();
```

##### `getIndex(): number`

Returns the total item count written.

##### `getBatchNo(): number`

Returns the current batch number (1-based).

##### `getPendingCount(): number`

Returns the number of items in the current unflushed buffer.

---

### IOStreamReader

Parses IO stream input into fully hydrated IOObject instances.

```typescript
const reader = io.createStreamReader(schema, options?);
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `Schema \| string` | The schema definition for validation and deserialization |
| `options` | `StreamReaderOptions` | Optional configuration |

#### StreamReaderOptions

```typescript
interface StreamReaderOptions {
  // Resume support
  startIndex?: number;        // Expected starting index (default: 0)

  // Validation
  validate?: boolean;               // Validate after parsing (default: true)
  validateChecksum?: boolean;       // Validate checksum if present (default: true)
  validateRecordCount?: boolean;    // Validate recordCount matches (default: true)

  // Error handling
  onError?: 'skip' | 'stop' | 'emit';  // Error strategy (default: 'stop')
}
```

#### Methods

##### `push(chunk: string): void`

Feeds incoming data to the reader. Handles partial data by buffering.

```typescript
const reader = io.createStreamReader(schema);

// Works with any chunk boundaries
reader.push("~ John, 20, Mum");
reader.push("bai\n~ Ashok, 30, Delhi\n");
```

##### `read(): IOObject | null`

Reads the next complete item, or `null` if none available.

```typescript
const reader = io.createStreamReader(schema);
reader.push("~ John, 20, Mumbai\n~ Ashok, 30, Delhi\n");

let item;
while ((item = reader.read()) !== null) {
  console.log(item.name, item.age, item.city);
}
```

##### `[Symbol.iterator](): Iterator<IOObject>`

Allows iteration over available items.

```typescript
const reader = io.createStreamReader(schema);
reader.push(chunk);

for (const item of reader) {
  processItem(item);
}
```

##### `getIndex(): number`

Returns the total item count read.

##### `getBatchNo(): number`

Returns the current batch number (for batch streams).

##### `getLastBatchMeta(): BatchMeta | null`

Returns metadata from the last read batch.

```typescript
interface BatchMeta {
  batchNo: number;
  recordCount: number;
  timestamp?: number;
  checksum?: string;
  [key: string]: any;  // Additional custom headers
}
```

##### `hasPartial(): boolean`

Returns `true` if there's buffered partial data.

##### `clear(): void`

Clears the internal buffer and resets state.

---

## Wire Format

### Real-time Mode (batchSize: 1)

Each item is sent immediately as a collection item:

```
~ John, 20, Mumbai
~ Ashok, 30, Delhi
~ Priya, 25, Bangalore
```

- `~` marks collection item
- Newline terminates each item
- Minimal overhead, lowest latency

### Batch Mode (batchSize > 1)

Items are grouped with a metadata header:

```
~ batchNo: 1
~ recordCount: 3
~ timestamp: 1733500000
---
~ John, 20, Mumbai
~ Ashok, 30, Delhi
~ Priya, 25, Bangalore
```

#### Header Fields

| Field | Type | Description |
|-------|------|-------------|
| `batchNo` | int | Sequential batch number (1-based) |
| `recordCount` | int | Number of items in this batch |
| `timestamp` | int | Unix timestamp when batch was created |
| `checksum` | string | Optional data integrity checksum |

- Standard IO document structure
- `---` separates header from data
- Fully compatible with `io.parse()`
- Header accessible via `doc.header.get("batchNo")`

### Reader Auto-Detection

The reader automatically detects the format:

```typescript
const reader = io.createStreamReader(schema);

// Handles both formats transparently
reader.push("~ John, 20, Mumbai\n");  // Real-time item
reader.push("~ batchNo: 1\n~ recordCount: 2\n---\n~ A, 1\n~ B, 2\n");  // Batch
```

---

## Resume Mechanism

The streaming API supports resumption after disconnection.

### Writer Side

```typescript
// Initial stream
const writer = io.createStreamWriter(schema, { batchSize: 100 });

// After reconnect - resume from where we left off
const writer = io.createStreamWriter(schema, {
  batchSize: 100,
  startIndex: lastSentIndex,
  startBatchNo: lastBatchNo,
});
```

### Reader Side

```typescript
const reader = io.createStreamReader(schema);

// On disconnect, save checkpoint
const checkpoint = {
  index: reader.getIndex(),
  batchNo: reader.getBatchNo(),
};
saveCheckpoint(checkpoint);

// On reconnect, request resume from checkpoint
requestResume(checkpoint);
```

---

## Data Integrity

### Record Count Validation

```typescript
const reader = io.createStreamReader(schema, {
  validateRecordCount: true  // default
});

// If batch header says recordCount: 10 but only 8 items arrive,
// throws IOValidationError
```

### Checksum Validation

```typescript
const writer = io.createStreamWriter(schema, {
  batchSize: 100,
  includeChecksum: true
});

// Output includes checksum:
// ~ batchNo: 1
// ~ recordCount: 100
// ~ checksum: "a1b2c3d4"
// ---
// ...

const reader = io.createStreamReader(schema, {
  validateChecksum: true  // Validates on read
});
```

---

## Error Handling

### Writer Errors

Validation errors throw immediately:

```typescript
const writer = io.createStreamWriter("name, age:int, city");

try {
  writer.write({ name: "John", age: "not a number", city: "Mumbai" });
} catch (error) {
  if (error instanceof IOValidationError) {
    console.error("Validation failed:", error.message);
  }
}
```

### Reader Errors

Error handling is controlled by the `onError` option:

| Mode | Behavior |
|------|----------|
| `'stop'` | Throws error, stops processing (default) |
| `'skip'` | Skips invalid item, continues to next |
| `'emit'` | Yields error object, continues processing |

```typescript
// Skip invalid items
const reader = io.createStreamReader(schema, { onError: 'skip' });

// Emit errors inline
const reader = io.createStreamReader(schema, { onError: 'emit' });
for (const result of reader) {
  if (result instanceof Error) {
    console.error("Parse error:", result);
  } else {
    processItem(result);
  }
}
```

---

## Complete Example

### Sender

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string, active:bool";

// Real-time mode for live updates
const writer = io.createStreamWriter(schema);

for (const user of users) {
  const chunk = writer.write(user);
  sendToTransport(chunk);  // Sends immediately
}
```

### Sender (Batch Mode)

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string, active:bool";

// Batch mode for bulk transfer
const writer = io.createStreamWriter(schema, {
  batchSize: 100,
  includeTimestamp: true,
});

for (const user of users) {
  const batch = writer.write(user);
  if (batch) {
    await sendToTransport(batch);
  }
}

// Send remaining items
const remaining = writer.flush();
if (remaining) {
  await sendToTransport(remaining);
}
```

### Receiver

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string, active:bool";
const reader = io.createStreamReader(schema);

transport.onData((chunk) => {
  reader.push(chunk);

  for (const user of reader) {
    // user is IOObject with full keys
    console.log(user.id, user.name, user.email, user.active);
    saveToDatabase(user);
  }
});

transport.onDisconnect(() => {
  saveCheckpoint({
    index: reader.getIndex(),
    batchNo: reader.getBatchNo(),
  });
});

transport.onReconnect(() => {
  const checkpoint = loadCheckpoint();
  requestResume(checkpoint);
});
```

---

## Choosing Real-time vs Batch Mode

| Scenario | batchSize | Why |
|----------|-----------|-----|
| Live updates, chat | 1 | Lowest latency |
| Sensor data, logs | 1 | Real-time delivery |
| Bulk data transfer | 100-1000 | Throughput optimization |
| API pagination | Page size | Natural batch boundaries |
| Unreliable network | 50-100 | Batch-level recovery |

### Performance Comparison

```
Real-time (batchSize: 1) - 10,000 items:
  - 10,000 send() calls
  - Higher per-item overhead
  - Lowest latency

Batch (batchSize: 100) - 10,000 items:
  - 100 send() calls
  - Lower overhead
  - 5-10x better throughput
```

---

## Design Decisions

1. **Unified API**: Single `createStreamWriter`/`createStreamReader` handles both real-time and batch modes. Batching is a configuration option, not a separate API.

2. **External Schema**: Schema is not transmitted in the stream to minimize bandwidth. Schema versioning is handled at the application level.

3. **Automatic Format Detection**: Reader auto-detects real-time vs batch format, so receivers don't need to know sender's configuration.

4. **Standard IO Document Structure**: Batch headers use standard IO syntax (`~ key: value` + `---`), making batches parseable with regular `io.parse()`.

5. **Transparent Iteration**: Users iterate over items regardless of wire format. Batching is invisible to the consumer.

6. **Atomic Batches**: In batch mode, entire batches are atomic units. Simplifies error handling and provides natural checkpointing.

7. **Transport Agnostic**: Works with any transport - TCP, WebSocket, HTTP streaming, files, IPC, etc.
