import React from "react";
import {
  WCAG_CODE_SUGGESTIONS,
  WCAG_USER_IMPACT,
  getGenericUserImpact,
} from "../utils/wcagSuggestions";
import CodeSuggestionPanel from "./CodeSuggestionPanel";
import "../styles/App.css";
import "../styles/index.css";

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

function getCriterionKey(criterion) {
  if (!criterion) return null;
  const m = String(criterion).match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
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
    { key: "Perceivable", color: "#3b82f6", bg: "#eff6ff" },
    { key: "Operable", color: "#d97706", bg: "#fffbeb" },
    { key: "Understandable", color: "#189b97", bg: "#f0fdfa" },
    { key: "Robust", color: "#7c3aed", bg: "#faf5ff" },
  ];

  // Track which issue card has code panel open: "principle-idx"
  const [openCodeKey, setOpenCodeKey] = React.useState(null);
  const toggleCode = (key) =>
    setOpenCodeKey((prev) => (prev === key ? null : key));

  // Track which issue card has "Why it matters" open
  const [openImpactKey, setOpenImpactKey] = React.useState(null);
  const toggleImpact = (key) =>
    setOpenImpactKey((prev) => (prev === key ? null : key));

  // Track which issues have been marked as fixed
  const [fixedKeys, setFixedKeys] = React.useState(new Set());
  const toggleFixed = (key) =>
    setFixedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Verify fix state per issue key
  const [verifyState, setVerifyState] = React.useState({}); // { [codeKey]: "idle"|"verifying"|"passed"|"failed" }

  const runVerify = (codeKey, wcagCriterion) => {
    if (!siteUrl) return;
    setVerifyState((prev) => ({ ...prev, [codeKey]: "verifying" }));
    const criterionKey = getCriterionKey(wcagCriterion);
    try {
      const streamUrl = `http://localhost:4000/api/wcag-check-stream?url=${encodeURIComponent(siteUrl)}`;
      const evt = new EventSource(streamUrl);
      const timeout = setTimeout(() => {
        evt.close();
        setVerifyState((prev) => ({ ...prev, [codeKey]: "timeout" }));
      }, 90000);
      evt.addEventListener("result", (e) => {
        clearTimeout(timeout);
        evt.close();
        try {
          const payload = JSON.parse(e.data || "{}");
          const resultGroups = Array.isArray(payload?.aiAnalysis?.groups)
            ? payload.aiAnalysis.groups
            : Array.isArray(payload?.groups)
              ? payload.groups
              : [];
          const stillPresent = criterionKey
            ? resultGroups.some(
                (g) => getCriterionKey(g.wcagCriterion) === criterionKey,
              )
            : false;
          setVerifyState((prev) => ({
            ...prev,
            [codeKey]: stillPresent ? "failed" : "passed",
          }));
        } catch {
          setVerifyState((prev) => ({ ...prev, [codeKey]: "failed" }));
        }
      });
      evt.onerror = () => {
        clearTimeout(timeout);
        evt.close();
        setVerifyState((prev) => ({ ...prev, [codeKey]: "error" }));
      };
    } catch {
      setVerifyState((prev) => ({ ...prev, [codeKey]: "error" }));
    }
  };

  // Total issues across all principles (for progress bar)
  const totalIssueCount = Object.values(groupedByPrinciple).flat().length;
  const fixedCount = fixedKeys.size;
  const progressPct =
    totalIssueCount > 0 ? Math.round((fixedCount / totalIssueCount) * 100) : 0;

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
      // Fix progress tracker
      {totalIssueCount > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 16px",
            background: progressPct === 100 ? "#f0fdf4" : "#f8fafc",
            borderRadius: 12,
            border: `1px solid ${progressPct === 100 ? "#bbf7d0" : "#e2e8f0"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: progressPct === 100 ? "#15803d" : "#0f172a",
              }}
            >
              {progressPct === 100 ? "🎉 All issues resolved!" : "Fix progress"}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: progressPct === 100 ? "#15803d" : "#64748b",
              }}
            >
              {fixedCount} / {totalIssueCount} fixed
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: "#e2e8f0",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background:
                  progressPct === 100
                    ? "linear-gradient(90deg,#16a34a,#22c55e)"
                    : "linear-gradient(90deg,#189b97,#0ea5e9)",
                borderRadius: 999,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}
      // Filter Buttons
      <div
        style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}
      >
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
      // Grouped by Principle
      <div style={{ marginTop: 24 }}>
        {principles.map((cat) => (
          <div key={cat.key} style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: cat.color,
                  flexShrink: 0,
                }}
              />
              <h3
                style={{
                  color: "#0f172a",
                  fontWeight: 700,
                  fontSize: 16,
                  margin: 0,
                }}
              >
                {cat.key}
              </h3>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  fontWeight: 700,
                  color: cat.color,
                  background: cat.bg,
                  border: `1px solid ${cat.color}33`,
                  borderRadius: 999,
                  padding: "2px 9px",
                }}
              >
                WCAG {cat.key[0]}
              </span>
            </div>
            {groupedByPrinciple[cat.key] &&
            groupedByPrinciple[cat.key].length > 0 ? (
              filterBySeverity(groupedByPrinciple[cat.key]).length > 0 ? (
                filterBySeverity(groupedByPrinciple[cat.key]).map((g, idx) => {
                  const codeKey = `${cat.key}-${idx}`;
                  const criterionNum = getCriterionKey(g.wcagCriterion);

                  // Always show the button: fallback to _default if nothing else
                  const hasCode =
                    !!WCAG_CODE_SUGGESTIONS[criterionNum] ||
                    !!WCAG_CODE_SUGGESTIONS["_default"];
                  const codeOpen = openCodeKey === codeKey;
                  const isFixed = fixedKeys.has(codeKey);
                  const effort = criterionNum
                    ? WCAG_CODE_SUGGESTIONS[criterionNum]?.effort
                    : null;
                  return (
                    <div
                      key={idx}
                      className="issue-item"
                      style={{
                        borderLeft: `4px solid ${isFixed ? "#16a34a" : severityColor(g.severity)}`,
                        background: isFixed
                          ? "#f0fdf4"
                          : severityBg(g.severity),
                        opacity: isFixed ? 0.75 : 1,
                        transition: "all 0.25s ease",
                      }}
                    >
                      // Header row
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: 13.5,
                            color: isFixed ? "#15803d" : "#0f172a",
                            flex: 1,
                            minWidth: 0,
                            textDecoration: isFixed ? "line-through" : "none",
                          }}
                        >
                          {g.wcagCriterion || "Unspecified criterion"}
                        </strong>
                        // Severity badge
                        {g.severity && !isFixed && (
                          <span
                            style={{
                              flexShrink: 0,
                              padding: "2px 9px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.4px",
                              color: "#fff",
                              background: severityColor(g.severity),
                            }}
                          >
                            {g.severity}
                          </span>
                        )}
                        // Effort badge
                        {effort && !isFixed && (
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 10,
                              fontWeight: 700,
                              color: effort.color,
                              background: `${effort.color}18`,
                              border: `1px solid ${effort.color}44`,
                              borderRadius: 999,
                              padding: "2px 8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <svg
                              width="9"
                              height="9"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {effort.label} · {effort.time}
                          </span>
                        )}
                        // Occurrence count
                        {typeof g.count === "number" && !isFixed && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              flexShrink: 0,
                            }}
                          >
                            ~{g.count} occurrence{g.count === 1 ? "" : "s"}
                          </span>
                        )}
                        // Why it matters button
                        {!isFixed && (
                          <button
                            onClick={() => toggleImpact(codeKey)}
                            title="See who is affected and how"
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 10px",
                              borderRadius: 6,
                              border:
                                openImpactKey === codeKey
                                  ? "1.5px solid #7c3aed"
                                  : "1.5px solid #cbd5e1",
                              background:
                                openImpactKey === codeKey
                                  ? "#f5f3ff"
                                  : "#ffffff",
                              color:
                                openImpactKey === codeKey
                                  ? "#7c3aed"
                                  : "#64748b",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              whiteSpace: "nowrap",
                            }}
                          >
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
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Who's affected
                          </button>
                        )}
                        // View Fix button
                        {hasCode && !isFixed && (
                          <button
                            onClick={() => {
                              console.log("Clicked:", codeKey);
                              toggleCode(codeKey);
                            }}
                            title={codeOpen ? "Hide code fix" : "View code fix"}
                            style={{
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: codeOpen
                                ? "1.5px solid #189b97"
                                : "1.5px solid #cbd5e1",
                              background: codeOpen ? "#f0fdfa" : "#ffffff",
                              color: codeOpen ? "#189b97" : "#64748b",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontFamily:
                                "'SFMono-Regular','Consolas',monospace",
                              transition: "all 0.15s",
                              whiteSpace: "nowrap",
                            }}
                          >
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
                              <polyline points="16 18 22 12 16 6" />
                              <polyline points="8 6 2 12 8 18" />
                            </svg>
                            {codeOpen ? "Hide Fix" : "View Fix"}
                          </button>
                        )}
                        // Mark as fixed checkbox
                        <label
                          title={
                            isFixed ? "Mark as not fixed" : "Mark as fixed"
                          }
                          style={{
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            color: isFixed ? "#15803d" : "#64748b",
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: isFixed
                              ? "1.5px solid #16a34a"
                              : "1.5px solid #cbd5e1",
                            background: isFixed ? "#dcfce7" : "#ffffff",
                            transition: "all 0.2s",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isFixed}
                            onChange={() => toggleFixed(codeKey)}
                            style={{
                              accentColor: "#16a34a",
                              width: 13,
                              height: 13,
                              cursor: "pointer",
                            }}
                          />
                          {isFixed ? "Fixed ✓" : "Mark fixed"}
                        </label>
                      </div>
                      // Problem + recommendation — hidden when fixed
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
                      {isFixed &&
                        (() => {
                          const vs = verifyState[codeKey] || "idle";
                          return (
                            <div style={{ marginTop: 8 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  flexWrap: "wrap",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: 12,
                                    color: "#15803d",
                                    margin: 0,
                                    fontStyle: "italic",
                                  }}
                                >
                                  Marked as fixed — uncheck to reopen
                                </p>
                                {vs === "idle" && siteUrl && (
                                  <button
                                    onClick={() =>
                                      runVerify(codeKey, g.wcagCriterion)
                                    }
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      padding: "4px 10px",
                                      borderRadius: 6,
                                      border: "1.5px solid #16a34a",
                                      background: "#fff",
                                      color: "#15803d",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      boxShadow: "none",
                                      whiteSpace: "nowrap",
                                      transition: "all 0.15s",
                                    }}
                                  >
                                    <svg
                                      width="11"
                                      height="11"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Verify Fix
                                  </button>
                                )}
                                {vs === "verifying" && (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: "#64748b",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                    }}
                                  >
                                    <svg
                                      style={{
                                        animation: "spin 1s linear infinite",
                                      }}
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Re-scanning… (this may take 30–60s)
                                  </span>
                                )}
                                {vs === "passed" && (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: "#15803d",
                                      background: "#dcfce7",
                                      border: "1px solid #86efac",
                                      borderRadius: 999,
                                      padding: "3px 10px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <svg
                                      width="11"
                                      height="11"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    Verified fixed ✓
                                  </span>
                                )}
                                {vs === "failed" && (
                                  <span
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color: "#dc2626",
                                      background: "#fef2f2",
                                      border: "1px solid #fca5a5",
                                      borderRadius: 999,
                                      padding: "3px 10px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                    }}
                                  >
                                    <svg
                                      width="11"
                                      height="11"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18" />
                                      <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    Still detected — check your fix
                                  </span>
                                )}
                                {(vs === "error" || vs === "timeout") && (
                                  <span
                                    style={{ fontSize: 12, color: "#d97706" }}
                                  >
                                    {vs === "timeout"
                                      ? "Scan timed out — try again"
                                      : "Could not reach scanner"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      {/* Who's affected panel */}
                      {openImpactKey === codeKey &&
                        !isFixed &&
                        (() => {
                          const impactKey = getCriterionKey(g.wcagCriterion);
                          const impact = impactKey
                            ? WCAG_USER_IMPACT[impactKey]
                            : null;
                          return (
                            <div
                              style={{
                                marginTop: 10,
                                borderRadius: 10,
                                border: "1px solid #ddd6fe",
                                background: "#faf5ff",
                                padding: "14px 16px",
                              }}
                            >
                              {/* Affected users */}
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 6,
                                  marginBottom: 10,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#7c3aed",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                    alignSelf: "center",
                                    marginRight: 4,
                                  }}
                                >
                                  Affects:
                                </span>
                                {impact ? (
                                  impact.users.map((u) => (
                                    <span
                                      key={u}
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: "#6d28d9",
                                        background: "#ede9fe",
                                        border: "1px solid #ddd6fe",
                                        borderRadius: 999,
                                        padding: "2px 8px",
                                      }}
                                    >
                                      {u}
                                    </span>
                                  ))
                                ) : (
                                  <span
                                    style={{ fontSize: 11, color: "#7c3aed" }}
                                  >
                                    Users relying on assistive technologies
                                  </span>
                                )}
                              </div>
                              {/* Story */}
                              <p
                                style={{
                                  margin: "0 0 8px",
                                  fontSize: 13,
                                  color: "#4c1d95",
                                  lineHeight: 1.65,
                                }}
                              >
                                {impact
                                  ? impact.story
                                  : getGenericUserImpact(g.severity)}
                              </p>
                              {/* Consequence */}
                              {impact?.consequence && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "flex-start",
                                    background: "#ede9fe",
                                    borderRadius: 7,
                                    padding: "8px 12px",
                                  }}
                                >
                                  <svg
                                    style={{ flexShrink: 0, marginTop: 2 }}
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#7c3aed"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 12,
                                      color: "#5b21b6",
                                      lineHeight: 1.55,
                                    }}
                                  >
                                    <strong>Impact:</strong>{" "}
                                    {impact.consequence}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      {/* Code suggestion panel */}
                      {codeOpen && hasCode && !isFixed && (
                        <>
                          <CodeSuggestionPanel criterion={g.wcagCriterion} />
                        </>
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

export default ViolationsFilterSection;
export { getCriterionKey };
