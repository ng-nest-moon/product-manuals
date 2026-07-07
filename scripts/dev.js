const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const PORT = process.env.PORT || 3000;
const BASE_PATH = '/product-manuals';

/* Watched directories */
const WATCH_DIRS = [
  path.join(ROOT, 'docs'),
  path.join(ROOT, 'templates'),
  path.join(ROOT, 'src'),
  path.join(ROOT, 'README.md')
];

/* Run build first */
console.log('Building site...\n');
execSync('node scripts/build.js', { cwd: ROOT, stdio: 'inherit' });

console.log('\nStarting local dev server with file watching...\n');

/* Start dev server using Node.js built-in http module */
const http = require('http');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function serveFile(res, filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return false;
  } catch {
    return false;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(content);
  return true;
}

const server = http.createServer((req, res) => {
  let pathname = new URL(req.url, 'http://localhost').pathname;

  /* Decode percent-encoded characters (for Chinese paths) */
  try {
    pathname = decodeURIComponent(pathname);
  } catch (e) {
    /* fallback to raw pathname */
  }

  /* Strip base path for local serving */
  if (pathname.startsWith(BASE_PATH)) {
    pathname = pathname.slice(BASE_PATH.length);
  }
  if (pathname === '' || pathname === '/') {
    pathname = 'index.html';
  }
  if (pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  /* Try exact path */
  let filePath = path.join(DIST_DIR, pathname);
  if (serveFile(res, filePath)) return;

  /* Try index.html in directory */
  if (!path.extname(pathname)) {
    filePath = path.join(DIST_DIR, pathname, 'index.html');
    if (serveFile(res, filePath)) return;
  }

  /* 404 */
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404 Not Found</h1>');
});

server.listen(PORT, () => {
  console.log(`Server running at:`);
  console.log(`  Local:   http://localhost:${PORT}${BASE_PATH}/`);
  console.log(`  Preview: http://localhost:${PORT}${BASE_PATH}/\n`);
});

/* File watcher: auto-rebuild on changes */
let rebuildTimer = null;
const REBUILD_DEBOUNCE_MS = 300;

function scheduleRebuild(filePath) {
  const rel = path.relative(ROOT, filePath);
  console.log(`  📁 Changed: ${rel}`);
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    console.log('  🔄 Rebuilding...');
    try {
      execSync('node scripts/build.js', { cwd: ROOT, stdio: 'inherit' });
      console.log('  ✅ Rebuild complete\n');
    } catch (e) {
      console.error('  ❌ Rebuild failed:', e.message);
    }
  }, REBUILD_DEBOUNCE_MS);
}

WATCH_DIRS.forEach((watchPath) => {
  if (!fs.existsSync(watchPath)) return;
  const stat = fs.statSync(watchPath);
  if (stat.isDirectory()) {
    fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
      if (filename) {
        scheduleRebuild(path.join(watchPath, filename));
      }
    });
    console.log(`  👀 Watching: ${path.relative(ROOT, watchPath)}/`);
  } else if (stat.isFile()) {
    fs.watch(watchPath, (eventType) => {
      scheduleRebuild(watchPath);
    });
    console.log(`  👀 Watching: ${path.relative(ROOT, watchPath)}`);
  }
});

console.log('');
