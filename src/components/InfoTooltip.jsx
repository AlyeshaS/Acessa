import { useState } from "react";
import "../styles/components.css";

const InfoTooltip = ({ label, description }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Learn more about ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="info-tooltip-btn"
      >
        i
      </button>

      {open && (
        <div className="info-tooltip-backdrop" onClick={() => setOpen(false)}>
          <div
            className="info-tooltip-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="info-tooltip-close"
              onClick={() => setOpen(false)}
            >
              &#x2715;
            </button>

            <div className="info-tooltip-header">
              <div className="info-tooltip-icon-wrap">
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
              <h3 className="info-tooltip-title">{label}</h3>
            </div>

            <div className="info-tooltip-body">
              <div className="info-tooltip-body-label">What it means</div>
              <p className="info-tooltip-body-text">{description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfoTooltip;
