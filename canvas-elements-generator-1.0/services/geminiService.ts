import { AssetType } from "../types";

export async function generateSingleAsset(
  prompt: string,
  type: AssetType
): Promise<string> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, type }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate asset");
  }

  const data = await response.json();
  return data.image;
}

export async function generatePromptVariations(
  prompt: string,
  type: AssetType,
  count = 10
): Promise<string[]> {
  const response = await fetch("/api/variations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, count }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate variations");
  }

  const data = await response.json();
  return data.variations;
}
