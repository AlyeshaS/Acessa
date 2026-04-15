import { useState } from "react";

// Info tooltip that opens a modal popup matching the section info UI style.
// Clicking the i icon opens a full modal; clicking the backdrop or close button closes it.
const InfoTooltip = ({ label, description }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        aria-label={`Learn more about ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: "1.5px solid #94a3b8",
          background: "transparent",
          color: "#94a3b8",
          fontSize: 10,
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#64748b";
          e.currentTarget.style.color = "#64748b";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#94a3b8";
          e.currentTarget.style.color = "#94a3b8";
        }}
      >
        i
      </button>

      {/* Modal */}
      {open && (
        <div
          onClick={() => setOpen(false)}
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
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
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
              &#x2715;
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
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
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
                  stroke="#3b82f6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="8.01" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                </svg>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                {label}
              </h3>
            </div>

            {/* Description card */}
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 10,
                padding: "11px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#0ea5e9",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 4,
                }}
              >
                What it means
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: "#374151",
                  lineHeight: 1.6,
                }}
              >
                {description}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoTooltip;
