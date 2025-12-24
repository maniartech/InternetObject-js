/*
  Browser client pseudo-example (drop into a web app).

  const res = await fetch('/stream');
  const stream = openStream(res.body);
  for await (const item of stream) { ... }
*/

import { openStream } from '../open-stream';

export async function runBrowserClient() {
  const res = await fetch('/stream');
  const stream = openStream(res.body!);

  for await (const item of stream) {
    console.log(item.schemaName, item.data);
  }
}
