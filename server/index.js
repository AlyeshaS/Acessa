// server/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import { GoogleGenAI } from "@google/genai";
import { AxeBuilder } from "@axe-core/playwright";

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

  // ✅ FIX: Create a dedicated context. Axe requires this to inject scripts correctly.
  // const context = await browser.newContext({
  //   userAgent:
  //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  // });

  // const page = await context.newPage();

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

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

Treat AODA as requiring at least WCAG 2.0 Level AA conformance. WCAG 2.2 extends these requirements; you MUST include relevant WCAG 2.2 AA criteria when evaluating accessibility for AODA.

You will receive extracted HTML and visible text from a single web page.

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

SPECIAL INSTRUCTIONS FOR "UNDERSTANDABLE" (Principle 3):
You must use the provided "Form & Language Data" below to evaluate Principle 3 specifically.
- **3.1 Readable:** Check the extracted 'lang' attribute. If it is null or empty, fail WCAG 3.1.1 immediately. Analyze the 'Visible Text' for complex jargon (Level AAA 3.1.5).
- **3.2 Predictable:** Use the 'navCount' to comment on navigation consistency. Look for "open in new tab" links in the HTML without warnings (Failure of 3.2.2 or 3.2.5).
- **3.3 Input Assistance:** Look at the 'Form Fields List' provided below. If "hasLabel" is false and "hasAriaLabel" is false for any input, this is a likely failure of WCAG 3.3.2.

For each detected issue, include:
- wcagCriterion: exact WCAG 2.2 ID + name (for example "1.4.3 Contrast (Minimum)")
- severity: "High" | "Medium" | "Low"
- count: approximate number of occurrences (integer)
- problem: short, concrete explanation of what is wrong, in plain language
- recommendation: short, specific, developer-friendly fix in plain language

Requirements:
- Only use criteria that exist in WCAG 2.2.
- Do NOT make up WCAG numbers or names.
- When relevant, indicate in the wording if the issue causes failure of Level A, AA, or AAA.
- In the problem text, clearly hint which WCAG principle is most affected (e.g., “Perceivable – …”, “Operable – …”) so issues can be grouped by principle later.

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

If AODA requires something that WCAG 2.2 does not explicitly cover, still consider it when scoring and explain this briefly in the overallSummary.

Compute internal percentage scores (0–100) for the four WCAG principles:
- Perceivable
- Operable
- Understandable
- Robust

Also compute percentage scores (0–100) for conformance levels:
- A
- AA
- AAA

These principle scores and level scores MUST influence the overall score.
Use these interpretations:
- 90–100: Excellent accessibility
- 70–89: Good, minor fixes needed
- 40–69: Significant accessibility issues
- 0–39: Poor accessibility

Make sure:
- "score" is the overall score for the page (0–100).
- Each entry in "categoryScores" is a 0–100 score for that principle.
- Each entry in "levelScores" is a 0–100 score for that conformance level.
- Even if data is limited, you MUST still provide numeric scores. If you are uncertain, be conservative and explain that uncertainty in the overallSummary.

3) HCI / UX Summary (deep, expert-level analysis)
Provide a detailed, human-centered design assessment focused on:
- Layout clarity and visual hierarchy
- Interaction patterns and feedback
- Learnability and discoverability of actions
- Error prevention and recovery
- Cognitive load (is the interface mentally demanding? why?)
- Consistency and predictability across the page
- Mobile vs desktop usability (based on hints in structure/content)
- Any noteworthy strengths that should be preserved

Write this as a dense, insight-rich narrative (not bullet points).

Length and structure requirements (IMPORTANT):
- Write AT LEAST 4–6 substantial paragraphs.
- Aim for roughly 500 words total. Must be detailed and nuanced, nothing vague or generic.
- Each paragraph should focus on a specific theme (e.g., one on layout, one on interaction patterns, one on cognitive load, etc.).
- Refer to concrete examples from the page (e.g., “the large hero banner at the top…”, “the navigation menu with multiple dropdown items…”) instead of generic statements.

Avoid:
- Vague phrases like “the design is good” or “the UX could be improved”.
- Repeating the same point in slightly different words.

The final HCI analysis must be returned in the JSON field:
"hciSummary": "string"
and should include line breaks (\n) between paragraphs.

4) Next Steps (prioritized, non-expert-friendly)
Provide 5–10 prioritized, high-impact recommendations for the design & development team.

