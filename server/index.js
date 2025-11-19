// server/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import { GoogleGenAI } from "@google/genai";

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
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 450000 });

    // Grab full HTML and visible text
    const html = await page.content();
    const text = await page.evaluate(() => document.body.innerText || "");

    // You can get fancier later (headings, links, ARIA, etc.)
    return {
      html,
      text,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Build the WCAG + HCI prompt
 */
function buildPrompt(pageData) {
  const { html, text } = pageData;

  // Truncate to avoid token limits
  const maxLen = 15000;
  const safeHtml = html.slice(0, maxLen);
  const safeText = text.slice(0, maxLen);

  return `
You are an Accessibility & HCI Evaluation Engine.

Your job is to analyze the provided website content using ONLY the official WCAG 2.2 guidelines and AODA requirements.
Do NOT invent or assume guidelines that do not exist.
If you are unsure whether a specific success criterion applies, mark it as "uncertain" instead of guessing.

Treat AODA as requiring at least WCAG 2.0 Level AA conformance. WCAG 2.2 extends these requirements; you MUST include relevant WCAG 2.2 AA criteria when evaluating accessibility for AODA.

You will receive extracted HTML and visible text from a single web page.

TASKS:
1) WCAG 2.2 Evaluation
   Evaluate the page across these categories:
   - Perceivable
   - Operable
   - Understandable
   - Robust

   For each detected issue, include:
   - wcagCriterion: exact WCAG 2.2 ID + name (for example "1.4.3 Contrast (Minimum)")
   - severity: "High" | "Medium" | "Low"
   - count: approximate number of occurrences (integer)
   - problem: short explanation of what is wrong
   - recommendation: short, specific, developer-friendly fix

   Only use criteria that exist in WCAG 2.2.
   Do NOT make up WCAG numbers or names.
   When relevant, indicate if the issue causes failure of Level A, AA, or AAA.

2) Scoring (0–100)
   Compute a total accessibility percentage score from 0–100.
   The score must be based ONLY on:
   - Number of violations
   - Severity (High = 3 points, Medium = 2, Low = 1)
   - Repetition / frequency
   - Impact on essential tasks and AODA compliance

   You MUST score the page using:
   - Official WCAG 2.2 success criteria
   - AODA requirements (treat WCAG 2.0 Level AA as a mandatory minimum)
   If AODA requires something that WCAG 2.2 does not explicitly cover, still consider it when scoring.

   Compute internal percentage scores (0–100) for the four WCAG principles:
   - Perceivable
   - Operable
   - Understandable
   - Robust

   Also compute percentage scores (0–100) for conformance levels:
   - A
   - AA
   - AAA

   These principle scores and level scores must influence the overall score.
   Use these interpretations:
   - 90–100: Excellent accessibility
   - 70–89: Good, minor fixes needed
   - 40–69: Significant accessibility issues
   - 0–39: Poor accessibility

3) HCI / UX Summary
   Provide as many sentences as needed in order to provide a proper human-centered design assessment focused on:
   - Layout clarity
   - Interaction patterns
   - Learnability
   - Error prevention
   - Cognitive load
   - Consistency
   - Mobile vs desktop usability (based on hints in structure/content)

4) Next Steps
   Provide 5–10 prioritized, high-impact recommendations for the design & dev team.
   These should be practical and implementable.

OUTPUT FORMAT (VERY IMPORTANT):
Return ONLY a single JSON object.
No markdown.
No backticks.
No prose before or after.
The JSON MUST match this schema exactly:

{
  "score": Number,
  "overallSummary": "string",
  "categoryScores": {
    "Perceivable": Number,
    "Operable": Number,
    "Understandable": Number,
    "Robust": Number
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
      "count": Number,
      "problem": "string",
      "recommendation": "string"
    }
  ],
  "hciSummary": "string",
  "nextSteps": ["string", "string", "string"]
}


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

  let text = result.text.trim();
  console.log("[WCAG] Raw Gemini response:", text);

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

  const jsonStr = match[0];

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (err) {
    console.error("[WCAG] Failed to parse Gemini JSON:", err);
    throw new Error("AI returned invalid JSON.");
  }
}

/**
 * Main API: POST /api/wcag-check
 */
app.post("/api/wcag-check", async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      error: "Invalid request",
      message: "Missing or invalid 'url' in body.",
    });
  }

  try {
    console.log("[WCAG] Running analysis for:", url);

    const pageData = await fetchPageContent(url);
    const prompt = buildPrompt(pageData);
    const aiJson = await callAi(prompt);

    // This is what your frontend expects
    res.json({
      url,
      aiAnalysis: aiJson,
    });
  } catch (err) {
    console.error("[WCAG] Error in /api/wcag-check:", err);
    res.status(500).json({
      error: "WCAG check failed",
      message: err.message || "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`WCAG AI server listening on port ${PORT}`);
});
