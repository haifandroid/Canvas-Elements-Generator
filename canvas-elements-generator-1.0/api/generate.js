export const config = {
  runtime: "nodejs",
};

import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt, type } = req.body || {};

    if (!prompt || !type) {
      return res.status(400).json({ error: "Missing prompt or type" });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ parts: [{ text: prompt }] }],
    });

    let imageBase64 = "";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        break;
      }
    }

    if (!imageBase64) {
      return res.status(500).json({ error: "No image generated" });
    }

    res.status(200).json({
      image: `data:image/png;base64,${imageBase64}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Generation failed" });
  }
}
