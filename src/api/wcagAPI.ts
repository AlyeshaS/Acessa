// wcagAPI.ts

type AiModifyHtmlInput = {
  html: string;
  feedback: {
    summary: string;
    recommendation: string;
    problemCategory: string;
  };
};

// Calls the backend AI HTML modifier endpoint
export async function aiModifyHtml({
  html,
  feedback,
}: AiModifyHtmlInput): Promise<{ modifiedHtml: string; css: string }> {
  const res = await fetch("http://localhost:4000/api/ai-modify-html", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html, feedback }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI HTML modification failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Only return modifiedHtml and css for the After view
  return {
    modifiedHtml:
      typeof data?.modifiedHtml === "string" && data.modifiedHtml.trim()
        ? data.modifiedHtml
        : html, // fallback to original HTML
    css: typeof data?.css === "string" ? data.css : "",
  };
}
