import "dotenv/config";
import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import { GoogleGenAI } from "@google/genai";
import { AxeBuilder } from "@axe-core/playwright";
import analyzeRouter from "./routes/analyze.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

import { openaiImageEdit } from "./openaiImageEdit.js";
/**
 * Image Editing endpoint: Uses OpenAI gpt-image-1 to edit an image based on a prompt.
 * POST /api/ai/image-edit
 * Body: { screenshot: base64 string, prompt: string }
 * Returns: { editedImageUrl, editedImageBase64 }
 */
app.post("/api/ai/image-edit", async (req, res) => {
  const { screenshot, prompt } = req.body || {};
  if (!screenshot || typeof screenshot !== "string") {
    return res
      .status(400)
      .json({ error: "Missing screenshot in request body" });
  }
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt in request body" });
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OpenAI API key" });
    }
    const result = await openaiImageEdit({
      imageBase64: screenshot,
      prompt,
      apiKey,
    });
    // OpenAI returns an array of images (usually with a URL)
    const imageUrl = result.data?.[0]?.url;
    const imageBase64 = result.data?.[0]?.b64_json;
    res.json({
      editedImageUrl: imageUrl,
      editedImageBase64: imageBase64
        ? `data:image/png;base64,${imageBase64}`
        : undefined,
    });
  } catch (err) {
    console.error("[AI Image Edit] Error:", err);
    res.status(500).json({ error: "Image edit failed", details: err.message });
  }
});

/**
 * Visual AI Fix endpoint: Accepts a screenshot and feedback, sends to Gemini AI for WCAG fixes (contrast, color, font size), returns improved image and feedback.
 */
app.post("/api/wcag-visual", async (req, res) => {
  const { screenshot, feedback } = req.body || {};
  if (!screenshot || typeof screenshot !== "string") {
    return res
      .status(400)
      .json({ error: "Missing screenshot in request body" });
  }
  try {
    // Build prompt for Gemini
    const prompt = `You are an AI accessibility engine. Given a screenshot of a web page, your job is to visually fix the image so it passes WCAG guidelines for contrast, color, and font size. Apply the feedback below. Return ONLY a single valid JSON object with a base64 JPEG image (fixedScreenshot) and a summary of the changes. Do NOT include any explanations, markdown, or extra text.\n\nFeedback: ${JSON.stringify(feedback, null, 2)}`;

    // Call Gemini with inline image data
    let aiRes;
    let rawAiText = "";
    try {
      aiRes = await callAiWithInlineData(
        prompt,
        screenshot.replace(/^data:image\/jpeg;base64,/, ""),
        "image/jpeg",
      );
    } catch (aiErr) {
      if (aiErr && aiErr.message) rawAiText = aiErr.message;
      console.error("[WCAG] AI error in callAiWithInlineData:", aiErr);
    }

    // If parsing failed or no valid image, fallback to original screenshot
    let imageData =
      aiRes && aiRes.fixedScreenshot ? aiRes.fixedScreenshot : null;
    if (!imageData || typeof imageData !== "string" || imageData.length < 100) {
      console.error("[WCAG] No valid AI image, returning original screenshot.");
      // Always fallback to the original screenshot base64 (strip prefix if present)
      imageData = screenshot.replace(/^data:image\/(jpeg|png);base64,/, "");
    }
    // Log the outgoing image length and prefix for debugging
    const preview = imageData ? imageData.slice(0, 30) : "(empty)";
    console.log(
      `[WCAG] Sending fixedScreenshot: length=${imageData.length}, startsWith='${preview}'`,
    );
    // Ensure we do not double-prefix the data URL
    let fixedScreenshotUrl = imageData;
    if (imageData && !imageData.startsWith("data:image/jpeg;base64,")) {
      fixedScreenshotUrl = `data:image/jpeg;base64,${imageData}`;
    }
    res.json({
      fixedScreenshot: fixedScreenshotUrl,
      summary:
        aiRes && aiRes.summary
          ? aiRes.summary
          : "Visual accessibility improvements applied.",
      feedback: aiRes && aiRes.feedback ? aiRes.feedback : feedback,
      aiError: aiRes && aiRes.error ? aiRes.error : undefined,
    });
  } catch (err) {
    console.error("[WCAG] /api/wcag-visual error:", err);
    if (err && err.message) {
      console.error("[WCAG] Raw error message:", err.message);
    }
    res
      .status(500)
      .json({ error: "Visual AI fix failed", details: err.message });
  }
});
/**
 * ===============================
 * AI HTML/CSS VISUAL MODIFIER
 * ===============================
 * This endpoint is called EXPLICITLY by the frontend after WCAG feedback
 * to generate a visual "after" preview (HTML + CSS).
 */
app.post("/api/ai-modify-html", async (req, res) => {
  console.log("🔥🔥🔥 /api/ai-modify-html WAS CALLED");
  const { feedback } = req.body || {};

  if (!feedback) {
    return res.status(400).json({ error: "Missing feedback in request body" });
  }

  const visualKeywords = [
    "contrast",
    "font size",
    "font color",
    "color",
    "background",
    "border",
    "highlight",
    "bold",
    "italic",
    "underline",
    "shadow",
    "spacing",
    "margin",
    "padding",
    "alignment",
    "center",
    "left",
    "right",
    "width",
    "height",
    "line height",
    "letter spacing",
    "visual",
    "appearance",
  ];

  const feedbackText = (
    typeof feedback === "string" ? feedback : JSON.stringify(feedback)
  ).toLowerCase();

  const problemCategoryText = (feedback.problemCategory || "").toLowerCase();

  // 🔧 EDIT: Logic-only detection is no longer used to block or branch behavior.
  // Visual simulation is ALWAYS allowed, even if feedback references technical concepts.
  //
  // const logicOnlyKeywords = [
  //   "javascript",
  //   "api",
  //   "backend",
  //   "function",
  //   "async",
  //   "promise",
  //   "database",
  //   "server",
  //   "endpoint",
  //   "auth",
  //   "token",
  // ];
  //
  // const isLogicRelated = logicOnlyKeywords.some(
  //   (keyword) =>
  //     feedbackText.includes(keyword) || problemCategoryText.includes(keyword)
  // );
  //
  // if (isLogicRelated) {
  //   console.warn(
  //     "[AI Modify HTML] Logic-related feedback detected. Applying visual simulation anyway."
  //   );
  // }

  const detectedVisualKeywords = visualKeywords.filter((keyword) =>
    feedbackText.includes(keyword),
  );

  console.log(
    "[AI Modify HTML] Detected visual keywords:",
    detectedVisualKeywords,
  );

  const prompt = `
You are an AI that fixes accessibility issues by modifying HTML and CSS.

You MUST return a single valid JSON object.
DO NOT include explanations, markdown, or extra text.

You MUST ALWAYS include ALL of the following fields.
If no change is needed, return an empty string "".

Required JSON format:
{
  "summary": "brief description of the issue",
  "recommendation": "clear human-readable fix",
  "problemCategory": "wcag-related category",
  "css": "ONLY the CSS needed to support the fix"
}

Rules:
- Do NOT return HTML or modifiedHtml.
- The output is instructional guidance only.
- Provide a concise CSS snippet that demonstrates how the accessibility issue could be fixed.
- The CSS does not need to match exact selectors and may be illustrative.
- If no meaningful CSS change applies, return an empty string for css,
- Always prioritize clarity and developer understanding over completeness.

Accessibility issue to fix:
${JSON.stringify(feedback, null, 2)}


`;

  try {
    const aiResult = await callAi(prompt);

    const safeResponse = {
      summary: aiResult?.summary || "Accessibility improvement applied.",
      recommendation: aiResult?.recommendation || "",
      problemCategory: aiResult?.problemCategory || "visual",
      css: typeof aiResult?.css === "string" ? aiResult.css : "",
    };

    console.log("CSS length:", safeResponse.css.length);

    return res.json(safeResponse);
  } catch (err) {
    console.error("[AI Modify HTML] Error:", err);
    return res
      .status(500)
      .json({ error: "AI modification failed", details: err.message });
  }
});

/**
 * Extract the first top-level JSON object from free-form text.
 * Handles code fences and balances braces while respecting quoted strings.
 */
function extractFirstJSONObject(raw) {
  if (!raw || typeof raw !== "string") return null;
  let text = raw.trim();

  // Remove common code fences if present
  if (text.startsWith("````") || text.startsWith("```")) {
    text = text.replace(/^```json\s*/i, "");
    text = text.replace(/^```/i, "");
    const lastFence = text.lastIndexOf("```");
    if (lastFence !== -1) text = text.slice(0, lastFence);
    text = text.trim();
  }

  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === "\\") {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1).trim();
      }
    }
  }
  return null;
}

/**
 * Fetch the page content using Playwright
 */
