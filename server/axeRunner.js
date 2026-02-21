import { chromium } from "playwright";
import axe from "axe-core";
const axeSource = axe.source;

async function runAxeOnUrl(url, viewportSize = { width: 1280, height: 720 }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Set consistent viewport
    await page.setViewportSize(viewportSize);

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 45000,
    });

    await page.addScriptTag({ content: axeSource });

    // Run axe in the page context
    const axeResults = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run();
    });

    // Get current scroll position and page dimensions
    const pageInfo = await page.evaluate(() => ({
      scrollX: window.scrollX || window.pageXOffset,
      scrollY: window.scrollY || window.pageYOffset,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
    }));

    // For each violation node, extract all selectors and bounding boxes
    for (const violation of axeResults.violations) {
      for (const node of violation.nodes) {
        const selectors = Array.isArray(node.target)
          ? node.target
          : node.target
            ? [node.target]
            : [];
        node.boundingBoxes = [];
        node.selectors = selectors;

        for (const sel of selectors) {
          try {
            // Get bounding box WITHOUT scrolling
            const box = await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              if (!el) return null;

              const rect = el.getBoundingClientRect();
              return {
                // viewport-relative coordinates
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                selector: sel,
              };
            }, sel);

            if (box) {
              // Add scroll offset to convert viewport coords to page coords
              box.pageX = box.x + pageInfo.scrollX;
              box.pageY = box.y + pageInfo.scrollY;
              node.boundingBoxes.push(box);
            }
          } catch (e) {
            console.warn(`Could not get bounding box for ${sel}:`, e.message);
          }
        }

        // For backward compatibility
        node.boundingBox = node.boundingBoxes[0] || null;
        node.selector = selectors[0] || null;
      }
    }

    // Attach page info to results
    axeResults.pageInfo = pageInfo;
    axeResults.viewportSize = viewportSize;

    return axeResults;
  } finally {
    await browser.close();
  }
}

export async function runAxeOnUrlSafe(url, retries = 1, viewportSize) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await runAxeOnUrl(url, viewportSize);
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