Each item should:
- Be understandable to someone who is NOT an accessibility or HCI expert (think: designer or developer with basic knowledge).
- Start with a clear action verb (e.g., “Increase…”, “Add…”, “Reorganize…”).
- Be specific about WHAT to change (e.g., “Increase body text contrast between #888888 and white to meet WCAG 1.4.3” rather than “fix contrast”).
- Briefly explain WHY it matters and which users it helps (e.g., “This reduces eye strain and helps users with low vision.”).

These recommendations should be practical, implementable steps that directly follow from the issues you identified and should reflect a mix of:
- Quick wins (easy, high impact)
- Medium-effort improvements
- Larger, structural changes (if needed)

OUTPUT FORMAT (VERY IMPORTANT):

You MUST return ONLY a single JSON object.
No markdown.
No backticks.
No comments.
No prose before or after.
Do NOT wrap the JSON in json or any other fences.

The JSON MUST match this schema exactly:

{
  "score": Number,                     // Overall page score 0–100
  "overallSummary": "string",          // Short paragraph summarizing key findings and overall state
  "categoryScores": {
    "Perceivable": Number,             // 0–100
    "Operable": Number,                // 0–100
    "Understandable": Number,          // 0–100
    "Robust": Number                   // 0–100
  },
  "levelScores": {
    "A": Number,                       // 0–100
    "AA": Number,                      // 0–100
    "AAA": Number                      // 0–100
  },
  "groups": [
    {
      "wcagCriterion": "string",       // e.g., "1.4.3 Contrast (Minimum)"
      "severity": "High" | "Medium" | "Low",
      "count": Number,                 // integer, approximate
      "problem": "string",             // concise but concrete issue description
      "recommendation": "string"       // specific, developer-friendly fix
    }
  ],
  "hciSummary": "string",              // multi-sentence deep HCI assessment
  "nextSteps": ["string", "string", "string"]  // 5–10 clear, prioritized action items
}

Strict formatting rules:
- All Numbers must be valid JSON numbers (no quotes).
- Do NOT include trailing commas.
- Do NOT change any property names.
- Always include all properties shown in the schema, even if some scores are approximate.
- If you are uncertain about something, still return a valid numeric score and explain uncertainty in the text fields; do NOT omit or rename keys.

DATA SECTION:

Here is the Form & Language Data (CRITICAL FOR "UNDERSTANDABLE" SCORE):
- Document Language (lang=""): "${
    understandableData.langAttribute || "MISSING"
  }"
- Number of Navigation Landmarks: ${understandableData.navCount}
- Form Fields Analysis: 
${formsJson}
- Here is the Technical Audit Log (CRITICAL FOR "ROBUST" SCORE):
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
 * Main API: POST /api/wcag-check
 */
app.post("/api/wcag-check", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // 1. Fetch Data (Includes Axe Violations)
    const pageData = await fetchPageContent(url);
    const { axeViolations } = pageData; // Destructure the violations

    // 2. Build Prompt & Call AI
    const prompt = buildPrompt(pageData);
    const aiResponse = await callAi(prompt);

    // --- YOUR NEW MERGING LOGIC STARTS HERE ---

    // 3. Convert Axe violations to "Gemini Group" format
    // (We map the raw Axe data into the same shape the frontend expects from AI)
    const axeGroups = axeViolations.map((v) => {
      // Try to find a tag like "wcag2aa", fallback to the rule ID
      const wcagTag = v.tags?.find((t) => t.match(/^wcag\d/)) || v.id;

      return {
        wcagCriterion: wcagTag,
        severity: v.impact
          ? v.impact.charAt(0).toUpperCase() + v.impact.slice(1) // "critical" -> "Critical"
          : "High",
        count: v.nodes?.length || 1,
        problem: v.help || v.description || "Automated syntax error detected.",
        recommendation: "Fix syntax issues reported by Axe-core.", // Generic fix for automated tools
        type: "automated", // Optional: helps frontend distinguish AI vs Code findings
      };
    });

    // 4. Get AI groups (default to empty array if missing)
    const aiGroups = Array.isArray(aiResponse.groups) ? aiResponse.groups : [];

    // 5. Deduplicate!
    // (Prevent AI from listing "Duplicate ID" if Axe already listed it)
    // We keep ALL Axe groups, and filter AI groups to avoid obvious overlaps if needed.
    // For now, we will just merge them.
    const allGroups = [...axeGroups, ...aiGroups];

    // 6. Update the response object
    aiResponse.groups = allGroups;

    // Recalculate 'Robust' score if Axe found errors (AI is bad at math)
    if (axeViolations.length > 0) {
      // Penalize Robust score hard if automated errors exist
      aiResponse.categoryScores.Robust = Math.max(
        0,
        aiResponse.categoryScores.Robust - axeViolations.length * 5
      );
      // Update overall score roughly
      aiResponse.score = Math.floor(
        (aiResponse.categoryScores.Perceivable +
          aiResponse.categoryScores.Operable +
          aiResponse.categoryScores.Understandable +
          aiResponse.categoryScores.Robust) /
          4
      );
    }

    // --- END MERGING LOGIC ---

    // 7. Send Final Response
    res.json({
      url,
      aiAnalysis: aiResponse,
      // We pass the raw axe violations too, in case you want to show a separate table for them
      axe: axeViolations,
    });
  } catch (error) {
    console.error("[WCAG] Server Error:", error);
    res.status(500).json({
      error: "Analysis failed",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`WCAG AI server listening on port ${PORT}`);
});