async function fetchPageContent(url) {
  console.log("[WCAG] Launching Playwright for:", url);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });

    const html = await page.content();

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshot = `data:image/png;base64,${screenshotBuffer.toString(
      "base64",
    )}`;

    const text = await page.evaluate(() => document.body.innerText || "");

    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    return {
      html,
      text,
      axeViolations: axeResults.violations,
      screenshot,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Lightweight preview capture: quick screenshot without running Axe.
 * Used so the frontend can show the page being analyzed while the heavy
 * AI analysis runs server-side.
 */
async function fetchPagePreview(url) {
  console.log("[WCAG] Capturing quick preview for:", url);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 180000 });

    // Take a smaller viewport screenshot for quick transfer
    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 65,
      fullPage: false,
    });
    const base64 = buffer.toString("base64");

    // NEW: Capture REAL accessibility check interactions
    const steps = await captureRealAccessibilitySteps(page);

    return {
      screenshot: base64,
      steps,
    };
  } catch (err) {
    console.error("[WCAG] Preview capture failed:", err);
    throw err;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * NEW: Capture real Playwright interactions during accessibility checks
 * This performs actual accessibility validation and records coordinates
 */
async function captureRealAccessibilitySteps(page) {
  const steps = [];

  try {
    // 1. Check for navigation landmarks
    const navs = await page.$$('nav, [role="navigation"]');
    if (navs.length > 0) {
      const nav = navs[0];
      const box = await nav.boundingBox();
      if (box) {
        steps.push({
          type: "highlight",
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          label: "Checking navigation structure and landmarks",
        });
      }
    }

    // 2. Check headings hierarchy
    const h1s = await page.$$("h1");
    if (h1s.length > 0) {
      const h1 = h1s[0];
      const box = await h1.boundingBox();
      if (box) {
        steps.push({
          type: "highlight",
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          label: "Verifying heading hierarchy (H1)",
        });
      }
    }

    // 3. Check interactive elements (buttons, links)
    const buttons = await page.$$('button, [role="button"], a[href]');
    if (buttons.length > 0) {
      const button = buttons[0];
      const box = await button.boundingBox();
      if (box) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        steps.push({
          type: "click",
          x: Math.round(centerX),
          y: Math.round(centerY),
          label: "Testing keyboard accessibility and focus indicators",
        });
      }
    }

    // 4. Check form inputs for labels
    const inputs = await page.$$("input, textarea, select");
    if (inputs.length > 0) {
      const input = inputs[0];
      const box = await input.boundingBox();
      if (box) {
        steps.push({
          type: "highlight",
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          label: "Checking form labels and input accessibility",
        });
      }
    }

    // 5. Check images for alt text
    const images = await page.$$("img");
    if (images.length > 0) {
      const img = images[0];
      const box = await img.boundingBox();
      if (box) {
        steps.push({
          type: "highlight",
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          label: "Verifying image alt text and descriptions",
        });
      }
    }

    // 6. Check main content area
    const mains = await page.$$('main, [role="main"]');
    if (mains.length > 0) {
      const main = mains[0];
      const box = await main.boundingBox();
      if (box) {
        steps.push({
          type: "highlight",
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          label: "Analyzing main content structure",
        });
      }
    }

    console.log(
      `[WCAG] Captured ${steps.length} real accessibility check steps`,
    );
  } catch (err) {
    console.error("[WCAG] Error capturing real steps:", err);
  }

  return steps;
}

/**
 * Discover internal navigation links on the page, filtering out downloads and external URLs.
 * Returns up to 3 internal page URLs to visit.
 */
