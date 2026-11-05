#!/usr/bin/env node
// Rasterize the app-icon SVG sources to the PNGs the PWA ships.
//
//   node scripts/build-icons.mjs
//
// Inputs:  icons/src/icon.svg, icon-maskable.svg, icon-monochrome.svg
//          (+ favicon.svg for the 32px PNG favicon fallback: at 32px the
//          full-bleed seal reads better than the seal-on-paper icon).
// Outputs: icons/*.png (committed; the site has no other build step).
//
// Method: headless Chrome over CDP, as in scripts/dev-screenshot.mjs —
// each SVG is inlined into a page sized exactly to the target PNG, then
// captured with Page.captureScreenshot. Opaque icons keep the default
// background (their SVGs paint full-bleed paper anyway); the monochrome
// icon and the favicon capture with a transparent default background
// override (Emulation.setDefaultBackgroundColorOverride, alpha 0 — the
// CDP equivalent of Puppeteer's omitBackground: true).
//
// Chrome is found via $CHROME_PATH, then the usual per-platform paths.
// Requires Node >= 22 (global fetch + WebSocket), no dependencies.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'icons', 'src');
const OUT = path.join(ROOT, 'icons');

// src (relative to repo root), pixel size, output (in icons/), transparent?
const JOBS = [
  { src: 'icons/src/icon.svg', size: 180, out: 'apple-touch-icon.png', transparent: false },
  { src: 'icons/src/icon.svg', size: 192, out: 'icon-192.png', transparent: false },
  { src: 'icons/src/icon.svg', size: 512, out: 'icon-512.png', transparent: false },
  { src: 'icons/src/icon-maskable.svg', size: 192, out: 'icon-maskable-192.png', transparent: false },
  { src: 'icons/src/icon-maskable.svg', size: 512, out: 'icon-maskable-512.png', transparent: false },
  { src: 'icons/src/icon-monochrome.svg', size: 512, out: 'icon-monochrome-512.png', transparent: true },
  { src: 'favicon.svg', size: 32, out: 'favicon-32.png', transparent: true },
];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
  }[process.platform] ?? [];
  return candidates.find((c) => fs.existsSync(c))
    ?? (process.platform === 'linux' ? 'google-chrome' : null);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  for (const job of JOBS) {
    if (!fs.existsSync(path.join(ROOT, job.src))) throw new Error(`missing source: ${job.src}`);
  }
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome not found. Install Google Chrome or set CHROME_PATH=/path/to/chrome');
  fs.mkdirSync(OUT, { recursive: true });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yijing-icons-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(tmp, 'profile')}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    let tabs;
    for (let i = 0; i < 50 && !tabs; i += 1) {
      try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); }
      catch { await sleep(200); }
    }
    if (!tabs) throw new Error(`Chrome DevTools endpoint never came up on port ${port}`);
    const page = tabs.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target in Chrome DevTools list');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pend = {};
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (!pend[m.id]) return;
      const { resolve, reject } = pend[m.id];
      delete pend[m.id];
      if (m.error) reject(new Error(`${m.error.message} (${m.error.code})`));
      else resolve(m.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      pend[++id] = { resolve, reject };
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');

    for (const job of JOBS) {
      const svg = fs.readFileSync(path.join(ROOT, job.src), 'utf8');
      const html = '<!DOCTYPE html>\n<meta charset="utf-8">\n<style>'
        + `html,body{margin:0;padding:0}svg{display:block;width:${job.size}px;height:${job.size}px}`
        + `</style>\n${svg}\n`;
      const pageFile = path.join(tmp, 'page.html');
      fs.writeFileSync(pageFile, html);

      await send('Emulation.setDeviceMetricsOverride', {
        width: job.size, height: job.size, deviceScaleFactor: 1, mobile: false,
      });
      await send('Emulation.setDefaultBackgroundColorOverride',
        job.transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
      await send('Page.navigate', { url: pathToFileURL(pageFile).href });
      for (let i = 0; i < 50; i += 1) {
        const r = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
        if (r?.result?.value === 'complete') break;
        await sleep(100);
      }
      await sleep(150); // let SVG filters paint before the capture surface is read

      const shot = await send('Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: false,
        clip: { x: 0, y: 0, width: job.size, height: job.size, scale: 1 },
      });
      const dest = path.join(OUT, job.out);
      fs.writeFileSync(dest, Buffer.from(shot.data, 'base64'));
      console.log(`icons/${job.out}  ${job.size}x${job.size}  from ${job.src}  (${fs.statSync(dest).size} bytes)`);
    }

    ws.close();
  } finally {
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await Promise.race([exited, sleep(5000)]);
    try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* temp dir; OS cleans it */ }
  }
  console.log(`Done. Sources in ${path.relative(ROOT, SRC)}/, PNGs in icons/.`);
}

main().catch((err) => { console.error(`build-icons: ${err.message}`); process.exit(1); });
