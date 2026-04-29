const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 5500;

const MIME = {
  js: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  json: 'application/json',
  map: 'application/json',
  ts: 'text/plain',
  vue: 'text/plain',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const fp = path.join(ROOT, urlPath);

  if (!fs.existsSync(fp)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const stat = fs.statSync(fp);
  if (stat.isDirectory()) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readdirSync(fp).map(x => `<a href="${encodeURIComponent(x)}">${x}</a><br>`).join('\n'));
    return;
  }

  const ext = path.extname(fp).slice(1);
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': mime + (ext === 'js' ? '; charset=utf-8' : ''),
    'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}/`);
});
