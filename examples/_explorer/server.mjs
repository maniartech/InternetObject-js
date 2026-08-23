/**
 * The examples explorer — a tiny server that makes every example readable AND runnable
 * in a browser.
 *
 *   npm run examples          then open http://localhost:5177
 *
 * WHY A BROWSER, AND NOT JUST FILES
 *
 * An example you can only read is a claim. An example you can run, edit, and see fail is a fact.
 * Internet Object is a data format, so almost everything worth showing is a pure function from
 * text to a value — which means it runs perfectly well in a browser, with no server round-trip
 * per keystroke and no build step for the reader.
 *
 * HOW IT WORKS, IN THREE MOVES
 *
 *   1. `/api/examples`      lists the folders under examples/ that contain an `index.ts`.
 *   2. `/api/example/:id`   returns that folder's README (the concept) and source (the code).
 *   3. `/bundle/:id.js`     esbuild-bundles `index.ts` into browser ESM, on demand.
 *
 * The page imports the bundle with `console.log` patched, so the example's own output is captured
 * and shown beside its source. The example file itself is unchanged and unaware — the SAME file
 * runs under `npx tsx`, under the test suite, and here.
 *
 * DEPENDENCIES: none beyond esbuild, which the build already uses. No framework, no bundler
 * config, no watch daemon. Stop it with Ctrl-C.
 */
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES = path.dirname(HERE);
const PORT = Number(process.env.PORT ?? 5177);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/** Example folders: any directory holding an `index.ts`, in reading order. */
async function listExamples() {
  const entries = await readdir(EXAMPLES, { withFileTypes: true });
  const out = [];
  for (const entry of entries.filter((e) => e.isDirectory() && !e.name.startsWith('_'))) {
    const dir = path.join(EXAMPLES, entry.name);
    if (!existsSync(path.join(dir, 'index.ts'))) continue;
    let title = entry.name;
    let summary = '';
    const readme = path.join(dir, 'README.md');
    if (existsSync(readme)) {
      const text = await readFile(readme, 'utf8');
      title = (text.match(/^#\s+(.+)$/m)?.[1] ?? title).trim();
      // The first non-heading, non-blank line is the summary.
      summary = (text.split('\n').find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('>')) ?? '').trim();
    }
    out.push({ id: entry.name, title, summary });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Bundle one example for the browser. Errors come back as readable text, not a stack trace. */
async function bundleExample(id) {
  const entry = path.join(EXAMPLES, id, 'index.ts');
  if (!existsSync(entry)) throw new Error(`No example called "${id}"`);
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
    sourcemap: 'inline',
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

const json = (res, body, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = decodeURIComponent(url.pathname);

  try {
    if (route === '/' || route === '/index.html') {
      res.writeHead(200, { 'content-type': MIME['.html'] });
      return res.end(await readFile(path.join(HERE, 'index.html')));
    }

    if (route === '/api/examples') {
      return json(res, await listExamples());
    }

    if (route.startsWith('/api/example/')) {
      const id = route.slice('/api/example/'.length);
      const dir = path.join(EXAMPLES, id);
      if (!existsSync(dir) || !(await stat(dir)).isDirectory()) {
        return json(res, { error: `No example called "${id}"` }, 404);
      }
      const readmePath = path.join(dir, 'README.md');
      return json(res, {
        id,
        readme: existsSync(readmePath) ? await readFile(readmePath, 'utf8') : '',
        source: await readFile(path.join(dir, 'index.ts'), 'utf8'),
      });
    }

    if (route.startsWith('/bundle/') && route.endsWith('.js')) {
      const id = route.slice('/bundle/'.length, -'.js'.length);
      try {
        const code = await bundleExample(id);
        res.writeHead(200, { 'content-type': MIME['.js'], 'cache-control': 'no-store' });
        return res.end(code);
      } catch (err) {
        // Deliver the compile error AS the module, so the page shows it in the output panel
        // instead of failing silently in a network tab nobody has open.
        const message = String(err?.message ?? err).replace(/`/g, "'");
        res.writeHead(200, { 'content-type': MIME['.js'], 'cache-control': 'no-store' });
        return res.end(`throw new Error(\`Could not build this example:\n\n${message}\`)`);
      }
    }

    // Static client assets, restricted to this folder.
    const file = path.join(HERE, route.replace(/^\/+/, ''));
    if (file.startsWith(HERE) && existsSync(file) && (await stat(file)).isFile()) {
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      return res.end(await readFile(file));
    }

    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err?.stack ?? err));
  }
});

server.listen(PORT, () => {
  console.log(`\n  Internet Object — examples`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  Every example runs in the page, from the same file that runs under tsx.`);
  console.log(`  Ctrl-C to stop.\n`);
});
