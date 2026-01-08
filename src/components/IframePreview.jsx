import { useEffect, useRef } from "react";

/**
 * IframePreview
 * Renders AI-modified HTML inside an iframe while preserving
 * the original site's CSS, fonts, and asset paths.
 *
 * Props:
 *  - html: string (AI-modified HTML body or full HTML)
 *  - css: string (AI-generated CSS fixes)
 *  - stylesheets: string[] (original <link rel="stylesheet"> tags)
 *  - baseUrl: string (original page URL for relative assets)
 *  - style: React style object for iframe sizing/styling
 */
export default function IframePreview({
  html,
  css = "",
  stylesheets = [],
  baseUrl,
  style = {},
  scrollPosition = 0,
}) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />

    ${baseUrl ? `<base href="${baseUrl}" />` : ""}

    ${Array.isArray(stylesheets) ? stylesheets.join("\n") : ""}

    <style>
      /* AI accessibility fixes (applied last) */
      ${css || ""}
    </style>
  </head>
  <body>
    ${html}
  </body>
</html>
`;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    // Scroll to the desired position after content loads
    setTimeout(() => {
      try {
        if (typeof scrollPosition === "number" && iframe.contentWindow) {
          iframe.contentWindow.scrollTo(0, scrollPosition);
        }
      } catch (e) {
        // Ignore cross-origin or timing errors
      }
    }, 50);
  }, [html, css, stylesheets, baseUrl, scrollPosition]);

  return (
    <iframe
      ref={iframeRef}
      title="AI Accessibility Preview"
      sandbox="allow-same-origin"
      style={{
        width: "100%",
        height: "100%",
        border: "none",
        background: "#ffffff",
        ...style,
      }}
    />
  );
}
