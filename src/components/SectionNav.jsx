import React, { useState } from "react";

const sections = [
  { id: "website-preview", label: "Website Preview", icon: "🗂️" },
  { id: "accessibility-issues", label: "Accessibility Issues", icon: "♿" },
  { id: "hci-report", label: "HCI Report", icon: "📊" },
  { id: "mobile-experience", label: "Mobile Experience", icon: "📱" },
  { id: "specialized-audits", label: "Specialized Audits", icon: "🔍" },
  { id: "next-steps", label: "Next Steps", icon: "✅" },
];

function SectionNav({ activeSection, onNavClick, collapsed, setCollapsed }) {
  // Height: 100vh minus footer (assume footer is 56px tall)
  const navHeight = "calc(100vh - 56px)";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: navHeight,
        width: collapsed ? "48px" : "220px",
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",

        zIndex: 100,
        boxShadow: "2px 0 12px rgba(0,0,0,0.05)",
        overflowY: "auto",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Brand mark and collapse/expand arrow button (single header) */}
      <div
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
          paddingLeft: collapsed ? 0 : 20,
          borderBottom: "1px solid #f1f5f9",
          background: "#fff",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <button
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => setCollapsed((c) => !c)}
          style={{
            marginRight: collapsed ? 0 : 10,
            width: 24,
            height: 24,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            zIndex: 101,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "margin 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              display: "block",
              transform: collapsed ? "rotate(180deg)" : "none",
              transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <path
              d="M12.5 15L6.5 9L12.5 3"
              stroke="#64748b"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {!collapsed && (
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--slate)",
              letterSpacing: "-0.5px",
              marginLeft: 2,
            }}
          >
            Sections
          </span>
        )}
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: collapsed ? "8px 0" : "8px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {sections.map((section, idx) => {
          const isActive = activeSection === section.id;
          return (
            <li key={section.id}>
              <button
                onClick={() => onNavClick(section.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? "9px 0" : "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.18s ease",
                  background: isActive ? "#f0f9ff" : "transparent",
                  borderLeft: isActive
                    ? "3px solid #0ea5e9"
                    : "3px solid transparent",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                title={section.label}
              >
                <span
                  style={{
                    fontSize: 14,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {section.icon}
                </span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#0284c7" : "#64748b",
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "color 0.18s ease",
                    }}
                  >
                    {section.label}
                  </span>
                )}

                {/* Active indicator dot */}
                {isActive && !collapsed && (
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#0ea5e9",
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Progress indicator at bottom */}
      {!collapsed && (
        <div
          style={{
            marginTop: "auto",
            padding: "16px 20px 8px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: "#94a3b8",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            Report Progress
          </div>
          <div
            style={{
              height: 4,
              background: "#f1f5f9",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((sections.findIndex((s) => s.id === activeSection) + 1) / sections.length) * 100}%`,
                background: "linear-gradient(90deg, #0ea5e9, #6366f1)",
                borderRadius: 999,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "#94a3b8",
              fontWeight: 500,
              marginTop: 4,
            }}
          >
            {sections.findIndex((s) => s.id === activeSection) + 1} of{" "}
            {sections.length}
          </div>
        </div>
      )}
    </nav>
  );
}

export default SectionNav;
