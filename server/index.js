// server/index.js
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

    // 🔹 Take a full-page screenshot for the loading animation
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = screenshotBuffer.toString("base64");
    const screenshot = `data:image/png;base64,${screenshotBase64}`;

    // 1. Get Basic Content
    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText || "");

    // 2. Run Axe-Core
    console.log("[WCAG] Running Axe-Core...");
    const axeResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    // 3. Extract specific "Understandable" signals (Keep your existing logic)
    const understandableData = await page.evaluate(() => {
      const langAttribute = document.documentElement.getAttribute("lang");

      const formFields = Array.from(
        document.querySelectorAll("input, select, textarea")
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
          labelText: labelText.trim().substring(0, 50),
          hasAriaLabel: !!ariaLabel,
          hasPlaceholder: el.hasAttribute("placeholder"),
        };
      });

      const navCount = document.querySelectorAll(
        'nav, [role="navigation"]'
      ).length;

      return {
        langAttribute,
        formFieldCount: formFields.length,
        formFields: formFields.slice(0, 20),
        navCount,
      };
    });

    return {
      html,
      text,
      understandableData,
      axeViolations: axeResults.violations,
      screenshot, // 🔹 send screenshot up to the caller
    };
  } catch (error) {
    console.error("Playwright Error:", error);
    throw new Error(`Failed to load page content: ${error.message}`);
  } finally {
    await context.close();
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
      `[WCAG] Captured ${steps.length} real accessibility check steps`
    );
  } catch (err) {
    console.error("[WCAG] Error capturing real steps:", err);
  }

  return steps;
}