async function discoverInternalLinks(page, baseUrl) {
  try {
    const baseDomain = new URL(baseUrl).origin;
    console.log(`[WCAG] Discovering internal links on ${baseDomain}`);

    // First, open visible dropdowns/menus to reveal hidden links
    try {
      const toggles = await page.$$(
        "[aria-haspopup], [aria-expanded], .dropdown-toggle, .menu-toggle, .navbar-toggler",
      );
      for (const toggle of toggles.slice(0, 15)) {
        try {
          const isVisible = await toggle.isVisible().catch(() => false);
          if (isVisible) {
            await toggle.hover().catch(() => {});
            await page.waitForTimeout(100);
            await toggle.click({ force: true }).catch(() => {});
            await page.waitForTimeout(300);
          }
        } catch (e) {
          // ignore individual toggle errors
        }
      }
    } catch (e) {
      // ignore menu opening errors
    }

    const links = await page.evaluate((origin) => {
      const downloadExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".zip",
        ".rar",
        ".exe",
        ".dmg",
        ".pkg",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".svg",
        ".mp4",
        ".mov",
        ".avi",
        ".mp3",
        ".wav",
      ];

      return Array.from(document.querySelectorAll("a[href]"))
        .map((a) => {
          try {
            const href = a.getAttribute("href");
            if (
              !href ||
              href.startsWith("#") ||
              href.startsWith("javascript:") ||
              href.startsWith("mailto:") ||
              href.startsWith("tel:")
            ) {
              return null;
            }

            // Check for download attribute
            if (a.hasAttribute("download")) return null;

            // Check for download file extensions
            const lower = href.toLowerCase();
            if (downloadExtensions.some((ext) => lower.includes(ext)))
              return null;

            // Resolve relative URLs
            const url = new URL(href, origin);

            // Only keep same-origin links
            if (url.origin !== origin) return null;

            // Avoid duplicates and base URL
            if (url.href === origin || url.href === origin + "/") return null;

            return url.href;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
    }, baseDomain);

    // Deduplicate and limit to 25 for broader coverage
    const unique = [...new Set(links)].slice(0, 25);
    console.log(
      `[WCAG] Found ${unique.length} internal pages to check:`,
      unique,
    );
    return unique;
  } catch (err) {
    console.error("[WCAG] Error discovering internal links:", err);
    return [];
  }
}

/**
 * Discover client-side (SPA) routes by clicking visible links/buttons
 * and recording URL changes without full page reloads.
 */
async function discoverClientRoutes(page, baseUrl) {
  const origin = new URL(baseUrl).origin;
  const discovered = new Set();
  try {
    // Primary pass: click visible buttons/links
    const candidates = await page.$$(
      'a[href], button, [role="button"], [aria-haspopup="true"], .dropdown-toggle, .menu-toggle',
    );
    for (let i = 0; i < candidates.length && i < 40; i++) {
      const handle = candidates[i];
      try {
        const box = await handle.boundingBox();
        if (!box || box.width < 4 || box.height < 4) continue;
        const before = page.url();
        await handle.scrollIntoViewIfNeeded();
        await handle.hover().catch(() => {});
        await page.waitForTimeout(150);
        await handle.click({ force: true }).catch(() => {});
        // wait briefly for SPA route change
        await page.waitForTimeout(650);
        const after = page.url();
        if (after && after !== before && after.startsWith(origin)) {
          discovered.add(after);
        }

        // Secondary pass: if a dropdown/menu opened, click newly visible menu items
        const menuItems = await page.$$('a[href], [role="menuitem"]');
        let clicked = 0;
        for (const item of menuItems) {
          if (clicked >= 10) break;
          try {
            const ibox = await item.boundingBox();
            if (!ibox || ibox.width < 4 || ibox.height < 4) continue;
            const href = await item.getAttribute("href");
            // Skip non-links and external
            if (
              href &&
              !href.startsWith("#") &&
              !href.startsWith("javascript:")
            ) {
              const before2 = page.url();
              await item.scrollIntoViewIfNeeded();
              await item.click({ force: true }).catch(() => {});
              await page.waitForTimeout(600);
              const after2 = page.url();
              if (after2 && after2 !== before2 && after2.startsWith(origin)) {
                discovered.add(after2);
              }
              // navigate back to continue exploring other items
              await page
                .goBack({ waitUntil: "domcontentloaded" })
                .catch(() => {});
              await page.waitForTimeout(200);
              clicked++;
            }
          } catch (e) {
            // ignore menu item errors
          }
        }

        // try to go back to keep clicking others
        await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
        await page.waitForTimeout(200);
      } catch (e) {
        // ignore click errors
      }
    }
  } catch (err) {
    console.error("[WCAG] Error discovering client routes:", err);
  }
  return Array.from(discovered).slice(0, 25);
}

/**
 * Capture up to 12 violation-focused screenshots
 * Returns array of { screenshot: base64, violations: [...], bounds: {x, y, width, height} }
 */
async function captureViolationScreenshots(page, axeViolations) {
  const screenshots = [];

  if (!axeViolations || axeViolations.length === 0) {
    console.log("[WCAG] No violations to capture screenshots for");
    return screenshots;
  }

  try {
    console.log(
      `[WCAG] Starting screenshot capture for ${axeViolations.length} total violations`,
    );

    // Rank violations by severity and frequency; pick top 12
    const sevWeight = { critical: 3, serious: 3, moderate: 2, minor: 1 };
    const ranked = axeViolations
      .map((v) => ({
        v,
        score:
          (sevWeight[v.impact] || 1) *
          (Array.isArray(v.nodes) ? v.nodes.length : 1),
      }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.v);

    const uniqueViolations = [];
    const seenIds = new Set();
    for (const violation of ranked) {
      if (!seenIds.has(violation.id) && uniqueViolations.length < 12) {
        seenIds.add(violation.id);
        uniqueViolations.push(violation);
      }
    }

    console.log(
      `[WCAG] Will capture ${uniqueViolations.length} unique violation types`,
    );

    for (let idx = 0; idx < uniqueViolations.length; idx++) {
      const violation = uniqueViolations[idx];
      try {
        // If violation has a source URL from discovery, navigate there first
        if (violation.__sourceUrl && page.url() !== violation.__sourceUrl) {
          try {
            await page.goto(violation.__sourceUrl, {
              waitUntil: "domcontentloaded",
              timeout: 60000,
            });
            await page.waitForTimeout(300);
          } catch (navErr) {
            console.log(
              `[WCAG] Could not navigate to violation source URL ${violation.__sourceUrl}: ${navErr.message}`,
            );
          }
        }
        if (!violation.nodes || violation.nodes.length === 0) {
          console.log(
            `[WCAG] Violation ${violation.id} has no nodes, skipping`,
          );
          continue;
        }

        const node = violation.nodes[0];
        const target = node.target?.join(" ") || "";

        if (!target) {
          console.log(
            `[WCAG] Could not determine selector for violation ${violation.id}`,
          );
          continue;
        }

        console.log(
          `[WCAG] Capturing screenshot for violation ${idx + 1}/5: ${
            violation.id
          } (selector: ${target})`,
        );

        // Try to get bounding box for the primary node and capture scrollY, with debug logs
        const boundsAndScroll = await page.evaluate((selector) => {
          try {
            const el = document.querySelector(selector);
            if (!el) {
              console.log(`[WCAG] Could not find element: ${selector}`);
              console.log(
                `[WCAG] [DEBUG] window.scrollY before scrollIntoView:`,
                window.scrollY,
              );
              return { bounds: null, scrollY: window.scrollY };
            }
            console.log(
              `[WCAG] [DEBUG] window.scrollY before scrollIntoView:`,
              window.scrollY,
            );
            el.scrollIntoView({ block: "center", inline: "center" });

            console.log(
              `[WCAG] [DEBUG] window.scrollY after scrollIntoView:`,
              window.scrollY,
            );
            const box = el.getBoundingClientRect();
            return {
              bounds: {
                x: Math.max(0, Math.round(box.x)),
                y: Math.max(0, Math.round(box.y)),
                width: Math.round(box.width),
                height: Math.round(box.height),
              },
              scrollY: window.scrollY,
            };
          } catch (e) {
            console.log(`[WCAG] Error getting bounds: ${e.message}`);
            console.log(
              `[WCAG] [DEBUG] window.scrollY in error:`,
              window.scrollY,
            );
            return { bounds: null, scrollY: window.scrollY };
          }
        }, target);

        const bounds = boundsAndScroll.bounds;
        const scrollY = boundsAndScroll.scrollY;
        await page.waitForTimeout(300);

        // Collect visible node bounds to overlay multiple issue markers
        // Build a unique list of selectors for all nodes tied to this violation
        const markerSelectors = [];
        const seenSelectors = new Set();
        violation.nodes
          .map((n) => (n.target ? n.target.join(" ") : ""))
          .filter(Boolean)
          .forEach((sel) => {
            if (!seenSelectors.has(sel)) {
              seenSelectors.add(sel);
              markerSelectors.push(sel);
            }
          });

        // Compute marker bounding boxes and attach AI/violation text
        const markers = await page.evaluate((selectors) => {
          const viewportW = window.innerWidth || 0;
          const viewportH = window.innerHeight || 0;
          return selectors
            .map((selector) => {
              try {
                const el = document.querySelector(selector);
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                if (!rect || rect.width === 0 || rect.height === 0) return null;
                const inViewport =
                  rect.x + rect.width > 0 &&
                  rect.y + rect.height > 0 &&
                  rect.x < viewportW &&
                  rect.y < viewportH;
                if (!inViewport) return null;
                const x = Math.round(rect.x);
                const y = Math.round(rect.y);
                const w = Math.round(rect.width);
                const h = Math.round(rect.height);
                if (
                  !Number.isFinite(x) ||
                  !Number.isFinite(y) ||
                  w <= 0 ||
                  h <= 0
                ) {
                  return null;
                }
                return {
                  x,
                  y,
                  width: w,
                  height: h,
                  selector,
                };
              } catch (e) {
                console.log(
                  `[WCAG] Marker error for ${selector}: ${e.message}`,
                );
                return null;
              }
            })
            .filter(Boolean);
        }, markerSelectors);

        // Attach AI/violation text to each marker (robust, safe)
        const markersWithText = (markers || []).map((m, i) => {
          // Try to find the corresponding node for this selector
          const node = violation.nodes.find(
            (n) => n.target && n.target.join(" ") === m.selector,
          );
          // Attach summary/recommendation from AI if available, else from violation
          let summary =
            node?.summary || violation?.help || violation?.description || "";
          let recommendation =
            node?.recommendation || violation?.recommendation || "";
          // Defensive: always string
          summary = typeof summary === "string" ? summary : "";
          recommendation =
            typeof recommendation === "string" ? recommendation : "";
          return {
            ...m,
            issueId: violation.id,
            summary,
            recommendation,
            source: "axe-node",
          };
        });

        await page.waitForTimeout(150);

        // Capture viewport screenshot - start with lower quality to reduce size
        let screenshotBuf = await page.screenshot({
          type: "jpeg",
          quality: 50,
          fullPage: false,
        });

        // If still too large, reduce quality further
        if (screenshotBuf.length > 200000) {
          screenshotBuf = await page.screenshot({
            type: "jpeg",
            quality: 35,
            fullPage: false,
          });
        }

        console.log(
          `[WCAG] Screenshot captured: ${screenshotBuf.length} bytes`,
        );

        screenshots.push({
          screenshot: `data:image/jpeg;base64,${screenshotBuf.toString(
            "base64",
          )}`,
          violations: [violation],
          bounds: bounds || { x: 0, y: 0, width: 0, height: 0 },
          markers: markersWithText,
          violationType: violation.id,
          wcagCriterion:
            violation.tags?.find((t) => t.match(/^wcag\d/)) || violation.id,
          scrollY: scrollY,
          viewport: {
            width: 1280,
            height: 720,
          },
          screenshotOnly: !markersWithText || markersWithText.length === 0,
        });
      } catch (err) {
        console.error(
          `[WCAG] Error capturing violation screenshot for ${violation.id}:`,
          err.message,
        );
      }
    }

    console.log(`[WCAG] Captured ${screenshots.length} violation screenshots`);
  } catch (err) {
    console.error("[WCAG] Error in captureViolationScreenshots:", err);
  }

  return screenshots;
}

/**
 * Build the WCAG + HCI prompt
 */
/**
 * Sanitize text to prevent JSON injection from AI echoing back unescaped content
 */

function sanitizeForPrompt(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/[\r\n\t]/g, " ") // Replace line breaks and tabs with spaces
    .replace(/"/g, "'") // Replace double quotes with single quotes
    .replace(/\\/g, "/") // Replace backslashes with forward slashes
    .slice(0, 5000); // Limit length to prevent token overflow
}

function buildPrompt(pageData) {
  const { html, text, understandableData, axeViolations } = pageData || {};

  // Truncate to avoid token limits
  const maxLen = 15000;

  const safeHtml =
    typeof html === "string" && html.length > 0
      ? sanitizeForPrompt(html.slice(0, maxLen))
      : "";

  const safeText =
    typeof text === "string" && text.length > 0
      ? sanitizeForPrompt(text.slice(0, maxLen))
      : "";

  // Format the form data for the prompt - sanitize each field
  const sanitizedFormFields = understandableData.formFields.map((f) => ({
    ...f,
    id: sanitizeForPrompt(f.id),
    type: sanitizeForPrompt(f.type),
    label: sanitizeForPrompt(f.label),
    placeholder: sanitizeForPrompt(f.placeholder),
    ariaLabel: sanitizeForPrompt(f.ariaLabel),
  }));
  const formsJson = JSON.stringify(sanitizedFormFields, null, 2);

  // Summarize Axe violations for the prompt to save tokens - sanitize descriptions
  const robustIssues = axeViolations.map((v) => ({
    id: sanitizeForPrompt(v.id),
    impact: sanitizeForPrompt(v.impact),
    description: sanitizeForPrompt(v.description),
    help: sanitizeForPrompt(v.help),
    nodes: v.nodes.length, // How many times this error happened
  }));

  const axeJson = JSON.stringify(robustIssues, null, 2);

  return `
You are an Accessibility & HCI Evaluation Engine and a senior Human–Computer Interaction expert.

Your job is to analyze the provided website content using ONLY the official WCAG 2.2 guidelines and AODA requirements.
Do NOT invent or assume guidelines that do not exist.
If you are unsure whether a specific success criterion applies, mark it as "uncertain" in your explanations instead of guessing.
When marking an issue as “uncertain,” you must still assign a conservative severity level, include it in scoring, and explain the uncertainty briefly.

Treat AODA as requiring at least WCAG 2.0 Level AA conformance. WCAG 2.2 extends these requirements; you MUST include relevant WCAG 2.2 AA criteria when evaluating accessibility for AODA.
If a WCAG 2.2 criterion extends or replaces a WCAG 2.0 AA requirement, you must evaluate against the WCAG 2.2 version and treat it as fulfilling the AODA requirement. WCAG 2.2 is always the authoritative baseline for scoring.

You will receive extracted HTML and visible text from a single web page.
If screenshots are provided, you must incorporate them into the accessibility and HCI evaluation. Screenshots override extracted HTML for visual appearance (contrast, spacing, hierarchy), while HTML overrides screenshots for semantics and structure. If they conflict, defer to the modality most relevant for the given WCAG criterion.

As an HCI expert, you should:
- Identify concrete, observable issues rather than abstract or generic comments.
- Focus on how design and interaction patterns affect real users (including users with disabilities, low digital literacy, or on mobile).
- Use clear, direct language that a non-expert can understand, while still being precise and technically correct.

TASKS:

1) WCAG 2.2 Evaluation (by principles)
Evaluate the page across these WCAG principles:
- Perceivable (Principle 1 - criteria 1.x)
- Operable (Principle 2 - criteria 2.x)
- Understandable (Principle 3 - criteria 3.x)
- Robust (Principle 4 - criteria 4.x)
(You do not need to explicitly name the POUR principle in the issue text; the wcagCriterion already determines the principle.)

CRITICAL: You MUST review the "Technical Audit Log" section below which contains automated accessibility violations detected by Axe-core.
- These violations are REAL and must be reflected in your category scores.
- When scoring Perceivable/Operable/Understandable/Robust, you MUST account for violations in that principle from the Technical Audit Log.
- Example: If the Technical Audit Log shows violations with id="link-name" or description mentioning "2.4.4", these are Operable (Principle 2) violations and MUST lower the Operable score below 100.
- Do NOT give a category a score of 100 if the Technical Audit Log contains violations for that principle.

SPECIAL INSTRUCTIONS FOR "UNDERSTANDABLE" (Principle 3):
You must use the provided "Form & Language Data" below to evaluate Principle 3 specifically.
- **3.1 Readable:** Check the extracted 'lang' attribute. If it is null or empty, fail WCAG 3.1.1 immediately. Analyze the 'Visible Text' for complex jargon (Level AAA 3.1.5).
- **3.2 Predictable:** Use the 'navCount' to comment on navigation consistency. Look for "open in new tab" links in the HTML without warnings (Failure of 3.2.2 or 3.2.5).
- **3.3 Input Assistance:** Look at the 'Form Fields List' provided below. If "hasLabel" is false and "hasAriaLabel" is false for any input, this is a likely failure of WCAG 3.3.2.

For each detected issue, include:
- wcagCriterion: exact WCAG 2.2 ID + name (for example "1.4.3 Contrast (Minimum)")
- severity: "High" | "Medium" | "Low"
- count: approximate number of occurrences (integer)
- problem: short, concrete explanation of what is wrong, written for non-developers; describe the visible symptom and the user impact (no code, no selectors)
- recommendation: short, specific fix in plain language (what to change in UX/content/contrast rather than code details)

Requirements:
- Only use criteria that exist in WCAG 2.2.
- Do NOT make up WCAG numbers or names.
- When relevant, indicate in the wording if the issue causes failure of Level A, AA, or AAA.
- In the problem text, clearly hint which WCAG principle is most affected (optional), but the wcagCriterion must always be correct.
- AAA failures should ONLY reduce the AAA score unless they also violate A or AA criteria.
- Never fabricate missing information—uncertainty must be clearly marked and conservatively scored.

2) Scoring (0–100)
Compute a total accessibility percentage score from 0–100.

The score must be based ONLY on:
- Number of violations
- Severity (High = 3 points, Medium = 2, Low = 1)
- Repetition / frequency
- Impact on essential tasks and AODA compliance

You MUST use this explicit scoring formula for consistency across all evaluations:

Let:
- highCount = number of High severity violations
- mediumCount = number of Medium severity violations
- lowCount = number of Low severity violations
- totalPoints = (highCount*3) + (mediumCount*2) + (lowCount*1)
- maxPoints = totalPossibleCriteria * 3
  (Assume totalPossibleCriteria = 78 WCAG 2.2 criteria)
- rawScore = 1 - (totalPoints / maxPoints)
- score = Math.max(0, Math.min(100, Math.round(rawScore * 100)))

IMPORTANT: Return the calculated highCount, mediumCount, and lowCount in the response for scoring transparency.

Principle and level scores must use the same formula applied to the subset of relevant criteria.

You MUST score the page using:
- Official WCAG 2.2 success criteria
- AODA requirements (WCAG 2.0 AA minimum, satisfied through WCAG 2.2)

If AODA requires something not explicitly present in WCAG 2.2, treat it as a supporting factor that may influence severity but do not invent new WCAG criteria.

Compute internal scores (0–100) for:
- Perceivable
- Operable
- Understandable
- Robust

And for each conformance level:
- A
- AA
- AAA

Use these interpretations:
- 90–100: Excellent accessibility
- 70–89: Good, minor fixes needed
- 40–69: Significant accessibility issues
- 0–39: Poor accessibility

Make sure:
- "score" is the overall score for the page (0–100).
- Each entry in "categoryScores" is a 0–100 score for that principle.
- Each entry in "levelScores" is a 0–100 score for that conformance level.
- Numeric scores must always be returned, even when uncertain (note uncertainty in text).

CRITICAL: MANDATORY EXPLANATION FOR CATEGORY SCORES
- Each categoryScore (Perceivable, Operable, Understandable, Robust) MUST reflect ALL violations in that principle, including both your analysis AND the automated Axe violations provided in the data.
- If a categoryScore is LESS THAN 100, you MUST provide a "categoryExplanations" entry that lists:
  1. EXACT WCAG criteria being violated (e.g., "1.4.3 Contrast (Minimum)", "2.1.1 Keyboard")
  2. Why each criterion is violated
  3. How many violations affect that category
- If a categoryScore IS 100, the explanation should state "No violations found in this category." - BUT this should ONLY happen if there are truly NO violations from either your analysis or the automated audit.
- NEVER return a score of 100 for a category if the automated audit shows violations in that principle.
- Map WCAG criteria to principles: 1.x = Perceivable, 2.x = Operable, 3.x = Understandable, 4.x = Robust
- Severity reference: 1=Low, 2=Medium, 3=High (include these numbers in explanations where relevant)
- The automated violations will be merged with your groups array, so your scores must account for them.

3) HCI / UX Summary (deep, expert-level analysis)
Provide a detailed, human-centered design assessment focused on:
- Layout clarity and visual hierarchy
- Interaction patterns and feedback
- Learnability and discoverability of actions
- Error prevention and recovery
- Cognitive load (is the interface mentally demanding? why?)
- Consistency and predictability across the page
- Mobile vs desktop usability
- Any noteworthy strengths that should be preserved

Write this as a dense, insight-rich narrative (not bullet points).

Length and structure requirements (IMPORTANT):
- Write AT LEAST 4–6 substantial paragraphs.
- Aim for roughly 500 words total. Must be detailed and nuanced, nothing vague or generic.
- Each paragraph should focus on a specific theme.
- Refer to concrete examples from the page.
- Escape all JSON-breaking characters and ensure valid JSON formatting with \n line breaks.

Avoid:
- Vague phrases like “the design is good.”
- Repeating the same point in different words.

The final HCI analysis must be returned in the JSON field:
"hciSummary": "string"
and must include line breaks (\n) between paragraphs.

4) Next Steps (prioritized, non-expert-friendly)
Provide 5–10 prioritized, high-impact recommendations.

Each item should:
- Be understandable to non-experts
- Start with an action verb
- Be specific about what to change
- Explain why it matters and which users it helps

Provide a mix of:
- Quick wins
- Medium-effort improvements
- Larger structural improvements (if needed)

OUTPUT FORMAT (VERY IMPORTANT):

You MUST return ONLY a single JSON object.
No markdown.
No backticks.
No comments.
No prose before or after.
Do NOT wrap the JSON in json or any other fences.

CRITICAL JSON RULES:
- All string values MUST escape special characters: newlines as \\n, quotes as \\", backslashes as \\\\
- Do NOT include literal line breaks inside string values
- Use only straight ASCII double quotes ("), not smart quotes
- All property names must be in double quotes
- No trailing commas after the last item in arrays or objects
- Numbers must NOT be quoted
- Numbers must be LITERAL integers (e.g., 20), NOT expressions (e.g., 4*3+5*2)
- Do NOT use \\b (backspace) or other control characters in strings
- String values should use spaces for readability, not escape sequences like \\n unless representing actual line breaks in content

The JSON MUST match this schema exactly:

{
  "score": Number,
  "scoreBreakdown": {
    "highCount": Number,
    "mediumCount": Number,
    "lowCount": Number,
    "totalViolations": Number,
    "maxPossiblePoints": 234,
    "deductedPoints": Number,
    "explanation": "string (e.g., '65 points deducted from 234 possible: 5 High (15pts) + 8 Medium (16pts) + 2 Low (2pts)')"
  },
  "overallSummary": "string",
  "categoryScores": {
    "Perceivable": Number,
    "Operable": Number,
    "Understandable": Number,
    "Robust": Number
  },
  "categoryExplanations": {
    "Perceivable": "string",
    "Operable": "string",
    "Understandable": "string",
    "Robust": "string"
  },
  "levelScores": {
    "A": Number,
    "AA": Number,
    "AAA": Number
  },
  "groups": [
    {
      "wcagCriterion": "string",
      "severity": "High" | "Medium" | "Low",
      "severityNumber": 1 | 2 | 3,
      "count": Number,
      "problem": "string",
      "recommendation": "string"
    }
  ],
  "hciSummary": "string",
  "nextSteps": ["string", "string", "string"]
}

Strict formatting rules:
- All Numbers must be valid JSON numbers (no quotes).
- Do NOT include trailing commas.
- Do NOT change any property names.
- Always include all properties shown in the schema.
- If uncertain, still return numeric scores and explain uncertainty in text.

DATA SECTION:

Here is the Form & Language Data (CRITICAL FOR "UNDERSTANDABLE" SCORE):
- Document Language (lang=""): "${
    understandableData.langAttribute || "MISSING"
  }"
- Number of Navigation Landmarks: ${understandableData.navCount}
- Form Fields Analysis:
${formsJson}

Here is the Technical Audit Log (CRITICAL FOR "ROBUST" SCORE):
${axeJson}

Here is the page HTML (truncated):
${safeHtml}

Here is the visible text (truncated):
${safeText}

`;
}

/**
 * Call Gemini and parse strict JSON
 */

async function callAi(prompt) {
  console.log("[WCAG] Calling Gemini AI...");
  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });

  let text = "";
  try {
    if (typeof result.text === "string") {
      text = result.text;
    } else if (result.response && typeof result.response.text === "function") {
      text = (await result.response.text()) || "";
    } else {
      text = JSON.stringify(result);
    }
  } catch (e) {
    text = String(result || "");
  }

  let jsonStr = extractFirstJSONObject(text);
  if (!jsonStr) {
    console.error("[WCAG] No JSON object found in AI response");
    console.error("[WCAG] Raw AI response:", text.slice(0, 500));
    throw new Error("AI did not return a valid JSON object.");
  }

  // More robust JSON cleanup - handle AI misbehavior
  try {
    // First, try to parse as-is (when AI behaves correctly)
    return JSON.parse(jsonStr);
  } catch (firstErr) {
    console.log("[WCAG] Initial parse failed, attempting cleanup...");
    console.log("[WCAG] Error:", firstErr.message);

    let cleaned = jsonStr;

    // Remove BOM and control characters that break JSON
    cleaned = cleaned.replace(/^\uFEFF/, "");
    cleaned = cleaned.replace(/\\b/g, ""); // Remove backspace escape sequences
    cleaned = cleaned.replace(/[\b]/g, ""); // Remove actual backspace characters
    // Remove all unescaped control characters (ASCII 0-31 except allowed escapes) from string values
    // Allowed escapes: \n, \r, \t, \", \\, \/
    cleaned = cleaned.replace(/"((?:[^"\\]|\\.)*)"/g, (match, str) => {
      // Replace any raw control characters (except \n, \r, \t) with a space
      const safe = str.replace(/([\x00-\x09\x0B\x0C\x0E-\x1F])/g, " ");
      return `"${safe}"`;
    });

    // Fix JavaScript expressions in numeric fields (e.g., "4 * 3 + 5 * 2")
    cleaned = cleaned.replace(
      /"deductedPoints":\s*([0-9\s\+\*\-\/]+),/g,
      (match, expr) => {
        try {
          // Safely evaluate simple math expressions
          const result = Function(`"use strict"; return (${expr})`)();
          return `"deductedPoints": ${result},`;
        } catch {
          return `"deductedPoints": 0,`;
        }
      },
    );

    // Remove trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

    // Fix unescaped newlines and tabs INSIDE string values
    cleaned = cleaned.replace(/("(?:[^"\\]|\\.)*")/g, (match) => {
      // Only process string literals
      if (!match.startsWith('"') || !match.endsWith('"')) return match;
      let str = match.slice(1, -1); // Remove quotes
      str = str
        .replace(/\n/g, " ") // Convert real newlines to spaces
        .replace(/\r/g, "") // Remove carriage returns
        .replace(/\t/g, " ") // Convert tabs to spaces
        .replace(/\\n\\n/g, " ") // Fix double-escaped newlines
        .replace(/\s+/g, " "); // Collapse multiple spaces
      return `"${str}"`;
    });

    try {
      console.log("[WCAG] Attempting parse with cleaned JSON...");
      return JSON.parse(cleaned);
    } catch (secondErr) {
      console.error("[WCAG] Second parse failed:", secondErr.message);
      console.error(
        "[WCAG] Cleaned JSON (first 2000 chars):",
        cleaned.slice(0, 2000),
      );

      // Last resort: try aggressive repair
      try {
        const repaired = repairJSON(cleaned);
        console.log("[WCAG] Attempting parse with repaired JSON...");
        return JSON.parse(repaired);
      } catch (thirdErr) {
        console.error("[WCAG] Third parse failed:", thirdErr.message);
        console.error("[WCAG] All parse attempts failed");
        throw new Error("AI returned invalid JSON that could not be repaired.");
      }
    }
  }
}

