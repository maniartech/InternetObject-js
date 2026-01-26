/*
  Browser client pseudo-example (drop into a web app).

  const res = await fetch('/stream');
  const stream = createStreamReader(res.body);
  for await (const item of stream) { ... }
*/

import { createStreamReader } from '../reader';

export async function runBrowserClient() {
  const res = await fetch('/stream');
  const stream = createStreamReader(res.body!);

  for await (const item of stream) {
    console.log(item.schemaName, item.data);
  }
}
