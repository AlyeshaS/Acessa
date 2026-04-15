// Import React for building the component
import React from "react";

// This component draws a circular progress indicator for a score
export default function ScoreCircle({
  value = 0, // Score value to display
  size = 120, // Diameter of the circle in pixels
  strokeWidth = 12, // Thickness of the circle's stroke
  label, // Optional label to show below the circle
}) {
  // Clamp the score between 0 and 100
  const clamped = Math.max(0, Math.min(100, value));
  // Calculate the radius for the SVG circle
  const radius = (size - strokeWidth) / 2;
  // Find the circumference for the progress calculation
  const circumference = 2 * Math.PI * radius;
  // Offset determines how much of the circle is filled
  const offset = circumference - (clamped / 100) * circumference;

  // Render the score circle and label
  return (
    <div
      className="score-circle"
      aria-label={label ? `${label} score ${clamped} out of 100` : undefined}
    >
      // SVG element shows the background and progress ring
      <svg width={size} height={size}>
        // This is the background circle in light gray
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        // This is the foreground circle that shows the score progress in green
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
      // Show the label below the circle if there is one
      <div className="score-label">{label ? label : null}</div>
      // Show the numeric score in the center of the circle
      <div className="score-value">{clamped}</div>
    </div>
  );
}
