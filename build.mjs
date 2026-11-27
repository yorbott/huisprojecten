// Bouwt de app naar ./dist. Gebruik: node build.mjs [--serve]
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const serve = process.argv.includes('--serve');
const out = 'dist';

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp('public', out, { recursive: true });

const result = await esbuild.build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: !serve,
  sourcemap: serve,
  format: 'esm',
  target: ['safari16', 'chrome110'],
  jsx: 'automatic',
  outfile: `${out}/app.js`,
  metafile: true,
  define: { 'process.env.NODE_ENV': serve ? '"development"' : '"production"' },
  logLevel: 'info',
});

// versie = hash van de gebouwde bestanden, zodat de service worker updates oppikt
const js = await readFile(`${out}/app.js`);
const css = await readFile(`${out}/app.css`).catch(() => Buffer.from(''));
const version = createHash('sha1').update(js).update(css).digest('hex').slice(0, 10);
const sw = await readFile(`${out}/sw.js`, 'utf8');
await writeFile(`${out}/sw.js`, sw.replace('__VERSION__', version));
const html = await readFile(`${out}/index.html`, 'utf8');
await writeFile(`${out}/index.html`, html.replaceAll('__VERSION__', version));

// app-iconen uit het SVG-bestand
try {
  const sharp = (await import('sharp')).default;
  const svg = await readFile('public/icon.svg');
  for (const size of [180, 192, 512]) {
    await sharp(svg).resize(size, size).png().toFile(`${out}/icon-${size}.png`);
  }
} catch (e) {
  console.warn('Iconen niet gemaakt:', e.message);
}

console.log(`Klaar · versie ${version} · ${(js.length / 1024).toFixed(0)} kB JS`);

if (serve) {
  const { createServer } = await import('node:http');
  const { extname, join } = await import('node:path');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  createServer(async (req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    const file = join(out, path === '/' ? 'index.html' : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('niet gevonden');
    }
  }).listen(5173, () => console.log('http://localhost:5173'));
}

void result;
