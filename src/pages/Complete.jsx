// src/pages/Complete.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/App.css";
import "../styles/index.css";

// Reusable circular progress component
function ScoreCircle({ value = 0, size = 120, strokeWidth = 12, label }) {
  const clamped = Math.max(0, Math.min(100, value)); // 0–100 safety
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="score-circle"
      aria-label={
        label
          ? `${label} score ${clamped} out of 100`
          : `Score ${clamped} out of 100`
      }
    >
      <svg width={size} height={size}>
        {/* background track */}
        <circle
          className="score-circle-track"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* progress arc */}
        <circle
          className="score-circle-progress"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        {/* numeric text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="score-circle-text"
        >
          {clamped}
        </text>
      </svg>
      {label && <p className="score-circle-label">{label}</p>}
    </div>
  );
}

const LOADING_STEPS = [
  "Fetching your webpage…",
  "Running automated accessibility checks…",
  "Checking WCAG 2.2 and AODA requirements…",
  "Analyzing HCI and UX patterns…",
  "Building your accessibility report…",
];

function Complete() {
  const navigate = useNavigate();
  const location = useLocation();
  const url = location.state?.url;

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Loading step messages to inform the user what is happening
  const loadingSteps = [
    "Fetching your webpage…",
    "Running automated accessibility checks…",
    "Checking WCAG 2.2 and AODA requirements…",
    "Analyzing HCI and UX patterns…",
    "Building your accessibility report…",
  ];
  const [loadingStep, setLoadingStep] = useState(LOADING_STEPS[0]);

  // Which categories are expanded in the UI
  const [expandedCategories, setExpandedCategories] = useState({
    Perceivable: false,
    Operable: false,
    Understandable: false,
    Robust: false,
  });

  // AbortController stored in a ref so we can cancel on Back
  const abortRef = useRef(null);

  useEffect(() => {
    if (!url) {
      setError("No URL provided. Please go back and enter a URL.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    const runAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("http://localhost:4000/api/wcag-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal,
        });

        if (signal.aborted) return;

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error || "Request failed");
        }

        const data = await res.json();
        if (!signal.aborted) {
          setAnalysis(data);
        }
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("[Complete] Request aborted");
          return;
        }
        console.error(err);
        setError(err.message || "Something went wrong while analyzing.");
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    runAnalysis();

    return () => {
      controller.abort();
    };
  }, [url]);

  // Rotate loading messages while loading
  useEffect(() => {
    if (!loading) return;

    let index = 0;
    setLoadingStep(LOADING_STEPS[0]);

    const interval = setInterval(() => {
      index = (index + 1) % LOADING_STEPS.length;
      setLoadingStep(LOADING_STEPS[index]);
    }, 2200);

    return () => clearInterval(interval);
  }, [loading]);

  const handleBack = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    navigate("/");
  };

  // Safely unwrap aiAnalysis JSON (fallback to root if needed)
  const ai = analysis?.aiAnalysis ?? analysis ?? {};

  const score = typeof ai.score === "number" ? ai.score : null;
  let groups = Array.isArray(ai.groups) ? ai.groups : [];

  const overallSummary = ai.overallSummary || "";
  const hciText = ai.hciSummary || overallSummary;

  // Category scores from Gemini
  const categoryScores = ai.categoryScores || {};

  const perceivableScore =
    typeof categoryScores.Perceivable === "number"
      ? categoryScores.Perceivable
      : null;

  const operableScore =
    typeof categoryScores.Operable === "number"
      ? categoryScores.Operable
      : null;

  const understandableScore =
    typeof categoryScores.Understandable === "number"
      ? categoryScores.Understandable
      : null;

  const robustScore =
    typeof categoryScores.Robust === "number" ? categoryScores.Robust : null;

  // Conformance level scores
  const levelScores = ai.levelScores || {};

  const levelAScore = typeof levelScores.A === "number" ? levelScores.A : null;
  const levelAAScore =
    typeof levelScores.AA === "number" ? levelScores.AA : null;
  const levelAAAScore =
    typeof levelScores.AAA === "number" ? levelScores.AAA : null;

  // Sort groups by WCAG criterion number (1.4.3, 2.1.1, etc.)
  groups = groups.slice().sort((a, b) => {
    const getNum = (str) => {
      if (!str) return "";
      const match = String(str)
        .trim()
        .match(/^\d+(?:\.\d+)*/);
      return match ? match[0] : "";
    };

    const aNum = getNum(a.wcagCriterion);
    const bNum = getNum(b.wcagCriterion);

    const aParts = aNum.split(".").map((n) => (Number.isNaN(+n) ? 0 : +n));
    const bParts = bNum.split(".").map((n) => (Number.isNaN(+n) ? 0 : +n));

    const len = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < len; i++) {
      const av = aParts[i] ?? 0;
      const bv = bParts[i] ?? 0;
      if (av !== bv) return av - bv;
    }
    return 0;
  });

  // Split HCI text into paragraphs instead of one big wall
  const hciParagraphs =
    typeof hciText === "string"
      ? hciText
          .split(/\n{2,}|\r?\n/) // split on double or single newlines
          .map((p) => p.trim())
          .filter(Boolean)
      : [];
  // Map WCAG criterion to principle
  const getPrincipleFromCriterion = (criterion) => {
    if (!criterion) return null;
    const match = String(criterion)
      .trim()
      .match(/^(\d+)/);
    if (!match) return null;
    const num = match[1];
    switch (num) {
      case "1":
        return "Perceivable";
      case "2":
        return "Operable";
      case "3":
        return "Understandable";
      case "4":
        return "Robust";
      default:
        return null;
    }
  };

  const groupedByPrinciple = {
    Perceivable: [],
    Operable: [],
    Understandable: [],
    Robust: [],
  };

  groups.forEach((g) => {
    const principle = getPrincipleFromCriterion(g.wcagCriterion);
    if (principle && groupedByPrinciple[principle]) {
      groupedByPrinciple[principle].push(g);
    }
  });

  const severityCounts = groups.reduce(
    (acc, g) => {
      const sev = (g.severity || "").toLowerCase();
      const count = g.count || 0;
      if (sev === "high") acc.high += count;
      else if (sev === "medium") acc.medium += count;
      else if (sev === "low") acc.low += count;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const totalIssues =
    severityCounts.high + severityCounts.medium + severityCounts.low;

  const nextSteps =
    Array.isArray(ai.nextSteps) && ai.nextSteps.length > 0
      ? ai.nextSteps
      : groups
          .map((g) => g.recommendation)
          .filter(Boolean)
          .slice(0, 5);

  const toggleCategory = (name) => {
    setExpandedCategories((prev) => {
      const isOpen = !!prev[name];

      // close all, then (maybe) open the clicked one
      return {
        Perceivable: false,
        Operable: false,
        Understandable: false,
        Robust: false,
        [name]: !isOpen, // if it was open, close it; if closed, open it
      };
    });
  };

  const categories = [
    { key: "Perceivable", score: perceivableScore },
    { key: "Operable", score: operableScore },
    { key: "Understandable", score: understandableScore },
    { key: "Robust", score: robustScore },
  ];

  return (
    <>
      <div className="navbar">
        <button className="back-button" onClick={handleBack}>
          <svg
            width="55"
            height="55"
            viewBox="0 0 55 55"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M34.375 41.25L20.625 27.5L34.375 13.75"
              stroke="#7C8DA0"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Home Page
        </button>
        <h1>Analyzation</h1>
      </div>

      <div className="card-body">
        {/* Loading state */}
        {loading && (
          <div className="hci-report">
            <h2>Analyzing...</h2>
            <p className="subheader">
              Running WCAG 2.2 + HCI analysis for:
              <br />
              <strong>{url}</strong>
            </p>
            <p className="loading-step-text">{loadingStep}</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="hci-report">
            <h2>Something went wrong</h2>
            <p>{error}</p>
          </div>
        )}

        {/* Results state */}
        {!loading && !error && analysis && (
          <>
            <div className="scores">
              <h2>Scores</h2>
              <div className="score-body">
                <div className="score-content">
                  <p className="subheader">
                    URL:&nbsp;
                    <a
                      href={analysis.url || url}
                      target="_blank"
                      rel="noreferrer"
                      className="analyzed-url"
                    >
                      {analysis.url || url}
                    </a>
                  </p>

                  {/* Overall score donut */}
                  {score !== null && (
                    <div className="overall-score">
                      <ScoreCircle value={score} label="Overall WCAG Score" />
                      <div className="overall-score-text">
                        <p className="subheader">Overall Accessibility</p>
                        <p className="overall-score-number">
                          <strong>{score}</strong> / 100
                        </p>
                        <p className="overall-score-hint">
                          Higher scores indicate better alignment with WCAG 2.2
                          and AODA.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Category donuts + dropdowns */}
                  <div className="category-section">
                    <p className="subheader">
                      Category Scores (WCAG 2.2 – POUR)
                    </p>
                    <div className="category-grid">
                      {categories.map(
                        (cat) =>
                          cat.score !== null && (
                            <div
                              className="category-card"
                              key={cat.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleCategory(cat.key)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleCategory(cat.key);
                                }
                              }}
                            >
                              {/* Header (title + % + chevron) */}
                              <div className="category-header">
                                <div className="category-header-main">
                                  <span className="category-title">
                                    {cat.key}
                                  </span>
                                  <span className="category-score-label">
                                    {cat.score}%
                                  </span>
                                </div>

                                <span
                                  className={
                                    expandedCategories[cat.key]
                                      ? "chevron chevron-open"
                                      : "chevron"
                                  }
                                  aria-hidden="true"
                                >
                                  ▾
                                </span>
                              </div>

                              {/* Donut circle for the category */}
                              <div className="category-circle-wrapper">
                                <ScoreCircle
                                  value={cat.score}
                                  size={100}
                                  strokeWidth={10}
                                  label={`${cat.key} score`}
                                />
                              </div>

                              {/* Dropdown content */}
                              {expandedCategories[cat.key] && (
                                <div className="category-details category-details-open">
                                  <p className="category-details-intro">
                                    WCAG issues related to{" "}
                                    {cat.key.toLowerCase()}:
                                  </p>

                                  {groupedByPrinciple[cat.key] &&
                                  groupedByPrinciple[cat.key].length > 0 ? (
                                    groupedByPrinciple[cat.key].map(
                                      (g, idx) => (
                                        <div key={idx} className="issue-item">
                                          <p>
                                            <strong>
                                              {g.wcagCriterion ||
                                                "Unspecified criterion"}
                                            </strong>{" "}
                                            {g.severity && (
                                              <>
                                                •{" "}
                                                <span>
                                                  {g.severity} severity
                                                </span>
                                              </>
                                            )}
                                            {typeof g.count === "number" && (
                                              <>
                                                {" "}
                                                • approx. {g.count} occurrence
                                                {g.count === 1 ? "" : "s"}
                                              </>
                                            )}
                                          </p>

                                          {g.problem && (
                                            <p className="issue-problem">
                                              <strong>Problem:</strong>{" "}
                                              {g.problem}
                                            </p>
                                          )}

                                          {g.recommendation && (
                                            <p className="issue-recommendation">
                                              <strong>Recommendation:</strong>{" "}
                                              {g.recommendation}
                                            </p>
                                          )}
                                        </div>
                                      )
                                    )
                                  ) : (
                                    <p className="no-issues">
                                      No specific WCAG issues were identified
                                      for this category.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                      )}
                    </div>
                  </div>

                  {/* Conformance level scores */}
                  {(levelAScore !== null ||
                    levelAAScore !== null ||
                    levelAAAScore !== null) && (
                    <div className="level-scores">
                      <p className="subheader">Conformance Levels</p>
                      {levelAScore !== null && (
                        <p>
                          Level A: <strong>{levelAScore}</strong>%
                        </p>
                      )}
                      {levelAAScore !== null && (
                        <p>
                          Level AA: <strong>{levelAAScore}</strong>%
                        </p>
                      )}
                      {levelAAAScore !== null && (
                        <p>
                          Level AAA: <strong>{levelAAAScore}</strong>%
                        </p>
                      )}
                      <div className="level-explanations">
                        <p>
                          <strong>Level A</strong> – The most basic, critical
                          accessibility requirements. If these fail, many users
                          with disabilities may not be able to use the site at
                          all.
                        </p>
                        <p>
                          <strong>Level AA</strong> – The industry-standard
                          target (and the minimum required by AODA). Addresses a
                          wider range of barriers, including colour contrast and
                          predictable navigation.
                        </p>
                        <p>
                          <strong>Level AAA</strong> – The highest level. These
                          are advanced improvements that make the experience
                          very accessible, but are not usually required by law.
                        </p>
                      </div>
                    </div>
                  )}

                  <p>Total Issues: {totalIssues}</p>
                  <p>High Severity: {severityCounts.high}</p>
                  <p>Medium Severity: {severityCounts.medium}</p>
                  <p>Low Severity: {severityCounts.low}</p>
                </div>
              </div>
            </div>

            <div className="hci-report">
              <h2>HCI Report</h2>
              {hciParagraphs.length > 0 ? (
                hciParagraphs.map((para, idx) => <p key={idx}>{para}</p>)
              ) : (
                <p>{hciText}</p>
              )}
            </div>

            <div className="next-steps">
              <h2>Next Steps</h2>
              {nextSteps.length === 0 ? (
                <p>No specific recommendations were generated.</p>
              ) : (
                <ul>
                  {nextSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <footer>
        <h2>Acessa</h2>
      </footer>
    </>
  );
}

export default Complete;
