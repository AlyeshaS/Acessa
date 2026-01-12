import React, { useEffect, useRef, useState } from "react";
import { aiModifyHtml } from "../api/wcagAPI";
// import IframePreview from "../components/IFramePreview.jsx";
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

/**
 * Shows live Playwright browser feed as it checks the page
 */
function AnalysisPlayer({ result, onComplete, onImageLoad }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const steps = result?.steps || [];
  const screenshot = result?.screenshot;
  const imgRef = useRef(null);

  useEffect(() => {
    if (steps.length === 0) return;

    // Advance through steps as they arrive
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= steps.length - 1) {
          return prev; // wait for more steps
        }
        return prev + 1;
      });
    }, 800); // slower pace to see each check

    return () => clearInterval(interval);
  }, [steps.length]);

  // Detect when animation is complete
  useEffect(() => {
    if (steps.length === 0) return;

    const timeout = setTimeout(() => {
      if (currentIndex >= steps.length - 1 && onComplete) {
        onComplete();
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [currentIndex, steps.length, onComplete]);

  const currentStep = steps[currentIndex];
  const currentScreenshot = currentStep?.screenshot || screenshot;
  const offsetX = currentStep?.offsetX || 0;
  const offsetY = currentStep?.offsetY || 0;
  const [scale, setScale] = useState(1);

  const handleImgLoad = (e) => {
    try {
      const img = e.target;
      const natural = img.naturalWidth || 1280;
      const clientW = img.clientWidth || natural;
      const s = clientW / natural;
      setScale(s || 1);
      if (typeof onImageLoad === "function") onImageLoad();
    } catch (err) {
      setScale(1);
    }
  };

  const scaled = (val) => Math.round((val || 0) * (scale || 1));

  return (
    <div className="analysis-player-single">
      {/* Live browser view */}
      <div
        className="analysis-image-wrapper"
        style={{
          position: "relative",
          maxWidth: "600px",
          margin: "0 auto",
          borderRadius: "14px",
          overflow: "hidden",
          border: "2px solid var(--color-accent)",
          background: "rgba(15,23,42,0.8)",
          boxShadow: "0 4px 20px rgba(24,155,151,0.3)",
        }}
      >
        {/* Single screenshot with client-side overlays */}
        <img
          ref={imgRef}
          src={currentScreenshot}
          alt="Live Playwright browser view"
          className="analysis-screenshot"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
          onLoad={handleImgLoad}
        />

        {/* Draw click circle overlay */}
        {currentStep?.type === "click" && (
          <div
            style={{
              position: "absolute",
              left: scaled(currentStep.x - offsetX) - Math.round(18 * scale),
              top: scaled(currentStep.y - offsetY) - Math.round(18 * scale),
              width: Math.round(36 * scale),
              height: Math.round(36 * scale),
              borderRadius: "50%",
              border: `${Math.max(3, Math.round(5 * scale))}px solid #E6892C`,
              boxShadow: `0 0 ${Math.round(25 * scale)}px rgba(230,137,44,0.8)`,
              background: "rgba(230,137,44,0.2)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          />
        )}

        {/* Draw highlight box overlay */}
        {currentStep?.type === "highlight" && (
          <div
            style={{
              position: "absolute",
              left: scaled(currentStep.x - offsetX),
              top: scaled(currentStep.y - offsetY),
              width: scaled(currentStep.width),
              height: scaled(currentStep.height),
              borderRadius: "8px",
              border: `${Math.max(3, Math.round(4 * scale))}px solid #189B97`,
              boxShadow: `0 0 0 ${Math.round(
                8 * scale
              )}px rgba(24,155,151,0.25)`,
              background: "rgba(24,155,151,0.15)",
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        )}

        {/* Status overlay showing what's being checked */}
        <div
          className="analysis-status-overlay"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "12px 16px",
            background:
              "linear-gradient(to top, rgba(15,23,42,0.95), rgba(15,23,42,0.85), transparent)",
            color: "#e5e7eb",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: "#189B97", marginBottom: 4 }}>
            🔍 Live Accessibility Scan
          </div>
          <div>{currentStep?.label || "Preparing scan..."}</div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: 4 }}>
            Step {Math.min(currentIndex + 1, steps.length)} of{" "}
            {steps.length || "..."}
          </div>
        </div>
      </div>

      <p
        style={{
          marginTop: "12px",
          fontSize: "12px",
          textAlign: "center",
          color: "#9ca3af",
          fontStyle: "italic",
        }}
      >
        Watching Playwright check accessibility in real-time
      </p>
    </div>
  );
}

function LightboxBeforeAfter({
  screenshot,
  loadingAfter,
  afterData,
  markers = [],
  onAfterClick,
}) {
  const [view, setView] = useState("before");
  const [requestedAfter, setRequestedAfter] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef();

  // Animate progress while loadingAfter
  useEffect(() => {
    if (requestedAfter && loadingAfter) {
      setProgress(0);
      if (progressRef.current) clearInterval(progressRef.current);
      progressRef.current = setInterval(() => {
        setProgress((prev) => Math.min(100, prev + 7));
      }, 100);
    } else if (!loadingAfter && requestedAfter) {
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [requestedAfter, loadingAfter]);

  const activeBg = "#7c8da0";
  const activeText = "#e4e7ed";
  const inactiveBg = "#5d6a78";
  const inactiveText = "#e4e7ed";

  // Pick up to 6 markers to overlay (avoid clutter)
  const safeMarkers = Array.isArray(markers) ? markers.slice(0, 6) : [];

  // Manage hovered state for each marker
  const [hoveredIndexes, setHoveredIndexes] = useState(
    Array(safeMarkers.length).fill(false)
  );

  // Scaling logic for overlays
  const imgRef = useRef(null);
  const [imgDims, setImgDims] = useState({
    naturalWidth: 1,
    naturalHeight: 1,
    clientWidth: 1,
    clientHeight: 1,
  });
  useEffect(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const updateDims = () => {
      setImgDims({
        naturalWidth: img.naturalWidth || 1,
        naturalHeight: img.naturalHeight || 1,
        clientWidth: img.clientWidth || 1,
        clientHeight: img.clientHeight || 1,
      });
    };
    img.addEventListener("load", updateDims);
    updateDims();
    return () => img.removeEventListener("load", updateDims);
  }, [screenshot, view, requestedAfter]);

  const scaleX = imgDims.clientWidth / imgDims.naturalWidth;
  const scaleY = imgDims.clientHeight / imgDims.naturalHeight;

  // Clamp helper
  const clamp = (val, min = 0) => Math.max(min, val);

  return (
    <div style={{ position: "relative", textAlign: "center" }}>
      {/* Toggle */}
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setView("before")}
          style={{
            padding: "6px 18px",
            borderRadius: 6,
            border: "none",
            background: view === "before" ? activeBg : inactiveBg,
            color: view === "before" ? activeText : inactiveText,
            fontWeight: view === "before" ? 700 : 400,
            cursor: "pointer",
          }}
        >
          Before
        </button>

        <button
          type="button"
          onClick={() => {
            setView("after");
            setRequestedAfter(true);
            onAfterClick?.();
          }}
          style={{
            padding: "6px 18px",
            borderRadius: 6,
            border: "none",
            background: view === "after" ? activeBg : inactiveBg,
            color: view === "after" ? activeText : inactiveText,
            fontWeight: view === "after" ? 700 : 400,
            cursor: "pointer",
          }}
        >
          After
        </button>
      </div>

      {/* IMAGE AREA */}
      <div style={{ minHeight: 410 }}>
        {/* BEFORE */}
        {view === "before" && (
          <img
            ref={imgRef}
            src={screenshot}
            alt="Before screenshot"
            style={{
              width: "100%",
              height: 410,
              objectFit: "contain",
              borderRadius: 8,
              border: "1px solid #111",
              background: inactiveBg,
            }}
          />
        )}

        {/* AFTER */}
        {view === "after" && (
          <>
            {!requestedAfter && (
              <div style={{ color: "#888" }}>
                Click “After” to generate overlay preview.
              </div>
            )}

            {requestedAfter && (loadingAfter || progress < 100) && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 410,
                }}
              >
                <ScoreCircle
                  value={progress}
                  size={80}
                  strokeWidth={10}
                  label={"Loading..."}
                />
                <div style={{ color: "#888", marginTop: 12 }}>
                  Generating recommended overlay…
                </div>
              </div>
            )}

            {requestedAfter && progress === 100 && !loadingAfter && (
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 410,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #111",
                  background: inactiveBg,
                }}
              >
                {/* Same screenshot */}
                <img
                  ref={imgRef}
                  src={screenshot}
                  alt="After screenshot with overlays"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />

                {/* Overlay layer */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.35)",
                    zIndex: 1,
                  }}
                >
                  {safeMarkers.map((m, i) => {
                    // Tooltip content: prefer summary, fallback to recommendation
                    const tooltip =
                      m.summary ||
                      m.recommendation ||
                      "Accessibility improvement";
                    // Defensive: clamp and scale
                    const left = clamp((m.x || 0) * scaleX);
                    const top = clamp((m.y || 0) * scaleY);
                    const width = clamp((m.width || 0) * scaleX);
                    const height = clamp((m.height || 0) * scaleY);
                    return (
                      <div
                        key={`${m.selector || "m"}-${i}`}
                        style={{
                          position: "absolute",
                          left,
                          top,
                          width,
                          height,
                          borderRadius: 6,
                          border: "3px solid #ff4d4f",
                          background: "rgba(255,77,79,0.15)",
                          zIndex: 2,
                          cursor: "pointer",
                          pointerEvents: "auto",
                        }}
                        onMouseEnter={() => {
                          setHoveredIndexes((prev) => {
                            const arr = [...prev];
                            arr[i] = true;
                            return arr;
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredIndexes((prev) => {
                            const arr = [...prev];
                            arr[i] = false;
                            return arr;
                          });
                        }}
                        tabIndex={0}
                        aria-label={tooltip}
                      >
                        {hoveredIndexes[i] && (
                          <div
                            style={{
                              position: "absolute",
                              top: -38,
                              left: 0,
                              background: "#222",
                              color: "#fff",
                              padding: "6px 12px",
                              borderRadius: 6,
                              fontSize: 13,
                              whiteSpace: "pre-line",
                              zIndex: 10,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                              pointerEvents: "none",
                              maxWidth: 260,
                            }}
                            role="tooltip"
                          >
                            {tooltip}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 6,
                    color: "#189B97",
                  }}
                >
                  Suggested CSS snippet
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Complete() {
  const navigate = useNavigate();
  const location = useLocation();
  const url = location.state?.url;

  const [loading, setLoading] = useState(true); // network / initial state
  const [analysis, setAnalysis] = useState(null); // full backend response
  const [error, setError] = useState(null);

  const [progress, setProgress] = useState(0);
  const [screenshotProgress, setScreenshotProgress] = useState(0);
  const [aiScreenshotProgress, setAiScreenshotProgress] = useState(0);
  const [pagesVisited, setPagesVisited] = useState(0);
  const [violationsFound, setViolationsFound] = useState(0);
  const [duplicatesSkipped, setDuplicatesSkipped] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);

  // NEW: "animation" state – we show AnalysisPlayer while this is true
  const [animating, setAnimating] = useState(false);
  const [previewResult, setPreviewResult] = useState(null); // { screenshot, steps }
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pendingResult, setPendingResult] = useState(null);

  // NEW: Visual segments with images and comments (merged from Visual page)
  const [segments, setSegments] = useState([]);
  const [pendingSegments, setPendingSegments] = useState([]);

  // NEW: Violation screenshots with interactive feedback
  const [violationScreenshots, setViolationScreenshots] = useState([]);
  const [selectedViolation, setSelectedViolation] = useState(null);

  const [lightbox, setLightbox] = useState(null); // fullscreen view of a screenshot + issue panel

  // Per-violation AI preview state
  const [aiModResults, setAiModResults] = useState({}); // { [idx]: result }
  const [aiModLoading, setAiModLoading] = useState({}); // { [idx]: boolean }

  // Which categories are expanded in the UI
  const [expandedCategories, setExpandedCategories] = useState({
    Perceivable: false,
    Operable: false,
    Understandable: false,
    Robust: false,
  });

  // AbortController stored in a ref so we can cancel on Back
  const abortRef = useRef(null);

  const handleAfterClick = async (idx, violation) => {
    // 🔑 BUILD FEEDBACK HERE (this was missing)
    const feedback = {
      summary:
        violation?.aiFeedback?.summary ||
        violation?.problem ||
        "Accessibility issue detected.",

      recommendation:
        violation?.aiFeedback?.recommendation ||
        violation?.recommendation ||
        "Improve visual accessibility.",

      problemCategory:
        violation?.wcagCriterion || violation?.problemCategory || "visual",
    };

    // set loading for THIS item
    setAiModLoading((prev) => ({
      ...prev,
      [idx]: true,
    }));

    try {
      const res = await aiModifyHtml({
        html: typeof analysis?.html === "string" ? analysis.html : "",
        feedback,
        scrollY: typeof violation?.scrollY === "number" ? violation.scrollY : 0,
      });

      setAiModResults((prev) => ({
        ...prev,
        [idx]: res,
      }));
    } catch (err) {
      console.error("AI modify failed", err);
    } finally {
      setAiModLoading((prev) => ({
        ...prev,
        [idx]: false,
      }));
    }
  };

  useEffect(() => {
    console.log("HTML length:", analysis?.html?.length);
  }, [analysis]);

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
        setAnimating(false);
        setAnimationDone(false);
        setPreviewResult(null);
        setAiScreenshotProgress(0);
        setPagesVisited(0);
        setViolationsFound(0);
        setDuplicatesSkipped(0);

        const streamUrl = `http://localhost:4000/api/wcag-check-stream?url=${encodeURIComponent(
          url
        )}`;

        const evt = new EventSource(streamUrl);

        // NEW: Listen for live step events as Axe finds real violations
        evt.addEventListener("step", (e) => {
          try {
            const step = JSON.parse(e.data || "{}");
            setPreviewResult((prev) => {
              const base = prev || { screenshot: null, steps: [] };
              const nextSteps = [...(base.steps || []), step];
              const nextScreenshot = step.screenshot || base.screenshot;
              return {
                ...base,
                screenshot: nextScreenshot,
                steps: nextSteps,
              };
            });
          } catch (err) {
            console.error("[Complete] step parse", err);
          }
        });

        evt.addEventListener("axe", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            if (payload.pagesVisited) setPagesVisited(payload.pagesVisited);
            if (payload.violations) setViolationsFound(payload.violations);
          } catch (err) {
            console.error("[Complete] axe parse", err);
          }
        });

        evt.addEventListener("ai", (e) => {
          // ai status event
        });

        evt.addEventListener("progress", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            if (payload.pagesVisited) setPagesVisited(payload.pagesVisited);
            if (payload.violations) setViolationsFound(payload.violations);
            if (payload.duplicates !== undefined)
              setDuplicatesSkipped(payload.duplicates);
          } catch (err) {
            console.error("[Complete] progress parse", err);
          }
        });

        evt.addEventListener("screenshotAiProgress", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            if (payload.percentage !== undefined) {
              setAiScreenshotProgress(payload.percentage);
            }
          } catch (err) {
            console.error("[Complete] screenshotAiProgress parse", err);
          }
        });

        evt.addEventListener("result", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            // defer applying final analysis until the animation completes
            setPendingResult(payload);
            // Store violation screenshots if provided
            if (
              payload.violationScreenshots &&
              Array.isArray(payload.violationScreenshots)
            ) {
              const scrollY =
                window.scrollY || document.documentElement.scrollTop || 0;
              setViolationScreenshots(
                payload.violationScreenshots.map((vs) => ({
                  ...vs,
                  scrollY:
                    typeof vs.scrollY === "number" ? vs.scrollY : scrollY,
                }))
              );
            }
            // Don't overwrite the live steps - they've already been streamed and are animating
            // The payload.steps are redundant since we already received them as individual "step" events
            if (payload.screenshot) {
              // Update screenshot if it changed, but don't reset steps array
              setPreviewResult((prev) => ({
                ...prev,
                screenshot: payload.screenshot,
              }));
              setAnimating(true);
            }
            // keep loading true; when AnalysisPlayer calls onComplete we'll
            // apply pendingResult and stop animating.
          } catch (err) {
            console.error("[Complete] result parse", err);
          }
        });

        evt.addEventListener("done", () => {
          // keep loading true until animation completes and consumes pendingResult
          try {
            evt.close();
          } catch (err) {}

          // NEW: After HTML analysis stream completes, start visual segment capture
          // This runs in parallel and will populate segments for display after animation
          try {
            const visualStreamUrl = `http://localhost:4000/api/wcag-visual-stream?url=${encodeURIComponent(
              url
            )}`;
            const visualEvt = new EventSource(visualStreamUrl);

            visualEvt.addEventListener("preview", (e) => {
              // Visual preview already shown from HTML stream, skip
            });

            visualEvt.addEventListener("segment", (e) => {
              try {
                const payload = JSON.parse(e.data || "{}");
                setPendingSegments((prev) => {
                  const copy = [...prev];
                  copy[payload.index] = {
                    screenshot: payload.screenshot,
                    clip: payload.clip,
                    description: "Capturing segment...",
                  };
                  return copy;
                });
              } catch (err) {
                console.error("[Complete] segment parse", err);
              }
            });

            visualEvt.addEventListener("segmentAnalysis", (e) => {
              try {
                const payload = JSON.parse(e.data || "{}");
                setPendingSegments((prev) => {
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
              } catch (err) {
                console.error("[Complete] segmentAnalysis parse", err);
              }
            });

            visualEvt.addEventListener("result", (e) => {
              try {
                const payload = JSON.parse(e.data || "{}");
                // Merge breakdown into existing pending segments, preserving clip and aiAnalysis
                if (Array.isArray(payload.breakdown)) {
                  setPendingSegments((prev) => {
                    const next = [...prev];
                    payload.breakdown.forEach((item, i) => {
                      const existing = next[i] || {};
                      next[i] = {
                        screenshot: item.screenshot || existing.screenshot,
                        clip: existing.clip || item.clip || null,
                        aiAnalysis: existing.aiAnalysis || null,
                        description:
                          item.description || existing.description || "",
                      };
                    });
                    return next;
                  });
                }
              } catch (err) {
                console.error("[Complete] visual result parse", err);
              }
            });

            visualEvt.addEventListener("done", () => {
              try {
                visualEvt.close();
              } catch (err) {}
            });

            visualEvt.onerror = (err) => {
              console.error("[Complete] Visual SSE error", err);
              try {
                visualEvt.close();
              } catch (e) {}
            };

            signal.addEventListener("abort", () => {
              try {
                visualEvt.close();
              } catch (e) {}
            });
          } catch (visualErr) {
            console.error(
              "[Complete] Failed to start visual stream:",
              visualErr
            );
          }
        });

        evt.onerror = (err) => {
          console.error("[Complete] SSE error", err);
          setError("Streaming connection failed");
          setLoading(false);
          try {
            evt.close();
          } catch (e) {}
        };

        // cleanup on abort
        signal.addEventListener("abort", () => {
          try {
            evt.close();
          } catch (e) {}
        });
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error(err);
        setError(err.message || "Something went wrong while analyzing.");
        setLoading(false);
      }
    };

    runAnalysis();

    return () => {
      controller.abort();
    };
  }, [url]);

  // Animate loading progress while loading/animating
  useEffect(() => {
    let interval = null;

    // Do not advance progress until the first image is loaded
    if (loading && imageLoaded) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const inc = 3 + Math.floor(Math.random() * 6);

          // Phase targets
          let target = 25; // building steps / grabbing preview
          if (!imageLoaded) {
            target = 25;
          } else if (animating) {
            target = 90; // showing live steps
          } else if (animationDone && analysis) {
            target = 100; // steps done + Gemini finished
          } else if (animationDone && !analysis) {
            target = 90; // waiting on Gemini after steps are done
          }

          const next = prev < target ? Math.min(target, prev + inc) : prev;
          return Math.max(prev, next); // never decrease
        });
      }, 700);
    }

    // Keep progress at 0 while waiting for the first image
    if (loading && !imageLoaded) {
      setProgress(0);
    }

    if (!loading && !animating) {
      setProgress(100);
      const t = setTimeout(() => setProgress(0), 800);
      return () => {
        clearTimeout(t);
        if (interval) clearInterval(interval);
      };
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, animating, imageLoaded, animationDone, analysis]);

  // Animate screenshot fetching progress before the first image arrives
  useEffect(() => {
    let interval = null;

    if (loading && !imageLoaded) {
      setScreenshotProgress(0);
      interval = setInterval(() => {
        setScreenshotProgress((prev) => {
          const inc = 10 + Math.floor(Math.random() * 8);
          if (prev >= 90) return prev;
          return Math.min(90, prev + inc);
        });
      }, 400);
    }

    if (imageLoaded) {
      setScreenshotProgress(100);
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, imageLoaded]);

  // Once animation is done, if a pending result arrived earlier, apply it
  useEffect(() => {
    if (animationDone && pendingResult) {
      const payload = pendingResult;
      setAnalysis({
        ...payload.aiAnalysis,
        url: payload.url,
        html: payload.html,
        stylesheets: payload.stylesheets || [],
      });

      setPendingResult(null);
      if (pendingSegments.length > 0) {
        setSegments(pendingSegments);
      }
    }
  }, [animationDone, pendingResult, pendingSegments]);

  // When animation is done and analysis is available, finish progress and exit loading
  useEffect(() => {
    if (animationDone && analysis && loading) {
      setProgress(100);
      const t = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [animationDone, analysis, loading]);

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
  const categoryExplanations = ai.categoryExplanations || {};
  const scoreBreakdown = ai.scoreBreakdown || {};

  // Score details state
  const [showScoreDetails, setShowScoreDetails] = useState(false);

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
          .split(/\n{2,}|\r?\n/)
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
        [name]: !isOpen,
      };
    });
  };

  const categories = [
    { key: "Perceivable", score: perceivableScore },
    { key: "Operable", score: operableScore },
    { key: "Understandable", score: understandableScore },
    { key: "Robust", score: robustScore },
  ];

  // Map WCAG criterion IDs to friendly, non-technical titles for end-users
  const friendlyTitles = {
    "scrollable-region-focusable": "Keyboard Navigation",
    "button-name": "Button Labels",
    "link-name": "Link Text",
    "color-contrast": "Color Contrast",
    "image-alt": "Image Descriptions",
    "form-field-multiple-labels": "Form Labels",
    "aria-required-attr": "Required Field Indicators",
    "aria-valid-attr": "Input Validation",
    "heading-order": "Heading Structure",
    "list-item": "List Structure",
    "definition-list": "Definition Lists",
    dlitem: "Definition Items",
    "autocomplete-valid": "Autocomplete",
    blink: "Blinking Content",
    "valid-aria-role": "ARIA Roles",
    "text-alternatives": "Text Alternatives",
    "keyboard-access": "Keyboard Access",
    "focus-visible": "Focus Indicators",
    "target-size": "Touch Target Size",
    "page-title": "Page Title",
    language: "Page Language",
    label: "Field Labels",
    "required-inputs": "Required Fields",
    "aria-command-name": "Button or Command Label",
    list: "List Structure or Markup",
  };

  const getFriendlyTitle = (criterion, id) => {
    if (!criterion && !id) return "Accessibility Issue";
    const key = String(criterion || id).toLowerCase();
    return friendlyTitles[key] || criterion || id || "Accessibility Issue";
  };

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
        {/* NETWORK LOADING STATE (before we even have screenshot/steps) */}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="hci-report">
            <h2>Something went wrong</h2>
            <p>{error}</p>
          </div>
        )}

        {(loading || animating) && !error && (
          <div className="hci-report">
            <h2>Analyzing...</h2>
            <p className="subheader">
              Running WCAG 2.2 + HCI analysis for:
              <br />
              <strong>{analysis?.url || url}</strong>
            </p>

            {/* Show "Grabbing landing page" before image loads */}
            {!imageLoaded && (
              <p
                className="loading-status-text"
                style={{
                  fontSize: "14px",
                  color: "#94a3b8",
                  marginTop: "12px",
                  fontStyle: "italic",
                }}
              >
                Grabbing landing page...
              </p>
            )}

            {/* Progress bar and percentage */}
            {!imageLoaded && (
              <>
                <div
                  className="loading-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={screenshotProgress}
                >
                  <div
                    className="loading-bar-fill"
                    style={{ width: `${screenshotProgress}%` }}
                  />
                </div>
                <p className="loading-bar-text">
                  Fetching page snapshot… {screenshotProgress}%
                </p>
              </>
            )}

            {imageLoaded && progress < 100 && !animationDone && (
              <>
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
                <p className="loading-bar-text">Analyzing… {progress}%</p>
              </>
            )}

            {/* Show the third progress bar as soon as animationDone, even if aiScreenshotProgress is 0 */}
            {animationDone && (
              <>
                <div
                  className="loading-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    !loading && !animating && analysis
                      ? 100
                      : Math.min(aiScreenshotProgress, 90)
                  }
                >
                  <div
                    className="loading-bar-fill"
                    style={{
                      width: `${
                        !loading && !animating && analysis
                          ? 100
                          : Math.min(aiScreenshotProgress, 90)
                      }%`,
                    }}
                  />
                </div>
                <p className="loading-bar-text">
                  {(() => {
                    const displayProgress =
                      !loading && !animating && analysis
                        ? 100
                        : Math.min(aiScreenshotProgress, 90);
                    if (displayProgress < 30) {
                      return `Analyzing screenshots… ${displayProgress}%`;
                    } else if (displayProgress < 60) {
                      return `Analyzing screenshots… ${displayProgress}% • Pages viewed: ${
                        pagesVisited || 0
                      }`;
                    } else if (displayProgress < 80) {
                      return `Analyzing screenshots… ${displayProgress}% • Pages viewed: ${
                        pagesVisited || 0
                      } • Violations: ${violationsFound || 0}`;
                    } else if (displayProgress < 100) {
                      return `Analyzing screenshots… ${displayProgress}% • Pages viewed: ${
                        pagesVisited || 0
                      } • Violations: ${violationsFound || 0} • Duplicates: ${
                        duplicatesSkipped || 0
                      }`;
                    } else {
                      return `Analyzing screenshots… 100%`;
                    }
                  })()}
                </p>
              </>
            )}

            {/* As soon as we have screenshot + steps, show the animation under the text */}
            {previewResult && (
              <div className="mt-6">
                <AnalysisPlayer
                  result={previewResult}
                  onImageLoad={() => {
                    setImageLoaded(true);
                    setAnimating(true);
                  }}
                  onComplete={() => {
                    // finish animating; if we have a pending result apply it
                    setAnimating(false);
                    setAnimationDone(true);
                    if (pendingResult) {
                      const payload = pendingResult;
                      setAnalysis(
                        payload.aiAnalysis
                          ? { ...payload.aiAnalysis, url: payload.url }
                          : payload
                      );
                      setPendingResult(null);
                    }
                    // Apply visual segments if available

                    // before and after

                    if (pendingSegments.length > 0) {
                      setSegments(pendingSegments);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {!loading && !error && !animating && analysis && (
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

                        {/* Expandable Score Details */}
                        {/* <button
                          onClick={() => setShowScoreDetails(!showScoreDetails)}
                          style={{
                            marginTop: 12,
                            background: "none",
                            border: "1px solid #189B97",
                            color: "#189B97",
                            padding: "8px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = "#189B97";
                            e.target.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = "none";
                            e.target.style.color = "#189B97";
                          }}
                        >
                          {showScoreDetails ? "Hide" : "Show"} Score Details
                        </button> */}

                        {showScoreDetails && scoreBreakdown && (
                          <div
                            style={{
                              marginTop: 16,
                              padding: 16,
                              background: "#f9f9f9",
                              borderRadius: 8,
                              border: "1px solid #e0e0e0",
                            }}
                          >
                            <h4
                              style={{
                                margin: "0 0 12px 0",
                                fontSize: "13px",
                                color: "#189B97",
                              }}
                            >
                              Score Calculation Breakdown
                            </h4>

                            <div
                              style={{ fontSize: "12px", lineHeight: "1.8" }}
                            >
                              {scoreBreakdown.highCount !== undefined && (
                                <div>
                                  <strong>Severity Distribution:</strong>
                                  <div style={{ marginLeft: 16, marginTop: 8 }}>
                                    <div style={{ marginBottom: 6 }}>
                                      🔴 <strong>High Severity:</strong>{" "}
                                      {scoreBreakdown.highCount} violation
                                      {scoreBreakdown.highCount !== 1
                                        ? "s"
                                        : ""}{" "}
                                      ({scoreBreakdown.highCount * 3} points)
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                      🟠 <strong>Medium Severity:</strong>{" "}
                                      {scoreBreakdown.mediumCount} violation
                                      {scoreBreakdown.mediumCount !== 1
                                        ? "s"
                                        : ""}{" "}
                                      ({scoreBreakdown.mediumCount * 2} points)
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                      🟡 <strong>Low Severity:</strong>{" "}
                                      {scoreBreakdown.lowCount} violation
                                      {scoreBreakdown.lowCount !== 1
                                        ? "s"
                                        : ""}{" "}
                                      ({scoreBreakdown.lowCount * 1} point
                                      {scoreBreakdown.lowCount !== 1 ? "s" : ""}
                                      )
                                    </div>
                                  </div>
                                </div>
                              )}

                              {scoreBreakdown.deductedPoints !== undefined && (
                                <div
                                  style={{
                                    marginTop: 12,
                                    paddingTop: 12,
                                    borderTop: "1px solid #ddd",
                                  }}
                                >
                                  <strong>Points Calculation:</strong>
                                  <div style={{ marginLeft: 16, marginTop: 8 }}>
                                    <div
                                      style={{ marginBottom: 4, color: "#555" }}
                                    >
                                      {scoreBreakdown.explanation}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
                                  {categoryExplanations[cat.key] && (
                                    <div
                                      style={{
                                        background: "#f5f5f5",
                                        padding: "12px",
                                        borderRadius: "8px",
                                        marginBottom: "12px",
                                        fontSize: "13px",
                                        lineHeight: "1.6",
                                        borderLeft: "4px solid #189B97",
                                      }}
                                    >
                                      <strong style={{ color: "#189B97" }}>
                                        Why this score:
                                      </strong>
                                      <p
                                        style={{
                                          margin: "8px 0 0 0",
                                          whiteSpace: "pre-wrap",
                                        }}
                                      >
                                        {categoryExplanations[cat.key]}
                                      </p>
                                    </div>
                                  )}
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

                      {/* Level A */}
                      {levelAScore !== null && (
                        <div className="level-row">
                          <p>
                            Level A: <strong>{levelAScore}</strong>%
                          </p>
                          <span
                            className="info-icon"
                            data-tooltip="Level A requirements are the most basic accessibility rules. If these fail, some users with disabilities may not be able to use the site at all."
                          >
                            ⓘ
                          </span>
                        </div>
                      )}

                      {/* Level AA */}
                      {levelAAScore !== null && (
                        <div className="level-row">
                          <p>
                            Level AA: <strong>{levelAAScore}</strong>%
                          </p>
                          <span
                            className="info-icon"
                            data-tooltip="Level AA is the industry standard and required by AODA. It includes important usability requirements such as colour contrast, predictable navigation, and error identification."
                          >
                            ⓘ
                          </span>
                        </div>
                      )}

                      {/* Level AAA */}
                      {levelAAAScore !== null && (
                        <div className="level-row">
                          <p>
                            Level AAA: <strong>{levelAAAScore}</strong>%
                          </p>
                          <span
                            className="info-icon"
                            data-tooltip="Level AAA is the highest standard and includes advanced accessibility enhancements. It is not required by law and is often optional."
                          >
                            ⓘ
                          </span>
                        </div>
                      )}

                      <div className="level-explanations-spacer"></div>
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
                hciParagraphs.map((para, idx) => {
                  // List of keywords to bold
                  const keywords = [
                    "accessibility",
                    "usability",
                    "contrast",
                    "keyboard",
                    "screen reader",
                    "color blindness",
                    "navigation",
                    "focus",
                    "label",
                    "alt text",
                    "ARIA",
                    "compliance",
                    "WCAG",
                    "AODA",
                    "error",
                    "form",
                    "structure",
                    "heading",
                    "landmark",
                    "semantic",
                    "cognitive",
                    "perceivable",
                    "operable",
                    "understandable",
                    "robust",
                  ];
                  // Regex to match keywords (case-insensitive, word boundaries)
                  const regex = new RegExp(
                    `\\b(${keywords.join("|")})\\b`,
                    "gi"
                  );
                  // Replace keywords with bolded version
                  const highlighted = para.replace(
                    regex,
                    (match) => `<strong>${match}</strong>`
                  );
                  return (
                    <p
                      key={idx}
                      dangerouslySetInnerHTML={{ __html: highlighted }}
                    />
                  );
                })
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
            {/* Before and After card: after HCI Report, before Visual Feedback, only in main results */}

            {/* NEW: Violation Screenshots with Interactive Feedback */}
            {violationScreenshots && violationScreenshots.length > 0 && (
              <div className="visual-feedback">
                <h2>Visual Accessibility Feedback</h2>
                <p className="subheader" style={{ marginBottom: 16 }}>
                  Click the expand button (⤢) on each screenshot to view
                  detailed accessibility feedback.
                </p>
                <div className="violation-scroll">
                  {violationScreenshots
                    .filter(
                      (vs) =>
                        Array.isArray(vs?.violations) &&
                        vs.violations.length > 0
                    )
                    .map((vs, idx) => {
                      const violation = vs.violations?.[0];
                      const bounds = vs.bounds || {};
                      const validMarkers = (
                        Array.isArray(vs.markers) ? vs.markers : []
                      ).filter(
                        (m) =>
                          Number.isFinite(m?.x) &&
                          Number.isFinite(m?.y) &&
                          m?.width !== undefined &&
                          m?.height !== undefined
                      );

                      const markers = validMarkers;
                      const severityColor = {
                        1: "#FFA500", // Low - Orange
                        2: "#FF6B6B", // Medium - Red
                        3: "#CC0000", // High - Dark Red
                      }[
                        violation?.impact === "critical" ||
                        violation?.impact === "serious"
                          ? 3
                          : violation?.impact === "moderate"
                          ? 2
                          : 1
                      ];

                      // Pull AI feedback from visual segment analysis for this area
                      const getAiFeedback = (marker) => {
                        if (
                          vs &&
                          vs.aiFeedback &&
                          (vs.aiFeedback.summary ||
                            vs.aiFeedback.recommendation)
                        ) {
                          return {
                            summary: vs.aiFeedback.summary || "",
                            recommendation: vs.aiFeedback.recommendation || "",
                          };
                        }
                        if (
                          !marker ||
                          !Array.isArray(segments) ||
                          segments.length === 0
                        ) {
                          return null;
                        }
                        const centerY =
                          (marker?.y || 0) + (marker?.height || 0) / 2;
                        const candidate = segments.find((seg) => {
                          const clip = seg?.clip;
                          return (
                            clip &&
                            centerY >= clip.y &&
                            centerY <= clip.y + clip.height
                          );
                        });
                        const aiAnalysis = candidate?.aiAnalysis;
                        if (!aiAnalysis) return null;

                        // Try to match WCAG criterion for more specific guidance
                        const wcagKey = vs.wcagCriterion || violation?.id;
                        let matched = null;
                        if (Array.isArray(aiAnalysis.groups)) {
                          matched = aiAnalysis.groups.find(
                            (g) =>
                              g?.wcagCriterion === wcagKey ||
                              g?.wcagCriterion?.includes(wcagKey || "")
                          );
                        }
                        const summary =
                          matched?.problem ||
                          aiAnalysis.overallSummary ||
                          aiAnalysis.hciSummary ||
                          "";
                        const recommendation =
                          matched?.recommendation ||
                          (Array.isArray(aiAnalysis.nextSteps)
                            ? aiAnalysis.nextSteps[0]
                            : "");
                        return { summary, recommendation };
                      };

                      const openLightbox = (marker) => {
                        const aiFeedback = getAiFeedback(marker || markers[0]);

                        // setAfterData(null);
                        // setLoadingAfter(false);

                        setSelectedViolation(vs);

                        // Capture current URL and scrollY for this screenshot
                        const scrollY =
                          typeof vs.scrollY === "number"
                            ? vs.scrollY
                            : window.scrollY ||
                              document.documentElement.scrollTop ||
                              0;
                        const currentUrl = window.location.href;

                        setLightbox({
                          idx,
                          screenshot: vs.screenshot,
                          violation: violation || vs,
                          violations: Array.isArray(vs.violations)
                            ? vs.violations
                            : [],
                          marker: marker || markers[0],
                          severityColor,
                          aiFeedback,
                          scrollY,
                          url: currentUrl,
                        });
                      };

                      // --- AI-powered Interactive Preview Logic ---
                      const aiMod = aiModResults[idx];
                      return (
                        <div key={idx} className="violation-card">
                          <div
                            style={{
                              position: "relative",
                              background: "#f0f0f0",
                              marginBottom: 16,
                            }}
                          >
                            {/* Single expand button per screenshot to fullscreen */}
                            <button
                              className="violation-fullscreen"
                              type="button"
                              aria-label="Expand screenshot and view accessibility feedback"
                              title="Expand"
                              onClick={() => openLightbox(markers[0])}
                            >
                              ⤢
                            </button>
                            <img src={vs.screenshot} alt={`violation-${idx}`} />
                          </div>
                          {/* ...existing code... */}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {lightbox && (
              <div
                className="lightbox-backdrop"
                role="dialog"
                aria-modal="true"
              >
                <div className="lightbox-content">
                  <button
                    className="lightbox-close"
                    type="button"
                    aria-label="Close fullscreen view"
                    onClick={() => setLightbox(null)}
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "2px solid #fff",
                      fontSize: 24,
                      fontWeight: 700,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      zIndex: 1000,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                    }}
                  >
                    ×
                  </button>

                  <div className="lightbox-body">
                    {/* BEGIN: Additive Before/After Toggle UI */}
                    <div className="lightbox-image-wrapper">
                      {/* Toggle state for before/after view */}
                      <LightboxBeforeAfter
                        screenshot={lightbox.screenshot}
                        loadingAfter={aiModLoading[lightbox.idx]}
                        afterData={aiModResults[lightbox.idx]}
                        markers={
                          selectedViolation?.screenshotOnly
                            ? []
                            : selectedViolation?.markers || []
                        }
                        onAfterClick={() =>
                          handleAfterClick(
                            lightbox.idx,
                            lightbox.violation,
                            lightbox.scrollY
                          )
                        }
                      />
                    </div>
                    {/* END: Additive Before/After Toggle UI */}

                    <aside className="lightbox-panel">
                      <div
                        className="lightbox-chip"
                        style={{
                          background: lightbox.severityColor || "#7C8DA0",
                        }}
                      >
                        {lightbox.violation?.impact?.toUpperCase() || "ISSUE"}
                      </div>
                      <h3 className="lightbox-title">
                        {getFriendlyTitle(
                          lightbox.violation?.wcagCriterion,
                          lightbox.violation?.id
                        )}
                      </h3>
                      <p className="lightbox-text">
                        {lightbox?.aiFeedback?.summary ||
                          lightbox.violation?.help ||
                          lightbox.violation?.description ||
                          "This area shows a visual concern that may affect user understanding or ease of use."}
                      </p>
                      {lightbox?.aiFeedback?.recommendation && (
                        <p className="lightbox-text" style={{ marginTop: 8 }}>
                          <strong>Suggested fix:</strong>{" "}
                          {lightbox.aiFeedback.recommendation}
                        </p>
                      )}
                      {/* {aiModResults[lightbox.idx]?.css &&
                        aiModResults[lightbox.idx].css.trim() && (
                          <div style={{ marginTop: 16 }}>
                            <h4>Suggested CSS</h4>
                            <pre>{aiModResults[lightbox.idx].css}</pre>
                          </div>
                        )} */}

                      {Array.isArray(lightbox.violations) &&
                        lightbox.violations.length > 1 && (
                          <div
                            style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: "1px solid #ddd",
                            }}
                          >
                            <p
                              className="lightbox-text"
                              style={{ fontWeight: 600, color: "#189B97" }}
                            >
                              Other issues in this screenshot
                            </p>
                            <ul style={{ paddingLeft: 18, margin: 0 }}>
                              {lightbox.violations.slice(1).map((v, i) => (
                                <li
                                  key={i}
                                  className="lightbox-text"
                                  style={{ marginTop: 6 }}
                                >
                                  <strong>
                                    {v.tags?.find((t) =>
                                      String(t).match(/^wcag\d/)
                                    ) || v.id}
                                  </strong>
                                  {v.impact
                                    ? ` • ${String(
                                        v.impact
                                      ).toUpperCase()} severity`
                                    : ""}
                                  {v.help ? ` — ${v.help}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </aside>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Segments section removed to fix empty JSX block */}
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
