// Helpers for finding elements and their positions for highlighting issues

// Get all CSS selectors from an axe violation object
export function getSelectorsFromViolation(violation) {
  if (!violation) return [];
  // Each node in violation.nodes usually has a target array of selectors
  if (Array.isArray(violation.nodes)) {
    return violation.nodes.flatMap((node) => node.target || []);
  }
  return [];
}

// Find the position and size of elements matching each selector in the document
export function getBoundingBoxesForSelectors(selectors, doc) {
  if (!doc || !selectors || !selectors.length) return [];
  const boxes = [];
  selectors.forEach((selector) => {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        boxes.push({
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
          selector,
        });
      });
    } catch (e) {
      // Ignore selectors that don't work
    }
  });
  return boxes;
}

// If selectors don't work, try to find elements by matching text content
export function getBoundingBoxesByText(textSnippets, doc) {
  if (!doc || !textSnippets || !textSnippets.length) return [];
  const boxes = [];
  textSnippets.forEach((snippet) => {
    const xpath = `//*[contains(text(), '${snippet
      .replace(/'/g, "")
      .trim()}')]`;
    try {
      const result = doc.evaluate(
        xpath,
        doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
      );
      for (let i = 0; i < result.snapshotLength; i++) {
        const el = result.snapshotItem(i);
        if (el && el.getBoundingClientRect) {
          const rect = el.getBoundingClientRect();
          boxes.push({
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            selector: "text:" + snippet,
          });
        }
      }
    } catch (e) {
      // Ignore errors from bad XPath or DOM
    }
  });
  return boxes;
}

// Main function: get all highlight targets for an issue using selectors or text
export function getHighlightTargets(issue, doc) {
  let boxes = [];
  if (issue.selectors && issue.selectors.length) {
    boxes = getBoundingBoxesForSelectors(issue.selectors, doc);
  }
  // If no boxes found, try using fallback text anchors
  if (
    (!boxes || boxes.length === 0) &&
    issue.fallbackTextAnchors?.textSnippets
  ) {
    boxes = getBoundingBoxesByText(issue.fallbackTextAnchors.textSnippets, doc);
  }
  return boxes;
}
