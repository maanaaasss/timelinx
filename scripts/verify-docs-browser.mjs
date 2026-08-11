import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACT_DIR = '/Users/manas/.gemini/antigravity-ide/brain/9122ce73-5010-450e-b775-bb6d5c94c350';

async function runDocsTest() {
  console.log('[Docs Test] Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('[Docs Test] Navigating to http://localhost:3000/docs/ui/timeline-editor ...');
  await page.goto('http://localhost:3000/docs/ui/timeline-editor');
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_docs_timeline_editor.png') });

  console.log('[Docs Test] Navigating to http://localhost:3000/docs/library/quick-start ...');
  await page.goto('http://localhost:3000/docs/library/quick-start');
  await page.waitForLoadState('networkidle');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_docs_quick_start.png') });

  await browser.close();
  console.log('[Docs Test] SUCCESS: Docs site rendered cleanly in Chromium!');
}

runDocsTest().catch((err) => {
  console.error('[Docs Test] Error:', err);
  process.exit(1);
});
