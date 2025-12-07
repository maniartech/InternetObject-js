# Internet Object Streaming API

## Overview

The Streaming API provides transport-agnostic streaming serialization and deserialization for Internet Object. It enables efficient, incremental processing of data without requiring the full dataset in memory.

## Key Characteristics

- **Transport Agnostic**: Pure serialization/deserialization - no HTTP, WebSocket, or transport layer dependencies
- **External Schema**: Schema definitions are shared externally, not embedded in the stream
- **Three Modes**: Real-time (immediate), Batch (grouped with headers), Chunk (header-once, minimal bandwidth)
- **Unified API**: Single API handles all streaming modes
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

The streaming API supports three modes with different bandwidth/complexity tradeoffs:

---

#### 1. Real-time Mode (single items)

Each item is sent as a complete single-item document:

```ruby
~ John, 20, Mumbai
```

Use when: Low latency is critical, items must be processed immediately.

---

#### 2. Batch Mode (with headers per batch)

Items are grouped into batches, each with metadata headers:

```ruby
~ batchNo: 1
~ recordCount: 3
~ timestamp: 1733500000
---
~ John, 20, Mumbai
~ Ashok, 30, Delhi
~ Priya, 25, Bangalore
```

Use when: Resume support needed, checksums required, moderate batching.

---

#### 3. Chunk Mode (header-once, minimal bandwidth) ⭐

Send header once, then stream only validated record lines:

**Initial header document:**
```ruby
~ streamId: abc123
~ startTime: 1733500000
~ totalRecords: 10000
---
```

**Then stream individual chunks (just the record lines):**
```ruby
~ John, 20, Mumbai
~ Ashok, 30, Delhi
~ Priya, 25, Bangalore
...
```

**Final footer (optional):**
```ruby
---
~ endTime: 1733500100
~ recordCount: 10000
~ checksum: a1b2c3d4
```

This mode minimizes bandwidth by:
- Sending header metadata only once at the start
- Streaming pure data lines without repeated headers
- Optional footer for verification

Use when: Maximum bandwidth efficiency is critical, large datasets.

---

### Mode Comparison

| Mode | Overhead | Resume | Checksum | Use Case |
|------|----------|--------|----------|----------|
| Real-time | None | No | No | Live events, low latency |
| Batch | Per batch | Yes | Per batch | Reliable transfer, moderate size |
| Chunk | Once | Via footer | End only | Large datasets, bandwidth critical |

---

### Standard Wire Format (Batch Mode)

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
  // Mode control
  mode?: 'realtime' | 'batch' | 'chunk';  // Streaming mode (default: 'realtime')
  batchSize?: number;           // Items per batch (only for 'batch' mode, default: 100)

  // Resume support
  startIndex?: number;          // Starting item index (default: 0)
  startBatchNo?: number;        // Starting batch number (default: 1)

  // Validation
  validate?: boolean;           // Validate before serializing (default: true)

  // Headers (batch and chunk modes)
  includeTimestamp?: boolean;   // Add timestamp (default: true)
  includeChecksum?: boolean;    // Add checksum (default: false)

  // Chunk mode specific
  streamId?: string;            // Unique stream identifier
  totalRecords?: number;        // Expected total (if known)
  customHeaders?: Record<string, any>;  // Additional headers
}
```

#### Methods

##### `getHeader(): string` (Chunk mode only)

Returns the header document to send at the start of the stream.

```typescript
const writer = io.createStreamWriter(schema, {
  mode: 'chunk',
  streamId: 'abc123',
  totalRecords: 10000,
  customHeaders: { source: 'database', version: 2 }
});

const header = writer.getHeader();
// Returns:
// ~ streamId: abc123
// ~ startTime: 1733500000
// ~ totalRecords: 10000
// ~ source: database
// ~ version: 2
// ---

send(header);
```

##### `write(item: object): string | null`

Serializes an item. Behavior depends on mode:

```typescript
// Real-time mode (default)
const writer = io.createStreamWriter(schema);
const doc = writer.write({ name: "John", age: 20, city: "Mumbai" });
// Returns: "~ John, 20, Mumbai"

// Batch mode
const writer = io.createStreamWriter(schema, { mode: 'batch', batchSize: 3 });
writer.write({ name: "John", age: 20, city: "Mumbai" });   // null
writer.write({ name: "Ashok", age: 30, city: "Delhi" });   // null
const doc = writer.write({ name: "Priya", age: 25, city: "Bangalore" });
// Returns complete batch document with headers

