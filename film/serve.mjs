// Tiny static file server for the film folder. ES modules do not load from
// file:// URLs, so both the preview and the renderer go through this.
//
//   node film/serve.mjs            → http://127.0.0.1:4173/preview.html
//   node film/serve.mjs --port 5000

import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FILM_DIR = path.dirname(fileURLToPath(import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.md': 'text/plain; charset=utf-8',
};

/** Start the server. `port: 0` picks a free port. Resolves to { server, port, url }. */
export function startServer({ port = 4173, host = '127.0.0.1' } = {}) {
  const server = http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end('Bad request');
      return;
    }
    if (pathname === '/') pathname = '/preview.html';
    const file = path.join(FILM_DIR, path.normalize(pathname));
    // Never serve anything outside film/.
    if (file !== FILM_DIR && !file.startsWith(FILM_DIR + path.sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    let stat;
    try {
      stat = statSync(file);
    } catch {
      stat = null;
    }
    if (!stat || !stat.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store', // always pick up edits
    });
    createReadStream(file).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const actual = server.address().port;
      resolve({ server, port: actual, url: `http://${host}:${actual}` });
    });
  });
}

// Run directly: serve the preview.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--port');
  const port = i > -1 ? Number(process.argv[i + 1]) : 4173;
  startServer({ port }).then(
    ({ url }) => {
      console.log(`Film preview: ${url}/preview.html`);
      console.log('Press Ctrl+C to stop.');
    },
    (err) => {
      console.error(err.code === 'EADDRINUSE' ? `Port ${port} is in use. Try: node film/serve.mjs --port ${port + 1}` : err.message);
      process.exit(1);
    },
  );
}
