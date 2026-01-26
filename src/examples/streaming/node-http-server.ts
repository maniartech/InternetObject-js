/*
  Node.js HTTP streaming example.

  Run (roughly):
    - ts-node src/streaming/examples/node-http-server.ts

  Then in another terminal:
    - curl http://localhost:8787/stream
*/

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import io from '../../facade';
import Decimal from '../../core/decimal/decimal';
import { createStreamWriter } from '../../streaming/writer';
import { nodeHttpTransport } from '../../streaming/transports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

const schemaDefs = io.defs`
  ~ $user: {id:int, name:{string, minLen:50}}
  ~ $order: {id:int, total:decimal, ts:string, clients:int}
  ~ $schema: $user`;

const port = Number(process.env.PORT ?? '8787');

// --- GLOBAL LIVE STREAM SOURCE ---
// This simulates a real-time data source (e.g. stock ticker, logs)
let liveStreamClients = new Set<{
  transport: any,
  writer: any,
  withErrors: boolean,
  mode: 'ticker' | 'batch' // 'ticker' = 1 record/sec, 'batch' = 5 records/sec
}>();

let globalCounter = 0;
let lastData: { id: number, total: Decimal, ts: string, clients: number } | null = null;

const generateData = () => {
  globalCounter++;
  const value = (Math.random() * 100).toFixed(2);
  lastData = {
    id: globalCounter,
    total: new Decimal(value),
    ts: new Date().toLocaleString(),
    clients: liveStreamClients.size
  };
  return lastData;
};

// Initialize immediately
generateData();

