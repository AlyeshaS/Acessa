import React, { useEffect, useRef, useState } from "react";
import { WCAG_CODE_SUGGESTIONS, WCAG_PREVIEWS } from "../utils/wcagSuggestions";
import { getCriterionKey } from "./ViolationsFilterSection";
import "../styles/App.css";
import "../styles/index.css";

// ─── Code suggestion panel ───────────────────────────────────────────────────
function CodeSuggestionPanel({ criterion }) {
  const key = getCriterionKey(criterion);
  const s =
    (key && WCAG_CODE_SUGGESTIONS[key]) || WCAG_CODE_SUGGESTIONS["_default"];
  console.log("KEY:", key);
  console.log("SUGGESTION:", s);
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

  const activeTabMeta = ALL_TABS.find((t) => t.id === activeTab);

  function handleCopy() {
    const code = s[activeTab] || "";
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        overflow: "visible",
        background: "#f8fafc",
      }}
    >
      {/* ── Where to apply ── */}
      {s.where && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 14px",
            background: "#f0f9ff",
            borderBottom: "1px solid #bae6fd",
          }}
        >
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
          <span style={{ fontSize: 12, color: "#0369a1", lineHeight: 1.5 }}>
            <strong>Where to apply: </strong>
            {s.where}
          </span>
        </div>
      )}

      {/* ── Before / After visual preview ── */}
      {preview && (
        <div
          style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0" }}
        >
          <div style={{ flex: 1, borderRight: "1px solid #e2e8f0" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#dc2626",
                background: "#fef2f2",
                padding: "4px 10px",
                borderBottom: "1px solid #fca5a5",
              }}
            >
              Before — broken
            </div>
            <iframe
              srcDoc={preview.broken}
              style={{
                width: "100%",
                height: 130,
                border: "none",
                display: "block",
              }}
              scrolling="no"
              title="Broken example"
              sandbox="allow-same-origin"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "#16a34a",
                background: "#f0fdf4",
                padding: "4px 10px",
                borderBottom: "1px solid #86efac",
              }}
            >
              After — fixed
            </div>
            <iframe
              srcDoc={preview.fixed}
              style={{
                width: "100%",
                height: 130,
                border: "none",
                display: "block",
              }}
              scrolling="no"
              title="Fixed example"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderBottom: "1px solid #e2e8f0",
          background: "#f1f5f9",
          overflowX: "auto",
        }}
      >
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
        {/* Copy button */}
        <button
          onClick={handleCopy}
          style={{
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 700,
            border: "none",
            background: "transparent",
            color: copied ? "#16a34a" : "#64748b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "color 0.2s",
            whiteSpace: "nowrap",
          }}
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

      {/* ── Code block ── */}
      <div
        style={{
          position: "relative",
          background: activeTab === "before" ? "#fef2f2" : "#ffffff",
        }}
      >
        {activeTab === "before" && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              fontSize: 10,
              fontWeight: 700,
              color: "#dc2626",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              opacity: 0.7,
            }}
          >
            ❌ Broken — do not use
          </div>
        )}
        <pre
          style={{
            margin: 0,
            padding: "16px",
            fontSize: 12.5,
            lineHeight: 1.7,
            fontFamily:
              "'SFMono-Regular','Consolas','Liberation Mono',monospace",
            color: activeTab === "before" ? "#7f1d1d" : "#1e293b",
            overflowX: "auto",
            whiteSpace: "pre",
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          <code>{s[activeTab]}</code>
        </pre>
      </div>

      {/* ── Effort badge + external links ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderTop: "1px solid #e2e8f0",
          background: "#f8fafc",
          flexWrap: "wrap",
        }}
      >
        {s.effort && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 700,
              color: s.effort.color,
              background: `${s.effort.color}15`,
              border: `1px solid ${s.effort.color}44`,
              borderRadius: 999,
              padding: "3px 10px",
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
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#0284c7",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
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

      {/* ── Test steps (collapsible) ── */}
      {s.testSteps && s.testSteps.length > 0 && (
        <div style={{ borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={() => setTestOpen((o) => !o)}
            style={{
              width: "100%",
              padding: "9px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: testOpen ? "#f0fdf4" : "#f8fafc",
              border: "none",
              borderTop: testOpen ? "none" : undefined,
              cursor: "pointer",
              textAlign: "left",
              fontSize: 12,
              fontWeight: 700,
              color: testOpen ? "#15803d" : "#475569",
              transition: "background 0.15s",
            }}
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
            <ol
              style={{
                margin: 0,
                padding: "12px 14px 14px 34px",
                listStyle: "decimal",
                background: "#f0fdf4",
              }}
            >
              {s.testSteps.map((step, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 12.5,
                    color: "#166534",
                    lineHeight: 1.65,
                    marginBottom: 6,
                  }}
                >
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
