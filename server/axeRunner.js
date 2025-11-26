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

  const axeResults = await runAxeOnPage(page); // however you’re doing this

  // Turn axe violations into "groups-style" objects
  const axeGroups = axeResults.violations.map((v) => {
    // Try to grab the WCAG id and name from axe metadata if available
    const wcagCriterion =
      (v.tags && v.tags.find((t) => t.startsWith("wcag"))) ||
      v.id ||
      "Unknown WCAG criterion";

    return {
      wcagCriterion,
      severity:
        (v.impact || "medium").charAt(0).toUpperCase() +
        (v.impact || "medium").slice(1),
      count: v.nodes ? v.nodes.length : 1,
      problem: v.description || v.help || "Axe reported a WCAG violation.",
      recommendation: v.helpUrl
        ? `Fix this issue following: ${v.helpUrl}`
        : v.help || "Update the markup to satisfy this WCAG criterion.",
    };
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
