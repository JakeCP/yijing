// PWA tests: every precached path exists, the manifest is installable
// and relative (the site ships as a project page under /yijing/), and
// index.html wires the manifest, the apple touch icon and sw.js.
// Run: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// The precache list is a plain string array in sw.js so it can be checked
// here and in review without executing the worker.
function precacheUrls() {
  const sw = read('sw.js');
  const block = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  assert.ok(block, 'sw.js must declare const PRECACHE_URLS = [...]');
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('sw.js: every precached path exists in the repo', () => {
  const urls = precacheUrls();
  assert.ok(urls.length > 0, 'precache list is empty');
  for (const url of urls) {
    assert.ok(!url.startsWith('/'), `precache path must be relative: ${url}`);
    assert.ok(!url.startsWith('http'), `precache path must not be absolute: ${url}`);
    const rel = url === './' ? 'index.html' : url.split('?')[0];
    assert.ok(exists(rel), `precached path missing from repo: ${url}`);
  }
});

test('sw.js: app shell pieces are precached', () => {
  const urls = new Set(precacheUrls());
  for (const rel of [
    'index.html', 'css/style.css', 'js/app.js', 'js/engine.js', 'js/render.js',
    'js/book.js', 'js/about.js', 'data/hexagrams.json', 'data/trigrams.json',
    'fonts/eb-garamond.woff2', 'fonts/noto-serif-tc.woff2',
    'manifest.webmanifest', 'favicon.svg', 'icons/apple-touch-icon.png',
  ]) {
    assert.ok(urls.has(rel), `app shell file not precached: ${rel}`);
  }
});

test('manifest: installable, relative, icon files exist', () => {
  const man = JSON.parse(read('manifest.webmanifest'));
  assert.equal(man.name, 'Yijing 易經');
  assert.equal(man.short_name, '易經');
  assert.equal(man.start_url, './');
  assert.equal(man.scope, './');
  assert.equal(man.display, 'standalone');
  assert.ok(Array.isArray(man.icons) && man.icons.length > 0, 'manifest icons missing');
  const purposes = new Set(man.icons.flatMap((i) => (i.purpose || 'any').split(' ')));
  assert.ok(purposes.has('any'), 'manifest needs an "any" purpose icon');
  assert.ok(purposes.has('maskable'), 'manifest needs a maskable icon');
  for (const icon of man.icons) {
    assert.ok(!icon.src.startsWith('/'), `manifest icon must be relative: ${icon.src}`);
    assert.ok(exists(icon.src), `manifest icon missing from repo: ${icon.src}`);
  }
});

test('index.html: manifest, apple icon, og:image and relative sw registration', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">/);
  assert.match(html, /apple-mobile-web-app-title" content="易經"/);
  assert.match(html, /og:image" content="https:\/\/jakecp\.github\.io\/yijing\/icons\/icon-512\.png"/);
  assert.match(html, /serviceWorker\.register\('sw\.js'\)/, 'sw.js must be registered with a relative path');
  assert.doesNotMatch(html, /serviceWorker\.register\('\//, 'sw.js must not be registered from the domain root');
});
