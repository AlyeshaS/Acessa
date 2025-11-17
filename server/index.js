// server/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Fetch the page content using Playwright
 */
async function fetchPageContent(url) {
  console.log("[WCAG] Launching Playwright for:", url);
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

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

Your job is to analyze the provided website content using ONLY the official WCAG 2.2 guidelines.
Do NOT invent or assume guidelines that do not exist.
If you are unsure whether a specific success criterion applies, mark it as "uncertain" instead of guessing.

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

2) Scoring (0–100)
   Compute an overall accessibility score from 0–100 based ONLY on:
   - Number of violations
   - Severity (High = 3 points, Medium = 2, Low = 1)
   - Repetition / frequency
   Score meaning:
   - 90–100: Excellent accessibility
   - 70–89: Good, minor fixes needed
   - 40–69: Significant accessibility issues
   - 0–39: Poor accessibility

3) HCI / UX Summary
   Provide a 3–5 sentence human-centered design assessment focused on:
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
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  let text = result.response.text().trim();
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
