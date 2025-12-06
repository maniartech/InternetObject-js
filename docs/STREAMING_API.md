# Internet Object Streaming API

## Overview

The Streaming API provides transport-agnostic streaming serialization and deserialization for Internet Object. It enables efficient, incremental processing of data without requiring the full dataset in memory.

## Key Characteristics

- **Transport Agnostic**: Pure serialization/deserialization - no HTTP, WebSocket, or transport layer dependencies
- **External Schema**: Schema definitions are shared externally, not embedded in the stream
- **Document-Based**: Each streamed unit is a complete `IODocument`
- **Unified API**: Single API handles both real-time and batch streaming
- **Developer-Friendly**: Reuses existing `IODocument`, `IOObject` classes - no new concepts

---

## Core Concepts

### Streaming Model

```
Writer                              Reader
  │                                   │
  ├─ write(item) ──────────────────► push(docString)
  │     │                             │
  │     ▼                             ▼
  │  IODocument string            IOStreamResult
  │                                   │
  │                                   ├── documents: IODocument[]
  │                                   ├── items()
  │                                   └── toCompleteDocument()
```

- **Writer**: Validates objects → Serializes to complete `IODocument` strings
- **Reader**: Receives complete `IODocument` strings → Parses → Validates → Collects into `IOStreamResult`
- **IOStreamResult**: Collection of `IODocument`s with convenience methods

### Wire Format

Each streamed unit is a complete IO document. Two modes:

**Real-time Mode** (single items):
```ruby
~ John, 20, Mumbai
```

**Batch Mode** (with headers):
```ruby
~ batchNo: 1
~ recordCount: 3
~ timestamp: 1733500000
---
~ John, 20, Mumbai
~ Ashok, 30, Delhi
~ Priya, 25, Bangalore
```

---

## API

### IOStreamWriter

Creates serialized IO document strings from JavaScript objects.

```typescript
const writer = io.createStreamWriter(schema, options?);
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `Schema \| string` | Schema for validation and serialization |
| `options` | `StreamWriterOptions` | Optional configuration |

#### StreamWriterOptions

```typescript
interface StreamWriterOptions {
  // Batching control
  batchSize?: number;           // Items per batch (default: 1 = real-time)

  // Resume support
  startIndex?: number;          // Starting item index (default: 0)
  startBatchNo?: number;        // Starting batch number (default: 1)

  // Validation
  validate?: boolean;           // Validate before serializing (default: true)

  // Batch headers (only when batchSize > 1)
  includeTimestamp?: boolean;   // Add timestamp (default: true)
  includeChecksum?: boolean;    // Add checksum (default: false)
}
```

#### Methods

##### `write(item: object): string | null`

Serializes an item. Returns complete document string immediately in real-time mode, or `null` while buffering in batch mode.

```typescript
// Real-time mode (batchSize: 1)
const writer = io.createStreamWriter(schema);
const doc = writer.write({ name: "John", age: 20, city: "Mumbai" });
// Returns: "~ John, 20, Mumbai"

// Batch mode (batchSize: 3)
const writer = io.createStreamWriter(schema, { batchSize: 3 });
writer.write({ name: "John", age: 20, city: "Mumbai" });   // null
writer.write({ name: "Ashok", age: 30, city: "Delhi" });   // null
const doc = writer.write({ name: "Priya", age: 25, city: "Bangalore" });
// Returns complete batch document:
// ~ batchNo: 1
// ~ recordCount: 3
// ~ timestamp: 1733500000
// ---
// ~ John, 20, Mumbai
// ~ Ashok, 30, Delhi
// ~ Priya, 25, Bangalore
```

##### `writeMany(items: Iterable<object>): Generator<string>`

Writes multiple items, yielding complete documents as available.

```typescript
const writer = io.createStreamWriter(schema, { batchSize: 100 });

for (const doc of writer.writeMany(items)) {
  send(doc);
}

// Flush remaining
const remaining = writer.flush();
if (remaining) send(remaining);
```

##### `flush(): string | null`

Forces buffered items to be emitted as a document. Returns `null` if buffer is empty.

```typescript
const writer = io.createStreamWriter(schema, { batchSize: 100 });

writer.write(item1);
writer.write(item2);

