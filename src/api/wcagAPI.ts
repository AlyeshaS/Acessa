// Calls the backend AI HTML modifier endpoint
export async function aiModifyHtml({
  html,
  feedback,
}: {
  html: string;
  feedback: string;
}) {
  const res = await fetch("http://localhost:4000/api/ai-modify-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, feedback }),
  });
  if (!res.ok) {
    throw new Error("AI HTML modification failed");
  }
  return res.json();
}
