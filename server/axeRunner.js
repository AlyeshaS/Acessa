import { chromium } from "playwright";
import axe from "axe-core";
const axeSource = axe.source;

/**
 * Injected before page JS runs. Prevents popups and intercepts dialogs
 * that appear when the user (or axe) interacts with certain elements.
 */
const ANTI_POPUP_SCRIPT = `
(function () {
  // Swallow window.open calls (popup windows)
  window.open = function () { return null; };

  // Auto-hide any dialog/modal injected into the DOM
  const _MO = window.MutationObserver;
  window.MutationObserver = class extends _MO {
    constructor(cb) {
      super((mutations, obs) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;
            const role = node.getAttribute && node.getAttribute("role");
            const modal = node.getAttribute && node.getAttribute("aria-modal");
            if (role === "dialog" || modal === "true") {
              node.style.setProperty("display", "none", "important");
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('[role="dialog"],[aria-modal="true"]').forEach(el => {
                el.style.setProperty("display", "none", "important");
              });
            }
          }
        }
        cb(mutations, obs);
      });
    }
  };
})();
`;

async function runAxeOnUrl(url, viewportSize = { width: 1280, height: 720 }) {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    geolocation: { latitude: 43.7, longitude: -79.42 },
    permissions: ["geolocation"],
  });

  await context.addInitScript({ content: ANTI_POPUP_SCRIPT });

  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

  // Block any navigation away from the original page.
  // This prevents links (like Craigslist's subarea links) from opening
  // the location-picker modal or navigating to a different page mid-scan.
  page.on("framenavigated", async (frame) => {
    if (frame !== page.mainFrame()) return; // allow subframes
    const current = frame.url();
    if (current !== "about:blank" && current !== url && current !== url + "/") {
      console.log(`[NAV] Blocked navigation to: ${current}`);
      await page
        .goto(url, { waitUntil: "networkidle", timeout: 45000 })
        .catch(() => {});
    }
  });

  try {
    await page.setViewportSize(viewportSize);

    const response = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    const finalUrl = page.url();

    // After load, patch all links and click handlers that could trigger popups.
    // We stop <a> clicks from navigating and stop any element from triggering
    // a location picker by intercepting the most common pattern.
    await page.evaluate(() => {
      // Intercept all anchor clicks — prevent navigation, allow axe to inspect
      document.addEventListener(
        "click",
        (e) => {
          const a = e.target.closest("a");
          if (a && a.href && !a.href.startsWith("javascript")) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        },
        true,
      );
    });

    await page.addScriptTag({ content: axeSource });

    const axeResults = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run();
    });

    const pageInfo = await page.evaluate(() => ({
      scrollX: window.scrollX || window.pageXOffset,
      scrollY: window.scrollY || window.pageYOffset,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
    }));

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
            }, sel);

            if (box) {
              box.pageX = box.x + pageInfo.scrollX;
              box.pageY = box.y + pageInfo.scrollY;
              node.boundingBoxes.push(box);
            }
          } catch (e) {
            console.warn(`Could not get bounding box for ${sel}:`, e.message);
          }
        }

        node.boundingBox = node.boundingBoxes[0] || null;
        node.selector = selectors[0] || null;
      }
    }

    axeResults.pageInfo = pageInfo;
    axeResults.viewportSize = viewportSize;
    axeResults.finalUrl = finalUrl;
    axeResults.gotoResponseStatus =
      response && response.status ? response.status() : null;

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
      if (attempt === retries) throw lastError;
    }
  }

  throw lastError || new Error("Unknown AXE error");
}
