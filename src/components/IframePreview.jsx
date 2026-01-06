import React, { useEffect, useRef } from "react";

/**
 * IframePreview renders HTML content in an iframe and allows injecting CSS for visual changes.
 * Props:
 *   html: string (HTML content to display)
 *   css: string (CSS to inject for the "after" view)
 *   style: React style object for iframe
 */
export default function IframePreview({ html, css = "", style = {} }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    if (css) {
      const styleTag = doc.createElement("style");
      styleTag.innerHTML = css;
      doc.head.appendChild(styleTag);
    }
  }, [html, css]);

  return (
    <iframe
      ref={iframeRef}
      style={{
        width: "100%",
        height: 500,
        border: "1px solid #ccc",
        borderRadius: 8,
        ...style,
      }}
      title="Preview"
    />
  );
}
