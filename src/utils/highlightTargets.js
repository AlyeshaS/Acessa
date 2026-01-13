// Utility for mapping issues to selectors and bounding boxes

/**
 * Extract selectors from axe violation nodes
 * @param {object} violation - Axe violation object
 * @returns {string[]} selectors
 */
export function getSelectorsFromViolation(violation) {
  if (!violation) return [];
  // axe-core: violation.nodes[].target is usually an array of selectors
  if (Array.isArray(violation.nodes)) {
    return violation.nodes.flatMap((node) => node.target || []);
  }
  return [];
}

/**
 * Compute bounding boxes for selectors in a given document
 * @param {string[]} selectors
 * @param {Document} doc - DOM document (iframe or main)
 * @returns {Array<{x:number, y:number, width:number, height:number, selector:string}>}
 */
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
      // ignore invalid selectors
    }
  });
  return boxes;
}

/**
 * Safe fallback: if selector fails, try text-based matching
 * @param {string[]} textSnippets
 * @param {Document} doc
 * @returns {Array<{x:number, y:number, width:number, height:number, selector:string}>}
 */
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
        null
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
      // ignore errors
    }
  });
  return boxes;
}

/**
 * Main pipeline: get highlight targets for an issue
 * @param {object} issue - { selectors, fallbackTextAnchors }
 * @param {Document} doc
 * @returns {Array<{x, y, width, height, selector}>}
 */
export function getHighlightTargets(issue, doc) {
  let boxes = [];
  if (issue.selectors && issue.selectors.length) {
    boxes = getBoundingBoxesForSelectors(issue.selectors, doc);
  }
  // Fallback: try text anchors
  if (
    (!boxes || boxes.length === 0) &&
    issue.fallbackTextAnchors?.textSnippets
  ) {
    boxes = getBoundingBoxesByText(issue.fallbackTextAnchors.textSnippets, doc);
  }
  return boxes;
}
