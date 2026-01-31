import fetch from "node-fetch";
import FormData from "form-data";

export async function openaiImageEdit({ imageBase64, prompt, apiKey }) {
  const formData = new FormData();
  const imageBuffer = Buffer.from(
    imageBase64.replace(/^data:image\/(png|jpeg);base64,/, ""),
    "base64",
  );
  formData.append("image", imageBuffer, {
    filename: "input.png",
    contentType: "image/png",
  });
  formData.append("prompt", prompt);
  formData.append("model", "gpt-image-1");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI image edit failed: ${error}`);
  }
  return response.json();
}
