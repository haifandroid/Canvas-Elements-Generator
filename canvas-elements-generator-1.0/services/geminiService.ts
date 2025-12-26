
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AssetType } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Utility to remove white backgrounds from images locally.
 * This ensures stickers and elements are transparent for use in presentations.
 */
const removeWhiteBackground = async (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Threshold for "white-ish" pixels. Using 245 to catch near-white compression artifacts
      const threshold = 245;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // If the pixel is very close to white, make it transparent
        if (r >= threshold && g >= threshold && b >= threshold) {
          data[i + 3] = 0; // Alpha
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
  });
};

/**
 * Helper to call an async function with exponential backoff retries for 429/500 errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 4000): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
      const isServerError = error?.message?.includes('500') || error?.message?.includes('Rpc failed');
      
      if ((isRateLimit || isServerError) && i < maxRetries - 1) {
        console.warn(`API error (${isRateLimit ? '429' : '500'}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await sleep(delay);
        delay = (delay * 2) + (Math.random() * 1000); 
        continue;
      }
      throw error;
    }
  }
  return fn(); // Final attempt
}

const getSystemPrompt = (type: AssetType, userPrompt: string): string => {
  // We emphasize "pure solid white background" and "no shadows" to make background removal clean.
  const isolationInstruction = "isolated on a pure, solid, high-contrast #FFFFFF white background with no shadows, no gradients, and clean sharp edges";

  switch (type) {
    case AssetType.STICKER:
      return `Die-cut sticker of ${userPrompt}, bold white border around the shape, high quality illustration, vibrant colors, ${isolationInstruction}, 4k, vector style.`;
    case AssetType.PNG_ELEMENT:
      return `High resolution isolated object of ${userPrompt}, professional asset, clean edges, studio lighting, ${isolationInstruction}, stock asset style.`;
    case AssetType.GRAPHIC:
      return `Minimalist vector graphic illustration of ${userPrompt}, modern design aesthetic, clean lines, flat colors, ${isolationInstruction}.`;
    case AssetType.SHAPE_3D:
      return `3D render of ${userPrompt}, claymation or polished plastic style, soft studio lighting, high detail, volumetric shadows ONLY on the object itself, ${isolationInstruction}, octane render.`;
    case AssetType.MOCKUP:
      return `Professional product mockup of ${userPrompt}, clean composition, commercial photography style, minimalist surrounding, photorealistic, 4k.`;
    case AssetType.PHOTO:
      return `High-quality professional photography of ${userPrompt}, natural lighting, shallow depth of field, 8k resolution, cinematic composition.`;
    case AssetType.STAMP:
      return `Retro postal stamp or rubber stamp design featuring ${userPrompt}, textured ink effect, vintage aesthetic, ${isolationInstruction}.`;
    case AssetType.GIF:
      return `A looping animation of ${userPrompt}, high quality motion graphics, smooth transitions, isolated background.`;
    default:
      return userPrompt;
  }
};

export const generatePromptVariations = async (basePrompt: string, type: AssetType, count: number = 20): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} distinct but highly related visual descriptions for creating ${type} assets based on the theme: "${basePrompt}". 
      Ensure variety in angle, color palette, and specific details while maintaining the essence. 
      Keep each description concise (under 20 words).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }) as GenerateContentResponse;

    try {
      const variations = JSON.parse(response.text || "[]");
      return variations.length > 0 ? variations : [basePrompt];
    } catch (e) {
      console.error("Failed to parse variations", e);
      return Array(count).fill(basePrompt);
    }
  });
};

export const generateSingleAsset = async (prompt: string, type: AssetType): Promise<string> => {
  const finalPrompt = getSystemPrompt(type, prompt);

  if (type === AssetType.GIF) {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation: any = await withRetry(() => ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: finalPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '1:1'
      }
    }));

    while (!operation.done) {
      await sleep(15000);
      operation = await withRetry(() => ai.operations.getVideosOperation({ operation: operation }));
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } else {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: finalPrompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    })) as GenerateContentResponse;

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
    if (!imageUrl) throw new Error("Failed to generate image data");

    // For specific transparent-friendly types, we post-process to remove the white background.
    const transparentTypes = [
      AssetType.STICKER, 
      AssetType.PNG_ELEMENT, 
      AssetType.GRAPHIC, 
      AssetType.SHAPE_3D, 
      AssetType.STAMP
    ];
    
    if (transparentTypes.includes(type)) {
      return await removeWhiteBackground(imageUrl);
    }

    return imageUrl;
  }
};