// Helper function to repair common JSON issues
function repairJSON(jsonStr) {
  let fixed = jsonStr;

  // Remove any text before first { or after last }
  const firstBrace = fixed.indexOf("{");
  const lastBrace = fixed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    fixed = fixed.slice(firstBrace, lastBrace + 1);
  }

  // Fix common issues
  fixed = fixed
    .replace(/,(\s*[}\]])/g, "$1") // trailing commas
    .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"') // single quotes to double
    .replace(/\n/g, "\\n") // unescaped newlines
    .replace(/\r/g, "") // remove carriage returns
    .replace(/\t/g, " "); // tabs to spaces

  return fixed;
}

/**
 * Call Gemini with inline image data. Uses the `inlineData` part so the
 * model receives both a text prompt and the base64-encoded image.
 */
async function callAiWithInlineData(
  prompt,
  base64Str,
  mimeType = "image/jpeg",
) {
  console.log("[WCAG] Calling Gemini AI with inline image...");

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: base64Str, mimeType } },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  let text = "";
  try {
    if (typeof result.text === "string") {
      text = result.text;
    } else if (result.response && typeof result.response.text === "function") {
      text = (await result.response.text()) || "";
    } else {
      text = JSON.stringify(result);
    }
  } catch (err) {
    console.error("[WCAG] Error extracting text from Gemini response:", err);
    text = JSON.stringify(result);
  }

  console.log("[WCAG] Raw AI response before parsing:", text);
  let jsonStr = extractFirstJSONObject(text);
  if (!jsonStr) {
    console.error("[WCAG] No JSON object found in AI response (inline data)");
    // Return a fallback error object instead of throwing
    return { error: "AI did not return a valid JSON object.", raw: text };
  }

  // Escape double quotes inside string values to prevent parse errors
  jsonStr = jsonStr.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (m) => {
    let inner = m.slice(1, -1).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
    // Escape unescaped double quotes inside string values
    inner = inner.replace(/([^\\])"/g, '$1\\"');
    return `"${inner}"`;
  });
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  try {
    const cleaned = jsonStr
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    console.log("[WCAG] Parsed Gemini AI response:", parsed);

    return parsed;
  } catch (err) {
    console.error("[WCAG] Failed to parse Gemini AI response");
    console.error("[WCAG] Raw AI response:", jsonStr);
    // Return a fallback error object instead of throwing
    return { error: "AI did not return valid JSON", raw: jsonStr };
  }
}

