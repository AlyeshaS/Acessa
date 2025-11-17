// src/pages/Complete.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/App.css";
import "../styles/index.css";

function Complete() {
  const navigate = useNavigate();
  const location = useLocation();
  const url = location.state?.url;

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

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

  const handleBack = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    navigate("/");
  };

  // Safely unwrap aiAnalysis JSON
  const ai = analysis?.aiAnalysis || {};

  const score = typeof ai.score === "number" ? ai.score : null;
  const groups = Array.isArray(ai.groups) ? ai.groups : [];
  const overallSummary = ai.overallSummary || "";
  const hciText = ai.hciSummary || overallSummary;

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

                  {score !== null && (
                    <p>
                      WCAG Accessibility Score: <strong>{score}</strong> / 100
                    </p>
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
              <p>{hciText}</p>
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
