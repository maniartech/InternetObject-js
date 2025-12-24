/*
  Node.js client example (consumes HTTP stream).

  Run (Node 18+):
    - node --loader ts-node/esm src/streaming/examples/node-http-client.ts

  Ensure server is running first.
*/

import io from '../../facade';
import { openStream } from '../open-stream';

const schemaDefs = io.defs`
  ~ $user: {id:int, name:string}
  ~ $order: {id:int, total:decimal}
  ~ $error: {code:string, message:string}
  ~ $schema: $user`;

const url = process.env.IO_STREAM_URL ?? 'http://127.0.0.1:8787/stream';
const res = await fetch(url);

// Server sends schemas in header by default, so defs are optional.
// Pass defs anyway to demonstrate the pre-shared path and to validate types.
const stream = openStream(res.body!, schemaDefs);

for await (const item of stream) {
  if (item.schemaName === '$user') {
    console.log('user:', item.data);
  } else if (item.schemaName === '$order') {
    console.log('order:', item.data);
  } else if (item.schemaName === '$error') {
    console.error('Server Error:', item.data);
  } else {
    console.log(item.schemaName, item.data);
  }

  if (item.error) {
    console.error('parse/validation error:', item.error);
  }
}
