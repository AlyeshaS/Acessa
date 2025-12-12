import express from "express";
import { chromium } from "playwright";

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

    // Take screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = screenshotBuffer.toString("base64");

    // TODO: Plug in your real axe / WCAG checks here.
    // For now, we’ll return some sample steps so the frontend animation works.

    const steps = [
      {
        type: "click",
        x: 300,
        y: 180,
        label: "Checking primary navigation accessibility…",
      },
      {
        type: "highlight",
        x: 260,
        y: 160,
        width: 220,
        height: 50,
        issue: "Nav links may have low contrast for some users.",
      },
      {
        type: "click",
        x: 420,
        y: 380,
        label: "Scanning main call-to-action button…",
      },
      {
        type: "highlight",
        x: 380,
        y: 360,
        width: 180,
        height: 60,
        issue: "Button text contrast is borderline for WCAG 2.2 AA.",
      },
      {
        type: "issue",
        issueId: "contrast-cta",
        summary: "Primary CTA might not meet contrast requirements.",
        wcag: "WCAG 2.2 – 1.4.3 Contrast (Minimum)",
      },
    ];

    res.json({
      screenshot: `data:image/png;base64,${screenshotBase64}`,
      steps,
      // you can also include your full issues list here if you already have it
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