// Chunk mode - returns just the record line
const writer = io.createStreamWriter(schema, { mode: 'chunk' });
const line = writer.write({ name: "John", age: 20, city: "Mumbai" });
// Returns: "~ John, 20, Mumbai"
// (Same as realtime, but use getHeader() first and getFooter() last)
```

##### `getFooter(): string` (Chunk mode only)

Returns the footer document with final stats.

```typescript
const footer = writer.getFooter();
// Returns:
// ---
// ~ endTime: 1733500100
// ~ recordCount: 10000
// ~ checksum: a1b2c3d4

send(footer);
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
  // Mode
  mode?: 'auto' | 'realtime' | 'batch' | 'chunk';  // (default: 'auto')

  // Validation
  validate?: boolean;               // Validate after parsing (default: true)
  validateChecksum?: boolean;       // Validate checksum if present (default: true)
  validateRecordCount?: boolean;    // Validate recordCount matches (default: true)

  // Error handling
  onError?: 'skip' | 'stop' | 'emit';  // Error strategy (default: 'stop')
}
```

#### Methods

##### `pushHeader(headerString: string): void` (Chunk mode only)

Pushes the initial header document. Call this first in chunk mode.

```typescript
const reader = io.createStreamReader(schema, { mode: 'chunk' });

// First, push the header
reader.pushHeader(`
~ streamId: abc123
~ startTime: 1733500000
~ totalRecords: 10000
---
`);

// Header is now available
console.log(reader.getStreamId());  // "abc123"
```

##### `push(docString: string): void`

Pushes document or record lines to the reader.

```typescript
const reader = io.createStreamReader(schema);

// Real-time/Batch mode: Push complete documents
reader.push("~ John, 20, Mumbai");
reader.push(`
~ batchNo: 1
~ recordCount: 2
---
~ Ashok, 30, Delhi
~ Priya, 25, Bangalore
`);

// Chunk mode: Push individual record lines
const reader = io.createStreamReader(schema, { mode: 'chunk' });
reader.pushHeader(headerDoc);
reader.push("~ John, 20, Mumbai");
reader.push("~ Ashok, 30, Delhi");
reader.push("~ Priya, 25, Bangalore");
```

##### `pushFooter(footerString: string): void` (Chunk mode only)

Pushes the final footer document with verification.

```typescript
reader.pushFooter(`
---
~ endTime: 1733500100
~ recordCount: 10000
~ checksum: a1b2c3d4
`);

// Footer validates:
// - recordCount matches items received
// - checksum matches computed checksum
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

## Chunk Mode (Bandwidth Optimized)

Chunk mode sends the header once at the start, then streams only validated record lines, with an optional footer for verification. This is the most bandwidth-efficient mode.

### Wire Format

```
┌─────────────────────────────────┐
│  Header (once at start)         │
│  ~ streamId: abc123             │
│  ~ startTime: 1733500000        │
│  ~ totalRecords: 10000          │
│  ---                            │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  Record chunks (streamed)       │
│  ~ John, 20, Mumbai             │
│  ~ Ashok, 30, Delhi             │
│  ~ Priya, 25, Bangalore         │
│  ... (thousands more)           │
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│  Footer (optional, at end)      │
│  ---                            │
│  ~ endTime: 1733500100          │
│  ~ recordCount: 10000           │
│  ~ checksum: a1b2c3d4           │
└─────────────────────────────────┘
```

### Chunk Mode Writer

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string, active:bool";

const writer = io.createStreamWriter(schema, {
  mode: 'chunk',
  streamId: 'user-export-2024',
  totalRecords: users.length,  // Optional: if known upfront
  includeChecksum: true,
  customHeaders: {
    source: 'database',
    exportVersion: 1
  }
});

// 1. Send header first
const header = writer.getHeader();
send(header);
// Sends:
// ~ streamId: user-export-2024
// ~ startTime: 1733500000
// ~ totalRecords: 10000
// ~ source: database
// ~ exportVersion: 1
// ---

// 2. Stream record lines
for (const user of users) {
  const line = writer.write(user);  // Returns "~ 1, John, john@example.com, T"
  send(line);
}

// 3. Send footer with verification
const footer = writer.getFooter();
send(footer);
// Sends:
// ---
// ~ endTime: 1733500100
// ~ recordCount: 10000
// ~ checksum: a1b2c3d4
```

### Chunk Mode Reader

```typescript
import io from 'internet-object';

const schema = "id:int, name:string, email:string, active:bool";

const reader = io.createStreamReader(schema, { mode: 'chunk' });

// Register callback for each record
reader.onItem((item) => {
  console.log(`Received: ${item.name}`);
  processUser(item);
});

