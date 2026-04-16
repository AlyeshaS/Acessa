import "../styles/components.css";

function PreviewArrow({ direction, disabled, onClick }) {
  const isLeft = direction === "left";

  return (
    <button
      aria-label={isLeft ? "Previous screenshot" : "Next screenshot"}
      disabled={disabled}
      onClick={onClick}
      className="preview-arrow-btn"
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