const doc = writer.flush();  // Emits batch with 2 items
```

##### `getIndex(): number`

Returns total item count written.

##### `getBatchNo(): number`

Returns current batch number (1-based).

##### `getPendingCount(): number`

Returns items in unflushed buffer.

---

### IOStreamReader

Parses IO document strings into `IOStreamResult`.

```typescript
const reader = io.createStreamReader(schema, options?);
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `schema` | `Schema \| string` | Schema for validation and deserialization |
| `options` | `StreamReaderOptions` | Optional configuration |

#### StreamReaderOptions

```typescript
interface StreamReaderOptions {
  // Validation
  validate?: boolean;               // Validate after parsing (default: true)
  validateChecksum?: boolean;       // Validate checksum if present (default: true)
  validateRecordCount?: boolean;    // Validate recordCount matches (default: true)

  // Error handling
  onError?: 'skip' | 'stop' | 'emit';  // Error strategy (default: 'stop')
}
```

#### Methods

##### `push(docString: string): void`

Pushes a complete IO document string to the reader.

```typescript
const reader = io.createStreamReader(schema);

// Push single item
reader.push("~ John, 20, Mumbai");

// Push batch
reader.push(`
~ batchNo: 1
~ recordCount: 2
---
~ Ashok, 30, Delhi
~ Priya, 25, Bangalore
`);
```

##### `getResult(): IOStreamResult`

Returns the accumulated stream result.

```typescript
const result = reader.getResult();

// Iterate documents
for (const doc of result) {
  console.log(doc.header.get("batchNo"));
}

// Or iterate all items
for (const item of result.items()) {
  process(item);
}
```

##### `onDocument(callback: (doc: IODocument) => void): void`

Registers callback for each document as it arrives (for memory-efficient processing).

```typescript
reader.onDocument((doc) => {
  process(doc);
  // doc can be GC'd after callback
});
```

##### `clear(): void`

Clears the accumulated result.

---

### IOStreamResult

Collection of `IODocument`s received via streaming.

```typescript
class IOStreamResult<T = any> implements Iterable<IODocument<T>> {
  // Document access
  readonly documents: IODocument<T>[];
  getDocument(index: number): IODocument<T> | undefined;
  lastDocument(): IODocument<T> | undefined;

  // Iteration
  [Symbol.iterator](): Iterator<IODocument<T>>;

  // Flatten to items
  items(): IterableIterator<IOObject<T>>;

  // Merge into single document
  toCompleteDocument(): IODocument<T>;

  // Stats
  readonly totalDocuments: number;
  readonly totalItems: number;

  // Errors
  readonly errors: StreamError[];

  // Conversion
  toDocuments(): IODocument<T>[];
  toItems(): IOObject<T>[];
  toJSON(): any;
}
```

#### `toCompleteDocument()`

Merges all received documents into a single `IODocument` with aggregated headers.

```typescript
const result = reader.getResult();
const complete = result.toCompleteDocument();

// Aggregated headers
complete.header.get("recordCount");    // 250 (sum of all batches)
complete.header.get("batchCount");     // 3 (total batches)
complete.header.get("firstBatchNo");   // 1
complete.header.get("lastBatchNo");    // 3
complete.header.get("startTime");      // First timestamp
complete.header.get("endTime");        // Last timestamp

// All items in one collection
for (const item of complete.body) {
  process(item);
}
```

##### Header Aggregation Rules

| Header | Aggregation |
|--------|-------------|
| `recordCount` | Sum of all batch counts |
| `batchCount` | Number of documents |
| `firstBatchNo` | First batch number |
| `lastBatchNo` | Last batch number |
| `startTime` | First timestamp |
| `endTime` | Last timestamp |
| `checksum` | Recomputed over all items |
| Custom headers | Last value wins |

---

## Batch Headers

When using batch mode (`batchSize > 1`), each document includes metadata headers:

```ruby
~ batchNo: 1
~ recordCount: 100
~ timestamp: 1733500000
~ checksum: a1b2c3d4
---
~ John, 20, Mumbai
~ Ashok, 30, Delhi
...
```

### Standard Headers

| Header | Type | Description |
|--------|------|-------------|
| `batchNo` | int | Sequential batch number (1-based) |
| `recordCount` | int | Number of items in this batch |
| `timestamp` | int | Unix timestamp when batch was created |
| `checksum` | string | Optional data integrity checksum |

### Custom Headers

Add any custom headers as needed:

```typescript
const writer = io.createStreamWriter(schema, {
  batchSize: 100,
  customHeaders: {
    source: "sensor-1",
    version: "2.0",
  }
});
```

