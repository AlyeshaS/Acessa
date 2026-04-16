import React, { useEffect, useRef, useState } from "react";

/**
 * Shows live Playwright browser feed as it checks the page
 */
function AnalysisPlayer({ result, onComplete, onImageLoad }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const steps = result?.steps || [];

  // Track the best screenshot to display. We use a ref to remember the last
  // step-specific frame so the static overview from the result event never
  // overwrites a live Playwright frame that was already showing.
  const lastStepScreenshotRef = useRef(result?.screenshot || null);
  const [displayScreenshot, setDisplayScreenshot] = useState(
    result?.screenshot || null,
  );

  const imgRef = useRef(null);

  // When new steps arrive, keep the ref up to date with the latest frame.
  useEffect(() => {
    const latest = steps[steps.length - 1];
    if (latest?.screenshot) {
      lastStepScreenshotRef.current = latest.screenshot;
    }
  }, [steps.length]);

  // Advance through steps as they arrive.
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

  // When currentIndex advances, update displayScreenshot with the most
  // accurate frame: this step's own screenshot → last seen step screenshot →
  // static overview fallback.
  useEffect(() => {
    const step = steps[currentIndex];
    const best =
      step?.screenshot ||
      lastStepScreenshotRef.current ||
      result?.screenshot ||
      null;
    if (best) setDisplayScreenshot(best);
  }, [currentIndex, steps, result?.screenshot]);

  // Only update from the top-level result screenshot if no step screenshot has
  // arrived yet — prevents the static overview overwriting a live frame.
  useEffect(() => {
    if (!result?.screenshot) return;
    if (!lastStepScreenshotRef.current) {
      setDisplayScreenshot(result.screenshot);
    }
  }, [result?.screenshot]);

  // Detect when animation is complete.
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

  // offsetX/Y tell us how far the page was scrolled when the screenshot was
  // taken. We subtract them so the overlay lands correctly on the visible frame.
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

  // Compute circle position. Clamp to [0, rendered image width/height - size]
  // so the circle is never clipped by the container edges.
  const getCircleStyle = (step) => {
    if (!step || typeof step.x !== "number" || typeof step.y !== "number") {
      return null;
    }
    const size = Math.round(36 * scale);
    const radius = Math.round(18 * scale);
    const borderW = Math.max(3, Math.round(5 * scale));

    const imgW = imgRef.current ? imgRef.current.clientWidth : size * 2;
    const imgH = imgRef.current ? imgRef.current.clientHeight : size * 2;

    // Raw position: viewport-relative coords scaled to rendered size
    const rawLeft = scaled(step.x - offsetX) - radius;
    const rawTop = scaled(step.y - offsetY) - radius;

    // Clamp so the circle stays fully inside the image
    const left = Math.max(0, Math.min(rawLeft, imgW - size));
    const top = Math.max(0, Math.min(rawTop, imgH - size));

    return {
      position: "absolute",
      left,
      top,
      width: size,
      height: size,
      borderRadius: "50%",
      border: `${borderW}px solid #E6892C`,
      boxShadow: `0 0 ${Math.round(25 * scale)}px rgba(230,137,44,0.8)`,
      background: "rgba(230,137,44,0.2)",
      pointerEvents: "none",
      zIndex: 5,
      // Pulse animation so the circle is impossible to miss
      animation: "wcag-click-pulse 0.7s ease-out",
    };
  };

  // Decide what overlay to show. Always show a circle for click steps.
  // Fall back to a centred circle if coordinates are missing or zero.
  const circleStyle =
    currentStep?.type === "click" ? getCircleStyle(currentStep) : null;

  // Fallback centred circle when x/y are missing — ensures something always
  // appears so the user knows Playwright is active.
  const fallbackCircleStyle =
    !circleStyle && !isDone && currentStep
      ? {
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: Math.round(36 * scale),
          height: Math.round(36 * scale),
          borderRadius: "50%",
          border: `${Math.max(3, Math.round(5 * scale))}px solid #E6892C`,
          boxShadow: `0 0 ${Math.round(25 * scale)}px rgba(230,137,44,0.5)`,
          background: "rgba(230,137,44,0.12)",
          pointerEvents: "none",
          zIndex: 5,
          animation: "wcag-click-pulse 0.7s ease-out",
        }
      : null;

  return (
    <div className="analysis-player-single">
      {/* Live browser view */}
      <div className="ap-image-wrapper">
        {/* Single screenshot with client-side overlays */}
        <img
          ref={imgRef}
          src={displayScreenshot}
          alt="Live Playwright browser view"
          className="analysis-screenshot"
          style={{ width: "100%", height: "auto", display: "block" }}
          onLoad={handleImgLoad}
        />

        {/* Click circle — precise position when coordinates are available */}
        {circleStyle && <div style={circleStyle} />}

        {/* Fallback centred circle when coordinates are missing */}
        {fallbackCircleStyle && <div style={fallbackCircleStyle} />}

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
              boxShadow: `0 0 0 ${Math.round(8 * scale)}px rgba(124,138,160,0.25)`,
              background: "rgba(124,138,160,0.15)",
              pointerEvents: "none",
              zIndex: 4,
            }}
          />
        )}

        {/* Status overlay showing what's being checked */}
        {!isDone ? (
          <div className="ap-status-overlay">
            <div className="ap-status-label">🔍 Live Accessibility Scan</div>
            <div>{currentStep?.label || "Preparing scan..."}</div>
            <div className="ap-status-step">
              Step {Math.min(currentIndex + 1, steps.length)} of{" "}
              {steps.length || "..."}
            </div>
          </div>
        ) : (
          /* Completion overlay */
          <div className="ap-complete-overlay">
            <div className="ap-complete-card">
              {/* Checkmark circle */}
              <div className="ap-complete-icon-wrap">
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
              <div className="ap-complete-title">Violation Check Complete</div>
              <div className="ap-complete-subtitle">
                {steps.length} step{steps.length !== 1 ? "s" : ""} checked
                <br />
                Finalizing AI report…
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="ap-caption">
        Watching Playwright check accessibility in real-time
      </p>
    </div>
  );
}

export default AnalysisPlayer;
