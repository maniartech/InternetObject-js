
import http from 'node:http';
import { createStreamReader } from '../../index'; // Adjust path to src/index.ts or dist/index.js

// Simple CLI argument parser
const args = process.argv.slice(2);
const url = args[0] || 'http://127.0.0.1:8787/stream/live';

console.log(`Connecting to ${url}...`);

http.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to connect: ${res.statusCode} ${res.statusMessage}`);
    res.resume();
    return;
  }

  console.log('Connected! Streaming data...');

  // Create an async iterable from the Node.js response stream
  async function* nodeStreamToIterator(stream: http.IncomingMessage) {
    stream.setEncoding('utf8');
    for await (const chunk of stream) {
      yield chunk;
    }
  }

  // Consume the stream using createStreamReader
  (async () => {
    try {
      const stream = createStreamReader(nodeStreamToIterator(res));

      for await (const item of stream) {
        if (item.error) {
            console.error('Stream Error Item:', item.error);
        } else {
            const data = item.data as any;
            let latency = '';
            if (data && data.ts) {
                // Note: Node.js Date parsing might differ slightly from browser but usually fine
                const sent = new Date(data.ts).getTime();
                const now = Date.now();
                latency = ` (Latency: ${now - sent}ms)`;
            }
            console.log(`Received [${item.schemaName}]:`, JSON.stringify(data), latency);
        }
      }
      console.log('Stream finished.');
    } catch (err) {
      console.error('Stream processing error:', err);
    }
  })();

}).on('error', (err) => {
  console.error('Connection error:', err.message);
});
