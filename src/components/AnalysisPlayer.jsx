import React, { useEffect, useRef, useState } from "react";

/**
 * Shows live Playwright browser feed as it checks the page
 */
function AnalysisPlayer({ result, onComplete, onImageLoad }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const steps = result?.steps || [];

  // The fallback screenshot is only used before any step-specific screenshot
  // arrives. Once a step carries its own screenshot we track it in a ref so it
  // persists as the "last known good frame" for steps that don't have one. This
  // prevents the result-event's static overview from overwriting a live
  // Playwright frame that was already showing a different part of the page.
  const lastStepScreenshotRef = useRef(result?.screenshot || null);
  const [displayScreenshot, setDisplayScreenshot] = useState(
    result?.screenshot || null,
  );

  const imgRef = useRef(null);

  // Whenever a new step arrives, seed the lastStepScreenshot ref with its
  // screenshot if it has one, so it is available for later steps that don't.
  useEffect(() => {
    const latest = steps[steps.length - 1];
    if (latest?.screenshot) {
      lastStepScreenshotRef.current = latest.screenshot;
    }
  }, [steps.length]);

  // Advance through steps as they arrive
  useEffect(() => {
    if (steps.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= steps.length - 1) return prev;
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [steps.length]);

  // Whenever currentIndex advances, update displayScreenshot to the most
  // accurate frame available:
  //   1. This step's own Playwright screenshot (most specific — taken at the
  //      exact moment Playwright was on this element)
  //   2. The last step that DID carry a screenshot (keeps the latest real frame)
  //   3. The top-level result.screenshot fallback (static overview)
  useEffect(() => {
    const step = steps[currentIndex];
    const best =
      step?.screenshot || // 1. this step's own live frame
      lastStepScreenshotRef.current || // 2. last real Playwright frame seen
      result?.screenshot || // 3. static overview fallback
      null;
    if (best) setDisplayScreenshot(best);
  }, [currentIndex, steps, result?.screenshot]);

  // Also update if the top-level screenshot changes (e.g. result event fires)
  // but ONLY if we haven't received any step-specific screenshots yet, so the
  // overview doesn't clobber a live Playwright frame.
  useEffect(() => {
    if (!result?.screenshot) return;
    if (!lastStepScreenshotRef.current) {
      setDisplayScreenshot(result.screenshot);
    }
  }, [result?.screenshot]);

  // Detect when animation is complete
  useEffect(() => {
    if (steps.length === 0) return;

    const timeout = setTimeout(() => {
      if (currentIndex >= steps.length - 1) {
        setIsDone(true);
        if (onComplete) onComplete();
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [currentIndex, steps.length, onComplete]);

  const currentStep = steps[currentIndex];
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
          overflow: "auto",
          border: "2px solid var(--color-accent)",
          background: "rgba(15,23,42,0.8)",
          boxShadow: "0 4px 20px rgba(124,138,160,0.3)",
        }}
      >
        {/* Single screenshot with client-side overlays */}
        <img
          ref={imgRef}
          src={displayScreenshot}
          alt="Live Playwright browser view"
          className="analysis-screenshot"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
          onLoad={handleImgLoad}
        />

        {/* Draw click circle overlay — only on actual click steps, not state transitions */}
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
              border: `${Math.max(3, Math.round(4 * scale))}px solid #7c8da0`,
              boxShadow: `0 0 0 ${Math.round(
                8 * scale,
              )}px rgba(124,138,160,0.25)`,
              background: "rgba(124,138,160,0.15)",
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        )}

        {/* Status overlay showing what's being checked */}
        {!isDone ? (
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
            <div
              style={{
                fontWeight: 600,
                color: "var(--background)",
                marginBottom: 4,
              }}
            >
              🔍 Live Accessibility Scan
            </div>
            <div>{currentStep?.label || "Preparing scan..."}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: 4 }}>
              Step {Math.min(currentIndex + 1, steps.length)} of{" "}
              {steps.length || "..."}
            </div>
          </div>
        ) : (
          /* Completion overlay */
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(15,23,42,0.72)",
              backdropFilter: "blur(2px)",
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                background: "rgba(15,23,42,0.92)",
                border: "1.5px solid #86efac",
                borderRadius: 16,
                padding: "22px 32px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
            >
              {/* Checkmark circle */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(22,163,74,0.15)",
                  border: "2px solid #16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#f0fdf4",
                  letterSpacing: "-0.2px",
                }}
              >
                Violation Check Complete
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#94a3b8",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {steps.length} step{steps.length !== 1 ? "s" : ""} checked
                <br />
                Finalizing AI report…
              </div>
            </div>
          </div>
        )}
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

export default AnalysisPlayer;
