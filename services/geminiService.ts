import { GoogleGenAI, Modality, Part, Type } from "@google/genai";
import { StyleSettings } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const promptGenerationModel = 'gemini-2.5-flash';
const imageEditingModel = 'gemini-2.5-flash-image-preview';

/**
 * Parses errors from the Gemini API and returns a more user-friendly message.
 * @param error The error object caught from the API call.
 * @param context A string describing the operation that failed (e.g., "prompt generation").
 * @returns A new Error object with a user-friendly message.
 */
const handleGeminiError = (error: unknown, context: string): Error => {
    console.error(`Error during ${context}:`, error);
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid')) {
            return new Error('Invalid API Key. Please check if the API key is configured correctly.');
        }
        if (message.includes('rate limit')) {
            return new Error('You have exceeded your API request limit. Please wait and try again later.');
        }
        // Keep specific, actionable errors
        if (message.includes("did not return an image")) {
            return error;
        }
    }
    return new Error(`An unexpected error occurred during ${context}. Please check the console for details.`);
};


/**
 * Converts a File object to a base64 encoded string.
 */
export const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType: file.type });
        };
        reader.onerror = error => reject(error);
    });
};

/**
 * Generates a descriptive prompt for image editing based on style settings.
 */
export const generateDescriptivePrompt = async (
    settings: StyleSettings,
    styleImage: { base64: string, mimeType: string } | null
): Promise<string> => {
    const { aspectRatio, lightingStyle, cameraPerspective } = settings;

    const textPrompt = `You are an expert creative director for a high-end product photography studio using an advanced AI editor. Your mission is to craft a detailed, evocative, and highly specific prompt to transform a given product photo.

The final image must be a professional-grade product shot. The product should be the clear hero of the image, perfectly integrated into a compelling scene.

**User-defined Parameters:**
- **Aspect Ratio:** ${aspectRatio} (The final composition must adhere to this.)
- **Lighting Style:** ${lightingStyle}
- **Camera Perspective:** ${cameraPerspective}

**Your Task:**
Synthesize these parameters into a single, masterful prompt. Describe the scene, lighting, and camera work with rich, sensory language.

*Example:* For "Studio Lighting," instead of a generic phrase, describe it as: "A professional studio shot with a large, diffused key light creating soft, flattering highlights, minimal shadows filled in with ambient bounce light, and a subtle rim light to define the product's edges against a clean, seamless background."

${styleImage ? `
**Style Reference Analysis:**
A style reference image has been provided. Your prompt MUST incorporate its aesthetic.
1.  **Analyze the Essence:** Deconstruct the reference image's core visual elements: color palette (dominant and accent colors), textures (e.g., grainy, smooth, metallic, organic), composition, and overall mood (e.g., minimalist and clean, rustic and warm, futuristic and edgy).
2.  **Translate the Context:** Imagine a new scene inspired by the reference image that would perfectly showcase the user's product. Describe this environment. For instance, if the reference is a sun-drenched beach, the prompt might describe the product resting on weathered driftwood with soft, natural morning light.
3.  **Integrate and Enhance:** Weave the analyzed style elements and the new context seamlessly with the user-defined parameters. The user's choices for lighting and perspective are the primary guide, but they should be interpreted through the lens of the reference image's style.
` : ''}

**Final Output Requirement:**
Generate ONLY the final, complete prompt text. Do not include any titles, preambles, or explanations. The output must be ready to be fed directly into the image generation model.`;

    const parts: Part[] = [{ text: textPrompt }];
    if (styleImage) {
        parts.push({
            inlineData: {
                data: styleImage.base64,
                mimeType: styleImage.mimeType,
            }
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: promptGenerationModel,
            contents: { parts: parts },
        });

        if (!response.text) {
            throw new Error("The model returned an empty prompt.");
        }

        return response.text.trim();
    } catch (error) {
        throw handleGeminiError(error, "prompt generation");
    }
};

/**
 * Edits a product image using Gemini based on a prompt and optional style reference.
 */
export const editProductImage = async (
    productImage: { base64: string, mimeType: string },
    prompt: string,
    styleImage: { base64: string, mimeType: string } | null
): Promise<string> => {

    const parts: Part[] = [
        {
            inlineData: {
                data: productImage.base64,
                mimeType: productImage.mimeType,
            }
        },
        { text: prompt },
    ];

    if (styleImage) {
        parts.push({
            inlineData: {
                data: styleImage.base64,
                mimeType: styleImage.mimeType,
            }
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: imageEditingModel,
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        // Find the first image part in the response
        if (response.candidates && response.candidates.length > 0) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                    const base64ImageBytes = part.inlineData.data;
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                    return imageUrl;
                }
            }
        }

        throw new Error("The AI model did not return an image. Try adjusting your prompt or using a different image.");
    } catch (error) {
        throw handleGeminiError(error, "image generation");
    }
};