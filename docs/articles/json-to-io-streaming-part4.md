# Beyond NDJSON: High-Performance Data Streaming with Internet Object

In the world of modern web development, streaming has become non-negotiable. Whether you are building a real-time stock ticker, exporting millions of database records, or feeding a generative AI model, you need to move data fast.

For years, **NDJSON** (Newline Delimited JSON) has been the default choice. It’s simple: just stack JSON objects on top of each other. But simplicity comes at a cost. NDJSON is verbose, bandwidth-heavy, and lacks native type safety.

Enter **Internet Object (IO) Streaming**—a protocol designed to combine the efficiency of binary formats with the readability of text.

In this article, we’ll explore why your next streaming API should be built with Internet Object.

---

## Why IO Streaming?

Internet Object (IO) streaming is a powerful alternative to traditional NDJSON (Newline Delimited JSON) for streaming data. It offers a more efficient, robust, and flexible way to handle real-time data transfer. Here’s why you should consider IO streaming for your next project:

- **Efficiency**: IO streaming reduces data overhead by separating the schema from the data. This means you don’t have to repeat keys in every single record, resulting in significant bandwidth savings and faster parsing.
- **Type Safety**: With IO, you define the data schema upfront. This contract-first approach ensures that data is validated on the fly, preventing type-related errors and making your application more reliable.
- **Human-Readability**: Unlike binary formats like Protobuf or Avro, IO streams are human-readable. You can easily inspect the data in a text editor, which simplifies debugging and development.
- **Error Resilience**: IO streaming is designed to handle errors gracefully. If a record fails validation or a server-side issue occurs, the stream can emit a typed error without crashing the client, ensuring a seamless user experience.
- **Flexibility**: IO supports multi-type streams, allowing you to send different data structures in the same stream. This is handled natively using sections, which makes it easy to manage complex data flows.

## The Problem with JSON Streaming

Let’s look at a typical NDJSON stream for a list of users:

```json
{"id": 1, "name": "Alice", "email": "alice@example.com", "role": "admin"}
{"id": 2, "name": "Bob", "email": "bob@example.com", "role": "user"}
{"id": 3, "name": "Charlie", "email": "charlie@example.com", "role": "user"}
```

Notice the repetition? The keys `"id"`, `"name"`, `"email"`, and `"role"` are sent for *every single record*. If you are streaming 100,000 records, you are transmitting those keys 100,000 times. That is massive overhead.

Furthermore, there is no contract. The client has to guess the types. Is `id` always a number? Is `email` optional? You won't know until you parse it (and potentially crash).

## The Internet Object Solution

Internet Object takes a "Contract-First" approach. It separates the **Schema** (the structure) from the **Data** (the content).

Here is the exact same stream in Internet Object format:

```ruby
~ $user: { id:int, name:string, email:string, role:string }
~ $schema: $user
---
~ 1, Alice, alice@example.com, admin
~ 2, Bob, bob@example.com, user
~ 3, Charlie, charlie@example.com, user
```

### Why is this better?

Think of it as the difference between a **Word document** and a **Spreadsheet**.

In a Word doc (JSON), you have to label every piece of data: *"Name: Alice, Age: 30"*. In a Spreadsheet (IO), you define the columns once in the header, and the rows are just pure data.

1.  **Bandwidth & CPU Efficiency**: It's not just about saving bytes (though 40-60% savings is huge). It's about **CPU cycles**. Parsing `1, Alice` is significantly faster for a machine than parsing `{"id": 1, "name": "Alice"}` because the parser doesn't need to match keys for every field.
2.  **Type Safety**: The schema `{ id:int, ... }` isn't just documentation. The IO parser uses it to **validate data on the fly**. If a record comes in with a string for an ID, the parser flags it immediately.
3.  **Human Readable**: Unlike Protobuf or Avro, you can still open this in a text editor and read it. It's the best of both worlds: binary-like efficiency with text-based transparency.

---

## Resilience by Design: Handling Errors

