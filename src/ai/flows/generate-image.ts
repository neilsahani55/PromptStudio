'use server';
/**
 * @fileOverview Google image generation (fallback when NVIDIA is slow).
 *
 * Tries Gemini's native image models in order — these work on standard Gemini
 * API keys. Imagen is intentionally NOT used here because it often requires a
 * paid tier and returns "Error fetching from .../models/imagen-..." otherwise.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
    imageUrl: z.string().describe('The data URI of the generated image.'),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

// Candidate Gemini image models + configs, tried in order until one returns an
// image. Different keys/regions expose different ids, so we try several.
const GOOGLE_IMAGE_MODELS: { name: string; config?: Record<string, unknown> }[] = [
  { name: 'gemini-2.5-flash-image', config: { responseModalities: ['IMAGE'] } },
  { name: 'gemini-2.5-flash-image-preview', config: { responseModalities: ['IMAGE'] } },
  { name: 'gemini-2.0-flash-preview-image-generation', config: { responseModalities: ['TEXT', 'IMAGE'] } },
  { name: 'gemini-2.0-flash-exp', config: { responseModalities: ['TEXT', 'IMAGE'] } },
];

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (input) => {
    const errors: string[] = [];
    for (const cand of GOOGLE_IMAGE_MODELS) {
      try {
        const res = await ai.generate({
          model: googleAI.model(cand.name),
          prompt: input.prompt,
          config: cand.config as any,
        });
        const url = res.media?.url;
        if (url) return { imageUrl: url };
        errors.push(`${cand.name}: no image in response`);
      } catch (e) {
        const msg = e instanceof Error ? e.message.slice(0, 140) : String(e);
        errors.push(`${cand.name}: ${msg}`);
        // eslint-disable-next-line no-console
        console.warn(`Google image model ${cand.name} failed:`, msg);
      }
    }
    throw new Error(`Google image generation failed — ${errors.join(' | ')}`);
  }
);
