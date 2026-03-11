const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function getMime(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  var stat;
  try {
    stat = fs.statSync(filePath);
  } catch (e) {
    return false;
  }
  if (!stat.isFile()) return false;
  res.writeHead(200, {
    'Content-Type': getMime(filePath),
    'Content-Length': stat.size,
    'Cache-Control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

var server = http.createServer(function (req, res) {
  var url = req.url.split('?')[0];
  var filePath = path.join(DIST, url);

  if (serveFile(res, filePath)) return;
  if (serveFile(res, path.join(filePath, 'index.html'))) return;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(path.join(DIST, 'index.html')).pipe(res);
});

server.listen(PORT, function () {
  console.log('Serving dist on http://localhost:' + PORT);
});
