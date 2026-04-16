import express from "express";
import { chromium } from "playwright";
import { runAxeOnUrlSafe } from "../axeRunner.js";

const router = express.Router();

/**
 * FINAL ANTI-POPUP SCRIPT (Craigslist-proof)
 */
const ANTI_POPUP_SCRIPT = `
(function () {
  document.cookie = "cl_def_hp=toronto; path=/; domain=.craigslist.org";
  document.cookie = "cl_tocsite=1; path=/; domain=.craigslist.org";
  window.open = function () { return null; };

  // Always allow scrolling
  document.addEventListener("DOMContentLoaded", () => {
    document.body.style.overflow = "auto";
  });

  // Aggressively kill Craigslist location popup
  const killPopup = () => {
    document.querySelectorAll("*").forEach((el) => {
      const text = (el.innerText || "").toLowerCase();

      if (
        text.includes("search location") ||
        text.includes("postal code") ||
        text.includes("nearby areas")
      ) {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("pointer-events", "none", "important");
      }
    });

    // Known Craigslist classes
    document
      .querySelectorAll(".search-location-picker, .cl-location-picker")
      .forEach((el) => {
        el.style.setProperty("display", "none", "important");
      });
  };

  const interval = setInterval(killPopup, 300);
  setTimeout(() => clearInterval(interval), 8000);
})();
`;

/**
 * FINAL OVERLAY REMOVAL
 */
async function dismissOverlays(page) {
  // Escape first
  try {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  } catch {}

  // Remove anything blocking center
  try {
    const removed = await page.evaluate(() => {
      let count = 0;

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      const elements = Array.from(document.querySelectorAll("*"));

      elements.forEach((el) => {
        if (el === document.body || el === document.documentElement) return;

        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return;

        const rect = el.getBoundingClientRect();

        const coversCenter =
          rect.left <= centerX &&
          rect.right >= centerX &&
          rect.top <= centerY &&
          rect.bottom >= centerY;

        if (coversCenter && rect.width > 100 && rect.height > 100) {
          el.style.setProperty("display", "none", "important");
          el.style.setProperty("pointer-events", "none", "important");
          count++;
        }
      });

      return count;
    });

    if (removed > 0) {
      console.log(`[OVERLAY] Removed ${removed} blocking elements`);
    }
  } catch (e) {
    console.warn("[OVERLAY] Removal failed:", e.message);
  }

  // Craigslist-specific cleanup (backup)
  try {
    await page.evaluate(() => {
      document
        .querySelectorAll(".search-location-picker, .cl-location-picker")
        .forEach((el) => {
          el.style.setProperty("display", "none", "important");
        });
    });
  } catch {}

  // Ensure page is usable
  try {
    await page.evaluate(() => {
      document.body.style.pointerEvents = "auto";
      document.body.style.overflow = "auto";

      document.querySelectorAll("*").forEach((el) => {
        el.style.pointerEvents = "auto";
      });
    });
  } catch {}

  await page.waitForTimeout(300);
}

router.post("/url", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let browser;

  try {
    const axeResults = await runAxeOnUrlSafe(url, 1);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      geolocation: { latitude: 43.7, longitude: -79.42 },
      permissions: ["geolocation"],
    });

    // Inject anti-popup script
    await context.addInitScript({ content: ANTI_POPUP_SCRIPT });

    const page = await context.newPage();
    page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

    await page.setViewportSize(
      axeResults.viewportSize || { width: 1280, height: 720 },
    );

    await page.goto(axeResults.finalUrl || url, {
      waitUntil: "networkidle",
      timeout: 45000,
    });

    // Apply overlay fix
    await dismissOverlays(page);

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    const steps = axeResults.violations
      .flatMap((violation) =>
        violation.nodes.map((node) => {
          const box = node.boundingBox;
          return box
            ? {
                type: "highlight",
                x: Math.round(box.x),
                y: Math.round(box.y),
                width: Math.round(box.width),
                height: Math.round(box.height),
                issue:
                  node.failureSummary ||
                  violation.description ||
                  violation.help,
                wcag: violation.id,
              }
            : {
                type: "issue",
                issueId: violation.id,
                summary:
                  node.failureSummary ||
                  violation.description ||
                  violation.help,
                wcag: violation.id,
              };
        }),
      )
      .slice(0, 10);

    res.json({
      screenshot: `data:image/png;base64,${screenshotBase64}`,
      steps,
      violations: axeResults.violations,
    });
  } catch (err) {
    console.error("Error analyzing URL:", err);
    res.status(500).json({ error: "Failed to analyze URL" });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

export default router;