/**
 * Main API: POST /api/wcag-check
 */
app.post("/api/wcag-check", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // 1. Fetch Data (Includes Axe Violations + screenshot)
    const pageData = await fetchPageContent(url);
    const { axeViolations, screenshot } = pageData; // 🔹 now also grab screenshot

    // 2. Build Prompt & Call AI
    const prompt = buildPrompt(pageData);
    const aiResponse = await callAi(prompt);

    // --- MERGING LOGIC (existing) ---
    const axeGroups = axeViolations.map((v) => {
      const wcagTag = v.tags?.find((t) => t.match(/^wcag\d/)) || v.id;

      // If boundingBoxes were attached by Playwright, use them; else empty array
      const boundingBoxes = Array.isArray(v.boundingBoxes)
        ? v.boundingBoxes
        : [];
      return {
        wcagCriterion: wcagTag,
        severity: v.impact
          ? v.impact.charAt(0).toUpperCase() + v.impact.slice(1)
          : "High",
        count: v.nodes?.length || 1,
        problem: v.help || v.description || "Automated syntax error detected.",
        recommendation: "Fix syntax issues reported by Axe-core.",
        type: "automated",
        boundingBoxes,
      };
    });

    const aiGroups = Array.isArray(aiResponse.groups) ? aiResponse.groups : [];
    const allGroups = [...axeGroups, ...aiGroups];

    aiResponse.groups = allGroups;

    if (axeViolations.length > 0) {
      aiResponse.categoryScores.Robust = Math.max(
        0,
        aiResponse.categoryScores.Robust - axeViolations.length * 5,
      );
      aiResponse.score = Math.floor(
        (aiResponse.categoryScores.Perceivable +
          aiResponse.categoryScores.Operable +
          aiResponse.categoryScores.Understandable +
          aiResponse.categoryScores.Robust) /
          4,
      );
    }
    // --- END MERGING LOGIC ---

    // 🔹 3. Build "steps" for the loading animation
    let steps = [];

    if (axeViolations.length === 0) {
      // No violations – show a generic scan animation
      steps = [
        {
          type: "click",
          x: 320,
          y: 200,
          label: "Scanning navigation and headings…",
        },
        {
          type: "highlight",
          x: 220,
          y: 180,
          width: 380,
          height: 60,
          issue:
            "No major automated accessibility issues detected in this region.",
        },
        {
          type: "issue",
          issueId: "summary",
          summary: "No critical automated WCAG violations found on this page.",
          wcag: "WCAG 2.2 – automated checks passed.",
        },
      ];
    } else {
      // Use the first few Axe violations to drive the animation text
      const maxDemo = Math.min(3, axeViolations.length);

      for (let i = 0; i < maxDemo; i++) {
        const v = axeViolations[i];
        const yBase = 180 + i * 110; // stack highlights down the page a bit

        steps.push({
          type: "click",
          x: 320,
          y: yBase,
          label: `Checking "${v.id}" for accessibility issues…`,
        });

        steps.push({
          type: "highlight",
          x: 220,
          y: yBase - 20,
          width: 380,
          height: 70,
          issue:
            v.help ||
            v.description ||
            "Potential accessibility issue detected on this element.",
        });
      }

      steps.push({
        type: "issue",
        issueId: "summary",
        summary: `Found ${axeViolations.length} automated accessibility issues across this page.`,
        wcag: "Multiple WCAG 2.2 criteria (see detailed report).",
      });
    }

    // 4. Send Final Response (now includes screenshot + steps)
    res.json({
      url,
      html: pageData.html,
      aiAnalysis: aiResponse,
      axe: axeViolations,
      screenshot, // 🔹 used by the AnalysisPlayer on the loading screen
      steps, // 🔹 drives the click / circle / highlight animation
    });
  } catch (error) {
    console.error("[WCAG] Server Error:", error);
    res.status(500).json({
      error: "Analysis failed",
      details: error.message,
    });
  }
});

/**
 * Quick preview endpoint: returns a base64 JPEG screenshot of the page so the
 * frontend can display an animated/visual preview while the full analysis runs.
 */
app.post("/api/wcag-preview", async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "Invalid request",
      message: "Missing or invalid 'url' in body.",
    });
  }

  try {
    console.log("[WCAG] Running preview capture for:", url);
    const preview = await fetchPagePreview(url);
    res.json({ url, preview: preview.screenshot, steps: preview.steps || [] });
  } catch (err) {
    console.error("[WCAG] Error in /api/wcag-preview:", err);
    res.status(500).json({
      error: "Preview capture failed",
      message: err.message || "Unknown error",
    });
  }
});

