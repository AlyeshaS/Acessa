import React from "react";

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

export default PreviewArrow;