// 1. Receive and push header
reader.pushHeader(headerString);
console.log(`Stream ${reader.getStreamId()} started`);
console.log(`Expecting ${reader.getExpectedTotal()} records`);

// 2. Receive and push record lines
for await (const line of receiveLines()) {
  reader.push(line);
}

// 3. Receive and push footer (validates count and checksum)
reader.pushFooter(footerString);

// Get final result
const result = reader.getResult();
console.log(`Received ${result.totalItems} items`);
console.log(`Stream header:`, result.header);  // Original header values
console.log(`Stream footer:`, result.footer);  // Footer values (endTime, etc.)
```

### Bandwidth Comparison

For 10,000 records with 100-record batches:

| Mode | Header Bytes | Per-Record | Footer | Total Overhead |
|------|--------------|------------|--------|----------------|
| Batch | 100 × ~50 = 5KB | 0 | 0 | ~5KB |
| Chunk | ~100 | 0 | ~50 | ~150 bytes |

**Chunk mode reduces overhead by ~97%** for large datasets.

### Chunk Mode Headers

**Header Document (start):**

| Field | Type | Description |
|-------|------|-------------|
| `streamId` | string | Unique stream identifier |
| `startTime` | int | Unix timestamp when stream started |
| `totalRecords` | int | Expected total (if known) |
| Custom fields | any | Application-specific metadata |

**Footer Document (end):**

| Field | Type | Description |
|-------|------|-------------|
| `endTime` | int | Unix timestamp when stream ended |
| `recordCount` | int | Actual records sent |
| `checksum` | string | Checksum of all records (optional) |

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

## Choosing the Right Mode

| Scenario | Mode | Options | Why |
|----------|------|---------|-----|
| Live updates, chat | realtime | - | Lowest latency |
| Sensor data, logs | realtime | - | Real-time delivery |
| Bulk data, moderate size | batch | batchSize: 100-1000 | Resume support, checksums |
| API pagination | batch | batchSize: page size | Natural boundaries |
| Unreliable network | batch | batchSize: 50-100 | Batch-level recovery |
| Large exports (100K+ records) | **chunk** | includeChecksum: true | Minimal bandwidth |
| Database migrations | **chunk** | totalRecords: count | Header-once efficiency |
| File downloads | **chunk** | - | No per-record overhead |

---

## Real-World Examples

### 1. Bulk Data Export (HTTP)

**Scenario**: A user wants to download their complete transaction history (100,000+ records).
**Why Streaming?**
- **Memory Efficiency**: The server cannot load 100k records into RAM at once.
- **Time-to-First-Byte**: The download starts immediately, not after the query finishes.
- **Bandwidth**: Chunk mode minimizes overhead for the large dataset.

#### Server (Node.js / Express)

```typescript
import express from 'express';
import io from 'internet-object';

const app = express();

// Schema for export
const transactionSchema = "id:int, date:date, amount:decimal, merchant:string, status:string";

app.get('/api/export/transactions', async (req, res) => {
  // Set headers for file download
  res.setHeader('Content-Type', 'application/x-internet-object');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.io"');
  res.setHeader('Transfer-Encoding', 'chunked');

  const totalRecords = await db.transactions.count({ userId: req.user.id });

  // Use Chunk Mode for maximum efficiency
  const writer = io.createStreamWriter(transactionSchema, {
    mode: 'chunk',
    streamId: `export-${req.user.id}-${Date.now()}`,
    totalRecords: totalRecords,
    includeChecksum: true
  });

  // 1. Write Header
  res.write(writer.getHeader());

  // 2. Stream Records (Memory efficient: one record at a time)
  const cursor = db.transactions.find({ userId: req.user.id }).cursor();

  for await (const txn of cursor) {
    // Returns minimal string: "~ 123, 2023-12-01, 50.00, Amazon, COMPLETED"
    const line = writer.write(txn);
    res.write(line + '\n');
  }

  // 3. Write Footer
  res.write(writer.getFooter());

  res.end();
});
```

#### Client (Node.js Script / Service)

```typescript
import io from 'internet-object';
import { pipeline } from 'stream/promises';
import fs from 'fs';