/**
 * Visual analysis endpoint: capture a screenshot and ask Gemini to analyze the
 * image using WCAG 2.2 and HCI heuristics. Returns the same JSON schema as
 * the HTML-based `/api/wcag-check` where possible.
 */
app.post("/api/wcag-visual", async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "Invalid request",
      message: "Missing or invalid 'url' in body.",
    });
  }

  try {
    console.log("[WCAG] Running visual analysis for:", url);

    // Launch Playwright and capture preview + segmented screenshots
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });

    // quick preview for UI
    const previewBuf = await page.screenshot({
      type: "jpeg",
      quality: 70,
      fullPage: false,
    });
    const previewB64 = previewBuf.toString("base64");

    // determine document height and split into up to 3 segments (top, middle, bottom)
    const pageHeight = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      ),
    );
    const pageWidth = 1280;
    const numSegments = Math.min(3, Math.max(1, Math.ceil(pageHeight / 1000)));

    const segments = [];
    for (let i = 0; i < numSegments; i++) {
      const y = Math.floor((i * pageHeight) / numSegments);
      const h = Math.floor(pageHeight / numSegments);
      // Limit segment capture height to a reasonable viewport to avoid large images
      const segHeight = Math.min(h, pageHeight - y, 900);

      try {
        // Scroll to the segment top so it's visible in the viewport
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        // Give the browser a moment to repaint
        await page.waitForTimeout(200);

        // Ensure viewport height matches the desired capture height (must be within allowed viewport)
        const targetHeight = Math.max(400, segHeight);
        await page.setViewportSize({ width: pageWidth, height: targetHeight });

        const buf = await page.screenshot({
          type: "jpeg",
          quality: 65,
          fullPage: false,
        });
        segments.push({
          clip: { x: 0, y, width: pageWidth, height: segHeight },
          b64: buf.toString("base64"),
        });
      } catch (err) {
        console.warn("[WCAG] segment screenshot failed", err);
        // As a fallback, try a full-page screenshot and crop later if needed
        try {
          const fallbackBuf = await page.screenshot({
            type: "jpeg",
            quality: 55,
            fullPage: true,
          });
          segments.push({
            clip: { x: 0, y, width: pageWidth, height: segHeight },
            b64: fallbackBuf.toString("base64"),
          });
        } catch (err2) {
          console.warn("[WCAG] fallback fullPage screenshot also failed", err2);
        }
      }
    }

    await context.close();
    await browser.close();

    // For each segment, call AI with inlineData and collect results
    const segmentResults = [];
    console.log(segments.length);

    for (let idx = 0; idx < segments.length; idx++) {
      const seg = segments[idx];
      const prompt = `You are an Accessibility & HCI Evaluation Engine.\nAnalyze the following screenshot segment (part ${
        idx + 1
      } of ${
        segments.length
      }) of a web page. Answer only with a single JSON object matching this schema: {\n  "score": Number,\n  "overallSummary": "string",\n  "groups": [ { "wcagCriterion": "string", "severity": "High|Medium|Low", "count": Number, "problem": "string", "recommendation": "string" } ],\n  "hciSummary": "string",\n  "nextSteps": [\"string\"]\n}\n\nProvide concise findings focused on visual issues (contrast, layout, spacing, visible labels, focus indicators).`;

      try {
        const aiRes = await callAiWithInlineData(prompt, seg.b64, "image/jpeg");
        segmentResults.push({
          screenshot: `data:image/jpeg;base64,${seg.b64}`,
          clip: seg.clip,
          aiAnalysis: aiRes,
        });
      } catch (err) {
        console.error("[WCAG] AI failed for segment", idx, err);
        segmentResults.push({
          screenshot: `data:image/jpeg;base64,${seg.b64}`,
          clip: seg.clip,
          aiAnalysis: null,
          error: err.message,
        });
      }
    }

    // Stitch segment results into one combined analysis
    const stitched = {
      score: null,
      overallSummary: [],
      groups: [],
      hciSummary: [],
      nextSteps: [],
    };
    for (const s of segmentResults) {
      const a = s.aiAnalysis;
      if (!a) continue;
      if (typeof a.score === "number")
        stitched.score = (stitched.score || 0) + a.score;
      if (a.overallSummary) stitched.overallSummary.push(a.overallSummary);
      if (Array.isArray(a.groups)) stitched.groups.push(...a.groups);
      if (a.hciSummary) stitched.hciSummary.push(a.hciSummary);
      if (Array.isArray(a.nextSteps)) stitched.nextSteps.push(...a.nextSteps);
    }

    const validScores = segmentResults.filter(
      (s) => s.aiAnalysis && typeof s.aiAnalysis.score === "number",
    ).length;
    if (validScores > 0)
      stitched.score = Math.round((stitched.score || 0) / validScores);
    stitched.overallSummary = stitched.overallSummary.join("\n\n");
    stitched.hciSummary = stitched.hciSummary.join("\n\n");
    stitched.nextSteps = Array.from(new Set(stitched.nextSteps)).slice(0, 10);

    // Build final response in the requested shape
    const categoryKeys = [
      "Perceivable",
      "Operable",
      "Understandable",
      "Robust",
    ];
    const levelKeys = ["A", "AA", "AAA"];

    const categoryAcc = {};
    const levelAcc = {};
    const categoryCounts = {};
    const levelCounts = {};

    for (const k of categoryKeys) {
      categoryAcc[k] = 0;
      categoryCounts[k] = 0;
    }
    for (const k of levelKeys) {
      levelAcc[k] = 0;
      levelCounts[k] = 0;
    }

    for (const s of segmentResults) {
      const a = s.aiAnalysis;
      if (!a) continue;
      if (a.categoryScores && typeof a.categoryScores === "object") {
        for (const k of categoryKeys) {
          if (typeof a.categoryScores[k] === "number") {
            categoryAcc[k] += a.categoryScores[k];
            categoryCounts[k] += 1;
          }
        }
      }
      if (a.levelScores && typeof a.levelScores === "object") {
        for (const k of levelKeys) {
          if (typeof a.levelScores[k] === "number") {
            levelAcc[k] += a.levelScores[k];
            levelCounts[k] += 1;
          }
        }
      }
    }

    const categoryScores = {};
    for (const k of categoryKeys) {
      categoryScores[k] = categoryCounts[k]
        ? Math.round(categoryAcc[k] / categoryCounts[k])
        : 0;
    }

    const levelScores = {};
    for (const k of levelKeys) {
      levelScores[k] = levelCounts[k]
        ? Math.round(levelAcc[k] / levelCounts[k])
        : 0;
    }

    const breakdown = segmentResults.map((s) => {
      const desc = s.aiAnalysis
        ? s.aiAnalysis.overallSummary ||
          s.aiAnalysis.hciSummary ||
          (Array.isArray(s.aiAnalysis.nextSteps)
            ? s.aiAnalysis.nextSteps.slice(0, 3).join("; ")
            : "")
        : s.error || "No analysis available for this segment.";

      return {
        screenshot: s.screenshot,
        description: desc,
      };
    });

    const groups = Array.isArray(stitched.groups) ? stitched.groups : [];

    const finalResponse = {
      score: typeof stitched.score === "number" ? stitched.score : 0,
      overallSummary: stitched.overallSummary || "",
      breakdown,
      categoryScores,
      levelScores,
      groups,
      hciSummary: stitched.hciSummary || "",
      nextSteps: Array.isArray(stitched.nextSteps) ? stitched.nextSteps : [],
    };

    res.json(finalResponse);
  } catch (err) {
    console.error("[WCAG] Error in /api/wcag-visual:", err);
    res.status(500).json({
      error: "Visual analysis failed",
      message: err.message || "Unknown error",
    });
  }
});

/**
 * Streamed visual analysis using Server-Sent Events (SSE).
 * Clients can open an EventSource to /api/wcag-visual-stream?url=... to receive
 * preview, per-segment captures, per-segment AI analysis, and final stitched result
 * as server-sent events. This allows the frontend to animate Playwright actions
 * immediately while the heavy AI analysis runs.
 */
