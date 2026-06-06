import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:3000';
const OUT = '.voyageos-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shoot(page, path, file, waitMs = 600) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
  console.log('shot', file);
}

// Desktop
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/01-login.png` });
console.log('shot 01-login');

await page.getByText('Continue as dev user').click();
await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/02-dashboard.png`, fullPage: true });
console.log('shot 02-dashboard');

await shoot(page, '/explore', '03-explore.png');
await shoot(page, '/pack', '04-pack.png');
await shoot(page, '/map', '05-map.png', 3500);
await shoot(page, '/plan', '08-plan.png', 1500);
await ctx.close();

// Mobile
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mpage = await mctx.newPage();
await mpage.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await mpage.getByText('Continue as dev user').click();
await mpage.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
await mpage.waitForTimeout(800);
await mpage.screenshot({ path: `${OUT}/06-mobile-dashboard.png`, fullPage: true });
console.log('shot 06-mobile-dashboard');
await mpage.goto(`${BASE}/explore`, { waitUntil: 'networkidle' });
await mpage.waitForTimeout(600);
await mpage.screenshot({ path: `${OUT}/07-mobile-explore.png`, fullPage: true });
console.log('shot 07-mobile-explore');
await mctx.close();

await browser.close();
console.log('done');
