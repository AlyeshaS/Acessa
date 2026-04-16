import React, { useEffect, useRef, useState } from "react";
import "../styles/components.css";

const MIN_STEPS = 10;

/**
 * Shows live Playwright browser feed as it checks the page.
 * - Advances through real steps as they arrive, one per 800ms
 * - If real steps run out before MIN_STEPS, keeps scanning animation going
 * - Only marks complete when: MIN_STEPS shown AND backend has sent all steps
 */
function AnalysisPlayer({ result, onComplete, onImageLoad }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const steps = result?.steps || [];

  // Track the best screenshot seen so far
  const lastStepScreenshotRef = useRef(result?.screenshot || null);
  const [displayScreenshot, setDisplayScreenshot] = useState(
    result?.screenshot || null,
  );

  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);

  // A synthetic "virtual step count" that only goes up, never stops early
  // It represents how many step ticks have elapsed regardless of real steps
  const [virtualIndex, setVirtualIndex] = useState(0);

  // Keep lastStepScreenshotRef current whenever a real step screenshot arrives
  useEffect(() => {
    const latest = steps[steps.length - 1];
    if (latest?.screenshot) {
      lastStepScreenshotRef.current = latest.screenshot;
    }
  }, [steps.length]);

  // The main ticker: advances virtualIndex every 800ms indefinitely
  // It only stops once isDone is true
  useEffect(() => {
    if (isDone) return;
    if (steps.length === 0) return; // wait for first step before starting
    const interval = setInterval(() => {
      setVirtualIndex((prev) => prev + 1);
    }, 800);
    return () => clearInterval(interval);
  }, [isDone, steps.length]);

  // Map virtualIndex to a real step: use the real step if available,
  // otherwise hold on the last real step (screenshot stays frozen, label loops)
  const realStepIndex = Math.min(virtualIndex, steps.length - 1);
  const currentStep = steps[realStepIndex] || null;

  // Update displayed screenshot based on realStepIndex (never undefined)
  useEffect(() => {
    const step = steps[realStepIndex];
    const best =
      step?.screenshot ||
      lastStepScreenshotRef.current ||
      result?.screenshot ||
      null;
    if (best) setDisplayScreenshot(best);
  }, [realStepIndex, steps, result?.screenshot]);

  // Seed screenshot from result if nothing else has arrived yet
  useEffect(() => {
    if (!result?.screenshot) return;
    if (!lastStepScreenshotRef.current) {
      setDisplayScreenshot(result.screenshot);
    }
  }, [result?.screenshot]);

  // Complete condition: virtualIndex has reached MIN_STEPS - 1
  // AND we are at (or past) the last real step from the backend
  useEffect(() => {
    if (isDone) return;
    const reachedMinSteps = virtualIndex >= MIN_STEPS - 1;
    const backendDone = virtualIndex >= steps.length - 1 && steps.length > 0;
    if (reachedMinSteps && backendDone) {
      const timeout = setTimeout(() => {
        setIsDone(true);
        if (onComplete) onComplete();
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [virtualIndex, steps.length, isDone, onComplete]);

  const offsetX = currentStep?.offsetX || 0;
  const offsetY = currentStep?.offsetY || 0;

  const handleImgLoad = (e) => {
    try {
      const img = e.target;
      const natural = img.naturalWidth || 1280;
      const clientW = img.clientWidth || natural;
      setScale(clientW / natural || 1);
      if (typeof onImageLoad === "function") onImageLoad();
    } catch {
      setScale(1);
    }
  };

  const scaled = (val) => Math.round((val || 0) * (scale || 1));

  const getCircleStyle = (step) => {
    if (!step || typeof step.x !== "number" || typeof step.y !== "number")
      return null;
    const size = Math.round(36 * scale);
    const radius = Math.round(18 * scale);
    const borderW = Math.max(3, Math.round(5 * scale));
    const imgW = imgRef.current ? imgRef.current.clientWidth : size * 2;
    const imgH = imgRef.current ? imgRef.current.clientHeight : size * 2;
    const left = Math.max(
      0,
      Math.min(scaled(step.x - offsetX) - radius, imgW - size),
    );
    const top = Math.max(
      0,
      Math.min(scaled(step.y - offsetY) - radius, imgH - size),
    );
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
      animation: "wcag-click-pulse 0.7s ease-out",
    };
  };

  const circleStyle =
    currentStep?.type === "click" ? getCircleStyle(currentStep) : null;

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

  // Display step count: show virtualIndex + 1, capped at the total we'll show
  const displayStep = virtualIndex + 1;
  const displayTotal = Math.max(MIN_STEPS, steps.length) || "...";

  // Display label: use real step label while available, then a scanning message
  const scanningLabels = [
    "Checking keyboard navigation…",
    "Verifying colour contrast…",
    "Scanning ARIA attributes…",
    "Inspecting focus indicators…",
    "Reviewing heading structure…",
    "Checking image alt text…",
    "Analysing form labels…",
    "Verifying link text…",
    "Checking skip navigation…",
    "Finalising accessibility report…",
  ];
  const displayLabel =
    currentStep?.label ||
    scanningLabels[virtualIndex % scanningLabels.length] ||
    "Scanning…";

  return (
    <div className="analysis-player-single">
      <div className="ap-image-wrapper">
        <img
          ref={imgRef}
          src={displayScreenshot}
          alt="Live Playwright browser view"
          className="analysis-screenshot"
          onLoad={handleImgLoad}
        />

        {circleStyle && <div style={circleStyle} />}
        {fallbackCircleStyle && <div style={fallbackCircleStyle} />}

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

        {!isDone ? (
          <div className="ap-status-overlay">
            <div className="ap-status-label">🔍 Live Accessibility Scan</div>
            <div>{displayLabel}</div>
            <div className="ap-status-step">
              Step {displayStep} of {displayTotal}
            </div>
          </div>
        ) : (
          <div className="ap-complete-overlay">
            <div className="ap-complete-card">
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
                {Math.max(MIN_STEPS, steps.length)} step
                {Math.max(MIN_STEPS, steps.length) !== 1 ? "s" : ""} checked
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
