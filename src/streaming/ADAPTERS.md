# Streaming in Restricted Environments

The `io-js2` streaming module is designed to work with modern standards (Fetch API, ReadableStream, AsyncIterable). However, many environments (like WordPress plugins, Google Apps Script, Office Add-ins, or older browsers) may not support these APIs or may have restricted networking capabilities.

We provide adapters to help you use `openStream` (reading) and `IOStreamWriter` (writing) in these environments.

## 1. Reading Streams (Client-Side)

If you cannot use `fetch` or if `fetch` doesn't support streaming body (e.g. some polyfills), you can use `createPushSource` to bridge event-based APIs (like `XMLHttpRequest`) to the streaming parser.

### Example: Using `XMLHttpRequest` (Browser/Legacy)

```typescript
import { openStream, createPushSource } from 'internet-object';

// 1. Create the bridge
const { source, push, close } = createPushSource();

// 2. Start the parser with the source
const stream = openStream(source);

// 3. Consume the stream (async loop)
(async () => {
  try {
    for await (const item of stream) {
      console.log('Received:', item.data);
    }
    console.log('Stream finished');
  } catch (err) {
    console.error('Stream error:', err);
  }
})();

// 4. Drive the source with XHR events
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/stream');

// Track how much data we've processed
let seenBytes = 0;

xhr.onprogress = () => {
  // Extract only the new part of the response
  const newData = xhr.responseText.substring(seenBytes);
  seenBytes = xhr.responseText.length;

  if (newData) {
    // LINK: Push the new data into the stream source
    push(newData);
  }
};

xhr.onload = () => close(); // Signal stream completion
xhr.onerror = () => close(new Error('Network Error')); // Signal error
xhr.send();
```

### Example: Google Apps Script (UrlFetchApp)

Google Apps Script's `UrlFetchApp` is synchronous and blocking. It returns the full response at once. You can still use the streaming parser to process the response, treating it as a "stream of one chunk".

```typescript
import { openStream, createPushSource } from 'internet-object';

function fetchAndParse() {
  const response = UrlFetchApp.fetch('https://api.example.com/data');
  const text = response.getContentText();

  // Create a source and push the entire text
  const { source, push, close } = createPushSource();
  push(text);
  close();

  // Process synchronously (since data is already there)
  // Note: In GAS, you might need a polyfill for 'for await' or use the generator manually
  const iterator = openStream(source)[Symbol.asyncIterator]();

  let result = iterator.next();
  while (!result.done) {
    // Wait for promise (in GAS runtime this is usually immediate for resolved promises)
    // But GAS is synchronous, so async/await might need transpilation (e.g. via clasp/babel)
    // If using modern GAS runtime (V8), async/await is supported.
    result.then(res => {
       if (!res.done) {
         Logger.log(res.value.data);
         result = iterator.next();
       }
    });
  }
}
```

## 2. Writing Streams (Sending Data)

If your environment doesn't support streaming uploads (e.g. `fetch` with a `ReadableStream` body is not supported in all browsers yet), you often need to construct the full payload string before sending.

Use `BufferTransport` to use the `IOStreamWriter` API to generate the payload string.

### Example: Generating Payload for XHR / Fetch

```typescript
import { createStreamWriter, BufferTransport } from 'internet-object';

// 1. Setup the buffer transport
const transport = new BufferTransport();
const writer = createStreamWriter(transport);

// 2. Write your data using the streaming API
writer.setHeader({ streamId: 'upload-1' });
await writer.sendHeader();

writer.write({ name: 'Alice' }, '$user');
writer.write({ name: 'Bob' }, '$user');

// 3. Get the full string
const payload = transport.getOutput();

// 4. Send it
fetch('/api/upload', {
  method: 'POST',
  body: payload,
  headers: { 'Content-Type': 'application/internet-object' }
});
```

## 3. Custom Transports

You can implement `IOStreamTransport` to adapt to any sending mechanism (e.g. WebSockets, Node.js Streams, etc.).

```typescript
const myTransport = {
  send(chunk) {
    // your custom logic, e.g.
    mqttClient.publish('topic', chunk);
  }
};

const writer = createStreamWriter(myTransport);
```