// Start the global ticker
setInterval(() => {
  const currentData = generateData();

  // If no clients, we don't need to broadcast
  if (liveStreamClients.size === 0) return;

  // Broadcast to all connected clients
  for (const client of liveStreamClients) {
    try {
      // 1. Handle Error Injection
      if (client.withErrors && globalCounter % 5 === 0) {
         client.transport.send(client.writer.write({ id: globalCounter, name: "Bad" }, '$user'));
         continue;
      }

      // 2. Handle Batch Mode (Send 5 records at once)
      if (client.mode === 'batch') {
        let batchBuffer = '';
        // We already generated 1 record (currentData), let's generate 4 more for the batch
        // Note: In a real app, these would be distinct records.
        // For demo, we'll just send the current one + 4 variations
        batchBuffer += client.writer.write(currentData, '$order');
        for(let i=1; i<5; i++) {
           const batchItem = { ...currentData, id: currentData.id + i, total: new Decimal((Math.random()*100).toFixed(2)) };
           batchBuffer += client.writer.write(batchItem, '$order');
        }
        client.transport.send(batchBuffer);
      }
      // 3. Handle Ticker Mode (Send 1 record)
      else {
        client.transport.send(client.writer.write(currentData, '$order'));
      }

    } catch (err) {
      console.error("Error broadcasting to client", err);
      liveStreamClients.delete(client);
    }
  }
}, 1000);

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  // Serve legacy client HTML
  if (url === '/legacy-client') {
    res.writeHead(200, { 'content-type': 'text/html' });
    fs.createReadStream(path.join(__dirname, 'legacy-xhr-client.html')).pipe(res);
    return;
  }

  // Serve fetch client HTML
  if (url === '/fetch-client') {
    res.writeHead(200, { 'content-type': 'text/html' });
    fs.createReadStream(path.join(__dirname, 'fetch-client.html')).pipe(res);
    return;
  }

  // Serve dist files
  if (url.startsWith('/dist/')) {
    const filePath = path.join(projectRoot, url);
    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const contentType = ext === '.js' ? 'application/javascript' : 'text/plain';
        res.writeHead(200, {
          'content-type': contentType,
          'cache-control': 'no-store' // Disable caching for dev
        });
        fs.createReadStream(filePath).pipe(res);
        return;
    }
  }

  if (!url.startsWith('/stream')) {
    res.writeHead(404);
    res.end('not found');
    return;
  }

  res.writeHead(200, {
    'content-type': 'text/plain; charset=utf-8',
    // important for proxies:
    'cache-control': 'no-cache',
    'connection': 'keep-alive',
    'transfer-encoding': 'chunked',
  });

  const transport = nodeHttpTransport(res);
  // Wrap transport to log
  const originalSend = transport.send;
  transport.send = (chunk: any) => {
    console.log('Server sending chunk length:', chunk?.length);
    return originalSend(chunk);
  };

  // Configure writer to emit error objects instead of crashing
  const writer = createStreamWriter(transport, schemaDefs, { onError: 'emit' });

  // --- BATCH STREAMING ---
  if (url === '/stream/batch') {
    writer.setHeader(io.defs`
      ~ streamType: "batch"
      ~ batchSize: 10`);
    await writer.sendHeader();

    // Create a large batch of mixed records
    let batch = '';

    // Add some users
    batch += writer.write({ id: 1, name: 'Alice (Valid Name Length Is Not Checked Here For Simplicity)' }, '$user');
    batch += writer.write({ id: 2, name: 'Bob (Valid Name Length Is Not Checked Here For Simplicity)' }, '$user');

    // Add some orders
    batch += writer.write({ id: 100, total: new Decimal('150.00'), ts: new Date().toISOString() }, '$order');
    batch += writer.write({ id: 101, total: new Decimal('299.99'), ts: new Date().toISOString() }, '$order');

    // Add an invalid record (will be emitted as error because of onError: 'emit')
    // 'name' is too short (< 50 chars)
    batch += writer.write({ id: 3, name: 'Shorty' }, '$user');

    // Send the whole batch at once
    await transport.send(batch);
    res.end();
    return;
  }

  // --- LIVE STREAMING ---
  if (url.startsWith('/stream/live')) {
    const withErrors = url.includes('error=true');
    const isBatch = url.includes('batch=true');

    // Send padding to force browser to flush buffer (some browsers buffer 1KB)
    // Use a comment line (#) to avoid parsing issues with empty data lines
    const padding = '# ' + ' '.repeat(1024) + '\n';
    await transport.send(padding);

    writer.setHeader(io.defs`
      ~ streamType: "live"
      ~ mode: "${isBatch ? 'batch' : 'ticker'}"
      ~ updateInterval: "1s"`);
    await writer.sendHeader();

    const client = {
      transport,
      writer,
      withErrors,
      mode: (isBatch ? 'batch' : 'ticker') as 'batch' | 'ticker'
    };
    liveStreamClients.add(client);
    console.log(`Client connected to live stream. Total clients: ${liveStreamClients.size}`);

    // Send the most recent data immediately so the user doesn't wait for the next tick
    if (lastData) {
      console.log(`Sending immediate data to new client: ${lastData.id}`);
      try {
        if (withErrors && lastData.id % 5 === 0) {
           await transport.send(writer.write({ id: lastData.id, name: "Bad" }, '$user'));
        } else {
           await transport.send(writer.write(lastData, '$order'));
        }
      } catch (e) {
        console.error("Error sending initial data", e);
      }
    } else {
      console.log("No lastData available yet.");
    }

    // Clean up on client disconnect
    req.on('close', () => {
      liveStreamClients.delete(client);
      console.log('Client disconnected from live stream');
    });

    return;
  }

  // --- DEFAULT STREAM ---
  writer.setHeader(io.defs`
    ~ streamId: "demo-1"
    ~ totalRecords: 4`);

  await writer.sendHeader();

  // users (Note: 'John' and 'Jane' are < 50 chars, so these will trigger validation errors
  // and be emitted as $error records due to onError: 'emit')
  transport.send(writer.write({ id: 1, name: 'John' }, '$user'));
  transport.send(writer.write({ id: 2, name: 'Jane' }, '$user'));

  // orders
  transport.send(writer.write({ id: 10, total: new Decimal('99.95') }, '$order'));
  transport.send(writer.write({ id: 11, total: new Decimal('12.50') }, '$order'));

  res.end();
}).listen(port, () => {
  console.log(`Streaming server on http://127.0.0.1:${port}/stream`);
  console.log(`Legacy client on http://127.0.0.1:${port}/legacy-client`);
  console.log(`Fetch client on http://127.0.0.1:${port}/fetch-client`);
});
