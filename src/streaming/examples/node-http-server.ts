/*
  Node.js HTTP streaming example.

  Run (roughly):
    - ts-node src/streaming/examples/node-http-server.ts

  Then in another terminal:
    - curl http://localhost:8787/stream
*/

import http from 'node:http';
import io from '../../facade';
import Decimal from '../../core/decimal/decimal';
import { createStreamWriter } from '../writer';
import { nodeHttpTransport } from '../transports';

const schemaDefs = io.defs`
  ~ $user: {id:int, name:{string, minLen:50}}
  ~ $order: {id:int, total:decimal}
  ~ $schema: $user`;

const port = Number(process.env.PORT ?? '8787');

http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/stream')) {
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
  // Configure writer to emit error objects instead of crashing
  const writer = createStreamWriter(transport, schemaDefs, { onError: 'ignore' });

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
});
