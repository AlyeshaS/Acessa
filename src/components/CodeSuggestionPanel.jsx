import React from "react";
import { WCAG_CODE_SUGGESTIONS, WCAG_PREVIEWS } from "../utils/wcagSuggestions";
import { getCriterionKey } from "./ViolationsFilterSection";
import "../styles/App.css";
import "../styles/index.css";
import "../styles/components.css";

// Shows code suggestions and previews for a given WCAG criterion.
function CodeSuggestionPanel({ criterion }) {
  const key = getCriterionKey(criterion);
  const s =
    (key && WCAG_CODE_SUGGESTIONS[key]) || WCAG_CODE_SUGGESTIONS["_default"];
  const preview = key ? WCAG_PREVIEWS[key] : null;

  const ALL_TABS = [
    { id: "before", label: "Before (broken)", color: "#dc2626", bg: "#fef2f2" },
    { id: "html", label: "HTML fix", color: "#e34c26", bg: "#fff5f2" },
    { id: "css", label: "CSS fix", color: "#189b97", bg: "#f0fdfa" },
    { id: "js", label: "JS fix", color: "#d97706", bg: "#fffbeb" },
    { id: "react", label: "React fix", color: "#0ea5e9", bg: "#f0f9ff" },
  ];

  const tabs = ALL_TABS.filter((t) => s && s[t.id]);
  const [activeTab, setActiveTab] = React.useState(null);
  const [copied, setCopied] = React.useState(false);
  const [testOpen, setTestOpen] = React.useState(false);

  React.useEffect(() => {
    if (tabs.length > 0) setActiveTab(tabs[0].id);
  }, [criterion]);

  if (!s || tabs.length === 0) return null;

  function handleCopy() {
    const code = s[activeTab] || "";
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="csp-root">
      {/* Where to apply the fix */}
      {s.where && (
        <div className="csp-where-banner">
          <svg
            style={{ flexShrink: 0, marginTop: 1 }}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="csp-where-text">
            <strong>Where to apply: </strong>
            {s.where}
          </span>
        </div>
      )}

      {/* Before/after preview */}
      {preview && (
        <div className="csp-preview-row">
          <div className="csp-preview-col">
            <div className="csp-preview-label csp-preview-label--broken">
              Before — broken
            </div>
            <iframe
              srcDoc={preview.broken}
              className="csp-preview-iframe"
              scrolling="no"
              title="Broken example"
              sandbox="allow-same-origin"
            />
          </div>
          <div className="csp-preview-col">
            <div className="csp-preview-label csp-preview-label--fixed">
              After — fixed
            </div>
            <iframe
              srcDoc={preview.fixed}
              className="csp-preview-iframe"
              scrolling="no"
              title="Fixed example"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="csp-tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'SFMono-Regular','Consolas',monospace",
              border: "none",
              borderBottom:
                activeTab === t.id
                  ? `2px solid ${t.color}`
                  : "2px solid transparent",
              background: activeTab === t.id ? "#ffffff" : "transparent",
              color: activeTab === t.id ? t.color : "#64748b",
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t.id === "before" && "⚠ "}
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCopy}
          className={`csp-copy-btn${copied ? " csp-copy-btn--copied" : ""}`}
        >
          {copied ? (
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
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code block */}
      <div
        className={`csp-code-area${activeTab === "before" ? " csp-code-area--before" : ""}`}
      >
        {activeTab === "before" && (
          <div className="csp-broken-label">❌ Broken — do not use</div>
        )}
        <pre
          className={`csp-pre${activeTab === "before" ? " csp-pre--before" : " csp-pre--after"}`}
        >
          <code>{s[activeTab]}</code>
        </pre>
      </div>

      {/* Footer: effort + links */}
      <div className="csp-footer">
        {s.effort && (
          <span
            className="csp-effort-badge"
            style={{
              color: s.effort.color,
              background: `${s.effort.color}15`,
              border: `1px solid ${s.effort.color}44`,
            }}
          >
            <svg
              width="10"
              height="10"
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
            {s.effort.label} · {s.effort.time}
          </span>
        )}
        <div style={{ flex: 1 }} />
        {(s.links || []).map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="csp-link"
          >
            {link.label}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ))}
      </div>

      {/* Test steps */}
      {s.testSteps && s.testSteps.length > 0 && (
        <div style={{ borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={() => setTestOpen((o) => !o)}
            className={`csp-test-toggle${testOpen ? " csp-test-toggle--open" : " csp-test-toggle--closed"}`}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline
                points={testOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}
              />
            </svg>
            {testOpen ? "Hide" : "Show"} how to test this fix (
            {s.testSteps.length} steps)
          </button>
          {testOpen && (
            <ol className="csp-test-steps">
              {s.testSteps.map((step, i) => (
                <li key={i} className="csp-test-step">
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

export default CodeSuggestionPanel;
