import React, { useState } from "react";

const sections = [
  {
    id: "website-preview",
    label: "Website Preview",
    icon: (
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
    ),
    color: "#0ea5e9",
  },
  {
    id: "accessibility-issues",
    label: "Accessibility Issues",
    icon: (
      <svg
        width="18"
        height="18"
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
    ),
    color: "#dc2626",
  },
  {
    id: "hci-report",
    label: "HCI Report",
    icon: (
      <svg
        width="18"
        height="18"
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
    ),
    color: "#059669",
  },
  {
    id: "mobile-experience",
    label: "Mobile Experience",
    icon: (
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
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
    color: "#0ea5e9",
  },
  {
    id: "specialized-audits",
    label: "Specialized Audits",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7c3aed"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    color: "#7c3aed",
  },
  {
    id: "next-steps",
    label: "Next Steps",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#d97706"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    color: "#d97706",
  },
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
          // Utility to get a lighter version of a hex color
          function lightenColor(hex, percent) {
            hex = hex.replace(/^#/, "");
            if (hex.length === 3) {
              hex = hex
                .split("")
                .map((x) => x + x)
                .join("");
            }
            const num = parseInt(hex, 16);
            let r = (num >> 16) & 0xff;
            let g = (num >> 8) & 0xff;
            let b = num & 0xff;
            r = Math.round(r + (255 - r) * percent);
            g = Math.round(g + (255 - g) * percent);
            b = Math.round(b + (255 - b) * percent);
            return `rgb(${r}, ${g}, ${b})`;
          }
          // 95% lighter (very close to white, subtle tint)
          const activeBg = isActive
            ? lightenColor(section.color, 0.95)
            : "transparent";
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
                  background: activeBg,
                  borderLeft: isActive
                    ? `3px solid ${section.color}`
                    : "3px solid transparent",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "transparent";
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
                      color: isActive ? section.color : "#64748b",
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
                      background: section.color,
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SectionNav;