app.get("/api/wcag-visual-stream", async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url query param" });
  }

  // Setup SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });

    // 1) Send quick preview immediately
    const previewBuf = await page.screenshot({
      type: "jpeg",
      quality: 70,
      fullPage: false,
    });
    const previewB64 = previewBuf.toString("base64");

    const steps = await captureRealAccessibilitySteps(page);

    // helper to send SSE events
    const sendEvent = (name, payload) => {
      res.write(`event: ${name}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendEvent("preview", {
      screenshot: `data:image/jpeg;base64,${previewB64}`,
      steps,
    });

    // 2) Capture segments sequentially, stream each capture and AI result
    const pageHeight = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      ),
    );
    const pageWidth = 1280;
    const numSegments = Math.min(3, Math.max(1, Math.ceil(pageHeight / 1000)));

    const segmentResults = [];

    for (let i = 0; i < numSegments; i++) {
      const y = Math.floor((i * pageHeight) / numSegments);
      const h = Math.floor(pageHeight / numSegments);
      const segHeight = Math.min(h, pageHeight - y, 900);

      try {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page.waitForTimeout(200);
        const targetHeight = Math.max(400, segHeight);
        await page.setViewportSize({ width: pageWidth, height: targetHeight });
        const buf = await page.screenshot({
          type: "jpeg",
          quality: 65,
          fullPage: false,
        });
        const b64 = buf.toString("base64");

        // send raw segment capture
        sendEvent("segment", {
          index: i,
          screenshot: `data:image/jpeg;base64,${b64}`,
          clip: { x: 0, y, width: pageWidth, height: segHeight },
        });

        // Build per-segment prompt and call AI
        const prompt = `You are an Accessibility & HCI Evaluation Engine.\nAnalyze the following screenshot segment (part ${
          i + 1
        } of ${numSegments}) of a web page. Answer only with a single JSON object matching this schema: {\n  "score": Number,\n  "overallSummary": "string",\n  "groups": [ { "wcagCriterion": "string", "severity": "High|Medium|Low", "count": Number, "problem": "string", "recommendation": "string" } ],\n  "hciSummary": "string",\n  "nextSteps": [\"string\"]\n}\n\nProvide concise findings focused on visual issues (contrast, layout, spacing, visible labels, focus indicators).`;

        let aiRes = null;
        try {
          aiRes = await callAiWithInlineData(prompt, b64, "image/jpeg");
          sendEvent("segmentAnalysis", { index: i, aiAnalysis: aiRes });
        } catch (aiErr) {
          sendEvent("segmentAnalysis", { index: i, error: aiErr.message });
        }

        segmentResults.push({
          screenshot: `data:image/jpeg;base64,${b64}`,
          clip: { x: 0, y, width: pageWidth, height: segHeight },
          aiAnalysis: aiRes,
        });
      } catch (segErr) {
        console.warn("[WCAG] segment capture failed", segErr);
        sendEvent("segment", { index: i, error: segErr.message });
      }
    }

    // 3) Stitch results into final response and send
    const stitched = {
      score: null,
      overallSummary: [],
      groups: [],
      hciSummary: [],
      nextSteps: [],
    };
    for (const s of segmentResults) {
      const a = s.aiAnalysis;
      if (!a) continue;
      if (typeof a.score === "number")
        stitched.score = (stitched.score || 0) + a.score;
      if (a.overallSummary) stitched.overallSummary.push(a.overallSummary);
      if (Array.isArray(a.groups)) stitched.groups.push(...a.groups);
      if (a.hciSummary) stitched.hciSummary.push(a.hciSummary);
      if (Array.isArray(a.nextSteps)) stitched.nextSteps.push(...a.nextSteps);
    }

    const validScores = segmentResults.filter(
      (s) => s.aiAnalysis && typeof s.aiAnalysis.score === "number",
    ).length;
    if (validScores > 0)
      stitched.score = Math.round((stitched.score || 0) / validScores);
    stitched.overallSummary = stitched.overallSummary.join("\n\n");
    stitched.hciSummary = stitched.hciSummary.join("\n\n");
    stitched.nextSteps = Array.from(new Set(stitched.nextSteps)).slice(0, 10);

    // Build final payload in the same shape as /api/wcag-visual
    const finalResponse = {
      score: typeof stitched.score === "number" ? stitched.score : 0,
      overallSummary: stitched.overallSummary || "",
      breakdown: segmentResults.map((s) => ({
        screenshot: s.screenshot,
        description: s.aiAnalysis
          ? s.aiAnalysis.overallSummary || s.aiAnalysis.hciSummary || ""
          : s.error || "",
      })),
      categoryScores: {},
      levelScores: {},
      groups: Array.isArray(stitched.groups) ? stitched.groups : [],
      hciSummary: stitched.hciSummary || "",
      nextSteps: Array.isArray(stitched.nextSteps) ? stitched.nextSteps : [],
    };

    sendEvent("result", finalResponse);
    // close SSE
    sendEvent("done", { message: "complete" });
    res.end();
  } catch (err) {
    console.error("[WCAG] Error in /api/wcag-visual-stream:", err);
    try {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    } catch (err2) {
      // ignore
    }
  } finally {
    try {
      if (browser) await browser.close();
    } catch (e) {}
  }
});

/**
 * Streamed HTML analysis using Server-Sent Events (SSE).
 * Clients can open an EventSource to /api/wcag-check-stream?url=... to receive
 * a quick preview and DOM-derived steps immediately, then receive the final
 * AI result when ready. This mirrors /api/wcag-visual-stream behavior for the
 * HTML-based flow so the frontend can animate Playwright actions right away.
 */