In a typical JSON stream, one malformed character can crash the entire parser. If a backend service throws an error mid-stream, it often results in a broken JSON object that kills the client connection.

Internet Object treats errors as first-class citizens.

If a specific record fails validation or the server encounters an issue, it can emit a typed **Error Record** without breaking the stream:

```ruby
~ 1, Alice
~ 2, Bob
--- $error
~ { code: "DB_TIMEOUT", message: "Could not fetch user 3" }
--- $user
~ 4, Dave
```

The client receives this as a structured error item, handles it (e.g., shows a toast notification), and continues processing the rest of the stream seamlessly.

---

## Advanced Capabilities: Multi-Type Streams

One of the biggest limitations of NDJSON is handling mixed data types. How do you stream a list of Users followed by a list of Orders? You usually have to wrap them in a meta-object:

```json
{"type": "user", "data": {"id": 1, "name": "Alice"}}
{"type": "order", "data": {"id": 101, "total": 99.99}}
```

Internet Object handles this natively using **Sections**. You can define all schemas in the header and then switch the active schema mid-stream using the `---` separator followed by the schema name.

This way, the schema is sent only once, and the stream itself contains only pure data, making it highly efficient.

```ruby
// Header (sent once)
~ $user: { id:int, name:string }
~ $order: { id:int, userId:int, total:decimal }
---
// Payload (streamed)
$user
~ 1, Alice
~ 2, Bob
---
$order
~ 101, 1, 99.99
~ 102, 2, 45.50
```

The parser automatically switches context. When it sees `---` followed by `$order`, it knows that subsequent lines should be validated against the `$order` schema.

## Real-World Implementation

Implementing this in Node.js or the browser is incredibly simple with the `internet-object` library.

### Server (Node.js)

A `Node.js` server can stream real-time data, for example, from a stock ticker. In this example, we'll use a generator to simulate a live feed of stock prices.

```typescript
import io from "internet-object";

// 1. Define the contract
const defs = io.defs`
  ~ $stock: { symbol:string, price:decimal, ts:datetime }
  ~ $schema: $stock
`;

// 2. Create a stream writer
const writer = io.createStreamWriter(response, defs);

// 3. Send the header
writer.sendHeader();

// 4. Stream data from a generator
async function* stockTicker() {
  while (true) {
    // Simulate fetching stock prices
    yield { symbol: "AAPL", price: 150.25 + Math.random() * 2 - 1, ts: new Date() };
    yield { symbol: "GOOGL", price: 2800.50 + Math.random() * 10 - 5, ts: new Date() };

    // Wait for 1 second before sending the next update
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Use the generator to stream data
for await (const record of stockTicker()) {
  response.write(writer.write(record));
}

response.end();
```

### Client (Browser Fetch API)

The client uses the `fetch` API to get the stream and the `internet-object` library to parse it.

```typescript
import { openStream } from "internet-object";

const response = await fetch("/api/stocks");
const stream = openStream(response.body);

for await (const item of stream) {
  if (item.isData) {
    console.log(item.data);
    // Output: { symbol: "AAPL", price: 150.25, ts: "..." }
  } else if (item.isError) {
    console.error(item.error);
  }
}
```

The client automatically handles buffering, parsing, and validation. You just consume the async iterator.

## Conclusion

While `JSON` is a versatile format for data interchange, it falls short in high-performance streaming scenarios. `NDJSON` is a step in the right direction, but it carries the baggage of `JSON's` verbosity and lack of a schema.

Internet Object Streaming offers a modern, efficient, and robust alternative. By separating the schema from the data, it achieves significant performance gains while maintaining readability. Its built-in type safety, error resilience, and flexibility make it an ideal choice for a wide range of streaming applications, from real-time data feeds to large-scale data exports.

If you're building the next generation of real-time apps, it’s time to look beyond NDJSON and embrace the power of Internet Object.

---

*Ready to try it? Check out the [Internet Object GitHub Repository](https://github.com/internet-object/io-js) and start streaming smarter.*
