import express from "express";

import { runAxeOnUrlSafe } from "../axeRunner.js";

const router = express.Router();

router.post("/url", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  let browser;

  try {
    browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle" });

    // Run axe-core accessibility checks using axeRunner
    const axeResults = await runAxeOnUrlSafe(url, 1);

    // Take screenshot after analysis (optional, can move before if needed)
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // Convert axe violations to steps for frontend animation (one step per node)
    const steps = axeResults.violations
      .flatMap((violation) =>
        violation.nodes.map((node, idx) => {
          const box = node && node.boundingBox;
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
      .slice(0, 10); // limit to 10 steps for animation

    // Debug: log violations and steps
    console.log("[DEBUG] Violations sent to frontend:", JSON.stringify(axeResults.violations, null, 2));
    console.log("[DEBUG] Steps sent to frontend:", JSON.stringify(steps, null, 2));

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
