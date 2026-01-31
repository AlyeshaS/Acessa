import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/App.css";
import "../styles/index.css";
// import VisualImprovements from "../components/VisualImprovements.jsx";

// Lightweight ScoreCircle reused from Complete
function ScoreCircle({ value = 0, size = 120, strokeWidth = 12, label }) {
  const clamped = Math.max(0, Math.min(100, value));
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
        <circle
          className="score-circle-track"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="score-circle-progress"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
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

function AnalysisPlayer({ result, onComplete, onImageLoad }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const steps = result?.steps || [];
  const screenshot = result?.screenshot;
  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!steps.length) {
      if (onComplete) onComplete();
      return;
    }

    setCurrentIndex(0);
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= steps.length) {
          clearInterval(interval);
          if (onComplete) onComplete();
          return prev;
        }
        return next;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [steps, onComplete]);

  const currentStep = steps[currentIndex];

  // compute scaled coordinates for display
  const scaled = (val) => Math.round((val || 0) * (scale || 1));

  const handleImgLoad = (e) => {
    try {
      const img = e.target;
      const natural = img.naturalWidth || 1280;
      const clientW = img.clientWidth || natural;
      const s = clientW / natural;
      setScale(s || 1);
      // notify parent that image has loaded so progress can start
      try {
        if (typeof onImageLoad === "function") onImageLoad();
      } catch (err) {}
    } catch (err) {
      setScale(1);
    }
  };

  return (
    <div className="analysis-player-single">
      <div
        className="analysis-image-wrapper"
        style={{
          position: "relative",
          maxWidth: 480,
          margin: "0 auto",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #1f2933",
          background: "rgba(15,23,42,0.8)",
        }}
      >
        {screenshot && (
          <img
            ref={imgRef}
            src={screenshot}
            alt="Preview"
            className="analysis-screenshot"
            style={{ width: "100%", height: "auto", display: "block" }}
            onLoad={handleImgLoad}
          />
        )}

        {currentStep?.type === "click" && (
          <div
            style={{
              position: "absolute",
              left: scaled(currentStep.x) - Math.round(12 * scale),
              top: scaled(currentStep.y) - Math.round(12 * scale),
              width: Math.round(24 * scale),
              height: Math.round(24 * scale),
              borderRadius: 999,
              border: `${Math.max(2, Math.round(3 * scale))}px solid #E6892C`,
              boxShadow: `0 0 ${Math.round(14 * scale)}px rgba(230,137,44,0.8)`,
              pointerEvents: "none",
              transition: "all 0.2s ease-out",
              zIndex: 5,
            }}
          />
        )}

        {currentStep?.type === "highlight" && (
          <div
            style={{
              position: "absolute",
              left: scaled(currentStep.x),
              top: scaled(currentStep.y),
              width: scaled(currentStep.width),
              height: scaled(currentStep.height),
              borderRadius: 10,
              border: `${Math.max(2, Math.round(3 * scale))}px solid #189B97`,
              boxShadow: `0 0 0 ${Math.round(
                4 * scale,
              )}px rgba(124,138,160,0.35)`,
              background: "rgba(124,138,160,0.1)",
              pointerEvents: "none",
              transition: "all 0.2s ease-out",
              zIndex: 4,
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            borderRadius: 999,
            fontSize: 10,
            padding: "4px 10px",
            background: "rgba(15,23,42,0.9)",
            color: "#cbd5f5",
            border: "1px solid rgba(148,163,184,0.6)",
            zIndex: 10,
          }}
        >
          Step {Math.min(currentIndex + 1, steps.length)} of {steps.length || 1}
        </div>

        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: 10,
            borderRadius: 10,
            padding: "8px 10px",
            background: "rgba(15,23,42,0.93)",
            color: "#e5e7eb",
            fontSize: 11,
            lineHeight: 1.4,
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 11,
              marginBottom: 4,
              color: "#f9fafb",
            }}
          >
            {currentStep?.type === "click"
              ? "Simulating user interaction"
              : currentStep?.type === "highlight"
                ? "Highlighting a potential issue"
                : "Analyzing your page"}
          </div>
          <div>
            {currentStep?.label ||
              currentStep?.issue ||
              "Preparing accessibility insights…"}
          </div>
        </div>
      </div>

      <p
        style={{
          marginTop: 8,
          fontSize: 11,
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        Acessa is visually replaying how it reviewed this page for
        accessibility.
      </p>
    </div>
  );
}

function Visual() {
  const location = useLocation();
  const navigate = useNavigate();
  const url = location.state?.url;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null); // {screenshot, steps}
  const [analysis, setAnalysis] = useState(null);
  const [progress, setProgress] = useState(0);
  const [segments, setSegments] = useState([]);
  const [pendingAnalysis, setPendingAnalysis] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!url) {
      setError("No URL provided. Please return to home and enter a URL.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        // Open an EventSource to receive streamed updates from the server.
        const streamUrl = `http://localhost:4000/api/wcag-visual-stream?url=${encodeURIComponent(
          url,
        )}`;

        const evt = new EventSource(streamUrl);

        // initialize progress
        setProgress(5);

        evt.addEventListener("preview", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            if (payload.screenshot) {
              setPreview({
                screenshot: payload.screenshot,
                steps: Array.isArray(payload.steps) ? payload.steps : [],
              });
              // reset image/load/animation state for the new preview
              setImageLoaded(false);
              setAnimating(false);
            }
            setProgress((p) => Math.max(p, 10));
          } catch (err) {
            console.error("preview parse", err);
          }
        });

        evt.addEventListener("segment", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            setSegments((prev) => {
              const copy = [...prev];
              copy[payload.index] = {
                screenshot: payload.screenshot,
                clip: payload.clip,
                description: "Capturing segment...",
              };
              return copy;
            });
            setProgress((p) => Math.min(90, p + 15));
          } catch (err) {
            console.error("segment parse", err);
          }
        });

        evt.addEventListener("segmentAnalysis", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            setSegments((prev) => {
              const copy = [...prev];
              const existing = copy[payload.index] || {};
              existing.aiAnalysis = payload.aiAnalysis || null;
              existing.description = payload.aiAnalysis
                ? payload.aiAnalysis.overallSummary ||
                  payload.aiAnalysis.hciSummary ||
                  ""
                : payload.error ||
                  existing.description ||
                  "Analysis unavailable";
              copy[payload.index] = existing;
              return copy;
            });
            setProgress((p) => Math.min(95, p + 10));
          } catch (err) {
            console.error("segmentAnalysis parse", err);
          }
        });

        evt.addEventListener("result", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            // Defer final analysis application until the preview animation finishes
            setPendingAnalysis(payload);
            setSegments(
              Array.isArray(payload.breakdown) ? payload.breakdown : [],
            );
            // do not force progress to 100% here; wait for animation to finish
          } catch (err) {
            console.error("result parse", err);
          }
        });

        evt.addEventListener("done", () => {
          // keep loading true until animation completes and applies pendingAnalysis
          try {
            evt.close();
          } catch (err) {}
        });

        evt.onerror = (err) => {
          console.error("SSE error", err);
          setError("Streaming connection failed");
          setLoading(false);
          try {
            evt.close();
          } catch (e) {}
        };

        // cleanup: close EventSource on abort
        signal.addEventListener("abort", () => {
          try {
            evt.close();
          } catch (e) {}
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setError(err.message || "Something went wrong");
        setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [url]);

  // Loading bar progress similar to Complete page
  useEffect(() => {
    let interval = null;
    if (loading) {
      if (!imageLoaded) {
        // wait for image to load before advancing
        setProgress(0);
      } else {
        interval = setInterval(() => {
          setProgress((prev) => {
            const inc = 4 + Math.floor(Math.random() * 5);
            if (animating) {
              // while animation runs, cap at 70%
              if (prev >= 70) return prev;
              return Math.min(70, prev + inc);
            }
            // animation finished: continue to near-completion
            if (prev >= 99) return prev;
            return Math.min(99, prev + inc);
          });
        }, 600);
      }
    } else {
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 800);
      return () => clearTimeout(t);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, imageLoaded, animating]);

  const handleBack = () => navigate("/");

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
        <h1>Visual Analysis</h1>
      </div>

      <div className="card-body">
        {loading && (
          <div className="hci-report">
            <h2>Running visual analysis…</h2>
            <p className="subheader">
              Analyzing: <strong>{url}</strong>
            </p>
            <div
              className="loading-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="loading-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="loading-bar-text">
              Preparing visual analysis… {progress}%
            </p>
            {preview && (
              <AnalysisPlayer
                result={preview}
                onImageLoad={() => {
                  // start animation and allow progress to advance
                  setImageLoaded(true);
                  setAnimating(true);
                }}
                onComplete={() => {
                  // animation finished; apply pending analysis if present
                  setAnimating(false);
                  if (pendingAnalysis) {
                    setAnalysis(pendingAnalysis);
                    setPendingAnalysis(null);
                  }
                  setLoading(false);
                }}
              />
            )}
          </div>
        )}

        {!loading && error && (
          <div className="hci-report">
            <h2>Error</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && analysis && (
          <div>
            <div className="scores">
              <h2>Scores</h2>
              <div className="score-body">
                <div className="score-content">
                  <p className="subheader">
                    URL:{" "}
                    <a href={url} target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  </p>

                  {typeof analysis.score === "number" && (
                    <p>
                      WCAG Accessibility Score:{" "}
                      <strong>{analysis.score}</strong> / 100
                    </p>
                  )}

                  <p>
                    Total Issues:{" "}
                    {Array.isArray(analysis.groups)
                      ? analysis.groups.length
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="hci-report">
              <h2>HCI Report</h2>
              <p>{analysis.hciSummary || analysis.overallSummary}</p>
            </div>

            <div className="next-steps">
              <h2>Next Steps</h2>
              {Array.isArray(analysis.nextSteps) &&
              analysis.nextSteps.length > 0 ? (
                <ul>
                  {analysis.nextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p>No recommendations were generated.</p>
              )}
            </div>

            {segments && segments.length > 0 && (
              <div className="hci-report">
                <div className="segment-list">
                  <h2>Visual Segments</h2>
                  {segments.map((seg, i) => (
                    <div
                      key={i}
                      className="segment-card"
                      style={{ display: "flex", gap: 16, marginBottom: 18 }}
                    >
                      <div style={{ width: 320 }}>
                        <img
                          src={seg.screenshot}
                          alt={`segment-${i}`}
                          style={{
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid #111",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3>Segment {i + 1}</h3>
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {seg.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer>
        <h2>Acessa</h2>
      </footer>
    </>
  );
}

export default Visual;
