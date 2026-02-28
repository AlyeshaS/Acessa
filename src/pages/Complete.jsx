import React, { useEffect, useRef, useState } from "react";
import { aiModifyHtml } from "../api/wcagAPI";
// import IframePreview from "../components/IFramePreview.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/App.css";
import "../styles/index.css";
import { getHighlightTargets } from "../utils/highlightTargets";
// import VisualImprovementsCard from "../components/VisualImprovementsCard.jsx";

// --- AI Image Cache Hook & Helper ---
function getAIImageKey(url, idx) {
  return `aiImageCache_${url}_${idx}`;
}

function useAIImageCache(url, idx, aiImage) {
  const [cachedImage, setCachedImage] = useState(null);
  useEffect(() => {
    const key = getAIImageKey(url, idx);
    const stored = sessionStorage.getItem(key);
    if (stored) {
      setCachedImage(stored);
    } else if (aiImage) {
      sessionStorage.setItem(key, aiImage);
      setCachedImage(aiImage);
    }
  }, [url, idx, aiImage]);
  return cachedImage;
}

// ScreenshotWithHighlights: renders a screenshot with highlight overlays
function ScreenshotWithHighlights({ screenshot, markers }) {
  const imgRef = React.useRef(null);
  const [imgDims, setImgDims] = React.useState({
    naturalWidth: 1,
    naturalHeight: 1,
    renderedWidth: 1,
    renderedHeight: 1,
  });

  const handleImgLoad = () => {
    if (!imgRef.current) return;
    setImgDims({
      naturalWidth: imgRef.current.naturalWidth,
      naturalHeight: imgRef.current.naturalHeight,
      renderedWidth: imgRef.current.clientWidth,
      renderedHeight: imgRef.current.clientHeight,
    });
  };

  // --- AI Image Cache Hook & Helper ---

  function getAIImageKey(url, idx) {
    return `aiImageCache_${url}_${idx}`;
  }

  function useAIImageCache(url, idx, aiImage) {
    const [cachedImage, setCachedImage] = useState(null);
    useEffect(() => {
      const key = getAIImageKey(url, idx);
      const stored = sessionStorage.getItem(key);
      if (stored) {
        setCachedImage(stored);
      } else if (aiImage) {
        sessionStorage.setItem(key, aiImage);
        setCachedImage(aiImage);
      }
    }, [url, idx, aiImage]);
    return cachedImage;
  }

  React.useEffect(() => {
    const onResize = () => handleImgLoad();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scaleX = imgDims.renderedWidth / imgDims.naturalWidth;
  const scaleY = imgDims.renderedHeight / imgDims.naturalHeight;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        ref={imgRef}
        src={screenshot}
        onLoad={handleImgLoad}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />

      {markers.flatMap((m, i) => {
        if (Array.isArray(m.boundingBoxes) && m.boundingBoxes.length > 0) {
          return m.boundingBoxes.map((b, j) => (
            <div
              key={`${m.issueId || i}-bb-${j}`}
              data-issueid={m.issueId || ""}
              style={{
                position: "absolute",
                left: b.x * scaleX,
                top: b.y * scaleY,
                width: b.width * scaleX,
                height: b.height * scaleY,
                border: "2px solid #ff4d4f",
                background: "rgba(255,77,79,0.18)",
                borderRadius: 6,
                pointerEvents: "none",
              }}
            />
          ));
        } else {
          return (
            <div
              key={m.issueId || i}
              data-issueid={m.issueId || ""}
              style={{
                position: "absolute",
                left: m.x * scaleX,
                top: m.y * scaleY,
                width: m.width * scaleX,
                height: m.height * scaleY,
                border: "2px solid #ff4d4f",
                background: "rgba(255,77,79,0.18)",
                borderRadius: 6,
                pointerEvents: "none",
              }}
            />
          );
        }
      })}
    </div>
  );
}

// Reusable circular progress component
// Segmented donut for issue counts
function SegmentedDonut({
  critical = 0,
  warning = 0,
  minor = 0,
  size = 100,
  strokeWidth = 10,
}) {
  const total = critical + warning + minor;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Segment proportions
  const critPct = total ? critical / total : 0;
  const warnPct = total ? warning / total : 0;
  const minorPct = total ? minor / total : 0;
  // Segment angles
  const critLen = critPct * circumference;
  const warnLen = warnPct * circumference;
  const minorLen = minorPct * circumference;
  // Colors
  const critColor = "#B3261E";
  const warnColor = "#B45309";
  const minorColor = "#475569";
  const successColor = "#7c8da0";
  const ringBg = "#E5E7EB";
  // If no issues, show success ring
  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle
          stroke={ringBg}
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
        />
        <circle
          stroke={successColor}
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={0}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize={size * 0.22}
          fill={successColor}
          fontWeight="bold"
        >
          0
        </text>
      </svg>
    );
  }
  // Draw segments
  let offset = 0;
  return (
    <svg width={size} height={size}>
      <circle
        stroke={ringBg}
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        fill="none"
      />
      {/* Critical segment */}
      {critical > 0 && (
        <circle
          stroke={critColor}
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            strokeDasharray: `${critLen} ${circumference - critLen}`,
            transform: `rotate(-90deg)`,
            transformOrigin: "50% 50%",
          }}
        />
      )}
      {/* Warning segment */}
      {warning > 0 && (
        <circle
          stroke={warnColor}
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset + critLen}
          style={{
            strokeDasharray: `${warnLen} ${circumference - warnLen}`,
            transform: `rotate(-90deg)`,
            transformOrigin: "50% 50%",
          }}
        />
      )}
      {/* Minor segment */}
      {minor > 0 && (
        <circle
          stroke={minorColor}
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset + critLen + warnLen}
          style={{
            strokeDasharray: `${minorLen} ${circumference - minorLen}`,
            transform: `rotate(-90deg)`,
            transformOrigin: "50% 50%",
          }}
        />
      )}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.22}
        fill="#111827"
        fontWeight="bold"
      >
        {total}
      </text>
    </svg>
  );
}

