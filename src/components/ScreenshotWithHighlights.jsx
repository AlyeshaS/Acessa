import React from "react";

/**
 * Renders a screenshot image with highlight overlays for accessibility issues.
 * @param {Object} props
 * @param {string} props.screenshot - The image source URL or base64 string.
 * @param {Array} props.markers - Array of marker objects with bounding box info.
 */
function ScreenshotWithHighlights({ screenshot, markers }) {
  const imgRef = React.useRef(null);
  const [imgDims, setImgDims] = React.useState({
    naturalWidth: 1,
    naturalHeight: 1,
    renderedWidth: 1,
    renderedHeight: 1,
  });

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

  // Debug: log markers and bounding boxes
  React.useEffect(() => {
    if (markers && markers.length > 0) {
      // Only log on change
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
        alt="Screenshot with highlights"
      />
      {markers.flatMap((m, i) => {
        if (Array.isArray(m.boundingBoxes) && m.boundingBoxes.length > 0) {
          return m.boundingBoxes.map((b, j) => (
            <div
              key={`${m.issueId || i}-bb-${j}`}
              data-issueid={m.issueId || ""}
              style={{
                position: "absolute",
                left: b.x * scaleX,
                top: b.y * scaleY,
                width: b.width * scaleX,
                height: b.height * scaleY,
                border: "2px solid #ff4d4f",
                background: "rgba(255,77,79,0.18)",
                borderRadius: 6,
                pointerEvents: "none",
              }}
            />
          ));
        } else {
          return (
            <div
              key={m.issueId || i}
              data-issueid={m.issueId || ""}
              style={{
                position: "absolute",
                left: m.x * scaleX,
                top: m.y * scaleY,
                width: m.width * scaleX,
                height: m.height * scaleY,
                border: "2px solid #ff4d4f",
                background: "rgba(255,77,79,0.18)",
                borderRadius: 6,
                pointerEvents: "none",
              }}
            />
          );
        }
      })}
    </div>
  );
}

export default ScreenshotWithHighlights;
