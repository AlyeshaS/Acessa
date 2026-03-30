import React from "react";

/**
 * Distinct highlight colours — one per unique violation type (issueId prefix).
 * First entry is the "selected" override (red), the rest cycle through other hues.
 */
const HIGHLIGHT_PALETTE = [
  {
    border: "#ff4d4f",
    bg: "rgba(255,77,79,0.18)",
    shadow: "rgba(255,77,79,0.22)",
  },
  {
    border: "#f97316",
    bg: "rgba(249,115,22,0.15)",
    shadow: "rgba(249,115,22,0.18)",
  },
  {
    border: "#eab308",
    bg: "rgba(234,179,8,0.15)",
    shadow: "rgba(234,179,8,0.18)",
  },
  {
    border: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    shadow: "rgba(34,197,94,0.18)",
  },
  {
    border: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
    shadow: "rgba(59,130,246,0.18)",
  },
  {
    border: "#a855f7",
    bg: "rgba(168,85,247,0.15)",
    shadow: "rgba(168,85,247,0.18)",
  },
];

/** Extract the violation-type prefix from an issueId like "button-name__selector" */
function violationPrefix(issueId) {
  if (!issueId) return "__none__";
  return issueId.split("__")[0];
}

/**
 * Renders a screenshot image with highlight overlays for accessibility issues.
 *
 * CHANGES vs previous version:
 * - Markers for different violation types get different colours so you can
 *   visually distinguish multiple issues on the same screenshot.
 * - The selected marker is always red (HIGHLIGHT_PALETTE[0]).
 * - A small tooltip shows the violation summary on hover so the highlight and
 *   the feedback are visually linked.
 *
 * @param {Object} props
 * @param {string} props.screenshot - Image src (URL or base64).
 * @param {Array}  props.markers    - Array of marker objects with bounding box info.
 * @param {number} [props.selectedMarkerIdx] - Index of the currently selected marker.
 * @param {function} [props.onMarkerClick]   - Called with marker index on click.
 */
function ScreenshotWithHighlights({
  screenshot,
  markers,
  selectedMarkerIdx = 0,
  onMarkerClick,
}) {
  const imgRef = React.useRef(null);
  const [imgDims, setImgDims] = React.useState({
    naturalWidth: 1,
    naturalHeight: 1,
    renderedWidth: 1,
    renderedHeight: 1,
  });
  const [hoveredIdx, setHoveredIdx] = React.useState(null);

  const handleImgLoad = () => {
    if (!imgRef.current) return;
    setImgDims({
      naturalWidth: imgRef.current.naturalWidth,
      naturalHeight: imgRef.current.naturalHeight,
      renderedWidth: imgRef.current.clientWidth,
      renderedHeight: imgRef.current.clientHeight,
    });
  };

  React.useEffect(() => {
    const onResize = () => handleImgLoad();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const scaleX = imgDims.renderedWidth / imgDims.naturalWidth;
  const scaleY = imgDims.renderedHeight / imgDims.naturalHeight;

  // Build a stable colour map: each unique violation type gets a consistent colour.
  // The selected marker always uses palette[0] (red) to stand out.
  const colourMap = React.useMemo(() => {
    const map = new Map();
    let paletteIdx = 1; // 0 is reserved for selected
    (markers || []).forEach((m) => {
      const prefix = violationPrefix(m.issueId);
      if (!map.has(prefix)) {
        map.set(prefix, paletteIdx % HIGHLIGHT_PALETTE.length);
        paletteIdx++;
      }
    });
    return map;
  }, [markers]);

  React.useEffect(() => {
    if (markers && markers.length > 0) {
      // eslint-disable-next-line no-console
      console.log("[DEBUG] Markers for highlights:", markers);
    }
  }, [markers]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        ref={imgRef}
        src={screenshot}
        onLoad={handleImgLoad}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
        }}
        alt="Screenshot with accessibility highlights"
      />
      {(markers || []).flatMap((m, i) => {
        const isSelected = i === selectedMarkerIdx;
        const isHovered = i === hoveredIdx;

        // Colour: selected → palette[0], otherwise the stable colour for this violation type
        const paletteIdx = isSelected
          ? 0
          : (colourMap.get(violationPrefix(m.issueId)) ?? 1);
        const colour = HIGHLIGHT_PALETTE[paletteIdx % HIGHLIGHT_PALETTE.length];

        const baseStyle = {
          borderRadius: 6,
          cursor: onMarkerClick ? "pointer" : "default",
          transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
        };

        const stateStyle =
          isSelected || isHovered
            ? {
                border: `2.5px solid ${colour.border}`,
                background: colour.bg,
                boxShadow: `0 0 0 3px ${colour.shadow}`,
                zIndex: 20,
              }
            : {
                border: `2px solid ${colour.border}88`,
                background: colour.bg
                  .replace("0.15", "0.07")
                  .replace("0.18", "0.07"),
                zIndex: 10,
              };

        const handleClick = onMarkerClick ? () => onMarkerClick(i) : undefined;
        const handleMouseEnter = () => setHoveredIdx(i);
        const handleMouseLeave = () => setHoveredIdx(null);

        // Tooltip text = summary from the marker (set by axeRunner / index.js)
        const tooltipText = m.summary || m.recommendation || null;

        const renderBox = (b, key) => {
          const left = b.x * scaleX;
          const top = b.y * scaleY;
          const width = b.width * scaleX;
          const height = b.height * scaleY;

          return (
            <div
              key={key}
              data-issueid={m.issueId || ""}
              onClick={handleClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                position: "absolute",
                left,
                top,
                width,
                height,
                pointerEvents: onMarkerClick ? "auto" : "none",
                ...baseStyle,
                ...stateStyle,
              }}
            >
              {/* Tooltip — only shown while hovered */}
              {tooltipText && isHovered && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(15,23,42,0.93)",
                    color: "#f8fafc",
                    fontSize: 11,
                    lineHeight: 1.45,
                    padding: "5px 9px",
                    borderRadius: 6,
                    whiteSpace: "pre-wrap",
                    maxWidth: 220,
                    pointerEvents: "none",
                    zIndex: 100,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  {tooltipText}
                </div>
              )}
            </div>
          );
        };

        if (Array.isArray(m.boundingBoxes) && m.boundingBoxes.length > 0) {
          return m.boundingBoxes.map((b, j) =>
            renderBox(b, `${m.issueId || i}-bb-${j}`),
          );
        }
        return [renderBox(m, m.issueId || i)];
      })}
    </div>
  );
}

export default ScreenshotWithHighlights;
