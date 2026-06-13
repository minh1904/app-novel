import { _electron as electron } from 'playwright-core';
import { createServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOT_DIR = path.join(ROOT, 'scripts', 'screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

async function shot(page, name) {
  const f = path.join(SHOT_DIR, name + '.png');
  await page.screenshot({ path: f, timeout: 10_000, animations: 'disabled' }).catch(async () => {
    await page.screenshot({ path: f, timeout: 5_000 }).catch(() => {});
  });
  console.log('📸', name, '->', f);
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Starting Vite renderer dev server on port 5173...');
  const server = await createServer({
    configFile: path.join(ROOT, 'vite.renderer.config.ts'),
    mode: 'development',
    server: { port: 5173, strictPort: true },
  });
  await server.listen();
  const devUrl = `http://localhost:5173`;
  console.log('Dev server:', devUrl);

  console.log('Launching Electron...');
  const app = await electron.launch({
    executablePath: path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'),
    args: [path.join(ROOT, '.vite', 'build', 'index.js')],
    env: { ...process.env, NODE_ENV: 'development', ELECTRON_ENABLE_LOGGING: '1' },
    timeout: 30_000,
  });

  await wait(4000);

  const page = app.windows().find(w => !w.url().startsWith('devtools://'))
    ?? await app.firstWindow();
  console.log('Window URL:', page.url());

  await shot(page, '01-library');

  // Click first novel card (button with a progress bar inside, not the "Thêm" add card)
  const clicked = await page.evaluate(() => {
    // Novel cards contain a progress bar div with bg-muted class
    const buttons = [...document.querySelectorAll('button[type="button"]')];
    // Find a button that has a progress bar inside (novel card)
    // Progress bar has "h-[3px]" and "rounded-full bg-muted" classes
    const novelCard = buttons.find(btn => {
      const hasProgressBar = btn.querySelector('[class*="h-\\[3px\\]"]') !== null ||
        btn.querySelector('[class*="rounded-full"]') !== null;
      const hasTitleText = btn.querySelector('.text-sm') !== null;
      return hasProgressBar && hasTitleText && !btn.textContent?.includes('Thêm truyện mới');
    });
    if (novelCard) {
      const title = novelCard.querySelector('.text-sm')?.textContent?.trim();
      novelCard.click();
      return title;
    }
    return null;
  });
  console.log('Novel card clicked:', clicked);
  await wait(2000);
  console.log('URL after novel click:', page.url());
  await shot(page, '02-novel-detail');

  // Click "Bắt đầu dịch" or "Tiếp tục dịch" button
  const ctaText = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[type="button"]')];
    const cta = btns.find(b => {
      const text = b.textContent?.trim() ?? '';
      return text.includes('dịch') && (text.includes('Bắt đầu') || text.includes('Tiếp tục'));
    });
    if (cta) { cta.click(); return cta.textContent?.trim(); }
    return null;
  });
  console.log('CTA clicked:', ctaText);
  await wait(3000);
  console.log('URL after CTA click:', page.url());
  await shot(page, '03-translator-screen');

  const url = page.url();
  const body = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('URL:', url);
  console.log('Body:', body.slice(0, 200));

  // Click "Dịch tiếp" button
  const dichtepText = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Dịch tiếp'));
    if (btn) { btn.click(); return btn.textContent?.trim(); }
    return null;
  });
  console.log('Dịch tiếp clicked:', dichtepText);
  await wait(3500);
  await shot(page, '04-streaming');

  // Click "Dừng" button
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Dừng');
    btn?.click();
  });
  await wait(600);
  await shot(page, '05-paused');

  // Toggle context panel
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.includes('Ngữ cảnh'));
    btn?.click();
  });
  await wait(500);
  await shot(page, '06-no-context');

  await app.close();
  await server.close();
  console.log('\n✓ Done. Screenshots:', SHOT_DIR);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
