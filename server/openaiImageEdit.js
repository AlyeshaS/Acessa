import fetch from "node-fetch";
import FormData from "form-data";

/**
 * Adds strict execution scoping so the image model
 * applies only localized accessibility fixes.
 * This does NOT change user-facing feedback.
 */
function scopePromptForImageEdit(rawPrompt) {
  return `
${rawPrompt}

––––––––––––––––
EXECUTION SCOPE OVERRIDE (CRITICAL):
- Apply changes ONLY to UI elements directly implicated by the accessibility issue.
- Do NOT apply global or page-wide styling changes.
- Do NOT change background colors unless explicitly required by the feedback.
- Do NOT modify elements that already meet accessibility requirements.
- Do NOT normalize contrast across the entire interface.
- If the instruction is ambiguous, choose the smallest possible localized change.
`;
}

export async function openaiImageEdit({ imageBase64, prompt, apiKey }) {
  if (!imageBase64 || !prompt || !apiKey) {
    throw new Error("Missing required parameters for image edit");
  }

  // Detect image type from data URL
  const mimeMatch = imageBase64.match(/^data:image\/(png|jpeg);base64,/);
  if (!mimeMatch) {
    throw new Error("Invalid image format. Expected base64 PNG or JPEG.");
  }

  const imageType = mimeMatch[1]; // "png" or "jpeg"
  const fileExt = imageType === "jpeg" ? "jpg" : "png";

  // Convert base64 → buffer
  const imageBuffer = Buffer.from(
    imageBase64.replace(/^data:image\/(png|jpeg);base64,/, ""),
    "base64",
  );

  // Safety check (OpenAI image size guard)
  if (imageBuffer.length > 20 * 1024 * 1024) {
    throw new Error("Image too large for OpenAI image edit endpoint");
  }

  const formData = new FormData();
  formData.append("image", imageBuffer, {
    filename: `input.${fileExt}`,
    contentType: `image/${imageType}`,
  });

  // Apply scoping BEFORE sending to the image model
  const scopedPrompt = scopePromptForImageEdit(prompt);
  formData.append("prompt", scopedPrompt);

  // Explicitly lock the image model
  formData.append("model", "gpt-image-1");

  console.log("Calling OpenAI image edit with model gpt-image-1");

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
