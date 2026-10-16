const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath;
  try {
    filePath = decodeURIComponent(req.url.split('?')[0]);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }
  if (filePath === '/') filePath = '/index.html';
  const fullPath = path.resolve(ROOT, '.' + filePath);

  // Only serve files inside the project folder and never dotfiles (.git, .env, ...)
  const relPath = path.relative(ROOT, fullPath);
  if (
    relPath.startsWith('..') ||
    path.isAbsolute(relPath) ||
    relPath.split(path.sep).some((part) => part.startsWith('.')) ||
    !MIME_TYPES[path.extname(fullPath)]
  ) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`ATELIER.GE Web Server running at http://localhost:${PORT}`);
});
