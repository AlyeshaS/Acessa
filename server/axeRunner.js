import { chromium } from "playwright";
import axe from "axe-core";
const axeSource = axe.source;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Give the page more time to load on first run
await page.goto(url, {
  waitUntil: "networkidle",
  timeout: 45000, // 45s instead of default 30s
});

await page.addScriptTag({ content: axeSource });

// Run axe in the page context
const axeResults = await page.evaluate(async () => {
  // @ts-ignore
  return await window.axe.run();
});

// For each violation node, extract selector and bounding box
for (const violation of axeResults.violations) {
  for (const node of violation.nodes) {
    // Use the first target selector if available
    const selector = Array.isArray(node.target) ? node.target[0] : node.target;
    if (selector) {
      try {
        // Evaluate in page context to get bounding box
        const box = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            selector: sel,
          };
        }, selector);
        node.boundingBox = box;
      } catch (e) {
        node.boundingBox = null;
      }
      node.selector = selector;
    } else {
      node.boundingBox = null;
      node.selector = null;
    }
  }
}

export async function runAxeOnUrlSafe(url, retries = 1) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await runAxeOnUrl(url);
    } catch (err) {
      lastError = err;
      console.warn(`[AXE] Scan failed on attempt ${attempt + 1}:`, err.message);

      if (attempt === retries) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error("Unknown AXE error");
}