/**
 * Capture up to 5 violation-focused screenshots
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
      `[WCAG] Starting screenshot capture for ${axeViolations.length} total violations`
    );

    // Get unique violation types - take up to 5 different violation IDs
    const uniqueViolations = [];
    const seenIds = new Set();

    for (const violation of axeViolations) {
      if (!seenIds.has(violation.id) && uniqueViolations.length < 5) {
        seenIds.add(violation.id);
        uniqueViolations.push(violation);
      }
    }

    console.log(
      `[WCAG] Will capture ${uniqueViolations.length} unique violation types`
    );

    for (let idx = 0; idx < uniqueViolations.length; idx++) {
      const violation = uniqueViolations[idx];
      try {
        if (!violation.nodes || violation.nodes.length === 0) {
          console.log(
            `[WCAG] Violation ${violation.id} has no nodes, skipping`
          );
          continue;
        }

        const node = violation.nodes[0]; // Focus on first occurrence
        const target = node.target?.join(" ") || "";

        if (!target) {
          console.log(
            `[WCAG] Could not determine selector for violation ${violation.id}`
          );
          continue;
        }

        console.log(
          `[WCAG] Capturing screenshot for violation ${idx + 1}/5: ${
            violation.id
          } (selector: ${target})`
        );

        // Try to get bounding box for the primary node
        const bounds = await page.evaluate((selector) => {
          try {
            const el = document.querySelector(selector);
            if (!el) {
              console.log(`[WCAG] Could not find element: ${selector}`);
              return null;
            }
            el.scrollIntoView({ block: "center", inline: "center" });
            const box = el.getBoundingClientRect();
            return {
              x: Math.max(0, Math.round(box.x)),
              y: Math.max(0, Math.round(box.y)),
              width: Math.round(box.width),
              height: Math.round(box.height),
            };
          } catch (e) {
            console.log(`[WCAG] Error getting bounds: ${e.message}`);
            return null;
          }
        }, target);

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

                return {
                  x: Math.round(rect.x),
                  y: Math.round(rect.y),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                  selector,
                };
              } catch (e) {
                console.log(
                  `[WCAG] Marker error for ${selector}: ${e.message}`
                );
                return null;
              }
            })
            .filter(Boolean);
        }, markerSelectors);

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
          `[WCAG] Screenshot captured: ${screenshotBuf.length} bytes`
        );

        screenshots.push({
          screenshot: `data:image/jpeg;base64,${screenshotBuf.toString(
            "base64"
          )}`,
          violations: [violation],
          bounds: bounds || { x: 0, y: 0, width: 0, height: 0 },
          markers: markers || [],
          violationType: violation.id,
          wcagCriterion:
            violation.tags?.find((t) => t.match(/^wcag\d/)) || violation.id,
        });
      } catch (err) {
        console.error(
          `[WCAG] Error capturing violation screenshot for ${violation.id}:`,
          err.message
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
function buildPrompt(pageData) {
  const { html, text, understandableData, axeViolations } = pageData;

  // Truncate to avoid token limits
  const maxLen = 15000;
  const safeHtml = html.slice(0, maxLen);
  const safeText = text.slice(0, maxLen);

  // Format the form data for the prompt
  const formsJson = JSON.stringify(understandableData.formFields, null, 2);
  // Summarize Axe violations for the prompt to save tokens
  const robustIssues = axeViolations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    help: v.help,
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
- Perceivable
- Operable
- Understandable
- Robust
(You do not need to explicitly name the POUR principle in the issue text; the wcagCriterion already determines the principle.)

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
- If a categoryScore (Perceivable, Operable, Understandable, Robust) is LESS THAN 100, you MUST provide a "categoryExplanations" entry that lists:
  1. EXACT WCAG criteria being violated (e.g., "1.4.3 Contrast (Minimum)", "2.1.1 Keyboard")
  2. Why each criterion is violated
  3. How many violations affect that category
- If a categoryScore IS 100, the explanation should state "No violations found in this category."
- NEVER return a score < 100 without clear, specific reasoning tied to actual failing criteria.
- Severity reference: 1=Low, 2=Medium, 3=High (include these numbers in explanations where relevant)

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
  });

  // let text = result.text.trim();
  // console.log("[WCAG] Raw Gemini response:", text);
  const response = result.response;
  // let text = response.text ? response.text() : JSON.stringify(response);
  let text = result.text;
  text = text.trim();

  // Strip markdown fences if Gemini adds them
  if (text.startsWith("```")) {
    text = text.replace(/^```json/i, "");
    text = text.replace(/^```/, "");
    text = text.replace(/```$/, "");
    text = text.trim();
  }

  // Try to extract first { ... } JSON object
  const match = text.match(/\{[\s\S]*\}$/);
  if (!match) {
    console.error("[WCAG] No JSON object found in AI response");
    throw new Error("AI did not return a valid JSON object.");
  }

  let jsonStr = match[0];

  jsonStr = jsonStr.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    const inner = match
      .slice(1, -1) // remove outer quotes
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n");
    return `"${inner}"`;
  });

  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (err) {
    console.error("[WCAG] Failed to parse Gemini JSON:", err);
    console.error("[WCAG] Cleaned JSON string was:", jsonStr);
    throw new Error("AI returned invalid JSON.");
  }
}

/**
 * Call Gemini with inline image data. Uses the `inlineData` part so the
 * model receives both a text prompt and the base64-encoded image.
 */
