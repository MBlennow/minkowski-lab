import { createServer } from 'node:http';
import { build } from './build.mjs';

const port = Number(process.env.MINKOWSKI_PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('MINKOWSKI_PORT must be an integer between 1 and 65535.');
}
await build();
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') {
    response.writeHead(204).end();
    return;
  }
  if (pathname !== '/' && pathname !== '/index.html') {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  try {
    // Rebuild on refresh so source edits appear without a watcher or dependencies.
    const html = await build();
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(html);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { 'Content-Type': 'text/plain' }).end('Build failed. See the terminal for details.');
  }
});
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Minkowski Lab: http://127.0.0.1:${port}`);
  console.log('Edit files in src/, then refresh your browser. Ctrl+C stops the server.');
});