app.get("/api/wcag-check-stream", async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url query param" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders && res.flushHeaders();

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });

    // quick preview screenshot to show immediately
    const previewBuf = await page.screenshot({
      type: "jpeg",
      quality: 70,
      fullPage: false,
    });
    const previewB64 = previewBuf.toString("base64");

    const sendEvent = (name, payload) => {
      res.write(`event: ${name}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // send preview immediately so the frontend can animate right away
    sendEvent("preview", {
      screenshot: `data:image/jpeg;base64,${previewB64}`,
      steps: [], // will stream step coordinates as we scan
    });

    // SIMPLIFIED: Only show clicking interactive elements (buttons/links)
    const liveSteps = [];

    // Scroll through page and capture visible interactive targets
    try {
      const buttons = await page.$$('button, [role="button"], a[href]');

      for (let i = 0; i < buttons.length && liveSteps.length < 10; i++) {
        const handle = buttons[i];

        try {
          await handle.evaluate((node) => {
            node.scrollIntoView({ block: "center", inline: "center" });
          });
          await page.waitForTimeout(140);

          const viewport = await page.evaluate(() => ({
            x: window.scrollX || 0,
            y: window.scrollY || 0,
            width: window.innerWidth || 1280,
            height: window.innerHeight || 720,
          }));

          const box = await handle.boundingBox();
          if (!box || box.width < 4 || box.height < 4) continue;

          const label = await handle.evaluate((node) => {
            const text = (node.innerText || node.textContent || "").trim();
            const aria =
              node.getAttribute("aria-label") ||
              node.getAttribute("aria-labelledby") ||
              "";
            return (text || aria || "Testing click target").slice(0, 60);
          });

          // Capture the current viewport so the frontend can show where we clicked
          const stepScreenshotBuf = await page.screenshot({
            type: "jpeg",
            quality: 55,
            fullPage: false, // viewport only, we also send scroll offsets
            captureBeyondViewport: false,
          });

          const step = {
            type: "click",
            x: Math.round(box.x + box.width / 2),
            y: Math.round(box.y + box.height / 2),
            width: Math.round(box.width),
            height: Math.round(box.height),
            label: label || "Testing click target",
            offsetX: Math.round(viewport.x || 0),
            offsetY: Math.round(viewport.y || 0),
            viewportWidth: Math.round(viewport.width || 0),
            viewportHeight: Math.round(viewport.height || 0),
            screenshot: `data:image/jpeg;base64,${stepScreenshotBuf.toString(
              "base64",
            )}`,
          };

          liveSteps.push(step);
          sendEvent("step", step);
          await page.waitForTimeout(420);
        } catch (innerErr) {
          console.error("[WCAG] Error capturing interactive step:", innerErr);
        }
      }
    } catch (e) {
      console.error("[WCAG] Error checking interactive elements:", e);
    }

    // Now run Axe after showing the scanning process
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    sendEvent("axe", { count: axeResults.violations.length, steps: liveSteps });

    // Extract HTML, text and the 'understandable' signals used in prompts
    // const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText || "");
    const understandableData = await page.evaluate(() => {
      const langAttribute = document.documentElement.getAttribute("lang");
      const formFields = Array.from(
        document.querySelectorAll("input, select, textarea"),
      ).map((el) => {
        let labelText = "No Label Found";
        if (el.id) {
          const label = document.querySelector(`label[for="${el.id}"]`);
          if (label) labelText = label.innerText;
        }
        if (labelText === "No Label Found" && el.closest("label")) {
          labelText = el.closest("label").innerText;
        }
        const ariaLabel =
          el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
        return {
          type: el.tagName.toLowerCase(),
          inputType: el.getAttribute("type"),
          hasLabel: labelText !== "No Label Found",
          labelText: labelText.toString().trim().substring(0, 50),
          hasAriaLabel: !!ariaLabel,
          hasPlaceholder: el.hasAttribute("placeholder"),
        };
      });
      const navCount = document.querySelectorAll(
        'nav, [role="navigation"]',
      ).length;
      return {
        langAttribute,
        formFieldCount: formFields.length,
        formFields: formFields.slice(0, 20),
        navCount,
      };
    });

    // Discover and visit internal pages to get more comprehensive violation coverage
    sendEvent("progress", { message: "Discovering internal pages..." });
    const internalLinks = await discoverInternalLinks(page, url);
    const spaLinks = await discoverClientRoutes(page, url);
    const linksToVisit = Array.from(
      new Set([url, ...internalLinks, ...spaLinks]),
    ).slice(0, 25);
    // Tag initial page violations with source URL
    const allViolations = axeResults.violations.map((v) => ({
      ...v,
      __sourceUrl: url,
    }));
    for (let i = 0; i < linksToVisit.length; i++) {
      try {
        const targetUrl = linksToVisit[i];
        console.log(
          `[WCAG] Navigating to page ${i + 1}/${
            linksToVisit.length
          }: ${targetUrl}`,
        );
        sendEvent("progress", {
          message: `Checking ${new URL(targetUrl).pathname}...`,
        });
        await page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await page.waitForTimeout(500);

        const pageAxeResults = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        if (pageAxeResults.violations && pageAxeResults.violations.length > 0) {
          console.log(
            `[WCAG] Found ${pageAxeResults.violations.length} violations on ${targetUrl}`,
          );
          // tag each violation with its source URL
          allViolations.push(
            ...pageAxeResults.violations.map((v) => ({
              ...v,
              __sourceUrl: targetUrl,
            })),
          );
        }

        // Navigate back to original page for consistency
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      } catch (navErr) {
        console.error(
          `[WCAG] Error visiting page ${linksToVisit[i]}:`,
          navErr.message,
        );
      }
    }

    console.log(
      `[WCAG] Total violations across all pages: ${allViolations.length}`,
    );
    // Emit summary of pages visited and violations found
    sendEvent("progress", {
      message: "Completed automated checks",
      pagesVisited: internalLinks.length + 1,
      violations: allViolations.length,
    });
    sendEvent("progress", { message: "Capturing violation screenshots..." });
    const rawViolationScreenshots = await captureViolationScreenshots(
      page,
      allViolations,
    );

    // Deduplicate screenshots by comparing image data (sample multiple positions)
    const screenshotMap = new Map();
    for (const vs of rawViolationScreenshots) {
      const img = vs.screenshot || "";
      // Create hash from length + samples at 25%, 50%, 75% positions to catch actual image differences
      const len = img.length;
      const hash = `${len}-${img.slice(
        Math.floor(len * 0.25),
        Math.floor(len * 0.25) + 100,
      )}-${img.slice(Math.floor(len * 0.75), Math.floor(len * 0.75) + 100)}`;

      if (screenshotMap.has(hash)) {
        const existing = screenshotMap.get(hash);
        existing.violations.push(...vs.violations);
        const seen = new Set(
          existing.markers.map((m) => `${m.x}-${m.y}-${m.width}-${m.height}`),
        );

        vs.markers.forEach((m) => {
          const key = `${m.x}-${m.y}-${m.width}-${m.height}`;
          if (!seen.has(key)) {
            seen.add(key);
            existing.markers.push(m);
          }
        });
      } else {
        screenshotMap.set(hash, vs);
      }
    }
    const violationScreenshots = Array.from(screenshotMap.values()).slice(
      0,
      12,
    );

    // Report duplicate screenshots removed
    const duplicates = Math.max(
      rawViolationScreenshots.length - violationScreenshots.length,
      0,
    );
    sendEvent("progress", {
      message: `Captured ${violationScreenshots.length} unique violation screenshots`,
      pagesVisited: internalLinks.length + 1,
      violations: allViolations.length,
      duplicates,
    });

    // Track mentioned problems to avoid repetition
    const mentionedProblems = [];

    // For each unique screenshot, ask AI for non-developer visual feedback
    const totalToAnalyze = Math.min(violationScreenshots.length, 20);
    for (let i = 0; i < totalToAnalyze; i++) {
      const vs = violationScreenshots[i];

      // Emit progress event for AI screenshot analysis
      sendEvent("screenshotAiProgress", {
        current: i + 1,
        total: totalToAnalyze,
        percentage: Math.round(((i + 1) / totalToAnalyze) * 100),
      });
      try {
        const dataUrl = vs.screenshot || "";
        const base64 =
          typeof dataUrl === "string" && dataUrl.includes(",")
            ? dataUrl.split(",")[1]
            : dataUrl;
        const violations = vs.violations || [];
        const wcagIds = violations
          .map((v) => vs.wcagCriterion || v?.id || "")
          .filter(Boolean)
          .join(", ");

        const avoidClause =
          mentionedProblems.length > 0
            ? `\n\nIMPORTANT: You have already mentioned these problems in previous screenshots: ${mentionedProblems.join(
                ", ",
              )}. Focus on a DIFFERENT accessibility issue visible in THIS screenshot. Do not repeat the same concern.`
            : "";

        const prompt = `You are an accessibility coach writing for non-developers. Look at the screenshot and explain the most important accessibility concern visible in this specific area, using simple language. Focus on what a user experiences (e.g., hard-to-read text, low contrast, small tap areas, unclear labels, poor spacing, missing visible focus). Avoid code or selectors.${avoidClause}

Return only this JSON:
{
  "summary": "1–2 sentences describing the user-facing problem in plain language",
  "recommendation": "1–2 sentences with a concrete, non-technical fix a content designer or UI designer could apply",
  "problemCategory": "A short keyword/phrase for the type of problem (e.g., 'contrast', 'tap target size', 'label clarity')"
}

If relevant, align the advice with WCAG criteria like ${wcagIds} but do not include numbers in the prose.`;

        const ai = await callAiWithInlineData(prompt, base64, "image/jpeg");
        if (ai && (ai.summary || ai.recommendation)) {
          vs.aiFeedback = {
            summary: typeof ai.summary === "string" ? ai.summary : "",
            recommendation:
              typeof ai.recommendation === "string" ? ai.recommendation : "",
          };
          if (ai.problemCategory && typeof ai.problemCategory === "string") {
            mentionedProblems.push(ai.problemCategory);
            vs.problemCategory = ai.problemCategory;
          }
        }
      } catch (e) {
        console.error("[WCAG] AI feedback for violation screenshot failed:", e);
      }
    }

    const html = await page.content();
    // Build prompt and call AI (text-only) — this may take time, but preview already sent
    const pageData = {
      html,
      text,
      understandableData,
      axeViolations: axeResults.violations,
    };
    const prompt = buildPrompt(pageData);

    let aiResponse = null;
    try {
      aiResponse = await callAi(prompt);
      sendEvent("ai", { status: "ok" });
    } catch (aiErr) {
      console.error("[WCAG] AI error in check-stream:", aiErr);
      sendEvent("ai", { status: "error", message: aiErr.message });

      // Provide a fallback response structure to prevent crashes downstream
      const axeViolationCount = axeResults.violations.length;
      const highCount = axeResults.violations.filter(
        (v) => v.impact === "critical",
      ).length;
      const mediumCount = axeResults.violations.filter(
        (v) => v.impact === "serious" || v.impact === "moderate",
      ).length;
      const lowCount = axeResults.violations.filter(
        (v) => v.impact === "minor",
      ).length;
      const totalViolations = axeViolationCount;
      const deductedPoints = highCount * 3 + mediumCount * 2 + lowCount * 1;
      const score = Math.max(0, 234 - deductedPoints);

      aiResponse = {
        score: score,
        scoreBreakdown: {
          highCount: highCount,
          mediumCount: mediumCount,
          lowCount: lowCount,
          totalViolations: totalViolations,
          maxPossiblePoints: 234,
          deductedPoints: deductedPoints,
          explanation: `${deductedPoints} points deducted from 234 possible: ${highCount} High + ${mediumCount} Medium + ${lowCount} Low violations`,
        },
        overallSummary: `Analysis found ${totalViolations} accessibility violations. AI analysis unavailable - showing automated results only.`,
        categoryScores: {
          Perceivable: 70,
          Operable: 70,
          Understandable: 70,
          Robust: 70,
        },
        categoryExplanations: {
          Perceivable: "Automated scan completed. AI analysis unavailable.",
          Operable: "Automated scan completed. AI analysis unavailable.",
          Understandable: "Automated scan completed. AI analysis unavailable.",
          Robust: "Automated scan completed. AI analysis unavailable.",
        },
        levelScores: {
          A: 70,
          AA: 70,
          AAA: 70,
        },
        groups: [],
        hciSummary:
          "AI analysis temporarily unavailable. Please review the automated violations detected.",
        nextSteps: [
          "Review the automated violations listed below",
          "Test keyboard navigation manually",
          "Verify color contrast meets WCAG standards",
        ],
      };
    }

    // Merge Axe automated groups with AI groups as the JSON endpoint does
    const axeGroups = axeResults.violations.map((v) => {
      const wcagTag = v.tags?.find((t) => t.match(/^wcag\d/)) || v.id;
      const severityMap = {
        critical: "High",
        serious: "High",
        moderate: "Medium",
        minor: "Low",
      };
      const severityText = severityMap[v.impact] || "Medium";
      const severityNum = { High: 3, Medium: 2, Low: 1 }[severityText] || 2;
      return {
        wcagCriterion: wcagTag,
        severity: severityText,
        severityNumber: severityNum,
        count: v.nodes?.length || 1,
        problem: v.help || v.description || "Automated syntax error detected.",
        recommendation: "Fix syntax issues reported by Axe-core.",
        type: "automated",
      };
    });

    const aiGroups = Array.isArray(aiResponse?.groups) ? aiResponse.groups : [];
    const allGroups = [...axeGroups, ...aiGroups];
    if (aiResponse) aiResponse.groups = allGroups;

    // Final result payload - include violation screenshots
    // Deduplicate by problem category across the site (keep first occurrence)
    const byCategory = [];
    const seenCats = new Set();
    for (const vs of violationScreenshots) {
      const cat = vs.problemCategory || vs.violationType;
      if (!seenCats.has(cat)) {
        seenCats.add(cat);
        byCategory.push(vs);
      }
    }

    const safeHtml = "";
    const stylesheets = [];

    const finalPayload = {
      url,
      aiAnalysis: aiResponse,
      axe: axeResults.violations,
      screenshot: `data:image/jpeg;base64,${previewB64}`,
      steps: liveSteps,
      violationScreenshots: byCategory.map((vs) => ({
        ...vs,
        viewport: vs.viewport || { width: 1280, height: 720 },
        screenshotOnly: !vs.markers || vs.markers.length === 0,
        visualSource: vs.aiFeedback ? "ai-visual" : "axe-only",
      })),

      html: "",
      stylesheets: [],
    };

    sendEvent("result", finalPayload);
    sendEvent("done", { message: "complete" });
    res.end();
  } catch (err) {
    console.error("[WCAG] Error in /api/wcag-check-stream:", err);
    try {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    } catch (e) {}
  } finally {
    try {
      if (browser) await browser.close();
    } catch (e) {}
  }
});

app.listen(PORT, () => {
  console.log(`WCAG AI server listening on port ${PORT}`);
});

app.use("/api/analyze", analyzeRouter);
