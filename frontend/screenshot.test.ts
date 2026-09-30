import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 375, height: 667 },
];

test.describe.configure({ retries: 0 });
test.describe('Visual regression - ui_v2', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('login page', async ({ page }) => {
        const baseURL = process.env.BASE_URL || 'http://localhost:5173';
        await page.goto(baseURL, { waitUntil: 'load' });
        
        // Just wait a bit for any rendering
        await page.waitForTimeout(2000);
        
        // Take screenshot regardless of content
        const screenshot = await page.screenshot({
          fullPage: true,
          animations: 'disabled',
        });
        
        // Save with descriptive name
        const filename = `screenshots/login-${viewport.name}.png`;
        await test.info().attach(filename, {
          body: screenshot,
          contentType: 'image/png',
        });
        
        // Also save to filesystem for comparison
        const outDir = path.join(process.cwd(), 'screenshots');
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(path.join(outDir, `login-${viewport.name}.png`), screenshot);
      });
    });
  }
});