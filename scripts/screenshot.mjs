import { _electron as electron } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const SHOT_DIR = path.join(ROOT, 'scripts');
mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');

console.log('ROOT:', ROOT);
console.log('Electron:', electronBin);
console.log('Launching...');

const app = await electron.launch({
  executablePath: electronBin,
  args: [ROOT],
  timeout: 30000,
});

console.log('Launched. Waiting for renderer...');
await new Promise((r) => setTimeout(r, 7000));

const windows = app.windows();
console.log('Windows:', windows.length, windows.map((w) => w.url()));

const page =
  windows.find((w) => w.url().includes('localhost')) ??
  windows[0] ??
  (await app.firstWindow());

const shotPath = path.join(SHOT_DIR, 'library-screenshot.png');
await page.screenshot({ path: shotPath });
console.log('Screenshot saved:', shotPath);

await app.close();
