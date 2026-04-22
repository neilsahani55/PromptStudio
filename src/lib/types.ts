import type { GenerateImagePromptsFromTextOutput } from '@/ai/flows/generate-image-prompts-from-text';
import type { GenerateImagePromptsFromScreenshotOutput } from '@/ai/flows/generate-image-prompts-from-screenshot';

export type TextResult = GenerateImagePromptsFromTextOutput;

export type ImageScreenshotResult = GenerateImagePromptsFromScreenshotOutput;

export type AppResult =
  | { type: 'text'; data: TextResult }
  | { type: 'image-screenshot'; data: ImageScreenshotResult; imageUrl: string };
