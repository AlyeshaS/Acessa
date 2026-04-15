import React from "react";

// Each unique violation type gets its own highlight color
// The first color (red) is always used for the selected marker
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

// Get the prefix for a violation type from an issueId (e.g. "button-name__selector" -> "button-name")
function violationPrefix(issueId) {
  if (!issueId) return "__none__";
  return issueId.split("__")[0];
}

// ScreenshotWithHighlights draws a screenshot and overlays colored boxes for each accessibility issue
// Selected and hovered markers get a thicker border and a tooltip
function ScreenshotWithHighlights({
  screenshot,
  markers,
  selectedMarkerIdx = 0,
  onMarkerClick,
  offsetLeft = 0, // offset in px for left margin (e.g., side panel width)
  panelState, // pass navCollapsed or similar here
}) {
  // Ref to the image element so we can get its size
  const imgRef = React.useRef(null);
  // Track the natural and rendered size of the image
  const [imgDims, setImgDims] = React.useState({
    naturalWidth: 1,
    naturalHeight: 1,
    renderedWidth: 1,
    renderedHeight: 1,
  });
  // Track which marker is currently hovered
  const [hoveredIdx, setHoveredIdx] = React.useState(null);

  // When the image loads or resizes, update the size state
  const handleImgLoad = () => {
    if (!imgRef.current) return;
    setImgDims({
      naturalWidth: imgRef.current.naturalWidth,
      naturalHeight: imgRef.current.naturalHeight,
      renderedWidth: imgRef.current.clientWidth,
      renderedHeight: imgRef.current.clientHeight,
    });
  };

  // Listen for window resize and image resize to keep overlays in sync
  React.useEffect(() => {
    const onResize = () => handleImgLoad();
    window.addEventListener("resize", onResize);
    handleImgLoad();

    // --- ResizeObserver for real-time image size changes ---
    let observer = null;
    if (imgRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        handleImgLoad();
      });
      observer.observe(imgRef.current);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (observer && imgRef.current) observer.disconnect();
    };
  }, [panelState]);

  // Calculate scale factors to map natural image size to rendered size
  const scaleX = imgDims.renderedWidth / imgDims.naturalWidth;
  const scaleY = imgDims.renderedHeight / imgDims.naturalHeight;

  // Build a color map so each violation type always gets the same color
  // The selected marker always uses red
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

  // Log markers for debugging
  React.useEffect(() => {
    if (markers && markers.length > 0) {
      // eslint-disable-next-line no-console
      console.log("[DEBUG] Markers for highlights:", markers);
    }
  }, [markers]);

  return (
    /* Outer shell: fills the parent and clips highlights so they don't bleed out */
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        isolation: "isolate",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      {/* Inner wrapper: shrinks to the image size so overlays are always in the right spot */}
      <div
        style={{
          position: "relative",
          display: "inline-block",
          lineHeight: 0, // collapse whitespace gap below the image
          maxWidth: "100%",
          maxHeight: "100%",
        }}
      >
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

          // Pick the color for this marker (red if selected, otherwise from the color map)
          const paletteIdx = isSelected
            ? 0
            : (colourMap.get(violationPrefix(m.issueId)) ?? 1);
          const colour =
            HIGHLIGHT_PALETTE[paletteIdx % HIGHLIGHT_PALETTE.length];

          const baseStyle = {
            borderRadius: 6,
            cursor: onMarkerClick ? "pointer" : "default",
            transition:
              "border-color 0.15s, background 0.15s, box-shadow 0.15s",
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

          const handleClick = onMarkerClick
            ? () => onMarkerClick(i)
            : undefined;
          const handleMouseEnter = () => setHoveredIdx(i);
          const handleMouseLeave = () => setHoveredIdx(null);

          // Tooltip text comes from the marker summary or recommendation
          const tooltipText = m.summary || m.recommendation || null;

          // Draw a highlight box for a marker or bounding box
          const renderBox = (b, key) => {
            // Always apply offsetLeft so highlight moves with the sidebar
            const left = b.x * scaleX + offsetLeft;
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
                {/* Tooltip: only shown while hovered */}
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
      </div>{" "}
      {/* End of inner wrapper */}
    </div>
  );
}

export default ScreenshotWithHighlights;