function PreviewArrow({ direction, disabled, onClick }) {
  const isLeft = direction === "left";

  return (
    <button
      aria-label={isLeft ? "Previous screenshot" : "Next screenshot"}
      disabled={disabled}
      onClick={onClick}
      style={{
        alignSelf: "center",
        justifySelf: "center",
        width: 56,
        height: 96,
        borderRadius: 999,
        border: "1px solid rgba(203,213,225,0.8)",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transition: "all 0.18s ease",
        boxShadow: disabled ? "none" : "0 8px 24px rgba(0,0,0,0.08)",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "rgba(255,255,255,0.9)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.75)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path
          d={isLeft ? "M15 18L9 12L15 6" : "M9 6L15 12L9 18"}
          stroke="#334155"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function ScoreCircle({ value = 0, size = 120, strokeWidth = 12, label }) {
  const clamped = Math.max(0, Math.min(100, value)); // 0–100 safety
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  // Color logic
  let color = "#B3261E"; // red
  if (clamped >= 80)
    color = "#22c55e"; // green
  else if (clamped >= 60) color = "#eab308"; // yellow

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
          stroke={color}
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
      {label && <p className="score-circle-label">{label}%</p>}
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
          overflow: "auto",
          border: "2px solid var(--color-accent)",
          background: "rgba(15,23,42,0.8)",
          boxShadow: "0 4px 20px rgba(124,138,160,0.3)",
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

// function LightboxBeforeAfter({
//   screenshot,
//   loadingAfter,
//   afterData,
//   markers = [],
//   onAfterClick,
//   selectedViolation,
//   generatedFeedback,
// }) {
//   const [view, setView] = useState("before");
//   const [requestedAfter, setRequestedAfter] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const progressRef = useRef();
//   const [fixedScreenshot, setFixedScreenshot] = useState(null);
//   const [originalDims, setOriginalDims] = useState({ width: 0, height: 0 });
//   const [loadingFix, setLoadingFix] = useState(false);
//   const [fixProgress, setFixProgress] = useState(0);
//   const fixProgressRef = useRef();
//   // Animate progress while loadingFix
//   useEffect(() => {
//     if (loadingFix) {
//       setFixProgress(0);
//       if (fixProgressRef.current) clearInterval(fixProgressRef.current);
//       fixProgressRef.current = setInterval(() => {
//         setFixProgress((prev) => Math.min(100, prev + 7));
//       }, 100);
//     } else {
//       if (fixProgressRef.current) clearInterval(fixProgressRef.current);
//       setFixProgress(100);
//     }
//     return () => {
//       if (fixProgressRef.current) clearInterval(fixProgressRef.current);
//     };
//   }, [loadingFix]);

//   // Animate progress while loadingAfter
//   useEffect(() => {
//     if (requestedAfter && loadingAfter) {
//       setProgress(0);
//       if (progressRef.current) clearInterval(progressRef.current);
//       progressRef.current = setInterval(() => {
//         setProgress((prev) => Math.min(100, prev + 7));
//       }, 100);
//     } else if (!loadingAfter && requestedAfter) {
//       if (progressRef.current) clearInterval(progressRef.current);
//       setProgress(100);
//     }
//     return () => {
//       if (progressRef.current) clearInterval(progressRef.current);
//     };
//   }, [requestedAfter, loadingAfter]);

//   const activeBg = "#7c8da0";
//   const activeText = "#e4e7ed";
//   const inactiveBg = "#5d6a78";
//   const inactiveText = "#e4e7ed";

//   // Pick up to 6 markers to overlay (avoid clutter)
//   const safeMarkers = Array.isArray(markers) ? markers.slice(0, 6) : [];

//   // Manage hovered state for each marker
//   const [hoveredIndexes, setHoveredIndexes] = useState(
//     Array(safeMarkers.length).fill(false),
//   );

//   // Scaling logic for overlays
//   const imgRef = useRef(null);
//   const [imgDims, setImgDims] = useState({
//     naturalWidth: 1,
//     naturalHeight: 1,
//     clientWidth: 1,
//     clientHeight: 1,
//   });
//   useEffect(() => {
//     if (!imgRef.current) return;
//     const img = imgRef.current;
//     const updateDims = () => {
//       setImgDims({
//         naturalWidth: img.naturalWidth || 1,
//         naturalHeight: img.naturalHeight || 1,
//         clientWidth: img.clientWidth || 1,
//         clientHeight: img.clientHeight || 1,
//       });
//       // Store original screenshot dimensions for fixed image
//       if (img.naturalWidth && img.naturalHeight) {
//         setOriginalDims({ width: img.naturalWidth, height: img.naturalHeight });
//       }
//     };
//     img.addEventListener("load", updateDims);
//     updateDims();
//     return () => img.removeEventListener("load", updateDims);
//   }, [screenshot, view, requestedAfter]);

//   // Use original screenshot resolution for scaling
//   const scaleX =
//     imgDims.naturalWidth > 0 ? imgDims.clientWidth / imgDims.naturalWidth : 1;
//   const scaleY =
//     imgDims.naturalHeight > 0
//       ? imgDims.clientHeight / imgDims.naturalHeight
//       : 1;

//   // Clamp helper
//   const clamp = (val, min = 0) => Math.max(min, val);

//   // Compute highlight boxes for each marker (issue)
//   // Prefer boundingBoxes if present, else fallback to selector-based logic
//   const highlightBoxes = safeMarkers.flatMap((m) => {
//     // Prefer boundingBoxes (authoritative)
//     if (Array.isArray(m.boundingBoxes) && m.boundingBoxes.length > 0) {
//       if (window.localStorage.getItem("debugHighlights") === "true") {
//         // Dev-only debug log
//         console.log(
//           "[Highlight] IssueId:",
//           m.issueId,
//           "BoundingBoxes:",
//           m.boundingBoxes.length,
//           "(authoritative)",
//         );
//       }
//       return m.boundingBoxes.map((b) => ({
//         ...b,
//         summary: m.summary,
//         recommendation: m.recommendation,
//         selector: b.selector,
//       }));
//     }
//     // Fallback: use selector-based logic if no boundingBoxes
//     if (Array.isArray(m.boxes) && m.boxes.length > 0) {
//       if (window.localStorage.getItem("debugHighlights") === "true") {
//         console.log(
//           "[Highlight] IssueId:",
//           m.issueId,
//           "Fallback to boxes:",
//           m.boxes.length,
//         );
//       }
//       return m.boxes.map((b) => ({
//         ...b,
//         summary: m.summary,
//         recommendation: m.recommendation,
//         selector: b.selector,
//       }));
//     }
//     // Use getHighlightTargets if selectors or text anchors are present
//     if (
//       m.allowFallbackHighlight === true &&
//       (m.selectors || m.fallbackTextAnchors)
//     ) {
//       try {
//         const boxes = getHighlightTargets(m, null);
//         if (Array.isArray(boxes) && boxes.length > 0) {
//           if (window.localStorage.getItem("debugHighlights") === "true") {
//             console.log(
//               "[Highlight] IssueId:",
//               m.issueId,
//               "Fallback to getHighlightTargets:",
//               boxes.length,
//             );
//           }
//           return boxes.map((b) => ({
//             ...b,
//             summary: m.summary,
//             recommendation: m.recommendation,
//             selector: b.selector || m.selector,
//           }));
//         }
//       } catch (err) {
//         // fallback below
//       }
//     }
//     // Fallback: use direct coordinates
//     if (
//       typeof m.x === "number" &&
//       typeof m.y === "number" &&
//       typeof m.width === "number" &&
//       typeof m.height === "number"
//     ) {
//       if (window.localStorage.getItem("debugHighlights") === "true") {
//         console.log(
//           "[Highlight] IssueId:",
//           m.issueId,
//           "Fallback to direct coordinates",
//         );
//       }
//       return [
//         {
//           x: m.x,
//           y: m.y,
//           width: m.width,
//           height: m.height,
//           summary: m.summary,
//           recommendation: m.recommendation,
//           selector: m.selector,
//         },
//       ];
//     }
//     // If nothing valid, fail silently
//     if (window.localStorage.getItem("debugHighlights") === "true") {
//       console.log(
//         "[Highlight] IssueId:",
//         m.issueId,
//         "No valid highlight, fail silently",
//       );
//     }
//     return [];
//   });

//   // Debug panel for devs
//   const debugHighlights =
//     window.localStorage.getItem("debugHighlights") === "true";

//   return (
//     <div style={{ position: "relative", textAlign: "center" }}>
//       {/* Toggle */}
//       <div
//         style={{
//           marginBottom: 12,
//           display: "flex",
//           justifyContent: "center",
//           gap: 12,
//         }}
//       >
//         <button
//           type="button"
//           onClick={() => setView("before")}
//           style={{
//             padding: "6px 18px",
//             borderRadius: 6,
//             border: "none",
//             background: view === "before" ? activeBg : inactiveBg,
//             color: view === "before" ? activeText : inactiveText,
//             fontWeight: view === "before" ? 700 : 400,
//             cursor: "pointer",
//           }}
//         >
//           Original
//         </button>

//         <button
//           type="button"
//           onClick={() => {
//             setView("after");
//             setRequestedAfter(true);
//             onAfterClick?.();
//           }}
//           style={{
//             padding: "6px 18px",
//             borderRadius: 6,
//             border: "none",
//             background: view === "after" ? activeBg : inactiveBg,
//             color: view === "after" ? activeText : inactiveText,
//             fontWeight: view === "after" ? 700 : 400,
//             cursor: "pointer",
//           }}
//         >
//           Highlight
//         </button>
//         <button
//           type="button"
//           disabled={loadingFix}
//           onClick={async () => {
//             console.log("Fix button clicked");
//             setView("fix");
//             setLoadingFix(true);
//             // Send screenshot to backend for AI visual fix
//             const feedbackToSend =
//               selectedViolation?.aiFeedback || generatedFeedback;
//             console.log(
//               "[Fix Button] Sending screenshot and feedback to backend",
//               { screenshot, feedback: feedbackToSend },
//             );
//             try {
//               // Use OpenAI gpt-image-1 image editing endpoint
//               const prompt =
//                 feedbackToSend?.recommendation ||
//                 feedbackToSend?.summary ||
//                 "Improve accessibility of this image.";
//               // Send bounding box and selector info for highlighted element(s)
//               const highlightedMarkers = Array.isArray(markers)
//                 ? markers.filter(
//                     (m) => m.boundingBoxes && m.boundingBoxes.length > 0,
//                   )
//                 : [];
//               const highlightInfo = highlightedMarkers.map((m) => ({
//                 boundingBoxes: m.boundingBoxes,
//                 selector: m.selector || m.selectors?.[0] || null,
//                 issueId: m.issueId || null,
//               }));
//               const res = await fetch(
//                 "http://localhost:4000/api/ai/image-edit",
//                 {
//                   method: "POST",
//                   headers: { "Content-Type": "application/json" },
//                   body: JSON.stringify({
//                     screenshot,
//                     prompt,
//                     highlightInfo,
//                   }),
//                 },
//               );
//               if (res.ok) {
//                 const data = await res.json();
//                 if (data.editedImageBase64) {
//                   setFixedScreenshot(data.editedImageBase64);
//                   setView("fixed");
//                 } else if (data.editedImageUrl) {
//                   setFixedScreenshot(data.editedImageUrl);
//                   setView("fixed");
//                 }
//               }
//             } catch (err) {
//               console.error("Fix button error:", err);
//             } finally {
//               setLoadingFix(false);
//             }
//           }}
//           style={{
//             padding: "6px 18px",
//             borderRadius: 6,
//             border: "none",
//             background: inactiveBg,
//             color: inactiveText,
//             fontWeight: 400,
//             cursor: loadingFix ? "not-allowed" : "pointer",
//             opacity: loadingFix ? 0.7 : 1,
//             transition: "background 0.2s, color 0.2s",
//           }}
//         >
//           {loadingFix ? "Fixing..." : "Fix"}
//         </button>
//       </div>

//       {/* IMAGE AREA */}
//       <div style={{ minHeight: 410 }}>
//         {/* BEFORE */}
//         {view === "before" && !loadingFix && (
//           <img
//             ref={imgRef}
//             src={screenshot}
//             alt="Before screenshot"
//             style={{
//               width: "100%",
//               height: 410,
//               objectFit: "contain",
//               borderRadius: 8,
//               border: "1px solid #111",
//               background: inactiveBg,
//             }}
//           />
//         )}

//         {/* AFTER */}
//         {view === "after" && !loadingFix && (
//           <>
//             {!requestedAfter && (
//               <div style={{ color: "#888" }}>
//                 Click “After” to generate overlay preview.
//               </div>
//             )}

//             {requestedAfter && (loadingAfter || progress < 100) && (
//               <div
//                 style={{
//                   display: "flex",
//                   flexDirection: "column",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   height: 410,
//                 }}
//               >
//                 <ScoreCircle
//                   value={progress}
//                   size={80}
//                   strokeWidth={10}
//                   label={"Loading..."}
//                 />
//                 <div style={{ color: "#888", marginTop: 12 }}>
//                   Generating recommended overlay…
//                 </div>
//               </div>
//             )}

//             {requestedAfter && progress === 100 && !loadingAfter && (
//               <div
//                 style={{
//                   position: "relative",
//                   width: "100%",
//                   height: 410,
//                   borderRadius: 8,
//                   overflow: "hidden",
//                   border: "1px solid #111",
//                   background: inactiveBg,
//                 }}
//               >
//                 {/* Same screenshot */}
//                 <img
//                   ref={imgRef}
//                   src={screenshot}
//                   alt="After screenshot with overlays"
//                   style={{
//                     width: "100%",
//                     height: "100%",
//                     objectFit: "contain",
//                     display: "block",
//                   }}
//                 />

//                 {/* Overlay layer */}
//                 <div
//                   style={{
//                     position: "absolute",
//                     inset: 0,
//                     background: "rgba(0,0,0,0.35)",
//                     zIndex: 1,
//                   }}
//                 >
//                   {highlightBoxes.map((b, i) => {
//                     if (
//                       b.visualSource === "ai-visual" &&
//                       b.source === "axe-node"
//                     ) {
//                       return null;
//                     }
//                     const tooltip =
//                       b.summary ||
//                       b.recommendation ||
//                       "Accessibility improvement";
//                     const left = clamp((b.x || 0) * scaleX);
//                     const top = clamp((b.y || 0) * scaleY);
//                     const width = clamp((b.width || 0) * scaleX);
//                     const height = clamp((b.height || 0) * scaleY);

//                     return (
//                       <div
//                         key={`${b.selector || "box"}-${i}`}
//                         style={{
//                           position: "absolute",
//                           left,
//                           top,
//                           width,
//                           height,
//                           borderRadius: 6,
//                           border: "3px solid #ff4d4f",
//                           background: "rgba(255,77,79,0.15)",
//                           zIndex: 2,
//                           cursor: "pointer",
//                           pointerEvents: "auto",
//                         }}
//                         onMouseEnter={() => {
//                           setHoveredIndexes((prev) => {
//                             const arr = [...prev];
//                             arr[i] = true;
//                             return arr;
//                           });
//                         }}
//                         onMouseLeave={() => {
//                           setHoveredIndexes((prev) => {
//                             const arr = [...prev];
//                             arr[i] = false;
//                             return arr;
//                           });
//                         }}
//                         tabIndex={0}
//                         aria-label={tooltip}
//                       >
//                         {hoveredIndexes[i] && (
//                           <div
//                             style={{
//                               position: "absolute",
//                               top: -38,
//                               left: 0,
//                               background: "#222",
//                               color: "#fff",
//                               padding: "6px 12px",
//                               borderRadius: 6,
//                               fontSize: 13,
//                               whiteSpace: "pre-line",
//                               zIndex: 10,
//                               boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
//                               pointerEvents: "none",
//                               maxWidth: 260,
//                             }}
//                             role="tooltip"
//                           >
//                             {tooltip}
//                             {debugHighlights && (
//                               <div
//                                 style={{
//                                   fontSize: 11,
//                                   marginTop: 4,
//                                   color: "#ff4d4f",
//                                 }}
//                               >
//                                 <div>Selector: {b.selector}</div>
//                                 <div>
//                                   Box: x={Math.round(b.x)}, y={Math.round(b.y)},
//                                   w={Math.round(b.width)}, h=
//                                   {Math.round(b.height)}
//                                 </div>
//                               </div>
//                             )}
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                   {highlightBoxes.length === 0 &&
//                     safeMarkers.map((m, i) => {
//                       // Tooltip content: prefer summary, fallback to recommendation
//                       const tooltip =
//                         m.summary ||
//                         m.recommendation ||
//                         "Accessibility improvement";
//                       // Defensive: clamp and scale
//                       const left = clamp((m.x || 0) * scaleX);
//                       const top = clamp((m.y || 0) * scaleY);
//                       const width = clamp((m.width || 0) * scaleX);
//                       const height = clamp((m.height || 0) * scaleY);
//                       return (
//                         <div
//                           key={`${m.selector || "m"}-${i}`}
//                           style={{
//                             position: "absolute",
//                             left,
//                             top,
//                             width,
//                             height,
//                             borderRadius: 6,
//                             border: "3px solid #ff4d4f",
//                             background: "rgba(255,77,79,0.15)",
//                             zIndex: 2,
//                             cursor: "pointer",
//                             pointerEvents: "auto",
//                           }}
//                           onMouseEnter={() => {
//                             setHoveredIndexes((prev) => {
//                               const arr = [...prev];
//                               arr[i] = true;
//                               return arr;
//                             });
//                           }}
//                           onMouseLeave={() => {
//                             setHoveredIndexes((prev) => {
//                               const arr = [...prev];
//                               arr[i] = false;
//                               return arr;
//                             });
//                           }}
//                           tabIndex={0}
//                           aria-label={tooltip}
//                         >
//                           {hoveredIndexes[i] && (
//                             <div
//                               style={{
//                                 position: "absolute",
//                                 top: -38,
//                                 left: 0,
//                                 background: "#222",
//                                 color: "#fff",
//                                 padding: "6px 12px",
//                                 borderRadius: 6,
//                                 fontSize: 13,
//                                 whiteSpace: "pre-line",
//                                 zIndex: 10,
//                                 boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
//                                 pointerEvents: "none",
//                                 maxWidth: 260,
//                               }}
//                               role="tooltip"
//                             >
//                               {tooltip}
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                 </div>

//                 <div
//                   style={{
//                     fontWeight: 700,
//                     marginBottom: 6,
//                     color: "#7c8da0",
//                   }}
//                 >
//                   Suggested CSS snippet
//                 </div>
//               </div>
//             )}
//           </>
//         )}

//         {/* FIX LOADING UI */}
//         {loadingFix && (
//           <div
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               justifyContent: "center",
//               height: 410,
//             }}
//           >
//             <ScoreCircle
//               value={fixProgress}
//               size={80}
//               strokeWidth={10}
//               label={"Loading..."}
//             />
//             <div style={{ color: "#888", marginTop: 12 }}>
//               Applying AI visual fix…
//             </div>
//           </div>
//         )}
//         {/* FIXED (AI-modified) SCREENSHOT */}
//         {view === "fixed" && fixedScreenshot && !loadingFix && (
//           <div
//             style={{
//               position: "relative",
//               width: originalDims.width ? `${originalDims.width}px` : "100%",
//               height: originalDims.height
//                 ? `${originalDims.height}px`
//                 : "410px",
//               maxWidth: "100%",
//               maxHeight: 410,
//               borderRadius: 8,
//               overflow: "hidden",
//               border: "1px solid #111",
//               background: inactiveBg,
//               margin: "0 auto",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <img
//               src={fixedScreenshot}
//               alt="AI-modified screenshot"
//               style={{
//                 width: originalDims.width ? `${originalDims.width}px` : "100%",
//                 height: originalDims.height
//                   ? `${originalDims.height}px`
//                   : "410px",
//                 maxWidth: "100%",
//                 maxHeight: 410,
//                 objectFit: "contain",
//                 display: "block",
//               }}
//             />

//             <div
//               style={{
//                 position: "absolute",
//                 bottom: 12,
//                 left: 12,
//                 background: "rgba(24,155,151,0.85)",
//                 color: "#fff",
//                 padding: "8px 16px",
//                 borderRadius: 8,
//                 fontWeight: 700,
//                 fontSize: 15,
//                 zIndex: 10,
//                 boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
//               }}
//             >
//               AI-modified screenshot
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// --- Accessibility Violations Filter UI ---
function ViolationsFilterSection({
  violations = [],
  groupedByPrinciple = {
    Perceivable: [],
    Operable: [],
    Understandable: [],
    Robust: [],
  },
}) {
  // --- Grouped by Principle Section ---
  const principles = [
    { key: "Perceivable", color: "#7c8da0" },
    { key: "Operable", color: "#b45309" },
    { key: "Understandable", color: "#0ea5a4" },
    { key: "Robust", color: "#475569" },
  ];

  // Use groupedByPrinciple prop directly, do not redefine or reference analysis
  // Button styles
  const btnStyle = (active, color) => ({
    padding: "6px 18px",
    borderRadius: 20,
    border: active ? `2px solid ${color}` : "1px solid #d1d5db",
    background: active ? color : "#f8fafc",
    color: active ? "#fff" : color,
    fontWeight: active ? 700 : 400,
    marginRight: 12,
    cursor: "pointer",
    outline: "none",
    minWidth: 80,
    transition: "all 0.18s",
  });

  const [filter, setFilter] = React.useState("all");
  // Helper to filter a group of violations by impact
  const filterBySeverity = (arr) => {
    if (filter === "all") return arr;
    if (filter === "critical")
      return arr.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        // Show for critical button: critical, high
        return impact === "critical" || impact === "high";
      });
    if (filter === "warning")
      return arr.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        // Show for warning button: warning, moderate, medium
        return (
          impact === "warning" || impact === "moderate" || impact === "medium"
        );
      });
    if (filter === "minor")
      return arr.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        // Show for minor button: minor, low
        return impact === "minor" || impact === "low";
      });
    return arr;
  };

  // Group violations by type
  const grouped = {
    critical: [],
    warning: [],
    minor: [],
  };
  violations.forEach((v) => {
    const impact = (v.impact || v.severity || "minor").toLowerCase();
    if (impact === "critical" || impact === "serious" || impact === "high")
      grouped.critical.push(v);
    else if (impact === "moderate" || impact === "medium")
      grouped.warning.push(v);
    else grouped.minor.push(v);
  });

  // Filtered and sorted
  let displayGroups = [];
  if (filter === "all") {
    displayGroups = [
      { label: "Critical", type: "critical", items: grouped.critical },
      { label: "Warning", type: "warning", items: grouped.warning },
      { label: "Minor", type: "minor", items: grouped.minor },
    ];
  } else {
    displayGroups = [
      {
        label:
          filter === "critical"
            ? "Critical"
            : filter === "warning"
              ? "Warning"
              : "Minor",
        type: filter,
        items: grouped[filter],
      },
    ];
  }

  // Button counts based on what will be displayed for each filter
  const getCountForFilter = (filterType) => {
    const allViolations = Object.values(groupedByPrinciple).flat();
    if (filterType === "all") return allViolations.length;
    if (filterType === "critical") {
      return allViolations.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return impact === "critical" || impact === "high";
      }).length;
    }
    if (filterType === "warning") {
      return allViolations.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return (
          impact === "warning" || impact === "moderate" || impact === "medium"
        );
      }).length;
    }
    if (filterType === "minor") {
      return allViolations.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return impact === "minor" || impact === "low";
      }).length;
    }
    return 0;
  };

  // Define counts object for button labels
  const counts = {
    all: getCountForFilter("all"),
    critical: getCountForFilter("critical"),
    warning: getCountForFilter("warning"),
    minor: getCountForFilter("minor"),
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        padding: 24,
        marginTop: 24,
      }}
    >
      {/* Filter Buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button
          style={btnStyle(filter === "all", "#334155")}
          onClick={() => setFilter("all")}
        >
          All ({counts.all})
        </button>
        <button
          style={btnStyle(filter === "critical", "#B3261E")}
          onClick={() => setFilter("critical")}
        >
          Critical ({counts.critical})
        </button>
        <button
          style={btnStyle(filter === "warning", "#B45309")}
          onClick={() => setFilter("warning")}
        >
          Warning ({counts.warning})
        </button>
        <button
          style={btnStyle(filter === "minor", "#475569")}
          onClick={() => setFilter("minor")}
        >
          Minor ({counts.minor})
        </button>
      </div>

      {/* Grouped by Principle */}
      <div style={{ marginTop: 24 }}>
        {principles.map((cat) => (
          <div key={cat.key} style={{ marginBottom: 24 }}>
            <h3
              style={{
                color: cat.color,
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              {cat.key}
            </h3>
            {groupedByPrinciple[cat.key] &&
            groupedByPrinciple[cat.key].length > 0 ? (
              filterBySeverity(groupedByPrinciple[cat.key]).length > 0 ? (
                filterBySeverity(groupedByPrinciple[cat.key]).map((g, idx) => (
                  <div key={idx} className="issue-item">
                    <p>
                      <strong>
                        {g.wcagCriterion || "Unspecified criterion"}
                      </strong>{" "}
                      {g.severity && (
                        <>
                          • <span>{g.severity} severity</span>
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
                        <strong>Problem:</strong> {g.problem}
                      </p>
                    )}
                    {g.recommendation && (
                      <p className="issue-recommendation">
                        <strong>Recommendation:</strong> {g.recommendation}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-issues">
                  No issues for selected severity in this category.
                </p>
              )
            ) : (
              <p className="no-issues">
                No specific WCAG issues were identified for this category.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* No issues overall */}
      {principles.every(
        (cat) =>
          !groupedByPrinciple[cat.key] ||
          filterBySeverity(groupedByPrinciple[cat.key]).length === 0,
      ) && (
        <div style={{ color: "#64748b", textAlign: "center", marginTop: 32 }}>
          No accessibility issues found.
        </div>
      )}
    </div>
  );
}

function Complete() {
  React.useEffect(() => {
    if (!document.head.querySelector("style[data-highlight-feedback]")) {
      const style = document.createElement("style");
      style.innerHTML = `
          .pulse-highlight-once {
            animation: pulse-highlight 1.1s cubic-bezier(0.4,0,0.2,1);
          }
          @keyframes pulse-highlight {
            0% { box-shadow: 0 0 0 0 rgba(225,29,72,0.25); border-width: 2px; }
            50% { box-shadow: 0 0 0 8px rgba(225,29,72,0.18); border-width: 4px; }
            100% { box-shadow: 0 0 0 0 rgba(225,29,72,0.25); border-width: 2px; }
          }
          .highlight-hover {
            border-color: #0ea5a4 !important;
            box-shadow: 0 0 0 6px rgba(14,165,164,0.18) !important;
            z-index: 30 !important;
          }
        `;
      style.setAttribute("data-highlight-feedback", "true");
      document.head.appendChild(style);
    }
  }, []);
  // --- Add state for highlighted screenshot navigation ---
  const [currentScreenshotIdx, setCurrentScreenshotIdx] = useState(0);
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

  const [activeView, setActiveView] = useState("issues"); // issues | fixed | sideBySide
  const [filterSeverity, setFilterSeverity] = useState("all"); // all | critical | moderate | minor
  const [sortBy, setSortBy] = useState("priority"); // priority | name
  const [expandedItems, setExpandedItems] = useState({});

  // AbortController stored in a ref so we can cancel on Back
  const abortRef = useRef(null);

  // Reset currentScreenshotIdx to 0 whenever violationScreenshots changes
  useEffect(() => {
    setCurrentScreenshotIdx(0);
  }, [violationScreenshots]);

  const handleAfterClick = async (idx, violation) => {
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
          url,
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
                })),
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
              url,
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
              visualErr,
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

  // Helper: Toggle expanded state for issue cards
  const toggleExpanded = (key) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Helper: Calculate severity counts from violations
  const calculateSeverityCounts = () => {
    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    if (!analysis?.violations) return counts;

    analysis.violations.forEach((v) => {
      const impact = (v.impact || "minor").toLowerCase();
      if (counts.hasOwnProperty(impact)) {
        counts[impact]++;
      }
    });

    return counts;
  };

  // Helper: Filter and sort violations
  const getFilteredAndSortedViolations = () => {
    if (!analysis?.violations) return [];

    let filtered = [...analysis.violations];

    // Filter by severity
    if (filterSeverity !== "all") {
      filtered = filtered.filter((v) => {
        const impact = (v.impact || "minor").toLowerCase();
        if (filterSeverity === "critical")
          return impact === "critical" || impact === "serious";
        if (filterSeverity === "warnings") return impact === "moderate";
        if (filterSeverity === "minor") return impact === "minor";
        return true;
      });
    }

    // Sort
    if (sortBy === "priority") {
      filtered.sort((a, b) => {
        const severityOrder = {
          critical: 1,
          serious: 2,
          moderate: 3,
          minor: 4,
        };
        const aOrder = severityOrder[(a.impact || "minor").toLowerCase()] || 5;
        const bOrder = severityOrder[(b.impact || "minor").toLowerCase()] || 5;
        return aOrder - bOrder;
      });
    } else if (sortBy === "name") {
      filtered.sort((a, b) => {
        const aTitle = getFriendlyTitle(a.wcagCriterion, a.id);
        const bTitle = getFriendlyTitle(b.wcagCriterion, b.id);
        return aTitle.localeCompare(bTitle);
      });
    }

    return filtered;
  };

  const severityCountsFiltered = calculateSeverityCounts();
  const filteredViolations = getFilteredAndSortedViolations();
  const totalIssuesCount = analysis?.violations?.length || 0;
  const accessibilityScoreValue = score !== null ? score : 0;

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
    { high: 0, medium: 0, low: 0 },
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

  const InfoTooltip = ({ label, description }) => {
    return (
      <span
        tabIndex={0}
        aria-label={label}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          cursor: "help",
          outline: "none",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.querySelector(".tooltip").style.display = "block")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.querySelector(".tooltip").style.display = "none")
        }
        onFocus={(e) =>
          (e.currentTarget.querySelector(".tooltip").style.display = "block")
        }
        onBlur={(e) =>
          (e.currentTarget.querySelector(".tooltip").style.display = "none")
        }
      >
        {/* Info Icon */}
        <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
          <circle
            cx="10"
            cy="10"
            r="9"
            fill="#ffffff"
            stroke="#64748b"
            strokeWidth="2"
          />
          <text
            x="10"
            y="14"
            textAnchor="middle"
            fontSize="12"
            fontFamily="Arial"
            fontWeight="bold"
            fill="#64748b"
          >
            i
          </text>
        </svg>

        {/* Tooltip */}
        <div
          className="tooltip"
          role="tooltip"
          style={{
            display: "none",
            position: "absolute",
            top: "130%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#ffffff",
            color: "#1f2937",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "12px",
            lineHeight: 1.5,
            width: "220px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
            zIndex: 100,
            pointerEvents: "none",
          }}
        >
          <strong style={{ display: "block", marginBottom: 4 }}>{label}</strong>
          {description}
        </div>
      </span>
    );
  };

  console.log("Violations:", analysis?.violations);

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

  // --- Donut hover state for HCI keyword donut ---
  const [donutHover, setDonutHover] = React.useState(null); // { label, percent, x, y }
  // Website Preview toggle state
  const [previewMode, setPreviewMode] = React.useState("highlighted");
  // Side-by-side AI image state
  const [sideBySideAIImage, setSideBySideAIImage] = useState(null);
  const [sideBySideLoading, setSideBySideLoading] = useState(false);

  // Helper for cache key
  function getAIImageKey(url, idx) {
    return `aiImageCache_${url}_${idx}`;
  }

  // When switching to sidebyside, send screenshot to AI generator or use cache
  useEffect(() => {
    if (
      previewMode !== "sidebyside" ||
      !violationScreenshots?.length ||
      sideBySideLoading
    ) {
      if (previewMode !== "sidebyside") {
        setSideBySideAIImage(null);
        setSideBySideLoading(false);
      }
      return;
    }

    const current = violationScreenshots[currentScreenshotIdx];
    const screenshot = current?.screenshot;
    if (!screenshot) return;

    const feedback = current?.feedback || "";
    const violations = current?.violations || [];

    const prompt = `
You are editing an EXISTING screenshot. Your job is to apply ONLY the requested changes.
You are performing a visual patch edit on an existing screenshot.
This is NOT a redesign task.
Only apply minimal styling fixes required to resolve the listed accessibility issues.


HARD RULES:
- Preserve the screenshot exactly: layout, spacing, typography, imagery, colors, and all pixels not related to the requested change.
- Do NOT redesign the UI.
- Do NOT change anything not explicitly requested.
- Make minimal, localized edits only.
- If a change requires adding text, match the existing font style and size.
- If a requested change is ambiguous, do the smallest reasonable adjustment.
- ALL existing text content must remain 100% identical.
- Do NOT rewrite, rephrase, shorten, expand, or correct any text.
- Preserve exact wording, capitalization, punctuation, and spacing.
- Only modify styling (e.g., color, contrast, underline) if required.

REQUESTED CHANGES (apply only these):
${feedback ? `- User feedback: ${feedback}` : ""}

${
  violations?.length
    ? `Accessibility issues to address (do not change unrelated areas):
${violations.map((v, i) => `  ${i + 1}) ${typeof v === "string" ? v : v.message || JSON.stringify(v)}`).join("\n")}`
    : ""
}

OUTPUT:
Return the edited screenshot with minimal localized edits only.
`;

    const cacheKey = getAIImageKey(
      url,
      currentScreenshotIdx,
      JSON.stringify({ feedback, violations }),
    );

    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setSideBySideAIImage(cached);
      setSideBySideLoading(false);
      return;
    }

    if (sideBySideAIImage) return;

    setSideBySideLoading(true);
    fetch("http://localhost:4000/api/ai/image-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screenshot, prompt }),
    })
      .then((res) => res.json())
      .then((data) => {
        const img = data.editedImageBase64 || data.editedImageUrl || null;
        if (img) {
          sessionStorage.setItem(cacheKey, img);
          setSideBySideAIImage(img);
        }
      })
      .catch(() => {})
      .finally(() => setSideBySideLoading(false));
  }, [
    previewMode,
    violationScreenshots,
    currentScreenshotIdx,
    url,
    sideBySideAIImage,
    sideBySideLoading,
  ]);

  // Clear AI image cache when returning to home page
  useEffect(() => {
    // Only clear cache if on home page
    if (location.pathname === "/") {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith("aiImageCache_")) {
          sessionStorage.removeItem(key);
        }
      }
    }
  }, [location.pathname]);
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
                          : payload,
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
            {/* Website Preview Section */}
            <div className="website-preview-panel">
              <h2 className="website-preview-title">Website Preview</h2>

              <div className="website-preview-toggle-group">
                <button
                  className={
                    "website-preview-toggle-btn" +
                    (previewMode === "highlighted" ? " active" : "")
                  }
                  onClick={() => setPreviewMode("highlighted")}
                  type="button"
                >
                  Highlighted
                </button>
                <button
                  className={
                    "website-preview-toggle-btn" +
                    (previewMode === "sidebyside" ? " active" : "")
                  }
                  onClick={() => setPreviewMode("sidebyside")}
                  type="button"
                >
                  Side to side
                </button>
                <button
                  className={
                    "website-preview-toggle-btn" +
                    (previewMode === "lense" ? " active" : "")
                  }
                  onClick={() => setPreviewMode("lense")}
                  type="button"
                >
                  Lense
                </button>
              </div>

              <div
                className="website-preview-screenshot-wrapper"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    previewMode === "sidebyside"
                      ? "1fr 1fr"
                      : "56px minmax(0, 3fr) minmax(0, 1.2fr) 56px",
                  alignItems: "stretch",
                  height: "100%",
                  width: "100%",
                  background: "#fff",
                  borderRadius: 12,
                  overflow: "clip",
                }}
              >
                {previewMode === "highlighted" &&
                violationScreenshots &&
                violationScreenshots.length > 0 ? (
                  <>
                    {/* Left arrow */}
                    <PreviewArrow
                      direction="left"
                      disabled={currentScreenshotIdx === 0}
                      onClick={() =>
                        setCurrentScreenshotIdx((i) => Math.max(0, i - 1))
                      }
                    />

                    {/* Screenshot + highlights + panel */}
                    {/* Screenshot (fills the image grid column) */}
                    <div style={{ width: "100%", height: "100%" }}>
                      <ScreenshotWithHighlights
                        screenshot={
                          violationScreenshots[currentScreenshotIdx]?.screenshot
                        }
                        markers={
                          violationScreenshots[currentScreenshotIdx]?.markers ||
                          []
                        }
                      />
                    </div>

                    {/* Feedback panel (fills the panel grid column) */}
                    <aside
                      data-issueid={
                        violationScreenshots[currentScreenshotIdx]?.markers?.[0]
                          ?.issueId ||
                        violationScreenshots[currentScreenshotIdx]
                          ?.violations?.[0]?.issueId ||
                        ""
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "#f8fafc",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        padding: 18,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        boxShadow: "0 2px 8px rgba(124,138,160,0.08)",
                        overflowY: "auto",
                        cursor: "pointer",
                        transition: "box-shadow 0.2s, border 0.2s",
                      }}
                      onClick={() => {
                        // Find the highlight with the same issueId and pulse it
                        const issueId =
                          violationScreenshots[currentScreenshotIdx]
                            ?.markers?.[0]?.issueId ||
                          violationScreenshots[currentScreenshotIdx]
                            ?.violations?.[0]?.issueId ||
                          "";
                        if (!issueId) return;
                        const highlight = document.querySelector(
                          `[data-issueid="${issueId}"]`,
                        );
                        if (highlight) {
                          highlight.classList.add("pulse-highlight-once");
                          setTimeout(() => {
                            highlight.classList.remove("pulse-highlight-once");
                          }, 1200);
                          // Scroll into view if needed
                          if (typeof highlight.scrollIntoView === "function") {
                            highlight.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        }
                      }}
                      onMouseEnter={() => {
                        // Optionally, add a hover effect to the highlight
                        const issueId =
                          violationScreenshots[currentScreenshotIdx]
                            ?.markers?.[0]?.issueId ||
                          violationScreenshots[currentScreenshotIdx]
                            ?.violations?.[0]?.issueId ||
                          "";
                        if (!issueId) return;
                        const highlight = document.querySelector(
                          `[data-issueid="${issueId}"]`,
                        );
                        if (highlight) {
                          highlight.classList.add("highlight-hover");
                        }
                      }}
                      onMouseLeave={() => {
                        const issueId =
                          violationScreenshots[currentScreenshotIdx]
                            ?.markers?.[0]?.issueId ||
                          violationScreenshots[currentScreenshotIdx]
                            ?.violations?.[0]?.issueId ||
                          "";
                        if (!issueId) return;
                        const highlight = document.querySelector(
                          `[data-issueid="${issueId}"]`,
                        );
                        if (highlight) {
                          highlight.classList.remove("highlight-hover");
                        }
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#7c8da0",
                          marginBottom: 8,
                        }}
                      >
                        {violationScreenshots[
                          currentScreenshotIdx
                        ]?.violations?.[0]?.impact?.toUpperCase() || "ISSUE"}
                      </div>

                      <h3
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          margin: 0,
                          color: "#475569",
                        }}
                      >
                        {getFriendlyTitle(
                          violationScreenshots[currentScreenshotIdx]
                            ?.violations?.[0]?.wcagCriterion,
                          violationScreenshots[currentScreenshotIdx]
                            ?.violations?.[0]?.id,
                        )}
                      </h3>

                      <p
                        style={{
                          color: "#475569",
                          marginTop: 10,
                          fontSize: 15,
                        }}
                      >
                        {violationScreenshots[currentScreenshotIdx]?.aiFeedback
                          ?.summary ||
                          violationScreenshots[currentScreenshotIdx]
                            ?.violations?.[0]?.help ||
                          violationScreenshots[currentScreenshotIdx]
                            ?.violations?.[0]?.description ||
                          "This area shows a visual concern that may affect user understanding or ease of use."}
                      </p>

                      {violationScreenshots[currentScreenshotIdx]?.aiFeedback
                        ?.recommendation && (
                        <p style={{ marginTop: 8, color: "#7c8da0" }}>
                          <strong>Suggested fix:</strong>{" "}
                          {
                            violationScreenshots[currentScreenshotIdx]
                              .aiFeedback.recommendation
                          }
                        </p>
                      )}
                    </aside>

                    <PreviewArrow
                      direction="right"
                      disabled={
                        currentScreenshotIdx === violationScreenshots.length - 1
                      }
                      onClick={() =>
                        setCurrentScreenshotIdx((i) =>
                          Math.min(violationScreenshots.length - 1, i + 1),
                        )
                      }
                    />
                  </>
                ) : previewMode === "lense" &&
                  violationScreenshots &&
                  violationScreenshots.length > 0 ? (
                  <>
                    {/* Left arrow */}
                    <PreviewArrow
                      direction="left"
                      disabled={currentScreenshotIdx === 0}
                      onClick={() =>
                        setCurrentScreenshotIdx((i) => Math.max(0, i - 1))
                      }
                    />

                    {/* Screenshot (fills the image grid column) */}
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={
                          violationScreenshots[currentScreenshotIdx]?.screenshot
                        }
                        alt="Original screenshot"
                        style={{
                          width: "100%",
                          height: "auto",
                          objectFit: "contain",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    </div>

                    {/* Lense panel (fills the panel grid column) */}
                    <aside className="lense-panel">
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#7c8da0",
                          marginBottom: 8,
                          fontSize: 16,
                        }}
                      >
                        Color Vision Filters
                      </div>
                      <button className="lense-filter-btn protanopia">
                        Protanopia (red-blind)
                      </button>
                      <button className="lense-filter-btn deuteranopia">
                        Deuteranopia (green-blind)
                      </button>
                      <button className="lense-filter-btn tritanopia">
                        Tritanopia (blue-blind)
                      </button>
                      <button className="lense-filter-btn achromatopsia">
                        Achromatopsia (grayscale)
                      </button>
                    </aside>

                    {/* Right arrow */}
                    <PreviewArrow
                      direction="right"
                      disabled={
                        currentScreenshotIdx === violationScreenshots.length - 1
                      }
                      onClick={() =>
                        setCurrentScreenshotIdx((i) =>
                          Math.min(violationScreenshots.length - 1, i + 1),
                        )
                      }
                    />
                  </>
                ) : previewMode === "sidebyside" &&
                  violationScreenshots &&
                  violationScreenshots.length > 0 ? (
                  <>
                    {/* Side by side: left original, right AI-modified */}
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRight: "1px solid #e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fff",
                      }}
                    >
                      <img
                        src={
                          violationScreenshots[currentScreenshotIdx]?.screenshot
                        }
                        alt="Original screenshot"
                        style={{
                          width: "auto",
                          height: "auto",
                          maxWidth: "95%",
                          maxHeight: "400px",
                          objectFit: "contain",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fff",
                      }}
                    >
                      {sideBySideLoading ? (
                        <div
                          style={{
                            color: "#7c8da0",
                            fontWeight: 600,
                            fontSize: 16,
                          }}
                        >
                          Generating AI-modified screenshot…
                        </div>
                      ) : sideBySideAIImage ? (
                        <img
                          src={sideBySideAIImage}
                          alt="AI-modified screenshot"
                          style={{
                            width: "auto",
                            height: "auto",
                            maxWidth: "95%",
                            maxHeight: "400px",
                            objectFit: "contain",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(124,138,160,0.10)", // match original
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            color: "#7c8da0",
                            fontWeight: 600,
                            fontSize: 16,
                          }}
                        >
                          AI-modified screenshot not available.
                        </div>
                      )}
                    </div>
                  </>
                ) : previewMode === "lense" && analysis?.screenshot ? (
                  <>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#fff",
                      }}
                    >
                      <img
                        src={analysis.screenshot}
                        alt="Original screenshot"
                        style={{
                          width: "auto",
                          height: "auto",
                          maxWidth: "95%",
                          maxHeight: "400px",
                          objectFit: "contain",
                          borderRadius: "8px",
                          boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    </div>
                    <aside
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "#f8fafc",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        padding: 18,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        boxShadow: "0 2px 8px rgba(124,138,160,0.08)",
                        overflowY: "auto",
                        marginLeft: 16,
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          color: "#7c8da0",
                          marginBottom: 8,
                          fontSize: 16,
                        }}
                      >
                        Color Vision Filters
                      </div>
                      <button
                        style={{
                          marginBottom: 8,
                          width: "100%",
                          padding: "10px 0",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          color: "#B3261E",
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: "pointer",
                        }}
                      >
                        Protanopia (red-blind)
                      </button>
                      <button
                        style={{
                          marginBottom: 8,
                          width: "100%",
                          padding: "10px 0",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          color: "#189b97",
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: "pointer",
                        }}
                      >
                        Deuteranopia (green-blind)
                      </button>
                      <button
                        style={{
                          marginBottom: 8,
                          width: "100%",
                          padding: "10px 0",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          color: "#475569",
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: "pointer",
                        }}
                      >
                        Tritanopia (blue-blind)
                      </button>
                      <button
                        style={{
                          width: "100%",
                          padding: "10px 0",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          color: "#7c8da0",
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: "pointer",
                        }}
                      >
                        Achromatopsia (grayscale)
                      </button>
                    </aside>
                  </>
                ) : analysis?.screenshot ? (
                  <img
                    src={analysis.screenshot}
                    alt="Website full preview"
                    className="website-preview-screenshot"
                  />
                ) : (
                  <div className="website-preview-screenshot-placeholder">
                    No screenshot available.
                  </div>
                )}
              </div>
            </div>
            {/* NEW: Two-Column Results Layout */}
            <div
              className="results-layout"
              style={{
                display: "flex",
                gap: "24px",
                marginTop: "32px",
                minHeight: "600px",
              }}
            >
              {/* LEFT PANEL - Website Preview */}
              <div
                className="preview-panel"
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  boxShadow: "var(--color-accent)",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid #e0e7ef",
                  minHeight: "520px",
                  marginRight: "auto",
                  width: "480px",
                }}
              >
                <div className="scores">
                  <h2
                    style={{
                      fontSize: "22px",
                      fontWeight: 700,
                      color: "#7c8da0",
                      marginBottom: "18px",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    Scores
                  </h2>
                  <div className="score-body">
                    <div className="score-content">
                      <p
                        className="subheader"
                        style={{
                          fontSize: "15px",
                          color: "#7c8da09",
                          marginBottom: "10px",
                          fontWeight: 500,
                        }}
                      >
                        URL:&nbsp;
                        <a
                          href={analysis.url || url}
                          target="_blank"
                          rel="noreferrer"
                          className="analyzed-url"
                          style={{
                            color: "#7c8da0",
                            textDecoration: "underline",
                            fontWeight: 600,
                          }}
                        >
                          {analysis.url || url}
                        </a>
                      </p>
                      {score !== null && (
                        <div
                          className="overall-score"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "24px",
                            marginBottom: "18px",
                          }}
                        >
                          <ScoreCircle
                            value={score}
                            label="Overall WCAG Score"
                          />
                          <div
                            className="overall-score-text"
                            style={{
                              flex: 1,
                              background: "var(--white)",
                              borderRadius: "10px",
                              padding: "14px 18px",
                              boxShadow: "var(--color-accent)",
                            }}
                          >
                            <p
                              className="subheader"
                              style={{
                                fontSize: "15px",
                                color: "#475569",
                                fontWeight: 600,
                                marginBottom: "6px",
                              }}
                            >
                              Overall Accessibility
                            </p>
                            <p
                              className="overall-score-number"
                              style={{
                                fontSize: "24px",
                                color: "#7c8da0",
                                fontWeight: 700,
                                marginBottom: "4px",
                              }}
                            >
                              <strong>{score}</strong> / 100
                            </p>
                            <p
                              className="overall-score-hint"
                              style={{
                                fontSize: "12px",
                                color: "#475569",
                                marginBottom: "0",
                              }}
                            >
                              Higher scores indicate better alignment with WCAG
                              2.2 and AODA.
                            </p>
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
                                    color: "#7c8da0",
                                  }}
                                >
                                  Score Calculation Breakdown
                                </h4>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    lineHeight: "1.8",
                                  }}
                                >
                                  {scoreBreakdown.highCount !== undefined && (
                                    <div>
                                      <strong>Severity Distribution:</strong>
                                      <div
                                        style={{ marginLeft: 16, marginTop: 8 }}
                                      >
                                        <div style={{ marginBottom: 6 }}>
                                          🔴 <strong>High Severity:</strong>{" "}
                                          {scoreBreakdown.highCount} violation
                                          {scoreBreakdown.highCount !== 1
                                            ? "s"
                                            : ""}{" "}
                                          ({scoreBreakdown.highCount * 3}{" "}
                                          points)
                                        </div>
                                        <div style={{ marginBottom: 6 }}>
                                          🟠 <strong>Medium Severity:</strong>{" "}
                                          {scoreBreakdown.mediumCount} violation
                                          {scoreBreakdown.mediumCount !== 1
                                            ? "s"
                                            : ""}{" "}
                                          ({scoreBreakdown.mediumCount * 2}{" "}
                                          points)
                                        </div>
                                        <div style={{ marginBottom: 6 }}>
                                          🟡 <strong>Low Severity:</strong>{" "}
                                          {scoreBreakdown.lowCount} violation
                                          {scoreBreakdown.lowCount !== 1
                                            ? "s"
                                            : ""}{" "}
                                          ({scoreBreakdown.lowCount * 1} point
                                          {scoreBreakdown.lowCount !== 1
                                            ? "s"
                                            : ""}
                                          )
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {scoreBreakdown.deductedPoints !==
                                    undefined && (
                                    <div
                                      style={{
                                        marginTop: 12,
                                        paddingTop: 12,
                                        borderTop: "1px solid #ddd",
                                      }}
                                    >
                                      <strong>Points Calculation:</strong>
                                      <div
                                        style={{ marginLeft: 16, marginTop: 8 }}
                                      >
                                        <div
                                          style={{
                                            marginBottom: 4,
                                            color: "#555",
                                          }}
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
                      <div
                        className="category-section"
                        style={{
                          marginTop: "18px",
                        }}
                      >
                        <p
                          className="subheader"
                          style={{
                            fontSize: "14px",
                            color: "#475569",
                            fontWeight: 500,
                            marginBottom: "10px",
                          }}
                        >
                          Category Scores (WCAG 2.2 – POUR)
                        </p>
                        <div
                          className="category-grid"
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: "18px",
                          }}
                        >
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
                                  style={{
                                    background: "var(--white)",
                                    borderRadius: "8px",
                                    boxShadow: "var(--color-accent)",
                                    padding: "12px 10px",
                                    border: "1px solid #e0e7ef",
                                    cursor: "pointer",
                                    transition: "box-shadow 0.2s",
                                  }}
                                >
                                  <div
                                    className="category-header"
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    <div
                                      className="category-header-main"
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      <span
                                        className="category-title"
                                        style={{
                                          fontSize: "15px",
                                          color: "#7c8da0",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {cat.key}
                                      </span>
                                      {/* <span
                                        className="category-score-label"
                                        style={{
                                          fontSize: "15px",
                                          color: "#475569",
                                          // fontWeight: 700,
                                        }}
                                      >
                                        {cat.score}%
                                      </span> */}
                                    </div>
                                    <span
                                      className={
                                        expandedCategories[cat.key]
                                          ? "chevron chevron-open"
                                          : "chevron"
                                      }
                                      aria-hidden="true"
                                      style={{
                                        fontSize: "18px",
                                        color: "#475569",
                                        marginLeft: "6px",
                                      }}
                                    >
                                      ▾
                                    </span>
                                  </div>
                                  <div
                                    className="category-circle-wrapper"
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    <ScoreCircle
                                      value={cat.score}
                                      size={100}
                                      strokeWidth={10}
                                      label={`${cat.key} score`}
                                    />
                                  </div>
                                  {expandedCategories[cat.key] && (
                                    <div
                                      className="category-details category-details-open"
                                      style={{
                                        background: "#f5f5f5",
                                        padding: "12px",
                                        borderRadius: "8px",
                                        marginBottom: "12px",
                                        fontSize: "13px",
                                        lineHeight: "1.6",
                                        borderLeft: "4px solid #7c8da0",
                                      }}
                                    >
                                      {categoryExplanations[cat.key] && (
                                        <div>
                                          <strong style={{ color: "#7c8da0" }}>
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
                                            <div
                                              key={idx}
                                              className="issue-item"
                                              style={{
                                                background: "#f9fafb",
                                                borderRadius: 10,
                                                boxShadow:
                                                  "0 1px 6px rgba(124,138,160,0.06)",
                                                padding: "14px 14px 10px 14px",
                                                marginBottom: 14,
                                                borderLeft:
                                                  g.severity === "High"
                                                    ? "5px solid #e11d48"
                                                    : g.severity === "Medium"
                                                      ? "5px solid #fbbf24"
                                                      : "5px solid #10b981",
                                                position: "relative",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 10,
                                                  marginBottom: 4,
                                                }}
                                              >
                                                {/* Severity badge */}
                                                <span
                                                  style={{
                                                    display: "inline-block",
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: "50%",
                                                    background:
                                                      g.severity === "High"
                                                        ? "#e11d48"
                                                        : g.severity ===
                                                            "Medium"
                                                          ? "#fbbf24"
                                                          : "#10b981",
                                                    border: "2px solid #fff",
                                                    boxShadow:
                                                      "0 0 0 1px #e5e7eb",
                                                  }}
                                                  title={
                                                    g.severity + " severity"
                                                  }
                                                />
                                                <strong
                                                  style={{
                                                    color: "#334155",
                                                    fontWeight: 700,
                                                  }}
                                                >
                                                  {g.wcagCriterion ||
                                                    "Unspecified criterion"}
                                                </strong>
                                                {typeof g.count ===
                                                  "number" && (
                                                  <span
                                                    style={{
                                                      color: "#64748b",
                                                      fontSize: 13,
                                                    }}
                                                  >
                                                    • approx. {g.count}{" "}
                                                    occurrence
                                                    {g.count === 1 ? "" : "s"}
                                                  </span>
                                                )}
                                              </div>
                                              {g.problem && (
                                                <div
                                                  className="issue-problem"
                                                  style={{
                                                    color: "#b3261e",
                                                    fontWeight: 500,
                                                    marginBottom: 4,
                                                  }}
                                                >
                                                  <span
                                                    style={{ fontWeight: 600 }}
                                                  >
                                                    Problem:
                                                  </span>{" "}
                                                  {g.problem}
                                                </div>
                                              )}
                                              {g.recommendation && (
                                                <div
                                                  className="issue-recommendation"
                                                  style={{
                                                    background: "#fff7ed",
                                                    color: "#b45309",
                                                    borderRadius: 6,
                                                    padding: "7px 10px",
                                                    fontWeight: 500,
                                                    fontSize: 14,
                                                    marginTop: 2,
                                                  }}
                                                >
                                                  <span
                                                    style={{ fontWeight: 700 }}
                                                  >
                                                    Recommendation:
                                                  </span>{" "}
                                                  {g.recommendation}
                                                </div>
                                              )}
                                            </div>
                                          ),
                                        )
                                      ) : (
                                        <p className="no-issues">
                                          No specific WCAG issues were
                                          identified for this category.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL – Accessibility Issues */}
              <div
                style={{
                  width: "100%",
                  background: "#ffffff",
                  borderRadius: "14px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
                }}
              >
                {/* ================= SUMMARY HEADER ================= */}
                <div
                  style={{
                    padding: "20px 24px",
                    background: "#ffffff",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <h2
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: "-0.5px",
                      color: "var(--color-accent)",
                    }}
                  >
                    Accessibility Issues
                  </h2>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    {/* Total Issues */}
                    <div
                      style={{
                        background: "#f1f5f9",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        minWidth: "120px",
                        boxShadow: "var(--color-accent)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        TOTAL ISSUES
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 900,
                          lineHeight: 1,
                          color:
                            Object.values(groupedByPrinciple || {}).flat()
                              .length === 0
                              ? "#16a34a"
                              : "#b3261e",
                        }}
                      >
                        {Object.values(groupedByPrinciple || {}).flat().length}
                      </div>
                    </div>

                    {/* Conformance Levels */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#64748b",
                          marginBottom: 6,
                        }}
                      >
                        CONFORMANCE LEVELS
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {/* Level A */}
                        <span
                          style={{
                            background: "#f1f5f9",
                            border: "1px solid #475569",
                            color: "#475569",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          A: {levelAScore ?? "-"}%
                          <InfoTooltip
                            label="Level A"
                            description="The minimum WCAG conformance level. Addresses the most basic accessibility barriers that prevent some users from accessing content."
                          />
                        </span>

                        {/* Level AA */}
                        <span
                          style={{
                            background: "#fff7ed",
                            border: "1px solid #b45309",
                            color: "#b45309",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          AA: {levelAAScore ?? "-"}%
                          <InfoTooltip
                            label="Level AA"
                            description="The most widely adopted WCAG level. Addresses the most common and impactful accessibility issues affecting users with disabilities."
                          />
                        </span>

                        {/* Level AAA */}
                        <span
                          style={{
                            background: "#ecfeff",
                            border: "1px solid #0ea5a4",
                            color: "#0ea5a4",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          AAA: {levelAAAScore ?? "-"}%
                          <InfoTooltip
                            label="Level AAA"
                            description="The highest WCAG conformance level. Represents optimal accessibility but can be difficult to achieve across all content."
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* ================= DONUT + LEGEND ================= */}
                {/* <div
                  style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      borderRadius: "14px",
                      padding: "16px",
                      display: "flex",
                      gap: "20px",
                      alignItems: "center",
                    }}
                  >
                    {(() => {
                      const group = analysis?.groups || [];
                      const criticalArr = group.filter(
                        (v) =>
                          v.severity === "High" || v.severity === "serious",
                      );
                      const warningArr = group.filter(
                        (v) => v.severity === "Moderate",
                      );
                      const minorArr = group.filter(
                        (v) => v.severity === "Low",
                      );
                      console.log("analysis.group", group);
                      console.log("critical", criticalArr);
                      console.log("warning", warningArr);
                      console.log("minor", minorArr);
                      return (
                        <SegmentedDonut
                          critical={criticalArr.length}
                          warning={warningArr.length}
                          minor={minorArr.length}
                          size={96}
                          strokeWidth={10}
                        />
                      );
                    })()}

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      {(() => {
                        // Compute severity arrays from analysis.violations
                        const violations =
                          (analysis && analysis.violations) || [];
                        const criticalArr = violations.filter(
                          (v) =>
                            v.severity === "High" ||
                            v.severity === "serious" ||
                            v.impact === "critical" ||
                            v.impact === "serious",
                        );
                        const warningArr = violations.filter(
                          (v) =>
                            v.severity === "Moderate" ||
                            v.impact === "moderate" ||
                            v.severity === "Medium",
                        );
                        const minorArr = violations.filter(
                          (v) =>
                            v.severity === "Low" ||
                            v.impact === "minor" ||
                            v.impact === "low",
                        );
                        return [
                          {
                            label: "Critical",
                            value: criticalArr.length,
                            color: "#B3261E",
                          },
                          {
                            label: "Warnings",
                            value: warningArr.length,
                            color: "#B45309",
                          },
                          {
                            label: "Minor",
                            value: minorArr.length,
                            color: "#475569",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: item.color,
                              }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>
                              {item.value} {item.label}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div> */}

                {(() => {
                  // Debugging output
                  console.log("analysis:", analysis);
                  console.log("analysis.groupedByPrinciple:", analysis?.groups);
                  const fallback = (() => {
                    const violations = analysis?.violations || [];
                    const result = {
                      Perceivable: [],
                      Operable: [],
                      Understandable: [],
                      Robust: [],
                    };
                    violations.forEach((v) => {
                      const p =
                        v.principle ||
                        v.pourPrinciple ||
                        v.category ||
                        v.wcagPrinciple;
                      if (p && result[p]) {
                        result[p].push(v);
                      }
                    });
                    return result;
                  })();
                  console.log("fallback groupedByPrinciple:", fallback);
                  return (
                    <ViolationsFilterSection
                      violations={analysis?.violations || []}
                      groupedByPrinciple={groupedByPrinciple}
                    />
                  );
                })()}
              </div>
            </div>
            {/* <div className="scores">
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
                                color: "#7c8da0",
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

                              <div className="category-circle-wrapper">
                                <ScoreCircle
                                  value={cat.score}
                                  size={100}
                                  strokeWidth={10}
                                  label={`${cat.key} score`}
                                />
                              </div>

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
                                        borderLeft: "4px solid #7c8da0",
                                      }}
                                    >
                                      <strong style={{ color: "#7c8da0" }}>
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
                                      ),
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
                          ),
                      )}
                    </div>
                  </div>

                  {(levelAScore !== null ||
                    levelAAScore !== null ||
                    levelAAAScore !== null) && (
                    <div className="level-scores">
                      <p className="subheader">Conformance Levels</p>

               
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
            </div> */}
            {/* Visual Improvements Card: after score, before HCI, Next Steps, etc. */}
            {/* <VisualImprovementsCard
              violationScreenshots={violationScreenshots}
            /> */}
            {/* HCI Report and Keyword Frequency Panel */}
            <div
              style={{
                display: "flex",
                gap: "24px",
                marginTop: "32px",
                // marginBottom: "32px",
                width: "100%",
                alignItems: "stretch",
              }}
            >
              {/* HCI Report Section */}
              <div
                style={{
                  flex: 1,
                  background: "#ffffff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                  padding: "24px",
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#7c8da0",
                    marginBottom: "18px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  HCI Report
                </h2>
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
                      "gi",
                    );
                    // Replace keywords with bolded version (no emoji)
                    const highlighted = para.replace(regex, (match) => {
                      return `<strong style='color:#7c8da0;'>${match}</strong>`;
                    });
                    return (
                      <p
                        key={idx}
                        style={{
                          fontSize: "15px",
                          color: "#475569",
                          marginBottom: "14px",
                          lineHeight: 1.7,
                        }}
                        dangerouslySetInnerHTML={{ __html: highlighted }}
                      />
                    );
                  })
                ) : (
                  <p
                    style={{
                      fontSize: "15px",
                      color: "#475569",
                      marginBottom: "14px",
                      lineHeight: 1.7,
                    }}
                  >
                    {hciText}
                  </p>
                )}
              </div>

              {/* Keyword Frequency Panel */}
              <div
                style={{
                  flex: 1,
                  background: "#ffffff",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                  padding: "24px",
                  minWidth: "220px",
                  maxWidth: "320px",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                }}
              >
                <h2
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "#7c8da0",
                    marginBottom: "18px",
                    letterSpacing: "-0.5px",
                  }}
                >
                  Keyword Frequency
                </h2>
                {(() => {
                  // Collect all text from paragraphs
                  const text =
                    hciParagraphs.length > 0
                      ? hciParagraphs.join(" ")
                      : hciText;
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
                  // Colorblind-friendly palette (ColorBrewer Set2)
                  const palette = [
                    "#66c2a5", // teal
                    "#fc8d62", // orange
                    "#8da0cb", // blue
                    "#e78ac3", // pink
                    "#a6d854", // green
                    "#ffd92f", // yellow
                    "#e5c494", // tan
                    "#b3b3b3", // gray
                    "#1b9e77", // dark teal
                    "#d95f02", // dark orange
                    "#7570b3", // dark blue
                    "#e7298a", // dark pink
                    "#a6761d", // brown
                    "#666666", // dark gray
                  ];
                  // Count keyword occurrences
                  const counts = {};
                  let totalKeywordCount = 0;
                  keywords.forEach((kw) => {
                    const regex = new RegExp(`\\b${kw}\\b`, "gi");
                    const matches = text.match(regex);
                    counts[kw] = matches ? matches.length : 0;
                    totalKeywordCount += counts[kw];
                  });
                  // Only show keywords that appear at least once
                  const shownKeywords = keywords.filter((kw) => counts[kw] > 0);
                  if (shownKeywords.length === 0) {
                    return (
                      <p style={{ color: "#475569", fontSize: "14px" }}>
                        No keywords found in report.
                      </p>
                    );
                  }

                  // Donut chart data
                  const donutData = shownKeywords.map((kw, i) => ({
                    label: kw,
                    value: counts[kw],
                    color: palette[i % palette.length],
                  }));

                  // Donut chart component (SVG, hover popup above cursor)
                  function DonutChart({ data, size = 120, strokeWidth = 24 }) {
                    const total = data.reduce((sum, d) => sum + d.value, 0);
                    let startAngle = 0;
                    const center = size / 2;
                    const radius = center - strokeWidth / 2;
                    const segments = data.map((d, idx) => {
                      const angle = (d.value / total) * 360;
                      const endAngle = startAngle + angle;
                      // Convert angles to radians
                      const startRadians = (startAngle - 90) * (Math.PI / 180);
                      const endRadians = (endAngle - 90) * (Math.PI / 180);
                      // Calculate arc points
                      const x1 = center + radius * Math.cos(startRadians);
                      const y1 = center + radius * Math.sin(startRadians);
                      const x2 = center + radius * Math.cos(endRadians);
                      const y2 = center + radius * Math.sin(endRadians);
                      const largeArcFlag = angle > 180 ? 1 : 0;
                      const pathData = [
                        `M ${x1} ${y1}`,
                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                      ].join(" ");
                      const percent = ((d.value / total) * 100).toFixed(1);
                      startAngle = endAngle;
                      return (
                        <path
                          key={d.label}
                          d={pathData}
                          stroke={d.color}
                          strokeWidth={strokeWidth}
                          fill="none"
                          style={{
                            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.07))",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            setDonutHover({
                              label: d.label,
                              percent,
                              x: e.clientX,
                              y: e.clientY,
                              color: d.color,
                            });
                          }}
                          onMouseMove={(e) => {
                            setDonutHover({
                              label: d.label,
                              percent,
                              x: e.clientX,
                              y: e.clientY,
                              color: d.color,
                            });
                          }}
                        />
                      );
                    });
                    return (
                      <svg
                        width={size}
                        height={size}
                        style={{
                          margin: "0 auto 16px auto",
                          display: "block",
                          position: "relative",
                          zIndex: 1,
                        }}
                        onMouseLeave={() => setDonutHover(null)}
                      >
                        {segments}
                        {/* Center circle for donut effect */}
                        <circle
                          cx={center}
                          cy={center}
                          r={radius - strokeWidth / 2}
                          fill="#f9fafb"
                        />
                      </svg>
                    );
                  }

                  // Render popup absolutely in the document, above cursor
                  const popup = donutHover ? (
                    <div
                      style={{
                        position: "fixed",
                        left: donutHover.x,
                        top: donutHover.y - 48,
                        transform: "translate(-50%, -100%)",
                        background: "#fff",
                        color: "#7c8da0",
                        border: `1.5px solid ${donutHover.color}`,
                        borderRadius: 8,
                        boxShadow: "0 2px 12px rgba(124,138,160,0.13)",
                        padding: "8px 16px",
                        fontSize: 14,
                        fontWeight: 600,
                        pointerEvents: "none",
                        zIndex: 9999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ color: "#7c8da0", fontWeight: 700 }}>
                        {donutHover.label}
                      </span>
                      {": "}
                      <span>{donutHover.percent}%</span>
                    </div>
                  ) : null;

                  return (
                    <>
                      {popup}
                      <div style={{ position: "relative" }}>
                        <DonutChart
                          data={donutData}
                          size={120}
                          strokeWidth={24}
                        />
                      </div>
                      <div style={{ height: 18 }} />
                      <div
                        style={{
                          fontSize: 14,
                          color: "#7c8da0",
                          fontWeight: 600,
                          marginBottom: 10,
                        }}
                      >
                        Total Keywords: {totalKeywordCount}
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {shownKeywords.map((kw, i) => (
                          <li
                            key={kw}
                            style={{
                              marginBottom: "10px",
                              fontSize: "14px",
                              color: "#475569",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                width: "16px",
                                height: "16px",
                                borderRadius: "50%",
                                background: palette[i % palette.length],
                                display: "inline-block",
                                marginRight: "6px",
                                border: "1px solid #e0e7ef",
                              }}
                              aria-label={`Color for ${kw}`}
                            ></span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: "#7c8da0",
                                minWidth: "80px",
                              }}
                            >
                              {kw}
                            </span>
                            <span style={{ fontWeight: 500 }}>
                              {counts[kw]} (
                              {((counts[kw] / totalKeywordCount) * 100).toFixed(
                                1,
                              )}
                              %)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  );
                })()}
              </div>
            </div>
            <div
              className="next-steps"
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                marginTop: "32px",
              }}
            >
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
        <h2>Accessa</h2>
      </footer>
    </>
  );
}

export default Complete;