async function callAiWithInlineData(
  prompt,
  base64Str,
  mimeType = "image/jpeg"
) {
  console.log("[WCAG] Calling Gemini AI with inline image...");

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      // first part: the textual prompt
      prompt,
      // second part: inline binary data (image)
      { inlineData: { data: base64Str, mimeType } },
    ],
  });

  // Attempt to extract text from result similarly to callAi
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

  text = text.trim();

  // Strip markdown fences if Gemini adds them
  if (text.startsWith("```")) {
    text = text.replace(/^```json/i, "");
    text = text.replace(/^```/, "");
    text = text.replace(/```$/, "");
    text = text.trim();
  }

  const match = text.match(/\{[\s\S]*\}$/);
  if (!match) {
    console.error("[WCAG] No JSON object found in AI response (inline data)");
    throw new Error("AI did not return a valid JSON object.");
  }

  let jsonStr = match[0];

  jsonStr = jsonStr.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (m) => {
    const inner = m.slice(1, -1).replace(/\r/g, "\\r").replace(/\n/g, "\\n");
    return `"${inner}"`;
  });

  jsonStr = jsonStr.replace(/,\s*([}\]])/g, "$1");

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (err) {
    console.error("[WCAG] Failed to parse Gemini JSON (inline):", err);
    console.error("[WCAG] Cleaned JSON string was:", jsonStr.slice(0, 2000));
    throw new Error("AI returned invalid JSON.");
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

      return {
        wcagCriterion: wcagTag,
        severity: v.impact
          ? v.impact.charAt(0).toUpperCase() + v.impact.slice(1)
          : "High",
        count: v.nodes?.length || 1,
        problem: v.help || v.description || "Automated syntax error detected.",
        recommendation: "Fix syntax issues reported by Axe-core.",
        type: "automated",
      };
    });

    const aiGroups = Array.isArray(aiResponse.groups) ? aiResponse.groups : [];
    const allGroups = [...axeGroups, ...aiGroups];

    aiResponse.groups = allGroups;

    if (axeViolations.length > 0) {
      aiResponse.categoryScores.Robust = Math.max(
        0,
        aiResponse.categoryScores.Robust - axeViolations.length * 5
      );
      aiResponse.score = Math.floor(
        (aiResponse.categoryScores.Perceivable +
          aiResponse.categoryScores.Operable +
          aiResponse.categoryScores.Understandable +
          aiResponse.categoryScores.Robust) /
          4
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
        document.body.scrollHeight
      )
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
      }) of a web page. Answer only with a single JSON object matching this schema: {\n  \"score\": Number,\n  \"overallSummary\": \"string\",\n  \"groups\": [ { \"wcagCriterion\": \"string\", \"severity\": \"High|Medium|Low\", \"count\": Number, \"problem\": \"string\", \"recommendation\": \"string\" } ],\n  \"hciSummary\": \"string\",\n  \"nextSteps\": [\"string\"]\n}\n\nProvide concise findings focused on visual issues (contrast, layout, spacing, visible labels, focus indicators).`;

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
      (s) => s.aiAnalysis && typeof s.aiAnalysis.score === "number"
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
        document.body.scrollHeight
      )
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
        } of ${numSegments}) of a web page. Answer only with a single JSON object matching this schema: {\n  \"score\": Number,\n  \"overallSummary\": \"string\",\n  \"groups\": [ { \"wcagCriterion\": \"string\", \"severity\": \"High|Medium|Low\", \"count\": Number, \"problem\": \"string\", \"recommendation\": \"string\" } ],\n  \"hciSummary\": \"string\",\n  \"nextSteps\": [\"string\"]\n}\n\nProvide concise findings focused on visual issues (contrast, layout, spacing, visible labels, focus indicators).`;

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
      (s) => s.aiAnalysis && typeof s.aiAnalysis.score === "number"
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
              "base64"
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
    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText || "");
    const understandableData = await page.evaluate(() => {
      const langAttribute = document.documentElement.getAttribute("lang");
      const formFields = Array.from(
        document.querySelectorAll("input, select, textarea")
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
        'nav, [role="navigation"]'
      ).length;
      return {
        langAttribute,
        formFieldCount: formFields.length,
        formFields: formFields.slice(0, 20),
        navCount,
      };
    });

    // Capture violation-focused screenshots (up to 5)
    sendEvent("progress", { message: "Capturing violation screenshots..." });
    const violationScreenshots = await captureViolationScreenshots(
      page,
      axeResults.violations
    );
    sendEvent("progress", {
      message: `Captured ${violationScreenshots.length} violation screenshots`,
    });

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
    const finalPayload = {
      url,
      aiAnalysis: aiResponse,
      axe: axeResults.violations,
      screenshot: `data:image/jpeg;base64,${previewB64}`,
      steps: liveSteps, // Use the actual steps we captured with real coordinates
      violationScreenshots: violationScreenshots, // New: violation-focused screenshots
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
