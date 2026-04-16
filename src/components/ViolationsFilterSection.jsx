import React from "react";
import {
  WCAG_CODE_SUGGESTIONS,
  WCAG_USER_IMPACT,
  getGenericUserImpact,
} from "../utils/wcagSuggestions";
import CodeSuggestionPanel from "./CodeSuggestionPanel";
import "../styles/App.css";
import "../styles/index.css";
import "../styles/components.css";
import InfoTooltip from "./InfoTooltip";

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
  const POUR_INFO = {
    Perceivable: {
      label: "Perceivable (WCAG Principle 1)",
      description:
        "All information and UI components must be presentable to users in ways they can perceive. Issues here include missing alt text on images, insufficient color contrast, and content that can't be read by screen readers. Violations are detected by checking image alt attributes, color contrast ratios, and whether content relies solely on visual cues.",
    },
    Operable: {
      label: "Operable (WCAG Principle 2)",
      description:
        "All UI components and navigation must be operable by users. Issues here include interactive elements that can't be reached by keyboard, no visible focus indicator, and sessions that time out without warning. Violations are detected by checking keyboard accessibility, focus management, and whether all functionality is available without a mouse.",
    },
    Understandable: {
      label: "Understandable (WCAG Principle 3)",
      description:
        "Information and UI operation must be understandable. Issues here include unclear error messages, missing form labels, inconsistent navigation, and pages without a language attribute. Violations are detected by checking form field labels, error identification, language declarations, and whether instructions are clear enough for all users.",
    },
    Robust: {
      label: "Robust (WCAG Principle 4)",
      description:
        "Content must be robust enough to be interpreted by a wide variety of assistive technologies. Issues here include invalid HTML, missing ARIA roles, and elements that break screen readers. Violations are detected automatically by Axe-core, which parses the page's DOM and flags elements that don't conform to ARIA specifications or valid HTML semantics.",
    },
  };

  const principles = [
    { key: "Perceivable", color: "#3b82f6", bg: "#eff6ff" },
    { key: "Operable", color: "#d97706", bg: "#fffbeb" },
    { key: "Understandable", color: "#189b97", bg: "#f0fdfa" },
    { key: "Robust", color: "#7c3aed", bg: "#faf5ff" },
  ];

  const [openCodeKey, setOpenCodeKey] = React.useState(null);
  const [openImpactKey, setOpenImpactKey] = React.useState(null);
  const [fixedKeys, setFixedKeys] = React.useState(new Set());
  const [verifyState, setVerifyState] = React.useState({});
  const [filter, setFilter] = React.useState("all");

  const toggleCode = (key) => setOpenCodeKey((p) => (p === key ? null : key));
  const toggleImpact = (key) =>
    setOpenImpactKey((p) => (p === key ? null : key));
  const toggleFixed = (key) =>
    setFixedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

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

  const totalIssueCount = Object.values(groupedByPrinciple).flat().length;
  const fixedCount = fixedKeys.size;
  const progressPct =
    totalIssueCount > 0 ? Math.round((fixedCount / totalIssueCount) * 100) : 0;
  const isComplete = progressPct === 100;

  const filterBySeverity = (arr) => {
    if (filter === "all") return arr;
    if (filter === "critical")
      return arr.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return impact === "critical" || impact === "high";
      });
    if (filter === "warning")
      return arr.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return (
          impact === "warning" || impact === "moderate" || impact === "medium"
        );
      });
    if (filter === "minor")
      return arr.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return impact === "minor" || impact === "low";
      });
    return arr;
  };

  const grouped = { critical: [], warning: [], minor: [] };
  violations.forEach((v) => {
    const impact = (v.impact || v.severity || "minor").toLowerCase();
    if (impact === "critical" || impact === "serious" || impact === "high")
      grouped.critical.push(v);
    else if (impact === "moderate" || impact === "medium")
      grouped.warning.push(v);
    else grouped.minor.push(v);
  });

  const getCountForFilter = (filterType) => {
    const allViolations = Object.values(groupedByPrinciple).flat();
    if (filterType === "all") return allViolations.length;
    if (filterType === "critical")
      return allViolations.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return impact === "critical" || impact === "high";
      }).length;
    if (filterType === "warning")
      return allViolations.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return (
          impact === "warning" || impact === "moderate" || impact === "medium"
        );
      }).length;
    if (filterType === "minor")
      return allViolations.filter((v) => {
        const impact = (v.impact || v.severity || "minor").toLowerCase();
        return impact === "minor" || impact === "low";
      }).length;
    return 0;
  };

  const counts = {
    all: getCountForFilter("all"),
    critical: getCountForFilter("critical"),
    warning: getCountForFilter("warning"),
    minor: getCountForFilter("minor"),
  };

  // Dynamic filter button style (active colour varies per button)
  const filterBtnStyle = (active, color) => ({
    border: active ? `1.5px solid ${color}` : "1.5px solid #e2e8f0",
    background: active ? color : "#ffffff",
    color: active ? "#fff" : "#475569",
    boxShadow: active ? `0 2px 8px ${color}44` : "none",
  });

  return (
    <div className="vfs-root">
      {/* Fix progress tracker */}
      {totalIssueCount > 0 && (
        <div
          className={`vfs-progress-box ${isComplete ? "vfs-progress-box--complete" : "vfs-progress-box--normal"}`}
        >
          <div className="vfs-progress-header">
            <span
              className={`vfs-progress-title ${isComplete ? "vfs-progress-title--complete" : "vfs-progress-title--normal"}`}
            >
              {isComplete ? "🎉 All issues resolved!" : "Fix progress"}
            </span>
            <span
              className={`vfs-progress-count ${isComplete ? "vfs-progress-count--complete" : "vfs-progress-count--normal"}`}
            >
              {fixedCount} / {totalIssueCount} fixed
            </span>
          </div>
          <div className="vfs-progress-track">
            <div
              className={`vfs-progress-fill ${isComplete ? "vfs-progress-fill--complete" : "vfs-progress-fill--normal"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter buttons */}
      <div className="vfs-filter-row">
        {[
          { key: "all", label: `All (${counts.all})`, color: "#334155" },
          {
            key: "critical",
            label: `Critical (${counts.critical})`,
            color: "#B3261E",
          },
          {
            key: "warning",
            label: `Warning (${counts.warning})`,
            color: "#B45309",
          },
          { key: "minor", label: `Minor (${counts.minor})`, color: "#475569" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            className="vfs-filter-btn"
            style={filterBtnStyle(filter === key, color)}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grouped by Principle */}
      <div className="vfs-principles">
        {principles.map((cat) => (
          <div key={cat.key} className="vfs-principle-block">
            <div className="vfs-principle-header">
              <span
                className="vfs-principle-dot"
                style={{ background: cat.color }}
              />
              <h3 className="vfs-principle-title">
                {cat.key}
                <InfoTooltip
                  label={POUR_INFO[cat.key].label}
                  description={POUR_INFO[cat.key].description}
                />
              </h3>
              <span
                className="vfs-principle-badge"
                style={{
                  color: cat.color,
                  background: cat.bg,
                  border: `1px solid ${cat.color}33`,
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
                      {/* Header row */}
                      <div className="vfs-issue-header-row">
                        <strong
                          className="vfs-issue-title"
                          style={{
                            color: isFixed ? "#15803d" : "#0f172a",
                            textDecoration: isFixed ? "line-through" : "none",
                          }}
                        >
                          {g.wcagCriterion || "Unspecified criterion"}
                        </strong>

                        {/* Severity badge */}
                        {g.severity && !isFixed && (
                          <span
                            className="vfs-severity-badge"
                            style={{ background: severityColor(g.severity) }}
                          >
                            {g.severity}
                          </span>
                        )}

                        {/* Effort badge */}
                        {effort && !isFixed && (
                          <span
                            className="vfs-effort-badge"
                            style={{
                              color: effort.color,
                              background: `${effort.color}18`,
                              border: `1px solid ${effort.color}44`,
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

                        {/* Occurrence count */}
                        {typeof g.count === "number" && !isFixed && (
                          <span className="vfs-occurrence">
                            ~{g.count} occurrence{g.count === 1 ? "" : "s"}
                          </span>
                        )}

                        {/* Who's affected button */}
                        {!isFixed && (
                          <button
                            onClick={() => toggleImpact(codeKey)}
                            title="See who is affected and how"
                            className={`vfs-impact-btn ${openImpactKey === codeKey ? "vfs-impact-btn--active" : "vfs-impact-btn--default"}`}
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

                        {/* View Fix button */}
                        {hasCode && !isFixed && (
                          <button
                            onClick={() => {
                              console.log("Clicked:", codeKey);
                              toggleCode(codeKey);
                            }}
                            title={codeOpen ? "Hide code fix" : "View code fix"}
                            className={`vfs-fix-btn ${codeOpen ? "vfs-fix-btn--active" : "vfs-fix-btn--default"}`}
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

                        {/* Mark as fixed */}
                        <label
                          title={
                            isFixed ? "Mark as not fixed" : "Mark as fixed"
                          }
                          className={`vfs-mark-fixed-label ${isFixed ? "vfs-mark-fixed-label--fixed" : "vfs-mark-fixed-label--default"}`}
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

                      {/* Problem + recommendation */}
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

                      {/* Fixed state: verify row */}
                      {isFixed &&
                        (() => {
                          const vs = verifyState[codeKey] || "idle";
                          return (
                            <div className="vfs-verify-row">
                              <p className="vfs-fixed-note">
                                Marked as fixed — uncheck to reopen
                              </p>
                              {vs === "idle" && siteUrl && (
                                <button
                                  onClick={() =>
                                    runVerify(codeKey, g.wcagCriterion)
                                  }
                                  className="vfs-verify-btn"
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
                                <span className="vfs-verifying-text">
                                  <svg
                                    className="vfs-spin"
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
                                <span className="vfs-verify-passed">
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
                                <span className="vfs-verify-failed">
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
                                <span className="vfs-verify-warn">
                                  {vs === "timeout"
                                    ? "Scan timed out — try again"
                                    : "Could not reach scanner"}
                                </span>
                              )}
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
                            <div className="vfs-impact-panel">
                              <div className="vfs-impact-users-row">
                                <span className="vfs-impact-affects-label">
                                  Affects:
                                </span>
                                {impact ? (
                                  impact.users.map((u) => (
                                    <span
                                      key={u}
                                      className="vfs-impact-user-chip"
                                    >
                                      {u}
                                    </span>
                                  ))
                                ) : (
                                  <span className="vfs-impact-fallback">
                                    Users relying on assistive technologies
                                  </span>
                                )}
                              </div>
                              <p className="vfs-impact-story">
                                {impact
                                  ? impact.story
                                  : getGenericUserImpact(g.severity)}
                              </p>
                              {impact?.consequence && (
                                <div className="vfs-impact-consequence">
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
                                  <p className="vfs-impact-consequence-text">
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
      ) && <div className="vfs-no-issues">No accessibility issues found.</div>}
    </div>
  );
}

export default ViolationsFilterSection;
export { getCriterionKey };
