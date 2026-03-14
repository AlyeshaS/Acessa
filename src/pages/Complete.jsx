import React, { useEffect, useRef, useState } from "react";
import { aiModifyHtml } from "../api/wcagAPI";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/App.css";
import "../styles/index.css";
import { MOCK_URL, MOCK_ANALYSIS } from "../mockData.js";

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

function ScoreCircle({ value = 0, size = 120, strokeWidth = 14, label }) {
  const clamped = Math.max(0, Math.min(100, value)); // 0–100 safety
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // Piecewise colour stops matching the reference image:
  // 0–60  → deep crimson red
  // 60–68 → quick jump to amber/gold
  // 68–82 → amber to yellow-green
  // 82–100 → yellow-green to vibrant green
  const stops = [
    [0,   4,  78, 40],   // deep red
    [60,  6,  78, 40],   // still red
    [68,  43, 94, 47],   // amber / gold
    [82,  88, 68, 42],   // yellow-green
    [100, 142, 58, 40],  // vibrant green
  ];
  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (clamped >= stops[i][0] && clamped <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const t = upper[0] === lower[0] ? 0 : (clamped - lower[0]) / (upper[0] - lower[0]);
  const h = Math.round(lower[1] + t * (upper[1] - lower[1]));
  const s = Math.round(lower[2] + t * (upper[2] - lower[2]));
  const l = Math.round(lower[3] + t * (upper[3] - lower[3]));
  const color = `hsl(${h}, ${s}%, ${l}%)`;

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
          style={{ stroke: color }}
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
          fill={color}
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

// --- WCAG Code Suggestions lookup ---
// Generic fixes that apply to any website — keyed by criterion number (e.g. "2.4.4")
// Each entry: effort, where, before (broken), after tabs (html/css/js/react), testSteps, links
const WCAG_CODE_SUGGESTIONS = {
  "1.1.1": {
    effort: { label: "Quick fix", time: "~10 min", color: "#16a34a" },
    where: "Find every <img>, <svg>, and <canvas> element in your HTML/templates.",
    before: `<!-- ❌ Missing alt — screen reader says "image" or the filename -->
<img src="hero-banner.jpg" />
<img src="chart-q3.png" />

<!-- ❌ SVG with no label — announced as nothing -->
<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>`,
    html: `<!-- ✅ Meaningful images get a descriptive alt -->
<img src="hero-banner.jpg"
     alt="Team of developers collaborating around a laptop" />

<!-- ✅ Data visualisations describe the key insight -->
<img src="chart-q3.png"
     alt="Bar chart: Q3 sales up 20% vs Q2, reaching $1.2M" />

<!-- ✅ Decorative images get an empty alt — AT skips them -->
<img src="divider-wave.svg" alt="" role="presentation" />

<!-- ✅ Inline SVG: use role + aria-label, hide children -->
<svg role="img" aria-label="Warning: action cannot be undone"
     viewBox="0 0 24 24" aria-hidden="false">
  <title>Warning</title>   <!-- fallback for older AT -->
  <path d="M12 2L2 22h20L12 2z"/>
</svg>

<!-- ✅ Icon-only SVG next to text: hide from AT entirely -->
<button>
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41..."/>
  </svg>
  Close
</button>`,
    css: null,
    react: `// ✅ React: always pass alt; use empty string for decorative
<img src={heroBanner} alt="Team collaborating on a project" />
<img src={decorativeDivider} alt="" role="presentation" />

// ✅ SVG icon component pattern
function Icon({ label, children }) {
  return label
    ? <svg role="img" aria-label={label}>{children}</svg>
    : <svg aria-hidden="true" focusable="false">{children}</svg>;
}
// Usage:
<Icon label="Warning">...</Icon>   // meaningful
<Icon>...</Icon>                   // decorative`,
    js: null,
    testSteps: [
      "Open browser DevTools → Elements tab → find every <img>",
      "Check each <img> has a meaningful alt attribute (not empty, not just the filename)",
      "For SVGs: ensure decorative ones have aria-hidden='true'; informative ones have role='img' + aria-label",
      "Use a screen reader (VoiceOver / NVDA) and tab through images — each should be announced meaningfully",
      "Run axe DevTools or Lighthouse → 'image-alt' rule should pass",
    ],
    links: [
      { label: "WCAG 1.1.1 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html" },
      { label: "MDN: alt attribute", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#alt" },
      { label: "Alt text decision tree", url: "https://www.w3.org/WAI/tutorials/images/decision-tree/" },
    ],
  },

  "1.3.1": {
    effort: { label: "Moderate", time: "~1–2 hours", color: "#d97706" },
    where: "Audit your page structure: headings, lists, tables, forms, and landmark regions.",
    before: `<!-- ❌ Div soup — no semantic meaning for AT -->
<div class="nav">
  <div class="nav-item"><a href="/">Home</a></div>
</div>
<div class="heading">Latest News</div>
<div class="data-table">
  <div class="row"><div>Name</div><div>Score</div></div>
</div>
<div class="field-wrap">
  <div>Email</div>
  <input type="email" />
</div>`,
    html: `<!-- ✅ Use landmark elements so AT users can jump between sections -->
<header><nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav></header>

<main>
  <!-- ✅ Heading hierarchy: only one h1, then h2/h3 in order -->
  <h1>Latest News</h1>
  <section aria-labelledby="section-title">
    <h2 id="section-title">Top Stories</h2>
  </section>

  <!-- ✅ Data tables with captions and scope -->
  <table>
    <caption>Q3 Accessibility Scores</caption>
    <thead>
      <tr>
        <th scope="col">Page</th>
        <th scope="col">Score</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Home</td><td>87</td></tr>
    </tbody>
  </table>

  <!-- ✅ Forms: every input labelled -->
  <form>
    <label for="email">Email address</label>
    <input id="email" type="email" autocomplete="email" />
  </form>
</main>
<footer>...</footer>`,
    css: null,
    react: `// ✅ Use semantic JSX elements — they map directly to HTML
function Page() {
  return (
    <>
      <header>
        <nav aria-label="Main navigation">...</nav>
      </header>
      <main>
        <h1>Latest News</h1>
        {/* Form with associated label */}
        <label htmlFor="email">Email address</label>
        <input id="email" type="email" autoComplete="email" />
      </main>
      <footer>...</footer>
    </>
  );
}`,
    js: null,
    testSteps: [
      "Install the Headings Map browser extension — verify heading order (h1→h2→h3, no skips)",
      "Use screen reader 'Landmarks' shortcut to confirm header/nav/main/footer are announced",
      "Tab through every form field — each should announce its label when focused",
      "Run axe DevTools → look for 'region', 'label', 'table-duplicate-name' violations",
      "Check tables: every column/row header should have scope='col' or scope='row'",
    ],
    links: [
      { label: "WCAG 1.3.1 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html" },
      { label: "MDN: HTML landmark elements", url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/landmark_role" },
      { label: "WebAIM: semantic structure", url: "https://webaim.org/techniques/semanticstructure/" },
    ],
  },

  "1.4.3": {
    effort: { label: "Quick fix", time: "~20 min", color: "#16a34a" },
    where: "Update your CSS color values — usually in design tokens, utility classes, or component styles.",
    before: `/* ❌ Fails WCAG AA — contrast ratios below 4.5:1 */
.body-text  { color: #aaaaaa; background: #ffffff; } /* 2.32:1 ❌ */
.caption    { color: #bbbbbb; background: #f5f5f5; } /* 1.85:1 ❌ */
.link       { color: #6eb8ff; background: #ffffff; } /* 3.12:1 ❌ */
.badge-muted{ color: #999999; background: #eeeeee; } /* 2.85:1 ❌ */`,
    html: null,
    css: `/* ✅ All pass WCAG AA (4.5:1 for normal text, 3:1 for large text) */

/* Body / paragraph text */
.body-text { color: #374151; background: #ffffff; } /* 10.7:1 ✅ */

/* Captions and helper text (still needs 4.5:1 if < 18pt) */
.caption   { color: #6b7280; background: #ffffff; } /* 5.74:1 ✅ */

/* Links — ensure distinguishable without colour alone */
.link {
  color: #1d4ed8;           /* 7.3:1 on white ✅ */
  text-decoration: underline; /* visible even for colour-blind users */
}
.link:hover { color: #1e40af; }

/* Badges / tags */
.badge-muted {
  color: #1f2937;           /* dark text on light bg */
  background: #e5e7eb;      /* 14.1:1 ✅ */
}

/* Dark theme — check both themes! */
@media (prefers-color-scheme: dark) {
  .body-text { color: #f3f4f6; background: #111827; } /* 16.1:1 ✅ */
}`,
    react: null,
    js: `// Utility: check contrast ratio at runtime (dev/testing tool)
function getLuminance(hex) {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16 & 255) / 255;
  const g = (rgb >> 8  & 255) / 255;
  const b = (rgb       & 255) / 255;
  const toLinear = c => c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4;
  return 0.2126*toLinear(r) + 0.7152*toLinear(g) + 0.0722*toLinear(b);
}
function contrastRatio(hex1, hex2) {
  const L1 = getLuminance(hex1), L2 = getLuminance(hex2);
  const [light, dark] = L1 > L2 ? [L1, L2] : [L2, L1];
  return ((light + 0.05) / (dark + 0.05)).toFixed(2);
}
// Example:
console.log(contrastRatio('#6b7280', '#ffffff')); // 5.74 ✅`,
    testSteps: [
      "Open WebAIM Contrast Checker (webaim.org/resources/contrastchecker) and test your main text/background pairs",
      "In Chrome DevTools, inspect any text element → Accessibility tab → check 'Contrast' ratio",
      "Test with Colorblinding extension (simulates 8 colour vision deficiencies)",
      "Run Lighthouse → Accessibility → look for 'color-contrast' failures",
      "Remember to test: body text, headings, placeholder text, disabled states, link text, and badge labels",
    ],
    links: [
      { label: "WCAG 1.4.3 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" },
      { label: "WebAIM Contrast Checker", url: "https://webaim.org/resources/contrastchecker/" },
      { label: "Who Can Use (contrast simulator)", url: "https://www.whocanuse.com/" },
    ],
  },

  "1.4.11": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where: "Global CSS — typically your reset/base stylesheet or design-token file.",
    before: `/* ❌ Default browser outline removed — nothing visible on focus */
* { outline: none; }

/* ❌ Input borders too light — fails 3:1 against white background */
input { border: 1px solid #d1d5db; } /* ~1.6:1 ❌ */

/* ❌ Checkbox/radio with no visible boundary */
input[type="checkbox"] { border: none; background: #e5e7eb; }`,
    html: null,
    css: `/* ✅ Always keep a visible focus ring — never remove without replacing */
/* Remove only the browser default; add your own */
:focus { outline: none; }        /* hide browser default */
:focus-visible {                 /* show custom ring on keyboard nav */
  outline: 3px solid #2563eb;
  outline-offset: 3px;
  border-radius: 4px;
}

/* ✅ Form field borders — need 3:1 against background */
input, select, textarea {
  border: 2px solid #6b7280;    /* 5.9:1 on white ✅ */
  border-radius: 6px;
  padding: 8px 12px;
}
input:focus-visible {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.25);
}

/* ✅ Custom checkbox: visible box AND checked state */
input[type="checkbox"] {
  width: 18px; height: 18px;
  border: 2px solid #374151;    /* 14.3:1 ✅ */
  border-radius: 3px;
  accent-color: #2563eb;        /* native checked colour (modern browsers) */
}

/* ✅ Icon buttons need a visible boundary */
.icon-btn {
  border: 2px solid #6b7280;
  border-radius: 8px;
  padding: 8px;
  background: transparent;
}
.icon-btn:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}`,
    react: null,
    js: null,
    testSteps: [
      "Tab through the entire page without a mouse — every interactive element must show a visible ring",
      "Inspect focus ring: must have 3:1 contrast against adjacent background (use DevTools eyedropper)",
      "Check form borders: select an input, measure border vs background contrast",
      "Test custom checkboxes and radio buttons — border must be visible in unchecked state",
      "Run axe DevTools → look for 'focus-visible' and 'non-text-contrast' violations",
    ],
    links: [
      { label: "WCAG 1.4.11 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html" },
      { label: "MDN: :focus-visible", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible" },
      { label: "WebAIM: keyboard navigation", url: "https://webaim.org/techniques/keyboard/" },
    ],
  },

  "2.1.1": {
    effort: { label: "Moderate", time: "~30–60 min", color: "#d97706" },
    where: "Any interactive element built from <div> or <span> instead of native HTML controls.",
    before: `<!-- ❌ Custom widget — not keyboard reachable, no role -->
<div class="dropdown" onclick="toggleMenu()">
  Options ▾
</div>

<!-- ❌ Loses focus after close — user stranded -->
<div class="modal">
  <div class="close-btn" onclick="closeModal()">✕</div>
</div>`,
    html: `<!-- ✅ Use native elements whenever possible — free keyboard support -->
<button type="button" onclick="toggleMenu()"
        aria-expanded="false" aria-controls="menu-list">
  Options ▾
</button>
<ul id="menu-list" role="menu" hidden>
  <li role="menuitem"><a href="/profile">Profile</a></li>
  <li role="menuitem"><a href="/settings">Settings</a></li>
</ul>

<!-- ✅ Custom widget: tabindex + role + keyboard handler -->
<div role="button" tabindex="0"
     aria-label="Open colour picker"
     onclick="openPicker()"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPicker();}">
  🎨
</div>

<!-- ✅ Modal: trap focus inside, restore on close -->
<dialog id="confirm-modal" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm action</h2>
  <button autofocus>Yes, continue</button>
  <button onclick="closeModal()">Cancel</button>
</dialog>`,
    css: null,
    react: `// ✅ React: use native elements; add keyboard handlers to custom widgets
function Dropdown({ items }) {
  const [open, setOpen] = React.useState(false);
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(o => !o);
    }
    if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKey}
      >
        Options ▾
      </button>
      {open && (
        <ul role="listbox">
          {items.map(item => (
            <li key={item.id} role="option">{item.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}`,
    js: `// Focus management: restore focus after closing a modal/overlay
function openModal(modal, trigger) {
  modal.removeAttribute('hidden');
  modal.setAttribute('aria-modal', 'true');
  // Move focus to first focusable element inside modal
  const focusable = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  focusable[0]?.focus();

  // Trap focus within modal
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  // On close: return focus to the element that opened the modal
  return () => { modal.hidden = true; trigger.focus(); };
}`,
    testSteps: [
      "Unplug your mouse and navigate the entire page using Tab, Shift+Tab, Enter, Space, and arrow keys",
      "Every clickable element must be reachable and activatable via keyboard",
      "Open and close every dropdown, modal, and tooltip — focus must never get 'trapped' or 'lost'",
      "After closing a modal, focus should return to the button that opened it",
      "Run axe DevTools → look for 'keyboard', 'scrollable-region-focusable', and 'tabindex' violations",
    ],
    links: [
      { label: "WCAG 2.1.1 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html" },
      { label: "MDN: Keyboard-navigable JS widgets", url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets" },
      { label: "WAI-ARIA Authoring Practices", url: "https://www.w3.org/WAI/ARIA/apg/patterns/" },
    ],
  },

  "2.4.1": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where: "Add to the very top of your page layout component, before the <nav>.",
    before: `<!-- ❌ No way to skip the navbar — keyboard users tab through
     every nav link on every page before reaching content -->
<body>
  <nav>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/blog">Blog</a>
    <!-- ...10 more links... -->
  </nav>
  <main>Page content here</main>
</body>`,
    html: `<!-- ✅ Skip link: first element in <body>, visually hidden until focused -->
<body>
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>

  <nav aria-label="Main navigation">
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>

  <!-- ✅ id must match href above -->
  <main id="main-content" tabindex="-1">
    <h1>Welcome</h1>
    <!-- page content -->
  </main>
</body>`,
    css: `/* ✅ Visually hidden until keyboard-focused */
.skip-link {
  position: absolute;
  top: -120%;           /* off-screen by default */
  left: 1rem;
  z-index: 9999;

  background: #1d4ed8;
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
  padding: 10px 20px;
  border-radius: 0 0 10px 10px;
  text-decoration: none;
  transition: top 0.15s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* Slide into view when focused */
.skip-link:focus {
  top: 0;
}`,
    react: `// ✅ React: place SkipLink as first child in your root layout
function SkipLink() {
  return (
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
  );
}

function Layout({ children }) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  );
}`,
    js: null,
    testSteps: [
      "Press Tab as your very first action on the page — the skip link should appear",
      "Press Enter on the skip link — focus should jump directly to main content (h1 or first paragraph)",
      "Verify the skip link is invisible at rest but visible when focused (never permanently visible)",
      "Test on every page template, not just the home page",
      "Run Lighthouse → Accessibility → look for 'bypass' failure",
    ],
    links: [
      { label: "WCAG 2.4.1 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html" },
      { label: "WebAIM: skip navigation", url: "https://webaim.org/techniques/skipnav/" },
    ],
  },

  "2.4.4": {
    effort: { label: "Quick fix", time: "~10–20 min", color: "#16a34a" },
    where: "Find every <a> element — pay special attention to icon links, 'Read more' links, and social icons.",
    before: `<!-- ❌ Vague — screen reader announces "link: click here"
     with no indication of the destination -->
<a href="/report.pdf">Click here</a>
<a href="/article-42">Read more</a>

<!-- ❌ Icon-only link — announced as blank or the URL -->
<a href="https://twitter.com/acme">
  <img src="twitter-icon.svg" />
</a>

<!-- ❌ Repeated identical text for different destinations -->
<a href="/post-1">Read more</a>
<a href="/post-2">Read more</a>`,
    html: `<!-- ✅ Descriptive link text — clear without surrounding context -->
<a href="/report.pdf">
  Download 2024 Accessibility Report (PDF, 2.4 MB)
</a>

<!-- ✅ "Read more" extended with visually-hidden context -->
<a href="/article-42">
  Read more
  <span class="sr-only"> about WCAG 2.4.4 link purpose</span>
</a>

<!-- ✅ Icon link: aria-label describes the destination -->
<a href="https://twitter.com/acme"
   aria-label="Follow ACME on Twitter (opens in new tab)"
   target="_blank" rel="noopener">
  <img src="twitter-icon.svg" alt="" />  <!-- alt="" because label is on <a> -->
</a>

<!-- ✅ Unique "Read more" links using aria-label -->
<a href="/post-1" aria-label="Read more about our Q3 results">Read more</a>
<a href="/post-2" aria-label="Read more about the new product launch">Read more</a>`,
    css: `/* ✅ Visually-hidden helper — works with any framework */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}`,
    react: `// ✅ Reusable VisuallyHidden component
function VisuallyHidden({ children }) {
  return <span className="sr-only">{children}</span>;
}

// Usage in a "Read more" link:
function ArticleCard({ article }) {
  return (
    <a href={article.url}>
      Read more
      <VisuallyHidden> about {article.title}</VisuallyHidden>
    </a>
  );
}

// Icon link with aria-label:
function TwitterLink({ handle }) {
  return (
    <a
      href={\`https://twitter.com/\${handle}\`}
      aria-label={\`Follow \${handle} on Twitter (opens in new tab)\`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <TwitterIcon aria-hidden="true" />
    </a>
  );
}`,
    js: null,
    testSteps: [
      "Open a screen reader and activate 'Links list' mode (NVDA: Insert+F7 / VoiceOver: VO+U then arrow to Links) — every link must make sense out of context",
      "Search your codebase for link text like 'click here', 'read more', 'here', 'learn more', 'this link'",
      "Find every icon-only <a> and confirm it has aria-label or visually-hidden text",
      "Check that links to PDFs/external sites indicate so in the label",
      "Run axe DevTools → 'link-name' rule must pass",
    ],
    links: [
      { label: "WCAG 2.4.4 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html" },
      { label: "WebAIM: links & hypertext", url: "https://webaim.org/techniques/hypertext/" },
      { label: "MDN: aria-label", url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label" },
    ],
  },

  "2.4.7": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where: "Your global CSS reset/base file — typically where `outline: none` or `outline: 0` appears.",
    before: `/* ❌ The #1 accessibility mistake — removes ALL focus indicators */
* { outline: none; }
a, button, input { outline: 0; }

/* ❌ Focus style so subtle it's invisible */
:focus { outline: 1px dotted #ccc; }`,
    html: null,
    css: `/* ✅ Step 1: Remove the blanket outline suppression */
/* DELETE or replace: * { outline: none; } */

/* ✅ Step 2: Keep mouse clicks clean, keyboard nav visible */
:focus               { outline: none; }       /* hide for mouse */
:focus-visible       {                         /* show for keyboard */
  outline: 3px solid #2563eb;
  outline-offset: 3px;
  border-radius: 4px;
}

/* ✅ High contrast for buttons */
button:focus-visible, [role="button"]:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
  box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.25);
}

/* ✅ Links: offset so the ring doesn't overlap underline */
a:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
  border-radius: 2px;
}

/* ✅ Inputs already have borders — use box-shadow for ring */
input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4);
  border-color: #2563eb;
}`,
    react: null,
    js: null,
    testSteps: [
      "Tab through every interactive element on the page — a visible ring must appear on each one",
      "Test with both keyboard (Tab) and mouse clicks — ring should only show for keyboard",
      "Check that focus ring has 3:1 contrast against the surrounding background",
      "Test in Windows High Contrast mode (Settings → Accessibility → Contrast themes)",
      "Search your codebase for 'outline: none' and 'outline: 0' — audit each instance",
    ],
    links: [
      { label: "WCAG 2.4.7 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html" },
      { label: "MDN: :focus-visible", url: "https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible" },
      { label: "WCAG 2.4.11 (enhanced focus, WCAG 2.2)", url: "https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html" },
    ],
  },

  "3.3.1": {
    effort: { label: "Moderate", time: "~30–45 min", color: "#d97706" },
    where: "Every form on your site — look for validation logic and error message rendering.",
    before: `<!-- ❌ Error shown visually but not connected to input -->
<input type="email" class="error" />
<div class="error-msg" style="color:red">Invalid email</div>

<!-- ❌ Error conveyed only with colour — colour-blind users miss it -->
<input style="border-color: red" />`,
    html: `<!-- ✅ Associate error to input via aria-describedby -->
<div class="field">
  <label for="email">
    Email address
    <span aria-hidden="true" style="color:#c0392b"> *</span>
    <span class="sr-only">(required)</span>
  </label>

  <input
    id="email"
    type="email"
    name="email"
    autocomplete="email"
    aria-required="true"
    aria-describedby="email-hint email-error"
    aria-invalid="true"
  />

  <!-- Helper text always visible -->
  <span id="email-hint" class="field-hint">
    Format: name@example.com
  </span>

  <!-- Error: role="alert" announces immediately to screen readers -->
  <span id="email-error" role="alert" class="field-error">
    <svg aria-hidden="true"><!-- error icon --></svg>
    Please enter a valid email address.
  </span>
</div>`,
    css: `/* ✅ Error conveyed with icon + text + border (not colour alone) */
.field-error {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #b91c1c;
  font-size: 13px;
  margin-top: 6px;
  font-weight: 600;
}

/* ✅ Error border — add thickness/style change, not just colour */
input[aria-invalid="true"] {
  border: 2px solid #dc2626;
  background: #fef2f2;
  /* also change border-style so it's distinct for colour-blind users */
  border-style: solid;
  outline-color: #dc2626;
}

.field-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  display: block;
}`,
    react: `// ✅ React form field with full accessible error handling
function FormField({ id, label, type = 'text', error, hint, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
        {props.required && <span className="sr-only">(required)</span>}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={!!error}
        aria-describedby={[hint && \`\${id}-hint\`, error && \`\${id}-error\`]
          .filter(Boolean).join(' ') || undefined}
        {...props}
      />
      {hint && <span id={\`\${id}-hint\`} className="field-hint">{hint}</span>}
      {error && (
        <span id={\`\${id}-error\`} role="alert" className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}`,
    js: `// ✅ Validate and set ARIA attributes on submit
document.querySelector('form').addEventListener('submit', function(e) {
  const email = document.getElementById('email');
  const errorEl = document.getElementById('email-error');
  const valid = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email.value);

  email.setAttribute('aria-invalid', String(!valid));

  if (!valid) {
    e.preventDefault();
    errorEl.hidden = false;
    errorEl.textContent = 'Please enter a valid email address.';
    email.focus(); // move focus back to the problem field
  } else {
    errorEl.hidden = true;
  }
});`,
    testSteps: [
      "Submit an empty or invalid form — error messages must appear without page reload",
      "Focus an input with an error — screen reader should announce the error message",
      "Verify errors are NOT conveyed by colour alone (add icon, border thickness, or text prefix)",
      "Check: error is linked to its field via aria-describedby (inspect the DOM)",
      "Run axe DevTools after triggering errors → look for 'label', 'aria-invalid', 'required-children' failures",
    ],
    links: [
      { label: "WCAG 3.3.1 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html" },
      { label: "WebAIM: accessible forms", url: "https://webaim.org/techniques/forms/" },
      { label: "MDN: aria-invalid", url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid" },
    ],
  },

  "4.1.1": {
    effort: { label: "Quick fix", time: "~15 min", color: "#16a34a" },
    where: "Run an HTML validator on your pages — fix any duplicate IDs and unclosed elements.",
    before: `<!-- ❌ Duplicate IDs — AT reads the first and ignores the rest -->
<div id="search">Site search</div>
<div id="search">Product search</div>  <!-- duplicate -->

<!-- ❌ Unclosed tags — breaks DOM structure -->
<ul>
  <li>Item one
  <li>Item two    <!-- each <li> never closed -->
</ul>

<!-- ❌ Incorrect nesting -->
<a href="/">
  <div>This is invalid — block inside inline</div>
</a>`,
    html: `<!-- ✅ Every ID must be unique across the entire page -->
<div id="site-search">Site search</div>
<div id="product-search">Product search</div>

<!-- ✅ Close all tags properly -->
<ul>
  <li>Item one</li>
  <li>Item two</li>
</ul>

<!-- ✅ Valid nesting: inline elements inside block -->
<a href="/">
  <span>Home</span>    <!-- inline inside inline ✅ -->
</a>
<!-- OR (HTML5 allows <a> around blocks in specific cases) -->
<a href="/" style="display:contents">
  <article>...</article>
</a>`,
    css: null,
    react: null,
    js: `// Quick audit: find duplicate IDs on the current page
const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.warn('Duplicate IDs found:', [...new Set(dupes)]);
} else {
  console.log('✅ No duplicate IDs');
}`,
    testSteps: [
      "Paste your page URL into validator.w3.org — fix all reported errors and warnings",
      "In DevTools console, run: document.querySelectorAll('[id]') and check for duplicates",
      "Look for any component rendered multiple times that hardcodes an ID — make IDs dynamic",
      "Check that form labels reference valid input IDs via for/id pairs",
      "Run axe DevTools → 'duplicate-id', 'duplicate-id-active', 'duplicate-id-aria' rules",
    ],
    links: [
      { label: "WCAG 4.1.1 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/parsing.html" },
      { label: "W3C HTML Validator", url: "https://validator.w3.org/" },
    ],
  },

  "4.1.2": {
    effort: { label: "Quick fix", time: "~20 min", color: "#16a34a" },
    where: "Find every <button>, icon link, and custom interactive widget — look for missing labels.",
    before: `<!-- ❌ Button with only an icon — announced as "button" with no name -->
<button class="close"><svg><!-- × icon --></svg></button>
<button class="menu"><svg><!-- ☰ icon --></svg></button>

<!-- ❌ Link wrapping only an image with no alt -->
<a href="/home"><img src="logo.png" /></a>

<!-- ❌ Custom div-based widget — no role, no name, not focusable -->
<div class="star-rating" onclick="rate(5)">★★★★★</div>`,
    html: `<!-- ✅ Icon button: aria-label describes the ACTION -->
<button aria-label="Close dialog" class="close">
  <svg aria-hidden="true" focusable="false"><!-- × icon --></svg>
</button>
<button aria-label="Open navigation menu" aria-expanded="false" class="menu">
  <svg aria-hidden="true" focusable="false"><!-- ☰ icon --></svg>
</button>

<!-- ✅ Logo link: alt on the image acts as the link label -->
<a href="/">
  <img src="logo.png" alt="ACME — go to homepage" />
</a>

<!-- ✅ Custom widget: role + tabindex + aria-label + keyboard -->
<div role="radiogroup" aria-label="Rate this article">
  <button role="radio" aria-checked="false" aria-label="1 star" onclick="rate(1)">★</button>
  <button role="radio" aria-checked="false" aria-label="2 stars" onclick="rate(2)">★★</button>
  <button role="radio" aria-checked="true"  aria-label="3 stars" onclick="rate(3)">★★★</button>
</div>

<!-- ✅ Input with no visible label: use aria-label -->
<input type="search" aria-label="Search products" placeholder="Search…" />`,
    css: null,
    react: `// ✅ Icon button component — always requires a label prop
function IconButton({ label, icon: Icon, onClick, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      {...props}
    >
      <Icon aria-hidden="true" focusable="false" />
    </button>
  );
}

// Usage:
<IconButton label="Close dialog" icon={XMarkIcon} onClick={onClose} />
<IconButton label="Open menu"    icon={BarsIcon}  onClick={onMenu}  />`,
    js: `// Audit: find all interactive elements missing an accessible name
function auditAccessibleNames() {
  const selectors = 'button, a[href], input, select, textarea, [role="button"], [role="link"]';
  const issues = [];

  document.querySelectorAll(selectors).forEach(el => {
    const name = (
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent ||
      el.textContent?.trim() ||
      el.getAttribute('title') ||
      el.getAttribute('alt') ||
      el.getAttribute('placeholder')
    );
    if (!name || !name.trim()) {
      issues.push({ element: el, tag: el.tagName, role: el.getAttribute('role') });
    }
  });

  if (issues.length) {
    console.warn(\`Found \${issues.length} elements missing accessible names:\`, issues);
  } else {
    console.log('✅ All interactive elements have accessible names');
  }
  return issues;
}

auditAccessibleNames();`,
    testSteps: [
      "With a screen reader, Tab to every button and link — each must be announced with a clear, meaningful name",
      "Run auditAccessibleNames() in the browser console (see JS tab) — fix any reported elements",
      "Search codebase for <button> tags with no text content — add aria-label to each",
      "Check icon-only links (social icons, nav icons) for aria-label or descriptive img alt",
      "Run axe DevTools → 'button-name', 'link-name', 'image-alt' rules must all pass",
    ],
    links: [
      { label: "WCAG 4.1.2 spec", url: "https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html" },
      { label: "MDN: aria-label", url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label" },
      { label: "WAI-ARIA button pattern", url: "https://www.w3.org/WAI/ARIA/apg/patterns/button/" },
    ],
  },
};

// ─── Per-criterion plain-English user impact stories ─────────────────────────
const WCAG_USER_IMPACT = {
  "1.1.1": {
    users: ["Blind users", "Users with images disabled", "Screen reader users"],
    story: "A blind user relying on JAWS or NVDA will hear nothing when the screen reader reaches this image — it simply skips past it or reads out a filename like 'img_3847_final.jpg'. For meaningful images (charts, product photos, infographics) the user misses critical information entirely.",
    consequence: "Users cannot understand image content, may miss data or context, and face a degraded or unusable experience.",
  },
  "1.3.1": {
    users: ["Screen reader users", "Voice control users", "Keyboard users"],
    story: "When a form field has no programmatic label, a screen reader announces only 'edit text' when the user tabs to it — giving no indication of what to enter. Users must guess, leading to errors and form abandonment. Voice control users cannot target the field by name.",
    consequence: "Form completion becomes error-prone or impossible for assistive technology users, blocking access to core functionality.",
  },
  "1.4.3": {
    users: ["Low-vision users", "Elderly users", "Users in bright environments"],
    story: "Users with low vision, age-related vision changes, or reading disabilities struggle to read low-contrast text. In bright sunlight on a mobile screen, even fully-sighted users cannot read text that fails this criterion. It affects roughly 1 in 12 men and 1 in 200 women who have colour vision deficiencies.",
    consequence: "Content becomes unreadable for a significant portion of your audience, especially on mobile and in outdoor settings.",
  },
  "1.4.11": {
    users: ["Keyboard users", "Switch-access users", "Motor-impaired users"],
    story: "A keyboard-only user cannot see which UI element they are currently interacting with if the border or focus indicator has low contrast. Form inputs, checkboxes, and custom controls become effectively invisible — users do not know which field is active.",
    consequence: "Keyboard and switch users lose their position on the page constantly, making forms and interactive widgets extremely frustrating to use.",
  },
  "2.1.1": {
    users: ["Keyboard-only users", "Motor-impaired users", "Power users", "Screen reader users"],
    story: "Users who cannot use a mouse — including people with motor impairments and those using keyboard navigation — are completely blocked by interactive elements built from non-semantic HTML like <div> or <span>. Tab key skips them entirely, and Enter / Space do nothing.",
    consequence: "Key interactive elements (menus, modals, custom widgets) are completely inaccessible to keyboard users — a WCAG Level A blocker.",
  },
  "2.4.1": {
    users: ["Keyboard users", "Screen reader users", "Motor-impaired users"],
    story: "A keyboard-only user must Tab through every navigation link (often 10–20 items) on every single page load before reaching the main content. For a user with a motor impairment this is physically exhausting; for a screen reader user it wastes minutes per page.",
    consequence: "Without a skip link, repetitive navigation makes the site tedious and slow for keyboard and screen reader users, especially on long pages.",
  },
  "2.4.4": {
    users: ["Screen reader users", "Cognitive disability users", "Voice control users"],
    story: "When a screen reader reads the link list on a page, it may announce 'click here, click here, click here, read more, read more' with no indication of where each link goes. Users cannot scan for the link they need and must follow each one blindly to discover its destination.",
    consequence: "Navigation becomes guesswork for screen reader users. Voice control users cannot activate links by name since generic text like 'click here' is ambiguous.",
  },
  "2.4.7": {
    users: ["Keyboard users", "Motor-impaired users", "Switch-access users"],
    story: "A sighted keyboard user has no visible cursor indicator — they immediately lose their position on the page. This is equivalent to hiding the text cursor while typing. Users must Tab through every element from the start to find where they are.",
    consequence: "Keyboard navigation becomes disorienting and unusable. Many users will abandon the page rather than continue without a visible focus indicator.",
  },
  "3.1.1": {
    users: ["Screen reader users", "Translation tool users", "Language learners"],
    story: "Screen readers use the page language to select the correct pronunciation engine. Without a lang attribute, JAWS may read French text with English pronunciation rules, making it incomprehensible. Browser translation tools also fail to auto-detect and translate the page.",
    consequence: "Multilingual users and those relying on screen readers in non-English languages receive garbled or incorrect audio output.",
  },
  "3.3.1": {
    users: ["Screen reader users", "Cognitive disability users", "Voice control users"],
    story: "When a form is submitted with errors and feedback is communicated only through color (red border) or icons, screen reader users receive no feedback at all. They may repeatedly attempt to submit a broken form without knowing what went wrong or where the error is.",
    consequence: "Users with visual impairments cannot complete forms independently. Error recovery becomes impossible without text-based error messages.",
  },
  "4.1.1": {
    users: ["Screen reader users", "Assistive technology users"],
    story: "Duplicate element IDs break the association between HTML labels and their controls. A label referencing an ID that appears twice binds to the wrong element — the screen reader user hears the wrong field name when they focus an input, leading to confusing and incorrect form data.",
    consequence: "Form structure becomes unreliable for assistive technologies. Users may fill in the wrong fields or be unable to understand the form structure at all.",
  },
  "4.1.2": {
    users: ["Screen reader users", "Voice control users", "Keyboard users"],
    story: "A screen reader user hears only 'button' with no name when they focus an icon button. They have no idea what it does — submit, delete, edit, or something else. They must activate it and observe the outcome, which can have irreversible consequences like deleting content.",
    consequence: "Icon-only buttons and links are completely unusable by screen reader users. Voice control users cannot activate them by speaking their name.",
  },
};

const getGenericUserImpact = (severity) => {
  const sev = (severity || "").toLowerCase();
  if (sev === "high" || sev === "critical" || sev === "serious") {
    return "This is a critical barrier that may completely prevent users with disabilities from accessing or using this feature. People who rely on screen readers, keyboard navigation, or other assistive technologies are directly affected.";
  }
  if (sev === "medium" || sev === "moderate" || sev === "warning") {
    return "This issue creates a significant obstacle for users with disabilities. While some workarounds may exist, the experience is degraded and may lead to errors or abandonment for users of assistive technologies.";
  }
  return "This issue reduces the accessibility quality for users with disabilities. Addressing it improves the overall experience for screen reader users, keyboard navigators, and users with cognitive or visual impairments.";
};

// ─── Visual before/after previews (self-contained srcdoc HTML) ───────────────
const BASE = `<style>*{box-sizing:border-box}body{margin:12px;font-family:system-ui,sans-serif;font-size:13px;line-height:1.45;color:#334155}</style>`;
const WCAG_PREVIEWS = {
  "1.1.1": {
    broken: BASE + `<div style="background:#e2e8f0;width:90px;height:52px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;margin-bottom:6px">image</div><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ Screen reader announces: "" (silent)</p>`,
    fixed:  BASE + `<div style="background:#e2e8f0;width:90px;height:52px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;margin-bottom:6px">image</div><p style="margin:0;color:#16a34a;font-size:11.5px">✓ Screen reader: "Team collaborating around a laptop"</p>`,
  },
  "1.3.1": {
    broken: BASE + `<input type="text" placeholder="Enter your name" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;width:100%;font-size:13px;margin-bottom:6px"><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ Screen reader: "edit text" — field has no label</p>`,
    fixed:  BASE + `<label style="display:block;font-weight:600;margin-bottom:4px">Full name</label><input type="text" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;width:100%;font-size:13px;margin-bottom:6px"><p style="margin:0;color:#16a34a;font-size:11.5px">✓ Screen reader: "Full name, edit text"</p>`,
  },
  "1.4.3": {
    broken: BASE + `<div style="padding:10px;border-radius:6px;border:1px solid #f1f5f9"><p style="color:#bbb;margin:0 0 4px;font-size:15px">Welcome back, Sarah</p><p style="color:#ccc;margin:0;font-size:12px">Your subscription renews tomorrow</p><p style="margin:6px 0 0;color:#dc2626;font-size:11px">⚠ Contrast ratio ~2.3:1 — fails WCAG AA</p></div>`,
    fixed:  BASE + `<div style="padding:10px;border-radius:6px;border:1px solid #f1f5f9"><p style="color:#1e293b;margin:0 0 4px;font-size:15px">Welcome back, Sarah</p><p style="color:#475569;margin:0;font-size:12px">Your subscription renews tomorrow</p><p style="margin:6px 0 0;color:#16a34a;font-size:11px">✓ Contrast ratio ~8.6:1 — passes WCAG AA</p></div>`,
  },
  "1.4.11": {
    broken: BASE + `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:16px;height:16px;border:1.5px solid #e5e7eb;border-radius:3px;display:inline-block"></span><span>Subscribe to newsletter</span></div><input placeholder="Search…" style="padding:5px 8px;border:1px solid #efefef;border-radius:4px;font-size:13px;width:100%;margin-bottom:6px"><p style="margin:0;color:#dc2626;font-size:11px">⚠ UI borders fail 3:1 contrast ratio</p>`,
    fixed:  BASE + `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:16px;height:16px;border:2px solid #4b5563;border-radius:3px;display:inline-block"></span><span>Subscribe to newsletter</span></div><input placeholder="Search…" style="padding:5px 8px;border:2px solid #64748b;border-radius:4px;font-size:13px;width:100%;margin-bottom:6px"><p style="margin:0;color:#16a34a;font-size:11px">✓ UI borders meet 3:1 contrast ratio</p>`,
  },
  "2.1.1": {
    broken: BASE + `<div style="background:#189b97;color:#fff;padding:8px 14px;border-radius:6px;display:inline-block;cursor:pointer;margin-bottom:6px">Open Menu</div><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ &lt;div&gt; — Tab key skips this, Enter does nothing</p>`,
    fixed:  BASE + `<button style="background:#189b97;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;margin-bottom:6px">Open Menu</button><p style="margin:0;color:#16a34a;font-size:11.5px">✓ &lt;button&gt; — Tab reaches it, Enter/Space activates it</p>`,
  },
  "2.4.1": {
    broken: BASE + `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px"><div style="display:flex;gap:10px;margin-bottom:6px"><a href="#" style="color:#3b82f6;font-size:12px">Home</a><a href="#" style="color:#3b82f6;font-size:12px">About</a><a href="#" style="color:#3b82f6;font-size:12px">Services</a><a href="#" style="color:#3b82f6;font-size:12px">Contact</a></div><p style="margin:0;color:#dc2626;font-size:11px">⚠ Must Tab through all 4 nav links to reach content</p></div>`,
    fixed:  BASE + `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px"><a href="#main" style="display:inline-block;background:#0f172a;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;margin-bottom:5px;text-decoration:none">Skip to main content</a><div style="display:flex;gap:10px;margin-bottom:4px"><a href="#" style="color:#3b82f6;font-size:12px">Home</a><a href="#" style="color:#3b82f6;font-size:12px">About</a></div><p style="margin:0;color:#16a34a;font-size:11px">✓ 1st Tab press skips nav entirely</p></div>`,
  },
  "2.4.4": {
    broken: BASE + `<p style="margin:0 0 6px">Read our report. <a href="#" style="color:#3b82f6">Click here</a></p><p style="margin:0 0 6px">See pricing. <a href="#" style="color:#3b82f6">Click here</a></p><p style="margin:0 0 6px">Get support. <a href="#" style="color:#3b82f6">Click here</a></p><p style="margin:4px 0 0;color:#dc2626;font-size:11px">⚠ Screen reader link list: "click here, click here, click here"</p>`,
    fixed:  BASE + `<p style="margin:0 0 6px"><a href="#" style="color:#189b97">Download 2024 Annual Report (PDF)</a></p><p style="margin:0 0 6px"><a href="#" style="color:#189b97">View pricing plans</a></p><p style="margin:0 0 6px"><a href="#" style="color:#189b97">Contact support team</a></p><p style="margin:4px 0 0;color:#16a34a;font-size:11px">✓ Each link describes exactly where it goes</p>`,
  },
  "2.4.7": {
    broken: BASE + `<style>*:focus{outline:none!important}</style><p style="margin:0 0 8px;color:#64748b;font-size:11px">Tab key is on this button — can you tell?</p><button style="background:#189b97;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px">Submit</button><p style="margin:6px 0 0;color:#dc2626;font-size:11px">⚠ No ring — keyboard users have no visual position</p>`,
    fixed:  BASE + `<p style="margin:0 0 8px;color:#64748b;font-size:11px">Tab key is on this button — clearly visible:</p><button style="background:#189b97;border:none;color:#fff;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;outline:3px solid #0f172a;outline-offset:3px">Submit</button><p style="margin:6px 0 0;color:#16a34a;font-size:11px">✓ Focus ring clearly shows keyboard position</p>`,
  },
  "3.3.1": {
    broken: BASE + `<label style="display:block;font-weight:600;margin-bottom:4px">Email</label><input type="email" value="not-an-email" style="padding:6px 10px;border:2px solid #ef4444;border-radius:4px;width:100%;font-size:13px;color:#ef4444;margin-bottom:4px"><p style="margin:0;color:#dc2626;font-size:11px">⚠ Red border only — screen reader users get no error message</p>`,
    fixed:  BASE + `<label style="display:block;font-weight:600;margin-bottom:4px">Email</label><input type="email" value="not-an-email" style="padding:6px 10px;border:2px solid #ef4444;border-radius:4px;width:100%;font-size:13px;margin-bottom:4px"><p role="alert" style="margin:0 0 4px;color:#dc2626;font-size:11.5px;background:#fef2f2;padding:4px 8px;border-radius:4px">⚠ Enter a valid email, e.g. name@example.com</p><p style="margin:0;color:#16a34a;font-size:11px">✓ Text message announced immediately by screen readers</p>`,
  },
  "4.1.1": {
    broken: BASE + `<code style="display:block;background:#fef2f2;padding:8px;border-radius:6px;font-size:11.5px;border:1px solid #fca5a5;line-height:1.8">&lt;input id="<b style="color:#dc2626">name</b>"&gt;<br>&lt;label for="<b style="color:#dc2626">name</b>"&gt;First&lt;/label&gt;<br>&lt;input id="<b style="color:#dc2626">name</b>"&gt; ← duplicate!</code><p style="margin:6px 0 0;color:#dc2626;font-size:11px">⚠ Duplicate IDs — label binds to wrong element</p>`,
    fixed:  BASE + `<code style="display:block;background:#f0fdf4;padding:8px;border-radius:6px;font-size:11.5px;border:1px solid #86efac;line-height:1.8">&lt;input id="<b style="color:#16a34a">first-name</b>"&gt;<br>&lt;label for="<b style="color:#16a34a">first-name</b>"&gt;First&lt;/label&gt;<br>&lt;input id="<b style="color:#16a34a">last-name</b>"&gt; ← unique</code><p style="margin:6px 0 0;color:#16a34a;font-size:11px">✓ Unique IDs — every label targets the correct input</p>`,
  },
  "4.1.2": {
    broken: BASE + `<button style="background:#189b97;border:none;color:#fff;width:36px;height:36px;border-radius:6px;cursor:pointer;font-size:18px;margin-bottom:6px">✕</button><p style="margin:0;color:#dc2626;font-size:11.5px">⚠ Screen reader: "button" — user has no idea what this does</p>`,
    fixed:  BASE + `<button aria-label="Close dialog" style="background:#189b97;border:none;color:#fff;width:36px;height:36px;border-radius:6px;cursor:pointer;font-size:18px;margin-bottom:6px">✕</button><p style="margin:0;color:#16a34a;font-size:11.5px">✓ Screen reader: "Close dialog, button"</p>`,
  },
};

/** Extract the leading criterion number from a WCAG criterion string.
 *  "2.4.4 Link Purpose (In Context)" → "2.4.4" */
function getCriterionKey(criterion) {
  if (!criterion) return null;
  // Match "x.x.x" anywhere in the string — handles "2.4.4 Link Purpose",
  // "WCAG 2.4.4", "SC 2.4.4", "criterion-2.4.4", etc.
  const m = String(criterion).match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

// --- Accessibility Violations Filter UI ---
function severityColor(severity) {
  const s = (severity || "").toLowerCase();
  if (s === "critical" || s === "high" || s === "serious") return "#e53e3e";
  if (s === "moderate" || s === "medium" || s === "warning") return "#d97706";
  return "#16a34a";
}

function severityBg(severity) {
  const s = (severity || "").toLowerCase();
  if (s === "critical" || s === "high" || s === "serious") return "#fff5f5";
  if (s === "moderate" || s === "medium" || s === "warning") return "#fffbeb";
  return "#f0fdf4";
}

// ─── Code suggestion panel ───────────────────────────────────────────────────
function CodeSuggestionPanel({ criterion }) {
  const key = getCriterionKey(criterion);
  const s = key ? WCAG_CODE_SUGGESTIONS[key] : null;
  const preview = key ? WCAG_PREVIEWS[key] : null;

  const ALL_TABS = [
    { id: "before", label: "Before (broken)", color: "#dc2626", bg: "#fef2f2" },
    { id: "html",   label: "HTML fix",        color: "#e34c26", bg: "#fff5f2" },
    { id: "css",    label: "CSS fix",         color: "#189b97", bg: "#f0fdfa" },
    { id: "js",     label: "JS fix",          color: "#d97706", bg: "#fffbeb" },
    { id: "react",  label: "React fix",       color: "#0ea5e9", bg: "#f0f9ff" },
  ];

  const tabs = ALL_TABS.filter(t => s && s[t.id]);
  const [activeTab, setActiveTab] = React.useState(null);
  const [copied, setCopied]       = React.useState(false);
  const [testOpen, setTestOpen]   = React.useState(false);

  React.useEffect(() => {
    if (tabs.length > 0) setActiveTab(tabs[0].id);
  }, [criterion]);

  if (!s || tabs.length === 0) return null;

  const activeTabMeta = ALL_TABS.find(t => t.id === activeTab);

  function handleCopy() {
    const code = s[activeTab] || "";
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ marginTop: 14, borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", background: "#f8fafc" }}>

      {/* ── Where to apply ── */}
      {s.where && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: "#f0f9ff", borderBottom: "1px solid #bae6fd" }}>
          <svg style={{ flexShrink: 0, marginTop: 1 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>
            <strong>Where to apply: </strong>{s.where}
          </span>
        </div>
      )}

      {/* ── Before / After visual preview ── */}
      {preview && (
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ flex: 1, borderRight: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#dc2626", background: "#fef2f2", padding: "4px 10px", borderBottom: "1px solid #fca5a5" }}>
              Before — broken
            </div>
            <iframe
              srcDoc={preview.broken}
              style={{ width: "100%", height: 130, border: "none", display: "block" }}
              scrolling="no"
              title="Broken example"
              sandbox="allow-same-origin"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#16a34a", background: "#f0fdf4", padding: "4px 10px", borderBottom: "1px solid #86efac" }}>
              After — fixed
            </div>
            <iframe
              srcDoc={preview.fixed}
              style={{ width: "100%", height: 130, border: "none", display: "block" }}
              scrolling="no"
              title="Fixed example"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #e2e8f0", background: "#f1f5f9", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 14px",
            fontSize: 12, fontWeight: 700,
            fontFamily: "'SFMono-Regular','Consolas',monospace",
            border: "none",
            borderBottom: activeTab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
            background: activeTab === t.id ? "#ffffff" : "transparent",
            color: activeTab === t.id ? t.color : "#64748b",
            cursor: "pointer", transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}>
            {t.id === "before" && "⚠ "}{t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {/* Copy button */}
        <button onClick={handleCopy} style={{
          padding: "6px 14px", fontSize: 11, fontWeight: 700,
          border: "none", background: "transparent",
          color: copied ? "#16a34a" : "#64748b",
          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          transition: "color 0.2s", whiteSpace: "nowrap",
        }}>
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* ── Code block ── */}
      <div style={{ position: "relative", background: activeTab === "before" ? "#fef2f2" : "#ffffff" }}>
        {activeTab === "before" && (
          <div style={{ position: "absolute", top: 8, right: 10, fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.7 }}>
            ❌ Broken — do not use
          </div>
        )}
        <pre style={{
          margin: 0, padding: "16px",
          fontSize: 12.5, lineHeight: 1.7,
          fontFamily: "'SFMono-Regular','Consolas','Liberation Mono',monospace",
          color: activeTab === "before" ? "#7f1d1d" : "#1e293b",
          overflowX: "auto", whiteSpace: "pre",
          maxHeight: 340, overflowY: "auto",
        }}>
          <code>{s[activeTab]}</code>
        </pre>
      </div>

      {/* ── Effort badge + external links ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap" }}>
        {s.effort && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 11, fontWeight: 700,
            color: s.effort.color,
            background: `${s.effort.color}15`,
            border: `1px solid ${s.effort.color}44`,
            borderRadius: 999, padding: "3px 10px",
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {s.effort.label} · {s.effort.time}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {(s.links || []).map(link => (
          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 11, fontWeight: 600, color: "#0284c7",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3,
          }}>
            {link.label}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        ))}
      </div>

      {/* ── Test steps (collapsible) ── */}
      {s.testSteps && s.testSteps.length > 0 && (
        <div style={{ borderTop: "1px solid #e2e8f0" }}>
          <button onClick={() => setTestOpen(o => !o)} style={{
            width: "100%", padding: "9px 14px",
            display: "flex", alignItems: "center", gap: 8,
            background: testOpen ? "#f0fdf4" : "#f8fafc",
            border: "none", borderTop: testOpen ? "none" : undefined,
            cursor: "pointer", textAlign: "left",
            fontSize: 12, fontWeight: 700,
            color: testOpen ? "#15803d" : "#475569",
            transition: "background 0.15s",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={testOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
            </svg>
            {testOpen ? "Hide" : "Show"} how to test this fix ({s.testSteps.length} steps)
          </button>
          {testOpen && (
            <ol style={{ margin: 0, padding: "12px 14px 14px 34px", listStyle: "decimal", background: "#f0fdf4" }}>
              {s.testSteps.map((step, i) => (
                <li key={i} style={{ fontSize: 12.5, color: "#166534", lineHeight: 1.65, marginBottom: 6 }}>
                  {step}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function ViolationsFilterSection({
  violations = [],
  groupedByPrinciple = {
    Perceivable: [],
    Operable: [],
    Understandable: [],
    Robust: [],
  },
  siteUrl = "",
}) {
  // --- Grouped by Principle Section ---
  const principles = [
    { key: "Perceivable",    color: "#3b82f6", bg: "#eff6ff" },
    { key: "Operable",       color: "#d97706", bg: "#fffbeb" },
    { key: "Understandable", color: "#189b97", bg: "#f0fdfa" },
    { key: "Robust",         color: "#7c3aed", bg: "#faf5ff" },
  ];

  // Track which issue card has code panel open: "principle-idx"
  const [openCodeKey, setOpenCodeKey] = React.useState(null);
  const toggleCode = (key) => setOpenCodeKey((prev) => (prev === key ? null : key));

  // Track which issue card has "Why it matters" open
  const [openImpactKey, setOpenImpactKey] = React.useState(null);
  const toggleImpact = (key) => setOpenImpactKey((prev) => (prev === key ? null : key));

  // Track which issues have been marked as fixed
  const [fixedKeys, setFixedKeys] = React.useState(new Set());
  const toggleFixed = (key) => setFixedKeys((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  // Verify fix state per issue key
  const [verifyState, setVerifyState] = React.useState({}); // { [codeKey]: "idle"|"verifying"|"passed"|"failed" }

  const runVerify = (codeKey, wcagCriterion) => {
    if (!siteUrl) return;
    setVerifyState(prev => ({ ...prev, [codeKey]: "verifying" }));
    const criterionKey = getCriterionKey(wcagCriterion);
    try {
      const streamUrl = `http://localhost:4000/api/wcag-check-stream?url=${encodeURIComponent(siteUrl)}`;
      const evt = new EventSource(streamUrl);
      const timeout = setTimeout(() => {
        evt.close();
        setVerifyState(prev => ({ ...prev, [codeKey]: "timeout" }));
      }, 90000);
      evt.addEventListener("result", (e) => {
        clearTimeout(timeout);
        evt.close();
        try {
          const payload = JSON.parse(e.data || "{}");
          const resultGroups = Array.isArray(payload?.aiAnalysis?.groups) ? payload.aiAnalysis.groups :
                               Array.isArray(payload?.groups) ? payload.groups : [];
          const stillPresent = criterionKey
            ? resultGroups.some(g => getCriterionKey(g.wcagCriterion) === criterionKey)
            : false;
          setVerifyState(prev => ({ ...prev, [codeKey]: stillPresent ? "failed" : "passed" }));
        } catch {
          setVerifyState(prev => ({ ...prev, [codeKey]: "failed" }));
        }
      });
      evt.onerror = () => {
        clearTimeout(timeout);
        evt.close();
        setVerifyState(prev => ({ ...prev, [codeKey]: "error" }));
      };
    } catch {
      setVerifyState(prev => ({ ...prev, [codeKey]: "error" }));
    }
  };

  // Total issues across all principles (for progress bar)
  const totalIssueCount = Object.values(groupedByPrinciple).flat().length;
  const fixedCount = fixedKeys.size;
  const progressPct = totalIssueCount > 0 ? Math.round((fixedCount / totalIssueCount) * 100) : 0;

  // Use groupedByPrinciple prop directly, do not redefine or reference analysis
  // Button styles
  const btnStyle = (active, color) => ({
    padding: "6px 16px",
    borderRadius: 999,
    border: active ? `1.5px solid ${color}` : "1.5px solid #e2e8f0",
    background: active ? color : "#ffffff",
    color: active ? "#fff" : "#475569",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    outline: "none",
    transition: "all 0.18s",
    boxShadow: active ? `0 2px 8px ${color}44` : "none",
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
        borderRadius: 16,
        padding: "20px 22px",
        marginTop: 20,
      }}
    >
      {/* ── Fix progress tracker ── */}
      {totalIssueCount > 0 && (
        <div style={{ marginBottom: 20, padding: "14px 16px", background: progressPct === 100 ? "#f0fdf4" : "#f8fafc", borderRadius: 12, border: `1px solid ${progressPct === 100 ? "#bbf7d0" : "#e2e8f0"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: progressPct === 100 ? "#15803d" : "#0f172a" }}>
              {progressPct === 100 ? "🎉 All issues resolved!" : "Fix progress"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: progressPct === 100 ? "#15803d" : "#64748b" }}>
              {fixedCount} / {totalIssueCount} fixed
            </span>
          </div>
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progressPct}%`,
              background: progressPct === 100
                ? "linear-gradient(90deg,#16a34a,#22c55e)"
                : "linear-gradient(90deg,#189b97,#0ea5e9)",
              borderRadius: 999,
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
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
          <div key={cat.key} style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: cat.color,
                flexShrink: 0,
              }} />
              <h3 style={{
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 16,
                margin: 0,
              }}>
                {cat.key}
              </h3>
              <span style={{
                marginLeft: "auto",
                fontSize: 11,
                fontWeight: 700,
                color: cat.color,
                background: cat.bg,
                border: `1px solid ${cat.color}33`,
                borderRadius: 999,
                padding: "2px 9px",
              }}>
                WCAG {cat.key[0]}
              </span>
            </div>
            {groupedByPrinciple[cat.key] &&
            groupedByPrinciple[cat.key].length > 0 ? (
              filterBySeverity(groupedByPrinciple[cat.key]).length > 0 ? (
                filterBySeverity(groupedByPrinciple[cat.key]).map((g, idx) => {
                  const codeKey = `${cat.key}-${idx}`;
                  const criterionNum = getCriterionKey(g.wcagCriterion);
                  const hasCode = criterionNum && !!WCAG_CODE_SUGGESTIONS[criterionNum];
                  const codeOpen = openCodeKey === codeKey;
                  const isFixed = fixedKeys.has(codeKey);
                  const effort = criterionNum ? WCAG_CODE_SUGGESTIONS[criterionNum]?.effort : null;
                  return (
                  <div
                    key={idx}
                    className="issue-item"
                    style={{
                      borderLeft: `4px solid ${isFixed ? "#16a34a" : severityColor(g.severity)}`,
                      background: isFixed ? "#f0fdf4" : severityBg(g.severity),
                      opacity: isFixed ? 0.75 : 1,
                      transition: "all 0.25s ease",
                    }}
                  >
                    {/* ── Header row ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 13.5, color: isFixed ? "#15803d" : "#0f172a", flex: 1, minWidth: 0, textDecoration: isFixed ? "line-through" : "none" }}>
                        {g.wcagCriterion || "Unspecified criterion"}
                      </strong>

                      {/* Severity badge */}
                      {g.severity && !isFixed && (
                        <span style={{
                          flexShrink: 0, padding: "2px 9px", borderRadius: 999,
                          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.4px", color: "#fff",
                          background: severityColor(g.severity),
                        }}>
                          {g.severity}
                        </span>
                      )}

                      {/* Effort badge */}
                      {effort && !isFixed && (
                        <span style={{
                          flexShrink: 0, fontSize: 10, fontWeight: 700,
                          color: effort.color, background: `${effort.color}18`,
                          border: `1px solid ${effort.color}44`,
                          borderRadius: 999, padding: "2px 8px",
                          display: "inline-flex", alignItems: "center", gap: 3,
                        }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {effort.label} · {effort.time}
                        </span>
                      )}

                      {/* Occurrence count */}
                      {typeof g.count === "number" && !isFixed && (
                        <span style={{ fontSize: 12, color: "#94a3b8", flexShrink: 0 }}>
                          ~{g.count} occurrence{g.count === 1 ? "" : "s"}
                        </span>
                      )}

                      {/* Why it matters button */}
                      {!isFixed && (
                        <button
                          onClick={() => toggleImpact(codeKey)}
                          title="See who is affected and how"
                          style={{
                            flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "4px 10px", borderRadius: 6,
                            border: openImpactKey === codeKey ? "1.5px solid #7c3aed" : "1.5px solid #cbd5e1",
                            background: openImpactKey === codeKey ? "#f5f3ff" : "#ffffff",
                            color: openImpactKey === codeKey ? "#7c3aed" : "#64748b",
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                            transition: "all 0.15s", whiteSpace: "nowrap",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          Who's affected
                        </button>
                      )}

                      {/* View Fix button */}
                      {hasCode && !isFixed && (
                        <button
                          onClick={() => toggleCode(codeKey)}
                          title={codeOpen ? "Hide code fix" : "View code fix"}
                          style={{
                            flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "4px 10px", borderRadius: 6,
                            border: codeOpen ? "1.5px solid #189b97" : "1.5px solid #cbd5e1",
                            background: codeOpen ? "#f0fdfa" : "#ffffff",
                            color: codeOpen ? "#189b97" : "#64748b",
                            fontSize: 12, fontWeight: 700, cursor: "pointer",
                            fontFamily: "'SFMono-Regular','Consolas',monospace",
                            transition: "all 0.15s", whiteSpace: "nowrap",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                          </svg>
                          {codeOpen ? "Hide Fix" : "View Fix"}
                        </button>
                      )}

                      {/* Mark as fixed checkbox */}
                      <label title={isFixed ? "Mark as not fixed" : "Mark as fixed"} style={{
                        flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5,
                        cursor: "pointer", fontSize: 12, fontWeight: 600,
                        color: isFixed ? "#15803d" : "#64748b",
                        padding: "4px 8px", borderRadius: 6,
                        border: isFixed ? "1.5px solid #16a34a" : "1.5px solid #cbd5e1",
                        background: isFixed ? "#dcfce7" : "#ffffff",
                        transition: "all 0.2s",
                      }}>
                        <input
                          type="checkbox"
                          checked={isFixed}
                          onChange={() => toggleFixed(codeKey)}
                          style={{ accentColor: "#16a34a", width: 13, height: 13, cursor: "pointer" }}
                        />
                        {isFixed ? "Fixed ✓" : "Mark fixed"}
                      </label>
                    </div>

                    {/* Problem + recommendation — hidden when fixed */}
                    {!isFixed && g.problem && (
                      <p className="issue-problem">
                        <strong>Problem:</strong> {g.problem}
                      </p>
                    )}
                    {!isFixed && g.recommendation && (
                      <p className="issue-recommendation">
                        <strong>Recommendation:</strong> {g.recommendation}
                      </p>
                    )}
                    {isFixed && (() => {
                      const vs = verifyState[codeKey] || "idle";
                      return (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <p style={{ fontSize: 12, color: "#15803d", margin: 0, fontStyle: "italic" }}>
                              Marked as fixed — uncheck to reopen
                            </p>
                            {vs === "idle" && siteUrl && (
                              <button
                                onClick={() => runVerify(codeKey, g.wcagCriterion)}
                                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, border: "1.5px solid #16a34a", background: "#fff", color: "#15803d", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "none", whiteSpace: "nowrap", transition: "all 0.15s" }}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Verify Fix
                              </button>
                            )}
                            {vs === "verifying" && (
                              <span style={{ fontSize: 12, color: "#64748b", display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <svg style={{ animation: "spin 1s linear infinite" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                Re-scanning… (this may take 30–60s)
                              </span>
                            )}
                            {vs === "passed" && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#15803d", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 999, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Verified fixed ✓
                              </span>
                            )}
                            {vs === "failed" && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 999, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                Still detected — check your fix
                              </span>
                            )}
                            {(vs === "error" || vs === "timeout") && (
                              <span style={{ fontSize: 12, color: "#d97706" }}>
                                {vs === "timeout" ? "Scan timed out — try again" : "Could not reach scanner"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Who's affected panel */}
                    {openImpactKey === codeKey && !isFixed && (() => {
                      const impactKey = getCriterionKey(g.wcagCriterion);
                      const impact = impactKey ? WCAG_USER_IMPACT[impactKey] : null;
                      return (
                        <div style={{ marginTop: 10, borderRadius: 10, border: "1px solid #ddd6fe", background: "#faf5ff", padding: "14px 16px" }}>
                          {/* Affected users */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", marginRight: 4 }}>Affects:</span>
                            {impact ? impact.users.map(u => (
                              <span key={u} style={{ fontSize: 11, fontWeight: 600, color: "#6d28d9", background: "#ede9fe", border: "1px solid #ddd6fe", borderRadius: 999, padding: "2px 8px" }}>{u}</span>
                            )) : (
                              <span style={{ fontSize: 11, color: "#7c3aed" }}>Users relying on assistive technologies</span>
                            )}
                          </div>
                          {/* Story */}
                          <p style={{ margin: "0 0 8px", fontSize: 13, color: "#4c1d95", lineHeight: 1.65 }}>
                            {impact ? impact.story : getGenericUserImpact(g.severity)}
                          </p>
                          {/* Consequence */}
                          {impact?.consequence && (
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#ede9fe", borderRadius: 7, padding: "8px 12px" }}>
                              <svg style={{ flexShrink: 0, marginTop: 2 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              <p style={{ margin: 0, fontSize: 12, color: "#5b21b6", lineHeight: 1.55 }}><strong>Impact:</strong> {impact.consequence}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Code suggestion panel */}
                    {codeOpen && hasCode && !isFixed && (
                      <CodeSuggestionPanel criterion={g.wcagCriterion} />
                    )}
                  </div>
                  );
                })
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
  const [colorBlindError, setColorBlindError] = useState(null);
  React.useEffect(() => {
    if (!document.head.querySelector("style[data-highlight-feedback]")) {
      const style = document.createElement("style");
      style.innerHTML = `
          @keyframes spin { to { transform: rotate(360deg); } }
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
  const isDemo = new URLSearchParams(location.search).get("demo") === "true";
  const url = isDemo ? MOCK_URL : location.state?.url;

  const [loading, setLoading] = useState(!isDemo); // network / initial state
  const [analysis, setAnalysis] = useState(isDemo ? MOCK_ANALYSIS : null); // full backend response
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
    if (isDemo) return; // demo mode — skip all API calls

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

  // ── HCI glossary: term → plain-English definition ──────────────────────────
  const HCI_GLOSSARY = {
    "WCAG": "Web Content Accessibility Guidelines — the international standard for web accessibility published by W3C.",
    "ARIA": "Accessible Rich Internet Applications — HTML attributes that make content accessible to assistive technologies.",
    "screen reader": "Software that reads screen content aloud for blind or low-vision users (e.g. NVDA, JAWS, VoiceOver).",
    "alt text": "Alternative text — a description of an image read aloud by screen readers when the image cannot be seen.",
    "cognitive load": "The mental effort required to understand and use an interface. High load leads to errors and frustration.",
    "landmark": "Named page regions (nav, main, aside, footer) that let screen reader users jump to sections quickly.",
    "semantic": "Using HTML elements for their intended meaning — e.g. <button> for actions, <h1> for the main heading.",
    "AODA": "Accessibility for Ontarians with Disabilities Act — Ontario law requiring accessible digital products and services.",
    "contrast ratio": "Brightness difference between text and background. WCAG AA requires at least 4.5:1 for normal text.",
    "focus": "The keyboard cursor — the active element receiving keyboard input. Essential for non-mouse users.",
    "keyboard navigation": "Navigating a site using Tab, Enter, and arrow keys instead of a mouse.",
    "color blindness": "A visual impairment affecting color perception. Affects ~8% of men and ~0.5% of women.",
    "usability": "How easily and efficiently a product can be used by its intended audience.",
    "accessibility": "Designing products and services usable by people with a wide range of disabilities.",
    "skip navigation": "A hidden link at the top of the page that lets keyboard users jump directly to main content.",
    "discoverability": "How easily users can find features and understand what actions are available.",
    "learnability": "How quickly new users can learn to use the interface effectively.",
  };

  // ── Theme → WCAG criteria mapping (for linked issues feature) ───────────────
  const THEME_CRITERIA = {
    "Visual Design":   ["1.1.1", "1.4.1", "1.4.3", "1.4.11"],
    "Interaction":     ["2.1.1", "2.4.1", "2.4.4", "2.4.7", "2.5.3"],
    "Cognitive Load":  ["2.4.4", "3.1.5", "3.3.1", "3.3.2"],
    "Mobile":          ["1.3.4", "1.4.4", "2.5.5"],
    "Conclusion":      [],
    "Analysis":        [],
  };

  // ── Export full report as PDF (opens print dialog in new window) ─────────────
  const exportPdf = () => {
    const siteUrl = analysis?.url || url || "";
    const scoreVal = typeof ai?.score === "number" ? ai.score : "N/A";
    const cats = [
      { key: "Perceivable",    score: typeof categoryScores.Perceivable === "number" ? categoryScores.Perceivable : null },
      { key: "Operable",       score: typeof categoryScores.Operable === "number" ? categoryScores.Operable : null },
      { key: "Understandable", score: typeof categoryScores.Understandable === "number" ? categoryScores.Understandable : null },
      { key: "Robust",         score: typeof categoryScores.Robust === "number" ? categoryScores.Robust : null },
    ].filter(c => c.score !== null);
    const sortedGroups = [...groups].sort((a, b) => {
      const w = s => { const sl = (s||"").toLowerCase(); if (sl==="high"||sl==="critical") return 0; if (sl==="medium"||sl==="moderate") return 1; return 2; };
      return w(a.severity) - w(b.severity);
    });
    const sevColor = s => { const sl=(s||"").toLowerCase(); if(sl==="high"||sl==="critical") return "#dc2626"; if(sl==="medium"||sl==="moderate"||sl==="warning") return "#d97706"; return "#16a34a"; };
    const scoreColor = v => v >= 80 ? "#16a34a" : v >= 60 ? "#d97706" : "#dc2626";
    const stepsHtml = Array.isArray(ai?.nextSteps) && ai.nextSteps.length > 0
      ? ai.nextSteps.map((s, i) => `<li style="margin-bottom:8px;line-height:1.6">${s}</li>`).join("")
      : groups.map(g => g.recommendation).filter(Boolean).slice(0, 8).map(r => `<li style="margin-bottom:8px;line-height:1.6">${r}</li>`).join("");
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Accessibility Report — ${siteUrl}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1e293b;line-height:1.5;padding:40px;max-width:900px;margin:0 auto}
  h1{font-size:28px;font-weight:800;color:#0f172a;margin-bottom:4px;letter-spacing:-0.5px}
  h2{font-size:18px;font-weight:700;color:#0f172a;margin:28px 0 12px;border-bottom:2px solid #e2e8f0;padding-bottom:8px}
  .meta{color:#64748b;font-size:13px;margin-bottom:32px}
  .meta a{color:#189b97;text-decoration:none}
  .score-row{display:flex;align-items:center;gap:20px;margin-bottom:28px;background:#f8fafc;border-radius:12px;padding:20px 24px;border:1px solid #e2e8f0}
  .big-score{font-size:52px;font-weight:900;letter-spacing:-2px;line-height:1}
  .pour-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:8px}
  .pour-card{background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:12px;text-align:center}
  .pour-score{font-size:26px;font-weight:800;line-height:1;margin-bottom:4px}
  .pour-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px}
  .issue-row{padding:12px 0;border-bottom:1px solid #f1f5f9;display:flex;gap:10px;align-items:flex-start}
  .issue-row:last-child{border-bottom:none}
  .badge{display:inline-block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#fff;border-radius:999px;padding:2px 8px;white-space:nowrap;flex-shrink:0}
  .issue-num{font-size:11px;font-weight:800;color:#cbd5e1;min-width:24px;padding-top:2px}
  .issue-criterion{font-size:13.5px;font-weight:700;color:#0f172a;margin-bottom:3px}
  .issue-problem{font-size:12.5px;color:#475569;line-height:1.5;margin-top:2px}
  .hci-box{background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:16px 20px;font-size:13.5px;color:#334155;line-height:1.7;white-space:pre-wrap}
  ol{padding-left:20px}
  .footer{margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#94a3b8;text-align:center}
  @media print{body{padding:20px}h2{page-break-after:avoid}.pour-grid{break-inside:avoid}}
</style></head><body>
<h1>Accessibility Report</h1>
<p class="meta">
  <strong>URL:</strong> <a href="${siteUrl}">${siteUrl}</a> &nbsp;·&nbsp;
  <strong>Generated:</strong> ${new Date().toLocaleDateString("en-CA", { year:"numeric", month:"long", day:"numeric" })} &nbsp;·&nbsp;
  <strong>Standard:</strong> WCAG 2.2 + AODA
</p>

<h2>Overall Score</h2>
<div class="score-row">
  <div class="big-score" style="color:${scoreColor(typeof scoreVal==="number"?scoreVal:0)}">${scoreVal}</div>
  <div style="flex:1">
    <div style="font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px">Out of 100</div>
    <div style="font-size:13px;color:#475569">${typeof scoreVal==="number"&&scoreVal>=80?"Good accessibility — minor issues remain.":typeof scoreVal==="number"&&scoreVal>=60?"Moderate issues — several barriers to address.":"Significant barriers found — immediate action recommended."}</div>
  </div>
</div>

${cats.length > 0 ? `<h2>WCAG POUR Categories</h2><div class="pour-grid">
${cats.map(c=>`<div class="pour-card"><div class="pour-score" style="color:${scoreColor(c.score)}">${c.score}</div><div class="pour-label">${c.key}</div></div>`).join("")}
</div>` : ""}

<h2>Accessibility Issues (${sortedGroups.length} found)</h2>
${sortedGroups.length === 0 ? "<p style='color:#16a34a;font-weight:600'>No violations detected.</p>" :
sortedGroups.map((g,i)=>`<div class="issue-row">
  <span class="issue-num">#${i+1}</span>
  <div style="flex:1;min-width:0">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
      <span class="issue-criterion">${g.wcagCriterion||"Unspecified"}</span>
      ${g.severity?`<span class="badge" style="background:${sevColor(g.severity)}">${g.severity}</span>`:""}
      ${typeof g.count==="number"?`<span style="font-size:11px;color:#94a3b8">${g.count} instance${g.count!==1?"s":""}</span>`:""}
    </div>
    <div class="issue-problem">${g.problem||""}</div>
    ${g.recommendation?`<div style="font-size:12px;color:#189b97;margin-top:4px;font-style:italic">→ ${g.recommendation}</div>`:""}
  </div>
</div>`).join("")}

${hciText ? `<h2>HCI Analysis Summary</h2><div class="hci-box">${hciText.slice(0, 1200)}${hciText.length > 1200 ? "…" : ""}</div>` : ""}

${stepsHtml ? `<h2>Recommended Next Steps</h2><ol>${stepsHtml}</ol>` : ""}

<div class="footer">Generated by Acessa — WCAG Accessibility Analyser &nbsp;·&nbsp; ${siteUrl}</div>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // ── Export HCI report as a .txt download ─────────────────────────────────────
  const exportHciReport = () => {
    const url = analysis?.url || "";
    const scoreVal = typeof ai?.score === "number" ? ai.score : "N/A";
    const allText = hciParagraphs.join("\n\n");
    const sentences = allText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 50);
    const actionRe = /should|must|ensure|critical|significant|barrier|priorit|recommend|essential|address|improv|fix|add|provid|implement|consider/i;
    const takeaways = [...new Set(sentences.filter(s => actionRe.test(s)))].slice(0, 5);
    const nextStepsList = Array.isArray(ai?.nextSteps) ? ai.nextSteps : [];

    const lines = [
      "ACCESSIBILITY & HCI REPORT",
      "=".repeat(50),
      `Website: ${url}`,
      `Overall Score: ${scoreVal}/100`,
      `Generated: ${new Date().toLocaleDateString()}`,
      "",
      "KEY TAKEAWAYS",
      "-".repeat(30),
      ...takeaways.map((t, i) => `${i + 1}. ${t}`),
      "",
      "HCI ANALYSIS",
      "-".repeat(30),
      ...hciParagraphs.map((p, i) => `[Section ${i + 1}]\n${p}`).join("\n\n").split("\n"),
      "",
      "RECOMMENDED NEXT STEPS",
      "-".repeat(30),
      ...nextStepsList.map((s, i) => `${i + 1}. ${s}`),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `accessibility-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Map WCAG criterion to principle
  const getPrincipleFromCriterion = (criterion) => {
    if (!criterion) return null;
    // Extract the leading digit from "x.x.x" anywhere in the string —
    // handles "WCAG 2.4.4", "SC 1.1.1 Alt Text", "4.1.2 Name Role Value", etc.
    const match = String(criterion).match(/(\d+)\.\d+\.\d+/);
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
      if (sev === "high" || sev === "critical" || sev === "serious") acc.high += count;
      else if (sev === "medium" || sev === "moderate" || sev === "warning") acc.medium += count;
      else if (sev === "low" || sev === "minor") acc.low += count;
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

  // --- Next Steps done tracking + copy state ---
  const [doneSteps, setDoneSteps] = React.useState(new Set());
  const [checklistCopied, setChecklistCopied] = React.useState(false);
  const toggleDoneStep = (i) => setDoneSteps(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });
  // --- HCI report expand/collapse ---
  const [hciExpanded, setHciExpanded] = React.useState(false);
  // --- Pie chart slice hover state ---
  const [hoveredSlice, setHoveredSlice] = React.useState(null);
  // --- Donut hover state for HCI keyword donut ---
  const [donutHover, setDonutHover] = React.useState(null); // { label, percent, x, y }
  // Website Preview toggle state
  const [previewMode, setPreviewMode] = React.useState("highlighted");
  // Side-by-side AI image state
  const [sideBySideAIImage, setSideBySideAIImage] = useState(null);
  const [sideBySideLoading, setSideBySideLoading] = useState(false);
  const [mobileIframeError, setMobileIframeError] = useState(false);
  const [mobilePreviewWidth, setMobilePreviewWidth] = useState(390);
  const [auditInfoOpen, setAuditInfoOpen] = useState(null); // key of open info popup

  // Color blindness filter state for Lense mode
  const [colorBlindFilter, setColorBlindFilter] = useState(null); // null | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  const [colorBlindLoading, setColorBlindLoading] = useState(false);
  const [colorBlindImage, setColorBlindImage] = useState(null);

  // Helper for color blindness cache key
  function getColorBlindKey(url, type) {
    return `aiColorBlindCache_${url}_${type}`;
  }
  // Color blindness prompts
  const colorBlindPrompts = {
    protanopia:
      "Simulate this screenshot as it would appear to a person with Protanopia (red-blind color vision deficiency). Apply a realistic Protanopia color perception transformation so that reds are significantly reduced or shifted toward brown/gray tones and red–green distinctions become difficult to perceive. Preserve the exact layout, spacing, typography, icons, UI components, and text content. Do NOT move, resize, remove, or redesign any elements. Do NOT change brightness, contrast, or styling except where required to simulate Protanopia color perception. Only modify color values to reflect how a user with Protanopia would perceive the interface.",

    deuteranopia:
      "Simulate this screenshot as it would appear to a person with Deuteranopia (green-blind color vision deficiency). Apply a realistic Deuteranopia color perception transformation where greens are diminished and red–green color distinctions are difficult to perceive. Preserve the exact layout, spacing, typography, icons, UI components, and text content. Do NOT move, resize, remove, or redesign any elements. Do NOT alter brightness, contrast, or styling except where necessary for the color vision simulation. Only modify color values to represent how a user with Deuteranopia would perceive the interface.",

    tritanopia:
      "Simulate this screenshot as it would appear to a person with Tritanopia (blue-yellow color vision deficiency). Apply a realistic Tritanopia color perception transformation where blue tones are reduced and blue–yellow distinctions become difficult to perceive. Preserve the exact layout, spacing, typography, icons, UI components, and text content exactly as in the original image. Do NOT move, resize, remove, or redesign any elements. Only modify color values to reflect Tritanopia perception while keeping the interface structure identical.",

    achromatopsia:
      "Simulate this screenshot as it would appear to a person with Achromatopsia (complete color blindness). Convert the image to a realistic grayscale representation based on luminance perception while preserving all layout, typography, icons, UI components, and text exactly as in the original screenshot. Do NOT change spacing, structure, brightness, contrast, or styling except for the removal of color. The output should appear identical to the original interface but entirely in grayscale as perceived by someone with Achromatopsia.",
  };

  // Handle color blindness filter button click
  const handleColorBlindClick = async (type) => {
    // Debug: log analysis and url state
    console.log("[Lens Button Click] analysis:", analysis, "url:", url);
    // Log to terminal (non-blocking)
    try {
      await fetch("/api/log-colorblind-btn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: type,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {}
    // ...existing code...
    if (!analysis?.screenshot || !url) return;
    if (colorBlindFilter === type) {
      // Toggle off
      setColorBlindFilter(null);
      setColorBlindImage(null);
      return;
    }
    setColorBlindFilter(type);
    setColorBlindLoading(true);
    setColorBlindImage(null);
    const cacheKey = getColorBlindKey(url, type);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setColorBlindImage(cached);
      setColorBlindLoading(false);
      return;
    }
    try {
      const prompt = colorBlindPrompts[type];
      const res = await fetch("http://localhost:4000/api/ai/image-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshot: analysis.screenshot, prompt }),
      });
      const data = await res.json();
      const img = data.editedImageBase64 || data.editedImageUrl || null;
      if (img) {
        sessionStorage.setItem(cacheKey, img);
        setColorBlindImage(img);
      }
    } catch (err) {
      setColorBlindImage(null);
    } finally {
      setColorBlindLoading(false);
    }
  };

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
        <h1>Analysis Report</h1>
      </div>

      {/* ── Fixed PDF export FAB ── */}
      {analysis && (
        <button
          onClick={exportPdf}
          title="Export report as PDF"
          aria-label="Export report as PDF"
          style={{
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 999,
            width: 52,
            height: 52,
            borderRadius: "50%",
            border: "none",
            background: "#189b97",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(24,155,151,0.45)",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 6px 28px rgba(24,155,151,0.6)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(24,155,151,0.45)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      )}

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
                          `[data-issueid="${CSS.escape(issueId)}"]`,
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
                          `[data-issueid="${CSS.escape(issueId)}"]`,
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
                          `[data-issueid="${CSS.escape(issueId)}"]`,
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
                    <div></div>
                    {/* Screenshot (fills the image grid column) */}
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      <img
                        src={
                          colorBlindFilter && colorBlindImage
                            ? colorBlindImage
                            : violationScreenshots[currentScreenshotIdx]
                                ?.screenshot
                        }
                        alt={
                          colorBlindFilter && colorBlindImage
                            ? `Screenshot simulated for ${colorBlindFilter}`
                            : "Original screenshot"
                        }
                        style={{
                          width: "auto",
                          height: "600px",
                          maxWidth: "95%",
                          objectFit: "contain",
                          borderRadius: "12px",
                          boxShadow: "0 4px 16px rgba(124,138,160,0.15)",
                          border: "2px solid #e5e7eb",
                          margin: "0 auto",
                          display: "block",
                        }}
                      />
                      {colorBlindLoading && (
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(255,255,255,0.6)",
                            zIndex: 2,
                            borderRadius: "12px",
                          }}
                        >
                          <div
                            style={{
                              width: 64,
                              height: 64,
                              border: "6px solid #e5e7eb",
                              borderTop: "6px solid #7c8da0",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                          <style>
                            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
                          </style>
                        </div>
                      )}
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
                      <button
                        className={
                          "lense-filter-btn original" +
                          (!colorBlindFilter ? " active" : "")
                        }
                        onClick={() => {
                          if (colorBlindLoading || !colorBlindFilter) return;
                          setColorBlindFilter(null);
                          setColorBlindImage(null);
                          setColorBlindError(null);
                        }}
                        aria-pressed={!colorBlindFilter}
                        disabled={colorBlindLoading}
                      >
                        Original
                      </button>
                      <button
                        className={
                          "lense-filter-btn protanopia" +
                          (colorBlindFilter === "protanopia" ? " active" : "")
                        }
                        onClick={async () => {
                          if (
                            colorBlindLoading ||
                            colorBlindFilter === "protanopia"
                          )
                            return;
                          setColorBlindFilter("protanopia");
                          setColorBlindLoading(true);
                          setColorBlindError(null);
                          // Use sessionStorage to cache images by filter and screenshot
                          try {
                            const prompt =
                              "Simulate protanopia (red-blind) color vision on this screenshot.";
                            const screenshot =
                              violationScreenshots?.[currentScreenshotIdx]
                                ?.screenshot || analysis?.screenshot;
                            const cacheKey = `cbimg-protanopia-${btoa(screenshot || "")}`;
                            const cached = sessionStorage.getItem(cacheKey);
                            if (cached) {
                              setColorBlindImage(cached);
                              setColorBlindLoading(false);
                              return;
                            }
                            const aiImage = await fetch(
                              "http://localhost:4000/api/ai/image-edit",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  screenshot,
                                  prompt,
                                }),
                              },
                            ).then((r) => r.json());
                            const resultImg =
                              aiImage?.editedImageBase64 ||
                              aiImage?.editedImageUrl ||
                              null;
                            setColorBlindImage(resultImg);
                            if (resultImg) {
                              sessionStorage.setItem(cacheKey, resultImg);
                            }
                          } catch (e) {
                            setColorBlindImage(null);
                            setColorBlindError(
                              "Failed to generate simulation.",
                            );
                          } finally {
                            setColorBlindLoading(false);
                          }
                        }}
                        aria-pressed={colorBlindFilter === "protanopia"}
                        disabled={colorBlindLoading}
                      >
                        {colorBlindLoading && colorBlindFilter === "protanopia"
                          ? "Loading…"
                          : "Protanopia (red-blind)"}
                      </button>
                      <button
                        className={
                          "lense-filter-btn deuteranopia" +
                          (colorBlindFilter === "deuteranopia" ? " active" : "")
                        }
                        onClick={async () => {
                          if (
                            colorBlindLoading ||
                            colorBlindFilter === "deuteranopia"
                          )
                            return;
                          setColorBlindFilter("deuteranopia");
                          setColorBlindLoading(true);
                          setColorBlindError(null);
                          try {
                            const prompt =
                              "Simulate deuteranopia (green-blind) color vision on this screenshot.";
                            const screenshot =
                              violationScreenshots?.[currentScreenshotIdx]
                                ?.screenshot || analysis?.screenshot;
                            const cacheKey = `cbimg-deuteranopia-${btoa(screenshot || "")}`;
                            const cached = sessionStorage.getItem(cacheKey);
                            if (cached) {
                              setColorBlindImage(cached);
                              setColorBlindLoading(false);
                              return;
                            }
                            const aiImage = await fetch(
                              "http://localhost:4000/api/ai/image-edit",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  screenshot,
                                  prompt,
                                }),
                              },
                            ).then((r) => r.json());
                            const resultImg =
                              aiImage?.editedImageBase64 ||
                              aiImage?.editedImageUrl ||
                              null;
                            setColorBlindImage(resultImg);
                            if (resultImg) {
                              sessionStorage.setItem(cacheKey, resultImg);
                            }
                          } catch (e) {
                            setColorBlindImage(null);
                            setColorBlindError(
                              "Failed to generate simulation.",
                            );
                          } finally {
                            setColorBlindLoading(false);
                          }
                        }}
                        aria-pressed={colorBlindFilter === "deuteranopia"}
                        disabled={colorBlindLoading}
                      >
                        {colorBlindLoading &&
                        colorBlindFilter === "deuteranopia"
                          ? "Loading…"
                          : "Deuteranopia (green-blind)"}
                      </button>
                      <button
                        className={
                          "lense-filter-btn tritanopia" +
                          (colorBlindFilter === "tritanopia" ? " active" : "")
                        }
                        onClick={async () => {
                          if (
                            colorBlindLoading ||
                            colorBlindFilter === "tritanopia"
                          )
                            return;
                          setColorBlindFilter("tritanopia");
                          setColorBlindLoading(true);
                          setColorBlindError(null);
                          try {
                            const prompt =
                              "Simulate tritanopia (blue-blind) color vision on this screenshot.";
                            const screenshot =
                              violationScreenshots?.[currentScreenshotIdx]
                                ?.screenshot || analysis?.screenshot;
                            const cacheKey = `cbimg-tritanopia-${btoa(screenshot || "")}`;
                            const cached = sessionStorage.getItem(cacheKey);
                            if (cached) {
                              setColorBlindImage(cached);
                              setColorBlindLoading(false);
                              return;
                            }
                            const aiImage = await fetch(
                              "http://localhost:4000/api/ai/image-edit",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  screenshot,
                                  prompt,
                                }),
                              },
                            ).then((r) => r.json());
                            const resultImg =
                              aiImage?.editedImageBase64 ||
                              aiImage?.editedImageUrl ||
                              null;
                            setColorBlindImage(resultImg);
                            if (resultImg) {
                              sessionStorage.setItem(cacheKey, resultImg);
                            }
                          } catch (e) {
                            setColorBlindImage(null);
                            setColorBlindError(
                              "Failed to generate simulation.",
                            );
                          } finally {
                            setColorBlindLoading(false);
                          }
                        }}
                        aria-pressed={colorBlindFilter === "tritanopia"}
                        disabled={colorBlindLoading}
                      >
                        {colorBlindLoading && colorBlindFilter === "tritanopia"
                          ? "Loading…"
                          : "Tritanopia (blue-blind)"}
                      </button>
                      <button
                        className={
                          "lense-filter-btn achromatopsia" +
                          (colorBlindFilter === "achromatopsia"
                            ? " active"
                            : "")
                        }
                        onClick={async () => {
                          if (
                            colorBlindLoading ||
                            colorBlindFilter === "achromatopsia"
                          )
                            return;
                          setColorBlindFilter("achromatopsia");
                          setColorBlindLoading(true);
                          setColorBlindError(null);
                          try {
                            const prompt =
                              "Simulate achromatopsia (grayscale) color vision on this screenshot.";
                            const screenshot =
                              violationScreenshots?.[currentScreenshotIdx]
                                ?.screenshot || analysis?.screenshot;
                            const cacheKey = `cbimg-achromatopsia-${btoa(screenshot || "")}`;
                            const cached = sessionStorage.getItem(cacheKey);
                            if (cached) {
                              setColorBlindImage(cached);
                              setColorBlindLoading(false);
                              return;
                            }
                            const aiImage = await fetch(
                              "http://localhost:4000/api/ai/image-edit",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  screenshot,
                                  prompt,
                                }),
                              },
                            ).then((r) => r.json());
                            const resultImg =
                              aiImage?.editedImageBase64 ||
                              aiImage?.editedImageUrl ||
                              null;
                            setColorBlindImage(resultImg);
                            if (resultImg) {
                              sessionStorage.setItem(cacheKey, resultImg);
                            }
                          } catch (e) {
                            setColorBlindImage(null);
                            setColorBlindError(
                              "Failed to generate simulation.",
                            );
                          } finally {
                            setColorBlindLoading(false);
                          }
                        }}
                        aria-pressed={colorBlindFilter === "achromatopsia"}
                        disabled={colorBlindLoading}
                      >
                        {colorBlindLoading &&
                        colorBlindFilter === "achromatopsia"
                          ? "Loading…"
                          : "Achromatopsia (grayscale)"}
                      </button>
                    </aside>
                    <div></div>
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
                      {/* Removed duplicate non-interactive filter buttons. Only interactive, AI-calling buttons remain below. */}
                    </aside>
                  </>
                ) : analysis?.screenshot && previewMode === "lense" ? (
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
                      {colorBlindFilter ? (
                        colorBlindLoading ? (
                          <div
                            style={{
                              color: "#7c8da0",
                              fontWeight: 600,
                              fontSize: 16,
                            }}
                          >
                            Generating {colorBlindFilter} simulation…
                          </div>
                        ) : colorBlindImage ? (
                          <img
                            src={colorBlindImage}
                            alt={`Screenshot simulated for ${colorBlindFilter}`}
                            style={{
                              width: "100%",
                              height: "auto",
                              borderRadius: "8px",
                              boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                              border: "1px solid #e5e7eb",
                              display: "block",
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
                            Failed to generate simulation.
                          </div>
                        )
                      ) : (
                        <img
                          src={analysis.screenshot}
                          alt="Original screenshot"
                          style={{
                            width: "100%",
                            height: "auto",
                            borderRadius: "8px",
                            boxShadow: "0 2px 8px rgba(124,138,160,0.10)",
                            border: "1px solid #e5e7eb",
                            display: "block",
                          }}
                        />
                      )}
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
                        className={
                          "lense-filter-btn protanopia" +
                          (colorBlindFilter === "protanopia" ? " active" : "")
                        }
                        onClick={() => handleColorBlindClick("protanopia")}
                        aria-pressed={colorBlindFilter === "protanopia"}
                        disabled={colorBlindLoading}
                        style={{
                          opacity:
                            colorBlindLoading &&
                            colorBlindFilter === "protanopia"
                              ? 0.7
                              : 1,
                          cursor:
                            colorBlindLoading &&
                            colorBlindFilter === "protanopia"
                              ? "wait"
                              : "pointer",
                        }}
                      >
                        {colorBlindLoading && colorBlindFilter === "protanopia"
                          ? "Loading…"
                          : "Protanopia (red-blind)"}
                      </button>
                      <button
                        className={
                          "lense-filter-btn deuteranopia" +
                          (colorBlindFilter === "deuteranopia" ? " active" : "")
                        }
                        onClick={() => handleColorBlindClick("deuteranopia")}
                        aria-pressed={colorBlindFilter === "deuteranopia"}
                        disabled={colorBlindLoading}
                        style={{
                          opacity:
                            colorBlindLoading &&
                            colorBlindFilter === "deuteranopia"
                              ? 0.7
                              : 1,
                          cursor:
                            colorBlindLoading &&
                            colorBlindFilter === "deuteranopia"
                              ? "wait"
                              : "pointer",
                        }}
                      >
                        {colorBlindLoading &&
                        colorBlindFilter === "deuteranopia"
                          ? "Loading…"
                          : "Deuteranopia (green-blind)"}
                      </button>
                      <button
                        className={
                          "lense-filter-btn tritanopia" +
                          (colorBlindFilter === "tritanopia" ? " active" : "")
                        }
                        onClick={() => handleColorBlindClick("tritanopia")}
                        aria-pressed={colorBlindFilter === "tritanopia"}
                        disabled={colorBlindLoading}
                        style={{
                          opacity:
                            colorBlindLoading &&
                            colorBlindFilter === "tritanopia"
                              ? 0.7
                              : 1,
                          cursor:
                            colorBlindLoading &&
                            colorBlindFilter === "tritanopia"
                              ? "wait"
                              : "pointer",
                        }}
                      >
                        {colorBlindLoading && colorBlindFilter === "tritanopia"
                          ? "Loading…"
                          : "Tritanopia (blue-blind)"}
                      </button>
                      <button
                        className={
                          "lense-filter-btn achromatopsia" +
                          (colorBlindFilter === "achromatopsia"
                            ? " active"
                            : "")
                        }
                        onClick={() => handleColorBlindClick("achromatopsia")}
                        aria-pressed={colorBlindFilter === "achromatopsia"}
                        disabled={colorBlindLoading}
                        style={{
                          opacity:
                            colorBlindLoading &&
                            colorBlindFilter === "achromatopsia"
                              ? 0.7
                              : 1,
                          cursor:
                            colorBlindLoading &&
                            colorBlindFilter === "achromatopsia"
                              ? "wait"
                              : "pointer",
                        }}
                      >
                        {colorBlindLoading &&
                        colorBlindFilter === "achromatopsia"
                          ? "Loading…"
                          : "Achromatopsia (grayscale)"}
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
                  <h2 className="scores-heading">Scores</h2>
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
                            size={130}
                            strokeWidth={14}
                            label="Overall WCAG Score"
                          />
                          <div
                            className="overall-score-text"
                            style={{
                              flex: 1,
                            }}
                          >
                            <p
                              style={{
                                fontSize: "12px",
                                color: "#94a3b8",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.8px",
                                marginBottom: "4px",
                              }}
                            >
                              Overall Score
                            </p>
                            <p
                              className="overall-score-number"
                              style={{
                                fontSize: "40px",
                                color: "#0f172a",
                                fontWeight: 800,
                                lineHeight: 1,
                                marginBottom: "6px",
                                letterSpacing: "-1px",
                              }}
                            >
                              {score}<span style={{ fontSize: 20, fontWeight: 500, color: "#94a3b8" }}>/100</span>
                            </p>
                            <p
                              className="overall-score-hint"
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                lineHeight: 1.5,
                                marginBottom: "0",
                              }}
                            >
                              WCAG 2.2 &amp; AODA compliance score
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
                                  data-principle={cat.key}
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
                                    borderRadius: "12px",
                                    padding: "14px 12px",
                                    border: "1px solid #e0e7ef",
                                    cursor: "pointer",
                                    transition: "box-shadow 0.2s, transform 0.2s",
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
                                          color: "#0f172a",
                                          fontWeight: 700,
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
                                                background: severityBg(g.severity),
                                                borderLeft: `4px solid ${severityColor(g.severity)}`,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 8,
                                                  marginBottom: 6,
                                                }}
                                              >
                                                {g.severity && (
                                                  <span style={{
                                                    display: "inline-block",
                                                    padding: "2px 9px",
                                                    borderRadius: 999,
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.4px",
                                                    color: "#fff",
                                                    background: severityColor(g.severity),
                                                  }}>
                                                    {g.severity}
                                                  </span>
                                                )}
                                                <strong
                                                  style={{
                                                    color: "#0f172a",
                                                    fontWeight: 700,
                                                    fontSize: 13.5,
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

                {/* ── Issue Breakdown (inside left panel) ── */}
                {groups && groups.length > 0 && (() => {
                  const totalIssues = groups.reduce((s, g) => s + (g.count || 1), 0);
                  const principleColors = { Perceivable: "#3b82f6", Operable: "#d97706", Understandable: "#189b97", Robust: "#7c3aed" };
                  const principleCounts = { Perceivable: 0, Operable: 0, Understandable: 0, Robust: 0 };
                  groups.forEach(g => {
                    const p = getPrincipleFromCriterion(g.wcagCriterion);
                    if (p && p in principleCounts) principleCounts[p] += (g.count || 1);
                  });
                  const pieData = Object.entries(principleCounts).filter(([, v]) => v > 0).map(([label, value]) => ({ label, value, color: principleColors[label] }));
                  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
                  const buildPieSlices = (data, total, cx, cy, r) => {
                    let angle = -90;
                    return data.map((d) => {
                      const sweep = (d.value / total) * 360;
                      const startRad = (angle * Math.PI) / 180;
                      const endRad = ((angle + sweep) * Math.PI) / 180;
                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);
                      const large = sweep > 180 ? 1 : 0;
                      const path = sweep >= 359.99
                        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
                        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                      angle += sweep;
                      return { ...d, path, pct: Math.round((d.value / total) * 100) };
                    });
                  };
                  const slices = pieTotal > 0 ? buildPieSlices(pieData, pieTotal, 60, 60, 52) : [];
                  const sevWeight = (s) => { const sl = (s || "").toLowerCase(); if (sl === "high" || sl === "critical") return 3; if (sl === "medium" || sl === "warning") return 2; return 1; };
                  const topCriteria = [...groups].sort((a, b) => sevWeight(b.severity) - sevWeight(a.severity) || (b.count || 1) - (a.count || 1)).slice(0, 5);
                  const sevBadgeStyle = (sev) => { const sl = (sev || "").toLowerCase(); if (sl === "high" || sl === "critical") return { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" }; if (sl === "medium" || sl === "warning") return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" }; return { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" }; };
                  return (
                    <div style={{ marginTop: 20, borderTop: "1px solid #e2e8f0", paddingTop: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Issue Breakdown</div>
                      {/* Pie + legend side by side */}
                      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                        <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
                          {slices.map((s) => (
                            <path key={s.label} d={s.path} fill={s.color} opacity={hoveredSlice && hoveredSlice !== s.label ? 0.4 : 1} style={{ cursor: "pointer", transition: "opacity 0.15s ease" }} onMouseEnter={() => setHoveredSlice(s.label)} onMouseLeave={() => setHoveredSlice(null)} />
                          ))}
                          {slices.map((s) => (
                            <path key={s.label + "-sep"} d={s.path} fill="none" stroke="#fff" strokeWidth="2" />
                          ))}
                          <circle cx="60" cy="60" r="28" fill="#fff" />
                          <text x="60" y="57" textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="800" fill="#0f172a">{hoveredSlice ? principleCounts[hoveredSlice] : totalIssues}</text>
                          <text x="60" y="70" textAnchor="middle" fontSize="8" fill="#94a3b8">{hoveredSlice ? hoveredSlice.split(" ")[0] : "total"}</text>
                        </svg>
                        <div style={{ flex: 1 }}>
                          {pieData.map((s) => (
                            <div key={s.label} onMouseEnter={() => setHoveredSlice(s.label)} onMouseLeave={() => setHoveredSlice(null)} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, cursor: "default", opacity: hoveredSlice && hoveredSlice !== s.label ? 0.4 : 1, transition: "opacity 0.15s ease" }}>
                              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#334155", flex: 1 }}>{s.label}</span>
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color }}>{Math.round((s.value / pieTotal) * 100)}%</span>
                            </div>
                          ))}
                          {Object.entries(principleCounts).filter(([, v]) => v === 0).map(([label]) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, opacity: 0.3 }}>
                              <span style={{ width: 9, height: 9, borderRadius: 2, background: "#e2e8f0", flexShrink: 0 }} />
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#94a3b8", flex: 1 }}>{label}</span>
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#cbd5e1" }}>0%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Fix First */}
                      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Fix First — Ranked by Priority</div>
                        {topCriteria.map((g, i) => {
                          const badge = sevBadgeStyle(g.severity);
                          const criterionNum = getCriterionKey(g.wcagCriterion);
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 0", borderBottom: i < topCriteria.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#cbd5e1", minWidth: 16, paddingTop: 1 }}>#{i + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 2 }}>
                                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0f172a" }}>{criterionNum || g.wcagCriterion}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 999, padding: "1px 6px" }}>{g.severity}</span>
                                  <span style={{ fontSize: 10.5, color: "#94a3b8" }}>{g.count} instance{g.count !== 1 ? "s" : ""}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{g.problem}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
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
                  <h2 className="issues-panel-heading">Accessibility Issues</h2>

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
                      siteUrl={analysis?.url || url || ""}
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
            {/* HCI Report */}
            <div className="hci-section-wrap" style={{ display: "block" }}>
              {/* HCI Report Section */}
              <div className="hci-card">
                {/* Header row: title + reading time + export */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <h2 className="hci-card-heading" style={{ margin: 0 }}>HCI Report</h2>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {hciParagraphs.length > 0 && (
                      <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                        ~{Math.ceil(hciParagraphs.join(" ").split(/\s+/).length / 200)} min read
                      </span>
                    )}
                    <button
                      onClick={exportHciReport}
                      title="Download report as .txt"
                      style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "5px 12px", cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download
                    </button>
                  </div>
                </div>

                {hciParagraphs.length > 0 ? (() => {
                  // ── Theme detection ──────────────────────────────────────
                  const detectTheme = (text) => {
                    const t = text.toLowerCase();
                    if (/mobile|responsive|touch|small screen|screen size/.test(t))
                      return { label: "Mobile", color: "#0ea5e9", bg: "#f0f9ff" };
                    if (/cognitive|mental load|burden|frustrat|comprehend|discoverability|learnability/.test(t))
                      return { label: "Cognitive Load", color: "#8b5cf6", bg: "#f5f3ff" };
                    if (/interact|click|hover|link|button|navigat|pattern|feedback/.test(t))
                      return { label: "Interaction", color: "#f59e0b", bg: "#fffbeb" };
                    if (/visual|design|layout|color|font|typograph|aesthetic|clean|modern|hierarchy/.test(t))
                      return { label: "Visual Design", color: "#189b97", bg: "#f0fdfa" };
                    if (/overall|conclusion|recommend|priorit|essential|key|addressing|strengthen|strengthens/.test(t))
                      return { label: "Conclusion", color: "#16a34a", bg: "#f0fdf4" };
                    return { label: "Analysis", color: "#64748b", bg: "#f8fafc" };
                  };

                  // ── Paragraph-level sentiment ────────────────────────────
                  const detectSentiment = (text) => {
                    const neg = (text.match(/however|lack|miss|barrier|difficult|impossible|violat|poor|fail|issue|problem|undermin|hinder|absent|without|cannot|can't|doesn.t|inadequate|insufficient|concern/gi) || []).length;
                    const pos = (text.match(/benefit|well|clear|good|strong|enhance|support|clean|modern|promote|responsive|legib|effective|appropriate|strength/gi) || []).length;
                    if (neg > pos + 1) return { label: "Issues identified", color: "#ef4444", bg: "#fef2f2" };
                    if (pos > neg) return { label: "Strengths noted", color: "#16a34a", bg: "#f0fdf4" };
                    return { label: "Mixed", color: "#f59e0b", bg: "#fffbeb" };
                  };

                  // ── Sentence-level sentiment (for inline highlighting) ───
                  const sentenceSentiment = (s) => {
                    const neg = (s.match(/however|lack|miss|barrier|difficult|impossible|violat|poor|fail|issue|problem|undermin|hinder|absent|without|cannot|can't|inadequate|insufficient/gi) || []).length;
                    const pos = (s.match(/benefit|well|clear|good|strong|enhance|support|clean|modern|promote|effective|appropriate|strength/gi) || []).length;
                    if (neg > pos) return { bg: "#fff5f5", borderBottom: "1px solid #fca5a5" };
                    if (pos > neg) return { bg: "#f0fdf4", borderBottom: "1px solid #86efac" };
                    return { bg: "transparent", borderBottom: "none" };
                  };

                  // ── Glossary: wrap known terms with underline + title ────
                  const applyGlossary = (text) => {
                    const sortedTerms = Object.keys(HCI_GLOSSARY).sort((a, b) => b.length - a.length);
                    const escaped = sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
                    const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
                    return text.replace(re, (match) => {
                      const def = HCI_GLOSSARY[Object.keys(HCI_GLOSSARY).find(k => k.toLowerCase() === match.toLowerCase())] || "";
                      return `<span title="${def.replace(/"/g, "&quot;")}" style="border-bottom:1.5px dotted #94a3b8;cursor:help;">${match}</span>`;
                    });
                  };

                  // ── Key takeaways ────────────────────────────────────────
                  const allText = hciParagraphs.join(" ");
                  const sentences = allText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 50);
                  const actionRe = /should|must|ensure|critical|significant|barrier|priorit|recommend|essential|address|improv|fix|add|provid|implement|consider/i;
                  const takeaways = [...new Set(sentences.filter(s => actionRe.test(s)))].slice(0, 5);

                  // ── Related issues count per theme ───────────────────────
                  const relatedIssues = (themeLabel) => {
                    const criteria = THEME_CRITERIA[themeLabel] || [];
                    if (criteria.length === 0) return [];
                    return groups.filter(g => {
                      const k = getCriterionKey(g.wcagCriterion);
                      return k && criteria.includes(k);
                    });
                  };

                  const visibleParas = hciExpanded ? hciParagraphs : hciParagraphs.slice(0, 2);

                  return (
                    <>
                      {/* Key Takeaways */}
                      {takeaways.length > 0 && (
                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: "#92400e", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px", display: "flex", alignItems: "center", gap: 6 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            Key Takeaways
                          </div>
                          <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                            {takeaways.map((t, i) => (
                              <li key={i} style={{ fontSize: 13.5, color: "#78350f", lineHeight: 1.65, marginBottom: i < takeaways.length - 1 ? 8 : 0 }}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Glossary hint */}
                      <p style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 14, fontStyle: "italic" }}>
                        Hover over underlined terms for definitions. Sentence backgrounds indicate identified issues (red) or strengths (green).
                      </p>

                      {/* Themed paragraph cards with sentence highlighting + related issues */}
                      {visibleParas.map((para, idx) => {
                        const theme = detectTheme(para);
                        const sentiment = detectSentiment(para);
                        const related = relatedIssues(theme.label);
                        // Split into sentences for inline highlighting
                        const paraSegs = para.split(/(?<=[.!?])\s+(?=[A-Z"'])/).map(s => s.trim()).filter(Boolean);

                        return (
                          <div key={idx} style={{ borderLeft: `3px solid ${theme.color}`, background: theme.bg, borderRadius: "0 12px 12px 0", padding: "14px 18px", marginBottom: 10 }}>
                            {/* Card header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: theme.color }}>
                                {theme.label}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 600, background: sentiment.bg, color: sentiment.color, borderRadius: 999, padding: "2px 10px", border: `1px solid ${sentiment.color}33` }}>
                                {sentiment.label}
                              </span>
                            </div>

                            {/* Sentence-level highlighting with glossary */}
                            <p style={{ margin: 0, fontSize: 14.5, color: "#334155", lineHeight: 1.8 }}>
                              {paraSegs.map((seg, si) => {
                                const ss = sentenceSentiment(seg);
                                return (
                                  <span
                                    key={si}
                                    dangerouslySetInnerHTML={{ __html: applyGlossary(seg) + " " }}
                                    style={{ backgroundColor: ss.bg, borderRadius: 3, padding: ss.bg !== "transparent" ? "1px 2px" : 0, borderBottom: ss.borderBottom }}
                                  />
                                );
                              })}
                            </p>

                            {/* Related issues chips */}
                            {related.length > 0 && (
                              <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                                  {related.length} related issue{related.length > 1 ? "s" : ""}:
                                </span>
                                {related.map((g, ri) => (
                                  <span
                                    key={ri}
                                    style={{ fontSize: 11, fontWeight: 600, background: "#fff", border: `1px solid ${theme.color}55`, color: theme.color, borderRadius: 999, padding: "2px 9px", cursor: "default" }}
                                    title={g.problem}
                                  >
                                    {getCriterionKey(g.wcagCriterion)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Expand/collapse */}
                      {hciParagraphs.length > 2 && (
                        <button
                          onClick={() => setHciExpanded(e => !e)}
                          style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 13, fontWeight: 600, borderRadius: 8, padding: "8px 16px", cursor: "pointer", marginTop: 6, width: "100%", boxShadow: "none" }}
                        >
                          {hciExpanded
                            ? "Show less"
                            : `Show full analysis (${hciParagraphs.length - 2} more section${hciParagraphs.length - 2 > 1 ? "s" : ""})`}
                        </button>
                      )}
                    </>
                  );
                })() : (
                  <p style={{ fontSize: "15px", color: "#475569", lineHeight: 1.7 }}>{hciText}</p>
                )}
              </div>
            </div>

            {/* ── Mobile Experience Section ── */}
            {analysis && (() => {
              const MOBILE_CRITERIA = new Set(["1.3.4","1.4.4","1.4.10","1.4.12","2.5.1","2.5.2","2.5.3","2.5.4","2.5.5","2.5.6","2.5.7","2.5.8"]);
              const mobileKwRe = /mobile|touch|tap|swipe|pinch|zoom|viewport|orientation|small.?screen|target.?size|gesture|pointer.?gesture|responsive|portrait|landscape|finger/i;

              // Filter WCAG groups that are mobile-relevant
              const mobileGroups = groups.filter(g => {
                const k = getCriterionKey(g.wcagCriterion);
                return (k && MOBILE_CRITERIA.has(k)) || mobileKwRe.test(g.problem || "") || mobileKwRe.test(g.wcagCriterion || "");
              });

              // ── Extract mobile-relevant insights from AI text (site-specific) ──
              const splitSentences = text => {
                if (!text) return [];
                return text.match(/[^.!?]+[.!?]+/g)?.map(s => s.trim()).filter(Boolean) || [];
              };
              const hciSentences = splitSentences(analysis.hciSummary || "");
              const summarySentences = splitSentences(analysis.overallSummary || "");
              const allSentences = [...hciSentences, ...summarySentences];
              const mobileInsights = [...new Set(allSentences.filter(s => mobileKwRe.test(s)))].slice(0, 4);

              // Mobile-relevant next steps from AI
              const mobileNextSteps = (analysis.nextSteps || []).filter(s => mobileKwRe.test(s));

              // ── Heuristic checks based on actual analysis data ──
              const hasViewport = typeof analysis.html === "string" && analysis.html.length > 0
                ? /name=["']viewport["']/i.test(analysis.html)
                : null; // null = unknown (html not available)
              const noTouchTargetIssue = !groups.some(g => { const k = getCriterionKey(g.wcagCriterion); return k === "2.5.5" || k === "2.5.8"; });
              const noReflowIssue = !groups.some(g => getCriterionKey(g.wcagCriterion) === "1.4.10");
              const noOrientationIssue = !groups.some(g => getCriterionKey(g.wcagCriterion) === "1.3.4");
              const noTextScaleIssue = !groups.some(g => getCriterionKey(g.wcagCriterion) === "1.4.4");

              const checks = [
                hasViewport !== null && { label: "Viewport meta tag", pass: hasViewport, detail: hasViewport ? "Page declares a viewport — should scale correctly on mobile." : "No viewport meta tag found — page may render at desktop width on phones." },
                { label: "Touch target size (2.5.5/2.5.8)", pass: noTouchTargetIssue, detail: noTouchTargetIssue ? "No touch target size violations flagged." : "Buttons or links may be too small to tap accurately on mobile." },
                { label: "Content reflow at 320px (1.4.10)", pass: noReflowIssue, detail: noReflowIssue ? "No reflow violations detected." : "Content may require horizontal scrolling at 320px viewport width." },
                { label: "Orientation lock (1.3.4)", pass: noOrientationIssue, detail: noOrientationIssue ? "No orientation restrictions detected." : "Content may be restricted to a single orientation (portrait/landscape)." },
                { label: "Text resize (1.4.4)", pass: noTextScaleIssue, detail: noTextScaleIssue ? "No text scaling issues detected." : "Text may not scale correctly when browser text size is increased." },
              ].filter(Boolean);

              const passCount = checks.filter(c => c.pass).length;
              const mobilePct = Math.round((passCount / checks.length) * 100);
              const scoreColor = mobilePct >= 80 ? "#16a34a" : mobilePct >= 50 ? "#d97706" : "#dc2626";
              const sevColor = s => { const sl=(s||"").toLowerCase(); if(sl==="high"||sl==="critical"||sl==="serious") return "#dc2626"; if(sl==="medium"||sl==="moderate"||sl==="warning") return "#d97706"; return "#16a34a"; };

              // ── Device size options (frameW/H = outer shell, pad = inner padding, screenH = content area height) ──
              const DEVICE_SIZES = [
                { label: "SE",      sub: "iPhone SE",        w: 375, frameW: 148, frameH: 294, pad: 5, screenH: 250, radius: 28, island: false, homeBar: false, homeBtn: true  },
                { label: "14",      sub: "iPhone 14/15",     w: 390, frameW: 155, frameH: 310, pad: 6, screenH: 268, radius: 30, island: true,  homeBar: true,  homeBtn: false },
                { label: "Pro Max", sub: "iPhone Pro Max",   w: 430, frameW: 168, frameH: 326, pad: 6, screenH: 280, radius: 32, island: true,  homeBar: true,  homeBtn: false },
                { label: "Galaxy",  sub: "Samsung Galaxy S", w: 360, frameW: 145, frameH: 302, pad: 5, screenH: 264, radius: 24, island: false, homeBar: false, homeBtn: false },
                { label: "Pixel",   sub: "Google Pixel 7",   w: 412, frameW: 160, frameH: 316, pad: 6, screenH: 272, radius: 20, island: false, homeBar: true,  homeBtn: false },
                { label: "iPad",    sub: "iPad Mini",        w: 768, frameW: 218, frameH: 290, pad: 8, screenH: 248, radius: 14, island: false, homeBar: true,  homeBtn: false },
              ];

              // ── Active device dimensions ──
              const dev = DEVICE_SIZES.find(d => d.w === mobilePreviewWidth) || DEVICE_SIZES[1];
              const screenW = dev.frameW - dev.pad * 2;
              const scale = screenW / dev.w;
              const iframeH = Math.round(dev.screenH / scale);

              return (
                <div style={{ background: "#fff", borderRadius: 18, padding: "24px 28px", boxShadow: "var(--shadow)", marginTop: 32, border: "1px solid var(--border-light)" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2 style={{ margin: "0 0 2px", fontSize: 18 }}>Mobile Experience</h2>
                      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Accessibility issues that affect mobile and touch users</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: scoreColor, lineHeight: 1, letterSpacing: "-1px" }}>{mobilePct}%</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{passCount}/{checks.length} checks passed</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
                    {/* ── Device mockup ── */}
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.25s ease" }}>
                      <div style={{
                        width: dev.frameW,
                        height: dev.frameH,
                        background: "linear-gradient(145deg,#1e293b 0%,#0f172a 100%)",
                        borderRadius: dev.radius,
                        padding: `10px ${dev.pad}px ${dev.homeBtn ? 14 : 8}px`,
                        boxShadow: "0 24px 64px rgba(0,0,0,0.38), inset 0 0 0 1.5px rgba(255,255,255,0.11), 0 0 0 7px rgba(15,23,42,0.07)",
                        position: "relative",
                        transition: "all 0.25s ease",
                      }}>
                        {/* Volume / side buttons — phones only */}
                        {!dev.island || true ? (<>
                          <div style={{ position: "absolute", left: -3, top: 68, width: 3, height: 22, background: "#334155", borderRadius: "2px 0 0 2px" }} />
                          <div style={{ position: "absolute", left: -3, top: 98, width: 3, height: 34, background: "#334155", borderRadius: "2px 0 0 2px" }} />
                          <div style={{ position: "absolute", left: -3, top: 138, width: 3, height: 34, background: "#334155", borderRadius: "2px 0 0 2px" }} />
                          <div style={{ position: "absolute", right: -3, top: 98, width: 3, height: 50, background: "#334155", borderRadius: "0 2px 2px 0" }} />
                        </>) : null}

                        {/* Top chrome: Dynamic island or punch-hole dot */}
                        {dev.island ? (
                          <div style={{ width: 44, height: 8, background: "#0f172a", borderRadius: 999, margin: "0 auto 6px", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)" }} />
                        ) : (
                          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 14, marginBottom: 4 }}>
                            <div style={{ width: 8, height: 8, background: "#1e293b", borderRadius: "50%", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" }} />
                          </div>
                        )}

                        {/* Screen */}
                        <div style={{ borderRadius: Math.max(dev.radius - 10, 8), overflow: "hidden", height: dev.screenH, background: "#0f172a", position: "relative" }}>
                          {!mobileIframeError && analysis.url ? (
                            <iframe
                              key={mobilePreviewWidth}
                              src={analysis.url}
                              title="Responsive preview"
                              onError={() => setMobileIframeError(true)}
                              style={{
                                width: dev.w,
                                height: iframeH,
                                border: "none",
                                transform: `scale(${scale})`,
                                transformOrigin: "top left",
                                pointerEvents: "none",
                                display: "block",
                              }}
                            />
                          ) : (previewResult?.screenshot || analysis.screenshot) ? (
                            <img
                              src={previewResult?.screenshot || analysis.screenshot}
                              alt="Desktop screenshot (responsive preview unavailable)"
                              style={{ width: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 11 }}>No preview</div>
                          )}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)", pointerEvents: "none" }} />
                        </div>

                        {/* Bottom chrome: home bar or home button */}
                        {dev.homeBar && (
                          <div style={{ width: 44, height: 3, background: "rgba(255,255,255,0.22)", borderRadius: 999, margin: "6px auto 0" }} />
                        )}
                        {dev.homeBtn && (
                          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.18)", margin: "6px auto 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
                          </div>
                        )}
                      </div>

                      {/* Device label */}
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.3px", textAlign: "center" }}>
                        {!mobileIframeError && analysis.url ? `${dev.sub} · ${dev.w}px` : "Desktop screenshot"}
                      </span>
                      {(mobileIframeError || !analysis.url) && (
                        <span style={{ fontSize: 10, color: "#cbd5e1", textAlign: "center", maxWidth: dev.frameW }}>Site blocked iframe embedding</span>
                      )}

                      {/* Device size chips */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 4, maxWidth: Math.max(dev.frameW, 200) }}>
                        {DEVICE_SIZES.map(d => {
                          const active = mobilePreviewWidth === d.w;
                          return (
                            <button
                              key={d.w}
                              title={`${d.sub} (${d.w}px)`}
                              onClick={() => { setMobilePreviewWidth(d.w); setMobileIframeError(false); }}
                              style={{
                                padding: "3px 8px",
                                fontSize: 10,
                                fontWeight: active ? 700 : 500,
                                borderRadius: 999,
                                border: `1px solid ${active ? "#0ea5e9" : "#e2e8f0"}`,
                                background: active ? "#e0f2fe" : "#f8fafc",
                                color: active ? "#0369a1" : "#64748b",
                                cursor: "pointer",
                                transition: "all 0.15s",
                                lineHeight: 1.4,
                              }}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Right: checks + insights ── */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Heuristic checks */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>WCAG Mobile Checks</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 22 }}>
                        {checks.map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, background: c.pass ? "#f0fdf4" : "#fef2f2", border: `1px solid ${c.pass ? "#bbf7d0" : "#fca5a5"}`, borderRadius: 10, padding: "10px 12px" }}>
                            <div style={{ width: 18, height: 18, borderRadius: "50%", background: c.pass ? "#16a34a" : "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                              {c.pass
                                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              }
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: c.pass ? "#15803d" : "#b91c1c", marginBottom: 2 }}>{c.label}</div>
                              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>{c.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AI-extracted mobile insights (site-specific) */}
                      {mobileInsights.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>AI Mobile Insights</div>
                          <div style={{ marginBottom: 22 }}>
                            {mobileInsights.map((s, i) => (
                              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "3px solid #0ea5e9", borderRadius: 8, marginBottom: 6 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.55 }}>{s}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* WCAG-flagged mobile violations */}
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                        Mobile-Related Violations {mobileGroups.length > 0 && <span style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 999, padding: "1px 7px", marginLeft: 4 }}>{mobileGroups.length}</span>}
                      </div>
                      {mobileGroups.length > 0 ? mobileGroups.map((g, i) => (
                        <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: "#fafafa", border: "1px solid #f1f5f9", borderLeft: `3px solid ${sevColor(g.severity)}`, marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: g.problem ? 4 : 0 }}>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{g.wcagCriterion}</span>
                            {g.severity && <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: sevColor(g.severity), borderRadius: 999, padding: "1px 7px", textTransform: "uppercase" }}>{g.severity}</span>}
                            {typeof g.count === "number" && <span style={{ fontSize: 11, color: "#94a3b8" }}>{g.count} instance{g.count !== 1 ? "s" : ""}</span>}
                          </div>
                          {g.problem && <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{g.problem}</p>}
                          {g.recommendation && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#0ea5e9", fontStyle: "italic" }}>→ {g.recommendation}</p>}
                        </div>
                      )) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, marginBottom: mobileNextSteps.length > 0 ? 16 : 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#15803d" }}>No mobile-specific WCAG violations flagged by the analysis.</span>
                        </div>
                      )}

                      {/* Mobile-relevant next steps from AI */}
                      {mobileNextSteps.length > 0 && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", margin: "18px 0 10px" }}>Recommended Mobile Fixes</div>
                          {mobileNextSteps.map((s, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "3px solid #f59e0b", borderRadius: 8, marginBottom: 6 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="9 18 15 12 9 6"/></svg>
                              <p style={{ margin: 0, fontSize: 12, color: "#92400e", lineHeight: 1.55 }}>{s}</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Specialized Audits Section ── */}
            {analysis && (() => {
              const sevColor = s => { const sl=(s||"").toLowerCase(); if(sl==="high"||sl==="critical"||sl==="serious") return "#dc2626"; if(sl==="medium"||sl==="moderate"||sl==="warning") return "#d97706"; return "#16a34a"; };

              // ── Info popup content ──
              const AUDIT_INFO = {
                specialized: {
                  title: "Specialized Audits",
                  icon: "🔍",
                  what: "A set of focused deep-dive checks that go beyond the general WCAG score, each targeting a specific accessibility domain.",
                  why: "General scores can mask domain-specific failure patterns. A site might score 80 overall but have every single form completely inaccessible to screen reader users — the specialized audits surface exactly those kinds of blind spots.",
                  how: "Each audit maps to a cluster of WCAG success criteria that share a common impact pattern. Issues are detected by combining flagged WCAG violation groups with keyword analysis of the AI's written findings.",
                  wcag: "Covers criteria across all four POUR principles — Perceivable, Operable, Understandable, and Robust.",
                },
                form: {
                  title: "Form Accessibility",
                  icon: "📋",
                  what: "Checks whether form controls — inputs, selects, textareas, buttons — are properly labeled, whether errors are clearly communicated, and whether fields are programmatically identifiable.",
                  why: "Forms are the primary interaction point for critical tasks: login, checkout, contact, registration. An inaccessible form locks users out of core functionality entirely — it's not a minor inconvenience, it's a blocker.",
                  how: "Screen reader users depend on programmatic labels to know what each field is for. Users with cognitive disabilities need clear, specific error messages. Motor-impaired users rely on autocomplete to avoid repetitive typing. All of these are testable with WCAG criteria.",
                  wcag: "WCAG 1.3.1 (Info & Relationships), 1.3.5 (Input Purpose / autocomplete), 3.3.1 (Error Identification), 3.3.2 (Labels or Instructions), 3.3.3 (Error Suggestion), 3.3.4 (Error Prevention).",
                },
                aria: {
                  title: "ARIA Usage",
                  icon: "🧩",
                  what: "Verifies that ARIA roles, properties, and states are used correctly — and flags cases where ARIA is absent when needed, or present in ways that actively break assistive technology.",
                  why: "ARIA is the bridge between modern UI patterns and screen readers. But it's a double-edged tool: incorrect ARIA usage is often worse than no ARIA at all. A button with the wrong role, or a modal without the right aria attributes, can make an interface completely unusable for blind users.",
                  how: "Common ARIA mistakes include: missing accessible names on interactive elements, redundant or conflicting roles, required child roles missing from parent containers, and aria-hidden applied to focusable elements. Each of these silently breaks screen reader navigation.",
                  wcag: "WCAG 4.1.1 (Parsing), 4.1.2 (Name, Role, Value) — both part of the Robust principle, which ensures content can be interpreted by a wide range of assistive technologies.",
                },
              };

              // Reusable "?" info button
              const InfoBtn = ({ infoKey }) => (
                <button
                  onClick={e => { e.stopPropagation(); setAuditInfoOpen(prev => prev === infoKey ? null : infoKey); }}
                  title="Learn more about this section"
                  style={{
                    width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #94a3b8",
                    background: "transparent", color: "#94a3b8", fontSize: 10, fontWeight: 700,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
                    padding: 0, lineHeight: 1, flexShrink: 0, transition: "all 0.15s",
                    ...(auditInfoOpen === infoKey ? { borderColor: "#7c3aed", color: "#7c3aed", background: "#f5f3ff" } : {}),
                  }}
                >?</button>
              );

              // Extract sentences matching a regex from a text string
              const sentences = text => (text||"").match(/[^.!?]+[.!?]+/g)?.map(s=>s.trim()).filter(Boolean) || [];
              const aiTexts = [ai.overallSummary||"", ai.hciSummary||"", ...(ai.nextSteps||[])];
              const extractFromAll = re => [...new Set(aiTexts.flatMap(t => sentences(t).filter(s => re.test(s))))];

              // ── 1. Form Accessibility ──
              const FORM_CRIT = new Set(["1.3.1","1.3.5","3.3.1","3.3.2","3.3.3","3.3.4","4.1.3"]);
              const formRe = /\bform\b|\binput\b|\blabel\b|\bfield\b|\bsubmit\b|error.{0,20}message|validation|autocomplete|placeholder|\brequired\b/i;
              const formGroups = groups.filter(g => { const k=getCriterionKey(g.wcagCriterion); return (k&&FORM_CRIT.has(k))||formRe.test(g.problem||"")||formRe.test(g.wcagCriterion||""); });
              const formInsights = extractFromAll(formRe).slice(0,3);

              // ── 2. ARIA Usage ──
              const ARIA_CRIT = new Set(["4.1.1","4.1.2"]);
              const ariaRe = /\baria[-_\s]|\brole\s*=|landmark|aria.label|aria.labelledby|aria.describedby|aria.hidden|accessible.name|assistive.tech/i;
              const ariaGroups = groups.filter(g => { const k=getCriterionKey(g.wcagCriterion); return (k&&ARIA_CRIT.has(k))||ariaRe.test(g.problem||"")||ariaRe.test(g.wcagCriterion||""); });
              const ariaInsights = extractFromAll(ariaRe).slice(0,3);

              // ── 3. Animation / Motion ──
              const MOTION_CRIT = new Set(["2.2.2","2.3.1","2.3.2","2.3.3"]);
              const motionRe = /animation|motion|carousel|autoplay|auto.play|\btransition\b|parallax|flicker|blink|reduced.motion|vestibular|moving.content|scrolling.effect/i;
              const motionGroups = groups.filter(g => { const k=getCriterionKey(g.wcagCriterion); return (k&&MOTION_CRIT.has(k))||motionRe.test(g.problem||"")||motionRe.test(g.wcagCriterion||""); });
              const motionInsights = extractFromAll(motionRe).slice(0,3);

              // ── 4. Language Attributes ──
              const LANG_CRIT = new Set(["3.1.1","3.1.2"]);
              const langRe = /\blang\b|language.{0,15}attr|html.{0,10}lang|xml.lang|lang.{0,15}attribute|\blocale\b/i;
              const langGroups = groups.filter(g => { const k=getCriterionKey(g.wcagCriterion); return (k&&LANG_CRIT.has(k))||langRe.test(g.problem||"")||langRe.test(g.wcagCriterion||""); });
              const langInsights = extractFromAll(langRe).slice(0,3);
              // Check html lang from raw HTML if available
              const hasLangAttr = analysis.html && analysis.html.length > 0 ? /<html[^>]+lang\s*=/i.test(analysis.html) : null;

              // ── 10. Cognitive Accessibility Score ──
              const COG_CRIT = new Set(["1.4.12","2.4.2","2.4.6","3.1.1","3.1.2","3.1.3","3.1.4","3.1.5","3.2.1","3.2.2","3.2.3","3.2.4","3.3.1","3.3.2","3.3.3","3.3.4"]);
              const cogRe = /cognitive|reading.level|comprehension|plain.language|readability|consistent|predictable|jargon|complex\s|instruction|error.prevention|memory|attention|\bclear\b|confus/i;
              const cogGroups = groups.filter(g => { const k=getCriterionKey(g.wcagCriterion); return (k&&COG_CRIT.has(k))||cogRe.test(g.problem||""); });
              const cogInsights = extractFromAll(cogRe).slice(0,4);
              const cogNegRe = /difficult|unclear|confus|hard\s|poor|lack|missing|inconsistent|complex\s|no\s+clear|jargon/i;
              const cogNegHits = cogInsights.filter(s => cogNegRe.test(s)).length;
              const cogScore = Math.max(10, Math.min(100, 95 - cogGroups.length*12 - cogNegHits*8));
              const cogColor = cogScore>=75 ? "#16a34a" : cogScore>=50 ? "#d97706" : "#dc2626";

              const COG_CHECKS = [
                { label: "Consistent navigation (3.2.3)", key: "3.2.3" },
                { label: "Consistent identification (3.2.4)", key: "3.2.4" },
                { label: "Labels/instructions (3.3.2)", key: "3.3.2" },
                { label: "Error prevention (3.3.4)", key: "3.3.4" },
                { label: "Page title (2.4.2)", key: "2.4.2" },
                { label: "Headings/labels (2.4.6)", key: "2.4.6" },
              ].map(c => ({ ...c, pass: !cogGroups.some(g => getCriterionKey(g.wcagCriterion)===c.key) }));

              // ── Shared audit card renderer ──
              const AuditCard = ({ icon, iconBg, iconStroke, title, subtitle, issueGroups, insights, extraChecks, infoKey }) => {
                const hasIssues = issueGroups.length > 0;
                const hasData = hasIssues || insights.length > 0 || (extraChecks && extraChecks.some(c => !c.pass));
                return (
                  <div style={{ background:"#fff", borderRadius:14, padding:"18px 20px", border:`1px solid ${hasIssues?"#fca5a5":"#e2e8f0"}`, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                    {/* Card header */}
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:iconBg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:icon}}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", display:"flex", alignItems:"center", gap:5 }}>
                          {title}
                          {infoKey && <InfoBtn infoKey={infoKey} />}
                        </div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>{subtitle}</div>
                      </div>
                      <div style={{
                        fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:999,
                        background: hasIssues?"#fef2f2": insights.length>0?"#fffbeb":"#f0fdf4",
                        color: hasIssues?"#dc2626": insights.length>0?"#d97706":"#16a34a",
                        border: `1px solid ${hasIssues?"#fca5a5": insights.length>0?"#fde68a":"#bbf7d0"}`,
                        whiteSpace:"nowrap", flexShrink:0,
                      }}>
                        {hasIssues ? `${issueGroups.length} issue${issueGroups.length>1?"s":""}` : insights.length>0 ? "Warnings" : "Clean"}
                      </div>
                    </div>

                    {/* Extra binary checks */}
                    {extraChecks && extraChecks.length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom: (issueGroups.length>0||insights.length>0)?12:0 }}>
                        {extraChecks.map((c,i)=>(
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color: c.pass?"#15803d":"#b91c1c" }}>
                            {c.pass
                              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            }
                            {c.label}{c.detail && <span style={{ color:"#64748b", fontWeight:400 }}> — {c.detail}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* WCAG violation groups */}
                    {issueGroups.map((g,i)=>(
                      <div key={i} style={{ padding:"8px 10px", borderRadius:8, background:"#fafafa", border:"1px solid #f1f5f9", borderLeft:`3px solid ${sevColor(g.severity)}`, marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:g.problem?3:0 }}>
                          <span style={{ fontSize:11.5, fontWeight:700, color:"#0f172a" }}>{g.wcagCriterion}</span>
                          {g.severity && <span style={{ fontSize:9, fontWeight:700, color:"#fff", background:sevColor(g.severity), borderRadius:999, padding:"1px 6px", textTransform:"uppercase" }}>{g.severity}</span>}
                          {typeof g.count==="number" && <span style={{ fontSize:10, color:"#94a3b8" }}>{g.count} instance{g.count!==1?"s":""}</span>}
                        </div>
                        {g.problem && <p style={{ margin:0, fontSize:11, color:"#475569", lineHeight:1.5 }}>{g.problem}</p>}
                        {g.recommendation && <p style={{ margin:"3px 0 0", fontSize:10.5, color:"#0ea5e9", fontStyle:"italic" }}>→ {g.recommendation}</p>}
                      </div>
                    ))}

                    {/* AI insights */}
                    {insights.map((s,i)=>(
                      <div key={i} style={{ display:"flex", gap:6, padding:"7px 10px", background:"#f8fafc", border:"1px solid #e2e8f0", borderLeft:"3px solid #94a3b8", borderRadius:8, marginBottom:5 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <p style={{ margin:0, fontSize:11, color:"#475569", lineHeight:1.5 }}>{s}</p>
                      </div>
                    ))}

                    {!hasData && (
                      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:"#15803d" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        No issues detected in this area.
                      </div>
                    )}
                  </div>
                );
              };

              const info = auditInfoOpen ? AUDIT_INFO[auditInfoOpen] : null;

              return (
                <>
                {/* Info modal overlay */}
                {info && (
                  <div
                    onClick={() => setAuditInfoOpen(null)}
                    style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
                  >
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{ background:"#fff", borderRadius:18, padding:"28px 30px", maxWidth:520, width:"100%", boxShadow:"0 24px 80px rgba(0,0,0,0.22)", position:"relative" }}
                    >
                      {/* Close */}
                      <button
                        onClick={() => setAuditInfoOpen(null)}
                        style={{ position:"absolute", top:14, right:14, width:28, height:28, borderRadius:"50%", border:"none", background:"#f1f5f9", color:"#64748b", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}
                      >✕</button>

                      {/* Header */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                        <span style={{ fontSize:26 }}>{info.icon}</span>
                        <div>
                          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:"#0f172a" }}>{info.title}</h3>
                          <span style={{ fontSize:11, fontWeight:600, color:"#7c3aed", background:"#f5f3ff", border:"1px solid #ddd6fe", borderRadius:999, padding:"1px 8px" }}>Accessibility Audit</span>
                        </div>
                      </div>

                      {/* Sections */}
                      {[
                        { label: "What it checks", text: info.what, color: "#0ea5e9", bg: "#f0f9ff", border: "#bae6fd" },
                        { label: "Why it matters", text: info.why, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                        { label: "How it works", text: info.how, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                        { label: "WCAG criteria", text: info.wcag, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
                      ].map(({ label, text, color, bg, border }) => (
                        <div key={label} style={{ background:bg, border:`1px solid ${border}`, borderRadius:10, padding:"11px 14px", marginBottom:10 }}>
                          <div style={{ fontSize:10, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{label}</div>
                          <p style={{ margin:0, fontSize:12.5, color:"#374151", lineHeight:1.6 }}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop:32 }}>
                  {/* Section header */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:"#f5f3ff", border:"1px solid #ddd6fe", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                    <div>
                      <h2 style={{ margin:0, fontSize:17, display:"flex", alignItems:"center", gap:6 }}>
                        Specialized Audits
                        <InfoBtn infoKey="specialized" />
                      </h2>
                      <p style={{ margin:0, fontSize:11.5, color:"#94a3b8" }}>Targeted checks for forms, ARIA, motion, language, and cognitive load</p>
                    </div>
                  </div>

                  {/* 2×2 audit grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                    <AuditCard
                      icon='<rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="15" x2="16" y2="15"/>'
                      iconBg="#fef9c3" iconStroke="#ca8a04"
                      title="Form Accessibility"
                      subtitle="Labels, errors, validation, autocomplete"
                      issueGroups={formGroups}
                      insights={formInsights}
                      extraChecks={[]}
                      infoKey="form"
                    />
                    <AuditCard
                      icon='<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>'
                      iconBg="#ede9fe" iconStroke="#7c3aed"
                      title="ARIA Usage"
                      subtitle="Roles, accessible names, landmarks"
                      issueGroups={ariaGroups}
                      insights={ariaInsights}
                      extraChecks={[]}
                      infoKey="aria"
                    />
                    <AuditCard
                      icon='<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
                      iconBg="#fff7ed" iconStroke="#ea580c"
                      title="Animation & Motion"
                      subtitle="Flashing, autoplay, reduced-motion support"
                      issueGroups={motionGroups}
                      insights={motionInsights}
                      extraChecks={[]}
                    />
                    <AuditCard
                      icon='<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
                      iconBg="#ecfdf5" iconStroke="#059669"
                      title="Language Attributes"
                      subtitle="html[lang], lang on passages, locale"
                      issueGroups={langGroups}
                      insights={langInsights}
                      extraChecks={hasLangAttr !== null ? [{ label: "html[lang] attribute", pass: hasLangAttr, detail: hasLangAttr ? "Present" : "Missing — screen readers cannot determine page language" }] : []}
                    />
                  </div>

                  {/* ── Cognitive Accessibility Score (full width) ── */}
                  <div style={{ background:"#fff", borderRadius:14, padding:"20px 24px", border:"1px solid #e2e8f0", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:20 }}>
                      {/* Circular score */}
                      <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <svg width="80" height="80" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                          <circle cx="40" cy="40" r="32" fill="none" stroke={cogColor} strokeWidth="8"
                            strokeDasharray={`${2*Math.PI*32*cogScore/100} ${2*Math.PI*32*(1-cogScore/100)}`}
                            strokeDashoffset={2*Math.PI*32*0.25}
                            strokeLinecap="round"
                          />
                          <text x="40" y="37" textAnchor="middle" fontSize="16" fontWeight="800" fill={cogColor}>{cogScore}</text>
                          <text x="40" y="50" textAnchor="middle" fontSize="8" fill="#94a3b8">/100</text>
                        </svg>
                        <span style={{ fontSize:10, fontWeight:600, color:"#94a3b8" }}>Cognitive Score</span>
                      </div>

                      {/* Right content */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                          <div style={{ width:28, height:28, borderRadius:7, background:"#f0fdf4", border:"1px solid #bbf7d0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/><circle cx="12" cy="12" r="10"/></svg>
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>Cognitive Accessibility</div>
                            <div style={{ fontSize:11, color:"#94a3b8" }}>Readability, consistency, error prevention, predictability</div>
                          </div>
                        </div>

                        {/* Checks grid */}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom: cogInsights.length>0?14:0 }}>
                          {COG_CHECKS.map((c,i)=>(
                            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10.5, color: c.pass?"#15803d":"#b91c1c", background: c.pass?"#f0fdf4":"#fef2f2", border:`1px solid ${c.pass?"#bbf7d0":"#fca5a5"}`, borderRadius:7, padding:"5px 8px" }}>
                              {c.pass
                                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              }
                              <span>{c.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* AI insights */}
                        {cogInsights.length > 0 && (
                          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                            {cogInsights.map((s,i)=>(
                              <div key={i} style={{ display:"flex", gap:6, padding:"7px 10px", background:"#fafafa", border:"1px solid #e2e8f0", borderLeft:"3px solid #7c3aed", borderRadius:8 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                <p style={{ margin:0, fontSize:11, color:"#475569", lineHeight:1.5 }}>{s}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {cogInsights.length === 0 && cogGroups.length === 0 && (
                          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:"#15803d" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            No cognitive accessibility issues detected.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </>
              );
            })()}

            {/* Issue Breakdown Panel - moved to left panel under score gauges */}
            {false && <div className="kw-card" style={{ display: "none" }}>
                <h2 className="kw-card-heading">Issue Breakdown</h2>
                {(() => {
                  if (!groups || groups.length === 0) {
                    return <p style={{ color: "#94a3b8", fontSize: 14 }}>No violations data available.</p>;
                  }

                  const totalIssues = groups.reduce((s, g) => s + (g.count || 1), 0);

                  // ── Issues per WCAG principle ────────────────────────────
                  const principleColors = { Perceivable: "#3b82f6", Operable: "#d97706", Understandable: "#189b97", Robust: "#7c3aed" };
                  const principleCounts = { Perceivable: 0, Operable: 0, Understandable: 0, Robust: 0 };
                  groups.forEach(g => {
                    const p = getPrincipleFromCriterion(g.wcagCriterion);
                    if (p && p in principleCounts) principleCounts[p] += (g.count || 1);
                  });

                  // ── Pie chart (SVG filled slices) ────────────────────────
                  const pieData = Object.entries(principleCounts)
                    .filter(([, v]) => v > 0)
                    .map(([label, value]) => ({ label, value, color: principleColors[label] }));
                  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

                  const buildPieSlices = (data, total, cx, cy, r) => {
                    let angle = -90; // start at top
                    return data.map((d) => {
                      const sweep = (d.value / total) * 360;
                      const startRad = (angle * Math.PI) / 180;
                      const endRad   = ((angle + sweep) * Math.PI) / 180;
                      const x1 = cx + r * Math.cos(startRad);
                      const y1 = cy + r * Math.sin(startRad);
                      const x2 = cx + r * Math.cos(endRad);
                      const y2 = cy + r * Math.sin(endRad);
                      const large = sweep > 180 ? 1 : 0;
                      const path = sweep >= 359.99
                        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
                        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                      // midpoint angle for label
                      const midRad = ((angle + sweep / 2) * Math.PI) / 180;
                      const lx = cx + (r * 0.65) * Math.cos(midRad);
                      const ly = cy + (r * 0.65) * Math.sin(midRad);
                      const pct = Math.round((d.value / total) * 100);
                      angle += sweep;
                      return { ...d, path, lx, ly, pct };
                    });
                  };

                  const slices = pieTotal > 0 ? buildPieSlices(pieData, pieTotal, 70, 70, 62) : [];

                  // ── Top criteria ranked by severity then count ───────────
                  const sevWeight = (s) => {
                    const sl = (s || "").toLowerCase();
                    if (sl === "high" || sl === "critical") return 3;
                    if (sl === "medium" || sl === "warning") return 2;
                    return 1;
                  };
                  const topCriteria = [...groups]
                    .sort((a, b) => sevWeight(b.severity) - sevWeight(a.severity) || (b.count || 1) - (a.count || 1))
                    .slice(0, 5);

                  const sevBadgeStyle = (sev) => {
                    const sl = (sev || "").toLowerCase();
                    if (sl === "high" || sl === "critical") return { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" };
                    if (sl === "medium" || sl === "warning") return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
                    return { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" };
                  };

                  return (
                    <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
                      {/* Left: Pie chart + legend */}
                      <div style={{ flexShrink: 0, width: 220 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
                          Issues by WCAG Principle
                        </div>
                        {slices.length > 0 ? (
                          <>
                            <svg width="140" height="140" viewBox="0 0 140 140" style={{ display: "block", margin: "0 auto 14px" }}>
                              {slices.map((s) => (
                                <path
                                  key={s.label}
                                  d={s.path}
                                  fill={s.color}
                                  opacity={hoveredSlice && hoveredSlice !== s.label ? 0.45 : 1}
                                  style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
                                  onMouseEnter={() => setHoveredSlice(s.label)}
                                  onMouseLeave={() => setHoveredSlice(null)}
                                />
                              ))}
                              {slices.map((s) => (
                                <path key={s.label + "-sep"} d={s.path} fill="none" stroke="#fff" strokeWidth="2" />
                              ))}
                              <circle cx="70" cy="70" r="34" fill="#fff" />
                              <text x="70" y="67" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="800" fill="#0f172a">
                                {hoveredSlice ? principleCounts[hoveredSlice] : totalIssues}
                              </text>
                              <text x="70" y="82" textAnchor="middle" fontSize="9" fill="#94a3b8">
                                {hoveredSlice ? hoveredSlice.split(" ")[0] : "total"}
                              </text>
                            </svg>
                            <div>
                              {slices.map((s) => (
                                <div
                                  key={s.label}
                                  onMouseEnter={() => setHoveredSlice(s.label)}
                                  onMouseLeave={() => setHoveredSlice(null)}
                                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, cursor: "default", opacity: hoveredSlice && hoveredSlice !== s.label ? 0.4 : 1, transition: "opacity 0.15s ease" }}
                                >
                                  <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", flex: 1 }}>{s.label}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.pct}%</span>
                                </div>
                              ))}
                              {Object.entries(principleCounts).filter(([, v]) => v === 0).map(([label]) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, opacity: 0.35 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: 3, background: "#e2e8f0", flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", flex: 1 }}>{label}</span>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1" }}>0%</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p style={{ color: "#94a3b8", fontSize: 13 }}>No principle data available.</p>
                        )}
                      </div>

                      {/* Divider */}
                      <div style={{ width: 1, alignSelf: "stretch", background: "#f1f5f9", flexShrink: 0 }} />

                      {/* Right: Fix First ranked list */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                          Fix First — Ranked by Priority
                        </div>
                        {topCriteria.map((g, i) => {
                          const badge = sevBadgeStyle(g.severity);
                          const criterionNum = getCriterionKey(g.wcagCriterion);
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: i < topCriteria.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", minWidth: 18, paddingTop: 1 }}>#{i + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{criterionNum || g.wcagCriterion}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 999, padding: "1px 7px" }}>
                                    {g.severity}
                                  </span>
                                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{g.count} instance{g.count !== 1 ? "s" : ""}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: 11.5, color: "#64748b", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                  {g.problem}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
            </div>}
            <div
              className="next-steps"
              style={{
                background: "#fff",
                borderRadius: "18px",
                padding: "20px 24px",
                boxShadow: "var(--shadow)",
                marginTop: "32px",
                border: "1px solid var(--border-light)",
                borderTop: "3px solid #d97706",
              }}
            >
              {(() => {
                if (nextSteps.length === 0) {
                  return (
                    <>
                      <h2 className="next-steps-heading">Next Steps</h2>
                      <p style={{ color: "#64748b", fontSize: 14 }}>No specific recommendations were generated.</p>
                    </>
                  );
                }

                // ── Effort tag detection ─────────────────────────────────
                const detectEffort = (text) => {
                  const t = text.toLowerCase();
                  if (/test|audit|review|screen reader|assistive|manual|verify|check/.test(t))
                    return { label: "Testing", color: "#7c3aed", bg: "#f5f3ff" };
                  if (/aria|semantic|landmark|structure|heading|role|hierarchy|implement|refactor/.test(t))
                    return { label: "Structural", color: "#0ea5e9", bg: "#f0f9ff" };
                  if (/alt text|alt=|label|contrast|lang|skip|button text|link text|descriptive/.test(t))
                    return { label: "Quick win", color: "#16a34a", bg: "#f0fdf4" };
                  return { label: "Moderate", color: "#d97706", bg: "#fffbeb" };
                };

                // ── Phase grouping ───────────────────────────────────────
                const phaseOrder = ["Quick win", "Moderate", "Structural", "Testing"];
                const phaseLabels = {
                  "Quick win":  { title: "Quick Wins",           sub: "Under 30 min each",         color: "#16a34a", border: "#86efac" },
                  "Moderate":   { title: "Moderate Fixes",        sub: "Require code changes",       color: "#d97706", border: "#fde68a" },
                  "Structural": { title: "Structural Changes",    sub: "Architecture / markup",      color: "#0ea5e9", border: "#bae6fd" },
                  "Testing":    { title: "Testing & Validation",  sub: "Manual & tool verification", color: "#7c3aed", border: "#ddd6fe" },
                };

                // ── WCAG criterion linking ───────────────────────────────
                const stepCriteria = (text) => {
                  const t = text.toLowerCase();
                  const matches = [];
                  if (/alt text|alternative text|img/.test(t))          matches.push("1.1.1");
                  if (/label|form field|input/.test(t))                  matches.push("1.3.1");
                  if (/contrast|color.*text|text.*color/.test(t))        matches.push("1.4.3");
                  if (/keyboard|tab |focus/.test(t))                     matches.push("2.1.1");
                  if (/skip|bypass/.test(t))                             matches.push("2.4.1");
                  if (/link text|descriptive.*link|link.*descriptive/.test(t)) matches.push("2.4.4");
                  if (/focus.*visible|visible.*focus|focus ring/.test(t)) matches.push("2.4.7");
                  if (/error|validation/.test(t))                        matches.push("3.3.1");
                  if (/button.*name|accessible.*name|aria-label/.test(t)) matches.push("4.1.2");
                  if (/lang|language/.test(t))                           matches.push("3.1.1");
                  // Filter to only criteria that are actually in the groups list
                  return matches.filter(c => groups.some(g => getCriterionKey(g.wcagCriterion) === c));
                };

                // Annotate each step
                const annotated = nextSteps.map((step, idx) => ({
                  step, idx,
                  effort: detectEffort(step),
                  criteria: stepCriteria(step),
                }));

                // Group by phase
                const grouped = {};
                phaseOrder.forEach(p => { grouped[p] = []; });
                annotated.forEach(item => { grouped[item.effort.label].push(item); });

                // Progress
                const totalCount = nextSteps.length;
                const doneCount  = doneSteps.size;
                const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                const allDone    = doneCount === totalCount;

                // Copy as markdown checklist
                const copyChecklist = () => {
                  const md = nextSteps.map((s, i) => `- [${doneSteps.has(i) ? "x" : " "}] ${s}`).join("\n");
                  navigator.clipboard?.writeText(`## Accessibility Next Steps\n\n${md}`);
                };
                const handleCopyChecklist = () => {
                  copyChecklist();
                  setChecklistCopied(true);
                  setTimeout(() => setChecklistCopied(false), 2000);
                };

                // Phase icons (SVG paths)
                const phaseIcons = {
                  "Quick win":  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
                  "Moderate":   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
                  "Structural": <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="6" height="4" rx="1"/><rect x="9" y="3" width="13" height="4" rx="1"/><rect x="2" y="10" width="6" height="4" rx="1"/><rect x="9" y="10" width="13" height="4" rx="1"/><rect x="2" y="17" width="6" height="4" rx="1"/><rect x="9" y="17" width="13" height="4" rx="1"/></svg>,
                  "Testing":    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1-2-2H9zm0 0V9"/></svg>,
                };

                const activePhasesCount = phaseOrder.filter(p => grouped[p].length > 0).length;

                return (
                  <>
                    {/* ── Header ── */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <h2 className="next-steps-heading" style={{ margin: "0 0 2px" }}>Next Steps</h2>
                        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Remediation roadmap · {totalCount} actions across {activePhasesCount} phase{activePhasesCount > 1 ? "s" : ""}</p>
                      </div>
                      <button
                        onClick={handleCopyChecklist}
                        style={{ background: checklistCopied ? "#f0fdf4" : "#f8fafc", border: `1px solid ${checklistCopied ? "#86efac" : "#e2e8f0"}`, color: checklistCopied ? "#16a34a" : "#475569", fontSize: 12, fontWeight: 600, borderRadius: 8, padding: "7px 14px", cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, transition: "all 0.2s" }}
                      >
                        {checklistCopied
                          ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
                          : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy as checklist</>
                        }
                      </button>
                    </div>

                    {/* ── Segmented progress bar ── */}
                    <div style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: allDone ? "#16a34a" : "#334155" }}>
                          {allDone ? "All steps completed!" : `${doneCount} / ${totalCount} completed`}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: allDone ? "#16a34a" : "#0f172a" }}>{pct}%</span>
                      </div>
                      <div style={{ display: "flex", gap: 3, height: 7, borderRadius: 999, overflow: "hidden", marginBottom: 7 }}>
                        {phaseOrder.filter(p => grouped[p].length > 0).map(phase => {
                          const meta = phaseLabels[phase];
                          const phaseDone = grouped[phase].filter(i => doneSteps.has(i.idx)).length;
                          const phaseTotal = grouped[phase].length;
                          const phaseWidth = (phaseTotal / totalCount) * 100;
                          const phaseFill  = phaseTotal > 0 ? (phaseDone / phaseTotal) * 100 : 0;
                          return (
                            <div key={phase} style={{ width: `${phaseWidth}%`, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }} title={`${meta.title}: ${phaseDone}/${phaseTotal}`}>
                              <div style={{ height: "100%", width: `${phaseFill}%`, background: meta.color, borderRadius: 999, transition: "width 0.4s ease" }} />
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {phaseOrder.filter(p => grouped[p].length > 0).map(phase => {
                          const meta = phaseLabels[phase];
                          const phaseDone = grouped[phase].filter(i => doneSteps.has(i.idx)).length;
                          return (
                            <div key={phase} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 11, color: "#64748b" }}>{meta.title}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{phaseDone}/{grouped[phase].length}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Phase groups ── */}
                    {phaseOrder.filter(p => grouped[p].length > 0).map(phase => {
                      const meta = phaseLabels[phase];
                      const phaseDone = grouped[phase].filter(i => doneSteps.has(i.idx)).length;
                      const phaseComplete = phaseDone === grouped[phase].length;
                      return (
                        <div key={phase} style={{ marginBottom: 16 }}>

                          {/* Phase banner */}
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            background: `${meta.color}0d`,
                            border: `1px solid ${meta.border}`,
                            borderLeft: `3px solid ${meta.color}`,
                            borderRadius: "0 8px 8px 0",
                            padding: "7px 12px",
                            marginBottom: 8,
                          }}>
                            <span style={{ color: meta.color, flexShrink: 0, display: "flex" }}>{phaseIcons[phase]}</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: meta.color, flex: 1 }}>{meta.title}</span>
                            <span style={{ fontSize: 11, color: "#94a3b8", marginRight: 8 }}>{meta.sub}</span>
                            <span style={{
                              fontSize: 11, fontWeight: 700,
                              background: phaseComplete ? meta.color : "#fff",
                              color: phaseComplete ? "#fff" : meta.color,
                              border: `1.5px solid ${meta.color}`,
                              borderRadius: 999, padding: "2px 10px",
                              transition: "all 0.2s",
                            }}>
                              {phaseComplete ? "Done" : `${phaseDone}/${grouped[phase].length}`}
                            </span>
                          </div>

                          {/* Step cards */}
                          {grouped[phase].map(({ step, idx, criteria }) => {
                            const done = doneSteps.has(idx);
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleDoneStep(idx)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "9px 12px",
                                  borderRadius: 8,
                                  border: `1px solid ${done ? meta.border : "#f1f5f9"}`,
                                  borderLeft: `3px solid ${done ? meta.color : "#e2e8f0"}`,
                                  background: done ? `${meta.color}08` : "#fff",
                                  marginBottom: 5,
                                  cursor: "pointer",
                                  transition: "all 0.18s ease",
                                }}
                              >
                                {/* Checkbox circle */}
                                <div style={{
                                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                                  border: `2px solid ${done ? meta.color : "#cbd5e1"}`,
                                  background: done ? meta.color : "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "all 0.18s ease",
                                }}>
                                  {done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: done ? meta.color : "#94a3b8" }}>#{idx + 1}</span>
                                    {criteria.map(c => (
                                      <span key={c} style={{ fontSize: 10, fontWeight: 600, background: "#f0f9ff", color: "#0284c7", border: "1px solid #bae6fd", borderRadius: 999, padding: "0px 6px" }}>
                                        {c}
                                      </span>
                                    ))}
                                    <p style={{
                                      margin: 0, fontSize: 13, lineHeight: 1.5,
                                      color: done ? "#94a3b8" : "#334155",
                                      textDecoration: done ? "line-through" : "none",
                                      textDecorationColor: meta.color,
                                    }}>
                                      {step}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
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
