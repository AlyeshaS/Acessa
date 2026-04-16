import React, { useEffect, useRef, useState } from "react";
import SectionNav from "../components/SectionNav";
import AnalysisPlayer from "../components/AnalysisPlayer";
import ColorBlindSimulator from "../components/ColorBlindSimulator";
import ScreenshotWithHighlights from "../components/ScreenshotWithHighlights";
import { aiModifyHtml } from "../api/wcagAPI";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/App.css";
import "../styles/index.css";
import ViolationsFilterSection from "../components/ViolationsFilterSection";
import InfoTooltip from "../components/InfoTooltip";

// Extracts the WCAG criterion number from a string, like "1.4.3" from "1.4.3 Contrast"
function getCriterionKey(criterion) {
  if (!criterion) return null;
  const m = String(criterion).match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

// Main results page for the accessibility audit
function Complete() {
  // List of section IDs for navigation and scrollspy
  const sectionIds = [
    "website-preview",
    "accessibility-issues",
    "hci-report",
    "mobile-experience",
    "specialized-audits",
    "next-steps",
  ];
  // Refs for each section to track scroll position
  const sectionRefs = useRef(sectionIds.map(() => React.createRef()));
  // Tracks which section is currently active in the nav
  const [activeSection, setActiveSection] = useState(sectionIds[0]);
  // Controls whether the navigation sidebar is collapsed
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Keeps track of whether a scroll event was triggered by clicking the nav
  const scrollLockRef = useRef(false);
  // Updates the active section as the user scrolls the page
  useEffect(() => {
    const NAVBAR_HEIGHT = 64;
    const handleScroll = () => {
      if (scrollLockRef.current) return;
      let currentIdx = 0;
      let minDelta = Infinity;
      sectionRefs.current.forEach((ref, idx) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const delta = Math.abs(rect.top - NAVBAR_HEIGHT);
        if (rect.top - NAVBAR_HEIGHT <= 0 && delta < minDelta) {
          minDelta = delta;
          currentIdx = idx;
        }
      });
      // If user is near the bottom, always highlight the last section
      const bottomThreshold = 120;
      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - bottomThreshold
      ) {
        currentIdx = sectionIds.length - 1;
      }
      setActiveSection(sectionIds[currentIdx]);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionIds]);

  // Scrolls smoothly to a section when a nav link is clicked
  const handleNavClick = (id) => {
    const idx = sectionIds.indexOf(id);
    const ref = sectionRefs.current[idx];
    if (ref && ref.current) {
      const NAVBAR_HEIGHT = 64;
      const el = ref.current;
      const rect = el.getBoundingClientRect();
      const absoluteY = window.scrollY + rect.top;
      scrollLockRef.current = true;
      window.scrollTo({
        top: absoluteY - NAVBAR_HEIGHT,
        behavior: "smooth",
      });
      setActiveSection(sectionIds[idx]);
      setTimeout(() => {
        scrollLockRef.current = false;
      }, 500);
    }
  };
  // Optionally, add scrollMarginTop to each section for native CSS offset (if supported)
  const [mobileIframeError, setMobileIframeError] = useState(false);
  const [colorBlindError, setColorBlindError] = useState(null);
  useEffect(() => {
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
  // Tracks which screenshot is currently shown in the preview
  const [currentScreenshotIdx, setCurrentScreenshotIdx] = useState(0);
  // Tracks which marker or violation is selected in the current screenshot
  const [selectedMarkerIdx, setSelectedMarkerIdx] = useState(0);
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

  // Shows the animation player while this is true
  const [animating, setAnimating] = useState(false);
  const [previewResult, setPreviewResult] = useState(null); // { screenshot, steps }
  const [imageLoaded, setImageLoaded] = useState(false);
  const [pendingResult, setPendingResult] = useState(null);

  // Stores visual segments with images and comments
  const [segments, setSegments] = useState([]);
  const [pendingSegments, setPendingSegments] = useState([]);

  // Stores screenshots of violations for interactive feedback
  const [violationScreenshots, setViolationScreenshots] = useState([]);
  const [selectedViolation, setSelectedViolation] = useState(null);

  // Shows a fullscreen view of a screenshot and its issue panel
  const [lightbox, setLightbox] = useState(null);

  // Stores AI preview results and loading state for each violation
  const [aiModResults, setAiModResults] = useState({});
  const [aiModLoading, setAiModLoading] = useState({});

  // Tracks which accessibility categories are expanded in the UI
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

  // Stores the AbortController so we can cancel API calls when navigating back
  const abortRef = useRef(null);

  // When the list of violation screenshots changes, reset the screenshot index
  useEffect(() => {
    setCurrentScreenshotIdx(0);
    setSelectedMarkerIdx(0);
  }, [violationScreenshots]);

  // When the screenshot index changes, reset the selected marker index
  useEffect(() => {
    setSelectedMarkerIdx(0);
  }, [currentScreenshotIdx]);

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

        // Listen for live step events as Axe finds real violations
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
            if (typeof payload.pagesVisited === "number")
              setPagesVisited(payload.pagesVisited);
            if (typeof payload.violations === "number")
              setViolationsFound(payload.violations);
          } catch (err) {
            console.error("[Complete] axe parse", err);
          }
        });

        // "ai" status events are intentionally ignored here.
        evt.addEventListener("ai", () => {});

        evt.addEventListener("progress", (e) => {
          try {
            const payload = JSON.parse(e.data || "{}");
            if (typeof payload.pagesVisited === "number")
              setPagesVisited(payload.pagesVisited);
            if (typeof payload.violations === "number")
              setViolationsFound(payload.violations);
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
            // Hold the final analysis until the animation completes
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
            // Steps were already received as individual "step" events, so we skip
            // payload.steps to avoid overwriting the live animation in progress.
            if (payload.screenshot) {
              setPreviewResult((prev) => ({
                ...prev,
                screenshot: payload.screenshot,
              }));
              setAnimating(true);
            }
            // Loading remains true until AnalysisPlayer calls onComplete.
          } catch (err) {
            console.error("[Complete] result parse", err);
          }
        });

        evt.addEventListener("done", () => {
          // Loading stays true until the animation completes and consumes pendingResult.
          try {
            evt.close();
          } catch (err) {}

          // After HTML analysis stream completes, start visual segment capture.
          // This runs in parallel and will populate segments for display after animation.
          try {
            const visualStreamUrl = `http://localhost:4000/api/wcag-visual-stream?url=${encodeURIComponent(
              url,
            )}`;
            const visualEvt = new EventSource(visualStreamUrl);

            // "preview" events are skipped — visual preview already shown from HTML stream.
            visualEvt.addEventListener("preview", () => {});

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

  // Animates the loading progress bar while loading or animating
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

  // Animates the screenshot progress bar before the first image loads
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

  // When animation is done, apply any pending result that arrived early
  useEffect(() => {
    if (animationDone && pendingResult) {
      const payload = pendingResult;
      // Prefer finalUrl if present, else url
      setAnalysis({
        ...payload.aiAnalysis,
        url: payload.finalUrl || payload.url,
        html: payload.html,
        stylesheets: payload.stylesheets || [],
        // Optionally keep both for debugging
        originalUrl: payload.url,
        finalUrl: payload.finalUrl,
      });

      setPendingResult(null);
      if (pendingSegments.length > 0) {
        setSegments(pendingSegments);
      }
    }
  }, [animationDone, pendingResult, pendingSegments]);

  // When animation and analysis are both done, finish progress and stop loading
  useEffect(() => {
    if (animationDone && analysis && loading) {
      setProgress(100);
      const t = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [animationDone, analysis, loading]);

  // Checks mobile responsiveness using real scan data when analysis is available
  useEffect(() => {
    if (!analysis) return;

    setMobileResponsiveStatus("checking");

    // All checks are derived from real scan data — never hard-coded to pass.
    const html = typeof analysis.html === "string" ? analysis.html : "";
    const axeViolations = Array.isArray(analysis.violations)
      ? analysis.violations
      : [];
    const axeIds = new Set(
      axeViolations.map((v) => (v.id || "").toLowerCase()),
    );
    const groups = Array.isArray(
      analysis?.aiAnalysis?.groups ?? analysis?.groups,
    )
      ? (analysis?.aiAnalysis?.groups ?? analysis?.groups ?? [])
      : [];

    const details = [];

    // 1. Viewport meta tag
    const hasViewport =
      html.length > 0 ? /name=["']viewport["']/i.test(html) : null;
    if (hasViewport !== null) {
      details.push({
        key: "viewport",
        pass: hasViewport,
        label: "Viewport meta tag",
      });
    }

    // 2. Zoom not disabled
    const zoomDisabled =
      html.length > 0
        ? /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?![\d.])/i.test(html)
        : null;
    if (hasViewport && zoomDisabled !== null) {
      details.push({
        key: "zoom",
        pass: !zoomDisabled,
        label: "Pinch-to-zoom allowed",
      });
    }

    // 3. Responsive CSS: presence of media queries
    const hasMediaQueries =
      html.length > 0
        ? /@media\s+[^{]*(?:max-width|min-width|screen)/i.test(html)
        : null;
    if (hasMediaQueries !== null) {
      details.push({
        key: "mediaqueries",
        pass: hasMediaQueries,
        label: "CSS media queries present",
      });
    }

    // 4. No horizontal overflow / reflow violations
    const reflowFail =
      axeIds.has("reflow") ||
      axeIds.has("css-orientation-lock") ||
      groups.some((g) => {
        const k = getCriterionKey(g?.wcagCriterion);
        return k === "1.4.10";
      });
    if (axeViolations.length > 0 || html.length > 0) {
      details.push({
        key: "reflow",
        pass: !reflowFail,
        label: "Content reflows at 320px",
      });
    }

    // 5. Touch targets not too small
    const touchFail =
      axeIds.has("target-size") ||
      axeIds.has("scrollable-region-focusable") ||
      groups.some((g) => {
        const k = getCriterionKey(g?.wcagCriterion);
        return k === "2.5.5" || k === "2.5.8";
      });
    if (axeViolations.length > 0) {
      details.push({
        key: "touch",
        pass: !touchFail,
        label: "Touch targets adequate",
      });
    }

    // 6. Flexible layout: no fixed-width containers at >320px detected in inline styles
    const hasFixedWideLayout =
      html.length > 0
        ? /width\s*:\s*(?:[5-9]\d{2}|[1-9]\d{3,})px/i.test(html)
        : null;
    if (hasFixedWideLayout !== null) {
      details.push({
        key: "fixedwidth",
        pass: !hasFixedWideLayout,
        label: "No fixed-width containers",
      });
    }

    // 7. Font sizes not too small
    const tinyFontFail =
      html.length > 0
        ? /font-size\s*:\s*(?:[1-7]px|0\.\d+(?:em|rem))/i.test(html)
        : null;
    if (tinyFontFail !== null) {
      details.push({
        key: "fontsize",
        pass: !tinyFontFail,
        label: "Font sizes readable on mobile",
      });
    }

    // Determine overall status from checks that have real data
    if (details.length === 0) {
      setMobileResponsiveStatus("unknown");
      setMobileResponsiveDetails([]);
      return;
    }

    const passCount = details.filter((d) => d.pass).length;
    const ratio = passCount / details.length;

    if (ratio >= 0.8) setMobileResponsiveStatus("responsive");
    else if (ratio >= 0.5) setMobileResponsiveStatus("partial");
    else setMobileResponsiveStatus("not-responsive");

    setMobileResponsiveDetails(details);
  }, [analysis]);

  const handleBack = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    navigate("/");
  };

  // Use aiAnalysis if available, otherwise fall back to the root analysis object
  const ai = analysis?.aiAnalysis ?? analysis ?? {};

  const score = typeof ai.score === "number" ? ai.score : null;
  let groups = Array.isArray(ai.groups) ? ai.groups : [];

  const overallSummary = ai.overallSummary || "";
  const hciText = ai.hciSummary || overallSummary;

  // Category scores for each POUR principle
  const categoryScores = ai.categoryScores || {};
  const categoryExplanations = ai.categoryExplanations || {};
  const scoreBreakdown = ai.scoreBreakdown || {};

  // Controls whether the score details modal is shown
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

  // Stores conformance level scores for A, AA, AAA
  const levelScores = ai.levelScores || {};

  const levelAScore = typeof levelScores.A === "number" ? levelScores.A : null;
  const levelAAScore =
    typeof levelScores.AA === "number" ? levelScores.AA : null;
  const levelAAAScore =
    typeof levelScores.AAA === "number" ? levelScores.AAA : null;

  // Sorts groups by WCAG criterion number (like 1.4.3, 2.1.1)
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

  // Splits the HCI summary into readable paragraphs
  const hciParagraphs =
    typeof hciText === "string"
      ? hciText
          .split(/\n{2,}|\r?\n/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

  // Glossary of HCI and accessibility terms for tooltips and explanations
  const HCI_GLOSSARY = {
    WCAG: "Web Content Accessibility Guidelines — the international standard for web accessibility published by W3C.",
    ARIA: "Accessible Rich Internet Applications — HTML attributes that make content accessible to assistive technologies.",
    "screen reader":
      "Software that reads screen content aloud for blind or low-vision users (e.g. NVDA, JAWS, VoiceOver).",
    "alt text":
      "Alternative text — a description of an image read aloud by screen readers when the image cannot be seen.",
    "cognitive load":
      "The mental effort required to understand and use an interface. High load leads to errors and frustration.",
    landmark:
      "Named page regions (nav, main, aside, footer) that let screen reader users jump to sections quickly.",
    semantic:
      "Using HTML elements for their intended meaning — e.g. <button> for actions, <h1> for the main heading.",
    AODA: "Accessibility for Ontarians with Disabilities Act — Ontario law requiring accessible digital products and services.",
    "contrast ratio":
      "Brightness difference between text and background. WCAG AA requires at least 4.5:1 for normal text.",
    focus:
      "The keyboard cursor — the active element receiving keyboard input. Essential for non-mouse users.",
    "keyboard navigation":
      "Navigating a site using Tab, Enter, and arrow keys instead of a mouse.",
    "color blindness":
      "A visual impairment affecting color perception. Affects ~8% of men and ~0.5% of women.",
    usability:
      "How easily and efficiently a product can be used by its intended audience.",
    accessibility:
      "Designing products and services usable by people with a wide range of disabilities.",
    "skip navigation":
      "A hidden link at the top of the page that lets keyboard users jump directly to main content.",
    discoverability:
      "How easily users can find features and understand what actions are available.",
    learnability:
      "How quickly new users can learn to use the interface effectively.",
  };

  // Maps UI themes to related WCAG criteria for linking issues
  const THEME_CRITERIA = {
    "Visual Design": ["1.1.1", "1.4.1", "1.4.3", "1.4.11"],
    Interaction: ["2.1.1", "2.4.1", "2.4.4", "2.4.7", "2.5.3"],
    "Cognitive Load": ["2.4.4", "3.1.5", "3.3.1", "3.3.2"],
    Mobile: ["1.3.4", "1.4.4", "2.5.5"],
    Conclusion: [],
    Analysis: [],
  };

  // Returns the POUR principle for a given WCAG criterion
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

  // Expands or collapses an issue card in the UI
  const toggleExpanded = (key) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Counts the number of violations by severity
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

  // Filters and sorts the list of violations based on user settings
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
      if (sev === "high" || sev === "critical" || sev === "serious")
        acc.high += count;
      else if (sev === "medium" || sev === "moderate" || sev === "warning")
        acc.medium += count;
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

  const categories = [
    { key: "Perceivable", score: perceivableScore },
    { key: "Operable", score: operableScore },
    { key: "Understandable", score: understandableScore },
    { key: "Robust", score: robustScore },
  ];

  // Maps WCAG rule IDs to friendly, non-technical titles for users
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

  // Stores AI-generated friendly titles for issues
  const [aiFriendlyTitles, setAiFriendlyTitles] = useState({});
  const aiFriendlyTitlesPending = useRef(new Set());

  // Stores AI-generated details for mobile issues
  const [mobileIssueDetails, setMobileIssueDetails] = useState({});
  const mobileIssueDetailsPending = useRef(new Set());

  const getFriendlyTitle = (criterion, id, description) => {
    if (!criterion && !id) return "Accessibility Issue";
    const key = String(criterion || id).toLowerCase();
    // 1. Return AI-generated title if available
    if (aiFriendlyTitles[key]) return aiFriendlyTitles[key];
    // 2. Return hardcoded fallback if available
    if (friendlyTitles[key]) return friendlyTitles[key];
    // 3. Schedule an AI generation if not already pending
    if (!aiFriendlyTitlesPending.current.has(key)) {
      aiFriendlyTitlesPending.current.add(key);
      (async () => {
        try {
          const response = await fetch(
            "https://api.anthropic.com/v1/messages",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 30,
                messages: [
                  {
                    role: "user",
                    content: `Give a short, friendly 2-4 word title for this web accessibility issue. No technical jargon. Just the title, nothing else.\nWCAG criterion or rule ID: "${criterion || id}"\nDescription: "${description || ""}"`,
                  },
                ],
              }),
            },
          );
          const data = await response.json();
          const title = data?.content?.[0]?.text
            ?.trim()
            .replace(/^["']|["']$/g, "");
          if (title && title.length > 0 && title.length < 60) {
            setAiFriendlyTitles((prev) => ({ ...prev, [key]: title }));
          }
        } catch (err) {
          // silently ignore — fallback will show
        }
      })();
    }
    // 4. Return a readable fallback while AI generates
    return criterion || id || "Accessibility Issue";
  };

  // Fetches and caches AI-generated details for a mobile issue when a card is expanded
  const getMobileIssueDetail = (key, issueType, wcag, evidence, severity) => {
    if (mobileIssueDetails[key]) return; // already loaded
    if (mobileIssueDetailsPending.current.has(key)) return; // already in flight
    mobileIssueDetailsPending.current.add(key);

    (async () => {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 500,
            messages: [
              {
                role: "user",
                content: `You are an accessibility expert writing a mobile audit report for a web developer.

An automated scan of a website found this mobile accessibility issue:

Issue: ${issueType}
Severity: ${severity}
WCAG criterion: ${wcag || "N/A"}
Evidence from scan: ${evidence}

Write a JSON object with exactly these three fields:
- "whyItMatters": 2-3 sentences explaining the real impact on users on mobile devices. Be specific about what breaks and who is affected. Reference the actual evidence where relevant.
- "affectedUsers": a short comma-separated list of specific user groups impacted (e.g. "low-vision users, older users, screen reader users")
- "fix": 2-3 concrete, actionable sentences telling the developer exactly what to change. Be specific to this type of issue.

Respond ONLY with the raw JSON object. No markdown, no backticks, no preamble.`,
              },
            ],
          }),
        });
        const data = await response.json();
        const raw = data?.content?.[0]?.text?.trim();
        if (!raw) throw new Error("empty response");
        const parsed = JSON.parse(raw.replace(/^```json|```$/g, "").trim());
        if (parsed.whyItMatters && parsed.affectedUsers && parsed.fix) {
          setMobileIssueDetails((prev) => ({ ...prev, [key]: parsed }));
        }
      } catch (err) {
        // On any error, set a fallback so we don't re-attempt infinitely
        setMobileIssueDetails((prev) => ({
          ...prev,
          [key]: {
            whyItMatters:
              "This issue can affect mobile users' ability to access and use the site. See the WCAG criterion for full details.",
            affectedUsers: "Mobile users, users with disabilities",
            fix: "Review the flagged elements and apply the relevant WCAG success criterion to resolve the issue.",
          },
        }));
      }
    })();
  };

  // Tracks which "Next Steps" checklist items are marked done and if the list was copied
  const [doneSteps, setDoneSteps] = useState(new Set());
  const [checklistCopied, setChecklistCopied] = useState(false);
  const toggleDoneStep = (i) =>
    setDoneSteps((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  // Tracks which report sections are collapsed or expanded
  const [collapsedSections, setCollapsedSections] = useState({
    websitePreview: false,
    accessibilityIssues: true,
    hciReport: true,
    mobileExperience: true,
    specializedAudits: true,
    nextSteps: true,
  });

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  // Tracks which pie chart slice is hovered
  const [hoveredSlice, setHoveredSlice] = useState(null);
  // Tracks hover state for the HCI keyword donut chart
  const [donutHover, setDonutHover] = useState(null); // { label, percent, x, y }
  // Tracks whether the HCI report is expanded
  const [hciExpanded, setHciExpanded] = useState(false);
  // Tracks which preview mode is active (highlighted, side-by-side, lense)
  const [previewMode, setPreviewMode] = useState("highlighted");
  // Stores the AI-generated side-by-side image and loading state
  const [sideBySideAIImage, setSideBySideAIImage] = useState(null);
  const [sideBySideLoading, setSideBySideLoading] = useState(false);
  const [mobileIframeLoaded, setMobileIframeLoaded] = useState(false);
  const [mobilePreviewWidth, setMobilePreviewWidth] = useState(390);

  // Tracks mobile responsiveness status and details
  const [mobileResponsiveStatus, setMobileResponsiveStatus] = useState(null);
  const [mobileResponsiveDetails, setMobileResponsiveDetails] = useState([]);
  const [auditInfoOpen, setAuditInfoOpen] = useState(null); // key of open specialized-audit info popup
  const [sectionInfoOpen, setSectionInfoOpen] = useState(null); // key of open section info popup

  // Tracks which color blindness filter is active and its loading state
  const [colorBlindFilter, setColorBlindFilter] = useState(null); // null | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  const [colorBlindLoading, setColorBlindLoading] = useState(false);
  const [colorBlindImage, setColorBlindImage] = useState(null);

  // Returns a cache key for color blindness images
  function getColorBlindKey(url, type) {
    return `aiColorBlindCache_${url}_${type}`;
  }
  // Prompts for simulating different types of color blindness
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

  // Handles clicking a color blindness filter button
  const handleColorBlindClick = async (type) => {
    // Log filter usage server-side (non-blocking)
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
    // Toggle off if already active
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

  // Returns a cache key for AI-generated images
  function getAIImageKey(url, idx) {
    return `aiImageCache_${url}_${idx}`;
  }

  // When switching to side-by-side mode, fetch or use cached AI-generated image
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

  // Clears cached AI images when returning to the home page
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

  // Section info popup content for each report section
  const SECTION_INFO = {
    "website-preview": {
      iconStroke: "#0ea5e9",
      iconBg: "#f0f9ff",
      iconBorder: "#bae6fd",
      iconPath: (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M3 8h18" />
          <circle cx="7" cy="6" r=".5" />
          <circle cx="11" cy="6" r=".5" />
          <circle cx="15" cy="6" r=".5" />
        </>
      ),
      title: "Website Preview",
      what: "A live visual snapshot of your website captured at the time of the scan, with accessibility issues highlighted directly on the page.",
      why: "Seeing issues in context helps you understand exactly where and how they appear to real users, not just as abstract rule violations.",
      how: "Switch between Highlighted (issues overlaid on screenshot), Side-by-side (AI-generated fix preview), and Lense (color blindness simulation) using the toggle above the preview.",
      wcag: "Visual indicators map to specific WCAG 2.2 success criteria. Each highlighted element links to the relevant issue in the Accessibility Issues panel.",
    },
    "accessibility-issues": {
      iconStroke: "#dc2626",
      iconBg: "#fff0f0",
      iconBorder: "#fca5a5",
      iconPath: (
        <>
          <circle cx="12" cy="7" r="2.5" />
          <path d="M12 9.5v7.5" />
          <path d="M9 17h6" />
          <path d="M7 12h10" />
        </>
      ),
      title: "Accessibility Issues",
      what: "A full list of WCAG 2.2 violations detected by the automated scan, each categorized by severity and WCAG principle.",
      why: "Unresolved accessibility barriers prevent users with disabilities from accessing your content and may expose your organization to legal risk under laws like AODA and ADA.",
      how: "Issues are detected using Axe and enriched with AI analysis. Each item includes a severity level (critical, serious, moderate, minor), the affected WCAG criterion, a screenshot highlight, and a recommended fix.",
      wcag: "Covers all four POUR principles: Perceivable (1.x), Operable (2.x), Understandable (3.x), and Robust (4.x), across WCAG 2.2 Level A, AA, and AAA.",
    },
    "hci-report": {
      iconStroke: "#059669",
      iconBg: "#f0fdf9",
      iconBorder: "#6ee7b7",
      iconPath: (
        <>
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M7 7h10M7 12h10M7 17h6" />
        </>
      ),
      title: "HCI Report",
      what: "A human-computer interaction analysis written by AI, evaluating usability, cognitive load, visual design, and interaction patterns across the scanned page.",
      why: "WCAG compliance is necessary but not sufficient. A page can pass every automated check and still be confusing, hard to navigate, or frustrating to use, especially for users with cognitive or attention-related disabilities.",
      how: "The AI synthesizes all scan findings into a holistic narrative, identifying themes like poor discoverability, high cognitive load, or inconsistent interaction patterns. Scores are broken down by POUR principle.",
      wcag: "Draws on WCAG 3.x (Understandable) criteria such as 3.1 Readable, 3.2 Predictable, and 3.3 Input Assistance, as well as broader usability best practices.",
    },
    "mobile-experience": {
      iconStroke: "#0ea5e9",
      iconBg: "#f0f9ff",
      iconBorder: "#bae6fd",
      iconPath: (
        <>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </>
      ),
      title: "Mobile Experience",
      what: "An assessment of how accessible and usable your site is on mobile devices, covering layout, touch interaction, readability, and navigation.",
      why: "Over half of web traffic is mobile. Mobile users, especially those using screen readers or switch access on phones, face unique barriers that desktop scans alone will not catch.",
      how: "Checks include: viewport meta tag presence, pinch-to-zoom support, CSS media query usage, touch target sizing, fixed-width layout detection, and font size adequacy. Each check is derived from real scan data.",
      wcag: "WCAG 1.3.4 (Orientation), 1.4.4 (Resize Text), 1.4.10 (Reflow), 2.5.5 (Target Size), 2.5.8 (Target Size Minimum), and related mobile-specific success criteria.",
    },
    "next-steps": {
      iconStroke: "#d97706",
      iconBg: "#fffbeb",
      iconBorder: "#fde68a",
      iconPath: <polyline points="20 6 9 17 4 12" />,
      title: "Next Steps",
      what: "A prioritized, actionable remediation checklist generated from your scan results, organized by WCAG phase (Perceivable, Operable, Understandable, Robust).",
      why: "Knowing what is wrong is only half the battle. This checklist gives you a concrete starting point so your team can begin fixing issues immediately, in the right order.",
      how: "Each item is mapped to a specific WCAG criterion and phase. Check items off as you resolve them, progress is tracked visually. You can also copy the full checklist as Markdown for use in tickets or docs.",
      wcag: "Items are drawn from across all WCAG 2.2 success criteria relevant to your scan findings, prioritized by severity and user impact.",
    },
  };

  const sectionInfoData = sectionInfoOpen
    ? SECTION_INFO[sectionInfoOpen]
    : null;

  return (
    <div style={{ display: "flex" }}>
      {/* ── Section info modal (shared across all sections) ── */}
      {sectionInfoData && (
        <div
          onClick={() => setSectionInfoOpen(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: "28px 30px",
              maxWidth: 520,
              width: "100%",
              boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
              position: "relative",
            }}
          >
            {/* Close */}
            <button
              onClick={() => setSectionInfoOpen(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: "none",
                background: "#f1f5f9",
                color: "#64748b",
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: sectionInfoData.iconBg,
                  border: "1px solid " + sectionInfoData.iconBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={sectionInfoData.iconStroke}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {sectionInfoData.iconPath}
                </svg>
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {sectionInfoData.title}
                </h3>
              </div>
            </div>

            {/* Cards */}
            {[
              {
                label: "What it checks",
                text: sectionInfoData.what,
                color: "#0ea5e9",
                bg: "#f0f9ff",
                border: "#bae6fd",
              },
              {
                label: "Why it matters",
                text: sectionInfoData.why,
                color: "#d97706",
                bg: "#fffbeb",
                border: "#fde68a",
              },
              {
                label: "How it works",
                text: sectionInfoData.how,
                color: "#7c3aed",
                bg: "#f5f3ff",
                border: "#ddd6fe",
              },
              {
                label: "WCAG criteria",
                text: sectionInfoData.wcag,
                color: "#059669",
                bg: "#f0fdf4",
                border: "#bbf7d0",
              },
            ].map(({ label, text, color, bg, border }) => (
              <div
                key={label}
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 10,
                  padding: "11px 14px",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: "#374151",
                    lineHeight: 1.6,
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Left navbar: only show when not loading/animating and analysis is available */}
      {!loading && !animating && !error && analysis && (
        <SectionNav
          activeSection={activeSection}
          onNavClick={handleNavClick}
          collapsed={navCollapsed}
          setCollapsed={setNavCollapsed}
        />
      )}
      <div
        style={{
          marginLeft:
            !loading && !animating && !error && analysis
              ? navCollapsed
                ? 48
                : 220
              : 0,
          transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          width: "100%",
        }}
      >
        {/* Main content */}
        <div className="navbar">
          <button
            className="back-button"
            onClick={handleBack}
            style={{ color: "var(--slate)" }}
          >
            <svg
              width="55"
              height="55"
              viewBox="0 0 55 55"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M34.375 41.25L20.625 27.5L34.375 13.75"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Home Page
          </button>
          <h1>Analysis Report</h1>
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

              {/* BAR 1 — Fetching page snapshot (before image loads) */}
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

              {/* BAR 2 — Checking violations (during animation) + Finalizing AI report (after animation, waiting on analysis) */}
              {imageLoaded && (
                <>
                  <div
                    className="loading-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={
                      animationDone && analysis
                        ? 100
                        : animationDone
                          ? Math.min(
                              Math.max(progress, aiScreenshotProgress),
                              95,
                            )
                          : progress
                    }
                  >
                    <div
                      className="loading-bar-fill"
                      style={{
                        width: `${
                          animationDone && analysis
                            ? 100
                            : animationDone
                              ? Math.min(
                                  Math.max(progress, aiScreenshotProgress),
                                  95,
                                )
                              : progress
                        }%`,
                        transition: animationDone
                          ? "width 0.6s ease"
                          : undefined,
                      }}
                    />
                  </div>
                  <p className="loading-bar-text">
                    {animationDone && analysis ? (
                      `Report ready — loading results…`
                    ) : animationDone ? (
                      <>
                        {`Finalizing AI report… ${Math.min(Math.max(progress, aiScreenshotProgress), 95)}%`}
                        {violationScreenshots &&
                          violationScreenshots.length > 0 && (
                            <span
                              style={{
                                marginLeft: 8,
                                color: "#6366f1",
                                fontWeight: 700,
                                transition: "all 0.4s ease",
                              }}
                            >
                              {violationScreenshots.length} screenshot
                              {violationScreenshots.length !== 1
                                ? "s"
                                : ""}{" "}
                              captured
                            </span>
                          )}
                        {pagesVisited > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              color: "#0ea5e9",
                              fontWeight: 700,
                              transition: "all 0.4s ease",
                            }}
                          >
                            {pagesVisited} page{pagesVisited !== 1 ? "s" : ""}
                          </span>
                        )}
                        {violationsFound > 0 && (
                          <span
                            style={{
                              marginLeft: 8,
                              color: "#e11d48",
                              fontWeight: 700,
                              transition: "all 0.4s ease",
                            }}
                          >
                            {violationsFound} violation
                            {violationsFound !== 1 ? "s" : ""}
                          </span>
                        )}
                      </>
                    ) : (
                      `Checking violations… ${Math.round(progress)}%${
                        violationsFound > 0
                          ? ` • ${violationsFound} violation${violationsFound !== 1 ? "s" : ""}`
                          : ""
                      }`
                    )}
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
                      // Finish animating; apply pending result if available
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
                      if (pendingSegments.length > 0) {
                        setSegments(pendingSegments);
                      }
                    }}
                  />
                  {/* "Violation check complete" banner — shown after animation finishes, while AI report finalizes */}
                  {animationDone && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 14,
                        padding: "10px 18px",
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#15803d",
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Violation check complete — finalizing AI report…
                      {pagesVisited > 0 && (
                        <span
                          style={{
                            marginLeft: 10,
                            color: "#0ea5e9",
                            fontWeight: 800,
                          }}
                        >
                          {pagesVisited} page{pagesVisited !== 1 ? "s" : ""}
                        </span>
                      )}
                      {violationsFound > 0 && (
                        <span
                          style={{
                            marginLeft: 6,
                            color: "#e11d48",
                            fontWeight: 800,
                          }}
                        >
                          · {violationsFound} violation
                          {violationsFound !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!loading && !error && !animating && analysis && (
            <>
              {/* Website Preview Section (Collapsible) */}
              <section id="website-preview" ref={sectionRefs.current[0]}>
                <div
                  className="website-preview-panel"
                  style={{ borderTop: "3px solid #0ea5e9" }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "15px",
                      justifyContent: "center",
                      paddingBottom: 10,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="16" rx="3" />
                        <path d="M3 8h18" />
                        <circle cx="7" cy="6" r=".5" />
                        <circle cx="11" cy="6" r=".5" />
                        <circle cx="15" cy="6" r=".5" />
                      </svg>
                    </div>
                    <h2
                      className="website-preview-title"
                      style={{
                        margin: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Website Preview
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSectionInfoOpen("website-preview");
                        }}
                        title="Learn more about this section"
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "1.5px solid #94a3b8",
                          background: "transparent",
                          color: "#94a3b8",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          lineHeight: 1,
                          flexShrink: 0,
                          transition: "all 0.15s",
                          outline: "none",
                        }}
                      >
                        ?
                      </button>
                    </h2>
                    <button
                      aria-label={
                        collapsedSections.websitePreview
                          ? "Expand Website Preview"
                          : "Collapse Website Preview"
                      }
                      onClick={() => toggleSection("websitePreview")}
                      style={{
                        marginLeft: 12,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 18,
                        color: "#64748b",
                        transition: "transform 0.2s",
                        transform: collapsedSections.websitePreview
                          ? "rotate(-90deg)"
                          : "none",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                  <div
                    style={{
                      marginBottom: 12,
                      color: "#64748b",
                      fontSize: 15,
                      fontWeight: 500,
                    }}
                  >
                    {previewMode === "highlighted" && (
                      <>
                        Shows a visual snapshot of the analyzed website. This
                        section helps you see the page as it was scanned,
                        including any overlays or highlights for accessibility
                        issues.
                      </>
                    )}
                    {previewMode === "sidebyside" && (
                      <>
                        The feedback and screenshot are sent to OpenAI, which
                        generates an image showing what the issue would look
                        like if fixed.
                      </>
                    )}
                    {previewMode === "lense" && (
                      <>
                        Simulate how the website appears to people with
                        different types of color vision, including color
                        blindness.
                      </>
                    )}
                  </div>
                  {!collapsedSections.websitePreview && (
                    <>
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
                            <button
                              disabled={currentScreenshotIdx === 0}
                              onClick={() =>
                                setCurrentScreenshotIdx((i) =>
                                  Math.max(0, i - 1),
                                )
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "none",
                                border: "none",
                                boxShadow: "none",
                                borderRadius: 0,
                                padding: "0 8px",
                                cursor:
                                  currentScreenshotIdx === 0
                                    ? "default"
                                    : "pointer",
                                color:
                                  currentScreenshotIdx === 0
                                    ? "#cbd5e1"
                                    : "#475569",
                                transition: "color 0.18s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (currentScreenshotIdx !== 0)
                                  e.currentTarget.style.color = "#189b97";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color =
                                  currentScreenshotIdx === 0
                                    ? "#cbd5e1"
                                    : "#475569";
                              }}
                            >
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="15 18 9 12 15 6" />
                              </svg>
                            </button>

                            {/* Screenshot + highlights + panel */}
                            {(() => {
                              const currentVS =
                                violationScreenshots[currentScreenshotIdx];
                              // Deduplicate markers by bounding box and issueId
                              const rawMarkers = currentVS?.markers || [];
                              const seen = new Set();
                              const markers = rawMarkers.filter((m) => {
                                // Use bounding box and issueId as deduplication key
                                const bbs = (m.boundingBoxes || [])
                                  .map(
                                    (b) =>
                                      `${b.x},${b.y},${b.width},${b.height}`,
                                  )
                                  .join("|");
                                const key = `${m.issueId || ""}|${bbs}`;
                                if (seen.has(key)) return false;
                                seen.add(key);
                                return true;
                              });
                              const violations = currentVS?.violations || [];
                              // Map selected marker by issueId for robust mapping
                              const selectedMarker =
                                markers[selectedMarkerIdx] || markers[0];
                              // Find the violation with the same issueId as the selected marker
                              const selectedViolationData =
                                violations.find(
                                  (v) => v.issueId === selectedMarker?.issueId,
                                ) ||
                                violations[selectedMarkerIdx] ||
                                violations[0];
                              const selectedIssueId =
                                selectedMarker?.issueId ||
                                selectedViolationData?.issueId ||
                                "";
                              const markerCount = Math.max(
                                markers.length,
                                violations.length,
                                1,
                              );

                              return (
                                <>
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      position: "relative",
                                    }}
                                  >
                                    <ScreenshotWithHighlights
                                      screenshot={currentVS?.screenshot}
                                      markers={markers}
                                      selectedMarkerIdx={selectedMarkerIdx}
                                      onMarkerClick={(idx) =>
                                        setSelectedMarkerIdx(idx)
                                      }
                                    />
                                    {/* Marker selector dots — shown when there are multiple markers */}
                                    {markerCount > 1 && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          bottom: 8,
                                          left: "50%",
                                          transform: "translateX(-50%)",
                                          display: "flex",
                                          gap: 6,
                                          zIndex: 10,
                                        }}
                                      >
                                        {Array.from({
                                          length: markerCount,
                                        }).map((_, i) => (
                                          <button
                                            key={i}
                                            onClick={() =>
                                              setSelectedMarkerIdx(i)
                                            }
                                            title={`Issue ${i + 1}`}
                                            style={{
                                              width:
                                                i === selectedMarkerIdx
                                                  ? 20
                                                  : 8,
                                              height: 8,
                                              borderRadius: 999,
                                              border: "none",
                                              background:
                                                i === selectedMarkerIdx
                                                  ? "#ff4d4f"
                                                  : "rgba(255,77,79,0.35)",
                                              cursor: "pointer",
                                              padding: 0,
                                              transition: "all 0.2s ease",
                                            }}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Feedback panel */}
                                  <aside
                                    data-issueid={selectedIssueId}
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
                                      boxShadow:
                                        "0 2px 8px rgba(124,138,160,0.08)",
                                      overflowY: "auto",
                                      cursor: "pointer",
                                      transition:
                                        "box-shadow 0.2s, border 0.2s",
                                    }}
                                    onClick={() => {
                                      if (!selectedIssueId) return;
                                      const highlight = document.querySelector(
                                        `[data-issueid="${CSS.escape(selectedIssueId)}"]`,
                                      );
                                      if (highlight) {
                                        highlight.classList.add(
                                          "pulse-highlight-once",
                                        );
                                        setTimeout(() => {
                                          highlight.classList.remove(
                                            "pulse-highlight-once",
                                          );
                                        }, 1200);
                                        if (
                                          typeof highlight.scrollIntoView ===
                                          "function"
                                        ) {
                                          highlight.scrollIntoView({
                                            behavior: "smooth",
                                            block: "center",
                                          });
                                        }
                                      }
                                    }}
                                    onMouseEnter={() => {
                                      if (!selectedIssueId) return;
                                      const highlight = document.querySelector(
                                        `[data-issueid="${CSS.escape(selectedIssueId)}"]`,
                                      );
                                      if (highlight)
                                        highlight.classList.add(
                                          "highlight-hover",
                                        );
                                    }}
                                    onMouseLeave={() => {
                                      if (!selectedIssueId) return;
                                      const highlight = document.querySelector(
                                        `[data-issueid="${CSS.escape(selectedIssueId)}"]`,
                                      );
                                      if (highlight)
                                        highlight.classList.remove(
                                          "highlight-hover",
                                        );
                                    }}
                                  >
                                    {/* Issue counter when there are multiple markers */}
                                    {markerCount > 1 && (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          marginBottom: 10,
                                        }}
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMarkerIdx((i) =>
                                              Math.max(0, i - 1),
                                            );
                                          }}
                                          disabled={selectedMarkerIdx === 0}
                                          style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: "50%",
                                            border: "1px solid #e2e8f0",
                                            background:
                                              selectedMarkerIdx === 0
                                                ? "#f1f5f9"
                                                : "#fff",
                                            cursor:
                                              selectedMarkerIdx === 0
                                                ? "default"
                                                : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 0,
                                            color: "#94a3b8",
                                            fontSize: 12,
                                          }}
                                        >
                                          ‹
                                        </button>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: "#94a3b8",
                                          }}
                                        >
                                          Issue {selectedMarkerIdx + 1} of{" "}
                                          {markerCount}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMarkerIdx((i) =>
                                              Math.min(markerCount - 1, i + 1),
                                            );
                                          }}
                                          disabled={
                                            selectedMarkerIdx ===
                                            markerCount - 1
                                          }
                                          style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: "50%",
                                            border: "1px solid #e2e8f0",
                                            background:
                                              selectedMarkerIdx ===
                                              markerCount - 1
                                                ? "#f1f5f9"
                                                : "#fff",
                                            cursor:
                                              selectedMarkerIdx ===
                                              markerCount - 1
                                                ? "default"
                                                : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 0,
                                            color: "#94a3b8",
                                            fontSize: 12,
                                          }}
                                        >
                                          ›
                                        </button>
                                      </div>
                                    )}

                                    <div
                                      style={{
                                        fontWeight: 700,
                                        color: "#7c8da0",
                                        marginBottom: 8,
                                      }}
                                    >
                                      {selectedViolationData?.impact?.toUpperCase() ||
                                        "ISSUE"}
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
                                        selectedViolationData?.wcagCriterion,
                                        selectedViolationData?.id,
                                        selectedViolationData?.help ||
                                          selectedViolationData?.description,
                                      )}
                                    </h3>

                                    <p
                                      style={{
                                        color: "#475569",
                                        marginTop: 10,
                                        fontSize: 15,
                                      }}
                                    >
                                      {currentVS?.aiFeedback?.summary ||
                                        selectedViolationData?.help ||
                                        selectedViolationData?.description ||
                                        "This area shows a visual concern that may affect user understanding or ease of use."}
                                    </p>

                                    {currentVS?.aiFeedback?.recommendation && (
                                      <p
                                        style={{
                                          marginTop: 8,
                                          color: "#7c8da0",
                                        }}
                                      >
                                        <strong>Suggested fix:</strong>{" "}
                                        {currentVS.aiFeedback.recommendation}
                                      </p>
                                    )}
                                  </aside>
                                </>
                              );
                            })()}

                            <button
                              disabled={
                                currentScreenshotIdx ===
                                violationScreenshots.length - 1
                              }
                              onClick={() =>
                                setCurrentScreenshotIdx((i) =>
                                  Math.min(
                                    violationScreenshots.length - 1,
                                    i + 1,
                                  ),
                                )
                              }
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "none",
                                border: "none",
                                boxShadow: "none",
                                borderRadius: 0,
                                padding: "0 8px",
                                cursor:
                                  currentScreenshotIdx ===
                                  violationScreenshots.length - 1
                                    ? "default"
                                    : "pointer",
                                color:
                                  currentScreenshotIdx ===
                                  violationScreenshots.length - 1
                                    ? "#cbd5e1"
                                    : "#475569",
                                transition: "color 0.18s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (
                                  currentScreenshotIdx !==
                                  violationScreenshots.length - 1
                                )
                                  e.currentTarget.style.color = "#189b97";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color =
                                  currentScreenshotIdx ===
                                  violationScreenshots.length - 1
                                    ? "#cbd5e1"
                                    : "#475569";
                              }}
                            >
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
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
                              <ColorBlindSimulator
                                imageSrc={
                                  violationScreenshots[currentScreenshotIdx]
                                    ?.screenshot
                                }
                                type={colorBlindFilter || "original"}
                                style={{ maxWidth: "95%" }}
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
                              <button
                                className={
                                  "lense-filter-btn original" +
                                  (!colorBlindFilter ? " active" : "")
                                }
                                onClick={() => setColorBlindFilter(null)}
                                aria-pressed={!colorBlindFilter}
                              >
                                Original
                              </button>
                              <button
                                className={
                                  "lense-filter-btn protanopia" +
                                  (colorBlindFilter === "protanopia"
                                    ? " active"
                                    : "")
                                }
                                onClick={() =>
                                  setColorBlindFilter("protanopia")
                                }
                                aria-pressed={colorBlindFilter === "protanopia"}
                              >
                                Protanopia (red-blind)
                              </button>
                              <button
                                className={
                                  "lense-filter-btn deuteranopia" +
                                  (colorBlindFilter === "deuteranopia"
                                    ? " active"
                                    : "")
                                }
                                onClick={() =>
                                  setColorBlindFilter("deuteranopia")
                                }
                                aria-pressed={
                                  colorBlindFilter === "deuteranopia"
                                }
                              >
                                Deuteranopia (green-blind)
                              </button>
                              <button
                                className={
                                  "lense-filter-btn tritanopia" +
                                  (colorBlindFilter === "tritanopia"
                                    ? " active"
                                    : "")
                                }
                                onClick={() =>
                                  setColorBlindFilter("tritanopia")
                                }
                                aria-pressed={colorBlindFilter === "tritanopia"}
                              >
                                Tritanopia (blue-blind)
                              </button>
                              <button
                                className={
                                  "lense-filter-btn monochrome" +
                                  (colorBlindFilter === "monochrome"
                                    ? " active"
                                    : "")
                                }
                                onClick={() =>
                                  setColorBlindFilter("monochrome")
                                }
                                aria-pressed={colorBlindFilter === "monochrome"}
                                style={{
                                  background:
                                    colorBlindFilter === "monochrome"
                                      ? "#d1d5db"
                                      : "#f3f4f6",
                                  color: "#374151",
                                  fontWeight:
                                    colorBlindFilter === "monochrome"
                                      ? 700
                                      : 500,
                                  border: "none",
                                  boxShadow: "none",
                                  cursor: "pointer",
                                }}
                              >
                                Monochrome (grayscale)
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
                                  violationScreenshots[currentScreenshotIdx]
                                    ?.screenshot
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
                                    boxShadow:
                                      "0 2px 8px rgba(124,138,160,0.10)", // match original
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
                                      boxShadow:
                                        "0 2px 8px rgba(124,138,160,0.10)",
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
                                    boxShadow:
                                      "0 2px 8px rgba(124,138,160,0.10)",
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
                                  (colorBlindFilter === "protanopia"
                                    ? " active"
                                    : "")
                                }
                                onClick={() =>
                                  handleColorBlindClick("protanopia")
                                }
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
                                {colorBlindLoading &&
                                colorBlindFilter === "protanopia"
                                  ? "Loading…"
                                  : "Protanopia (red-blind)"}
                              </button>
                              <button
                                className={
                                  "lense-filter-btn deuteranopia" +
                                  (colorBlindFilter === "deuteranopia"
                                    ? " active"
                                    : "")
                                }
                                onClick={() =>
                                  handleColorBlindClick("deuteranopia")
                                }
                                aria-pressed={
                                  colorBlindFilter === "deuteranopia"
                                }
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
                                  (colorBlindFilter === "tritanopia"
                                    ? " active"
                                    : "")
                                }
                                onClick={() =>
                                  handleColorBlindClick("tritanopia")
                                }
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
                                {colorBlindLoading &&
                                colorBlindFilter === "tritanopia"
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
                                onClick={() =>
                                  handleColorBlindClick("achromatopsia")
                                }
                                aria-pressed={
                                  colorBlindFilter === "achromatopsia"
                                }
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
                    </>
                  )}
                </div>
              </section>

              {/* NEW: Two-Column Results Layout */}
              <section
                id="accessibility-issues"
                ref={sectionRefs.current[1]}
                style={{
                  borderTop: "3px solid #dc2626",
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  borderBottomLeftRadius: collapsedSections.accessibilityIssues
                    ? 12
                    : 0,
                  borderBottomRightRadius: collapsedSections.accessibilityIssues
                    ? 12
                    : 0,
                  overflow: "hidden",
                }}
              >
                <div
                  className="results-layout"
                  style={{
                    display: "flex",
                    gap: "24px",
                    minHeight: collapsedSections.accessibilityIssues
                      ? "auto"
                      : "600px",
                  }}
                >
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
                        borderBottom: collapsedSections.accessibilityIssues
                          ? "none"
                          : "1px solid #e5e7eb",
                      }}
                    >
                      <h2 className="issues-panel-heading">
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              background: "#fff0f0",
                              border: "1px solid #fca5a5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#dc2626"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="7" r="2.5" />
                              <path d="M12 9.5v7.5" />
                              <path d="M9 17h6" />
                              <path d="M7 12h10" />
                            </svg>
                          </div>
                          Accessibility Issues
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSectionInfoOpen("accessibility-issues");
                            }}
                            title="Learn more about this section"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              border: "1.5px solid #94a3b8",
                              background: "transparent",
                              color: "#94a3b8",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                              lineHeight: 1,
                              flexShrink: 0,
                              transition: "all 0.15s",
                              outline: "none",
                            }}
                          >
                            ?
                          </button>
                        </span>
                        <button
                          aria-label={
                            collapsedSections.accessibilityIssues
                              ? "Expand Accessibility Issues"
                              : "Collapse Accessibility Issues"
                          }
                          onClick={() => toggleSection("accessibilityIssues")}
                          style={{
                            marginLeft: 12,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#64748b",
                            transition: "transform 0.2s",
                            transform: collapsedSections.accessibilityIssues
                              ? "rotate(-90deg)"
                              : "none",
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </h2>
                      <div
                        style={{
                          marginBottom: 12,
                          color: "#64748b",
                          fontSize: 15,
                          fontWeight: 500,
                        }}
                      >
                        Lists all detected accessibility violations based on
                        WCAG 2.2. Each issue is categorized, described, and
                        visually highlighted on the screenshot. You’ll find
                        actionable recommendations and can filter or explore
                        issues by severity or type.
                      </div>
                    </div>
                    <div
                      style={{
                        display: collapsedSections.accessibilityIssues
                          ? "none"
                          : "block",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: collapsedSections.accessibilityIssues
                            ? "none"
                            : "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "16px",
                          padding: "20px 24px",
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
                            {
                              Object.values(groupedByPrinciple || {}).flat()
                                .length
                            }
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
                                description="Level A ensures the most basic accessibility requirements are met, allowing users to access content without major barriers.\n\nShort: Basic access"
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
                                description="Level AA builds on Level A by addressing more common usability issues, making content accessible to a wider range of users and is the standard most organizations are expected to meet.\n\nShort: Standard accessibility"
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
                                description="Level AAA represents the highest level of accessibility, aiming to make content usable for as many people as possible, though it is not always practical to achieve fully.\n\nShort: Highest level, most inclusive"
                              />
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Issue Breakdown Pie Chart and Legend */}
                      {(() => {
                        // Pie chart data and slices
                        const principleColors = {
                          Perceivable: "#3b82f6",
                          Operable: "#d97706",
                          Understandable: "#189b97",
                          Robust: "#7c3aed",
                        };
                        const principleCounts = {
                          Perceivable: 0,
                          Operable: 0,
                          Understandable: 0,
                          Robust: 0,
                        };
                        groups.forEach((g) => {
                          const p = getPrincipleFromCriterion(g.wcagCriterion);
                          if (p && principleCounts[p] !== undefined) {
                            principleCounts[p] += g.count || 1;
                          }
                        });
                        const pieData = Object.entries(principleCounts)
                          .filter(([, v]) => v > 0)
                          .map(([label, value]) => ({
                            label,
                            value,
                            color: principleColors[label],
                          }));
                        const pieTotal = pieData.reduce(
                          (s, d) => s + d.value,
                          0,
                        );
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
                            const path =
                              sweep >= 359.99
                                ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`
                                : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
                            angle += sweep;
                            return {
                              ...d,
                              path,
                              pct: Math.round((d.value / total) * 100),
                            };
                          });
                        };
                        const slices =
                          pieTotal > 0
                            ? buildPieSlices(pieData, pieTotal, 60, 60, 52)
                            : [];
                        return (
                          <>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#94a3b8",
                                textTransform: "uppercase",
                                letterSpacing: "0.6px",

                                padding: "20px 24px",
                              }}
                            >
                              Issue Breakdown
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 16,
                                alignItems: "center",
                                padding: "20px 24px",
                              }}
                            >
                              <svg
                                width="120"
                                height="120"
                                viewBox="0 0 120 120"
                                style={{ flexShrink: 0 }}
                              >
                                {slices.map((s) => (
                                  <path
                                    key={s.label}
                                    d={s.path}
                                    fill={s.color}
                                    opacity={
                                      hoveredSlice && hoveredSlice !== s.label
                                        ? 0.4
                                        : 1
                                    }
                                    style={{
                                      cursor: "pointer",
                                      transition: "opacity 0.15s ease",
                                    }}
                                    onMouseEnter={() =>
                                      setHoveredSlice(s.label)
                                    }
                                    onMouseLeave={() => setHoveredSlice(null)}
                                  />
                                ))}
                                {slices.map((s) => (
                                  <path
                                    key={s.label + "-sep"}
                                    d={s.path}
                                    fill="none"
                                    stroke="#fff"
                                    strokeWidth="2"
                                  />
                                ))}
                                <circle cx="60" cy="60" r="28" fill="#fff" />
                                <text
                                  x="60"
                                  y="57"
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                  fontSize="15"
                                  fontWeight="800"
                                  fill="#0f172a"
                                >
                                  {hoveredSlice
                                    ? principleCounts[hoveredSlice]
                                    : pieTotal}
                                </text>
                                <text
                                  x="60"
                                  y="70"
                                  textAnchor="middle"
                                  fontSize="8"
                                  fill="#94a3b8"
                                >
                                  {hoveredSlice
                                    ? hoveredSlice.split(" ")[0]
                                    : "total"}
                                </text>
                              </svg>
                              <div style={{ flex: 1 }}>
                                {pieData.map((s) => (
                                  <div
                                    key={s.label}
                                    onMouseEnter={() =>
                                      setHoveredSlice(s.label)
                                    }
                                    onMouseLeave={() => setHoveredSlice(null)}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 7,
                                      marginBottom: 6,
                                      cursor: "default",
                                      opacity:
                                        hoveredSlice && hoveredSlice !== s.label
                                          ? 0.4
                                          : 1,
                                      transition: "opacity 0.15s ease",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 9,
                                        height: 9,
                                        borderRadius: 2,
                                        background: s.color,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <span
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        color: "#334155",
                                        flex: 1,
                                      }}
                                    >
                                      {s.label}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11.5,
                                        fontWeight: 700,
                                        color: s.color,
                                      }}
                                    >
                                      {Math.round((s.value / pieTotal) * 100)}%
                                    </span>
                                  </div>
                                ))}
                                {Object.entries(principleCounts)
                                  .filter(([, v]) => v === 0)
                                  .map(([label]) => (
                                    <div
                                      key={label}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 7,
                                        marginBottom: 6,
                                        opacity: 0.3,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 9,
                                          height: 9,
                                          borderRadius: 2,
                                          background: "#e2e8f0",
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: 11.5,
                                          fontWeight: 600,
                                          color: "#94a3b8",
                                          flex: 1,
                                        }}
                                      >
                                        {label}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 11.5,
                                          fontWeight: 700,
                                          color: "#cbd5e1",
                                        }}
                                      >
                                        0%
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      <ViolationsFilterSection
                        violations={analysis?.violations || []}
                        groupedByPrinciple={groupedByPrinciple}
                        siteUrl={analysis?.url || url || ""}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* HCI Report */}
              <section id="hci-report" ref={sectionRefs.current[2]}>
                <div className="hci-section-wrap" style={{ display: "block" }}>
                  <div
                    className="hci-card"
                    style={{
                      borderTop: "3px solid #059669",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <h2 className="hci-card-heading" style={{ margin: 0 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 9,
                              background: "#f0fdf9",
                              border: "1px solid #6ee7b7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#059669"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="4" />
                              <path d="M7 7h10M7 12h10M7 17h6" />
                            </svg>
                          </div>
                          HCI Report
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSectionInfoOpen("hci-report");
                            }}
                            title="Learn more about this section"
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              border: "1.5px solid #94a3b8",
                              background: "transparent",
                              color: "#94a3b8",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                              lineHeight: 1,
                              flexShrink: 0,
                              transition: "all 0.15s",
                              outline: "none",
                            }}
                          >
                            ?
                          </button>
                        </span>
                        <button
                          aria-label={
                            collapsedSections.hciReport
                              ? "Expand HCI Report"
                              : "Collapse HCI Report"
                          }
                          onClick={() => toggleSection("hciReport")}
                          style={{
                            marginLeft: 12,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#64748b",
                            transition: "transform 0.2s",
                            transform: collapsedSections.hciReport
                              ? "rotate(-90deg)"
                              : "none",
                          }}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </h2>
                      <div
                        style={{
                          marginBottom: 12,
                          color: "#64748b",
                          fontSize: 15,
                          fontWeight: 500,
                        }}
                      >
                        Provides a Human-Computer Interaction (HCI) analysis of
                        the website. This section summarizes usability findings,
                        user experience insights, and best practices for
                        improving accessibility and interaction.
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {hciParagraphs.length > 0 && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              fontWeight: 500,
                            }}
                          >
                            ~
                            {Math.ceil(
                              hciParagraphs.join(" ").split(/\s+/).length / 200,
                            )}{" "}
                            min read
                          </span>
                        )}
                      </div>
                    </div>

                    {!collapsedSections.hciReport && (
                      <>
                        {hciParagraphs.length > 0 ? (
                          (() => {
                            // ── Theme detection ──────────────────────────────────────
                            const detectTheme = (text) => {
                              const t = text.toLowerCase();
                              if (
                                /mobile|responsive|touch|small screen|screen size/.test(
                                  t,
                                )
                              )
                                return {
                                  label: "Mobile",
                                  color: "#0ea5e9",
                                  bg: "#f0f9ff",
                                };
                              if (
                                /cognitive|mental load|burden|frustrat|comprehend|discoverability|learnability/.test(
                                  t,
                                )
                              )
                                return {
                                  label: "Cognitive Load",
                                  color: "#8b5cf6",
                                  bg: "#f5f3ff",
                                };
                              if (
                                /interact|click|hover|link|button|navigat|pattern|feedback/.test(
                                  t,
                                )
                              )
                                return {
                                  label: "Interaction",
                                  color: "#f59e0b",
                                  bg: "#fffbeb",
                                };
                              if (
                                /visual|design|layout|color|font|typograph|aesthetic|clean|modern|hierarchy/.test(
                                  t,
                                )
                              )
                                return {
                                  label: "Visual Design",
                                  color: "#189b97",
                                  bg: "#f0fdfa",
                                };
                              if (
                                /overall|conclusion|recommend|priorit|essential|key|addressing|strengthen|strengthens/.test(
                                  t,
                                )
                              )
                                return {
                                  label: "Conclusion",
                                  color: "#16a34a",
                                  bg: "#f0fdf4",
                                };
                              return {
                                label: "Analysis",
                                color: "#64748b",
                                bg: "#f8fafc",
                              };
                            };

                            // ── Paragraph-level sentiment ────────────────────────────
                            const detectSentiment = (text) => {
                              const neg = (
                                text.match(
                                  /however|lack|miss|barrier|difficult|impossible|violat|poor|fail|issue|problem|undermin|hinder|absent|without|cannot|can't|doesn.t|inadequate|insufficient|concern/gi,
                                ) || []
                              ).length;
                              const pos = (
                                text.match(
                                  /benefit|well|clear|good|strong|enhance|support|clean|modern|promote|responsive|legib|effective|appropriate|strength/gi,
                                ) || []
                              ).length;
                              if (neg > pos + 1)
                                return {
                                  label: "Issues identified",
                                  color: "#ef4444",
                                  bg: "#fef2f2",
                                };
                              if (pos > neg)
                                return {
                                  label: "Strengths noted",
                                  color: "#16a34a",
                                  bg: "#f0fdf4",
                                };
                              return {
                                label: "Mixed",
                                color: "#f59e0b",
                                bg: "#fffbeb",
                              };
                            };

                            // ── Sentence-level sentiment (for inline highlighting) ───
                            const sentenceSentiment = (s) => {
                              const neg = (
                                s.match(
                                  /however|lack|miss|barrier|difficult|impossible|violat|poor|fail|issue|problem|undermin|hinder|absent|without|cannot|can't|inadequate|insufficient/gi,
                                ) || []
                              ).length;
                              const pos = (
                                s.match(
                                  /benefit|well|clear|good|strong|enhance|support|clean|modern|promote|effective|appropriate|strength/gi,
                                ) || []
                              ).length;
                              if (neg > pos)
                                return {
                                  bg: "#fff5f5",
                                  borderBottom: "1px solid #fca5a5",
                                };
                              if (pos > neg)
                                return {
                                  bg: "#f0fdf4",
                                  borderBottom: "1px solid #86efac",
                                };
                              return {
                                bg: "transparent",
                                borderBottom: "none",
                              };
                            };

                            // ── Glossary: wrap known terms with underline + title ────
                            const applyGlossary = (text) => {
                              const sortedTerms = Object.keys(
                                HCI_GLOSSARY,
                              ).sort((a, b) => b.length - a.length);
                              const escaped = sortedTerms.map((t) =>
                                t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                              );
                              const re = new RegExp(
                                `\\b(${escaped.join("|")})\\b`,
                                "gi",
                              );
                              return text.replace(re, (match) => {
                                const def =
                                  HCI_GLOSSARY[
                                    Object.keys(HCI_GLOSSARY).find(
                                      (k) =>
                                        k.toLowerCase() === match.toLowerCase(),
                                    )
                                  ] || "";
                                return `<span title="${def.replace(/"/g, "&quot;")}" style="border-bottom:1.5px dotted #94a3b8;cursor:help;">${match}</span>`;
                              });
                            };

                            // ── Key takeaways ────────────────────────────────────────
                            const allText = hciParagraphs.join(" ");
                            const sentences = allText
                              .split(/(?<=[.!?])\s+/)
                              .map((s) => s.trim())
                              .filter((s) => s.length > 50);
                            const actionRe =
                              /should|must|ensure|critical|significant|barrier|priorit|recommend|essential|address|improv|fix|add|provid|implement|consider/i;
                            const takeaways = [
                              ...new Set(
                                sentences.filter((s) => actionRe.test(s)),
                              ),
                            ].slice(0, 5);

                            // ── Related issues count per theme ───────────────────────
                            const relatedIssues = (themeLabel) => {
                              const criteria = THEME_CRITERIA[themeLabel] || [];
                              if (criteria.length === 0) return [];
                              return groups.filter((g) => {
                                const k = getCriterionKey(g.wcagCriterion);
                                return k && criteria.includes(k);
                              });
                            };

                            const visibleParas = hciExpanded
                              ? hciParagraphs
                              : hciParagraphs.slice(0, 2);

                            return (
                              <>
                                {/* Key Takeaways */}
                                {takeaways.length > 0 && (
                                  <div
                                    style={{
                                      background: "#fffbeb",
                                      border: "1px solid #fde68a",
                                      borderRadius: 12,
                                      padding: "16px 20px",
                                      marginBottom: 20,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontWeight: 700,
                                        fontSize: 12,
                                        color: "#92400e",
                                        marginBottom: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.6px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                    >
                                      <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#92400e"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                      </svg>
                                      Key Takeaways
                                    </div>
                                    <ul
                                      style={{
                                        margin: 0,
                                        padding: "0 0 0 16px",
                                      }}
                                    >
                                      {takeaways.map((t, i) => (
                                        <li
                                          key={i}
                                          style={{
                                            fontSize: 13.5,
                                            color: "#78350f",
                                            lineHeight: 1.65,
                                            marginBottom:
                                              i < takeaways.length - 1 ? 8 : 0,
                                          }}
                                        >
                                          {t}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Glossary hint */}
                                <p
                                  style={{
                                    fontSize: 11.5,
                                    color: "#94a3b8",
                                    marginBottom: 14,
                                    fontStyle: "italic",
                                  }}
                                >
                                  Hover over underlined terms for definitions.
                                  Sentence backgrounds indicate identified
                                  issues (red) or strengths (green).
                                </p>

                                {/* Themed paragraph cards with sentence highlighting + related issues */}
                                {visibleParas.map((para, idx) => {
                                  const theme = detectTheme(para);
                                  const sentiment = detectSentiment(para);
                                  const related = relatedIssues(theme.label);
                                  // Split into sentences for inline highlighting
                                  const paraSegs = para
                                    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
                                    .map((s) => s.trim())
                                    .filter(Boolean);

                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        borderLeft: `3px solid ${theme.color}`,
                                        background: theme.bg,
                                        borderRadius: "0 12px 12px 0",
                                        padding: "14px 18px",
                                        marginBottom: 10,
                                      }}
                                    >
                                      {/* Card header */}
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: 10,
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.6px",
                                            color: theme.color,
                                          }}
                                        >
                                          {theme.label}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: sentiment.bg,
                                            color: sentiment.color,
                                            borderRadius: 999,
                                            padding: "2px 10px",
                                            border: `1px solid ${sentiment.color}33`,
                                          }}
                                        >
                                          {sentiment.label}
                                        </span>
                                      </div>

                                      {/* Sentence-level highlighting with glossary */}
                                      <p
                                        style={{
                                          margin: 0,
                                          fontSize: 14.5,
                                          color: "#334155",
                                          lineHeight: 1.8,
                                        }}
                                      >
                                        {paraSegs.map((seg, si) => {
                                          const ss = sentenceSentiment(seg);
                                          return (
                                            <span
                                              key={si}
                                              dangerouslySetInnerHTML={{
                                                __html:
                                                  applyGlossary(seg) + " ",
                                              }}
                                              style={{
                                                backgroundColor: ss.bg,
                                                borderRadius: 3,
                                                padding:
                                                  ss.bg !== "transparent"
                                                    ? "1px 2px"
                                                    : 0,
                                                borderBottom: ss.borderBottom,
                                              }}
                                            />
                                          );
                                        })}
                                      </p>

                                      {/* Related issues chips */}
                                      {related.length > 0 && (
                                        <div
                                          style={{
                                            marginTop: 12,
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 6,
                                            alignItems: "center",
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 11,
                                              color: "#94a3b8",
                                              fontWeight: 600,
                                            }}
                                          >
                                            {related.length} related issue
                                            {related.length > 1 ? "s" : ""}:
                                          </span>
                                          {related.map((g, ri) => (
                                            <span
                                              key={ri}
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                background: "#fff",
                                                border: `1px solid ${theme.color}55`,
                                                color: theme.color,
                                                borderRadius: 999,
                                                padding: "2px 9px",
                                                cursor: "default",
                                              }}
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
                                    onClick={() => setHciExpanded((e) => !e)}
                                    style={{
                                      background: "none",
                                      border: "1px solid #e2e8f0",
                                      color: "#64748b",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      borderRadius: 8,
                                      padding: "8px 16px",
                                      cursor: "pointer",
                                      marginTop: 6,
                                      width: "100%",
                                      boxShadow: "none",
                                    }}
                                  >
                                    {hciExpanded
                                      ? "Show less"
                                      : `Show full analysis (${hciParagraphs.length - 2} more section${hciParagraphs.length - 2 > 1 ? "s" : ""})`}
                                  </button>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <p
                            style={{
                              fontSize: "15px",
                              color: "#475569",
                              lineHeight: 1.7,
                            }}
                          >
                            {hciText}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Mobile Experience Section ── */}
              <section id="mobile-experience" ref={sectionRefs.current[3]}>
                {analysis &&
                  (() => {
                    const mobileData =
                      analysis.aiAnalysis?.mobileAccessibility ||
                      analysis.mobileAccessibility;

                    // Use AI-generated mobile data
                    const {
                      overallMobileScore,
                      mobileIssues = [],
                      mobileStrengths = [],
                      mobileNextSteps = [],
                      responsiveScore = 0,
                      touchScore = 0,
                      readabilityScore = 0,
                      navigationScore = 0,
                      mobileFormScore = 0,
                      contentAccessScore = 0,
                    } = mobileData;

                    const subScores = [
                      {
                        label: "Responsive",
                        score: responsiveScore,
                        icon: "⬡",
                        color: "#0ea5e9",
                      },
                      {
                        label: "Touch",
                        score: touchScore,
                        icon: "👆",
                        color: "#f59e0b",
                      },
                      {
                        label: "Readability",
                        score: readabilityScore,
                        icon: "Aa",
                        color: "#8b5cf6",
                      },
                      {
                        label: "Navigation",
                        score: navigationScore,
                        icon: "☰",
                        color: "#10b981",
                      },
                      {
                        label: "Forms",
                        score: mobileFormScore,
                        icon: "📝",
                        color: "#6366f1",
                      },
                      {
                        label: "Content",
                        score: contentAccessScore,
                        icon: "📄",
                        color: "#ec4899",
                      },
                    ];

                    const scoreColor = (s) =>
                      s >= 80 ? "#16a34a" : s >= 50 ? "#d97706" : "#dc2626";
                    const sevColor = (s) => {
                      const sl = (s || "").toLowerCase();
                      if (
                        sl === "high" ||
                        sl === "critical" ||
                        sl === "serious"
                      )
                        return "#dc2626";
                      if (
                        sl === "medium" ||
                        sl === "moderate" ||
                        sl === "warning"
                      )
                        return "#d97706";
                      return "#16a34a";
                    };

                    // ── Device size options (frameW/H = outer shell, pad = inner padding, screenH = content area height) ──
                    const DEVICE_SIZES = [
                      {
                        label: "SE",
                        sub: "iPhone SE",
                        w: 375,
                        frameW: 148,
                        frameH: 294,
                        pad: 5,
                        screenH: 250,
                        radius: 28,
                        island: false,
                        homeBar: false,
                        homeBtn: true,
                      },
                      {
                        label: "14",
                        sub: "iPhone 14/15",
                        w: 390,
                        frameW: 155,
                        frameH: 310,
                        pad: 6,
                        screenH: 268,
                        radius: 30,
                        island: true,
                        homeBar: true,
                        homeBtn: false,
                      },
                      {
                        label: "Pro Max",
                        sub: "iPhone Pro Max",
                        w: 430,
                        frameW: 168,
                        frameH: 326,
                        pad: 6,
                        screenH: 280,
                        radius: 32,
                        island: true,
                        homeBar: true,
                        homeBtn: false,
                      },
                      {
                        label: "Galaxy",
                        sub: "Samsung Galaxy S",
                        w: 360,
                        frameW: 145,
                        frameH: 302,
                        pad: 5,
                        screenH: 264,
                        radius: 24,
                        island: false,
                        homeBar: false,
                        homeBtn: false,
                      },
                      {
                        label: "Pixel",
                        sub: "Google Pixel 7",
                        w: 412,
                        frameW: 160,
                        frameH: 316,
                        pad: 6,
                        screenH: 272,
                        radius: 20,
                        island: false,
                        homeBar: true,
                        homeBtn: false,
                      },
                      {
                        label: "iPad",
                        sub: "iPad Mini",
                        w: 768,
                        frameW: 218,
                        frameH: 290,
                        pad: 8,
                        screenH: 248,
                        radius: 14,
                        island: false,
                        homeBar: true,
                        homeBtn: false,
                      },
                    ];

                    // ── Active device dimensions ──
                    const dev =
                      DEVICE_SIZES.find((d) => d.w === mobilePreviewWidth) ||
                      DEVICE_SIZES[1];
                    const screenW = dev.frameW - dev.pad * 2;
                    const scale = screenW / dev.w;
                    const iframeH = Math.round(dev.screenH / scale);

                    // ── Build srcdoc for mobile preview ──
                    // Using srcdoc bypasses X-Frame-Options/CSP headers that block live URL iframes.
                    // We also inject the correct viewport width so CSS media queries fire properly.
                    const mobileHtml = (() => {
                      const html =
                        typeof analysis?.html === "string" ? analysis.html : "";
                      if (!html) return null;
                      const viewportTag = `<meta name="viewport" content="width=${dev.w}, initial-scale=1, maximum-scale=5">`;
                      // Replace existing viewport meta if present, otherwise inject after <head>
                      if (/name=["']viewport["']/i.test(html)) {
                        return html.replace(
                          /<meta[^>]*name=["']viewport["'][^>]*>/i,
                          viewportTag,
                        );
                      }
                      if (/<head[^>]*>/i.test(html)) {
                        return html.replace(
                          /(<head[^>]*>)/i,
                          `$1${viewportTag}`,
                        );
                      }
                      return viewportTag + html;
                    })();

                    const sevBg = (s) => {
                      const sl = (s || "").toLowerCase();
                      if (
                        sl === "high" ||
                        sl === "critical" ||
                        sl === "serious"
                      )
                        return "#fef2f2";
                      if (
                        sl === "medium" ||
                        sl === "moderate" ||
                        sl === "warning"
                      )
                        return "#fffbeb";
                      return "#f0fdf4";
                    };

                    const sevBorder = (s) => {
                      const sl = (s || "").toLowerCase();
                      if (
                        sl === "high" ||
                        sl === "critical" ||
                        sl === "serious"
                      )
                        return "#fca5a5";
                      if (
                        sl === "medium" ||
                        sl === "moderate" ||
                        sl === "warning"
                      )
                        return "#fde68a";
                      return "#bbf7d0";
                    };

                    const highIssues = mobileIssues.filter(
                      (i) => i.severity === "High",
                    ).length;
                    const mediumIssues = mobileIssues.filter(
                      (i) => i.severity === "Medium",
                    ).length;
                    const lowIssues = mobileIssues.filter(
                      (i) => i.severity === "Low",
                    ).length;

                    return (
                      <div
                        style={{
                          background: "#fff",
                          borderRadius: 18,
                          padding: "24px 28px",
                          boxShadow: "var(--shadow)",
                          border: "1px solid var(--border-light)",

                          borderTop: "3px solid #0ea5e9",
                        }}
                      >
                        {/* Header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,

                            borderBottom: "1px solid #f1f5f9",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h2 style={{ margin: "0 0 2px", fontSize: 18 }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 10,
                                    background: "#f0f9ff",
                                    border: "1px solid #bae6fd",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#0ea5e9"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect
                                      x="5"
                                      y="2"
                                      width="14"
                                      height="20"
                                      rx="2"
                                    />
                                    <line x1="12" y1="18" x2="12.01" y2="18" />
                                  </svg>
                                </div>
                                Mobile Experience
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSectionInfoOpen("mobile-experience");
                                  }}
                                  title="Learn more about this section"
                                  style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    border: "1.5px solid #94a3b8",
                                    background: "transparent",
                                    color: "#94a3b8",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: 0,
                                    lineHeight: 1,
                                    flexShrink: 0,
                                    transition: "all 0.15s",
                                    outline: "none",
                                  }}
                                >
                                  ?
                                </button>
                              </span>
                              <button
                                aria-label={
                                  collapsedSections.mobileExperience
                                    ? "Expand Mobile Experience"
                                    : "Collapse Mobile Experience"
                                }
                                onClick={() =>
                                  toggleSection("mobileExperience")
                                }
                                style={{
                                  marginLeft: 12,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "#64748b",
                                  transition: "transform 0.2s",
                                  transform: collapsedSections.mobileExperience
                                    ? "rotate(-90deg)"
                                    : "none",
                                }}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            </h2>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "#94a3b8",
                              }}
                            >
                              AI-powered mobile accessibility analysis
                            </p>
                            <div
                              style={{
                                marginBottom: 12,
                                color: "#64748b",
                                fontSize: 15,
                                fontWeight: 500,
                              }}
                            >
                              Evaluates how the website performs on mobile
                              devices. This section highlights mobile-specific
                              accessibility issues, responsiveness, and user
                              experience for touch devices.
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div
                              style={{
                                fontSize: 36,
                                fontWeight: 900,
                                color: scoreColor(overallMobileScore),
                                lineHeight: 1,
                                letterSpacing: "-1px",
                              }}
                            >
                              {overallMobileScore}%
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                marginTop: 2,
                              }}
                            >
                              Mobile Score
                            </div>

                            {mobileIssues.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 4,
                                  justifyContent: "flex-end",
                                  marginTop: 6,
                                }}
                              >
                                {highIssues > 0 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#fef2f2",
                                      color: "#dc2626",
                                      border: "1px solid #fca5a5",
                                      borderRadius: 999,
                                      padding: "1px 7px",
                                    }}
                                  >
                                    {highIssues} High
                                  </span>
                                )}
                                {mediumIssues > 0 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#fffbeb",
                                      color: "#d97706",
                                      border: "1px solid #fde68a",
                                      borderRadius: 999,
                                      padding: "1px 7px",
                                    }}
                                  >
                                    {mediumIssues} Med
                                  </span>
                                )}
                                {lowIssues > 0 && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      background: "#f0fdf4",
                                      color: "#16a34a",
                                      border: "1px solid #bbf7d0",
                                      borderRadius: 999,
                                      padding: "1px 7px",
                                    }}
                                  >
                                    {lowIssues} Low
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {!collapsedSections.mobileExperience && (
                          <>
                            {/* Sub-score row */}
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                marginBottom: 24,
                                flexWrap: "wrap",
                              }}
                            >
                              {subScores.map((s) => (
                                <div
                                  key={s.label}
                                  style={{
                                    flex: "1 1 120px",
                                    background:
                                      s.score >= 80 ? "#f0fdf4" : "#f8fafc",
                                    border: `1px solid ${s.score >= 80 ? "#bbf7d0" : s.score >= 50 ? "#fde68a" : "#fca5a5"}`,
                                    borderTop: `3px solid ${scoreColor(s.score)}`,
                                    borderRadius: 10,
                                    padding: "10px 12px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "baseline",
                                      gap: 6,
                                      marginBottom: 4,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 22,
                                        fontWeight: 900,
                                        color: scoreColor(s.score),
                                        lineHeight: 1,
                                      }}
                                    >
                                      {s.score}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "#64748b",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.4px",
                                      }}
                                    >
                                      {s.label}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 10.5,
                                      color:
                                        s.score >= 80 ? "#16a34a" : "#64748b",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {s.score >= 80 ? "✓ Good" : "Needs work"}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 28,
                                alignItems: "flex-start",
                              }}
                            >
                              {/* ── Device mockup ── */}
                              <div
                                style={{
                                  flexShrink: 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 6,
                                  transition: "all 0.25s ease",
                                }}
                              >
                                <div
                                  style={{
                                    width: dev.frameW,
                                    height: dev.frameH,
                                    background:
                                      "linear-gradient(145deg,#1e293b 0%,#0f172a 100%)",
                                    borderRadius: dev.radius,
                                    padding: `10px ${dev.pad}px ${dev.homeBtn ? 14 : 8}px`,
                                    boxShadow:
                                      "0 24px 64px rgba(0,0,0,0.38), inset 0 0 0 1.5px rgba(255,255,255,0.11), 0 0 0 7px rgba(15,23,42,0.07)",
                                    position: "relative",
                                    transition: "all 0.25s ease",
                                  }}
                                >
                                  {/* Volume / side buttons — phones only */}
                                  {!dev.island || true ? (
                                    <>
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: -3,
                                          top: 68,
                                          width: 3,
                                          height: 22,
                                          background: "#334155",
                                          borderRadius: "2px 0 0 2px",
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: -3,
                                          top: 98,
                                          width: 3,
                                          height: 34,
                                          background: "#334155",
                                          borderRadius: "2px 0 0 2px",
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: -3,
                                          top: 138,
                                          width: 3,
                                          height: 34,
                                          background: "#334155",
                                          borderRadius: "2px 0 0 2px",
                                        }}
                                      />
                                      <div
                                        style={{
                                          position: "absolute",
                                          right: -3,
                                          top: 98,
                                          width: 3,
                                          height: 50,
                                          background: "#334155",
                                          borderRadius: "0 2px 2px 0",
                                        }}
                                      />
                                    </>
                                  ) : null}

                                  {/* Top chrome: Dynamic island or punch-hole dot */}
                                  {dev.island ? (
                                    <div
                                      style={{
                                        width: 44,
                                        height: 8,
                                        background: "#0f172a",
                                        borderRadius: 999,
                                        margin: "0 auto 6px",
                                        boxShadow:
                                          "inset 0 0 0 1px rgba(255,255,255,0.07)",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        height: 14,
                                        marginBottom: 4,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 8,
                                          height: 8,
                                          background: "#1e293b",
                                          borderRadius: "50%",
                                          boxShadow:
                                            "inset 0 0 0 1px rgba(255,255,255,0.1)",
                                        }}
                                      />
                                    </div>
                                  )}

                                  {/* Screen */}
                                  <div
                                    style={{
                                      borderRadius: Math.max(
                                        dev.radius - 10,
                                        8,
                                      ),
                                      overflow: "hidden",
                                      height: dev.screenH,
                                      background: "#0f172a",
                                      position: "relative",
                                    }}
                                  >
                                    {!mobileIframeError &&
                                    (mobileHtml || analysis.url) ? (
                                      <iframe
                                        key={mobilePreviewWidth}
                                        {...(mobileHtml
                                          ? { srcDoc: mobileHtml }
                                          : { src: analysis.url })}
                                        title="Responsive preview"
                                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                        onError={() =>
                                          setMobileIframeError(true)
                                        }
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
                                    ) : previewResult?.screenshot ||
                                      analysis.screenshot ? (
                                      <img
                                        src={
                                          previewResult?.screenshot ||
                                          analysis.screenshot
                                        }
                                        alt="Desktop screenshot (responsive preview unavailable)"
                                        style={{
                                          width: "100%",
                                          objectFit: "cover",
                                          objectPosition: "top center",
                                          display: "block",
                                        }}
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "#475569",
                                          fontSize: 11,
                                        }}
                                      >
                                        No preview
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        position: "absolute",
                                        inset: 0,
                                        background:
                                          "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)",
                                        pointerEvents: "none",
                                      }}
                                    />
                                  </div>

                                  {/* Bottom chrome: home bar or home button */}
                                  {dev.homeBar && (
                                    <div
                                      style={{
                                        width: 44,
                                        height: 3,
                                        background: "rgba(255,255,255,0.22)",
                                        borderRadius: 999,
                                        margin: "6px auto 0",
                                      }}
                                    />
                                  )}
                                  {dev.homeBtn && (
                                    <div
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        border:
                                          "2px solid rgba(255,255,255,0.18)",
                                        margin: "6px auto 0",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 12,
                                          height: 12,
                                          borderRadius: "50%",
                                          background: "rgba(255,255,255,0.08)",
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Device label */}
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    color: "#94a3b8",
                                    letterSpacing: "0.3px",
                                    textAlign: "center",
                                  }}
                                >
                                  {!mobileIframeError &&
                                  (mobileHtml || analysis.url)
                                    ? `${dev.sub} · ${dev.w}px`
                                    : "Desktop screenshot"}
                                </span>
                                {(mobileIframeError ||
                                  (!mobileHtml && !analysis.url)) && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: "#cbd5e1",
                                      textAlign: "center",
                                      maxWidth: dev.frameW,
                                    }}
                                  >
                                    Preview unavailable
                                  </span>
                                )}

                                {/* Device size chips */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 4,
                                    justifyContent: "center",
                                    marginTop: 4,
                                    maxWidth: Math.max(dev.frameW, 200),
                                  }}
                                >
                                  {DEVICE_SIZES.map((d) => {
                                    const active = mobilePreviewWidth === d.w;
                                    return (
                                      <button
                                        key={d.w}
                                        title={`${d.sub} (${d.w}px)`}
                                        onClick={() => {
                                          setMobilePreviewWidth(d.w);
                                          setMobileIframeError(false);
                                        }}
                                        style={{
                                          padding: "3px 8px",
                                          fontSize: 10,
                                          fontWeight: active ? 700 : 500,
                                          borderRadius: 999,
                                          border: `1px solid ${active ? "#0ea5e9" : "#e2e8f0"}`,
                                          background: active
                                            ? "#e0f2fe"
                                            : "#f8fafc",
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

                              {/* Right: AI-powered mobile issues */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {/* Mobile Strengths */}
                                {mobileStrengths.length > 0 && (
                                  <>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#16a34a",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        marginBottom: 10,
                                      }}
                                    >
                                      Mobile Strengths ({mobileStrengths.length}
                                      )
                                    </div>
                                    {mobileStrengths.map((strength, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 6,
                                          padding: "7px 10px",
                                          background: "#f0fdf4",
                                          border: "1px solid #bbf7d0",
                                          borderLeft: "3px solid #16a34a",
                                          borderRadius: 8,
                                          marginBottom: 5,
                                        }}
                                      >
                                        <svg
                                          width="11"
                                          height="11"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#16a34a"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{
                                            flexShrink: 0,
                                            marginTop: 2,
                                          }}
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <p
                                          style={{
                                            margin: 0,
                                            fontSize: 11.5,
                                            color: "#15803d",
                                            lineHeight: 1.5,
                                          }}
                                        >
                                          {strength}
                                        </p>
                                      </div>
                                    ))}
                                  </>
                                )}

                                {/* Mobile Issues */}
                                {mobileIssues.length > 0 && (
                                  <>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#94a3b8",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        margin: "18px 0 10px",
                                      }}
                                    >
                                      Mobile Issues ({mobileIssues.length})
                                    </div>
                                    {mobileIssues.map((issue, i) => {
                                      const cardKey = `mobile-issue-${i}`;
                                      const isOpen = !!expandedItems[cardKey];

                                      return (
                                        <div
                                          key={i}
                                          style={{
                                            borderRadius: 10,
                                            background: sevBg(issue.severity),
                                            border: `1px solid ${sevBorder(issue.severity)}`,
                                            borderLeft: `3px solid ${sevColor(issue.severity)}`,
                                            marginBottom: 8,
                                            overflow: "hidden",
                                          }}
                                        >
                                          {/* Header */}
                                          <button
                                            onClick={() =>
                                              toggleExpanded(cardKey)
                                            }
                                            style={{
                                              width: "100%",
                                              background: "transparent",
                                              border: "none",
                                              padding: "11px 14px",
                                              cursor: "pointer",
                                              display: "flex",
                                              alignItems: "flex-start",
                                              gap: 8,
                                              textAlign: "left",
                                            }}
                                          >
                                            <div
                                              style={{ flex: 1, minWidth: 0 }}
                                            >
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 8,
                                                  marginBottom: 4,
                                                  flexWrap: "wrap",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 12.5,
                                                    fontWeight: 700,
                                                    color: "#0f172a",
                                                  }}
                                                >
                                                  {issue.category
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    issue.category.slice(
                                                      1,
                                                    )}{" "}
                                                  Issue
                                                </span>
                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: sevColor(
                                                      issue.severity,
                                                    ),
                                                    background: "#fff",
                                                    border: `1px solid ${sevBorder(issue.severity)}`,
                                                    borderRadius: 999,
                                                    padding: "1px 7px",
                                                    textTransform: "uppercase",
                                                    flexShrink: 0,
                                                  }}
                                                >
                                                  {issue.severity}
                                                </span>
                                                {issue.wcagCriterion && (
                                                  <span
                                                    style={{
                                                      fontSize: 10,
                                                      fontWeight: 600,
                                                      color: "#7c8da0",
                                                      background: "#f1f5f9",
                                                      border:
                                                        "1px solid #e2e8f0",
                                                      borderRadius: 999,
                                                      padding: "1px 7px",
                                                      flexShrink: 0,
                                                    }}
                                                  >
                                                    WCAG {issue.wcagCriterion}
                                                  </span>
                                                )}
                                              </div>
                                              <p
                                                style={{
                                                  margin: 0,
                                                  fontSize: 12,
                                                  color: "#475569",
                                                  lineHeight: 1.5,
                                                }}
                                              >
                                                {issue.problem}
                                              </p>
                                            </div>
                                            <svg
                                              width="14"
                                              height="14"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="#94a3b8"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              style={{
                                                flexShrink: 0,
                                                marginTop: 2,
                                                transition: "transform 0.2s",
                                                transform: isOpen
                                                  ? "rotate(180deg)"
                                                  : "rotate(0deg)",
                                              }}
                                            >
                                              <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                          </button>

                                          {/* Expanded details */}
                                          {isOpen && (
                                            <div
                                              style={{
                                                padding: "0 14px 14px 14px",
                                                borderTop: `1px solid ${sevBorder(issue.severity)}`,
                                              }}
                                            >
                                              {/* Evidence */}
                                              <div
                                                style={{
                                                  marginTop: 10,
                                                  padding: "6px 10px",
                                                  background:
                                                    "rgba(0,0,0,0.04)",
                                                  borderRadius: 6,
                                                  fontSize: 11,
                                                  color: "#64748b",
                                                  fontFamily: "monospace",
                                                  wordBreak: "break-all",
                                                }}
                                              >
                                                🔍 {issue.evidence}
                                              </div>

                                              {/* Affected users */}
                                              <div style={{ marginTop: 10 }}>
                                                <div
                                                  style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    color: "#64748b",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.4px",
                                                    marginBottom: 4,
                                                  }}
                                                >
                                                  Affected users
                                                </div>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                  }}
                                                >
                                                  <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="#7c8da0"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  >
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                    <circle
                                                      cx="9"
                                                      cy="7"
                                                      r="4"
                                                    />
                                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                  </svg>
                                                  <span
                                                    style={{
                                                      fontSize: 12,
                                                      color: "#475569",
                                                    }}
                                                  >
                                                    {issue.affectedUsers}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Recommendation */}
                                              <div
                                                style={{
                                                  marginTop: 10,
                                                  padding: "10px 12px",
                                                  background: "#f0fdf4",
                                                  border: "1px solid #bbf7d0",
                                                  borderRadius: 8,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    fontSize: 10.5,
                                                    fontWeight: 700,
                                                    color: "#15803d",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.4px",
                                                    marginBottom: 4,
                                                  }}
                                                >
                                                  Recommended fix
                                                </div>
                                                <p
                                                  style={{
                                                    margin: 0,
                                                    fontSize: 12,
                                                    color: "#166534",
                                                    lineHeight: 1.6,
                                                  }}
                                                >
                                                  {issue.recommendation}
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </>
                                )}

                                {/* Mobile Next Steps */}
                                {mobileNextSteps.length > 0 && (
                                  <>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "#94a3b8",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        margin: "18px 0 10px",
                                      }}
                                    >
                                      Mobile Next Steps
                                    </div>
                                    {mobileNextSteps.map((step, i) => (
                                      <label
                                        key={i}
                                        style={{
                                          display: "flex",
                                          gap: 8,
                                          alignItems: "flex-start",
                                          padding: "8px 12px",
                                          background: "#fffbeb",
                                          border: "1px solid #fde68a",
                                          borderLeft: "3px solid #f59e0b",
                                          borderRadius: 8,
                                          marginBottom: 6,
                                          cursor: "pointer",
                                          userSelect: "none",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          style={{
                                            accentColor: "#f59e0b",
                                            marginTop: 2,
                                            marginRight: 4,
                                            width: 16,
                                            height: 16,
                                            flexShrink: 0,
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontSize: 12,
                                            color: "#92400e",
                                            lineHeight: 1.55,
                                          }}
                                        >
                                          {step}
                                        </span>
                                      </label>
                                    ))}
                                  </>
                                )}

                                {/* No issues case */}
                                {mobileIssues.length === 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "12px 14px",
                                      background: "#f0fdf4",
                                      border: "1px solid #bbf7d0",
                                      borderRadius: 10,
                                      marginBottom: 16,
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#16a34a"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span
                                      style={{
                                        fontSize: 12.5,
                                        fontWeight: 600,
                                        color: "#15803d",
                                      }}
                                    >
                                      No mobile accessibility issues detected by
                                      AI analysis.
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
              </section>

              {/* ── Specialized Audits Section ── */}
              <section id="specialized-audits" ref={sectionRefs.current[4]}>
                {analysis &&
                  (() => {
                    const sevColor = (s) => {
                      const sl = (s || "").toLowerCase();
                      if (
                        sl === "high" ||
                        sl === "critical" ||
                        sl === "serious"
                      )
                        return "#dc2626";
                      if (
                        sl === "medium" ||
                        sl === "moderate" ||
                        sl === "warning"
                      )
                        return "#d97706";
                      return "#16a34a";
                    };

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
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuditInfoOpen((prev) =>
                            prev === infoKey ? null : infoKey,
                          );
                        }}
                        title="Learn more about this section"
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "1.5px solid #94a3b8",
                          background: "transparent",
                          color: "#94a3b8",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          lineHeight: 1,
                          flexShrink: 0,
                          transition: "all 0.15s",
                          ...(auditInfoOpen === infoKey
                            ? {
                                borderColor: "#7c3aed",
                                color: "#7c3aed",
                                background: "#f5f3ff",
                              }
                            : {}),
                        }}
                      >
                        ?
                      </button>
                    );

                    // Extract sentences matching a regex from a text string
                    const sentences = (text) =>
                      (text || "")
                        .match(/[^.!?]+[.!?]+/g)
                        ?.map((s) => s.trim())
                        .filter(Boolean) || [];
                    const aiTexts = [
                      ai.overallSummary || "",
                      ai.hciSummary || "",
                      ...(ai.nextSteps || []),
                    ];
                    const extractFromAll = (re) => [
                      ...new Set(
                        aiTexts.flatMap((t) =>
                          sentences(t).filter((s) => re.test(s)),
                        ),
                      ),
                    ];

                    // ── 1. Form Accessibility ──
                    const FORM_CRIT = new Set([
                      "1.3.1",
                      "1.3.5",
                      "3.3.1",
                      "3.3.2",
                      "3.3.3",
                      "3.3.4",
                      "4.1.3",
                    ]);
                    const formRe =
                      /\bform\b|\binput\b|\blabel\b|\bfield\b|\bsubmit\b|error.{0,20}message|validation|autocomplete|placeholder|\brequired\b/i;
                    const formGroups = groups.filter((g) => {
                      const k = getCriterionKey(g.wcagCriterion);
                      return (
                        (k && FORM_CRIT.has(k)) ||
                        formRe.test(g.problem || "") ||
                        formRe.test(g.wcagCriterion || "")
                      );
                    });
                    const formInsights = extractFromAll(formRe).slice(0, 3);

                    // ── 2. ARIA Usage ──
                    const ARIA_CRIT = new Set(["4.1.1", "4.1.2"]);
                    const ariaRe =
                      /\baria[-_\s]|\brole\s*=|landmark|aria.label|aria.labelledby|aria.describedby|aria.hidden|accessible.name|assistive.tech/i;
                    const ariaGroups = groups.filter((g) => {
                      const k = getCriterionKey(g.wcagCriterion);
                      return (
                        (k && ARIA_CRIT.has(k)) ||
                        ariaRe.test(g.problem || "") ||
                        ariaRe.test(g.wcagCriterion || "")
                      );
                    });
                    const ariaInsights = extractFromAll(ariaRe).slice(0, 3);

                    // ── 3. Animation / Motion ──
                    const MOTION_CRIT = new Set([
                      "2.2.2",
                      "2.3.1",
                      "2.3.2",
                      "2.3.3",
                    ]);
                    const motionRe =
                      /animation|motion|carousel|autoplay|auto.play|\btransition\b|parallax|flicker|blink|reduced.motion|vestibular|moving.content|scrolling.effect/i;
                    const motionGroups = groups.filter((g) => {
                      const k = getCriterionKey(g.wcagCriterion);
                      return (
                        (k && MOTION_CRIT.has(k)) ||
                        motionRe.test(g.problem || "") ||
                        motionRe.test(g.wcagCriterion || "")
                      );
                    });
                    const motionInsights = extractFromAll(motionRe).slice(0, 3);

                    // ── 4. Language Attributes ──
                    const LANG_CRIT = new Set(["3.1.1", "3.1.2"]);
                    const langRe =
                      /\blang\b|language.{0,15}attr|html.{0,10}lang|xml.lang|lang.{0,15}attribute|\blocale\b/i;
                    const langGroups = groups.filter((g) => {
                      const k = getCriterionKey(g.wcagCriterion);
                      return (
                        (k && LANG_CRIT.has(k)) ||
                        langRe.test(g.problem || "") ||
                        langRe.test(g.wcagCriterion || "")
                      );
                    });
                    const langInsights = extractFromAll(langRe).slice(0, 3);
                    // Check html lang from raw HTML if available
                    const hasLangAttr =
                      analysis.html && analysis.html.length > 0
                        ? /<html[^>]+lang\s*=/i.test(analysis.html)
                        : null;

                    // ── 10. Cognitive Accessibility Score ──
                    const COG_CRIT = new Set([
                      "1.4.12",
                      "2.4.2",
                      "2.4.6",
                      "3.1.1",
                      "3.1.2",
                      "3.1.3",
                      "3.1.4",
                      "3.1.5",
                      "3.2.1",
                      "3.2.2",
                      "3.2.3",
                      "3.2.4",
                      "3.3.1",
                      "3.3.2",
                      "3.3.3",
                      "3.3.4",
                    ]);
                    const cogRe =
                      /cognitive|reading.level|comprehension|plain.language|readability|consistent|predictable|jargon|complex\s|instruction|error.prevention|memory|attention|\bclear\b|confus/i;
                    const cogGroups = groups.filter((g) => {
                      const k = getCriterionKey(g.wcagCriterion);
                      return (
                        (k && COG_CRIT.has(k)) || cogRe.test(g.problem || "")
                      );
                    });
                    const cogInsights = extractFromAll(cogRe).slice(0, 4);
                    const cogNegRe =
                      /difficult|unclear|confus|hard\s|poor|lack|missing|inconsistent|complex\s|no\s+clear|jargon/i;
                    const cogNegHits = cogInsights.filter((s) =>
                      cogNegRe.test(s),
                    ).length;
                    const cogScore = Math.max(
                      10,
                      Math.min(
                        100,
                        95 - cogGroups.length * 12 - cogNegHits * 8,
                      ),
                    );
                    const cogColor =
                      cogScore >= 75
                        ? "#16a34a"
                        : cogScore >= 50
                          ? "#d97706"
                          : "#dc2626";

                    const COG_CHECKS = [
                      { label: "Consistent navigation (3.2.3)", key: "3.2.3" },
                      {
                        label: "Consistent identification (3.2.4)",
                        key: "3.2.4",
                      },
                      { label: "Labels/instructions (3.3.2)", key: "3.3.2" },
                      { label: "Error prevention (3.3.4)", key: "3.3.4" },
                      { label: "Page title (2.4.2)", key: "2.4.2" },
                      { label: "Headings/labels (2.4.6)", key: "2.4.6" },
                    ].map((c) => ({
                      ...c,
                      pass: !cogGroups.some(
                        (g) => getCriterionKey(g.wcagCriterion) === c.key,
                      ),
                    }));

                    // ── Shared audit card renderer ──
                    const AuditCard = ({
                      icon,
                      iconBg,
                      iconStroke,
                      title,
                      subtitle,
                      issueGroups,
                      insights,
                      extraChecks,
                      infoKey,
                    }) => {
                      const hasIssues = issueGroups.length > 0;
                      const hasData =
                        hasIssues ||
                        insights.length > 0 ||
                        (extraChecks && extraChecks.some((c) => !c.pass));
                      return (
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 14,
                            padding: "18px 20px",
                            border: `1px solid ${hasIssues ? "#fca5a5" : "#e2e8f0"}`,
                            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                          }}
                        >
                          {/* Card header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginBottom: 14,
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#7c3aed"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ marginRight: 6 }}
                              >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M9 12l2 2 4-4" />
                              </svg>
                              {title}
                              {infoKey && <InfoBtn infoKey={infoKey} />}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                {subtitle}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: hasIssues
                                  ? "#fef2f2"
                                  : insights.length > 0
                                    ? "#fffbeb"
                                    : "#f0fdf4",
                                color: hasIssues
                                  ? "#dc2626"
                                  : insights.length > 0
                                    ? "#d97706"
                                    : "#16a34a",
                                border: `1px solid ${hasIssues ? "#fca5a5" : insights.length > 0 ? "#fde68a" : "#bbf7d0"}`,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {hasIssues
                                ? `${issueGroups.length} issue${issueGroups.length > 1 ? "s" : ""}`
                                : insights.length > 0
                                  ? "Warnings"
                                  : "Clean"}
                            </div>
                          </div>

                          {/* Extra binary checks */}
                          {extraChecks && extraChecks.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                                marginBottom:
                                  issueGroups.length > 0 || insights.length > 0
                                    ? 12
                                    : 0,
                              }}
                            >
                              {extraChecks.map((c, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: 11,
                                    color: c.pass ? "#15803d" : "#b91c1c",
                                  }}
                                >
                                  {c.pass ? (
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#16a34a"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#dc2626"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                  )}
                                  {c.label}
                                  {c.detail && (
                                    <span
                                      style={{
                                        color: "#64748b",
                                        fontWeight: 400,
                                      }}
                                    >
                                      {" "}
                                      — {c.detail}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* WCAG violation groups */}
                          {issueGroups.map((g, i) => (
                            <div
                              key={i}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: "#fafafa",
                                border: "1px solid #f1f5f9",
                                borderLeft: `3px solid ${sevColor(g.severity)}`,
                                marginBottom: 6,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexWrap: "wrap",
                                  marginBottom: g.problem ? 3 : 0,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: "#0f172a",
                                  }}
                                >
                                  {getFriendlyTitle(
                                    g.wcagCriterion,
                                    g.id,
                                    g.problem,
                                  )}
                                </span>
                                {g.severity && (
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      color: "#fff",
                                      background: sevColor(g.severity),
                                      borderRadius: 999,
                                      padding: "1px 6px",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {g.severity}
                                  </span>
                                )}
                                {typeof g.count === "number" && (
                                  <span
                                    style={{ fontSize: 10, color: "#94a3b8" }}
                                  >
                                    {g.count} instance{g.count !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                              {g.problem && (
                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: 11,
                                    color: "#475569",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {g.problem}
                                </p>
                              )}
                              {g.recommendation && (
                                <p
                                  style={{
                                    margin: "3px 0 0",
                                    fontSize: 10.5,
                                    color: "#0ea5e9",
                                    fontStyle: "italic",
                                  }}
                                >
                                  → {g.recommendation}
                                </p>
                              )}
                            </div>
                          ))}

                          {/* AI insights */}
                          {insights.map((s, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                gap: 6,
                                padding: "7px 10px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderLeft: "3px solid #94a3b8",
                                borderRadius: 8,
                                marginBottom: 5,
                              }}
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#64748b"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ flexShrink: 0, marginTop: 2 }}
                              >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 11,
                                  color: "#475569",
                                  lineHeight: 1.5,
                                }}
                              >
                                {s}
                              </p>
                            </div>
                          ))}

                          {!hasData && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 11.5,
                                color: "#15803d",
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#16a34a"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              No issues detected in this area.
                            </div>
                          )}
                        </div>
                      );
                    };

                    const info = auditInfoOpen
                      ? AUDIT_INFO[auditInfoOpen]
                      : null;

                    return (
                      <>
                        {/* Info modal overlay */}
                        {info && (
                          <div
                            onClick={() => setAuditInfoOpen(null)}
                            style={{
                              position: "fixed",
                              inset: 0,
                              background: "rgba(15,23,42,0.45)",
                              zIndex: 1000,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 24,
                            }}
                          >
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                background: "#fff",
                                borderRadius: 18,
                                padding: "28px 30px",
                                maxWidth: 520,
                                width: "100%",
                                boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
                                position: "relative",
                              }}
                            >
                              {/* Close */}
                              <button
                                onClick={() => setAuditInfoOpen(null)}
                                style={{
                                  position: "absolute",
                                  top: 14,
                                  right: 14,
                                  width: 28,
                                  height: 28,
                                  borderRadius: "50%",
                                  border: "none",
                                  background: "#f1f5f9",
                                  color: "#64748b",
                                  fontSize: 14,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: 0,
                                }}
                              >
                                ✕
                              </button>

                              {/* Header */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  marginBottom: 20,
                                }}
                              >
                                <div
                                  style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 10,
                                    background: "#f5f3ff",
                                    border: "1px solid #ddd6fe",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#7c3aed"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="11" cy="11" r="8" />
                                    <line
                                      x1="21"
                                      y1="21"
                                      x2="16.65"
                                      y2="16.65"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <h3
                                    style={{
                                      margin: 0,
                                      fontSize: 16,
                                      fontWeight: 800,
                                      color: "#0f172a",
                                    }}
                                  >
                                    {info.title}
                                  </h3>
                                </div>
                              </div>

                              {/* Sections */}
                              {[
                                {
                                  label: "What it checks",
                                  text: info.what,
                                  color: "#0ea5e9",
                                  bg: "#f0f9ff",
                                  border: "#bae6fd",
                                },
                                {
                                  label: "Why it matters",
                                  text: info.why,
                                  color: "#d97706",
                                  bg: "#fffbeb",
                                  border: "#fde68a",
                                },
                                {
                                  label: "How it works",
                                  text: info.how,
                                  color: "#7c3aed",
                                  bg: "#f5f3ff",
                                  border: "#ddd6fe",
                                },
                                {
                                  label: "WCAG criteria",
                                  text: info.wcag,
                                  color: "#059669",
                                  bg: "#f0fdf4",
                                  border: "#bbf7d0",
                                },
                              ].map(({ label, text, color, bg, border }) => (
                                <div
                                  key={label}
                                  style={{
                                    background: bg,
                                    border: `1px solid ${border}`,
                                    borderRadius: 10,
                                    padding: "11px 14px",
                                    marginBottom: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.5px",
                                      marginBottom: 4,
                                    }}
                                  >
                                    {label}
                                  </div>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 12.5,
                                      color: "#374151",
                                      lineHeight: 1.6,
                                    }}
                                  >
                                    {text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 18,
                            padding: "24px 28px",
                            boxShadow: "var(--shadow)",

                            border: "1px solid var(--border-light)",
                            borderTop: "3px solid #7c3aed",
                          }}
                        >
                          {/* Section header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,

                              borderBottom: "1px solid #f1f5f9",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <h2
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 18,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 9,
                                    background: "#f5f3ff",
                                    border: "1px solid #ddd6fe",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#7c3aed"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="11" cy="11" r="8" />
                                    <line
                                      x1="21"
                                      y1="21"
                                      x2="16.65"
                                      y2="16.65"
                                    />
                                  </svg>
                                </div>
                                Specialized Audits
                                <InfoBtn infoKey="specialized" />
                                <button
                                  aria-label={
                                    collapsedSections.specializedAudits
                                      ? "Expand Specialized Audits"
                                      : "Collapse Specialized Audits"
                                  }
                                  onClick={() =>
                                    toggleSection("specializedAudits")
                                  }
                                  style={{
                                    marginLeft: 12,
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#64748b",
                                    transition: "transform 0.2s",
                                    transform:
                                      collapsedSections.specializedAudits
                                        ? "rotate(-90deg)"
                                        : "none",
                                  }}
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>
                              </h2>
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: 15,
                                  fontWeight: 500,
                                  marginBottom: 4,
                                }}
                              >
                                Contains results from advanced or optional
                                accessibility checks, such as color contrast,
                                ARIA usage, or other specialized audits. Use
                                this section for deeper technical insights.
                              </div>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 12,
                                  color: "#94a3b8",
                                }}
                              >
                                Targeted checks for forms, ARIA, motion,
                                language, and cognitive load
                              </p>
                            </div>
                          </div>

                          {!collapsedSections.specializedAudits && (
                            <>
                              {/* 2×2 audit grid */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: 14,
                                  marginBottom: 14,
                                }}
                              >
                                <AuditCard
                                  icon='<rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="15" x2="16" y2="15"/>'
                                  iconBg="#fef9c3"
                                  iconStroke="#ca8a04"
                                  title="Form Accessibility"
                                  subtitle="Labels, errors, validation, autocomplete"
                                  issueGroups={formGroups}
                                  insights={formInsights}
                                  extraChecks={[]}
                                  infoKey="form"
                                />
                                <AuditCard
                                  icon='<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>'
                                  iconBg="#ede9fe"
                                  iconStroke="#7c3aed"
                                  title="ARIA Usage"
                                  subtitle="Roles, accessible names, landmarks"
                                  issueGroups={ariaGroups}
                                  insights={ariaInsights}
                                  extraChecks={[]}
                                  infoKey="aria"
                                />
                                <AuditCard
                                  icon='<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
                                  iconBg="#fff7ed"
                                  iconStroke="#ea580c"
                                  title="Animation & Motion"
                                  subtitle="Flashing, autoplay, reduced-motion support"
                                  issueGroups={motionGroups}
                                  insights={motionInsights}
                                  extraChecks={[]}
                                />
                                <AuditCard
                                  icon='<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'
                                  iconBg="#ecfdf5"
                                  iconStroke="#059669"
                                  title="Language Attributes"
                                  subtitle="html[lang], lang on passages, locale"
                                  issueGroups={langGroups}
                                  insights={langInsights}
                                  extraChecks={
                                    hasLangAttr !== null
                                      ? [
                                          {
                                            label: "html[lang] attribute",
                                            pass: hasLangAttr,
                                            detail: hasLangAttr
                                              ? "Present"
                                              : "Missing — screen readers cannot determine page language",
                                          },
                                        ]
                                      : []
                                  }
                                />
                              </div>

                              {/* ── Cognitive Accessibility Score (full width) ── */}
                              <div
                                style={{
                                  background: "#fff",
                                  borderRadius: 14,
                                  padding: "20px 24px",
                                  border: "1px solid #e2e8f0",
                                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: 20,
                                  }}
                                >
                                  {/* Circular score */}
                                  <div
                                    style={{
                                      flexShrink: 0,
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <svg
                                      width="80"
                                      height="80"
                                      viewBox="0 0 80 80"
                                    >
                                      <circle
                                        cx="40"
                                        cy="40"
                                        r="32"
                                        fill="none"
                                        stroke="#f1f5f9"
                                        strokeWidth="8"
                                      />
                                      <circle
                                        cx="40"
                                        cy="40"
                                        r="32"
                                        fill="none"
                                        stroke={cogColor}
                                        strokeWidth="8"
                                        strokeDasharray={`${(2 * Math.PI * 32 * cogScore) / 100} ${2 * Math.PI * 32 * (1 - cogScore / 100)}`}
                                        strokeDashoffset={
                                          2 * Math.PI * 32 * 0.25
                                        }
                                        strokeLinecap="round"
                                      />
                                      <text
                                        x="40"
                                        y="37"
                                        textAnchor="middle"
                                        fontSize="16"
                                        fontWeight="800"
                                        fill={cogColor}
                                      >
                                        {cogScore}
                                      </text>
                                      <text
                                        x="40"
                                        y="50"
                                        textAnchor="middle"
                                        fontSize="8"
                                        fill="#94a3b8"
                                      >
                                        /100
                                      </text>
                                    </svg>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: "#94a3b8",
                                      }}
                                    >
                                      Cognitive Score
                                    </span>
                                  </div>

                                  {/* Right content */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 10,
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: 7,
                                          background: "#f0fdf4",
                                          border: "1px solid #bbf7d0",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      >
                                        <svg
                                          width="13"
                                          height="13"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="#16a34a"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        >
                                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                          <line
                                            x1="12"
                                            y1="17"
                                            x2="12.01"
                                            y2="17"
                                          />
                                          <circle cx="12" cy="12" r="10" />
                                        </svg>
                                      </div>
                                      <div>
                                        <div
                                          style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: "#0f172a",
                                          }}
                                        >
                                          Cognitive Accessibility
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: "#94a3b8",
                                          }}
                                        >
                                          Readability, consistency, error
                                          prevention, predictability
                                        </div>
                                      </div>
                                    </div>

                                    {/* Checks grid */}
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3,1fr)",
                                        gap: 6,
                                        marginBottom:
                                          cogInsights.length > 0 ? 14 : 0,
                                      }}
                                    >
                                      {COG_CHECKS.map((c, i) => (
                                        <div
                                          key={i}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 5,
                                            fontSize: 10.5,
                                            color: c.pass
                                              ? "#15803d"
                                              : "#b91c1c",
                                            background: c.pass
                                              ? "#f0fdf4"
                                              : "#fef2f2",
                                            border: `1px solid ${c.pass ? "#bbf7d0" : "#fca5a5"}`,
                                            borderRadius: 7,
                                            padding: "5px 8px",
                                          }}
                                        >
                                          {c.pass ? (
                                            <svg
                                              width="9"
                                              height="9"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="#16a34a"
                                              strokeWidth="3"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                          ) : (
                                            <svg
                                              width="9"
                                              height="9"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="#dc2626"
                                              strokeWidth="3"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <line
                                                x1="18"
                                                y1="6"
                                                x2="6"
                                                y2="18"
                                              />
                                              <line
                                                x1="6"
                                                y1="6"
                                                x2="18"
                                                y2="18"
                                              />
                                            </svg>
                                          )}
                                          <span>{c.label}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* AI insights */}
                                    {cogInsights.length > 0 && (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 5,
                                        }}
                                      >
                                        {cogInsights.map((s, i) => (
                                          <div
                                            key={i}
                                            style={{
                                              display: "flex",
                                              gap: 6,
                                              padding: "7px 10px",
                                              background: "#fafafa",
                                              border: "1px solid #e2e8f0",
                                              borderLeft: "3px solid #7c3aed",
                                              borderRadius: 8,
                                            }}
                                          >
                                            <svg
                                              width="11"
                                              height="11"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="#7c3aed"
                                              strokeWidth="2.5"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              style={{
                                                flexShrink: 0,
                                                marginTop: 2,
                                              }}
                                            >
                                              <circle cx="12" cy="12" r="10" />
                                              <line
                                                x1="12"
                                                y1="8"
                                                x2="12"
                                                y2="12"
                                              />
                                              <line
                                                x1="12"
                                                y1="16"
                                                x2="12.01"
                                                y2="16"
                                              />
                                            </svg>
                                            <p
                                              style={{
                                                margin: 0,
                                                fontSize: 11,
                                                color: "#475569",
                                                lineHeight: 1.5,
                                              }}
                                            >
                                              {s}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {cogInsights.length === 0 &&
                                      cogGroups.length === 0 && (
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontSize: 11.5,
                                            color: "#15803d",
                                          }}
                                        >
                                          <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#16a34a"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                          No cognitive accessibility issues
                                          detected.
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
              </section>

              <section id="next-steps" ref={sectionRefs.current[5]}>
                <div
                  className="next-steps"
                  style={{
                    background: "#fff",
                    borderRadius: "18px",
                    padding: "20px 24px",
                    boxShadow: "var(--shadow)",

                    border: "1px solid var(--border-light)",
                    borderTop: "3px solid #d97706",
                  }}
                >
                  {(() => {
                    if (nextSteps.length === 0) {
                      return (
                        <>
                          <h2
                            className="next-steps-heading"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <span
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 9,
                                  background: "#fffbeb",
                                  border: "1px solid #fde68a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#d97706"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                              Next Steps
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSectionInfoOpen("next-steps");
                                }}
                                title="Learn more about this section"
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  border: "1.5px solid #94a3b8",
                                  background: "transparent",
                                  color: "#94a3b8",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: 0,
                                  lineHeight: 1,
                                  flexShrink: 0,
                                  transition: "all 0.15s",
                                  outline: "none",
                                }}
                              >
                                ?
                              </button>
                            </span>
                            <button
                              aria-label={
                                collapsedSections.nextSteps
                                  ? "Expand Next Steps"
                                  : "Collapse Next Steps"
                              }
                              onClick={() => toggleSection("nextSteps")}
                              style={{
                                marginLeft: 12,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#64748b",
                                transition: "transform 0.2s",
                                transform: collapsedSections.nextSteps
                                  ? "rotate(-90deg)"
                                  : "none",
                              }}
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </button>
                          </h2>

                          <p style={{ color: "#64748b", fontSize: 14 }}>
                            No specific recommendations were generated.
                          </p>
                        </>
                      );
                    }

                    // ── Effort tag detection ─────────────────────────────────
                    const detectEffort = (text) => {
                      const t = text.toLowerCase();
                      if (
                        /test|audit|review|screen reader|assistive|manual|verify|check/.test(
                          t,
                        )
                      )
                        return {
                          label: "Testing",
                          color: "#7c3aed",
                          bg: "#f5f3ff",
                        };
                      if (
                        /aria|semantic|landmark|structure|heading|role|hierarchy|implement|refactor/.test(
                          t,
                        )
                      )
                        return {
                          label: "Structural",
                          color: "#0ea5e9",
                          bg: "#f0f9ff",
                        };
                      if (
                        /alt text|alt=|label|contrast|lang|skip|button text|link text|descriptive/.test(
                          t,
                        )
                      )
                        return {
                          label: "Quick win",
                          color: "#16a34a",
                          bg: "#f0fdf4",
                        };
                      return {
                        label: "Moderate",
                        color: "#d97706",
                        bg: "#fffbeb",
                      };
                    };

                    // ── Phase grouping ───────────────────────────────────────
                    const phaseOrder = [
                      "Quick win",
                      "Moderate",
                      "Structural",
                      "Testing",
                    ];
                    const phaseLabels = {
                      "Quick win": {
                        title: "Quick Wins",
                        sub: "Under 30 min each",
                        color: "#16a34a",
                        border: "#86efac",
                      },
                      Moderate: {
                        title: "Moderate Fixes",
                        sub: "Require code changes",
                        color: "#d97706",
                        border: "#fde68a",
                      },
                      Structural: {
                        title: "Structural Changes",
                        sub: "Architecture / markup",
                        color: "#0ea5e9",
                        border: "#bae6fd",
                      },
                      Testing: {
                        title: "Testing & Validation",
                        sub: "Manual & tool verification",
                        color: "#7c3aed",
                        border: "#ddd6fe",
                      },
                    };

                    // ── WCAG criterion linking ───────────────────────────────
                    const stepCriteria = (text) => {
                      const t = text.toLowerCase();
                      const matches = [];
                      if (/alt text|alternative text|img/.test(t))
                        matches.push("1.1.1");
                      if (/label|form field|input/.test(t))
                        matches.push("1.3.1");
                      if (/contrast|color.*text|text.*color/.test(t))
                        matches.push("1.4.3");
                      if (/keyboard|tab |focus/.test(t)) matches.push("2.1.1");
                      if (/skip|bypass/.test(t)) matches.push("2.4.1");
                      if (
                        /link text|descriptive.*link|link.*descriptive/.test(t)
                      )
                        matches.push("2.4.4");
                      if (/focus.*visible|visible.*focus|focus ring/.test(t))
                        matches.push("2.4.7");
                      if (/error|validation/.test(t)) matches.push("3.3.1");
                      if (/button.*name|accessible.*name|aria-label/.test(t))
                        matches.push("4.1.2");
                      if (/lang|language/.test(t)) matches.push("3.1.1");
                      // Filter to only criteria that are actually in the groups list
                      return matches.filter((c) =>
                        groups.some(
                          (g) => getCriterionKey(g.wcagCriterion) === c,
                        ),
                      );
                    };

                    // Annotate each step
                    const annotated = nextSteps.map((step, idx) => ({
                      step,
                      idx,
                      effort: detectEffort(step),
                      criteria: stepCriteria(step),
                    }));

                    // Group by phase
                    const grouped = {};
                    phaseOrder.forEach((p) => {
                      grouped[p] = [];
                    });
                    annotated.forEach((item) => {
                      grouped[item.effort.label].push(item);
                    });

                    // Progress
                    const totalCount = nextSteps.length;
                    const doneCount = doneSteps.size;
                    const pct =
                      totalCount > 0
                        ? Math.round((doneCount / totalCount) * 100)
                        : 0;
                    const allDone = doneCount === totalCount;

                    // Copy as markdown checklist
                    const copyChecklist = () => {
                      const md = nextSteps
                        .map(
                          (s, i) => `- [${doneSteps.has(i) ? "x" : " "}] ${s}`,
                        )
                        .join("\n");
                      navigator.clipboard?.writeText(
                        `## Accessibility Next Steps\n\n${md}`,
                      );
                    };
                    const handleCopyChecklist = () => {
                      copyChecklist();
                      setChecklistCopied(true);
                      setTimeout(() => setChecklistCopied(false), 2000);
                    };

                    // Phase icons (SVG paths)
                    const phaseIcons = {
                      "Quick win": (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      ),
                      Moderate: (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                      ),
                      Structural: (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="3" width="6" height="4" rx="1" />
                          <rect x="9" y="3" width="13" height="4" rx="1" />
                          <rect x="2" y="10" width="6" height="4" rx="1" />
                          <rect x="9" y="10" width="13" height="4" rx="1" />
                          <rect x="2" y="17" width="6" height="4" rx="1" />
                          <rect x="9" y="17" width="13" height="4" rx="1" />
                        </svg>
                      ),
                      Testing: (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v11m0 0H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1-2-2H9zm0 0V9" />
                        </svg>
                      ),
                    };

                    const activePhasesCount = phaseOrder.filter(
                      (p) => grouped[p].length > 0,
                    ).length;

                    return (
                      <>
                        {/* ── Header ── */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 14,
                          }}
                        >
                          <div>
                            <h2
                              className="next-steps-heading"
                              style={{
                                margin: "0 0 2px",
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 9,
                                  background: "#fffbeb",
                                  border: "1px solid #fde68a",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#d97706"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </div>
                              Next Steps
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSectionInfoOpen("next-steps");
                                }}
                                title="Learn more about this section"
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  border: "1.5px solid #94a3b8",
                                  background: "transparent",
                                  color: "#94a3b8",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: 0,
                                  lineHeight: 1,
                                  flexShrink: 0,
                                  transition: "all 0.15s",
                                  outline: "none",
                                }}
                              >
                                ?
                              </button>
                              <button
                                aria-label={
                                  collapsedSections.nextSteps
                                    ? "Expand Next Steps"
                                    : "Collapse Next Steps"
                                }
                                onClick={() => toggleSection("nextSteps")}
                                style={{
                                  marginLeft: 12,
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 18,
                                  color: "#64748b",
                                  transition: "transform 0.2s",
                                  transform: collapsedSections.nextSteps
                                    ? "rotate(-90deg)"
                                    : "none",
                                }}
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </button>
                            </h2>
                            <div
                              style={{
                                marginBottom: 12,
                                color: "#64748b",
                                fontSize: 15,
                                fontWeight: 500,
                              }}
                            >
                              Offers a prioritized list of recommended actions
                              to improve your site’s accessibility. This section
                              helps you plan remediation and track progress
                              toward compliance.
                            </div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 12,
                                color: "#94a3b8",
                              }}
                            >
                              Remediation roadmap · {totalCount} actions across{" "}
                              {activePhasesCount} phase
                              {activePhasesCount > 1 ? "s" : ""}
                            </p>
                          </div>
                          <button
                            onClick={handleCopyChecklist}
                            style={{
                              background: checklistCopied
                                ? "#f0fdf4"
                                : "#f8fafc",
                              border: `1px solid ${checklistCopied ? "#86efac" : "#e2e8f0"}`,
                              color: checklistCopied ? "#16a34a" : "#475569",
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 8,
                              padding: "7px 14px",
                              cursor: "pointer",
                              boxShadow: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              flexShrink: 0,
                              transition: "all 0.2s",
                            }}
                          >
                            {checklistCopied ? (
                              <>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Copied!
                              </>
                            ) : (
                              <>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect
                                    x="9"
                                    y="9"
                                    width="13"
                                    height="13"
                                    rx="2"
                                  />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                Copy as checklist
                              </>
                            )}
                          </button>
                        </div>

                        <div
                          style={{
                            display: collapsedSections.nextSteps
                              ? "none"
                              : "block",
                          }}
                        >
                          {/* ── Segmented progress bar ── */}
                          <div
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #f1f5f9",
                              borderRadius: 10,
                              padding: "10px 14px",
                              marginBottom: 18,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 7,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: allDone ? "#16a34a" : "#334155",
                                }}
                              >
                                {allDone
                                  ? "All steps completed!"
                                  : `${doneCount} / ${totalCount} completed`}
                              </span>
                              <span
                                style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: allDone ? "#16a34a" : "#0f172a",
                                }}
                              >
                                {pct}%
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 3,
                                height: 7,
                                borderRadius: 999,
                                overflow: "hidden",
                                marginBottom: 7,
                              }}
                            >
                              {phaseOrder
                                .filter((p) => grouped[p].length > 0)
                                .map((phase) => {
                                  const meta = phaseLabels[phase];
                                  const phaseDone = grouped[phase].filter((i) =>
                                    doneSteps.has(i.idx),
                                  ).length;
                                  const phaseTotal = grouped[phase].length;
                                  const phaseWidth =
                                    (phaseTotal / totalCount) * 100;
                                  const phaseFill =
                                    phaseTotal > 0
                                      ? (phaseDone / phaseTotal) * 100
                                      : 0;
                                  return (
                                    <div
                                      key={phase}
                                      style={{
                                        width: `${phaseWidth}%`,
                                        background: "#e2e8f0",
                                        borderRadius: 999,
                                        overflow: "hidden",
                                      }}
                                      title={`${meta.title}: ${phaseDone}/${phaseTotal}`}
                                    >
                                      <div
                                        style={{
                                          height: "100%",
                                          width: `${phaseFill}%`,
                                          background: meta.color,
                                          borderRadius: 999,
                                          transition: "width 0.4s ease",
                                        }}
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                flexWrap: "wrap",
                              }}
                            >
                              {phaseOrder
                                .filter((p) => grouped[p].length > 0)
                                .map((phase) => {
                                  const meta = phaseLabels[phase];
                                  const phaseDone = grouped[phase].filter((i) =>
                                    doneSteps.has(i.idx),
                                  ).length;
                                  return (
                                    <div
                                      key={phase}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 7,
                                          height: 7,
                                          borderRadius: 2,
                                          background: meta.color,
                                          flexShrink: 0,
                                        }}
                                      />
                                      <span
                                        style={{
                                          fontSize: 11,
                                          color: "#64748b",
                                        }}
                                      >
                                        {meta.title}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color: meta.color,
                                        }}
                                      >
                                        {phaseDone}/{grouped[phase].length}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>

                          {/* ── Phase groups ── */}
                          {phaseOrder
                            .filter((p) => grouped[p].length > 0)
                            .map((phase) => {
                              const meta = phaseLabels[phase];
                              const phaseDone = grouped[phase].filter((i) =>
                                doneSteps.has(i.idx),
                              ).length;
                              const phaseComplete =
                                phaseDone === grouped[phase].length;
                              return (
                                <div key={phase} style={{ marginBottom: 16 }}>
                                  {/* Phase banner */}
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      background: `${meta.color}0d`,
                                      border: `1px solid ${meta.border}`,
                                      borderLeft: `3px solid ${meta.color}`,
                                      borderRadius: "0 8px 8px 0",
                                      padding: "7px 12px",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: meta.color,
                                        flexShrink: 0,
                                        display: "flex",
                                      }}
                                    >
                                      {phaseIcons[phase]}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 800,
                                        color: meta.color,
                                        flex: 1,
                                      }}
                                    >
                                      {meta.title}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: "#94a3b8",
                                        marginRight: 8,
                                      }}
                                    >
                                      {meta.sub}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        background: phaseComplete
                                          ? meta.color
                                          : "#fff",
                                        color: phaseComplete
                                          ? "#fff"
                                          : meta.color,
                                        border: `1.5px solid ${meta.color}`,
                                        borderRadius: 999,
                                        padding: "2px 10px",
                                        transition: "all 0.2s",
                                      }}
                                    >
                                      {phaseComplete
                                        ? "Done"
                                        : `${phaseDone}/${grouped[phase].length}`}
                                    </span>
                                  </div>

                                  {/* Step cards */}
                                  {grouped[phase].map(
                                    ({ step, idx, criteria }) => {
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
                                            background: done
                                              ? `${meta.color}08`
                                              : "#fff",
                                            marginBottom: 5,
                                            cursor: "pointer",
                                            transition: "all 0.18s ease",
                                          }}
                                        >
                                          {/* Checkbox circle */}
                                          <div
                                            style={{
                                              width: 18,
                                              height: 18,
                                              borderRadius: "50%",
                                              flexShrink: 0,
                                              border: `2px solid ${done ? meta.color : "#cbd5e1"}`,
                                              background: done
                                                ? meta.color
                                                : "#fff",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              transition: "all 0.18s ease",
                                            }}
                                          >
                                            {done && (
                                              <svg
                                                width="9"
                                                height="9"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="#fff"
                                                strokeWidth="3.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              >
                                                <polyline points="20 6 9 17 4 12" />
                                              </svg>
                                            )}
                                          </div>

                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 5,
                                                flexWrap: "wrap",
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: 800,
                                                  color: done
                                                    ? meta.color
                                                    : "#94a3b8",
                                                }}
                                              >
                                                #{idx + 1}
                                              </span>
                                              {criteria.map((c) => (
                                                <span
                                                  key={c}
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    background: "#f0f9ff",
                                                    color: "#0284c7",
                                                    border: "1px solid #bae6fd",
                                                    borderRadius: 999,
                                                    padding: "0px 6px",
                                                  }}
                                                >
                                                  {c}
                                                </span>
                                              ))}
                                              <p
                                                style={{
                                                  margin: 0,
                                                  fontSize: 13,
                                                  lineHeight: 1.5,
                                                  color: done
                                                    ? "#94a3b8"
                                                    : "#334155",
                                                  textDecoration: done
                                                    ? "line-through"
                                                    : "none",
                                                  textDecorationColor:
                                                    meta.color,
                                                }}
                                              >
                                                {step}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </section>
            </>
          )}
        </div>

        <footer>
          <h2>Accessa</h2>
        </footer>
      </div>
    </div>
  );
}

export default Complete;
