# Streaming

A large export does not fit comfortably in memory, and you should not have to wait for the last byte to handle the first record.

```ts
const reader = createStreamReader(source);
for await (const item of reader) {
  if (item.data) console.log(item.data.toObject());
}
```

`source` can be a string, a `fetch` `Response`, a `ReadableStream`, a Node stream, or any async iterable. The reader takes bytes as they arrive and gives you **one record at a time**.

## Chunk boundaries do not matter

This is the guarantee worth trusting. Split the same document every 7 characters, or every byte, and you get identical records — a record straddling a chunk is reassembled for you.

It is not a hope: every streaming case in the conformance corpus is run under three different chunkings and the results must agree, or the case is not accepted.

## A bad record does not end the stream

```
ok   : { name: 'Alice', age: 30 }
bad  : expected-integer - and the stream continues
ok   : { name: 'Carol', age: 28 }
```

One malformed record yields one error item, and iteration carries on. That is what you want for an import of ten thousand rows where three are wrong: report those three, keep the rest.

Some problems *are* fatal — a broken header, or a switch to a schema that does not exist — because nothing after them can be read reliably. Those end the iteration deliberately.

## Going deeper

The `examples/streaming/` folder holds scenario walkthroughs — backpressure, custom transports, restricted runtimes, schema switching mid-stream — each executed in CI so it cannot drift from the implementation.
