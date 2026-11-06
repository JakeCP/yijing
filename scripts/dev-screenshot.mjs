// Usage: node scripts/dev-screenshot.mjs out.png URL WIDTH HEIGHT DARK(0|1) [js-to-run]
// Headless Chrome + CDP with true mobile emulation (plain --window-size can't go below ~500px on macOS).
// Captures the full page (up to 2600px tall). If js returns a value, it is printed as 'JS: ...'.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [out, url, w, h, dark, js] = process.argv.slice(2);
const C = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9300 + Math.floor(Math.random() * 500);
const p = spawn(C, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, '--user-data-dir=' + join(tmpdir(), 'devshot-' + port), 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend[m.id]) { pend[m.id](m.result); delete pend[m.id]; } };
const send = (method, params = {}) => new Promise(r => { pend[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 800 });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark === '1' ? 'dark' : 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url }); await sleep(2500);
if (js) { const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }); if (r?.result?.value !== undefined) console.log('JS:', r.result.value); if (r?.exceptionDetails) console.log('JS error', JSON.stringify(r.exceptionDetails).slice(0, 300)); await sleep(2500); }
const ov = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollWidth + "x" + document.documentElement.scrollHeight', returnByValue: true });
console.log(out, 'page size', ov.result.value);
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: +w, height: Math.min(+ov.result.value.split('x')[1], 2600), scale: 1 } });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
ws.close(); p.kill(); process.exit(0);
