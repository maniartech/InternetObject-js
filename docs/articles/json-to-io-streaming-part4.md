# Beyond NDJSON: High-Performance Data Streaming with Internet Object

In the world of modern web development, streaming has become non-negotiable. Whether you are building a real-time stock ticker, exporting millions of database records, or feeding a generative AI model, you need to move data fast.

For years, **NDJSON** (Newline Delimited JSON) has been the default choice. It’s simple: just stack JSON objects on top of each other. But simplicity comes at a cost. NDJSON is verbose, bandwidth-heavy, and lacks native type safety.

Enter **Internet Object (IO) Streaming**—a protocol designed to combine the efficiency of binary formats with the readability of text.

In this article, we’ll explore why your next streaming API should be built with Internet Object.

---

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

Internet Object handles this natively using **Sections**. You can switch the active schema mid-stream using the `---` separator.

```ruby
~ $user: { id:int, name:string }
~ $order: { id:int, userId:int, total:decimal }
~ $schema: $user
---
~ 1, Alice
~ 2, Bob

--- $order
~ 101, 1, 99.99
~ 102, 2, 45.50
```

The parser automatically switches context. When it sees `--- $order`, it knows that subsequent lines should be validated against the `$order` schema.

## Real-World Implementation

Implementing this in Node.js or the browser is incredibly simple with the `internet-object` library.

### Server (Node.js)

```typescript
import io from 'internet-object';

// 1. Define the contract
const defs = io.defs`
  ~ $stock: { symbol:string, price:decimal, ts:string }
  ~ $schema: $stock`;

const writer = io.createStreamWriter(response, defs);

// 2. Send Header
writer.sendHeader();

// 3. Stream Data
setInterval(() => {
  const data = { symbol: "AAPL", price: 150.25, ts: new Date() };
  response.write(writer.write(data));
}, 1000);
```

### Client (Browser Fetch API)

```typescript
import { openStream } from 'internet-object';

const response = await fetch('/api/stocks');
const stream = openStream(response.body);

for await (const item of stream) {
  console.log(item.data);
  // Output: { symbol: "AAPL", price: 150.25, ts: "..." }
}
```

The client automatically handles buffering, parsing, and validation. You just consume the async iterator.

## Conclusion

JSON was designed for storage, not streaming. While it works, it is inefficient at scale.

Internet Object Streaming offers a modern alternative that respects your bandwidth, your CPU, and your need for type safety, without sacrificing the developer experience of a text-based format.

It changes the mental model of API design from "sending objects" to "opening a channel".

If you are building the next generation of real-time apps, it’s time to look beyond NDJSON.

---

*Ready to try it? Check out the [Internet Object GitHub Repository](https://github.com/internet-object/io-js) and start streaming smarter.*