---

## Resume Mechanism

### Writer Side

```typescript
// Initial stream
const writer = io.createStreamWriter(schema, { batchSize: 100 });

// After reconnect - resume from checkpoint
const writer = io.createStreamWriter(schema, {
  batchSize: 100,
  startIndex: lastSentIndex,
  startBatchNo: lastBatchNo,
});
```

### Reader Side

```typescript
const reader = io.createStreamReader(schema);

// Save checkpoint on disconnect
const lastDoc = reader.getResult().lastDocument();
const checkpoint = {
  batchNo: lastDoc?.header.get("batchNo"),
  index: reader.getResult().totalItems,
};
saveCheckpoint(checkpoint);

// Request resume from sender
requestResume(checkpoint);
```

---

## Error Handling

### Writer Errors

Validation errors throw immediately:

```typescript
const writer = io.createStreamWriter("name, age:int, city");

try {
  writer.write({ name: "John", age: "invalid", city: "Mumbai" });
} catch (error) {
  if (error instanceof IOValidationError) {
    console.error("Validation failed:", error.message);
  }
}
```

### Reader Errors

Controlled by `onError` option:

| Mode | Behavior |
|------|----------|
| `'stop'` | Throws error, stops processing (default) |
| `'skip'` | Skips invalid document, continues |
| `'emit'` | Adds to `result.errors`, continues |

```typescript
const reader = io.createStreamReader(schema, { onError: 'emit' });

reader.push(validDoc);
reader.push(invalidDoc);  // Added to errors
reader.push(validDoc);

const result = reader.getResult();
console.log(result.errors);  // [StreamError for invalidDoc]
```

---

## Complete Examples

### Sender (Real-time)

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string";
const writer = io.createStreamWriter(schema);

for (const user of users) {
  const doc = writer.write(user);
  sendToTransport(doc);  // Immediate send
}
```

### Sender (Batch)

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string";
const writer = io.createStreamWriter(schema, {
  batchSize: 100,
  includeTimestamp: true,
});

for (const user of users) {
  const doc = writer.write(user);
  if (doc) {
    await sendToTransport(doc);
  }
}

// Send remaining
const remaining = writer.flush();
if (remaining) {
  await sendToTransport(remaining);
}
```

### Receiver

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string";
const reader = io.createStreamReader(schema);

transport.onData((docString) => {
  reader.push(docString);
});

transport.onEnd(() => {
  const result = reader.getResult();

  // Option 1: Process per document
  for (const doc of result) {
    console.log(`Batch ${doc.header.get("batchNo")}`);
    for (const item of doc.body) {
      saveToDatabase(item);
    }
  }

  // Option 2: Get merged document
  const complete = result.toCompleteDocument();
  console.log(`Total: ${complete.header.get("recordCount")} items`);
  console.log(`Batches: ${complete.header.get("batchCount")}`);
});
```

### Memory-Efficient Processing

```typescript
const reader = io.createStreamReader(schema);

// Process and discard each document
reader.onDocument((doc) => {
  for (const item of doc.body) {
    process(item);
  }
  // doc is released after callback
});

transport.onData((docString) => {
  reader.push(docString);
});
```

---

## Choosing Real-time vs Batch

| Scenario | batchSize | Why |
|----------|-----------|-----|
| Live updates, chat | 1 | Lowest latency |
| Sensor data, logs | 1 | Real-time delivery |
| Bulk data transfer | 100-1000 | Throughput optimization |
| API pagination | Page size | Natural boundaries |
| Unreliable network | 50-100 | Batch-level recovery |

---

## Design Decisions

1. **Document-Based Streaming**: Each streamed unit is a complete `IODocument`, reusing existing classes.

2. **Unified API**: Single `createStreamWriter`/`createStreamReader` handles both real-time and batch modes via `batchSize` option.

3. **IOStreamResult**: Collects documents, provides iteration, and merges via `toCompleteDocument()`.

4. **Smart Header Aggregation**: `toCompleteDocument()` computes meaningful aggregate headers (recordCount, batchCount, time range).

5. **External Schema**: Schema shared out-of-band, not in stream, minimizing bandwidth.

6. **Transport Agnostic**: Works with any transport - TCP, WebSocket, HTTP, files, IPC.

7. **Consistent Mental Model**: Same patterns as `io.parse()` - developers learn once, use everywhere.
