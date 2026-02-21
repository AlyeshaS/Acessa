import React from "react";

export default function ScoreCircle({
  value = 0,
  size = 120,
  strokeWidth = 12,
  label,
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="score-circle"
      aria-label={label ? `${label} score ${clamped} out of 100` : undefined}
    >
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
            <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
              stroke="#267e57"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s" }}
        />
      </svg>
      <div className="score-label">{label ? label : null}</div>
      <div className="score-value">{clamped}</div>
    </div>
  );
}
