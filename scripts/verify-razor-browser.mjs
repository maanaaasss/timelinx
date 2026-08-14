import { chromium } from 'playwright';
import path from 'node:path';

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || './artifacts';

async function runBrowserTest() {
  console.log('[Browser Test] Launching Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('[Browser Test] Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Take initial screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_initial_page.png') });

  // Click "▶ Load Demo" button
  console.log('[Browser Test] Clicking "Load Demo" button...');
  const loadDemoBtn = page.getByRole('button', { name: /Load Demo/i });
  await loadDemoBtn.click();
  await page.waitForTimeout(500);

  // Count clips before razor
  const initialClips = await page.locator('.tl-v2-clip').count();
  console.log(`[Browser Test] Clips rendered before razor cut: ${initialClips}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_demo_loaded.png') });

  // Select Razor tool
  console.log('[Browser Test] Clicking Razor tool button...');
  const razorBtn = page.locator('button[title*="Razor"]');
  await razorBtn.click();
  await page.waitForTimeout(200);

  // Click inside the first clip
  const firstClip = page.locator('.tl-v2-clip').first();
  const box = await firstClip.boundingBox();
  if (!box) throw new Error('Could not find bounding box for first clip');

  console.log(
    `[Browser Test] First clip box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`,
  );
  const clickX = box.x + Math.round(box.width / 2);
  const clickY = box.y + Math.round(box.height / 2);

  console.log(
    `[Browser Test] Performing real mouse click at (${clickX}, ${clickY}) in razor mode...`,
  );
  await page.mouse.click(clickX, clickY);
  await page.waitForTimeout(300);

  const clipsAfterCut = await page.locator('.tl-v2-clip').count();
  console.log(`[Browser Test] Clips rendered after single razor cut: ${clipsAfterCut}`);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_after_razor_cut.png') });

  // Test Shift+click for multi-track slicing
  console.log('[Browser Test] Performing Shift+click mouse click in razor mode...');
  await page.keyboard.down('Shift');
  await page.mouse.click(box.x + Math.round(box.width / 4), clickY);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(300);

  const clipsAfterShiftCut = await page.locator('.tl-v2-clip').count();
  console.log(
    `[Browser Test] Clips rendered after Shift+click multi-track cut: ${clipsAfterShiftCut}`,
  );
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_after_shift_razor_cut.png') });

  await browser.close();

  if (clipsAfterCut > initialClips && clipsAfterShiftCut > clipsAfterCut) {
    console.log('[Browser Test] SUCCESS: Razor clicks work end-to-end in real Chromium browser!');
  } else {
    console.error('[Browser Test] FAILURE: Razor click did not split clips in DOM');
    process.exit(1);
  }
}

runBrowserTest().catch((err) => {
  console.error('[Browser Test] Error:', err);
  process.exit(1);
});
