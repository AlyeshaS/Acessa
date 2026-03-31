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

export default InfoTooltip;
