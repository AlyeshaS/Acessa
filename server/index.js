// server/index.js
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { runAxeOnUrl } from "./axeRunner.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ----------------------
// Gemini AI Call (v1 API, 2.5 Flash)
// ----------------------
async function callAi(prompt) {
  const model = "gemini-2.5-flash"; // <-- updated model
  const url =
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=` +
    process.env.GEMINI_API_KEY;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  const data = await res.json();

  if (data.error) {
    console.error("Gemini API error:", data.error);
    throw new Error(data.error.message || "Gemini API Error");
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ----------------------
// Health Check
// ----------------------
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "WCAG AI server running (Gemini v1, 2.5 Flash)",
  });
});

// ----------------------
// Main WCAG + AI Route
// ----------------------
app.post("/api/wcag-check", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return res.status(400).json({
        error: "Invalid URL. Must be a string starting with http/https.",
      });
    }

    console.log(`\n[WCAG] Running axe-core on: ${url}`);

    // 1. Run axe-core scan
    const axeResults = await runAxeOnUrl(url);

    // 2. Load WCAG rule metadata
    const wcagRulesPath = new URL("./wcagRules.json", import.meta.url);
    const wcagRules = JSON.parse(await fs.readFile(wcagRulesPath, "utf8"));

    // 3. Prepare payload for Gemini
    const aiPayload = {
      url,
      axeResults: {
        violations: axeResults.violations,
        incomplete: axeResults.incomplete,
      },
      wcagRules,
    };

    const prompt = `
You are an expert WCAG 2.1 / 2.2 accessibility auditor.

You are given:
1) Raw axe-core results
2) A set of WCAG rule metadata

Tasks:
- Map EACH axe violation to the correct WCAG rule in wcagRules
- Group similar issues together
- For each group, output:
  - wcagCriterion
  - severity
  - count
  - typicalExample
  - problem
  - recommendation
- List potential false positives
- List required manual checks (keyboard, screen reader, color contrast, focus order, etc.)

DO NOT invent WCAG rules not found in wcagRules.

Input JSON:
${JSON.stringify(aiPayload, null, 2)}

Output EXACTLY this JSON format:

{
  "overallSummary": "string",
  "groups": [
    {
      "wcagCriterion": "WCAG 2.1 1.1.1 Non-text Content",
      "severity": "high",
      "count": 5,
      "typicalExample": "short example",
      "problem": "explain the issue",
      "recommendation": "fix instructions"
    }
  ],
  "potentialFalsePositives": [],
  "manualChecks": []
}
    `;

    console.log("[WCAG] Calling Gemini AI...");
    const aiRaw = await callAi(prompt);

    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(aiRaw);
    } catch {
      console.warn("[WCAG] Could not parse Gemini JSON. Returning raw text.");
      aiAnalysis = { rawText: aiRaw };
    }

    return res.json({
      url,
      axeResults,
      wcagRules,
      aiAnalysis,
    });
  } catch (err) {
    console.error("WCAG check failed:", err);
    res.status(500).json({
      error: "WCAG check failed",
      message: err.message,
      stack: err.stack,
    });
  }
});

// ----------------------
// Start Server
// ----------------------
app.listen(PORT, () => {
  console.log(`WCAG AI server running on http://localhost:${PORT}`);
  console.log("Using Gemini model: gemini-2.5-flash");
});
