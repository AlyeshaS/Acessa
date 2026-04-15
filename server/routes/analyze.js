import express from "express";
import { chromium } from "playwright";
import { runAxeOnUrlSafe } from "../axeRunner.js";

const router = express.Router();

router.post("/url", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let browser;

  try {
    // Run axe (which internally uses Playwright) to get violations + bounding boxes
    const axeResults = await runAxeOnUrlSafe(url, 1);

    // Take the screenshot using the same viewport axeRunner used, so coordinates match
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize(
      axeResults.viewportSize || { width: 1280, height: 720 },
    );
    await page.goto(axeResults.finalUrl || url, {
      waitUntil: "networkidle",
      timeout: 45000,
    });

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Build steps from axe violations — one step per node that has a bounding box.
    // x/y come directly from axeRunner's viewport-relative coords so highlights
    // land on the correct pixels in the screenshot.
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

    console.log(
      "[DEBUG] Violations sent to frontend:",
      JSON.stringify(axeResults.violations, null, 2),
    );
    console.log(
      "[DEBUG] Steps sent to frontend:",
      JSON.stringify(steps, null, 2),
    );

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
