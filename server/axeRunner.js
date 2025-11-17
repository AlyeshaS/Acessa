import { chromium } from "playwright";
import axe from "axe-core";

const axeSource = axe.source;

export async function runAxeOnUrl(url) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Give the page more time to load on first run
  await page.goto(url, {
    waitUntil: "networkidle",
    timeout: 45000, // 45s instead of default 30s
  });

  await page.addScriptTag({ content: axeSource });

  const axeResults = await page.evaluate(async () => {
    // @ts-ignore
    return await axe.run({
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21aa"],
      },
    });
  });

  await browser.close();
  return axeResults;
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