// Service consuming the stream
async function downloadExport() {
  const response = await fetch('https://api.example.com/export/transactions');
  const reader = io.createStreamReader(transactionSchema, { mode: 'chunk' });

  const fileStream = fs.createWriteStream('./local-transactions.io');

  // Process stream
  const streamReader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await streamReader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });

    // 1. Save raw data to file immediately
    fileStream.write(chunk);

    // 2. Parse for validation/progress (optional)
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim() === '---') {
        // Handle header/footer boundaries
        if (!reader.hasHeader()) reader.pushHeader(buffer + '---');
        else reader.pushFooter(buffer + '---');
        buffer = '';
      } else if (line.trim()) {
        reader.push(line);
      }
    }
  }

  console.log(`Download complete: ${reader.getResult().totalItems} records verified.`);
}
```

---

### 2. Live System Monitoring (WebSocket)

**Scenario**: A dashboard displaying real-time CPU and memory usage from a server cluster.
**Why Streaming?**
- **Latency**: Updates must be pushed immediately.
- **Overhead**: Real-time mode sends minimal bytes per update.

#### Server (Node.js)

```typescript
import { WebSocketServer } from 'ws';
import io from 'internet-object';

const wss = new WebSocketServer({ port: 8080 });
const metricSchema = "host:string, cpu:decimal, mem:int, ts:int";

wss.on('connection', (ws) => {
  // Real-time mode: No batching, immediate send
  const writer = io.createStreamWriter(metricSchema, { mode: 'realtime' });

  const interval = setInterval(() => {
    const metrics = getSystemMetrics(); // { host: 'web-1', cpu: 45.2, ... }

    // Serializes to: "~ web-1, 45.2, 1024, 1733500123"
    const doc = writer.write(metrics);
    ws.send(doc);
  }, 1000);

  ws.on('close', () => clearInterval(interval));
});
```

#### Client (Dashboard)

```typescript
import io from 'internet-object';

const metricSchema = "host:string, cpu:decimal, mem:int, ts:int";

function connectDashboard() {
  const ws = new WebSocket('ws://monitoring-api');
  const reader = io.createStreamReader(metricSchema, { mode: 'realtime' });

  reader.onDocument((doc) => {
    // Update UI immediately
    const metric = doc.body[0];
    updateChart(metric.host, metric.cpu);
  });

  ws.onmessage = (event) => {
    reader.push(event.data);
  };
}
```

---

### 3. Batch Processing Pipeline (File)

**Scenario**: Processing a massive log file uploaded by a client.
**Why Streaming?**
- **Processing**: Parse and process logs in chunks to avoid blocking the event loop.

#### Worker (Node.js)

```typescript
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import io from 'internet-object';

const logSchema = "level:string, msg:string, ts:int";

async function processLogFile(filePath: string) {
  const reader = io.createStreamReader(logSchema);
  const fileStream = createReadStream(filePath);
  const rl = createInterface({ input: fileStream });

  let processedCount = 0;

  // Process line-by-line
  for await (const line of rl) {
    // Reader handles buffering and batch detection automatically
    reader.push(line);

    // Check if we have complete documents ready
    const result = reader.getResult();
    if (result.totalDocuments > 0) {
      for (const doc of result) {
        await insertToDatabase(doc.body); // Bulk insert
        processedCount += doc.header.get("recordCount");
      }
      reader.clear(); // Free memory
    }
  }
  console.log(`Processed ${processedCount} logs`);
}
```

---

## Schema Sharing Best Practices

**Recommended**: Define schema separately at both ends.

```typescript
// shared/schemas.ts (if using shared package)
export const userSchema = "id:int, name:string, email:string, active:bool";

// Or define in API documentation / contract
// Server and client both use the same schema string
```

**Not Recommended** (but supported): Embedding schema in document header.

```io
~ $schema: { id:int, name:string, email:string, active:bool }
---
~ 1, John, john@example.com, T
~ 2, Jane, jane@example.com, T
```

**Why separate schemas are better**:
1. Reduces bandwidth - schema not repeated in every batch
2. Enables schema versioning at application level
3. Allows compile-time type checking (TypeScript)
4. Clear contract between client and server

---

## Design Decisions

1. **Document-Based Streaming**: Each streamed unit is a complete `IODocument`, reusing existing classes.

2. **Unified API**: Single `createStreamWriter`/`createStreamReader` handles both real-time and batch modes via `batchSize` option.

3. **IOStreamResult**: Collects documents, provides iteration, and merges via `toCompleteDocument()`.

4. **Smart Header Aggregation**: `toCompleteDocument()` computes meaningful aggregate headers (recordCount, batchCount, time range).

5. **External Schema**: Schema shared out-of-band, not in stream, minimizing bandwidth.

6. **Transport Agnostic**: Works with any transport - TCP, WebSocket, HTTP, files, IPC.

7. **Consistent Mental Model**: Same patterns as `io.parse()` - developers learn once, use everywhere.
